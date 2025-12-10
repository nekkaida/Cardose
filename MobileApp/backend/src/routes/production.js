// Production management routes - Using DatabaseService
const { v4: uuidv4 } = require('uuid');
const DatabaseService = require('../services/DatabaseService');

async function productionRoutes(fastify, options) {
  const db = new DatabaseService();
  db.initialize();

  // Get production board (Kanban view)
  fastify.get('/board', async (request, reply) => {
    try {
      const orders = db.db.prepare(`
        SELECT o.*, c.name as customer_name
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE o.status IN ('pending', 'designing', 'approved', 'production', 'quality_control')
        ORDER BY
          CASE o.priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'normal' THEN 3
            ELSE 4
          END,
          o.due_date ASC
      `).all();

      const board = {
        pending: orders.filter(o => o.status === 'pending'),
        designing: orders.filter(o => o.status === 'designing'),
        approved: orders.filter(o => o.status === 'approved'),
        production: orders.filter(o => o.status === 'production'),
        quality_control: orders.filter(o => o.status === 'quality_control')
      };

      return {
        success: true,
        board,
        totalActive: orders.length
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Get production statistics
  fastify.get('/stats', async (request, reply) => {
    try {
      // Get active orders count
      const activeOrders = db.db.prepare(`
        SELECT COUNT(*) as count FROM orders
        WHERE status IN ('designing', 'approved', 'production', 'quality_control')
      `).get();

      // Get completed today count
      const completedToday = db.db.prepare(`
        SELECT COUNT(*) as count FROM orders
        WHERE status = 'completed'
        AND DATE(updated_at) = DATE('now')
      `).get();

      // Get pending approval count
      const pendingApproval = db.db.prepare(`
        SELECT COUNT(*) as count FROM orders
        WHERE status = 'designing'
      `).get();

      // Get quality issues count (orders in quality_control for more than 2 days)
      const qualityIssues = db.db.prepare(`
        SELECT COUNT(*) as count FROM orders
        WHERE status = 'quality_control'
        AND julianday('now') - julianday(updated_at) > 2
      `).get();

      // Get stage distribution
      const stageDistribution = db.db.prepare(`
        SELECT
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'designing' THEN 1 ELSE 0 END) as designing,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'production' THEN 1 ELSE 0 END) as production,
          SUM(CASE WHEN status = 'quality_control' THEN 1 ELSE 0 END) as quality_control,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
        FROM orders
      `).get();

      // Get overdue orders
      const overdueOrders = db.db.prepare(`
        SELECT COUNT(*) as count FROM orders
        WHERE due_date < DATE('now')
        AND status NOT IN ('completed', 'cancelled')
      `).get();

      return {
        success: true,
        stats: {
          active_orders: activeOrders.count,
          completed_today: completedToday.count,
          pending_approval: pendingApproval.count,
          quality_issues: qualityIssues.count,
          overdue_orders: overdueOrders.count,
          stage_distribution: {
            pending: stageDistribution.pending || 0,
            designing: stageDistribution.designing || 0,
            approved: stageDistribution.approved || 0,
            production: stageDistribution.production || 0,
            quality_control: stageDistribution.quality_control || 0,
            completed: stageDistribution.completed || 0
          }
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Get all production tasks
  fastify.get('/tasks', async (request, reply) => {
    try {
      const { status, assigned_to, order_id, priority, limit = 100, page = 1 } = request.query;

      let query = `
        SELECT pt.*, o.order_number, u.full_name as assigned_to_name
        FROM production_tasks pt
        LEFT JOIN orders o ON pt.order_id = o.id
        LEFT JOIN users u ON pt.assigned_to = u.id
        WHERE 1=1
      `;
      const params = [];

      if (status) {
        query += ' AND pt.status = ?';
        params.push(status);
      }
      if (assigned_to) {
        query += ' AND pt.assigned_to = ?';
        params.push(assigned_to);
      }
      if (order_id) {
        query += ' AND pt.order_id = ?';
        params.push(order_id);
      }
      if (priority) {
        query += ' AND pt.priority = ?';
        params.push(priority);
      }

      query += ' ORDER BY pt.due_date ASC, pt.priority DESC';

      // Get total count
      const countQuery = query.replace(/SELECT pt\.\*, o\.order_number, u\.full_name as assigned_to_name/, 'SELECT COUNT(*) as total');
      const countResult = db.db.prepare(countQuery).get(...params);
      const total = countResult ? countResult.total : 0;

      // Add pagination
      const offset = (page - 1) * limit;
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);

      const tasks = db.db.prepare(query).all(...params);

      // Calculate stats
      const allTasks = db.db.prepare('SELECT status, priority FROM production_tasks').all();
      const stats = {
        total: allTasks.length,
        pending: allTasks.filter(t => t.status === 'pending').length,
        in_progress: allTasks.filter(t => t.status === 'in_progress').length,
        completed: allTasks.filter(t => t.status === 'completed').length,
        cancelled: allTasks.filter(t => t.status === 'cancelled').length,
        byPriority: {
          urgent: allTasks.filter(t => t.priority === 'urgent').length,
          high: allTasks.filter(t => t.priority === 'high').length,
          normal: allTasks.filter(t => t.priority === 'normal').length,
          low: allTasks.filter(t => t.priority === 'low').length
        }
      };

      return {
        success: true,
        tasks,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
        stats
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Create production task
  fastify.post('/tasks', async (request, reply) => {
    try {
      const { order_id, title, description, assigned_to, due_date, priority = 'normal' } = request.body;

      if (!order_id || !title) {
        reply.code(400);
        return { success: false, error: 'Order ID and title are required' };
      }

      // Verify order exists
      const order = db.db.prepare('SELECT id FROM orders WHERE id = ?').get(order_id);
      if (!order) {
        reply.code(404);
        return { success: false, error: 'Order not found' };
      }

      const id = uuidv4();

      db.db.prepare(`
        INSERT INTO production_tasks (id, order_id, title, description, assigned_to, due_date, priority, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
      `).run(id, order_id, title, description, assigned_to, due_date, priority);

      const task = db.db.prepare('SELECT * FROM production_tasks WHERE id = ?').get(id);

      return {
        success: true,
        message: 'Production task created successfully',
        taskId: id,
        task
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Get task by ID
  fastify.get('/tasks/:id', async (request, reply) => {
    try {
      const { id } = request.params;

      const task = db.db.prepare(`
        SELECT pt.*, o.order_number, u.full_name as assigned_to_name
        FROM production_tasks pt
        LEFT JOIN orders o ON pt.order_id = o.id
        LEFT JOIN users u ON pt.assigned_to = u.id
        WHERE pt.id = ?
      `).get(id);

      if (!task) {
        reply.code(404);
        return { success: false, error: 'Task not found' };
      }

      return { success: true, task };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Update task
  fastify.put('/tasks/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const updates = request.body;

      const existing = db.db.prepare('SELECT * FROM production_tasks WHERE id = ?').get(id);
      if (!existing) {
        reply.code(404);
        return { success: false, error: 'Task not found' };
      }

      const fields = [];
      const values = [];

      if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
      if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
      if (updates.assigned_to !== undefined) { fields.push('assigned_to = ?'); values.push(updates.assigned_to); }
      if (updates.due_date !== undefined) { fields.push('due_date = ?'); values.push(updates.due_date); }
      if (updates.priority !== undefined) { fields.push('priority = ?'); values.push(updates.priority); }
      if (updates.status !== undefined) {
        fields.push('status = ?');
        values.push(updates.status);
        if (updates.status === 'completed') {
          fields.push('completed_at = CURRENT_TIMESTAMP');
        }
      }

      if (fields.length === 0) {
        return { success: true, message: 'No changes made' };
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      db.db.prepare(`UPDATE production_tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);

      const task = db.db.prepare('SELECT * FROM production_tasks WHERE id = ?').get(id);

      return { success: true, message: 'Task updated successfully', task };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Update task status
  fastify.patch('/tasks/:id/status', async (request, reply) => {
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

      const existing = db.db.prepare('SELECT * FROM production_tasks WHERE id = ?').get(id);
      if (!existing) {
        reply.code(404);
        return { success: false, error: 'Task not found' };
      }

      const completedAt = status === 'completed' ? new Date().toISOString() : null;

      db.db.prepare(`
        UPDATE production_tasks
        SET status = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, completedAt, id);

      return { success: true, message: 'Task status updated successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Delete task
  fastify.delete('/tasks/:id', async (request, reply) => {
    try {
      const { id } = request.params;

      const existing = db.db.prepare('SELECT * FROM production_tasks WHERE id = ?').get(id);
      if (!existing) {
        reply.code(404);
        return { success: false, error: 'Task not found' };
      }

      db.db.prepare('DELETE FROM production_tasks WHERE id = ?').run(id);

      return { success: true, message: 'Task deleted successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Update order stage (production workflow)
  fastify.patch('/orders/:id/stage', async (request, reply) => {
    try {
      const { id } = request.params;
      const { stage, notes } = request.body;

      if (!stage) {
        reply.code(400);
        return { success: false, error: 'Stage is required' };
      }

      const validStages = ['pending', 'designing', 'approved', 'production', 'quality_control', 'completed', 'cancelled'];
      if (!validStages.includes(stage)) {
        reply.code(400);
        return { success: false, error: 'Invalid stage value' };
      }

      const existing = db.db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
      if (!existing) {
        reply.code(404);
        return { success: false, error: 'Order not found' };
      }

      // Update order status
      db.db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(stage, id);

      // Record stage transition
      db.db.prepare(`
        INSERT INTO order_stages (id, order_id, stage, notes, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(uuidv4(), id, stage, notes || '');

      return { success: true, message: 'Order stage updated successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Get quality checks
  fastify.get('/quality-checks', async (request, reply) => {
    try {
      const { order_id, status, limit = 100, page = 1 } = request.query;

      let query = `
        SELECT qc.*, o.order_number, u.full_name as checked_by_name
        FROM quality_checks qc
        LEFT JOIN orders o ON qc.order_id = o.id
        LEFT JOIN users u ON qc.checked_by = u.id
        WHERE 1=1
      `;
      const params = [];

      if (order_id) {
        query += ' AND qc.order_id = ?';
        params.push(order_id);
      }
      if (status) {
        query += ' AND qc.overall_status = ?';
        params.push(status);
      }

      query += ' ORDER BY qc.checked_at DESC';

      // Get total count
      const countQuery = query.replace(/SELECT qc\.\*, o\.order_number, u\.full_name as checked_by_name/, 'SELECT COUNT(*) as total');
      const countResult = db.db.prepare(countQuery).get(...params);
      const total = countResult ? countResult.total : 0;

      // Add pagination
      const offset = (page - 1) * limit;
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);

      const checks = db.db.prepare(query).all(...params);

      // Parse checklist items JSON
      const checksWithParsedItems = checks.map(check => ({
        ...check,
        checklist_items: check.checklist_items ? JSON.parse(check.checklist_items) : []
      }));

      return {
        success: true,
        checks: checksWithParsedItems,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Create quality check
  fastify.post('/quality-checks', async (request, reply) => {
    try {
      const { order_id, checklist_items, overall_status, notes } = request.body;

      if (!order_id || !checklist_items) {
        reply.code(400);
        return { success: false, error: 'Order ID and checklist items are required' };
      }

      const id = uuidv4();

      db.db.prepare(`
        INSERT INTO quality_checks (id, order_id, checklist_items, overall_status, notes, checked_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(id, order_id, JSON.stringify(checklist_items), overall_status || 'pending', notes);

      // If passed, update order status to completed
      if (overall_status === 'passed') {
        db.db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('completed', order_id);
      }

      const check = db.db.prepare('SELECT * FROM quality_checks WHERE id = ?').get(id);

      return {
        success: true,
        message: 'Quality check recorded successfully',
        checkId: id,
        check: {
          ...check,
          checklist_items: JSON.parse(check.checklist_items)
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });
}

module.exports = productionRoutes;
