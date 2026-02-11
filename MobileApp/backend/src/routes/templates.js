// Message template routes
const TemplateService = require('../services/TemplateService');

async function templateRoutes(fastify, options) {
  const db = fastify.db;
  const templateService = new TemplateService(db);

  /**
   * Create template
   */
  fastify.post('/', {
    preHandler: [fastify.authenticate],
    schema: { body: { type: 'object', required: ['name', 'type'], properties: { name: { type: 'string', minLength: 1 }, type: { type: 'string' }, content: { type: 'string' }, category: { type: 'string' }, variables: { type: 'array' } } } }
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
      return reply.status(500).send({ error: 'Failed to create template' });
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
      return reply.status(500).send({ error: 'Failed to get templates' });
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
      return reply.status(500).send({ error: 'Failed to get template' });
    }
  });

  /**
   * Update template
   */
  fastify.put('/:templateId', {
    preHandler: [fastify.authenticate],
    schema: { body: { type: 'object', properties: { name: { type: 'string' }, type: { type: 'string' }, content: { type: 'string' }, category: { type: 'string' }, variables: { type: 'array' }, is_active: { type: 'boolean' } } } }
  }, async (request, reply) => {
    try {
      const { templateId } = request.params;
      const updates = request.body;

      const result = await templateService.updateTemplate(templateId, updates);

      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update template' });
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
      return reply.status(500).send({ error: 'Failed to delete template' });
    }
  });

  /**
   * Render template with data
   */
  fastify.post('/:templateId/render', {
    preHandler: [fastify.authenticate],
    schema: { body: { type: 'object', required: ['data'], properties: { data: { type: 'object' } } } }
  }, async (request, reply) => {
    try {
      const { templateId } = request.params;
      const data = request.body;

      const result = await templateService.getRenderedMessage(templateId, data);

      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to render template' });
    }
  });

  /**
   * Duplicate template
   */
  fastify.post('/:templateId/duplicate', {
    preHandler: [fastify.authenticate],
    schema: { body: { type: 'object', properties: { name: { type: 'string' } } } }
  }, async (request, reply) => {
    try {
      const { templateId } = request.params;
      const { newName } = request.body;
      const userId = request.user.id;

      const result = await templateService.duplicateTemplate(templateId, newName, userId);

      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to duplicate template' });
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
      return reply.status(500).send({ error: 'Failed to initialize templates' });
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
      return reply.status(500).send({ error: 'Failed to get template stats' });
    }
  });
}

module.exports = templateRoutes;
