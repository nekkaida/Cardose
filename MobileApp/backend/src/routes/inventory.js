// Inventory management routes - Using DatabaseService
const { v4: uuidv4 } = require('uuid');
const DatabaseService = require('../services/DatabaseService');

async function inventoryRoutes(fastify, options) {
  const db = new DatabaseService();
  db.initialize();

  // Get all inventory items (requires authentication)
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { category, lowStock, search, limit = 100, page = 1 } = request.query;

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
        query += ' AND (name LIKE ? OR sku LIKE ? OR supplier LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      query += ' ORDER BY name ASC';

      // Get total count
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
      const countResult = db.db.prepare(countQuery).get(...params);
      const total = countResult ? countResult.total : 0;

      // Add pagination
      const offset = (page - 1) * limit;
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);

      const inventory = db.db.prepare(query).all(...params);

      // Calculate stats
      const allItems = db.db.prepare('SELECT category, current_stock, reorder_level, unit_cost FROM inventory_materials').all();
      const stats = {
        total: allItems.length,
        paper: allItems.filter(i => i.category === 'paper').length,
        ribbon: allItems.filter(i => i.category === 'ribbon').length,
        accessories: allItems.filter(i => i.category === 'accessories').length,
        packaging: allItems.filter(i => i.category === 'packaging').length,
        printing: allItems.filter(i => i.category === 'printing').length,
        lowStock: allItems.filter(i => i.current_stock <= i.reorder_level).length,
        outOfStock: allItems.filter(i => i.current_stock <= 0).length,
        totalValue: allItems.reduce((sum, i) => sum + (i.current_stock * (i.unit_cost || 0)), 0)
      };

      return {
        success: true,
        inventory,
        items: inventory,
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

  // Get low stock items (requires authentication)
  fastify.get('/low-stock', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const items = db.db.prepare(`
        SELECT * FROM inventory_materials
        WHERE current_stock <= reorder_level
        ORDER BY
          CASE
            WHEN current_stock <= 0 THEN 1
            WHEN current_stock <= reorder_level * 0.5 THEN 2
            ELSE 3
          END,
          current_stock ASC
      `).all();

      return {
        success: true,
        items,
        count: items.length
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Get inventory stats (requires authentication)
  fastify.get('/stats', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const materialsCount = db.db.prepare('SELECT COUNT(*) as count FROM inventory_materials').get();
      const lowStockCount = db.db.prepare('SELECT COUNT(*) as count FROM inventory_materials WHERE current_stock <= reorder_level').get();
      const outOfStockCount = db.db.prepare('SELECT COUNT(*) as count FROM inventory_materials WHERE current_stock <= 0').get();
      const totalValue = db.db.prepare('SELECT SUM(current_stock * unit_cost) as value FROM inventory_materials').get();

      // Get category breakdown
      const categoryBreakdown = db.db.prepare(`
        SELECT category, COUNT(*) as count, SUM(current_stock * unit_cost) as value
        FROM inventory_materials
        GROUP BY category
      `).all();

      return {
        success: true,
        stats: {
          total_materials: materialsCount.count,
          low_stock_items: lowStockCount.count,
          out_of_stock_items: outOfStockCount.count,
          total_inventory_value: totalValue.value || 0,
          by_category: categoryBreakdown
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
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
      const movements = db.db.prepare(`
        SELECT * FROM inventory_movements
        WHERE item_id = ?
        ORDER BY created_at DESC
        LIMIT 20
      `).all(id);

      return {
        success: true,
        item: { ...item, movements }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Create inventory item (requires authentication)
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { name, sku, category, supplier, unit_cost, current_stock = 0, reorder_level = 10, unit, notes } = request.body;

      if (!name || !category) {
        reply.code(400);
        return { success: false, error: 'Name and category are required' };
      }

      const id = uuidv4();

      db.db.prepare(`
        INSERT INTO inventory_materials (id, name, sku, category, supplier, unit_cost, current_stock, reorder_level, unit, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, name, sku, category, supplier, unit_cost || 0, current_stock, reorder_level, unit, notes);

      const item = db.db.prepare('SELECT * FROM inventory_materials WHERE id = ?').get(id);

      return {
        success: true,
        message: 'Inventory item created successfully',
        itemId: id,
        item
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Update inventory item (requires authentication)
  fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
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

      if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
      if (updates.sku !== undefined) { fields.push('sku = ?'); values.push(updates.sku); }
      if (updates.category !== undefined) { fields.push('category = ?'); values.push(updates.category); }
      if (updates.supplier !== undefined) { fields.push('supplier = ?'); values.push(updates.supplier); }
      if (updates.unit_cost !== undefined) { fields.push('unit_cost = ?'); values.push(updates.unit_cost); }
      if (updates.current_stock !== undefined) { fields.push('current_stock = ?'); values.push(updates.current_stock); }
      if (updates.reorder_level !== undefined) { fields.push('reorder_level = ?'); values.push(updates.reorder_level); }
      if (updates.unit !== undefined) { fields.push('unit = ?'); values.push(updates.unit); }
      if (updates.notes !== undefined) { fields.push('notes = ?'); values.push(updates.notes); }

      if (fields.length === 0) {
        return { success: true, message: 'No changes made' };
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      db.db.prepare(`UPDATE inventory_materials SET ${fields.join(', ')} WHERE id = ?`).run(...values);

      const item = db.db.prepare('SELECT * FROM inventory_materials WHERE id = ?').get(id);

      return { success: true, message: 'Inventory item updated successfully', item };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Delete inventory item (requires authentication)
  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
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
      return { success: false, error: error.message };
    }
  });

  // Record inventory movement (requires authentication)
  fastify.post('/movements', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { type, item_id, quantity, unit_cost, reason, order_id, notes } = request.body;

      if (!type || !item_id || !quantity) {
        reply.code(400);
        return { success: false, error: 'Type, item_id, and quantity are required' };
      }

      const item = db.db.prepare('SELECT * FROM inventory_materials WHERE id = ?').get(item_id);
      if (!item) {
        reply.code(404);
        return { success: false, error: 'Inventory item not found' };
      }

      const id = uuidv4();
      const totalCost = unit_cost ? unit_cost * quantity : (item.unit_cost || 0) * quantity;

      db.db.prepare(`
        INSERT INTO inventory_movements (id, type, item_id, item_type, quantity, unit_cost, total_cost, reason, order_id, notes)
        VALUES (?, ?, ?, 'material', ?, ?, ?, ?, ?, ?)
      `).run(id, type, item_id, quantity, unit_cost || item.unit_cost, totalCost, reason, order_id, notes);

      // Update stock level
      let newStock = item.current_stock;
      if (type === 'purchase' || type === 'return') {
        newStock += quantity;
      } else if (type === 'usage' || type === 'sale' || type === 'waste') {
        newStock -= quantity;
      } else if (type === 'adjustment') {
        newStock = quantity;
      }

      db.db.prepare('UPDATE inventory_materials SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, item_id);

      return {
        success: true,
        message: 'Inventory movement recorded successfully',
        movementId: id,
        newStock
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

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
      return { success: false, error: error.message };
    }
  });
}

module.exports = inventoryRoutes;
