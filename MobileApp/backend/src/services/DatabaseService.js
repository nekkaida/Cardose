const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseService {
  constructor() {
    this.dbPath = path.join(__dirname, '../database/premium_gift_box.db');
    this.db = null;
  }

  async initialize() {
    try {
      // Create database directory if it doesn't exist
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Open database connection
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err.message);
          throw err;
        }
        console.log('✅ Connected to SQLite database');
      });

      // Create tables
      await this.createTables();
      
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  async createTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
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
        due_date DATETIME,
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
      )`
    ];

    for (const sql of tables) {
      await this.run(sql);
    }
  }

  // Promisify database operations
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  // ==================== USER METHODS ====================

  async createUser(user) {
    const sql = `
      INSERT INTO users (id, username, email, password_hash, role, full_name, phone, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    return await this.run(sql, [
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

  async getUserById(userId) {
    const sql = 'SELECT * FROM users WHERE id = ?';
    return await this.get(sql, [userId]);
  }

  async getUserByUsername(username) {
    const sql = 'SELECT * FROM users WHERE username = ?';
    return await this.get(sql, [username]);
  }

  async getUserByEmail(email) {
    const sql = 'SELECT * FROM users WHERE email = ?';
    return await this.get(sql, [email]);
  }

  async getUser(username, email) {
    const sql = 'SELECT * FROM users WHERE username = ? OR email = ?';
    return await this.get(sql, [username, email]);
  }

  async updateUser(userId, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const sql = `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

    return await this.run(sql, [...values, userId]);
  }

  async deleteUser(userId) {
    const sql = 'DELETE FROM users WHERE id = ?';
    return await this.run(sql, [userId]);
  }

  async deactivateUser(userId) {
    const sql = 'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    return await this.run(sql, [userId]);
  }

  async activateUser(userId) {
    const sql = 'UPDATE users SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    return await this.run(sql, [userId]);
  }

  async getAllUsers() {
    const sql = 'SELECT id, username, email, role, full_name, phone, is_active, created_at FROM users ORDER BY created_at DESC';
    return await this.all(sql);
  }

  async getUsersByRole(role) {
    const sql = 'SELECT id, username, email, role, full_name, phone, is_active, created_at FROM users WHERE role = ? ORDER BY created_at DESC';
    return await this.all(sql, [role]);
  }

  // ==================== FILE METHODS ====================

  async createFile(file) {
    const sql = `
      INSERT INTO files (id, filename, stored_filename, mimetype, size, uploaded_by, has_thumbnail)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    return await this.run(sql, [
      file.id,
      file.filename,
      file.stored_filename,
      file.mimetype,
      file.size,
      file.uploaded_by,
      file.has_thumbnail ? 1 : 0
    ]);
  }

  async getFileById(fileId) {
    const sql = 'SELECT * FROM files WHERE id = ?';
    return await this.get(sql, [fileId]);
  }

  async getFilesByUser(userId) {
    const sql = 'SELECT * FROM files WHERE uploaded_by = ? ORDER BY created_at DESC';
    return await this.all(sql, [userId]);
  }

  async deleteFile(fileId) {
    const sql = 'DELETE FROM files WHERE id = ?';
    return await this.run(sql, [fileId]);
  }

  async getFileStats() {
    const sql = 'SELECT COUNT(*) as count, SUM(size) as size FROM files';
    return await this.get(sql);
  }

  async attachFileToOrder(orderId, fileId) {
    const sql = 'INSERT INTO order_files (order_id, file_id) VALUES (?, ?)';
    return await this.run(sql, [orderId, fileId]);
  }

  async getOrderFiles(orderId) {
    const sql = `
      SELECT f.* FROM files f
      INNER JOIN order_files of ON f.id = of.file_id
      WHERE of.order_id = ?
      ORDER BY f.created_at DESC
    `;
    return await this.all(sql, [orderId]);
  }

  async detachFileFromOrder(orderId, fileId) {
    const sql = 'DELETE FROM order_files WHERE order_id = ? AND file_id = ?';
    return await this.run(sql, [orderId, fileId]);
  }

  // ==================== INVOICE METHODS ====================

  async createInvoice(invoice) {
    const sql = `
      INSERT INTO invoices (id, invoice_number, order_id, customer_id, subtotal, discount, ppn_rate, ppn_amount, total_amount, status, issue_date, due_date, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    return await this.run(sql, [
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

  async getInvoiceById(invoiceId) {
    const sql = 'SELECT * FROM invoices WHERE id = ?';
    return await this.get(sql, [invoiceId]);
  }

  async getAllInvoices(filters = {}) {
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

    return await this.all(sql, params);
  }

  async updateInvoice(invoiceId, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const sql = `UPDATE invoices SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

    return await this.run(sql, [...values, invoiceId]);
  }

  async deleteInvoice(invoiceId) {
    const sql = 'DELETE FROM invoices WHERE id = ?';
    return await this.run(sql, [invoiceId]);
  }

  // ==================== BUDGET METHODS ====================

  async createBudget(budget) {
    const sql = `
      INSERT INTO budgets (id, category, amount, period, start_date, end_date, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    return await this.run(sql, [
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

  async getBudgetById(budgetId) {
    const sql = 'SELECT * FROM budgets WHERE id = ?';
    return await this.get(sql, [budgetId]);
  }

  async getAllBudgets() {
    const sql = 'SELECT * FROM budgets ORDER BY created_at DESC';
    return await this.all(sql);
  }

  async getBudgetActualSpending(category, startDate, endDate) {
    const sql = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM financial_transactions
      WHERE type = 'expense'
        AND category = ?
        AND payment_date BETWEEN ? AND ?
    `;
    const result = await this.get(sql, [category, startDate, endDate]);
    return result?.total || 0;
  }

  async updateBudget(budgetId, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const sql = `UPDATE budgets SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

    return await this.run(sql, [...values, budgetId]);
  }

  async deleteBudget(budgetId) {
    const sql = 'DELETE FROM budgets WHERE id = ?';
    return await this.run(sql, [budgetId]);
  }

  // ==================== TAX REPORT METHODS ====================

  async getTaxReport(startDate, endDate) {
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
    return await this.get(sql, [startDate, endDate]);
  }

  // ==================== ORDER METHODS ====================

  async getOrderById(orderId) {
    const sql = 'SELECT * FROM orders WHERE id = ?';
    return await this.get(sql, [orderId]);
  }

  async getCustomerById(customerId) {
    const sql = 'SELECT * FROM customers WHERE id = ?';
    return await this.get(sql, [customerId]);
  }
}

module.exports = DatabaseService;