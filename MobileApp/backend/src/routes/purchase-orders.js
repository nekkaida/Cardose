// Purchase orders routes - Using DatabaseService
const { v4: uuidv4 } = require('uuid');
const DatabaseService = require('../services/DatabaseService');

async function purchaseOrdersRoutes(fastify, options) {
  const db = new DatabaseService();
  db.initialize();

  // Get all purchase orders (requires authentication)
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { status, supplier, limit = 100, page = 1 } = request.query;

      let query = 'SELECT * FROM purchase_orders WHERE 1=1';
      const params = [];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }
      if (supplier) {
        query += ' AND supplier LIKE ?';
        params.push(`%${supplier}%`);
      }

      query += ' ORDER BY created_at DESC';

      // Get total count
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
      const countResult = db.db.prepare(countQuery).get(...params);
      const total = countResult ? countResult.total : 0;

      // Add pagination
      const offset = (page - 1) * limit;
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);

      const purchaseOrders = db.db.prepare(query).all(...params);

      // Parse items JSON
      const ordersWithParsedItems = purchaseOrders.map(po => ({
        ...po,
        items: po.items ? JSON.parse(po.items) : []
      }));

      return {
        success: true,
        purchaseOrders: ordersWithParsedItems,
        orders: ordersWithParsedItems,
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

  // Get purchase order by ID (requires authentication)
  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params;

      const purchaseOrder = db.db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id);

      if (!purchaseOrder) {
        reply.code(404);
        return { success: false, error: 'Purchase order not found' };
      }

      return {
        success: true,
        purchaseOrder: {
          ...purchaseOrder,
          items: purchaseOrder.items ? JSON.parse(purchaseOrder.items) : []
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Create purchase order (requires authentication)
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { supplier, items, total_amount, expected_date, notes } = request.body;

      if (!supplier || !items) {
        reply.code(400);
        return { success: false, error: 'Supplier and items are required' };
      }

      const id = uuidv4();
      const poNumber = await generatePONumber(db);

      db.db.prepare(`
        INSERT INTO purchase_orders (id, po_number, supplier, items, total_amount, status, expected_date, notes, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, CURRENT_TIMESTAMP)
      `).run(id, poNumber, supplier, JSON.stringify(items), total_amount || 0, expected_date, notes);

      const purchaseOrder = db.db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id);

      return {
        success: true,
        message: 'Purchase order created successfully',
        purchaseOrderId: id,
        purchaseOrder: {
          ...purchaseOrder,
          items: JSON.parse(purchaseOrder.items)
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Update purchase order status (requires authentication)
  fastify.patch('/:id/status', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { status, received_date } = request.body;

      if (!status) {
        reply.code(400);
        return { success: false, error: 'Status is required' };
      }

      const validStatuses = ['pending', 'ordered', 'shipped', 'received', 'cancelled'];
      if (!validStatuses.includes(status)) {
        reply.code(400);
        return { success: false, error: 'Invalid status value' };
      }

      const existing = db.db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id);
      if (!existing) {
        reply.code(404);
        return { success: false, error: 'Purchase order not found' };
      }

      const fields = ['status = ?'];
      const values = [status];

      if (status === 'received') {
        fields.push('received_date = ?');
        values.push(received_date || new Date().toISOString().split('T')[0]);

        // Update inventory if received
        const items = existing.items ? JSON.parse(existing.items) : [];
        for (const item of items) {
          if (item.material_id) {
            db.db.prepare(`
              UPDATE inventory_materials
              SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(item.quantity || 0, item.material_id);
          }
        }
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      db.db.prepare(`UPDATE purchase_orders SET ${fields.join(', ')} WHERE id = ?`).run(...values);

      return { success: true, message: 'Purchase order status updated successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Delete purchase order (requires authentication)
  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params;

      const existing = db.db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id);
      if (!existing) {
        reply.code(404);
        return { success: false, error: 'Purchase order not found' };
      }

      db.db.prepare('DELETE FROM purchase_orders WHERE id = ?').run(id);

      return { success: true, message: 'Purchase order deleted successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });
}

// Generate unique PO number
async function generatePONumber(db) {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;

  const latestPO = db.db.prepare(
    "SELECT po_number FROM purchase_orders WHERE po_number LIKE ? ORDER BY po_number DESC LIMIT 1"
  ).get(`${prefix}%`);

  let nextNumber = 1;
  if (latestPO) {
    const currentNumber = parseInt(latestPO.po_number.split('-').pop());
    nextNumber = currentNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}

module.exports = purchaseOrdersRoutes;
