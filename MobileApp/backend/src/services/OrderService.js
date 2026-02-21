// Order business logic service - extracted from order routes
const { v4: uuidv4 } = require('uuid');

const ALLOWED_SORT_COLUMNS = {
  order_number: 'o.order_number',
  customer_name: 'c.name',
  status: 'o.status',
  priority: 'o.priority',
  total_amount: 'o.total_amount',
  due_date: 'o.due_date',
  created_at: 'o.created_at',
};

const VALID_STATUSES = [
  'pending',
  'designing',
  'approved',
  'production',
  'quality_control',
  'completed',
  'cancelled',
];

const UPDATABLE_FIELDS = [
  'status',
  'priority',
  'total_amount',
  'due_date',
  'box_type',
  'special_requests',
];

class OrderService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get orders with filtering, sorting, pagination, and inline stats.
   */
  async getOrders({
    status,
    priority,
    customerId,
    search,
    sortBy,
    sortOrder,
    limit,
    page,
    offset,
  }) {
    let query =
      'SELECT o.*, c.name as customer_name FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }
    if (priority) {
      query += ' AND o.priority = ?';
      params.push(priority);
    }
    if (customerId) {
      query += ' AND o.customer_id = ?';
      params.push(customerId);
    }
    if (search) {
      query += ' AND (o.order_number LIKE ? OR c.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Dynamic sorting with whitelist to prevent SQL injection
    const sortColumn = ALLOWED_SORT_COLUMNS[sortBy] || 'o.created_at';
    const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumn} ${sortDirection}`;

    // Get total count
    const countQuery = query.replace(
      'SELECT o.*, c.name as customer_name',
      'SELECT COUNT(*) as total'
    );
    const countResult = this.db.db.prepare(countQuery).get(...params);
    const total = countResult ? countResult.total : 0;

    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const orders = this.db.db.prepare(query).all(...params);

    const stats = this._getInlineStats();

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats,
    };
  }

  /**
   * Get detailed order stats with status and priority breakdowns.
   */
  async getOrderStats() {
    const statsRow = this.db.db
      .prepare(
        `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'designing' THEN 1 ELSE 0 END) as designing,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'production' THEN 1 ELSE 0 END) as production,
          SUM(CASE WHEN status = 'quality_control' THEN 1 ELSE 0 END) as quality_control,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as priority_low,
          SUM(CASE WHEN priority = 'normal' THEN 1 ELSE 0 END) as priority_normal,
          SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as priority_high,
          SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as priority_urgent,
          COALESCE(SUM(total_amount), 0) as totalValue,
          SUM(CASE WHEN due_date IS NOT NULL AND DATE(due_date) < DATE('now') AND status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END) as overdue
        FROM orders
      `
      )
      .get();

    return {
      total: statsRow.total,
      byStatus: {
        pending: statsRow.pending,
        designing: statsRow.designing,
        approved: statsRow.approved,
        production: statsRow.production,
        quality_control: statsRow.quality_control,
        completed: statsRow.completed,
        cancelled: statsRow.cancelled,
      },
      byPriority: {
        low: statsRow.priority_low,
        normal: statsRow.priority_normal,
        high: statsRow.priority_high,
        urgent: statsRow.priority_urgent,
      },
      totalValue: statsRow.totalValue,
      overdue: statsRow.overdue,
    };
  }

  /**
   * Generate next unique order number (e.g. PGB-2026-001).
   */
  async generateOrderNumber() {
    const year = new Date().getFullYear();
    const prefix = `PGB-${year}-`;

    const latestOrder = this.db.db
      .prepare(
        'SELECT order_number FROM orders WHERE order_number LIKE ? ORDER BY order_number DESC LIMIT 1'
      )
      .get(`${prefix}%`);

    let nextNumber = 1;
    if (latestOrder) {
      const currentNumber = parseInt(latestOrder.order_number.split('-').pop());
      nextNumber = currentNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  }

  /**
   * Get a single order by id, including its stages.
   */
  async getOrderById(id) {
    const order = this.db.db
      .prepare(
        'SELECT o.*, c.name as customer_name FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE o.id = ?'
      )
      .get(id);

    if (!order) {
      return null;
    }

    const stages = this.db.db
      .prepare('SELECT * FROM order_stages WHERE order_id = ? ORDER BY created_at')
      .all(id);

    return { ...order, stages };
  }

  /**
   * Create a new order. Returns { orderId, order }.
   */
  async createOrder(data) {
    const {
      customer_id,
      total_amount,
      priority = 'normal',
      due_date,
      box_type,
      special_requests,
    } = data;

    const id = uuidv4();
    const orderNumber = await this.generateOrderNumber();

    this.db.db
      .prepare(
        `
        INSERT INTO orders (id, order_number, customer_id, status, priority, total_amount, due_date, box_type, special_requests)
        VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?)
      `
      )
      .run(
        id,
        orderNumber,
        customer_id,
        priority,
        total_amount || 0,
        due_date,
        box_type,
        special_requests
      );

    const order = this.db.db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

    return { orderId: id, order };
  }

  /**
   * Update an existing order. Returns { changed, order }.
   * Throws if order not found.
   */
  async updateOrder(id, updates) {
    const existing = this.db.db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!existing) {
      return null;
    }

    const fields = [];
    const values = [];

    for (const field of UPDATABLE_FIELDS) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }

    if (fields.length === 0) {
      return { changed: false, order: existing };
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    this.db.db.prepare(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const order = this.db.db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

    return { changed: true, order };
  }

  /**
   * Update order status and record a stage entry.
   * Returns null if not found, or { success: true }.
   */
  async updateOrderStatus(id, status, notes) {
    const existing = this.db.db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!existing) {
      return null;
    }

    this.db.db
      .prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, id);

    // Add to order stages
    this.db.db
      .prepare(
        `
        INSERT INTO order_stages (id, order_id, stage, notes, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `
      )
      .run(uuidv4(), id, status, notes || '');

    return { success: true };
  }

  /**
   * Delete an order and its stages.
   * Returns null if not found, or { success: true }.
   */
  async deleteOrder(id) {
    const existing = this.db.db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!existing) {
      return null;
    }

    this.db.db.prepare('DELETE FROM order_stages WHERE order_id = ?').run(id);
    this.db.db.prepare('DELETE FROM orders WHERE id = ?').run(id);

    return { success: true };
  }

  /**
   * Internal: lightweight stats used in the orders list response.
   */
  _getInlineStats() {
    const statsRow = this.db.db
      .prepare(
        `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'designing' THEN 1 ELSE 0 END) as designing,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'production' THEN 1 ELSE 0 END) as production,
          SUM(CASE WHEN status = 'quality_control' THEN 1 ELSE 0 END) as quality_control,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
          COALESCE(SUM(total_amount), 0) as totalValue,
          SUM(CASE WHEN due_date IS NOT NULL AND DATE(due_date) < DATE('now') AND status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END) as overdue
        FROM orders
      `
      )
      .get();

    return {
      total: statsRow.total,
      pending: statsRow.pending,
      designing: statsRow.designing,
      approved: statsRow.approved,
      production: statsRow.production,
      quality_control: statsRow.quality_control,
      completed: statsRow.completed,
      cancelled: statsRow.cancelled,
      totalValue: statsRow.totalValue,
      overdue: statsRow.overdue,
    };
  }
}

module.exports = OrderService;
