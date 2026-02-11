// Multi-device synchronization service
const fs = require('fs');
const path = require('path');

// Whitelist of tables allowed for sync operations
const SYNCABLE_TABLES = new Set([
  'customers', 'orders', 'invoices', 'inventory_materials',
  'production_tasks', 'quality_checks', 'files', 'communication_logs'
]);

class SyncService {
  constructor(db) {
    this.db = db;
    this.syncLog = [];
    this.conflictResolutionStrategy = 'latest_wins'; // 'latest_wins', 'manual', 'server_wins', 'client_wins'
  }

  /**
   * Validate table name against whitelist
   */
  validateTableName(table) {
    if (!SYNCABLE_TABLES.has(table)) {
      throw new Error(`Table '${table}' is not allowed for sync operations`);
    }
  }

  /**
   * Get changes since last sync
   */
  async getChangesSince(lastSyncTimestamp, tables = null) {
    try {
      const tablesToSync = tables || [
        'customers',
        'orders',
        'invoices',
        'inventory_materials',
        'production_tasks',
        'quality_checks',
        'files',
        'communication_logs'
      ];

      const changes = {};

      for (const table of tablesToSync) {
        this.validateTableName(table);

        // Get all records updated after last sync
        const query = `
          SELECT * FROM "${table}"
          WHERE updated_at > datetime(?)
          ORDER BY updated_at ASC
        `;

        const records = await this.db.all(query, [lastSyncTimestamp]);

        if (records && records.length > 0) {
          changes[table] = records;
        }
      }

      return {
        success: true,
        timestamp: new Date().toISOString(),
        changes,
        recordCount: Object.values(changes).reduce((sum, records) => sum + records.length, 0)
      };
    } catch (error) {
      throw new Error(`Failed to get changes: ${error.message}`);
    }
  }

  /**
   * Apply changes from remote device
   */
  async applyChanges(changes, deviceId) {
    const results = {
      applied: 0,
      conflicts: 0,
      errors: 0,
      details: []
    };

    for (const [table, records] of Object.entries(changes)) {
      this.validateTableName(table);

      for (const record of records) {
        try {
          // Check if record exists
          const existing = await this.db.get(
            `SELECT * FROM "${table}" WHERE id = ?`,
            [record.id]
          );

          if (existing) {
            // Check for conflict
            const conflict = await this.detectConflict(table, existing, record);

            if (conflict) {
              results.conflicts++;

              // Resolve conflict based on strategy
              const resolved = await this.resolveConflict(
                table,
                existing,
                record,
                this.conflictResolutionStrategy
              );

              if (resolved.applied) {
                results.applied++;
                results.details.push({
                  table,
                  id: record.id,
                  action: 'conflict_resolved',
                  strategy: this.conflictResolutionStrategy
                });
              }
            } else {
              // No conflict, update record
              await this.updateRecord(table, record);
              results.applied++;
              results.details.push({
                table,
                id: record.id,
                action: 'updated'
              });
            }
          } else {
            // New record, insert it
            await this.insertRecord(table, record);
            results.applied++;
            results.details.push({
              table,
              id: record.id,
              action: 'inserted'
            });
          }
        } catch (error) {
          results.errors++;
          results.details.push({
            table,
            id: record.id,
            action: 'error',
            error: error.message
          });
        }
      }
    }

    // Log sync operation
    await this.logSyncOperation(deviceId, results);

    return {
      success: true,
      results
    };
  }

  /**
   * Detect conflict between existing and incoming record
   */
  async detectConflict(table, existing, incoming) {
    // Conflict exists if:
    // 1. Both records have been updated since last sync
    // 2. Updated timestamps are different
    // 3. Data fields are different

    if (!existing.updated_at || !incoming.updated_at) {
      return false;
    }

    const existingTime = new Date(existing.updated_at).getTime();
    const incomingTime = new Date(incoming.updated_at).getTime();

    // If timestamps are the same, no conflict
    if (existingTime === incomingTime) {
      return false;
    }

    // Check if data fields are different
    const fieldsToCompare = Object.keys(incoming).filter(
      key => !['id', 'created_at', 'updated_at'].includes(key)
    );

    for (const field of fieldsToCompare) {
      if (existing[field] !== incoming[field]) {
        return true; // Conflict detected
      }
    }

    return false; // No actual data conflict
  }

  /**
   * Resolve conflict based on strategy
   */
  async resolveConflict(table, existing, incoming, strategy) {
    switch (strategy) {
      case 'latest_wins':
        // Use the record with the latest timestamp
        const existingTime = new Date(existing.updated_at).getTime();
        const incomingTime = new Date(incoming.updated_at).getTime();

        if (incomingTime > existingTime) {
          await this.updateRecord(table, incoming);
          return { applied: true, winner: 'incoming' };
        } else {
          return { applied: false, winner: 'existing' };
        }

      case 'server_wins':
        // Keep existing server record
        return { applied: false, winner: 'existing' };

      case 'client_wins':
        // Use incoming client record
        await this.updateRecord(table, incoming);
        return { applied: true, winner: 'incoming' };

      case 'manual':
        // Store conflict for manual resolution
        await this.storeConflict(table, existing, incoming);
        return { applied: false, winner: 'pending' };

      default:
        return { applied: false, winner: 'existing' };
    }
  }

  /**
   * Update record in database
   */
  async updateRecord(table, record) {
    const fields = Object.keys(record).filter(key => key !== 'id');
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => record[field]);
    values.push(record.id);

