// Notification routes
const NotificationService = require('../services/NotificationService');

async function notificationRoutes(fastify, options) {
  const db = fastify.db;
  const notificationService = new NotificationService(db);

  /**
   * Manually trigger overdue invoice check
   */
  fastify.post('/check/overdue-invoices', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const result = await notificationService.checkOverdueInvoices();
      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to check overdue invoices', details: error.message });
    }
  });

  /**
   * Manually trigger low stock check
   */
  fastify.post('/check/low-stock', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const result = await notificationService.checkLowStock();
      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to check low stock', details: error.message });
    }
  });

  /**
   * Manually trigger order deadline check
   */
  fastify.post('/check/order-deadlines', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const result = await notificationService.checkOrderDeadlines();
      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to check order deadlines', details: error.message });
    }
  });

  /**
   * Manually trigger quality issues check
   */
  fastify.post('/check/quality-issues', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const result = await notificationService.checkQualityIssues();
      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to check quality issues', details: error.message });
    }
  });

  /**
   * Manually send daily digest
   */
  fastify.post('/send/daily-digest', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const result = await notificationService.sendDailyDigest();
      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to send daily digest', details: error.message });
    }
  });

  /**
   * Send custom notification
   */
  fastify.post('/send/custom', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { customerId, subject, message, channels } = request.body;

      if (!customerId || !message) {
        return reply.status(400).send({ error: 'Customer ID and message are required' });
      }

      // Get customer
      const customer = await db.get('SELECT * FROM customers WHERE id = ?', [customerId]);
      if (!customer) {
        return reply.status(404).send({ error: 'Customer not found' });
      }

      const result = await notificationService.sendNotification(
        customer,
        subject || 'Notification from Premium Gift Box',
        message,
        channels || ['email']
      );

      return {
        success: true,
        result
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to send notification', details: error.message });
    }
  });
}

module.exports = notificationRoutes;
