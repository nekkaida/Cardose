// Inventory business logic service - extracted from inventory routes
const { v4: uuidv4 } = require('uuid');

class InventoryService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get inventory items with filtering, sorting, pagination, and stats.
   */
  async getInventoryItems({
    category,
    lowStock,
    search,
    sort_by,
    sort_order,
    limit,
    page,
    offset,
  }) {
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
    const countResult = this.db.db.prepare(countQuery).get(...params);
    const total = countResult ? countResult.total : 0;

    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const inventory = this.db.db.prepare(query).all(...params);

    // Calculate stats using SQL aggregates
    const statsRow = this.db.db
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
      inventory,
      items: inventory,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats,
    };
  }

  /**
   * Get items with low stock, ordered by severity.
   */
  async getLowStockItems() {
    const items = this.db.db
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

    return { items, count: items.length };
  }

  /**
   * Get inventory statistics with category breakdown.
   */
  async getInventoryStats() {
    const materialsCount = this.db.db
      .prepare('SELECT COUNT(*) as count FROM inventory_materials')
      .get();
    const lowStockCount = this.db.db
      .prepare(
        'SELECT COUNT(*) as count FROM inventory_materials WHERE current_stock <= reorder_level'
      )
      .get();
    const outOfStockCount = this.db.db
      .prepare('SELECT COUNT(*) as count FROM inventory_materials WHERE current_stock <= 0')
      .get();
    const totalValue = this.db.db
      .prepare('SELECT SUM(current_stock * unit_cost) as value FROM inventory_materials')
      .get();

    // Get category breakdown
    const categoryBreakdown = this.db.db
      .prepare(
        `
        SELECT category, COUNT(*) as count, SUM(current_stock * unit_cost) as value
        FROM inventory_materials
        GROUP BY category
      `
      )
      .all();

    return {
      total_materials: materialsCount.count,
      low_stock_items: lowStockCount.count,
      out_of_stock_items: outOfStockCount.count,
      total_inventory_value: totalValue.value || 0,
      by_category: categoryBreakdown,
    };
  }

  /**
   * Get a single inventory item by ID, including recent movements.
   */
  async getInventoryItemById(id) {
    const item = this.db.db.prepare('SELECT * FROM inventory_materials WHERE id = ?').get(id);

    if (!item) {
      return null;
    }

    // Get movements for this item
    const movements = this.db.db
      .prepare(
        `
        SELECT * FROM inventory_movements
        WHERE item_id = ?
        ORDER BY created_at DESC
        LIMIT 20
      `
      )
      .all(id);

    return { ...item, movements };
  }

  /**
   * Create a new inventory item.
   */
  async createInventoryItem(data) {
    const {
      name,
      category,
      supplier,
      unit_cost,
      current_stock = 0,
      reorder_level = 10,
      unit,
      notes,
    } = data;

    const id = uuidv4();

    this.db.db
      .prepare(
        `
        INSERT INTO inventory_materials (id, name, category, supplier, unit_cost, current_stock, reorder_level, unit, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(id, name, category, supplier, unit_cost || 0, current_stock, reorder_level, unit, notes);

    const item = this.db.db.prepare('SELECT * FROM inventory_materials WHERE id = ?').get(id);

    return { itemId: id, item };
  }

  /**
   * Update an existing inventory item. Returns null if item not found.
   */
  async updateInventoryItem(id, updates) {
    const existing = this.db.db.prepare('SELECT * FROM inventory_materials WHERE id = ?').get(id);
    if (!existing) {
      return null;
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
      return { noChanges: true };
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    this.db.db
      .prepare(`UPDATE inventory_materials SET ${fields.join(', ')} WHERE id = ?`)
      .run(...values);

    const item = this.db.db.prepare('SELECT * FROM inventory_materials WHERE id = ?').get(id);

    return { item };
  }

  /**
   * Delete an inventory item and its movements. Returns null if item not found.
   */
  async deleteInventoryItem(id) {
    const existing = this.db.db.prepare('SELECT * FROM inventory_materials WHERE id = ?').get(id);
    if (!existing) {
      return null;
    }

    this.db.db.prepare('DELETE FROM inventory_movements WHERE item_id = ?').run(id);
    this.db.db.prepare('DELETE FROM inventory_materials WHERE id = ?').run(id);

    return { deleted: true };
  }

  /**
   * Record an inventory movement (purchase, usage, sale, waste, adjustment).
   * Returns an object with `error` and `statusCode` properties on validation failure.
   */
  async createInventoryMovement(data, userId) {
    const { type, item_id, quantity, unit_cost, reason, order_id, notes } = data;

    const item = this.db.db.prepare('SELECT * FROM inventory_materials WHERE id = ?').get(item_id);
    if (!item) {
      return { error: 'Inventory item not found', statusCode: 404 };
    }

    // Calculate new stock level
    let newStock = item.current_stock;
    if (type === 'purchase') {
      newStock += quantity;
    } else if (type === 'usage' || type === 'sale' || type === 'waste') {
      newStock -= quantity;
    } else if (type === 'adjustment') {
      newStock = quantity;
    }

    // Prevent negative stock
    if (newStock < 0) {
      return {
        error: `Insufficient stock. Available: ${item.current_stock} ${item.unit || 'units'}`,
        statusCode: 400,
      };
    }

    const id = uuidv4();
    const totalCost = unit_cost ? unit_cost * quantity : (item.unit_cost || 0) * quantity;

    // Wrap insert + update in a transaction for atomicity
    const recordMovement = this.db.db.transaction(() => {
      this.db.db
        .prepare(
          `
          INSERT INTO inventory_movements (id, type, item_id, item_type, quantity, unit_cost, total_cost, reason, order_id, notes, created_by)
          VALUES (?, ?, ?, 'material', ?, ?, ?, ?, ?, ?, ?)
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
          notes,
          userId
        );

      this.db.db
        .prepare(
          'UPDATE inventory_materials SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        )
        .run(newStock, item_id);
    });

    recordMovement();

    return { movementId: id, newStock };
  }

  /**
   * Get inventory movements with optional filtering by item_id and type.
   */
  async getInventoryMovements({ item_id, type, limit = 100 }) {
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

    const movements = this.db.db.prepare(query).all(...params);

    return { movements };
  }

  /**
   * Get reorder alerts with optional status filtering.
   */
  async getReorderAlerts({ status } = {}) {
    let query = 'SELECT * FROM reorder_alerts WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const alerts = this.db.db.prepare(query).all(...params);

    return { alerts };
  }

  /**
   * Create a reorder alert. Returns an object with `error` and `statusCode` on failure.
   */
  async createReorderAlert(data, userId) {
    const { item_id, priority = 'normal', notes } = data;

    // Get item details
    const item = this.db.db.prepare('SELECT * FROM inventory_materials WHERE id = ?').get(item_id);
    if (!item) {
      return { error: 'Inventory item not found', statusCode: 404 };
    }

    // Check if alert already exists for this item
    const existingAlert = this.db.db
      .prepare(
        "SELECT * FROM reorder_alerts WHERE item_id = ? AND status IN ('pending', 'acknowledged')"
      )
      .get(item_id);

    if (existingAlert) {
      return {
        error: 'An active reorder alert already exists for this item',
        statusCode: 409,
        existingAlert,
      };
    }

    const id = uuidv4();
    this.db.db
      .prepare(
        `
        INSERT INTO reorder_alerts (id, item_id, item_name, current_stock, reorder_level, priority, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(id, item_id, item.name, item.current_stock, item.reorder_level, priority, notes, userId);

    const alert = this.db.db.prepare('SELECT * FROM reorder_alerts WHERE id = ?').get(id);

    return { alertId: id, alert };
  }

  /**
   * Update a reorder alert status. Returns null if alert not found.
   * Returns an object with `error` and `statusCode` on validation failure.
   */
  async updateReorderAlert(alertId, data, userId) {
    const { status, notes } = data;

    const existing = this.db.db.prepare('SELECT * FROM reorder_alerts WHERE id = ?').get(alertId);
    if (!existing) {
      return null;
    }

    const updates = ['updated_at = CURRENT_TIMESTAMP'];
    const values = [];

    if (status) {
      const validStatuses = ['pending', 'acknowledged', 'ordered', 'resolved'];
      if (!validStatuses.includes(status)) {
        return { error: 'Invalid status', statusCode: 400 };
      }
      updates.push('status = ?');
      values.push(status);

      if (status === 'acknowledged') {
        updates.push('acknowledged_by = ?', 'acknowledged_at = CURRENT_TIMESTAMP');
        values.push(userId);
      } else if (status === 'resolved') {
        updates.push('resolved_at = CURRENT_TIMESTAMP');
      }
    }

    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes);
    }

    values.push(alertId);
    this.db.db
      .prepare(`UPDATE reorder_alerts SET ${updates.join(', ')} WHERE id = ?`)
      .run(...values);

    const alert = this.db.db.prepare('SELECT * FROM reorder_alerts WHERE id = ?').get(alertId);

    return { alert };
  }
}

module.exports = InventoryService;
