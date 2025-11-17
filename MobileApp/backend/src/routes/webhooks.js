// Webhook routes
const WebhookService = require('../services/WebhookService');

async function webhookRoutes(fastify, options) {
  const db = fastify.db;
  const webhookService = new WebhookService(db);

  /**
   * Register webhook
   */
  fastify.post('/', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { url, events, secret } = request.body;
      const userId = request.user.userId;

      if (!url || !events || !Array.isArray(events)) {
        return reply.status(400).send({ error: 'URL and events array are required' });
      }

      const result = await webhookService.registerWebhook(url, events, secret, userId);

      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to register webhook', details: error.message });
    }
  });

  /**
   * Get all webhooks
   */
  fastify.get('/', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const userId = request.user.userId;
      const webhooks = await webhookService.getWebhooks(userId);

      return {
        success: true,
        webhooks
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to get webhooks', details: error.message });
    }
  });

  /**
   * Update webhook
   */
  fastify.put('/:webhookId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { webhookId } = request.params;
      const updates = request.body;

      const result = await webhookService.updateWebhook(webhookId, updates);

      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update webhook', details: error.message });
    }
  });

  /**
   * Delete webhook
   */
  fastify.delete('/:webhookId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { webhookId } = request.params;

      const result = await webhookService.deleteWebhook(webhookId);

      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete webhook', details: error.message });
    }
  });

  /**
   * Test webhook
   */
  fastify.post('/:webhookId/test', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { webhookId } = request.params;

      const result = await webhookService.testWebhook(webhookId);

      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to test webhook', details: error.message });
    }
  });

  /**
   * Get webhook logs
   */
  fastify.get('/:webhookId/logs', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { webhookId } = request.params;
      const { limit } = request.query;

      const result = await webhookService.getWebhookLogs(webhookId, limit ? parseInt(limit) : 50);

      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to get webhook logs', details: error.message });
    }
  });
}

module.exports = webhookRoutes;
