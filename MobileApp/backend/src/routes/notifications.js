// Notification routes
const { v4: uuidv4 } = require('uuid');
const { parsePagination } = require('../utils/pagination');

async function notificationRoutes(fastify, options) {
  const db = fastify.db;

  // Get all notifications (requires authentication)
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { type, read } = request.query;
      const { limit, page, offset } = parsePagination(request.query);

      let query = 'SELECT * FROM notifications WHERE 1=1';
      const params = [];

      if (type) {
        query += ' AND type = ?';
        params.push(type);
      }
      if (read !== undefined) {
        query += ' AND is_read = ?';
        params.push(read === 'true' ? 1 : 0);
      }

      query += ' ORDER BY created_at DESC';

      // Get total count
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
      const countResult = db.db.prepare(countQuery).get(...params);
      const total = countResult ? countResult.total : 0;

      // Add pagination
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const notifications = db.db.prepare(query).all(...params);

      return {
        success: true,
        notifications,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Get unread notifications (requires authentication)
  fastify.get('/unread', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const notifications = db.db.prepare(`
        SELECT * FROM notifications
        WHERE is_read = 0
        ORDER BY created_at DESC
        LIMIT 50
      `).all();

      const count = db.db.prepare('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0').get();

      return {
        success: true,
        notifications,
        count: count?.count || 0
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Create notification (requires authentication)
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { type, title, message, user_id, entity_type, entity_id, priority = 'normal' } = request.body;

      if (!title || !message) {
        reply.code(400);
        return { success: false, error: 'Title and message are required' };
      }

      const id = uuidv4();

      db.db.prepare(`
        INSERT INTO notifications (id, type, title, message, user_id, data, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
      `).run(id, type || 'info', title, message, user_id, JSON.stringify({ entity_type, entity_id, priority }));

      const notification = db.db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);

      return {
        success: true,
        message: 'Notification created successfully',
        notificationId: id,
        notification
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Mark notification as read (requires authentication)
  fastify.patch('/:id/read', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params;

      const existing = db.db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
      if (!existing) {
        reply.code(404);
        return { success: false, error: 'Notification not found' };
      }

      db.db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);

      return { success: true, message: 'Notification marked as read' };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Mark all notifications as read (requires authentication)
  fastify.patch('/read-all', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const result = db.db.prepare('UPDATE notifications SET is_read = 1 WHERE is_read = 0').run();

      return {
        success: true,
        message: 'All notifications marked as read',
        count: result.changes
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Delete notification (requires authentication)
  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params;

      const existing = db.db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
      if (!existing) {
        reply.code(404);
        return { success: false, error: 'Notification not found' };
      }

      db.db.prepare('DELETE FROM notifications WHERE id = ?').run(id);

      return { success: true, message: 'Notification deleted successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Check for overdue invoices (requires authentication)
  fastify.post('/check/overdue-invoices', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      // Update overdue status
      const result = db.db.prepare(`
        UPDATE invoices
        SET status = 'overdue', updated_at = CURRENT_TIMESTAMP
        WHERE status = 'unpaid'
        AND due_date < DATE('now')
      `).run();

      // Get overdue invoices
      const overdueInvoices = db.db.prepare(`
        SELECT i.*, c.name as customer_name
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE i.status = 'overdue'
      `).all();

      // Create notifications for each overdue invoice
      for (const invoice of overdueInvoices) {
        db.db.prepare(`
          INSERT OR IGNORE INTO notifications (id, type, title, message, data, is_read, created_at)
          VALUES (?, 'warning', ?, ?, ?, 0, CURRENT_TIMESTAMP)
        `).run(
          uuidv4(),
          `Invoice Overdue: ${invoice.invoice_number}`,
          `Invoice ${invoice.invoice_number} for ${invoice.customer_name || 'Unknown'} is overdue. Amount: Rp ${(invoice.total_amount || 0).toLocaleString('id-ID')}`,
          JSON.stringify({ entity_type: 'invoice', entity_id: invoice.id, priority: 'high' })
        );
      }

      return {
        success: true,
        message: 'Overdue invoice check completed',
        updated: result.changes,
        overdueCount: overdueInvoices.length
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Check for low stock (requires authentication)
  fastify.post('/check/low-stock', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const lowStockItems = db.db.prepare(`
        SELECT * FROM inventory_materials
        WHERE current_stock <= reorder_level
      `).all();

      // Create notifications for low stock items
      for (const item of lowStockItems) {
        const severity = item.current_stock <= 0 ? 'critical' : 'warning';
        db.db.prepare(`
          INSERT OR IGNORE INTO notifications (id, type, title, message, data, is_read, created_at)
          VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
        `).run(
          uuidv4(),
          severity,
          item.current_stock <= 0 ? `Out of Stock: ${item.name}` : `Low Stock Alert: ${item.name}`,
          `${item.name} stock is ${item.current_stock <= 0 ? 'empty' : 'low'}. Current: ${item.current_stock} ${item.unit || 'units'}. Reorder level: ${item.reorder_level}`,
          JSON.stringify({ entity_type: 'inventory', entity_id: item.id, priority: item.current_stock <= 0 ? 'urgent' : 'high' })
        );
      }

      return {
        success: true,
        message: 'Low stock check completed',
        lowStockCount: lowStockItems.length
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Check for order deadlines (requires authentication)
  fastify.post('/check/order-deadlines', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      // Get orders due within 3 days
      const upcomingOrders = db.db.prepare(`
        SELECT o.*, c.name as customer_name
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE o.status NOT IN ('completed', 'cancelled')
        AND o.due_date IS NOT NULL
        AND DATE(o.due_date) <= DATE('now', '+3 days')
        AND DATE(o.due_date) >= DATE('now')
      `).all();

      // Get overdue orders
      const overdueOrders = db.db.prepare(`
        SELECT o.*, c.name as customer_name
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE o.status NOT IN ('completed', 'cancelled')
        AND o.due_date IS NOT NULL
        AND DATE(o.due_date) < DATE('now')
      `).all();

      // Create notifications
      for (const order of overdueOrders) {
        db.db.prepare(`
          INSERT OR IGNORE INTO notifications (id, type, title, message, data, is_read, created_at)
          VALUES (?, 'critical', ?, ?, ?, 0, CURRENT_TIMESTAMP)
        `).run(
          uuidv4(),
          `Order Overdue: ${order.order_number}`,
          `Order ${order.order_number} for ${order.customer_name || 'Unknown'} is overdue!`,
          JSON.stringify({ entity_type: 'order', entity_id: order.id, priority: 'urgent' })
        );
      }

      for (const order of upcomingOrders) {
        db.db.prepare(`
          INSERT OR IGNORE INTO notifications (id, type, title, message, data, is_read, created_at)
          VALUES (?, 'warning', ?, ?, ?, 0, CURRENT_TIMESTAMP)
        `).run(
          uuidv4(),
          `Order Deadline Approaching: ${order.order_number}`,
          `Order ${order.order_number} for ${order.customer_name || 'Unknown'} is due on ${order.due_date}`,
          JSON.stringify({ entity_type: 'order', entity_id: order.id, priority: 'high' })
        );
      }

      return {
        success: true,
        message: 'Order deadline check completed',
        overdueCount: overdueOrders.length,
        upcomingCount: upcomingOrders.length
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });
}

module.exports = notificationRoutes;
