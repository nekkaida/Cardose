// Inventory management routes - Using DatabaseService
const { v4: uuidv4 } = require('uuid');
const { parsePagination } = require('../utils/pagination');
async function inventoryRoutes(fastify, options) {
  const db = fastify.db;

  // Get all inventory items (requires authentication)
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { category, lowStock, search, sort_by, sort_order } = request.query;
      const { limit, page, offset } = parsePagination(request.query);

      let query = 'SELECT * FROM inventory_materials WHERE 1=1';
      const params = [];

      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }

      if (lowStock === 'true') {
        query += ' AND current_stock <= reorder_level';
      }

      if (search) {
        query += ' AND (name LIKE ? OR supplier LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      // Dynamic sorting with whitelist
      const allowedSortColumns = {
        name: 'name',
        category: 'category',
        current_stock: 'current_stock',
        reorder_level: 'reorder_level',
        unit_cost: 'unit_cost',
        created_at: 'created_at',
      };
      const sortColumn = allowedSortColumns[sort_by] || 'name';
      const sortDirection = sort_order === 'desc' ? 'DESC' : 'ASC';
      query += ` ORDER BY ${sortColumn} ${sortDirection}`;

      // Get total count
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
      const countResult = db.db.prepare(countQuery).get(...params);
      const total = countResult ? countResult.total : 0;

      // Add pagination
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const inventory = db.db.prepare(query).all(...params);

      // Calculate stats using SQL aggregates
      const statsRow = db.db
        .prepare(
          `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN category = 'cardboard' THEN 1 ELSE 0 END) as cardboard,
          SUM(CASE WHEN category = 'fabric' THEN 1 ELSE 0 END) as fabric,
          SUM(CASE WHEN category = 'ribbon' THEN 1 ELSE 0 END) as ribbon,
          SUM(CASE WHEN category = 'accessories' THEN 1 ELSE 0 END) as accessories,
          SUM(CASE WHEN category = 'packaging' THEN 1 ELSE 0 END) as packaging,
          SUM(CASE WHEN category = 'tools' THEN 1 ELSE 0 END) as tools,
          SUM(CASE WHEN current_stock <= reorder_level THEN 1 ELSE 0 END) as lowStock,
          SUM(CASE WHEN current_stock <= 0 THEN 1 ELSE 0 END) as outOfStock,
          COALESCE(SUM(current_stock * unit_cost), 0) as totalValue
        FROM inventory_materials
      `
        )
        .get();
      const stats = {
        total: statsRow.total,
        cardboard: statsRow.cardboard,
        fabric: statsRow.fabric,
        ribbon: statsRow.ribbon,
        accessories: statsRow.accessories,
        packaging: statsRow.packaging,
        tools: statsRow.tools,
        lowStock: statsRow.lowStock,
        outOfStock: statsRow.outOfStock,
        totalValue: statsRow.totalValue,
      };

      return {
        success: true,
        inventory,
        items: inventory,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        stats,
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get low stock items (requires authentication)
  fastify.get('/low-stock', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const items = db.db
        .prepare(
          `
        SELECT * FROM inventory_materials
        WHERE current_stock <= reorder_level
        ORDER BY
          CASE
            WHEN current_stock <= 0 THEN 1
            WHEN current_stock <= reorder_level * 0.5 THEN 2
            ELSE 3
          END,
          current_stock ASC
      `
        )
        .all();

      return {
        success: true,
        items,
        count: items.length,
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get inventory stats (requires authentication)
  fastify.get('/stats', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const materialsCount = db.db
        .prepare('SELECT COUNT(*) as count FROM inventory_materials')
        .get();
      const lowStockCount = db.db
        .prepare(
          'SELECT COUNT(*) as count FROM inventory_materials WHERE current_stock <= reorder_level'
        )
        .get();
      const outOfStockCount = db.db
        .prepare('SELECT COUNT(*) as count FROM inventory_materials WHERE current_stock <= 0')
        .get();
      const totalValue = db.db
        .prepare('SELECT SUM(current_stock * unit_cost) as value FROM inventory_materials')
        .get();

      // Get category breakdown
      const categoryBreakdown = db.db
        .prepare(
          `
        SELECT category, COUNT(*) as count, SUM(current_stock * unit_cost) as value
        FROM inventory_materials
        GROUP BY category
      `
        )
        .all();

      return {
        success: true,
        stats: {
          total_materials: materialsCount.count,
          low_stock_items: lowStockCount.count,
          out_of_stock_items: outOfStockCount.count,
          total_inventory_value: totalValue.value || 0,
          by_category: categoryBreakdown,
        },
      };
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
      const item = db.db.prepare('SELECT * FROM inventory_materials WHERE id = ?').get(id);

      if (!item) {
        reply.code(404);
        return { success: false, error: 'Inventory item not found' };
      }

      // Get movements for this item
      const movements = db.db
        .prepare(
          `
        SELECT * FROM inventory_movements
        WHERE item_id = ?
        ORDER BY created_at DESC
        LIMIT 20
      `
        )
        .all(id);

      return {
        success: true,
        item: { ...item, movements },
      };
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
        const {
          name,
          category,
          supplier,
          unit_cost,
          current_stock = 0,
          reorder_level = 10,
          unit,
          notes,
        } = request.body;

        if (!name || !category) {
          reply.code(400);
          return { success: false, error: 'Name and category are required' };
        }

        const id = uuidv4();

        db.db
          .prepare(
            `
        INSERT INTO inventory_materials (id, name, category, supplier, unit_cost, current_stock, reorder_level, unit, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
          )
          .run(
            id,
            name,
            category,
            supplier,
            unit_cost || 0,
            current_stock,
            reorder_level,
            unit,
            notes
          );

        const item = db.db.prepare('SELECT * FROM inventory_materials WHERE id = ?').get(id);

        return {
          success: true,
          message: 'Inventory item created successfully',
          itemId: id,
          item,
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
        const updates = request.body;

        const existing = db.db.prepare('SELECT * FROM inventory_materials WHERE id = ?').get(id);
        if (!existing) {
          reply.code(404);
          return { success: false, error: 'Inventory item not found' };
        }

        const fields = [];
        const values = [];

        if (updates.name !== undefined) {
          fields.push('name = ?');
          values.push(updates.name);
        }
        if (updates.category !== undefined) {
          fields.push('category = ?');
          values.push(updates.category);
        }
        if (updates.supplier !== undefined) {
          fields.push('supplier = ?');
          values.push(updates.supplier);
        }
        if (updates.unit_cost !== undefined) {
          fields.push('unit_cost = ?');
          values.push(updates.unit_cost);
        }
        if (updates.current_stock !== undefined) {
          fields.push('current_stock = ?');
          values.push(updates.current_stock);
        }
        if (updates.reorder_level !== undefined) {
          fields.push('reorder_level = ?');
          values.push(updates.reorder_level);
        }
        if (updates.unit !== undefined) {
          fields.push('unit = ?');
          values.push(updates.unit);
        }
        if (updates.notes !== undefined) {
          fields.push('notes = ?');
          values.push(updates.notes);
        }

        if (fields.length === 0) {
          return { success: true, message: 'No changes made' };
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        db.db
          .prepare(`UPDATE inventory_materials SET ${fields.join(', ')} WHERE id = ?`)
          .run(...values);

        const item = db.db.prepare('SELECT * FROM inventory_materials WHERE id = ?').get(id);

        return { success: true, message: 'Inventory item updated successfully', item };
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

        const existing = db.db.prepare('SELECT * FROM inventory_materials WHERE id = ?').get(id);
        if (!existing) {
          reply.code(404);
          return { success: false, error: 'Inventory item not found' };
        }

        db.db.prepare('DELETE FROM inventory_movements WHERE item_id = ?').run(id);
        db.db.prepare('DELETE FROM inventory_materials WHERE id = ?').run(id);

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
        const { type, item_id, quantity, unit_cost, reason, order_id, notes } = request.body;

        if (!type || !item_id || !quantity) {
          reply.code(400);
          return { success: false, error: 'Type, item_id, and quantity are required' };
        }

        if (type !== 'adjustment' && quantity <= 0) {
          reply.code(400);
          return { success: false, error: 'Quantity must be a positive number' };
        }

        const item = db.db.prepare('SELECT * FROM inventory_materials WHERE id = ?').get(item_id);
        if (!item) {
          reply.code(404);
          return { success: false, error: 'Inventory item not found' };
        }

        const id = uuidv4();
        const totalCost = unit_cost ? unit_cost * quantity : (item.unit_cost || 0) * quantity;

        db.db
          .prepare(
            `
        INSERT INTO inventory_movements (id, type, item_id, item_type, quantity, unit_cost, total_cost, reason, order_id, notes)
        VALUES (?, ?, ?, 'material', ?, ?, ?, ?, ?, ?)
      `
          )
          .run(
            id,
            type,
            item_id,
            quantity,
            unit_cost || item.unit_cost,
            totalCost,
            reason,
            order_id,
            notes
          );

        // Update stock level
        let newStock = item.current_stock;
        if (type === 'purchase') {
          newStock += quantity;
        } else if (type === 'usage' || type === 'sale' || type === 'waste') {
          newStock -= quantity;
        } else if (type === 'adjustment') {
          newStock = quantity;
        }

        db.db
          .prepare(
            'UPDATE inventory_materials SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
          )
          .run(newStock, item_id);

        return {
          success: true,
          message: 'Inventory movement recorded successfully',
          movementId: id,
          newStock,
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

      let query = `
        SELECT im.*, m.name as item_name
        FROM inventory_movements im
        LEFT JOIN inventory_materials m ON im.item_id = m.id
        WHERE 1=1
      `;
      const params = [];

      if (item_id) {
        query += ' AND im.item_id = ?';
        params.push(item_id);
      }

      if (type) {
        query += ' AND im.type = ?';
        params.push(type);
      }

      query += ` ORDER BY im.created_at DESC LIMIT ?`;
      params.push(parseInt(limit));

      const movements = db.db.prepare(query).all(...params);

      return { success: true, movements };
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

      let query = 'SELECT * FROM reorder_alerts WHERE 1=1';
      const params = [];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC';

      const alerts = db.db.prepare(query).all(...params);

      return {
        success: true,
        alerts,
      };
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
        const { item_id, priority = 'normal', notes } = request.body;

        if (!item_id) {
          reply.code(400);
          return { success: false, error: 'Item ID is required' };
        }

        // Get item details
        const item = db.db.prepare('SELECT * FROM inventory_materials WHERE id = ?').get(item_id);
        if (!item) {
          reply.code(404);
          return { success: false, error: 'Inventory item not found' };
        }

        // Check if alert already exists for this item
        const existingAlert = db.db
          .prepare(
            "SELECT * FROM reorder_alerts WHERE item_id = ? AND status IN ('pending', 'acknowledged')"
          )
          .get(item_id);

        if (existingAlert) {
          reply.code(409);
          return {
            success: false,
            error: 'An active reorder alert already exists for this item',
            existingAlert,
          };
        }

        const id = uuidv4();
        db.db
          .prepare(
            `
        INSERT INTO reorder_alerts (id, item_id, item_name, current_stock, reorder_level, priority, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
          )
          .run(
            id,
            item_id,
            item.name,
            item.current_stock,
            item.reorder_level,
            priority,
            notes,
            request.user.id
          );

        const alert = db.db.prepare('SELECT * FROM reorder_alerts WHERE id = ?').get(id);

        return {
          success: true,
          message: 'Reorder alert created successfully',
          alertId: id,
          alert,
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
        const { status, notes } = request.body;

        const existing = db.db.prepare('SELECT * FROM reorder_alerts WHERE id = ?').get(alertId);
        if (!existing) {
          reply.code(404);
          return { success: false, error: 'Reorder alert not found' };
        }

        const updates = ['updated_at = CURRENT_TIMESTAMP'];
        const values = [];

        if (status) {
          const validStatuses = ['pending', 'acknowledged', 'ordered', 'resolved'];
          if (!validStatuses.includes(status)) {
            reply.code(400);
            return { success: false, error: 'Invalid status' };
          }
          updates.push('status = ?');
          values.push(status);

          if (status === 'acknowledged') {
            updates.push('acknowledged_by = ?', 'acknowledged_at = CURRENT_TIMESTAMP');
            values.push(request.user.id);
          } else if (status === 'resolved') {
            updates.push('resolved_at = CURRENT_TIMESTAMP');
          }
        }

        if (notes !== undefined) {
          updates.push('notes = ?');
          values.push(notes);
        }

        values.push(alertId);
        db.db
          .prepare(`UPDATE reorder_alerts SET ${updates.join(', ')} WHERE id = ?`)
          .run(...values);

        const alert = db.db.prepare('SELECT * FROM reorder_alerts WHERE id = ?').get(alertId);

        return {
          success: true,
          message: 'Reorder alert updated successfully',
          alert,
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
