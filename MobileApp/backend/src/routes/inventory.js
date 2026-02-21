// Inventory management routes - Using DatabaseService
const { parsePagination } = require('../utils/pagination');
const InventoryService = require('../services/InventoryService');

async function inventoryRoutes(fastify, options) {
  const db = fastify.db;
  const service = new InventoryService(db);

  // Get all inventory items (requires authentication)
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { category, lowStock, search, sort_by, sort_order } = request.query;
      const { limit, page, offset } = parsePagination(request.query);

      const result = await service.getInventoryItems({
        category,
        lowStock,
        search,
        sort_by,
        sort_order,
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

  // Get low stock items (requires authentication)
  fastify.get('/low-stock', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const result = await service.getLowStockItems();

      return { success: true, ...result };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get inventory stats (requires authentication)
  fastify.get('/stats', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const stats = await service.getInventoryStats();

      return { success: true, stats };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get single inventory item (requires authentication)
  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params;
      const item = await service.getInventoryItemById(id);

      if (!item) {
        reply.code(404);
        return { success: false, error: 'Inventory item not found' };
      }

      return { success: true, item };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Create inventory item (requires authentication)
  fastify.post(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'category'],
          properties: {
            name: { type: 'string', minLength: 1 },
            category: { type: 'string' },
            current_stock: { type: 'number' },
            reorder_level: { type: 'number' },
            unit_cost: { type: 'number' },
            supplier: { type: 'string' },
            unit: { type: 'string' },
            notes: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { name, category } = request.body;

        if (!name || !category) {
          reply.code(400);
          return { success: false, error: 'Name and category are required' };
        }

        const result = await service.createInventoryItem(request.body);

        return {
          success: true,
          message: 'Inventory item created successfully',
          ...result,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Update inventory item (requires authentication)
  fastify.put(
    '/:id',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            category: { type: 'string' },
            current_stock: { type: 'number' },
            reorder_level: { type: 'number' },
            unit_cost: { type: 'number' },
            supplier: { type: 'string' },
            unit: { type: 'string' },
            notes: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const result = await service.updateInventoryItem(id, request.body);

        if (!result) {
          reply.code(404);
          return { success: false, error: 'Inventory item not found' };
        }

        if (result.noChanges) {
          return { success: true, message: 'No changes made' };
        }

        return { success: true, message: 'Inventory item updated successfully', item: result.item };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Delete inventory item (requires authentication)
  fastify.delete(
    '/:id',
    { preHandler: [fastify.authenticate, fastify.authorize(['owner', 'manager'])] },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const result = await service.deleteInventoryItem(id);

        if (!result) {
          reply.code(404);
          return { success: false, error: 'Inventory item not found' };
        }

        return { success: true, message: 'Inventory item deleted successfully' };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Record inventory movement (requires authentication)
  fastify.post(
    '/movements',
    {
      schema: {
        body: {
          type: 'object',
          required: ['type', 'item_id', 'quantity'],
          properties: {
            type: { type: 'string' },
            item_id: { type: 'string' },
            quantity: { type: 'number' },
            unit_cost: { type: 'number' },
            reason: { type: 'string' },
            order_id: { type: 'string' },
            notes: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { type, item_id, quantity } = request.body;

        if (!type || !item_id || !quantity) {
          reply.code(400);
          return { success: false, error: 'Type, item_id, and quantity are required' };
        }

        if (type !== 'adjustment' && quantity <= 0) {
          reply.code(400);
          return { success: false, error: 'Quantity must be a positive number' };
        }

        const result = await service.createInventoryMovement(request.body, request.user.id);

        if (result.error) {
          reply.code(result.statusCode);
          return { success: false, error: result.error };
        }

        return {
          success: true,
          message: 'Inventory movement recorded successfully',
          ...result,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Get inventory movements (requires authentication)
  fastify.get('/movements', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { item_id, type, limit = 100 } = request.query;

      const result = await service.getInventoryMovements({ item_id, type, limit });

      return { success: true, ...result };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get reorder alerts (requires authentication)
  fastify.get('/reorder-alerts', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { status } = request.query;

      const result = await service.getReorderAlerts({ status });

      return { success: true, ...result };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Create reorder alert (requires authentication)
  fastify.post(
    '/reorder-alerts',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const { item_id } = request.body;

        if (!item_id) {
          reply.code(400);
          return { success: false, error: 'Item ID is required' };
        }

        const result = await service.createReorderAlert(request.body, request.user.id);

        if (result.error) {
          reply.code(result.statusCode);
          const response = { success: false, error: result.error };
          if (result.existingAlert) {
            response.existingAlert = result.existingAlert;
          }
          return response;
        }

        return {
          success: true,
          message: 'Reorder alert created successfully',
          ...result,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Update reorder alert status (requires authentication)
  fastify.put(
    '/reorder-alerts/:alertId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const { alertId } = request.params;

        const result = await service.updateReorderAlert(alertId, request.body, request.user.id);

        if (!result) {
          reply.code(404);
          return { success: false, error: 'Reorder alert not found' };
        }

        if (result.error) {
          reply.code(result.statusCode);
          return { success: false, error: result.error };
        }

        return {
          success: true,
          message: 'Reorder alert updated successfully',
          alert: result.alert,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );
}

module.exports = inventoryRoutes;
