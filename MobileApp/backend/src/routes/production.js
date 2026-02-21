// Production management routes - Using DatabaseService
const { parsePagination } = require('../utils/pagination');
const ProductionService = require('../services/ProductionService');

async function productionRoutes(fastify, options) {
  const db = fastify.db;
  const service = new ProductionService(db);

  // Get production board (Kanban view) (requires authentication)
  fastify.get('/board', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const result = await service.getBoard();

      return { success: true, ...result };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get production statistics (requires authentication)
  fastify.get('/stats', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const stats = await service.getStats();

      return { success: true, stats };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get all production tasks (requires authentication)
  fastify.get('/tasks', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { status, assigned_to, order_id, priority } = request.query;
      const { limit, page, offset } = parsePagination(request.query);

      const result = await service.getTasks({
        status,
        assigned_to,
        order_id,
        priority,
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

  // Create production task (requires authentication)
  fastify.post(
    '/tasks',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['order_id', 'title'],
          properties: {
            order_id: { type: 'string' },
            title: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            assigned_to: { type: 'string' },
            due_date: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { order_id, title } = request.body;

        if (!order_id || !title) {
          reply.code(400);
          return { success: false, error: 'Order ID and title are required' };
        }

        const result = await service.createTask(request.body);

        if (result.notFound) {
          reply.code(404);
          return { success: false, error: result.error };
        }

        return {
          success: true,
          message: 'Production task created successfully',
          ...result,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Get task by ID (requires authentication)
  fastify.get('/tasks/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params;

      const task = await service.getTaskById(id);

      if (!task) {
        reply.code(404);
        return { success: false, error: 'Task not found' };
      }

      return { success: true, task };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Update task (requires authentication)
  fastify.put(
    '/tasks/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            assigned_to: { type: 'string' },
            due_date: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
            status: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const result = await service.updateTask(id, request.body);

        if (result === null) {
          reply.code(404);
          return { success: false, error: 'Task not found' };
        }

        if (result.noChanges) {
          return { success: true, message: 'No changes made' };
        }

        return { success: true, message: 'Task updated successfully', task: result.task };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Update task status (requires authentication)
  fastify.patch(
    '/tasks/:id/status',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'],
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { status } = request.body;

        if (!status) {
          reply.code(400);
          return { success: false, error: 'Status is required' };
        }

        const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
          reply.code(400);
          return { success: false, error: 'Invalid status value' };
        }

        const result = await service.updateTaskStatus(id, status);

        if (!result) {
          reply.code(404);
          return { success: false, error: 'Task not found' };
        }

        return { success: true, message: 'Task status updated successfully' };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Delete task (requires authentication)
  fastify.delete(
    '/tasks/:id',
    { preHandler: [fastify.authenticate, fastify.authorize(['owner', 'manager'])] },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const result = await service.deleteTask(id);

        if (!result) {
          reply.code(404);
          return { success: false, error: 'Task not found' };
        }

        return { success: true, message: 'Task deleted successfully' };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Update order stage (production workflow) (requires authentication)
  fastify.patch(
    '/orders/:id/stage',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['stage'],
          properties: {
            stage: {
              type: 'string',
              enum: [
                'pending',
                'designing',
                'approved',
                'production',
                'quality_control',
                'completed',
                'delivered',
                'cancelled',
              ],
            },
            notes: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { stage, notes } = request.body;

        if (!stage) {
          reply.code(400);
          return { success: false, error: 'Stage is required' };
        }

        const validStages = [
          'pending',
          'designing',
          'approved',
          'production',
          'quality_control',
          'completed',
          'cancelled',
        ];
        if (!validStages.includes(stage)) {
          reply.code(400);
          return { success: false, error: 'Invalid stage value' };
        }

        const result = await service.updateOrderStage(id, stage, notes);

        if (!result) {
          reply.code(404);
          return { success: false, error: 'Order not found' };
        }

        return { success: true, message: 'Order stage updated successfully' };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Get quality checks (requires authentication)
  fastify.get('/quality-checks', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { order_id, status } = request.query;
      const { limit, page, offset } = parsePagination(request.query);

      const result = await service.getQualityChecks({
        order_id,
        status,
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

  // Create quality check (requires authentication)
  fastify.post(
    '/quality-checks',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['order_id', 'check_type'],
          properties: {
            order_id: { type: 'string' },
            check_type: { type: 'string' },
            status: { type: 'string' },
            notes: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { order_id, check_type } = request.body;

        if (!order_id || !check_type) {
          reply.code(400);
          return { success: false, error: 'Order ID and check_type are required' };
        }

        const result = await service.createQualityCheck(request.body, request.user.id);

        return {
          success: true,
          message: 'Quality check recorded successfully',
          ...result,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Create production workflow (requires authentication)
  fastify.post(
    '/workflows',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['order_id'],
          properties: {
            order_id: { type: 'string' },
            name: { type: 'string' },
            steps: { type: 'array' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { order_id, name } = request.body;

        if (!order_id || !name) {
          reply.code(400);
          return { success: false, error: 'Order ID and name are required' };
        }

        const result = await service.createWorkflow(request.body, request.user.id);

        if (result.notFound) {
          reply.code(404);
          return { success: false, error: result.error };
        }

        return {
          success: true,
          message: 'Production workflow created successfully',
          ...result,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Get workflows by order (requires authentication)
  fastify.get(
    '/workflows/order/:orderId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const { orderId } = request.params;

        const workflows = await service.getWorkflowsByOrder(orderId);

        return { success: true, workflows };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Assign task (requires authentication)
  fastify.put(
    '/tasks/:id/assign',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['assigned_to'],
          properties: { assigned_to: { type: ['string', 'null'] } },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { assigned_to } = request.body;

        const result = await service.assignTask(id, assigned_to);

        if (!result) {
          reply.code(404);
          return { success: false, error: 'Task not found' };
        }

        return {
          success: true,
          message: 'Task assigned successfully',
          task: result.task,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Update task quality status (requires authentication)
  fastify.put(
    '/tasks/:id/quality',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['quality_status'],
          properties: { quality_status: { type: 'string' }, quality_notes: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { quality_status, quality_notes } = request.body;

        const result = await service.updateTaskQuality(id, quality_status, quality_notes);

        if (!result) {
          reply.code(404);
          return { success: false, error: 'Task not found' };
        }

        return {
          success: true,
          message: 'Task quality updated successfully',
          task: result.task,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Create production issue (requires authentication)
  fastify.post(
    '/issues',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['type', 'title'],
          properties: {
            order_id: { type: 'string' },
            task_id: { type: 'string' },
            type: { type: 'string' },
            severity: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            assigned_to: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { type, title } = request.body;

        if (!type || !title) {
          reply.code(400);
          return { success: false, error: 'Type and title are required' };
        }

        const result = await service.createIssue(request.body, request.user.id);

        return {
          success: true,
          message: 'Production issue created successfully',
          ...result,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Get production schedule (requires authentication)
  fastify.get('/schedule', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { date } = request.query;

      const result = await service.getSchedule(date);

      return { success: true, ...result };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get production analytics (requires authentication)
  fastify.get('/analytics', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { period = 'week' } = request.query;

      const analytics = await service.getAnalytics(period);

      return { success: true, analytics };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get production templates (requires authentication)
  fastify.get('/templates', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const templates = await service.getTemplates();

      return { success: true, templates };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });
}

module.exports = productionRoutes;
