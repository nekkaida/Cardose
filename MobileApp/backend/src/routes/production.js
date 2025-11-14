// Production management routes for Premium Gift Box backend
const { v4: uuidv4 } = require('uuid');

async function productionRoutes(fastify, options) {
  const db = fastify.db;

  // Get production statistics
  fastify.get('/stats', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      // Get active orders count
      const activeOrders = await db.all(
        `SELECT COUNT(*) as count FROM orders
         WHERE status IN ('designing', 'approved', 'production', 'quality_control')`
      );

      // Get completed today count
      const completedToday = await db.all(
        `SELECT COUNT(*) as count FROM orders
         WHERE status = 'completed'
         AND DATE(updated_at) = DATE('now')`
      );

      // Get pending approval count
      const pendingApproval = await db.all(
        `SELECT COUNT(*) as count FROM orders
         WHERE status = 'designing'`
      );

      // Get quality issues count (orders in quality_control for more than 2 days)
      const qualityIssues = await db.all(
        `SELECT COUNT(*) as count FROM orders
         WHERE status = 'quality_control'
         AND julianday('now') - julianday(updated_at) > 2`
      );

      // Get stage distribution
      const stageDistribution = await db.all(
        `SELECT
          SUM(CASE WHEN status = 'designing' THEN 1 ELSE 0 END) as designing,
          SUM(CASE WHEN status = 'production' THEN 1 ELSE 0 END) as production,
          SUM(CASE WHEN status = 'quality_control' THEN 1 ELSE 0 END) as quality_control,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
         FROM orders
         WHERE status IN ('designing', 'production', 'quality_control', 'completed')`
      );

      return {
        stats: {
          active_orders: activeOrders[0].count,
          completed_today: completedToday[0].count,
          pending_approval: pendingApproval[0].count,
          quality_issues: qualityIssues[0].count,
          stage_distribution: {
            designing: stageDistribution[0].designing || 0,
            production: stageDistribution[0].production || 0,
            quality_control: stageDistribution[0].quality_control || 0,
            completed: stageDistribution[0].completed || 0
          }
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch production stats' });
    }
  });

  // Get active production orders
  fastify.get('/active-orders', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const orders = await db.all(
        `SELECT
          o.id,
          o.order_number,
          c.name as customer_name,
          o.status,
          o.status as current_stage,
          o.estimated_completion,
          o.priority,
          o.created_at,
          CASE
            WHEN o.status = 'designing' THEN 25
            WHEN o.status = 'approved' THEN 40
            WHEN o.status = 'production' THEN 60
            WHEN o.status = 'quality_control' THEN 85
            WHEN o.status = 'completed' THEN 100
            ELSE 0
          END as completion_percentage
         FROM orders o
         INNER JOIN customers c ON o.customer_id = c.id
         WHERE o.status IN ('designing', 'approved', 'production', 'quality_control')
         ORDER BY
           CASE o.priority
             WHEN 'urgent' THEN 1
             WHEN 'high' THEN 2
             WHEN 'normal' THEN 3
             ELSE 4
           END,
           o.estimated_completion ASC
         LIMIT 20`,
        []
      );

      return { orders };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch active orders' });
    }
  });

  // Update order stage
  fastify.put('/orders/:orderId/stage', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { orderId } = request.params;
      const { stage, notes } = request.body;

      const validStages = ['designing', 'approved', 'production', 'quality_control', 'completed'];
      if (!validStages.includes(stage)) {
        return reply.status(400).send({ error: 'Invalid stage' });
      }

      // Update order status
      await db.run(
        'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [stage, orderId]
      );

      // Record stage transition
      await db.run(
        `INSERT INTO order_stages (id, order_id, stage, start_date, notes, created_by)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`,
        [uuidv4(), orderId, stage, notes || null, request.user.id]
      );

      return {
        success: true,
        message: 'Order stage updated successfully'
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to update order stage' });
    }
  });

  // Get order stage history
  fastify.get('/orders/:orderId/stages', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { orderId } = request.params;

      const stages = await db.all(
        `SELECT
          os.id,
          os.stage,
          os.start_date,
          os.end_date,
          os.notes,
          u.full_name as created_by_name,
          os.created_by
         FROM order_stages os
         LEFT JOIN users u ON os.created_by = u.id
         WHERE os.order_id = ?
         ORDER BY os.start_date DESC`,
        [orderId]
      );

      return { stages };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch order stages' });
    }
  });

  // Create production task
  fastify.post('/tasks', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { orderId, title, description, assignedTo, dueDate, priority } = request.body;

      if (!orderId || !title) {
        return reply.status(400).send({
          error: 'Order ID and task title are required'
        });
      }

      const taskId = uuidv4();

      await db.run(
        `INSERT INTO production_tasks (id, order_id, title, description, assigned_to,
         due_date, priority, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [taskId, orderId, title, description || null, assignedTo || null,
         dueDate || null, priority || 'normal', request.user.id]
      );

      return {
        success: true,
        taskId,
        message: 'Production task created successfully'
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to create production task' });
    }
  });

  // Get production tasks
  fastify.get('/tasks', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { orderId, status, assignedTo } = request.query;

      let sql = `
        SELECT
          pt.id,
          pt.order_id,
          o.order_number,
          pt.title,
          pt.description,
          pt.status,
          pt.priority,
          pt.due_date,
          u1.full_name as assigned_to_name,
          u2.full_name as created_by_name,
          pt.created_at,
          pt.completed_at
        FROM production_tasks pt
        LEFT JOIN orders o ON pt.order_id = o.id
        LEFT JOIN users u1 ON pt.assigned_to = u1.id
        LEFT JOIN users u2 ON pt.created_by = u2.id
        WHERE 1=1
      `;

      const params = [];

      if (orderId) {
        sql += ' AND pt.order_id = ?';
        params.push(orderId);
      }

      if (status) {
        sql += ' AND pt.status = ?';
        params.push(status);
      }

      if (assignedTo) {
        sql += ' AND pt.assigned_to = ?';
        params.push(assignedTo);
      }

      sql += ' ORDER BY pt.due_date ASC, pt.priority ASC';

      const tasks = await db.all(sql, params);

      return { tasks };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch production tasks' });
    }
  });

  // Update task status
  fastify.put('/tasks/:taskId/status', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { taskId } = request.params;
      const { status, notes } = request.body;

      const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return reply.status(400).send({ error: 'Invalid status' });
      }

      const updates = { status };
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      if (notes) {
        updates.notes = notes;
      }

      const fields = Object.keys(updates);
      const values = Object.values(updates);
      const setClause = fields.map(field => `${field} = ?`).join(', ');

      await db.run(
        `UPDATE production_tasks SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [...values, taskId]
      );

      return {
        success: true,
        message: 'Task status updated successfully'
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to update task status' });
    }
  });

  // Create quality control checklist
  fastify.post('/quality-check', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { orderId, checklistItems, overallStatus, notes } = request.body;

      if (!orderId || !checklistItems || !Array.isArray(checklistItems)) {
        return reply.status(400).send({
          error: 'Order ID and checklist items are required'
        });
      }

      const checkId = uuidv4();

      await db.run(
        `INSERT INTO quality_checks (id, order_id, checklist_items, overall_status,
         notes, checked_by, checked_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [checkId, orderId, JSON.stringify(checklistItems), overallStatus || 'pending',
         notes || null, request.user.id]
      );

      // If quality check passed, update order status
      if (overallStatus === 'passed') {
        await db.run(
          'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['completed', orderId]
        );
      }

      return {
        success: true,
        checkId,
        message: 'Quality check recorded successfully'
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to create quality check' });
    }
  });

  // Get quality checks for an order
  fastify.get('/quality-checks/:orderId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { orderId } = request.params;

      const checks = await db.all(
        `SELECT
          qc.id,
          qc.order_id,
          qc.checklist_items,
          qc.overall_status,
          qc.notes,
          u.full_name as checked_by_name,
          qc.checked_at
         FROM quality_checks qc
         LEFT JOIN users u ON qc.checked_by = u.id
         WHERE qc.order_id = ?
         ORDER BY qc.checked_at DESC`,
        [orderId]
      );

      // Parse checklist items JSON
      const checksWithParsedItems = checks.map(check => ({
        ...check,
        checklist_items: JSON.parse(check.checklist_items)
      }));

      return { checks: checksWithParsedItems };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch quality checks' });
    }
  });

  // Get production timeline for an order
  fastify.get('/orders/:orderId/timeline', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { orderId } = request.params;

      // Get order details
      const order = await db.getOrderById(orderId);
      if (!order) {
        return reply.status(404).send({ error: 'Order not found' });
      }

      // Get stage history
      const stages = await db.all(
        `SELECT * FROM order_stages WHERE order_id = ? ORDER BY start_date ASC`,
        [orderId]
      );

      // Get tasks
      const tasks = await db.all(
        `SELECT * FROM production_tasks WHERE order_id = ? ORDER BY created_at ASC`,
        [orderId]
      );

      // Get quality checks
      const checks = await db.all(
        `SELECT * FROM quality_checks WHERE order_id = ? ORDER BY checked_at ASC`,
        [orderId]
      );

      return {
        order: {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          created_at: order.created_at,
          estimated_completion: order.estimated_completion,
          actual_completion: order.actual_completion
        },
        timeline: {
          stages,
          tasks,
          quality_checks: checks.map(c => ({
            ...c,
            checklist_items: JSON.parse(c.checklist_items)
          }))
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch production timeline' });
    }
  });
}

module.exports = productionRoutes;
