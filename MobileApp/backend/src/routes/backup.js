// Backup and restore routes
const BackupService = require('../services/BackupService');
const path = require('path');

async function backupRoutes(fastify, options) {
  const backupService = new BackupService();

  /**
   * Create manual backup
   */
  fastify.post('/create', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { description } = request.body;

      const result = await backupService.createBackup(description || 'Manual backup');

      return {
        success: true,
        message: 'Backup created successfully',
        backup: result.backup
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to create backup', details: error.message });
    }
  });

  /**
   * List all backups
   */
  fastify.get('/list', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const backups = await backupService.listBackups();

      return {
        success: true,
        backups
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to list backups', details: error.message });
    }
  });

  /**
   * Get backup statistics
   */
  fastify.get('/stats', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const stats = await backupService.getBackupStats();

      return {
        success: true,
        stats
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to get backup stats', details: error.message });
    }
  });

  /**
   * Download backup file
   */
  fastify.get('/download/:filename', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { filename } = request.params;

      const backupPath = backupService.getBackupPath(filename);

      reply.header('Content-Type', 'application/octet-stream');
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);

      return reply.sendFile(filename, path.dirname(backupPath));
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to download backup', details: error.message });
    }
  });

  /**
   * Restore from backup
   */
  fastify.post('/restore', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { filename } = request.body;

      if (!filename) {
        return reply.status(400).send({ error: 'Backup filename is required' });
      }

      const result = await backupService.restoreBackup(filename);

      return {
        success: true,
        message: result.message,
        restoredFrom: result.restoredFrom
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to restore backup', details: error.message });
    }
  });

  /**
   * Delete backup
   */
  fastify.delete('/:filename', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { filename } = request.params;

      const result = await backupService.deleteBackup(filename);

      return {
        success: true,
        message: result.message
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete backup', details: error.message });
    }
  });

  /**
   * Verify backup integrity
   */
  fastify.post('/verify/:filename', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { filename } = request.params;

      const result = await backupService.verifyBackup(filename);

      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to verify backup', details: error.message });
    }
  });

  /**
   * Export database to SQL
   */
  fastify.post('/export-sql', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const result = await backupService.exportToSQL();

      return {
        success: true,
        message: 'Database exported to SQL',
        export: {
          filepath: result.filepath,
          filename: result.filename,
          sizeMB: result.sizeMB
        }
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to export to SQL', details: error.message });
    }
  });

  /**
   * Clean up old backups
   */
  fastify.post('/cleanup', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const result = await backupService.cleanupOldBackups();

      return {
        success: true,
        message: 'Old backups cleaned up',
        deletedCount: result.deletedCount
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to cleanup backups', details: error.message });
    }
  });
}

module.exports = backupRoutes;
