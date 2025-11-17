// Global search routes
const SearchService = require('../services/SearchService');

async function searchRoutes(fastify, options) {
  const db = fastify.db;
  const searchService = new SearchService(db);

  /**
   * Global search
   */
  fastify.get('/', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { query, entityTypes, limit } = request.query;

      if (!query) {
        return reply.status(400).send({ error: 'Search query is required' });
      }

      const options = {
        limit: limit ? parseInt(limit) : 20,
        entityTypes: entityTypes ? entityTypes.split(',') : undefined
      };

      const results = await searchService.globalSearch(query, options);

      return results;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Search failed', details: error.message });
    }
  });

  /**
   * Advanced order search
   */
  fastify.post('/orders', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const filters = request.body;

      const results = await searchService.advancedOrderSearch(filters);

      return results;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Advanced search failed', details: error.message });
    }
  });
}

module.exports = searchRoutes;
