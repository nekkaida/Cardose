// Order management routes - Using DatabaseService
const { v4: uuidv4 } = require('uuid');
async function ordersRoutes(fastify, options) {
  const db = fastify.db;

  // Get all orders (requires authentication)
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { status, priority, customer_id, limit = 100, page = 1 } = request.query;

      let query = 'SELECT o.*, c.name as customer_name FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE 1=1';
      const params = [];

      if (status) {
        query += ' AND o.status = ?';
        params.push(status);
      }
      if (priority) {
        query += ' AND o.priority = ?';
        params.push(priority);
      }
      if (customer_id) {
        query += ' AND o.customer_id = ?';
        params.push(customer_id);
      }

      query += ' ORDER BY o.created_at DESC';

      // Get total count
      const countQuery = query.replace('SELECT o.*, c.name as customer_name', 'SELECT COUNT(*) as total');
      const countResult = db.db.prepare(countQuery).get(...params);
      const total = countResult ? countResult.total : 0;

      // Add pagination
      const offset = (page - 1) * limit;
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);

      const orders = db.db.prepare(query).all(...params);

      // Calculate stats
      const allOrders = db.db.prepare('SELECT status, total_amount FROM orders').all();
      const stats = {
        total: allOrders.length,
        pending: allOrders.filter(o => o.status === 'pending').length,
        designing: allOrders.filter(o => o.status === 'designing').length,
        approved: allOrders.filter(o => o.status === 'approved').length,
        production: allOrders.filter(o => o.status === 'production').length,
        quality_control: allOrders.filter(o => o.status === 'quality_control').length,
        completed: allOrders.filter(o => o.status === 'completed').length,
        cancelled: allOrders.filter(o => o.status === 'cancelled').length,
        totalValue: allOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
      };

      return {
        success: true,
        orders,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
        stats
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get order stats (requires authentication)
  fastify.get('/stats', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const orders = db.db.prepare('SELECT status, priority, total_amount, due_date FROM orders').all();

      const today = new Date();
      const stats = {
        total: orders.length,
        byStatus: {
          pending: orders.filter(o => o.status === 'pending').length,
          designing: orders.filter(o => o.status === 'designing').length,
          approved: orders.filter(o => o.status === 'approved').length,
          production: orders.filter(o => o.status === 'production').length,
          quality_control: orders.filter(o => o.status === 'quality_control').length,
          completed: orders.filter(o => o.status === 'completed').length,
          cancelled: orders.filter(o => o.status === 'cancelled').length
        },
        byPriority: {
          low: orders.filter(o => o.priority === 'low').length,
          normal: orders.filter(o => o.priority === 'normal').length,
          high: orders.filter(o => o.priority === 'high').length,
          urgent: orders.filter(o => o.priority === 'urgent').length
        },
        totalValue: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
        overdue: orders.filter(o => o.due_date && new Date(o.due_date) < today && o.status !== 'completed' && o.status !== 'cancelled').length
      };

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
      const nextOrderNumber = await generateOrderNumber(db);

      return {
        success: true,
        orderNumber: nextOrderNumber
      };
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
      const order = db.db.prepare('SELECT o.*, c.name as customer_name FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE o.id = ?').get(id);

      if (!order) {
        reply.code(404);
        return { success: false, error: 'Order not found' };
      }

      // Get order stages
      const stages = db.db.prepare('SELECT * FROM order_stages WHERE order_id = ? ORDER BY created_at').all(id);

      return {
        success: true,
        order: { ...order, stages }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Create new order (requires authentication)
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { customer_id, total_amount, priority = 'normal', due_date, box_type } = request.body;

      if (!customer_id) {
        reply.code(400);
        return { success: false, error: 'customer_id is required' };
      }

      const id = uuidv4();
      const orderNumber = await generateOrderNumber(db);

      db.db.prepare(`
        INSERT INTO orders (id, order_number, customer_id, status, priority, total_amount, due_date, box_type)
        VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)
      `).run(id, orderNumber, customer_id, priority, total_amount || 0, due_date, box_type);

      const order = db.db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

      return {
        success: true,
        message: 'Order created successfully',
        orderId: id,
        order
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Update order (requires authentication)
  fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params;
      const updates = request.body;

      const existing = db.db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
      if (!existing) {
        reply.code(404);
        return { success: false, error: 'Order not found' };
      }

      const fields = [];
      const values = [];

      if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
      if (updates.priority !== undefined) { fields.push('priority = ?'); values.push(updates.priority); }
      if (updates.total_amount !== undefined) { fields.push('total_amount = ?'); values.push(updates.total_amount); }
      if (updates.due_date !== undefined) { fields.push('due_date = ?'); values.push(updates.due_date); }
      if (updates.box_type !== undefined) { fields.push('box_type = ?'); values.push(updates.box_type); }

      if (fields.length === 0) {
        return { success: true, message: 'No changes made' };
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      db.db.prepare(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`).run(...values);

      const order = db.db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

      return { success: true, message: 'Order updated successfully', order };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Update order status (requires authentication)
  fastify.patch('/:id/status', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { status, notes } = request.body;

      if (!status) {
        reply.code(400);
        return { success: false, error: 'Status is required' };
      }

      const validStatuses = ['pending', 'designing', 'approved', 'production', 'quality_control', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        reply.code(400);
        return { success: false, error: 'Invalid status value' };
      }

      const existing = db.db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
      if (!existing) {
        reply.code(404);
        return { success: false, error: 'Order not found' };
      }

      db.db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);

      // Add to order stages
      db.db.prepare(`
        INSERT INTO order_stages (id, order_id, stage, notes, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(uuidv4(), id, status, notes || '');

      return { success: true, message: 'Order status updated successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Delete order (requires authentication)
  fastify.delete('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['owner', 'manager'])] }, async (request, reply) => {
    try {
      const { id } = request.params;

      const existing = db.db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
      if (!existing) {
        reply.code(404);
        return { success: false, error: 'Order not found' };
      }

      db.db.prepare('DELETE FROM order_stages WHERE order_id = ?').run(id);
      db.db.prepare('DELETE FROM orders WHERE id = ?').run(id);

      return { success: true, message: 'Order deleted successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });
}

// Generate unique order number
async function generateOrderNumber(db) {
  const year = new Date().getFullYear();
  const prefix = `PGB-${year}-`;

  const latestOrder = db.db.prepare(
    "SELECT order_number FROM orders WHERE order_number LIKE ? ORDER BY order_number DESC LIMIT 1"
  ).get(`${prefix}%`);

  let nextNumber = 1;
  if (latestOrder) {
    const currentNumber = parseInt(latestOrder.order_number.split('-').pop());
    nextNumber = currentNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
}

module.exports = ordersRoutes;
