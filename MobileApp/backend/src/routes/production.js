// Production management routes - Using DatabaseService
const { v4: uuidv4 } = require('uuid');
const { parsePagination } = require('../utils/pagination');
async function productionRoutes(fastify, options) {
  const db = fastify.db;

  // Get production board (Kanban view) (requires authentication)
  fastify.get('/board', { preHandler: [fastify.authenticate] }, async (request, reply) => {
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
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get production statistics (requires authentication)
  fastify.get('/stats', { preHandler: [fastify.authenticate] }, async (request, reply) => {
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
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get all production tasks (requires authentication)
  fastify.get('/tasks', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { status, assigned_to, order_id, priority } = request.query;
      const { limit, page, offset } = parsePagination(request.query);

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
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const tasks = db.db.prepare(query).all(...params);

      // Calculate stats using SQL aggregates
      const statsRow = db.db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as priority_urgent,
          SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as priority_high,
          SUM(CASE WHEN priority = 'normal' THEN 1 ELSE 0 END) as priority_normal,
          SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as priority_low
        FROM production_tasks
      `).get();
      const stats = {
        total: statsRow.total,
        pending: statsRow.pending,
        in_progress: statsRow.in_progress,
        completed: statsRow.completed,
        cancelled: statsRow.cancelled,
        byPriority: {
          urgent: statsRow.priority_urgent,
          high: statsRow.priority_high,
          normal: statsRow.priority_normal,
          low: statsRow.priority_low
        }
      };

      return {
        success: true,
        tasks,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        stats
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Create production task (requires authentication)
  fastify.post('/tasks', { preHandler: [fastify.authenticate], schema: { body: { type: 'object', required: ['order_id', 'title'], properties: { order_id: { type: 'string' }, title: { type: 'string', minLength: 1 }, description: { type: 'string' }, assigned_to: { type: 'string' }, due_date: { type: 'string' }, priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] } } } } }, async (request, reply) => {
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
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get task by ID (requires authentication)
  fastify.get('/tasks/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
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
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Update task (requires authentication)
  fastify.put('/tasks/:id', { preHandler: [fastify.authenticate], schema: { body: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, assigned_to: { type: 'string' }, due_date: { type: 'string' }, priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] }, status: { type: 'string' } } } } }, async (request, reply) => {
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
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Update task status (requires authentication)
  fastify.patch('/tasks/:id/status', { preHandler: [fastify.authenticate], schema: { body: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'] } } } } }, async (request, reply) => {
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
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Delete task (requires authentication)
  fastify.delete('/tasks/:id', { preHandler: [fastify.authenticate, fastify.authorize(['owner', 'manager'])] }, async (request, reply) => {
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
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Update order stage (production workflow) (requires authentication)
  fastify.patch('/orders/:id/stage', { preHandler: [fastify.authenticate], schema: { body: { type: 'object', required: ['stage'], properties: { stage: { type: 'string', enum: ['pending', 'designing', 'approved', 'production', 'quality_control', 'completed', 'delivered'] } } } } }, async (request, reply) => {
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
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get quality checks (requires authentication)
  fastify.get('/quality-checks', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { order_id, status } = request.query;
      const { limit, page, offset } = parsePagination(request.query);

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
        query += ' AND qc.status = ?';
        params.push(status);
      }

      query += ' ORDER BY qc.checked_at DESC';

      // Get total count
      const countQuery = query.replace(/SELECT qc\.\*, o\.order_number, u\.full_name as checked_by_name/, 'SELECT COUNT(*) as total');
      const countResult = db.db.prepare(countQuery).get(...params);
      const total = countResult ? countResult.total : 0;

      // Add pagination
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const checks = db.db.prepare(query).all(...params);

      return {
        success: true,
        checks,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Create quality check (requires authentication)
  fastify.post('/quality-checks', { preHandler: [fastify.authenticate], schema: { body: { type: 'object', required: ['order_id', 'check_type'], properties: { order_id: { type: 'string' }, check_type: { type: 'string' }, status: { type: 'string' }, notes: { type: 'string' } } } } }, async (request, reply) => {
    try {
      const { order_id, check_type, status, notes } = request.body;

      if (!order_id || !check_type) {
        reply.code(400);
        return { success: false, error: 'Order ID and check_type are required' };
      }

      const id = uuidv4();

      db.db.prepare(`
        INSERT INTO quality_checks (id, order_id, check_type, status, notes, checked_by, checked_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(id, order_id, check_type, status || 'pending', notes, request.user.id);

      // If passed, update order status to completed
      if (status === 'passed') {
        db.db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('completed', order_id);
      }

      const check = db.db.prepare('SELECT * FROM quality_checks WHERE id = ?').get(id);

      return {
        success: true,
        message: 'Quality check recorded successfully',
        checkId: id,
        check
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Create production workflow (requires authentication)
  fastify.post('/workflows', { preHandler: [fastify.authenticate], schema: { body: { type: 'object', required: ['order_id'], properties: { order_id: { type: 'string' }, name: { type: 'string' }, steps: { type: 'array' } } } } }, async (request, reply) => {
    try {
      const { order_id, name, steps } = request.body;

      if (!order_id || !name) {
        reply.code(400);
        return { success: false, error: 'Order ID and name are required' };
      }

      // Verify order exists
      const order = db.db.prepare('SELECT id FROM orders WHERE id = ?').get(order_id);
      if (!order) {
        reply.code(404);
        return { success: false, error: 'Order not found' };
      }

      const id = uuidv4();
      const stepsArray = steps || [];
      const totalSteps = stepsArray.length;

      db.db.prepare(`
        INSERT INTO production_workflows (id, order_id, name, steps, total_steps, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, order_id, name, JSON.stringify(stepsArray), totalSteps, request.user.id);

      const workflow = db.db.prepare('SELECT * FROM production_workflows WHERE id = ?').get(id);

      return {
        success: true,
        message: 'Production workflow created successfully',
        workflowId: id,
        workflow: {
          ...workflow,
          steps: JSON.parse(workflow.steps || '[]')
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get workflows by order (requires authentication)
  fastify.get('/workflows/order/:orderId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { orderId } = request.params;

      const workflows = db.db.prepare(`
        SELECT pw.*, u.full_name as created_by_name
        FROM production_workflows pw
        LEFT JOIN users u ON pw.created_by = u.id
        WHERE pw.order_id = ?
        ORDER BY pw.created_at DESC
      `).all(orderId);

      const workflowsWithParsedSteps = workflows.map(w => ({
        ...w,
        steps: JSON.parse(w.steps || '[]')
      }));

      return {
        success: true,
        workflows: workflowsWithParsedSteps
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Assign task (requires authentication)
  fastify.put('/tasks/:id/assign', { preHandler: [fastify.authenticate], schema: { body: { type: 'object', required: ['assigned_to'], properties: { assigned_to: { type: ['string', 'null'] } } } } }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { assigned_to } = request.body;

      const existing = db.db.prepare('SELECT * FROM production_tasks WHERE id = ?').get(id);
      if (!existing) {
        reply.code(404);
        return { success: false, error: 'Task not found' };
      }

      db.db.prepare(`
        UPDATE production_tasks
        SET assigned_to = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(assigned_to, id);

      const task = db.db.prepare(`
        SELECT pt.*, u.full_name as assigned_to_name
        FROM production_tasks pt
        LEFT JOIN users u ON pt.assigned_to = u.id
        WHERE pt.id = ?
      `).get(id);

      return {
        success: true,
        message: 'Task assigned successfully',
        task
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Update task quality status (requires authentication)
  fastify.put('/tasks/:id/quality', { preHandler: [fastify.authenticate], schema: { body: { type: 'object', required: ['quality_status'], properties: { quality_status: { type: 'string' }, quality_notes: { type: 'string' } } } } }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { quality_status, quality_notes } = request.body;

      const existing = db.db.prepare('SELECT * FROM production_tasks WHERE id = ?').get(id);
      if (!existing) {
        reply.code(404);
        return { success: false, error: 'Task not found' };
      }

      // Update task with quality info in notes
      const updatedNotes = existing.notes
        ? `${existing.notes}\n\nQuality Check (${quality_status}): ${quality_notes || 'No notes'}`
        : `Quality Check (${quality_status}): ${quality_notes || 'No notes'}`;

      db.db.prepare(`
        UPDATE production_tasks
        SET notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(updatedNotes, id);

      const task = db.db.prepare('SELECT * FROM production_tasks WHERE id = ?').get(id);

      return {
        success: true,
        message: 'Task quality updated successfully',
        task
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Create production issue (requires authentication)
  fastify.post('/issues', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { order_id, task_id, type, severity = 'medium', title, description, assigned_to } = request.body;

      if (!type || !title) {
        reply.code(400);
        return { success: false, error: 'Type and title are required' };
      }

      const id = uuidv4();

      db.db.prepare(`
        INSERT INTO production_issues (id, order_id, task_id, type, severity, title, description, reported_by, assigned_to)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, order_id, task_id, type, severity, title, description, request.user.id, assigned_to);

      const issue = db.db.prepare('SELECT * FROM production_issues WHERE id = ?').get(id);

      return {
        success: true,
        message: 'Production issue created successfully',
        issueId: id,
        issue
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get production schedule (requires authentication)
  fastify.get('/schedule', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { date } = request.query;

      let query = `
        SELECT pt.*, o.order_number, o.customer_id, c.name as customer_name, u.full_name as assigned_to_name
        FROM production_tasks pt
        LEFT JOIN orders o ON pt.order_id = o.id
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN users u ON pt.assigned_to = u.id
        WHERE pt.status IN ('pending', 'in_progress')
      `;
      const params = [];

      if (date) {
        query += ' AND DATE(pt.due_date) = DATE(?)';
        params.push(date);
      }

      query += ' ORDER BY pt.due_date ASC, pt.priority DESC';

      const tasks = db.db.prepare(query).all(...params);

      // Group by date
      const schedule = {};
      tasks.forEach(task => {
        const taskDate = task.due_date ? task.due_date.split('T')[0] : 'unscheduled';
        if (!schedule[taskDate]) {
          schedule[taskDate] = [];
        }
        schedule[taskDate].push(task);
      });

      return {
        success: true,
        schedule,
        totalTasks: tasks.length
      };
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

      // Determine date offset based on period
      let dateOffset = '-7 days';
      if (period === 'day') {
        dateOffset = '-1 days';
      } else if (period === 'month') {
        dateOffset = '-30 days';
      }

      // Tasks completed
      const tasksCompleted = db.db.prepare(`
        SELECT COUNT(*) as count FROM production_tasks
        WHERE status = 'completed' AND DATE(created_at) >= DATE('now', ?)
      `).get(dateOffset);

      // Average completion time (in hours)
      const avgCompletionTime = db.db.prepare(`
        SELECT AVG(julianday(completed_at) - julianday(created_at)) * 24 as avg_hours
        FROM production_tasks
        WHERE status = 'completed' AND completed_at IS NOT NULL AND DATE(created_at) >= DATE('now', ?)
      `).get(dateOffset);

      // Orders processed
      const ordersProcessed = db.db.prepare(`
        SELECT COUNT(*) as count FROM orders
        WHERE status = 'completed' AND DATE(created_at) >= DATE('now', ?)
      `).get(dateOffset);

      // Quality pass rate
      const qualityStats = db.db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed
        FROM quality_checks
        WHERE DATE(checked_at) >= DATE('now', ?)
      `).get(dateOffset);

      const passRate = qualityStats.total > 0
        ? ((qualityStats.passed / qualityStats.total) * 100).toFixed(1)
        : 0;

      // Productivity by user
      const productivityByUser = db.db.prepare(`
        SELECT u.full_name, COUNT(*) as tasks_completed
        FROM production_tasks pt
        LEFT JOIN users u ON pt.assigned_to = u.id
        WHERE pt.status = 'completed' AND DATE(pt.created_at) >= DATE('now', ?)
        GROUP BY pt.assigned_to
        ORDER BY tasks_completed DESC
        LIMIT 10
      `).all(dateOffset);

      return {
        success: true,
        analytics: {
          period,
          tasks_completed: tasksCompleted.count,
          avg_completion_time_hours: avgCompletionTime.avg_hours?.toFixed(1) || 0,
          orders_processed: ordersProcessed.count,
          quality_pass_rate: passRate,
          productivity_by_user: productivityByUser
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get production templates (requires authentication)
  fastify.get('/templates', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const templates = db.db.prepare(`
        SELECT pt.*, u.full_name as created_by_name
        FROM production_templates pt
        LEFT JOIN users u ON pt.created_by = u.id
        WHERE pt.is_active = 1
        ORDER BY pt.name ASC
      `).all();

      const templatesWithParsedSteps = templates.map(t => ({
        ...t,
        steps: JSON.parse(t.steps || '[]')
      }));

      return {
        success: true,
        templates: templatesWithParsedSteps
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });
}

module.exports = productionRoutes;
