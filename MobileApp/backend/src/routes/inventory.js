// Inventory management routes for Premium Gift Box backend
const { v4: uuidv4 } = require('uuid');

async function inventoryRoutes(fastify, options) {
  const db = fastify.db;

  // Get all materials
  fastify.get('/materials', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { category, lowStock } = request.query;

      let sql = 'SELECT * FROM inventory_materials WHERE 1=1';
      const params = [];

      if (category) {
        sql += ' AND category = ?';
        params.push(category);
      }

      if (lowStock === 'true') {
        sql += ' AND current_stock <= reorder_level';
      }

      sql += ' ORDER BY name ASC';

      const materials = await db.all(sql, params);

      return { materials };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch materials' });
    }
  });

  // Get material by ID
  fastify.get('/materials/:materialId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { materialId } = request.params;

      const material = await db.get(
        'SELECT * FROM inventory_materials WHERE id = ?',
        [materialId]
      );

      if (!material) {
        return reply.status(404).send({ error: 'Material not found' });
      }

      return { material };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch material' });
    }
  });

  // Create material
  fastify.post('/materials', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { name, category, supplier, unitCost, currentStock, reorderLevel, unit, notes } = request.body;

      if (!name || !category || !supplier || !unitCost || !unit) {
        return reply.status(400).send({
          error: 'Name, category, supplier, unit cost, and unit are required'
        });
      }

      const materialId = uuidv4();

      await db.run(
        `INSERT INTO inventory_materials (id, name, category, supplier, unit_cost,
         current_stock, reorder_level, unit, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [materialId, name, category, supplier, unitCost, currentStock || 0,
         reorderLevel || 0, unit, notes || null]
      );

      return {
        success: true,
        materialId,
        message: 'Material created successfully'
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to create material' });
    }
  });

  // Update material
  fastify.put('/materials/:materialId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { materialId } = request.params;
      const { name, category, supplier, unitCost, currentStock, reorderLevel, unit, notes } = request.body;

      await db.run(
        `UPDATE inventory_materials
         SET name = ?, category = ?, supplier = ?, unit_cost = ?,
             current_stock = ?, reorder_level = ?, unit = ?, notes = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, category, supplier, unitCost, currentStock, reorderLevel, unit, notes, materialId]
      );

      return {
        success: true,
        message: 'Material updated successfully'
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to update material' });
    }
  });

  // Delete material
  fastify.delete('/materials/:materialId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { materialId } = request.params;

      await db.run('DELETE FROM inventory_materials WHERE id = ?', [materialId]);

      return {
        success: true,
        message: 'Material deleted successfully'
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to delete material' });
    }
  });

  // Record inventory movement
  fastify.post('/movements', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { type, itemId, itemType, quantity, unitCost, reason, orderId, notes } = request.body;

      if (!type || !itemId || !itemType || !quantity) {
        return reply.status(400).send({
          error: 'Type, item ID, item type, and quantity are required'
        });
      }

      const movementId = uuidv4();
      const totalCost = unitCost ? unitCost * quantity : null;

      // Record movement
      await db.run(
        `INSERT INTO inventory_movements (id, type, item_id, item_type, quantity,
         unit_cost, total_cost, reason, order_id, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [movementId, type, itemId, itemType, quantity, unitCost || null,
         totalCost, reason || null, orderId || null, notes || null, request.user.id]
      );

      // Update stock levels
      if (itemType === 'material') {
        const material = await db.get(
          'SELECT current_stock FROM inventory_materials WHERE id = ?',
          [itemId]
        );

        if (!material) {
          return reply.status(404).send({ error: 'Material not found' });
        }

        let newStock = material.current_stock;

        if (type === 'purchase') {
          newStock += quantity;
          // Update last_restocked date
          await db.run(
            `UPDATE inventory_materials
             SET current_stock = ?, last_restocked = DATE('now'), updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [newStock, itemId]
          );
        } else if (type === 'usage' || type === 'sale' || type === 'waste') {
          newStock -= quantity;
          await db.run(
            'UPDATE inventory_materials SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newStock, itemId]
          );
        } else if (type === 'adjustment') {
          newStock = quantity; // For adjustments, set to exact quantity
          await db.run(
            'UPDATE inventory_materials SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newStock, itemId]
          );
        }
      } else if (itemType === 'product') {
        const product = await db.get(
          'SELECT in_stock FROM inventory_products WHERE id = ?',
          [itemId]
        );

        if (!product) {
          return reply.status(404).send({ error: 'Product not found' });
        }

        let newStock = product.in_stock;

        if (type === 'purchase') {
          newStock += quantity;
        } else if (type === 'usage' || type === 'sale' || type === 'waste') {
          newStock -= quantity;
        } else if (type === 'adjustment') {
          newStock = quantity;
        }

        await db.run(
          'UPDATE inventory_products SET in_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [newStock, itemId]
        );
      }

      return {
        success: true,
        movementId,
        message: 'Inventory movement recorded successfully'
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to record inventory movement' });
    }
  });

  // Get inventory movements
  fastify.get('/movements', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { itemId, type, startDate, endDate } = request.query;

      let sql = `
        SELECT
          im.*,
          u.full_name as created_by_name
        FROM inventory_movements im
        LEFT JOIN users u ON im.created_by = u.id
        WHERE 1=1
      `;
      const params = [];

      if (itemId) {
        sql += ' AND im.item_id = ?';
        params.push(itemId);
      }

      if (type) {
        sql += ' AND im.type = ?';
        params.push(type);
      }

      if (startDate) {
        sql += ' AND DATE(im.created_at) >= ?';
        params.push(startDate);
      }

      if (endDate) {
        sql += ' AND DATE(im.created_at) <= ?';
        params.push(endDate);
      }

      sql += ' ORDER BY im.created_at DESC LIMIT 100';

      const movements = await db.all(sql, params);

      return { movements };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch inventory movements' });
    }
  });

  // Get inventory statistics
  fastify.get('/stats', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      // Total materials count
      const materialsCount = await db.get(
        'SELECT COUNT(*) as count FROM inventory_materials'
      );

      // Low stock materials count
      const lowStockCount = await db.get(
        'SELECT COUNT(*) as count FROM inventory_materials WHERE current_stock <= reorder_level'
      );

      // Out of stock materials count
      const outOfStockCount = await db.get(
        'SELECT COUNT(*) as count FROM inventory_materials WHERE current_stock <= 0'
      );

      // Total inventory value
      const totalValue = await db.get(
        'SELECT SUM(current_stock * unit_cost) as value FROM inventory_materials'
      );

      // Recent movements count (last 7 days)
      const recentMovements = await db.get(
        `SELECT COUNT(*) as count FROM inventory_movements
         WHERE DATE(created_at) >= DATE('now', '-7 days')`
      );

      return {
        stats: {
          total_materials: materialsCount.count,
          low_stock_items: lowStockCount.count,
          out_of_stock_items: outOfStockCount.count,
          total_inventory_value: totalValue.value || 0,
          recent_movements: recentMovements.count
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch inventory stats' });
    }
  });

  // Get low stock alerts
  fastify.get('/alerts', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const materials = await db.all(
        `SELECT * FROM inventory_materials
         WHERE current_stock <= reorder_level
         ORDER BY
           CASE
             WHEN current_stock <= 0 THEN 1
             WHEN current_stock <= reorder_level * 0.5 THEN 2
             ELSE 3
           END,
           current_stock ASC`
      );

      return { alerts: materials };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch inventory alerts' });
    }
  });

  // Create purchase order
  fastify.post('/purchase-orders', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { supplier, items, expectedDelivery, notes } = request.body;

      if (!supplier || !items || !Array.isArray(items) || items.length === 0) {
        return reply.status(400).send({
          error: 'Supplier and items are required'
        });
      }

      const poId = uuidv4();
      const poNumber = `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      // Calculate total amount
      const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

      await db.run(
        `INSERT INTO purchase_orders (id, po_number, supplier, items, total_amount,
         status, expected_delivery, notes, created_by)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
        [poId, poNumber, supplier, JSON.stringify(items), totalAmount,
         expectedDelivery || null, notes || null, request.user.id]
      );

      return {
        success: true,
        poId,
        poNumber,
        message: 'Purchase order created successfully'
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to create purchase order' });
    }
  });

  // Get purchase orders
  fastify.get('/purchase-orders', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { status } = request.query;

      let sql = `
        SELECT
          po.*,
          u.full_name as created_by_name
        FROM purchase_orders po
        LEFT JOIN users u ON po.created_by = u.id
        WHERE 1=1
      `;
      const params = [];

      if (status) {
        sql += ' AND po.status = ?';
        params.push(status);
      }

      sql += ' ORDER BY po.created_at DESC';

      const orders = await db.all(sql, params);

      // Parse items JSON
      const ordersWithParsedItems = orders.map(order => ({
        ...order,
        items: JSON.parse(order.items)
      }));

      return { purchase_orders: ordersWithParsedItems };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch purchase orders' });
    }
  });

  // Update purchase order status
  fastify.put('/purchase-orders/:poId/status', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { poId } = request.params;
      const { status, receivedDate } = request.body;

      const validStatuses = ['pending', 'ordered', 'received', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return reply.status(400).send({ error: 'Invalid status' });
      }

      await db.run(
        `UPDATE purchase_orders
         SET status = ?, received_date = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [status, receivedDate || null, poId]
      );

      // If received, create inventory movements
      if (status === 'received') {
        const po = await db.get(
          'SELECT items FROM purchase_orders WHERE id = ?',
          [poId]
        );

        if (po && po.items) {
          const items = JSON.parse(po.items);

          for (const item of items) {
            const movementId = uuidv4();
            await db.run(
              `INSERT INTO inventory_movements (id, type, item_id, item_type, quantity,
               unit_cost, total_cost, reason, notes, created_by)
               VALUES (?, 'purchase', ?, 'material', ?, ?, ?, 'Purchase Order', ?, ?)`,
              [movementId, item.materialId, item.quantity, item.unitCost,
               item.quantity * item.unitCost, `PO: ${po.po_number}`, request.user.id]
            );

            // Update material stock
            await db.run(
              `UPDATE inventory_materials
               SET current_stock = current_stock + ?, last_restocked = DATE('now'),
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`,
              [item.quantity, item.materialId]
            );
          }
        }
      }

      return {
        success: true,
        message: 'Purchase order status updated successfully'
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to update purchase order status' });
    }
  });
}

module.exports = inventoryRoutes;
