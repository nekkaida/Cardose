// Financial management routes - Using DatabaseService
const { parsePagination, safeJsonParse } = require('../utils/pagination');
const FinancialService = require('../services/FinancialService');

async function financialRoutes(fastify, options) {
  const db = fastify.db;
  const service = new FinancialService(db);

  // Get all transactions (requires authentication)
  fastify.get('/transactions', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { type, category, startDate, endDate, search, sort_by, sort_order } = request.query;
      const { limit, page, offset } = parsePagination(request.query);

      const result = await service.getTransactions({
        type,
        category,
        startDate,
        endDate,
        search,
        sort_by,
        sort_order,
        limit,
        offset,
        page,
      });

      return { success: true, ...result };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Create transaction (requires authentication)
  fastify.post(
    '/transactions',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['type', 'amount'],
          properties: {
            type: { type: 'string', enum: ['income', 'expense'] },
            amount: { type: 'number', minimum: 0 },
            category: { type: 'string' },
            description: { type: 'string' },
            order_id: { type: 'string' },
            payment_method: { type: 'string' },
            payment_date: { type: 'string' },
            ppn_amount: { type: 'number' },
            base_amount: { type: 'number' },
            invoice_number: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { type, amount } = request.body;

        if (!type || !amount) {
          reply.code(400);
          return { success: false, error: 'Type and amount are required' };
        }

        const result = await service.createTransaction(request.body);

        return {
          success: true,
          message: 'Transaction recorded successfully',
          ...result,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Get financial summary (requires authentication)
  fastify.get('/summary', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const summary = await service.getSummary();

      return { success: true, summary };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get all budgets (requires authentication)
  fastify.get('/budgets', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { period, category } = request.query;

      const result = await service.getBudgets({ period, category });

      return { success: true, ...result };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Create budget (requires authentication)
  fastify.post(
    '/budgets',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['category', 'amount', 'period'],
          properties: {
            category: { type: 'string' },
            amount: { type: 'number', minimum: 0 },
            period: { type: 'string' },
            start_date: { type: 'string' },
            end_date: { type: 'string' },
            notes: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { category, amount, period } = request.body;

        if (!category || !amount || !period) {
          reply.code(400);
          return { success: false, error: 'Category, amount, and period are required' };
        }

        const result = await service.createBudget(request.body);

        return {
          success: true,
          message: 'Budget created successfully',
          ...result,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Get budget by ID (requires authentication)
  fastify.get('/budgets/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params;

      const budget = await service.getBudgetById(id);

      if (!budget) {
        reply.code(404);
        return { success: false, error: 'Budget not found' };
      }

      return { success: true, budget };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // ==================== INVOICES ====================

  // Get all invoices (requires authentication)
  fastify.get('/invoices', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { status, customer_id, startDate, endDate, search, sort_by, sort_order } =
        request.query;
      const { limit, page, offset } = parsePagination(request.query);

      const result = await service.getInvoices({
        status,
        customer_id,
        startDate,
        endDate,
        search,
        sort_by,
        sort_order,
        limit,
        offset,
        page,
      });

      return { success: true, ...result };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Create invoice (requires authentication)
  fastify.post(
    '/invoices',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['customer_id'],
          properties: {
            customer_id: { type: 'string' },
            order_id: { type: 'string' },
            subtotal: { type: 'number' },
            discount: { type: 'number' },
            due_date: { type: 'string' },
            notes: { type: 'string' },
            items: { type: 'array' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { customer_id } = request.body;

        if (!customer_id) {
          reply.code(400);
          return { success: false, error: 'Customer ID is required' };
        }

        const result = await service.createInvoice(request.body, request.user?.id);

        return {
          success: true,
          message: 'Invoice created successfully',
          ...result,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Get invoice by ID (requires authentication)
  fastify.get('/invoices/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params;

      const invoice = await service.getInvoiceById(id);

      if (!invoice) {
        reply.code(404);
        return { success: false, error: 'Invoice not found' };
      }

      // Parse items if exists
      invoice.items = safeJsonParse(invoice.items, []);

      // Get payments for this invoice (payments table may not exist in all deployments)
      let payments = [];
      // Skip payments query since the table doesn't exist in the schema
      // In future, add payments table to DatabaseService if needed

      return {
        success: true,
        invoice: { ...invoice, payments },
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Update invoice status (requires authentication)
  fastify.patch(
    '/invoices/:id/status',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['unpaid', 'paid', 'overdue', 'cancelled', 'partial'] },
            paid_date: { type: 'string' },
            payment_method: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { status, paid_date, payment_method } = request.body;

        if (!status) {
          reply.code(400);
          return { success: false, error: 'Status is required' };
        }

        const validStatuses = ['unpaid', 'paid', 'overdue', 'cancelled'];
        if (!validStatuses.includes(status)) {
          reply.code(400);
          return { success: false, error: 'Invalid status value' };
        }

        const result = await service.updateInvoiceStatus(
          id,
          { status, paid_date, payment_method },
          request.user.id
        );

        if (!result) {
          reply.code(404);
          return { success: false, error: 'Invoice not found' };
        }

        return { success: true, message: 'Invoice status updated successfully' };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Calculate pricing (requires authentication)
  fastify.post(
    '/calculate-pricing',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['materials'],
          properties: {
            materials: { type: 'array' },
            labor_cost: { type: 'number' },
            laborHours: { type: 'number' },
            overhead_percentage: { type: 'number' },
            overheadPercentage: { type: 'number' },
            profit_margin: { type: 'number' },
            markupPercentage: { type: 'number' },
            discount_percentage: { type: 'number' },
            discountAmount: { type: 'number' },
            quantity: { type: 'integer', minimum: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const {
          materials = [],
          laborHours = 0,
          overheadPercentage = 10,
          markupPercentage = 50,
          discountAmount = 0,
        } = request.body;

        const pricing = await service.calculatePricing({
          materials,
          laborHours,
          overheadPercentage,
          markupPercentage,
          discountAmount,
        });

        return { success: true, pricing };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Get tax report (requires authentication)
  fastify.get('/tax-report', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { month, year, startDate, endDate } = request.query;

      if (startDate && endDate && startDate > endDate) {
        reply.code(400);
        return { success: false, error: 'startDate must be before or equal to endDate' };
      }

      const result = await service.getTaxReport({ month, year, startDate, endDate });

      return { success: true, ...result };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get revenue analytics (requires authentication)
  fastify.get(
    '/analytics/revenue',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const { period = 'month' } = request.query;

        const analytics = await service.getRevenueAnalytics(period);

        return { success: true, analytics };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Get analytics (requires authentication)
  fastify.get('/analytics', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const analytics = await service.getAnalytics();

      return { success: true, analytics };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });
}

module.exports = financialRoutes;
