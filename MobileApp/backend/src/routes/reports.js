// Advanced reporting routes
const ReportService = require('../services/ReportService');

async function reportRoutes(fastify, options) {
  const db = fastify.db;
  const reportService = new ReportService(db);

  /**
   * Generate customer report
   */
  fastify.get('/customers', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { startDate, endDate, format } = request.query;

      if (!startDate || !endDate) {
        return reply.status(400).send({ error: 'Start date and end date are required' });
      }

      const report = await reportService.generateCustomerReport(startDate, endDate, format);

      return report;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate customer report', details: error.message });
    }
  });

  /**
   * Generate sales report
   */
  fastify.get('/sales', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { startDate, endDate, groupBy } = request.query;

      if (!startDate || !endDate) {
        return reply.status(400).send({ error: 'Start date and end date are required' });
      }

      const report = await reportService.generateSalesReport(startDate, endDate, groupBy);

      return report;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate sales report', details: error.message });
    }
  });

  /**
   * Generate product performance report
   */
  fastify.get('/products', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { startDate, endDate } = request.query;

      if (!startDate || !endDate) {
        return reply.status(400).send({ error: 'Start date and end date are required' });
      }

      const report = await reportService.generateProductReport(startDate, endDate);

      return report;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate product report', details: error.message });
    }
  });

  /**
   * Generate inventory report
   */
  fastify.get('/inventory', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const report = await reportService.generateInventoryReport();

      return report;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate inventory report', details: error.message });
    }
  });

  /**
   * Generate production efficiency report
   */
  fastify.get('/production', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { startDate, endDate } = request.query;

      if (!startDate || !endDate) {
        return reply.status(400).send({ error: 'Start date and end date are required' });
      }

      const report = await reportService.generateProductionReport(startDate, endDate);

      return report;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate production report', details: error.message });
    }
  });

  /**
   * Generate financial summary report
   */
  fastify.get('/financial', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { startDate, endDate } = request.query;

      if (!startDate || !endDate) {
        return reply.status(400).send({ error: 'Start date and end date are required' });
      }

      const report = await reportService.generateFinancialReport(startDate, endDate);

      return report;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate financial report', details: error.message });
    }
  });

  /**
   * Generate comprehensive business report
   */
  fastify.get('/comprehensive', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { startDate, endDate } = request.query;

      if (!startDate || !endDate) {
        return reply.status(400).send({ error: 'Start date and end date are required' });
      }

      const report = await reportService.generateComprehensiveReport(startDate, endDate);

      return report;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate comprehensive report', details: error.message });
    }
  });
}

module.exports = reportRoutes;
