// Audit logging service for tracking system changes
class AuditService {
  constructor(db, logger = null) {
    this.db = db;
    this.log = logger || { info: console.log, error: console.error, warn: console.warn };
  }

  /**
   * Log an action
   */
  async logAction(userId, action, entityType, entityId, details = null, ipAddress = null) {
    try {
      await this.db.run(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, created_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [userId, action, entityType, entityId, details ? JSON.stringify(details) : null, ipAddress]
      );
    } catch (error) {
      this.log.error('Failed to log audit action: %s', error.message);
    }
  }

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(filters = {}) {
    try {
      let query = `
        SELECT
          al.*,
          u.username,
          u.full_name
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
      `;

      const params = [];

      if (filters.userId) {
        query += ' AND al.user_id = ?';
        params.push(filters.userId);
      }

      if (filters.action) {
        query += ' AND al.action = ?';
        params.push(filters.action);
      }

      if (filters.entityType) {
        query += ' AND al.entity_type = ?';
        params.push(filters.entityType);
      }

      if (filters.entityId) {
        query += ' AND al.entity_id = ?';
        params.push(filters.entityId);
      }

      if (filters.startDate) {
        query += ' AND DATE(al.created_at) >= DATE(?)';
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ' AND DATE(al.created_at) <= DATE(?)';
        params.push(filters.endDate);
      }

      query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit || 100));
      params.push(parseInt(filters.offset || 0));

      const logs = await this.db.all(query, params);

      // Parse details JSON
      const parsedLogs = logs.map((log) => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : null,
      }));

      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
      const countParams = [];

      if (filters.userId) {
        countQuery += ' AND user_id = ?';
        countParams.push(filters.userId);
      }

      if (filters.action) {
        countQuery += ' AND action = ?';
        countParams.push(filters.action);
      }

      if (filters.entityType) {
        countQuery += ' AND entity_type = ?';
        countParams.push(filters.entityType);
      }

      if (filters.entityId) {
        countQuery += ' AND entity_id = ?';
        countParams.push(filters.entityId);
      }

      if (filters.startDate) {
        countQuery += ' AND DATE(created_at) >= DATE(?)';
        countParams.push(filters.startDate);
      }

      if (filters.endDate) {
        countQuery += ' AND DATE(created_at) <= DATE(?)';
        countParams.push(filters.endDate);
      }

      const { total } = await this.db.get(countQuery, countParams);

      return {
        success: true,
        logs: parsedLogs,
        pagination: {
          total,
          limit: parseInt(filters.limit || 100),
          offset: parseInt(filters.offset || 0),
          pages: Math.ceil(total / parseInt(filters.limit || 100)),
        },
      };
    } catch (error) {
      throw new Error(`Failed to get audit logs: ${error.message}`);
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(startDate = null, endDate = null) {
    try {
      let dateFilter = '1=1';
      const params = [];

      if (startDate) {
        dateFilter += ' AND DATE(created_at) >= DATE(?)';
        params.push(startDate);
      }

      if (endDate) {
        dateFilter += ' AND DATE(created_at) <= DATE(?)';
        params.push(endDate);
      }

      // Actions by type
      const actionStats = await this.db.all(
        `
        SELECT action, COUNT(*) as count
        FROM audit_logs
        WHERE ${dateFilter}
        GROUP BY action
        ORDER BY count DESC
      `,
        params
      );

      // Actions by entity type
      const entityStats = await this.db.all(
        `
        SELECT entity_type, COUNT(*) as count
        FROM audit_logs
        WHERE ${dateFilter}
        GROUP BY entity_type
        ORDER BY count DESC
      `,
        params
      );

      // Most active users
      const userStats = await this.db.all(
        `
        SELECT
          al.user_id,
          u.username,
          u.full_name,
          COUNT(*) as action_count
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE ${dateFilter}
        GROUP BY al.user_id
        ORDER BY action_count DESC
        LIMIT 10
      `,
        params
      );

      // Daily activity
      const dailyActivity = await this.db.all(
        `
        SELECT
          DATE(created_at) as date,
          COUNT(*) as count
        FROM audit_logs
        WHERE ${dateFilter}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `,
        params
      );

      return {
        success: true,
        stats: {
          actionStats,
          entityStats,
          userStats,
          dailyActivity,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get audit stats: ${error.message}`);
    }
  }

  /**
   * Delete old audit logs
   */
  async deleteOldLogs(daysToKeep = 90) {
    try {
      const result = await this.db.run(
        "DELETE FROM audit_logs WHERE DATE(created_at) < DATE('now', ?)",
        [`-${daysToKeep} days`]
      );

      return {
        success: true,
        message: `Deleted audit logs older than ${daysToKeep} days`,
        deleted: result.changes,
      };
    } catch (error) {
      throw new Error(`Failed to delete old logs: ${error.message}`);
    }
  }

  /**
   * Export audit logs
   */
  async exportLogs(filters = {}, format = 'json') {
    try {
      const result = await this.getAuditLogs({ ...filters, limit: 10000, offset: 0 });

      if (format === 'csv') {
        // Convert to CSV
        const headers = [
          'ID',
          'User',
          'Action',
          'Entity Type',
          'Entity ID',
          'Timestamp',
          'IP Address',
        ];
        const rows = result.logs.map((log) => [
          log.id,
          log.username || log.user_id,
          log.action,
          log.entity_type,
          log.entity_id,
          log.created_at,
          log.ip_address || '',
        ]);

        const csv = [
          headers.join(','),
          ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
        ].join('\n');

        return {
          success: true,
          format: 'csv',
          data: csv,
        };
      }

      return {
        success: true,
        format: 'json',
        data: result.logs,
      };
    } catch (error) {
      throw new Error(`Failed to export logs: ${error.message}`);
    }
  }
}

module.exports = AuditService;
