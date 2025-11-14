// Multi-device synchronization routes
const SyncService = require('../services/SyncService');

async function syncRoutes(fastify, options) {
  const db = fastify.db;
  const syncService = new SyncService(db);

  /**
   * Register device for sync
   */
  fastify.post('/register-device', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { deviceName, deviceType } = request.body;
      const userId = request.user.userId;

      if (!deviceName || !deviceType) {
        return reply.status(400).send({ error: 'Device name and type are required' });
      }

      const result = await syncService.registerDevice(deviceName, deviceType, userId);

      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to register device', details: error.message });
    }
  });

  /**
   * Get registered devices
   */
  fastify.get('/devices', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const userId = request.user.userId;

      const devices = await syncService.getDevices(userId);

      return {
        success: true,
        devices
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to get devices', details: error.message });
    }
  });

  /**
   * Remove device
   */
  fastify.delete('/devices/:deviceId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { deviceId } = request.params;

      const result = await syncService.removeDevice(deviceId);

      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to remove device', details: error.message });
    }
  });

  /**
   * Get sync status for device
   */
  fastify.get('/status/:deviceId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { deviceId } = request.params;

      const status = await syncService.getSyncStatus(deviceId);

      return status;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to get sync status', details: error.message });
    }
  });

  /**
   * Get changes since last sync
   */
  fastify.post('/pull', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { deviceId, lastSyncTimestamp, tables } = request.body;

      if (!deviceId || !lastSyncTimestamp) {
        return reply.status(400).send({ error: 'Device ID and last sync timestamp are required' });
      }

      const changes = await syncService.getChangesSince(lastSyncTimestamp, tables);

      // Update device last sync
      await syncService.updateDeviceLastSync(deviceId);

      return changes;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to pull changes', details: error.message });
    }
  });

  /**
   * Push changes from device
   */
  fastify.post('/push', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { deviceId, changes } = request.body;

      if (!deviceId || !changes) {
        return reply.status(400).send({ error: 'Device ID and changes are required' });
      }

      const result = await syncService.applyChanges(changes, deviceId);

      // Update device last sync
      await syncService.updateDeviceLastSync(deviceId);

      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to push changes', details: error.message });
    }
  });

  /**
   * Full sync (pull and push)
   */
  fastify.post('/full-sync', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { deviceId, lastSyncTimestamp, changes, tables } = request.body;

      if (!deviceId) {
        return reply.status(400).send({ error: 'Device ID is required' });
      }

      // Push changes from device
      let pushResult = null;
      if (changes && Object.keys(changes).length > 0) {
        pushResult = await syncService.applyChanges(changes, deviceId);
      }

      // Pull changes from server
      const timestamp = lastSyncTimestamp || new Date(0).toISOString();
      const pullResult = await syncService.getChangesSince(timestamp, tables);

      // Update device last sync
      await syncService.updateDeviceLastSync(deviceId);

      return {
        success: true,
        push: pushResult,
        pull: pullResult,
        syncedAt: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to perform full sync', details: error.message });
    }
  });

  /**
   * Get sync history
   */
  fastify.get('/history', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { deviceId, limit } = request.query;

      const history = await syncService.getSyncHistory(
        deviceId,
        limit ? parseInt(limit) : 50
      );

      return {
        success: true,
        history
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to get sync history', details: error.message });
    }
  });

  /**
   * Get pending conflicts
   */
  fastify.get('/conflicts', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const conflicts = await syncService.getPendingConflicts();

      return {
        success: true,
        conflicts
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to get conflicts', details: error.message });
    }
  });

  /**
   * Resolve conflict manually
   */
  fastify.post('/conflicts/:conflictId/resolve', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { conflictId } = request.params;
      const { chosenVersion } = request.body;

      if (!chosenVersion || !['existing', 'incoming'].includes(chosenVersion)) {
        return reply.status(400).send({ error: 'Invalid chosen version. Must be "existing" or "incoming"' });
      }

      const result = await syncService.resolveConflictManually(conflictId, chosenVersion);

      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to resolve conflict', details: error.message });
    }
  });

  /**
   * Set conflict resolution strategy
   */
  fastify.post('/strategy', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { strategy } = request.body;

      if (!strategy) {
        return reply.status(400).send({ error: 'Strategy is required' });
      }

      syncService.setConflictResolutionStrategy(strategy);

      return {
        success: true,
        message: 'Conflict resolution strategy updated',
        strategy
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to set strategy', details: error.message });
    }
  });
}

module.exports = syncRoutes;
