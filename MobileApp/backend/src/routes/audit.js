// Audit logging routes
const AuditService = require('../services/AuditService');

async function auditRoutes(fastify, options) {
  const db = fastify.db;
  const auditService = new AuditService(db);

  /**
   * Get audit logs
   */
  fastify.get('/logs', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const filters = {
        userId: request.query.userId,
        action: request.query.action,
        entityType: request.query.entityType,
        entityId: request.query.entityId,
        startDate: request.query.startDate,
        endDate: request.query.endDate,
        limit: request.query.limit,
        offset: request.query.offset
      };

      const result = await auditService.getAuditLogs(filters);

      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to get audit logs', details: error.message });
    }
  });

  /**
   * Get audit statistics
   */
  fastify.get('/stats', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { startDate, endDate } = request.query;

      const result = await auditService.getAuditStats(startDate, endDate);

      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to get audit stats', details: error.message });
    }
  });

  /**
   * Export audit logs
   */
  fastify.get('/export', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const filters = {
        userId: request.query.userId,
        action: request.query.action,
        entityType: request.query.entityType,
        entityId: request.query.entityId,
        startDate: request.query.startDate,
        endDate: request.query.endDate
      };

      const format = request.query.format || 'json';

      const result = await auditService.exportLogs(filters, format);

      if (format === 'csv') {
        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', `attachment; filename="audit_logs_${Date.now()}.csv"`);
        return result.data;
      }

      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to export audit logs', details: error.message });
    }
  });

  /**
   * Delete old audit logs
   */
  fastify.delete('/cleanup', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { daysToKeep } = request.query;

      const result = await auditService.deleteOldLogs(
        daysToKeep ? parseInt(daysToKeep) : 90
      );

      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to cleanup audit logs', details: error.message });
    }
  });

  /**
   * Log custom action (manual logging endpoint)
   */
  fastify.post('/log', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { action, entityType, entityId, details } = request.body;
      const userId = request.user.userId;
      const ipAddress = request.ip;

      if (!action) {
        return reply.status(400).send({ error: 'Action is required' });
      }

      await auditService.logAction(userId, action, entityType, entityId, details, ipAddress);

      return {
        success: true,
        message: 'Action logged successfully'
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to log action', details: error.message });
    }
  });
}

module.exports = auditRoutes;
