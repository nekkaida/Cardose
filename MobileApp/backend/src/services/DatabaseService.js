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
}

module.exports = DatabaseService;