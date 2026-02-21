// Order management routes - Using OrderService
const { parsePagination } = require('../utils/pagination');
const OrderService = require('../services/OrderService');

const VALID_STATUSES = [
  'pending',
  'designing',
  'approved',
  'production',
  'quality_control',
  'completed',
  'cancelled',
];

async function ordersRoutes(fastify, options) {
  const db = fastify.db;
  const service = new OrderService(db);

  // Get all orders (requires authentication)
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { status, priority, customer_id, search, sort_by, sort_order } = request.query;
      const { limit, page, offset } = parsePagination(request.query);

      const result = await service.getOrders({
        status,
        priority,
        customerId: customer_id,
        search,
        sortBy: sort_by,
        sortOrder: sort_order,
        limit,
        page,
        offset,
      });

      return { success: true, ...result };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get order stats (requires authentication)
  fastify.get('/stats', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const stats = await service.getOrderStats();
      return { success: true, stats };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get latest order number (requires authentication)
  fastify.get('/latest-number', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const orderNumber = await service.generateOrderNumber();
      return { success: true, orderNumber };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get single order (requires authentication)
  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params;
      const order = await service.getOrderById(id);

      if (!order) {
        reply.code(404);
        return { success: false, error: 'Order not found' };
      }

      return { success: true, order };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Create new order (requires authentication)
  fastify.post(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['customer_id'],
          properties: {
            customer_id: { type: 'string' },
            order_number: { type: 'string' },
            status: { type: 'string' },
            priority: { type: 'string' },
            total_amount: { type: 'number' },
            items: { type: 'array' },
            due_date: { type: 'string' },
            delivery_date: { type: 'string' },
            box_type: { type: 'string' },
            special_requests: { type: 'string' },
            notes: { type: 'string' },
          },
        },
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { customer_id } = request.body;

        if (!customer_id) {
          reply.code(400);
          return { success: false, error: 'customer_id is required' };
        }

        const result = await service.createOrder(request.body);

        return {
          success: true,
          message: 'Order created successfully',
          ...result,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Update order (requires authentication)
  fastify.put(
    '/:id',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            priority: { type: 'string' },
            total_amount: { type: 'number' },
            items: { type: 'array' },
            due_date: { type: 'string' },
            box_type: { type: 'string' },
            special_requests: { type: 'string' },
            notes: { type: 'string' },
          },
        },
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const result = await service.updateOrder(id, request.body);

        if (!result) {
          reply.code(404);
          return { success: false, error: 'Order not found' };
        }

        if (!result.changed) {
          return { success: true, message: 'No changes made' };
        }

        return { success: true, message: 'Order updated successfully', order: result.order };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Update order status (requires authentication)
  fastify.patch(
    '/:id/status',
    {
      schema: {
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string' },
            notes: { type: 'string' },
          },
        },
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { status, notes } = request.body;

        if (!status) {
          reply.code(400);
          return { success: false, error: 'Status is required' };
        }

        if (!VALID_STATUSES.includes(status)) {
          reply.code(400);
          return { success: false, error: 'Invalid status value' };
        }

        const result = await service.updateOrderStatus(id, status, notes);

        if (!result) {
          reply.code(404);
          return { success: false, error: 'Order not found' };
        }

        return { success: true, message: 'Order status updated successfully' };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Delete order (requires authentication)
  fastify.delete(
    '/:id',
    { preHandler: [fastify.authenticate, fastify.authorize(['owner', 'manager'])] },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const result = await service.deleteOrder(id);

        if (!result) {
          reply.code(404);
          return { success: false, error: 'Order not found' };
        }

        return { success: true, message: 'Order deleted successfully' };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );
}

module.exports = ordersRoutes;
