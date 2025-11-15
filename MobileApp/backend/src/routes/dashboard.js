// Dashboard routes
const DashboardService = require('../services/DashboardService');

async function dashboardRoutes(fastify, options) {
  const db = fastify.db;
  const dashboardService = new DashboardService(db);

  /**
   * Get comprehensive dashboard data
   */
  fastify.get('/', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { period } = request.query;

      const dashboard = await dashboardService.getDashboardData(period || 'month');

      return dashboard;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to get dashboard data', details: error.message });
    }
  });

  /**
   * Get sales trend
   */
  fastify.get('/sales-trend', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { days } = request.query;

      const trend = await dashboardService.getSalesTrend(days ? parseInt(days) : 30);

      return trend;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to get sales trend', details: error.message });
    }
  });

  /**
   * Get product mix
   */
  fastify.get('/product-mix', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { period } = request.query;

      const productMix = await dashboardService.getProductMix(period || 'month');

      return productMix;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to get product mix', details: error.message });
    }
  });
}

module.exports = dashboardRoutes;
