// Message template routes
const TemplateService = require('../services/TemplateService');

async function templateRoutes(fastify, options) {
  const db = fastify.db;
  const templateService = new TemplateService(db);

  /**
   * Create template
   */
  fastify.post('/', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { name, type, subject, body, variables, category } = request.body;
      const userId = request.user.id;

      if (!name || !type || !body) {
        return reply.status(400).send({ error: 'Name, type, and body are required' });
      }

      const result = await templateService.createTemplate(
        name, type, subject, body, variables || [], category || 'general', userId
      );

      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to create template', details: error.message });
    }
  });

  /**
   * Get all templates
   */
  fastify.get('/', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { type, category } = request.query;

      const templates = await templateService.getTemplates(type, category);

      return {
        success: true,
        templates
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to get templates', details: error.message });
    }
  });

  /**
   * Get template by ID
   */
  fastify.get('/:templateId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { templateId } = request.params;

      const template = await templateService.getTemplateById(templateId);

      return {
        success: true,
        template
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to get template', details: error.message });
    }
  });

  /**
   * Update template
   */
  fastify.put('/:templateId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { templateId } = request.params;
      const updates = request.body;

      const result = await templateService.updateTemplate(templateId, updates);

      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update template', details: error.message });
    }
  });

  /**
   * Delete template
   */
  fastify.delete('/:templateId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { templateId } = request.params;

      const result = await templateService.deleteTemplate(templateId);

      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete template', details: error.message });
    }
  });

  /**
   * Render template with data
   */
  fastify.post('/:templateId/render', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { templateId } = request.params;
      const data = request.body;

      const result = await templateService.getRenderedMessage(templateId, data);

      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to render template', details: error.message });
    }
  });

  /**
   * Duplicate template
   */
  fastify.post('/:templateId/duplicate', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { templateId } = request.params;
      const { newName } = request.body;
      const userId = request.user.id;

      const result = await templateService.duplicateTemplate(templateId, newName, userId);

      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to duplicate template', details: error.message });
    }
  });

  /**
   * Initialize default templates
   */
  fastify.post('/initialize-defaults', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const userId = request.user.id;

      const result = await templateService.initializeDefaultTemplates(userId);

      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to initialize templates', details: error.message });
    }
  });

  /**
   * Get template statistics
   */
  fastify.get('/:templateId/stats', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { templateId } = request.params;

      const stats = await templateService.getTemplateStats(templateId);

      return stats;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to get template stats', details: error.message });
    }
  });
}

module.exports = templateRoutes;
