const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const MigrationService = require('./MigrationService');

class DatabaseService {
  constructor(logger) {
    this.dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../database/premium_gift_box.db');
    this.db = null;
    this.log = logger || { info: console.log, error: console.error, warn: console.warn };
  }

  initialize() {
    try {
      // Create database directory if it doesn't exist
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Open database connection
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
      this.log.info('Connected to SQLite database at %s', this.dbPath);

      // Create tables
      this.createTables();

      // Run tracked migrations
      const migrationService = new MigrationService(this.db);
      const migrationResult = migrationService.runAll();
      if (migrationResult.applied > 0) {
        this.log.info('Applied %d migration(s)', migrationResult.applied);
      }

      // Create indexes for performance
      this.addIndexes();

      this.log.info('Database initialized successfully');
    } catch (error) {
      this.log.error('Database initialization failed: %s', error.message);
      throw error;
    }
  }

  createTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'employee' CHECK (role IN ('owner', 'manager', 'employee')),
        full_name TEXT,
        phone TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        business_type TEXT,
        loyalty_status TEXT DEFAULT 'new',
        total_orders INTEGER DEFAULT 0,
        total_spent REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_number TEXT UNIQUE NOT NULL,
        customer_id TEXT,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'normal',
        total_amount REAL DEFAULT 0,
        final_price REAL DEFAULT 0,
        box_type TEXT,
        due_date DATETIME,
        estimated_completion DATETIME,
        actual_completion DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers (id)
      )`,

      `CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        current_stock INTEGER DEFAULT 0,
        reorder_level INTEGER DEFAULT 0,
        cost_per_unit REAL DEFAULT 0,
        supplier TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        amount REAL NOT NULL,
        description TEXT,
        category TEXT,
        payment_method TEXT,
        transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        stored_filename TEXT NOT NULL,
        mimetype TEXT,
        size INTEGER,
        uploaded_by TEXT,
        has_thumbnail INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES users (id)
      )`,

      `CREATE TABLE IF NOT EXISTS order_files (
        order_id TEXT,
        file_id TEXT,
        PRIMARY KEY (order_id, file_id),
        FOREIGN KEY (order_id) REFERENCES orders (id),
        FOREIGN KEY (file_id) REFERENCES files (id)
      )`,

      `CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        invoice_number TEXT UNIQUE NOT NULL,
        order_id TEXT,
        customer_id TEXT,
        subtotal REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        ppn_rate REAL DEFAULT 0.11,
        ppn_amount REAL DEFAULT 0,
        total_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'draft',
        issue_date DATETIME,
        due_date DATETIME,
        paid_date DATETIME,
        payment_method TEXT,
        notes TEXT,
        items TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders (id),
        FOREIGN KEY (customer_id) REFERENCES customers (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      `CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        period TEXT,
        start_date DATETIME,
        end_date DATETIME,
        notes TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      `CREATE TABLE IF NOT EXISTS financial_transactions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        amount REAL NOT NULL,
        category TEXT,
        order_id TEXT,
        payment_date DATETIME,
        description TEXT,
        ppn_amount REAL DEFAULT 0,
        base_amount REAL DEFAULT 0,
        payment_method TEXT,
        invoice_number TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders (id)
      )`,

      // Inventory Materials table
      `CREATE TABLE IF NOT EXISTS inventory_materials (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        supplier TEXT,
        unit_cost REAL DEFAULT 0,
        current_stock INTEGER DEFAULT 0,
        reorder_level INTEGER DEFAULT 10,
        unit TEXT DEFAULT 'pcs',
        notes TEXT,
        last_restocked DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Inventory Products table
      `CREATE TABLE IF NOT EXISTS inventory_products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT UNIQUE,
        category TEXT,
        base_price REAL DEFAULT 0,
        in_stock INTEGER DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Inventory Movements table
      `CREATE TABLE IF NOT EXISTS inventory_movements (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'sale', 'adjustment', 'waste')),
        item_id TEXT NOT NULL,
        item_type TEXT NOT NULL CHECK (item_type IN ('material', 'product')),
        quantity INTEGER NOT NULL,
        unit_cost REAL,
        total_cost REAL,
        reason TEXT,
        order_id TEXT,
        notes TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id),
        FOREIGN KEY (order_id) REFERENCES orders (id)
      )`,

      // Purchase Orders table
      `CREATE TABLE IF NOT EXISTS purchase_orders (
        id TEXT PRIMARY KEY,
        po_number TEXT UNIQUE NOT NULL,
        supplier TEXT NOT NULL,
        items TEXT NOT NULL,
        total_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'received', 'cancelled')),
        expected_delivery DATETIME,
        received_date DATETIME,
        notes TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      // Production Tasks table
      `CREATE TABLE IF NOT EXISTS production_tasks (
        id TEXT PRIMARY KEY,
        order_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
        priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
        assigned_to TEXT,
        estimated_hours REAL,
        actual_hours REAL,
        start_date DATETIME,
        due_date DATETIME,
        completed_at DATETIME,
        notes TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders (id),
        FOREIGN KEY (assigned_to) REFERENCES users (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      // Production Logs table
      `CREATE TABLE IF NOT EXISTS production_logs (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        action TEXT NOT NULL,
        description TEXT,
        hours_worked REAL,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES production_tasks (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      // Message Templates table
      `CREATE TABLE IF NOT EXISTS message_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('email', 'whatsapp', 'sms')),
        subject TEXT,
        content TEXT NOT NULL,
        variables TEXT,
        is_active INTEGER DEFAULT 1,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      // Settings table
      `CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        type TEXT DEFAULT 'string',
        category TEXT DEFAULT 'general',
        description TEXT,
        updated_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (updated_by) REFERENCES users (id)
      )`,

      // Audit Logs table
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        old_values TEXT,
        new_values TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // Webhooks table
      `CREATE TABLE IF NOT EXISTS webhooks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        events TEXT NOT NULL,
        secret TEXT,
        is_active INTEGER DEFAULT 1,
        last_triggered DATETIME,
        last_status TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      // Notifications table
      `CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        data TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // Communication Messages table
      `CREATE TABLE IF NOT EXISTS communication_messages (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        type TEXT NOT NULL CHECK (type IN ('email', 'whatsapp', 'sms')),
        direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
        subject TEXT,
        content TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
        sent_at DATETIME,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      // Backups table
      `CREATE TABLE IF NOT EXISTS backups (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        size INTEGER,
        type TEXT DEFAULT 'manual' CHECK (type IN ('manual', 'automatic')),
        status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      // Order Stages table (for production tracking)
      `CREATE TABLE IF NOT EXISTS order_stages (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        stage TEXT NOT NULL,
        start_date DATETIME,
        end_date DATETIME,
        notes TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      // Quality Checks table
      `CREATE TABLE IF NOT EXISTS quality_checks (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        check_type TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed')),
        checked_by TEXT,
        checked_at DATETIME,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders (id),
        FOREIGN KEY (checked_by) REFERENCES users (id)
      )`,

      // Production Workflows table
      `CREATE TABLE IF NOT EXISTS production_workflows (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
        current_step INTEGER DEFAULT 0,
        total_steps INTEGER DEFAULT 0,
        steps TEXT,
        started_at DATETIME,
        completed_at DATETIME,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      // Production Issues table
      `CREATE TABLE IF NOT EXISTS production_issues (
        id TEXT PRIMARY KEY,
        order_id TEXT,
        task_id TEXT,
        type TEXT NOT NULL CHECK (type IN ('quality', 'material', 'delay', 'equipment', 'other')),
        severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
        resolution TEXT,
        reported_by TEXT,
        assigned_to TEXT,
        resolved_by TEXT,
        resolved_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders (id),
        FOREIGN KEY (task_id) REFERENCES production_tasks (id),
        FOREIGN KEY (reported_by) REFERENCES users (id),
        FOREIGN KEY (assigned_to) REFERENCES users (id),
        FOREIGN KEY (resolved_by) REFERENCES users (id)
      )`,

      // Production Templates table
      `CREATE TABLE IF NOT EXISTS production_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        steps TEXT NOT NULL,
        estimated_hours REAL,
        category TEXT,
        is_active INTEGER DEFAULT 1,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      // Reorder Alerts table
      `CREATE TABLE IF NOT EXISTS reorder_alerts (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        item_name TEXT NOT NULL,
        current_stock INTEGER DEFAULT 0,
        reorder_level INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'ordered', 'resolved')),
        priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
        notes TEXT,
        created_by TEXT,
        acknowledged_by TEXT,
        acknowledged_at DATETIME,
        resolved_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES inventory_materials (id),
        FOREIGN KEY (created_by) REFERENCES users (id),
        FOREIGN KEY (acknowledged_by) REFERENCES users (id)
      )`
    ];

    for (const sql of tables) {
      this.db.exec(sql);
    }
  }

  // Migration status (for health checks / debugging)
  getMigrationStatus() {
    const migrationService = new MigrationService(this.db);
    return migrationService.getStatus();
  }

  // Synchronous database operations (better-sqlite3 is synchronous)
  run(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run(...params);
      return { id: result.lastInsertRowid, changes: result.changes };
    } catch (err) {
      throw err;
    }
  }

  get(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.get(...params);
    } catch (err) {
      throw err;
    }
  }

  all(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.all(...params);
    } catch (err) {
      throw err;
    }
  }

  close() {
    if (this.db) {
      this.db.close();
      this.log.info('Database connection closed.');
    }
  }

  // ==================== USER METHODS ====================

  createUser(user) {
    const sql = `
      INSERT INTO users (id, username, email, password_hash, role, full_name, phone, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    return this.run(sql, [
      user.id,
      user.username,
      user.email,
      user.password_hash,
      user.role,
      user.full_name,
      user.phone,
      user.is_active
    ]);
  }

  getUserById(userId) {
    const sql = 'SELECT * FROM users WHERE id = ?';
    return this.get(sql, [userId]);
  }

  getUserByUsername(username) {
    const sql = 'SELECT * FROM users WHERE username = ?';
    return this.get(sql, [username]);
  }

  getUserByEmail(email) {
    const sql = 'SELECT * FROM users WHERE email = ?';
    return this.get(sql, [email]);
  }

  getUser(username, email) {
    const sql = 'SELECT * FROM users WHERE username = ? OR email = ?';
    return this.get(sql, [username, email]);
  }

  updateUser(userId, updates) {
    const allowedFields = ['full_name', 'email', 'phone', 'role', 'is_active', 'username'];
    const fields = Object.keys(updates).filter(f => allowedFields.includes(f));
    if (fields.length === 0) return { changes: 0 };
    const values = fields.map(f => updates[f]);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const sql = `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    return this.run(sql, [...values, userId]);
  }

  deleteUser(userId) {
    const sql = 'DELETE FROM users WHERE id = ?';
    return this.run(sql, [userId]);
  }

  deactivateUser(userId) {
    const sql = 'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    return this.run(sql, [userId]);
  }

  activateUser(userId) {
    const sql = 'UPDATE users SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    return this.run(sql, [userId]);
  }

  getAllUsers() {
    const sql = 'SELECT id, username, email, role, full_name, phone, is_active, created_at FROM users ORDER BY created_at DESC';
    return this.all(sql);
  }

  getUsersByRole(role) {
    const sql = 'SELECT id, username, email, role, full_name, phone, is_active, created_at FROM users WHERE role = ? ORDER BY created_at DESC';
    return this.all(sql, [role]);
  }

  // ==================== FILE METHODS ====================

  createFile(file) {
    const sql = `
      INSERT INTO files (id, filename, stored_filename, mimetype, size, uploaded_by, has_thumbnail)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    return this.run(sql, [
      file.id,
      file.filename,
      file.stored_filename,
      file.mimetype,
      file.size,
      file.uploaded_by,
      file.has_thumbnail ? 1 : 0
    ]);
  }

  getFileById(fileId) {
    const sql = 'SELECT * FROM files WHERE id = ?';
    return this.get(sql, [fileId]);
  }

  getFilesByUser(userId) {
    const sql = 'SELECT * FROM files WHERE uploaded_by = ? ORDER BY created_at DESC';
    return this.all(sql, [userId]);
  }

  deleteFile(fileId) {
    const sql = 'DELETE FROM files WHERE id = ?';
    return this.run(sql, [fileId]);
  }

  getFileStats() {
    const sql = 'SELECT COUNT(*) as count, SUM(size) as size FROM files';
    return this.get(sql);
  }

  attachFileToOrder(orderId, fileId) {
    const sql = 'INSERT INTO order_files (order_id, file_id) VALUES (?, ?)';
    return this.run(sql, [orderId, fileId]);
  }

  getOrderFiles(orderId) {
    const sql = `
      SELECT f.* FROM files f
      INNER JOIN order_files of ON f.id = of.file_id
      WHERE of.order_id = ?
      ORDER BY f.created_at DESC
    `;
    return this.all(sql, [orderId]);
  }

  detachFileFromOrder(orderId, fileId) {
    const sql = 'DELETE FROM order_files WHERE order_id = ? AND file_id = ?';
    return this.run(sql, [orderId, fileId]);
  }

  // ==================== INVOICE METHODS ====================

  createInvoice(invoice) {
    const sql = `
      INSERT INTO invoices (id, invoice_number, order_id, customer_id, subtotal, discount, ppn_rate, ppn_amount, total_amount, status, issue_date, due_date, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    return this.run(sql, [
      invoice.id,
      invoice.invoice_number,
      invoice.order_id,
      invoice.customer_id,
      invoice.subtotal,
      invoice.discount,
      invoice.ppn_rate,
      invoice.ppn_amount,
      invoice.total_amount,
      invoice.status,
      invoice.issue_date,
      invoice.due_date,
      invoice.notes,
      invoice.created_by
    ]);
  }

  getInvoiceById(invoiceId) {
    const sql = 'SELECT * FROM invoices WHERE id = ?';
    return this.get(sql, [invoiceId]);
  }

  getAllInvoices(filters = {}) {
    let sql = 'SELECT * FROM invoices WHERE 1=1';
    const params = [];

    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.customerId) {
      sql += ' AND customer_id = ?';
      params.push(filters.customerId);
    }

    if (filters.startDate) {
      sql += ' AND issue_date >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      sql += ' AND issue_date <= ?';
      params.push(filters.endDate);
    }

    sql += ' ORDER BY created_at DESC';

    return this.all(sql, params);
  }

  updateInvoice(invoiceId, updates) {
    const allowedFields = ['status', 'subtotal', 'discount', 'discount_type', 'ppn_rate', 'ppn_amount', 'total_amount', 'paid_amount', 'due_date', 'notes', 'payment_date'];
    const fields = Object.keys(updates).filter(f => allowedFields.includes(f));
    if (fields.length === 0) return { changes: 0 };
    const values = fields.map(f => updates[f]);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const sql = `UPDATE invoices SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    return this.run(sql, [...values, invoiceId]);
  }

  deleteInvoice(invoiceId) {
    const sql = 'DELETE FROM invoices WHERE id = ?';
    return this.run(sql, [invoiceId]);
  }

  // ==================== BUDGET METHODS ====================

  createBudget(budget) {
    const sql = `
      INSERT INTO budgets (id, category, amount, period, start_date, end_date, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    return this.run(sql, [
      budget.id,
      budget.category,
      budget.amount,
      budget.period,
      budget.start_date,
      budget.end_date,
      budget.notes,
      budget.created_by
    ]);
  }

  getBudgetById(budgetId) {
    const sql = 'SELECT * FROM budgets WHERE id = ?';
    return this.get(sql, [budgetId]);
  }

  getAllBudgets() {
    const sql = 'SELECT * FROM budgets ORDER BY created_at DESC';
    return this.all(sql);
  }

  getBudgetActualSpending(category, startDate, endDate) {
    const sql = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM financial_transactions
      WHERE type = 'expense'
        AND category = ?
        AND payment_date BETWEEN ? AND ?
    `;
    const result = this.get(sql, [category, startDate, endDate]);
    return result?.total || 0;
  }

  updateBudget(budgetId, updates) {
    const allowedFields = ['category', 'amount', 'period', 'start_date', 'end_date', 'notes'];
    const fields = Object.keys(updates).filter(f => allowedFields.includes(f));
    if (fields.length === 0) return { changes: 0 };
    const values = fields.map(f => updates[f]);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const sql = `UPDATE budgets SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    return this.run(sql, [...values, budgetId]);
  }

  deleteBudget(budgetId) {
    const sql = 'DELETE FROM budgets WHERE id = ?';
    return this.run(sql, [budgetId]);
  }

  // ==================== TAX REPORT METHODS ====================

  getTaxReport(startDate, endDate) {
    const sql = `
      SELECT
        COUNT(DISTINCT i.id) as invoiceCount,
        COALESCE(SUM(i.subtotal), 0) as ppnBase,
        COALESCE(SUM(i.ppn_amount), 0) as ppnCollected,
        COALESCE(SUM(CASE WHEN ft.type = 'income' THEN ft.amount ELSE 0 END), 0) as totalIncome,
        COALESCE(SUM(CASE WHEN ft.type = 'expense' THEN ft.amount ELSE 0 END), 0) as totalExpenses
      FROM invoices i
      LEFT JOIN financial_transactions ft ON i.order_id = ft.order_id
      WHERE i.issue_date BETWEEN ? AND ?
    `;
    return this.get(sql, [startDate, endDate]);
  }

  // ==================== ORDER METHODS ====================

  getOrderById(orderId) {
    const sql = 'SELECT * FROM orders WHERE id = ?';
    return this.get(sql, [orderId]);
  }

  getCustomerById(customerId) {
    const sql = 'SELECT * FROM customers WHERE id = ?';
    return this.get(sql, [customerId]);
  }

  addIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active)',
      'CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
      'CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number)',
      'CREATE INDEX IF NOT EXISTS idx_customers_loyalty_status ON customers(loyalty_status)',
      'CREATE INDEX IF NOT EXISTS idx_customers_business_type ON customers(business_type)',
      'CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_materials(category)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_stock_level ON inventory_materials(current_stock, reorder_level)',
      'CREATE INDEX IF NOT EXISTS idx_inv_movements_item_id ON inventory_movements(item_id)',
      'CREATE INDEX IF NOT EXISTS idx_inv_movements_created_at ON inventory_movements(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_type ON financial_transactions(type)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON financial_transactions(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id)',
      'CREATE INDEX IF NOT EXISTS idx_prod_tasks_order_id ON production_tasks(order_id)',
      'CREATE INDEX IF NOT EXISTS idx_prod_tasks_status ON production_tasks(status)',
      'CREATE INDEX IF NOT EXISTS idx_prod_tasks_assigned_to ON production_tasks(assigned_to)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)',
      'CREATE INDEX IF NOT EXISTS idx_comm_msgs_customer_id ON communication_messages(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_comm_msgs_type ON communication_messages(type)',
      'CREATE INDEX IF NOT EXISTS idx_comm_msgs_status ON communication_messages(status)',
      'CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by)',
      'CREATE INDEX IF NOT EXISTS idx_quality_checks_order_id ON quality_checks(order_id)',
      'CREATE INDEX IF NOT EXISTS idx_prod_tasks_due_date ON production_tasks(due_date)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date)',
      'CREATE INDEX IF NOT EXISTS idx_inv_movements_type ON inventory_movements(type)',
    ];

    for (const sql of indexes) {
      this.db.prepare(sql).run();
    }
  }
}

module.exports = DatabaseService;