    const query = `UPDATE "${table}" SET ${setClause} WHERE id = ?`;
    await this.db.run(query, values);
  }

  /**
   * Insert record into database
   */
  async insertRecord(table, record) {
    const fields = Object.keys(record);
    const placeholders = fields.map(() => '?').join(', ');
    const values = fields.map(field => record[field]);

    const query = `INSERT INTO "${table}" (${fields.join(', ')}) VALUES (${placeholders})`;
    await this.db.run(query, values);
  }

  /**
   * Store conflict for manual resolution
   */
  async storeConflict(table, existing, incoming) {
    const conflict = {
      table,
      record_id: existing.id,
      existing_data: JSON.stringify(existing),
      incoming_data: JSON.stringify(incoming),
      status: 'pending',
      created_at: new Date().toISOString()
    };

    await this.db.run(
      `INSERT INTO sync_conflicts (table_name, record_id, existing_data, incoming_data, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [conflict.table, conflict.record_id, conflict.existing_data, conflict.incoming_data, conflict.status, conflict.created_at]
    );
  }

  /**
   * Get pending conflicts
   */
  async getPendingConflicts() {
    const conflicts = await this.db.all(
      `SELECT * FROM sync_conflicts WHERE status = 'pending' ORDER BY created_at DESC`
    );

    return conflicts.map(conflict => ({
      ...conflict,
      existing_data: JSON.parse(conflict.existing_data),
      incoming_data: JSON.parse(conflict.incoming_data)
    }));
  }

  /**
   * Resolve conflict manually
   */
  async resolveConflictManually(conflictId, chosenVersion) {
    const conflict = await this.db.get(
      `SELECT * FROM sync_conflicts WHERE id = ?`,
      [conflictId]
    );

    if (!conflict) {
      throw new Error('Conflict not found');
    }

    const existingData = JSON.parse(conflict.existing_data);
    const incomingData = JSON.parse(conflict.incoming_data);

    const chosenData = chosenVersion === 'existing' ? existingData : incomingData;

    await this.updateRecord(conflict.table_name, chosenData);

    await this.db.run(
      `UPDATE sync_conflicts SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, chosen_version = ? WHERE id = ?`,
      [chosenVersion, conflictId]
    );

    return {
      success: true,
      message: 'Conflict resolved',
      chosenVersion
    };
  }

  /**
   * Log sync operation
   */
  async logSyncOperation(deviceId, results) {
    await this.db.run(
      `INSERT INTO sync_logs (device_id, applied_count, conflict_count, error_count, details, synced_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [deviceId, results.applied, results.conflicts, results.errors, JSON.stringify(results.details)]
    );
  }

  /**
   * Get sync history
   */
  async getSyncHistory(deviceId = null, limit = 50) {
    let query = `SELECT * FROM sync_logs`;
    const params = [];

    if (deviceId) {
      query += ` WHERE device_id = ?`;
      params.push(deviceId);
    }

    query += ` ORDER BY synced_at DESC LIMIT ?`;
    params.push(limit);

    const logs = await this.db.all(query, params);

    return logs.map(log => ({
      ...log,
      details: JSON.parse(log.details)
    }));
  }

  /**
   * Register device for sync
   */
  async registerDevice(deviceName, deviceType, userId) {
    const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.db.run(
      `INSERT INTO sync_devices (id, name, type, user_id, last_sync, registered_at)
       VALUES (?, ?, ?, ?, NULL, CURRENT_TIMESTAMP)`,
      [deviceId, deviceName, deviceType, userId]
    );

    return {
      success: true,
      deviceId,
      message: 'Device registered successfully'
    };
  }

  /**
   * Update device last sync timestamp
   */
  async updateDeviceLastSync(deviceId) {
    await this.db.run(
      `UPDATE sync_devices SET last_sync = CURRENT_TIMESTAMP WHERE id = ?`,
      [deviceId]
    );
  }

  /**
   * Get registered devices
   */
  async getDevices(userId = null) {
    let query = `SELECT * FROM sync_devices`;
    const params = [];

    if (userId) {
      query += ` WHERE user_id = ?`;
      params.push(userId);
    }

    query += ` ORDER BY last_sync DESC`;

    return await this.db.all(query, params);
  }

  /**
   * Remove device
   */
  async removeDevice(deviceId) {
    await this.db.run(`DELETE FROM sync_devices WHERE id = ?`, [deviceId]);

    return {
      success: true,
      message: 'Device removed successfully'
    };
  }

  /**
   * Get sync status
   */
  async getSyncStatus(deviceId) {
    const device = await this.db.get(
      `SELECT * FROM sync_devices WHERE id = ?`,
      [deviceId]
    );

    if (!device) {
      throw new Error('Device not found');
    }

    const lastSync = device.last_sync || device.registered_at;

    const pendingChanges = await this.getChangesSince(lastSync);

    return {
      success: true,
      device,
      lastSync,
      pendingChanges: pendingChanges.recordCount,
      status: pendingChanges.recordCount > 0 ? 'out_of_sync' : 'synced'
    };
  }

  /**
   * Set conflict resolution strategy
   */
  setConflictResolutionStrategy(strategy) {
    const validStrategies = ['latest_wins', 'manual', 'server_wins', 'client_wins'];

    if (!validStrategies.includes(strategy)) {
      throw new Error('Invalid conflict resolution strategy');
    }

    this.conflictResolutionStrategy = strategy;
  }
}

module.exports = SyncService;
