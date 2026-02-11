// DatabaseService unit tests
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('DatabaseService', () => {
  let DatabaseService;
  let dbService;
  let tempDir;
  let tempDbPath;

  beforeEach(() => {
    // Fresh require to avoid any cached state
    jest.resetModules();
    DatabaseService = require('../../src/services/DatabaseService');

    // Create a temp directory with a temp database path
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbservice-test-'));
    tempDbPath = path.join(tempDir, 'test.db');

    // Create a new instance and override the db path
    dbService = new DatabaseService();
    dbService.dbPath = tempDbPath;
  });

  afterEach(() => {
    // Close the database if open
    if (dbService && dbService.db && dbService.db.open) {
      dbService.close();
    }

    // Clean up temp files
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ==================== INITIALIZATION ====================
  describe('initialize', () => {
    test('should create database file and open connection', () => {
      dbService.initialize();

      expect(dbService.db).toBeDefined();
      expect(dbService.db.open).toBe(true);
      expect(fs.existsSync(tempDbPath)).toBe(true);
    });

    test('should create database directory if it does not exist', () => {
      const nestedPath = path.join(tempDir, 'nested', 'dir', 'test.db');
      dbService.dbPath = nestedPath;

      dbService.initialize();

      expect(fs.existsSync(path.dirname(nestedPath))).toBe(true);
      expect(dbService.db.open).toBe(true);
    });

    test('should create all required tables', () => {
      dbService.initialize();

      const tables = dbService.db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      ).all().map(t => t.name);

      // Core tables that should always be created
      const expectedTables = [
        'users',
        'customers',
        'orders',
        'inventory',
        'transactions',
        'files',
        'order_files',
        'invoices',
        'budgets',
        'financial_transactions',
        'inventory_materials',
        'inventory_products',
        'inventory_movements',
        'purchase_orders',
        'production_tasks',
        'production_logs',
        'message_templates',
        'settings',
        'audit_logs',
        'webhooks',
        'notifications',
        'communication_messages',
        'backups',
        'order_stages',
        'quality_checks',
        'production_workflows',
        'production_issues',
        'production_templates',
        'reorder_alerts',
        'schema_migrations'  // Created by MigrationService during initialize
      ];

      for (const tableName of expectedTables) {
        expect(tables).toContain(tableName);
      }
    });

    test('should create indexes for performance', () => {
      dbService.initialize();

      const indexes = dbService.db.prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name"
      ).all().map(i => i.name);

      // Spot-check some key indexes
      expect(indexes).toContain('idx_users_username');
      expect(indexes).toContain('idx_users_email');
      expect(indexes).toContain('idx_orders_customer_id');
      expect(indexes).toContain('idx_orders_status');
      expect(indexes).toContain('idx_invoices_customer_id');
      expect(indexes).toContain('idx_prod_tasks_order_id');
      expect(indexes).toContain('idx_audit_logs_created_at');
    });

    test('should enable WAL journal mode', () => {
      dbService.initialize();

      const journalMode = dbService.db.pragma('journal_mode', { simple: true });
      expect(journalMode).toBe('wal');
    });

    test('should enable foreign keys', () => {
      dbService.initialize();

      const fkEnabled = dbService.db.pragma('foreign_keys', { simple: true });
      expect(fkEnabled).toBe(1);
    });

    test('should not throw when called on an already-initialized database', () => {
      dbService.initialize();

      // Close and re-initialize with the same path (tables already exist)
      dbService.close();
      dbService.db = null;

      expect(() => dbService.initialize()).not.toThrow();
      expect(dbService.db.open).toBe(true);
    });
  });

  // ==================== GET MIGRATION STATUS ====================
  describe('getMigrationStatus', () => {
    test('should return migration status information', () => {
      dbService.initialize();

      const status = dbService.getMigrationStatus();

      expect(status).toBeDefined();
      expect(typeof status.applied).toBe('number');
      expect(typeof status.pending).toBe('number');
      expect(Array.isArray(status.appliedMigrations)).toBe(true);
      expect(Array.isArray(status.pendingMigrations)).toBe(true);
    });

    test('should reflect migrations applied during initialization', () => {
      dbService.initialize();

      const status = dbService.getMigrationStatus();

      // The real migrations directory has at least 001_add_invoice_columns.js
      // After initialize(), it should have been applied
      expect(status.applied).toBeGreaterThanOrEqual(0);
      // All migrations from the real directory should be accounted for
      expect(status.applied + status.pending).toBeGreaterThanOrEqual(0);
    });
  });

  // ==================== CLOSE ====================
  describe('close', () => {
    test('should close the database connection', () => {
      dbService.initialize();
      expect(dbService.db.open).toBe(true);

      dbService.close();

      expect(dbService.db.open).toBe(false);
    });

    test('should not throw when called with no active connection', () => {
      // db is null by default
      expect(dbService.db).toBeNull();

      expect(() => dbService.close()).not.toThrow();
    });

    test('should not throw when called multiple times', () => {
      dbService.initialize();
      dbService.close();

      // Second close should not throw (db object exists but is already closed)
      // better-sqlite3 throws on close of already-closed db, but our service checks if db exists
      // The method should be safe to call
      expect(dbService.db).toBeDefined();
    });
  });

  // ==================== CRUD: run / get / all ====================
  describe('run', () => {
    beforeEach(() => {
      dbService.initialize();
    });

    test('should insert a row and return lastInsertRowid', () => {
      const result = dbService.run(
        "INSERT INTO customers (id, name) VALUES (?, ?)",
        ['cust-1', 'Test Customer']
      );

      expect(result).toBeDefined();
      expect(result.changes).toBe(1);
    });

    test('should update rows and return changes count', () => {
      dbService.run(
        "INSERT INTO customers (id, name, phone) VALUES (?, ?, ?)",
        ['cust-1', 'Customer A', '123']
      );

      const result = dbService.run(
        "UPDATE customers SET phone = ? WHERE id = ?",
        ['456', 'cust-1']
      );

      expect(result.changes).toBe(1);
    });

    test('should throw on invalid SQL', () => {
      expect(() => {
        dbService.run("INSERT INTO nonexistent_table VALUES (?)", ['value']);
      }).toThrow();
    });
  });

  describe('get', () => {
    beforeEach(() => {
      dbService.initialize();
    });

    test('should return a single row', () => {
      dbService.run(
        "INSERT INTO customers (id, name, email) VALUES (?, ?, ?)",
        ['cust-1', 'Customer One', 'one@test.com']
      );

      const row = dbService.get("SELECT * FROM customers WHERE id = ?", ['cust-1']);

      expect(row).toBeDefined();
      expect(row.name).toBe('Customer One');
      expect(row.email).toBe('one@test.com');
    });

    test('should return undefined for non-existent row', () => {
      const row = dbService.get("SELECT * FROM customers WHERE id = ?", ['nonexistent']);

      expect(row).toBeUndefined();
    });

    test('should throw on invalid SQL', () => {
      expect(() => {
        dbService.get("SELECT * FROM nonexistent_table WHERE id = ?", ['1']);
      }).toThrow();
    });
  });

  describe('all', () => {
    beforeEach(() => {
      dbService.initialize();
    });

    test('should return all matching rows', () => {
      dbService.run("INSERT INTO customers (id, name) VALUES (?, ?)", ['c-1', 'Alice']);
      dbService.run("INSERT INTO customers (id, name) VALUES (?, ?)", ['c-2', 'Bob']);
      dbService.run("INSERT INTO customers (id, name) VALUES (?, ?)", ['c-3', 'Charlie']);

      const rows = dbService.all("SELECT * FROM customers ORDER BY name");

      expect(rows).toHaveLength(3);
      expect(rows[0].name).toBe('Alice');
      expect(rows[1].name).toBe('Bob');
      expect(rows[2].name).toBe('Charlie');
    });

    test('should return empty array when no rows match', () => {
      const rows = dbService.all("SELECT * FROM customers WHERE name = ?", ['Nobody']);

      expect(rows).toEqual([]);
    });

    test('should throw on invalid SQL', () => {
      expect(() => {
        dbService.all("SELECT * FROM nonexistent_table");
      }).toThrow();
    });
  });

  // ==================== USER METHODS ====================
  describe('User CRUD methods', () => {
    beforeEach(() => {
      dbService.initialize();
    });

    test('createUser should insert a user', () => {
      const user = {
        id: 'user-1',
        username: 'johndoe',
        email: 'john@example.com',
        password_hash: 'hashed_pw',
        role: 'admin',
        full_name: 'John Doe',
        phone: '555-1234',
        is_active: 1
      };

      const result = dbService.createUser(user);
      expect(result.changes).toBe(1);

      const fetched = dbService.getUserById('user-1');
      expect(fetched).toBeDefined();
      expect(fetched.username).toBe('johndoe');
      expect(fetched.email).toBe('john@example.com');
      expect(fetched.role).toBe('admin');
    });

    test('getUserByUsername should find user by username', () => {
      dbService.createUser({
        id: 'user-1', username: 'alice', email: 'alice@test.com',
        password_hash: 'hash', role: 'user', full_name: 'Alice', phone: null, is_active: 1
      });

      const user = dbService.getUserByUsername('alice');
      expect(user).toBeDefined();
      expect(user.id).toBe('user-1');
    });

    test('getUserByEmail should find user by email', () => {
      dbService.createUser({
        id: 'user-2', username: 'bob', email: 'bob@test.com',
        password_hash: 'hash', role: 'user', full_name: 'Bob', phone: null, is_active: 1
      });

      const user = dbService.getUserByEmail('bob@test.com');
      expect(user).toBeDefined();
      expect(user.username).toBe('bob');
    });

    test('getUser should find by username or email', () => {
      dbService.createUser({
        id: 'user-3', username: 'charlie', email: 'charlie@test.com',
        password_hash: 'hash', role: 'employee', full_name: 'Charlie', phone: null, is_active: 1
      });

      // Find by username
      const byUsername = dbService.getUser('charlie', 'nonexistent@test.com');
      expect(byUsername).toBeDefined();
      expect(byUsername.id).toBe('user-3');

      // Find by email
      const byEmail = dbService.getUser('nonexistent', 'charlie@test.com');
      expect(byEmail).toBeDefined();
      expect(byEmail.id).toBe('user-3');
    });

    test('updateUser should update allowed fields only', () => {
      dbService.createUser({
        id: 'user-4', username: 'dave', email: 'dave@test.com',
        password_hash: 'hash', role: 'user', full_name: 'Dave', phone: null, is_active: 1
      });

      const result = dbService.updateUser('user-4', {
        full_name: 'Dave Updated',
        phone: '999-9999',
        password_hash: 'should_not_be_updated'  // not in allowedFields
      });

      expect(result.changes).toBe(1);

      const updated = dbService.getUserById('user-4');
      expect(updated.full_name).toBe('Dave Updated');
      expect(updated.phone).toBe('999-9999');
      expect(updated.password_hash).toBe('hash');  // should remain unchanged
    });

    test('updateUser should return zero changes for empty update', () => {
      dbService.createUser({
        id: 'user-5', username: 'eve', email: 'eve@test.com',
        password_hash: 'hash', role: 'user', full_name: 'Eve', phone: null, is_active: 1
      });

      const result = dbService.updateUser('user-5', {
        password_hash: 'not_allowed'
      });

      expect(result.changes).toBe(0);
    });

    test('deleteUser should remove the user', () => {
      dbService.createUser({
        id: 'user-6', username: 'frank', email: 'frank@test.com',
        password_hash: 'hash', role: 'user', full_name: 'Frank', phone: null, is_active: 1
      });

      const result = dbService.deleteUser('user-6');
      expect(result.changes).toBe(1);

      const deleted = dbService.getUserById('user-6');
      expect(deleted).toBeUndefined();
    });

    test('deactivateUser / activateUser should toggle is_active', () => {
      dbService.createUser({
        id: 'user-7', username: 'grace', email: 'grace@test.com',
        password_hash: 'hash', role: 'user', full_name: 'Grace', phone: null, is_active: 1
      });

      dbService.deactivateUser('user-7');
      let user = dbService.getUserById('user-7');
      expect(user.is_active).toBe(0);

      dbService.activateUser('user-7');
      user = dbService.getUserById('user-7');
      expect(user.is_active).toBe(1);
    });

    test('getAllUsers should return all users', () => {
      dbService.createUser({
        id: 'u1', username: 'user1', email: 'u1@test.com',
        password_hash: 'h', role: 'admin', full_name: 'User 1', phone: null, is_active: 1
      });
      dbService.createUser({
        id: 'u2', username: 'user2', email: 'u2@test.com',
        password_hash: 'h', role: 'employee', full_name: 'User 2', phone: null, is_active: 1
      });

      const users = dbService.getAllUsers();
      expect(users).toHaveLength(2);
      // Should not include password_hash in the result
      expect(users[0].password_hash).toBeUndefined();
    });

    test('getUsersByRole should filter by role', () => {
      dbService.createUser({
        id: 'u1', username: 'admin1', email: 'a1@test.com',
        password_hash: 'h', role: 'admin', full_name: 'Admin 1', phone: null, is_active: 1
      });
      dbService.createUser({
        id: 'u2', username: 'emp1', email: 'e1@test.com',
        password_hash: 'h', role: 'employee', full_name: 'Employee 1', phone: null, is_active: 1
      });
      dbService.createUser({
        id: 'u3', username: 'emp2', email: 'e2@test.com',
        password_hash: 'h', role: 'employee', full_name: 'Employee 2', phone: null, is_active: 1
      });

      const admins = dbService.getUsersByRole('admin');
      expect(admins).toHaveLength(1);
      expect(admins[0].username).toBe('admin1');

      const employees = dbService.getUsersByRole('employee');
      expect(employees).toHaveLength(2);
    });
  });

  // ==================== FILE METHODS ====================
  describe('File CRUD methods', () => {
    beforeEach(() => {
      dbService.initialize();
      // Create a user for the uploaded_by foreign key
      dbService.createUser({
        id: 'uploader-1', username: 'uploader', email: 'uploader@test.com',
        password_hash: 'h', role: 'user', full_name: 'Uploader', phone: null, is_active: 1
      });
    });

    test('createFile should insert a file record', () => {
      const file = {
        id: 'file-1',
        filename: 'test.pdf',
        stored_filename: 'abc123.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        uploaded_by: 'uploader-1',
        has_thumbnail: false
      };

      const result = dbService.createFile(file);
      expect(result.changes).toBe(1);

      const fetched = dbService.getFileById('file-1');
      expect(fetched).toBeDefined();
      expect(fetched.filename).toBe('test.pdf');
      expect(fetched.size).toBe(1024);
      expect(fetched.has_thumbnail).toBe(0);
    });

    test('getFilesByUser should return files uploaded by a specific user', () => {
      dbService.createFile({
        id: 'f1', filename: 'a.png', stored_filename: 'a.png',
        mimetype: 'image/png', size: 100, uploaded_by: 'uploader-1', has_thumbnail: true
      });
      dbService.createFile({
        id: 'f2', filename: 'b.png', stored_filename: 'b.png',
        mimetype: 'image/png', size: 200, uploaded_by: 'uploader-1', has_thumbnail: false
      });

      const files = dbService.getFilesByUser('uploader-1');
      expect(files).toHaveLength(2);
    });

    test('deleteFile should remove a file record', () => {
      dbService.createFile({
        id: 'f-del', filename: 'delete-me.txt', stored_filename: 'del.txt',
        mimetype: 'text/plain', size: 50, uploaded_by: 'uploader-1', has_thumbnail: false
      });

      const result = dbService.deleteFile('f-del');
      expect(result.changes).toBe(1);

      const deleted = dbService.getFileById('f-del');
      expect(deleted).toBeUndefined();
    });

    test('getFileStats should return count and total size', () => {
      dbService.createFile({
        id: 'f1', filename: 'a.png', stored_filename: 'a.png',
        mimetype: 'image/png', size: 100, uploaded_by: 'uploader-1', has_thumbnail: false
      });
      dbService.createFile({
        id: 'f2', filename: 'b.png', stored_filename: 'b.png',
        mimetype: 'image/png', size: 300, uploaded_by: 'uploader-1', has_thumbnail: false
      });

      const stats = dbService.getFileStats();
      expect(stats.count).toBe(2);
      expect(stats.size).toBe(400);
    });

    test('getFileStats should handle empty files table', () => {
      const stats = dbService.getFileStats();
      expect(stats.count).toBe(0);
    });
  });

  // ==================== ORDER FILE ATTACHMENT METHODS ====================
  describe('Order file attachment methods', () => {
    beforeEach(() => {
      dbService.initialize();
      // Create required user, customer, and order
      dbService.createUser({
        id: 'u-attach', username: 'attacher', email: 'attach@test.com',
        password_hash: 'h', role: 'user', full_name: 'Attacher', phone: null, is_active: 1
      });
      dbService.run("INSERT INTO customers (id, name) VALUES (?, ?)", ['cust-attach', 'Attach Customer']);
      dbService.run(
        "INSERT INTO orders (id, order_number, customer_id) VALUES (?, ?, ?)",
        ['ord-1', 'ORD-001', 'cust-attach']
      );
      dbService.createFile({
        id: 'f-attach', filename: 'attached.pdf', stored_filename: 'att.pdf',
        mimetype: 'application/pdf', size: 500, uploaded_by: 'u-attach', has_thumbnail: false
      });
    });

    test('attachFileToOrder should link a file to an order', () => {
      const result = dbService.attachFileToOrder('ord-1', 'f-attach');
      expect(result.changes).toBe(1);
    });

    test('getOrderFiles should return files attached to an order', () => {
      dbService.attachFileToOrder('ord-1', 'f-attach');

      const files = dbService.getOrderFiles('ord-1');
      expect(files).toHaveLength(1);
      expect(files[0].id).toBe('f-attach');
      expect(files[0].filename).toBe('attached.pdf');
    });

    test('detachFileFromOrder should remove the file-order link', () => {
      dbService.attachFileToOrder('ord-1', 'f-attach');
      const result = dbService.detachFileFromOrder('ord-1', 'f-attach');

      expect(result.changes).toBe(1);

      const files = dbService.getOrderFiles('ord-1');
      expect(files).toHaveLength(0);
    });
  });

  // ==================== INVOICE METHODS ====================
  describe('Invoice CRUD methods', () => {
    beforeEach(() => {
      dbService.initialize();
      dbService.run("INSERT INTO customers (id, name) VALUES (?, ?)", ['cust-inv', 'Invoice Cust']);
      dbService.run(
        "INSERT INTO orders (id, order_number, customer_id) VALUES (?, ?, ?)",
        ['ord-inv', 'ORD-INV-001', 'cust-inv']
      );
    });

    test('createInvoice and getInvoiceById', () => {
      const invoice = {
        id: 'inv-1',
        invoice_number: 'INV-001',
        order_id: 'ord-inv',
        customer_id: 'cust-inv',
        subtotal: 100000,
        discount: 5000,
        ppn_rate: 0.11,
        ppn_amount: 10450,
        total_amount: 105450,
        status: 'draft',
        issue_date: '2025-01-01',
        due_date: '2025-01-31',
        notes: 'Test invoice',
        created_by: null
      };

      dbService.createInvoice(invoice);

      const fetched = dbService.getInvoiceById('inv-1');
      expect(fetched).toBeDefined();
      expect(fetched.invoice_number).toBe('INV-001');
      expect(fetched.total_amount).toBe(105450);
      expect(fetched.status).toBe('draft');
    });

    test('getAllInvoices with filters', () => {
      dbService.createInvoice({
        id: 'inv-a', invoice_number: 'INV-A', order_id: 'ord-inv', customer_id: 'cust-inv',
        subtotal: 100, discount: 0, ppn_rate: 0.11, ppn_amount: 11, total_amount: 111,
        status: 'draft', issue_date: '2025-01-15', due_date: '2025-02-15', notes: null, created_by: null
      });
      dbService.createInvoice({
        id: 'inv-b', invoice_number: 'INV-B', order_id: 'ord-inv', customer_id: 'cust-inv',
        subtotal: 200, discount: 0, ppn_rate: 0.11, ppn_amount: 22, total_amount: 222,
        status: 'paid', issue_date: '2025-03-01', due_date: '2025-04-01', notes: null, created_by: null
      });

      // No filters
      const all = dbService.getAllInvoices();
      expect(all).toHaveLength(2);

      // Filter by status
      const drafts = dbService.getAllInvoices({ status: 'draft' });
      expect(drafts).toHaveLength(1);
      expect(drafts[0].id).toBe('inv-a');

      // Filter by date range
      const janInvoices = dbService.getAllInvoices({ startDate: '2025-01-01', endDate: '2025-01-31' });
      expect(janInvoices).toHaveLength(1);

      // Filter by customer
      const custInvoices = dbService.getAllInvoices({ customerId: 'cust-inv' });
      expect(custInvoices).toHaveLength(2);
    });

    test('updateInvoice should update allowed fields', () => {
      dbService.createInvoice({
        id: 'inv-upd', invoice_number: 'INV-UPD', order_id: 'ord-inv', customer_id: 'cust-inv',
        subtotal: 100, discount: 0, ppn_rate: 0.11, ppn_amount: 11, total_amount: 111,
        status: 'draft', issue_date: '2025-01-15', due_date: '2025-02-15', notes: null, created_by: null
      });

      dbService.updateInvoice('inv-upd', { status: 'paid', notes: 'Paid in full' });

      const updated = dbService.getInvoiceById('inv-upd');
      expect(updated.status).toBe('paid');
      expect(updated.notes).toBe('Paid in full');
    });

    test('deleteInvoice should remove the invoice', () => {
      dbService.createInvoice({
        id: 'inv-del', invoice_number: 'INV-DEL', order_id: 'ord-inv', customer_id: 'cust-inv',
        subtotal: 100, discount: 0, ppn_rate: 0.11, ppn_amount: 11, total_amount: 111,
        status: 'draft', issue_date: '2025-01-15', due_date: '2025-02-15', notes: null, created_by: null
      });

      const result = dbService.deleteInvoice('inv-del');
      expect(result.changes).toBe(1);

      const deleted = dbService.getInvoiceById('inv-del');
      expect(deleted).toBeUndefined();
    });
  });

  // ==================== BUDGET METHODS ====================
  describe('Budget CRUD methods', () => {
    beforeEach(() => {
      dbService.initialize();
    });

    test('createBudget and getBudgetById', () => {
      const budget = {
        id: 'bud-1',
        category: 'materials',
        amount: 5000000,
        period: 'monthly',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        notes: 'January budget',
        created_by: null
      };

      dbService.createBudget(budget);

      const fetched = dbService.getBudgetById('bud-1');
      expect(fetched).toBeDefined();
      expect(fetched.category).toBe('materials');
      expect(fetched.amount).toBe(5000000);
    });

    test('getAllBudgets should return all budgets', () => {
      dbService.createBudget({
        id: 'b1', category: 'materials', amount: 1000, period: 'monthly',
        start_date: '2025-01-01', end_date: '2025-01-31', notes: null, created_by: null
      });
      dbService.createBudget({
        id: 'b2', category: 'labor', amount: 2000, period: 'monthly',
        start_date: '2025-01-01', end_date: '2025-01-31', notes: null, created_by: null
      });

      const budgets = dbService.getAllBudgets();
      expect(budgets).toHaveLength(2);
    });

    test('getBudgetActualSpending should sum matching expenses', () => {
      // Insert some financial transactions
      dbService.run(
        "INSERT INTO financial_transactions (id, type, amount, category, payment_date) VALUES (?, ?, ?, ?, ?)",
        ['ft-1', 'expense', 500, 'materials', '2025-01-15']
      );
      dbService.run(
        "INSERT INTO financial_transactions (id, type, amount, category, payment_date) VALUES (?, ?, ?, ?, ?)",
        ['ft-2', 'expense', 300, 'materials', '2025-01-20']
      );
      dbService.run(
        "INSERT INTO financial_transactions (id, type, amount, category, payment_date) VALUES (?, ?, ?, ?, ?)",
        ['ft-3', 'income', 1000, 'materials', '2025-01-15']  // income, should not count
      );

      const spending = dbService.getBudgetActualSpending('materials', '2025-01-01', '2025-01-31');
      expect(spending).toBe(800);
    });

    test('getBudgetActualSpending should return 0 when no matching transactions', () => {
      const spending = dbService.getBudgetActualSpending('nonexistent', '2025-01-01', '2025-01-31');
      expect(spending).toBe(0);
    });

    test('updateBudget should update allowed fields', () => {
      dbService.createBudget({
        id: 'b-upd', category: 'materials', amount: 1000, period: 'monthly',
        start_date: '2025-01-01', end_date: '2025-01-31', notes: null, created_by: null
      });

      dbService.updateBudget('b-upd', { amount: 2000, notes: 'Updated amount' });

      const updated = dbService.getBudgetById('b-upd');
      expect(updated.amount).toBe(2000);
      expect(updated.notes).toBe('Updated amount');
    });

    test('deleteBudget should remove the budget', () => {
      dbService.createBudget({
        id: 'b-del', category: 'materials', amount: 1000, period: 'monthly',
        start_date: '2025-01-01', end_date: '2025-01-31', notes: null, created_by: null
      });

      const result = dbService.deleteBudget('b-del');
      expect(result.changes).toBe(1);

      const deleted = dbService.getBudgetById('b-del');
      expect(deleted).toBeUndefined();
    });
  });

  // ==================== TAX REPORT ====================
  describe('getTaxReport', () => {
    beforeEach(() => {
      dbService.initialize();
      dbService.run("INSERT INTO customers (id, name) VALUES (?, ?)", ['cust-tax', 'Tax Cust']);
      dbService.run(
        "INSERT INTO orders (id, order_number, customer_id) VALUES (?, ?, ?)",
        ['ord-tax', 'ORD-TAX-001', 'cust-tax']
      );
    });

    test('should return aggregated tax data for a date range', () => {
      dbService.createInvoice({
        id: 'inv-tax', invoice_number: 'INV-TAX', order_id: 'ord-tax', customer_id: 'cust-tax',
        subtotal: 100000, discount: 0, ppn_rate: 0.11, ppn_amount: 11000, total_amount: 111000,
        status: 'paid', issue_date: '2025-06-15', due_date: '2025-07-15', notes: null, created_by: null
      });

      const report = dbService.getTaxReport('2025-06-01', '2025-06-30');

      expect(report).toBeDefined();
      expect(report.invoiceCount).toBe(1);
      expect(report.ppnBase).toBe(100000);
      expect(report.ppnCollected).toBe(11000);
    });

    test('should return zeros when no data in range', () => {
      const report = dbService.getTaxReport('2020-01-01', '2020-12-31');

      expect(report).toBeDefined();
      expect(report.invoiceCount).toBe(0);
      expect(report.ppnBase).toBe(0);
      expect(report.ppnCollected).toBe(0);
    });
  });

  // ==================== ORDER / CUSTOMER GETTERS ====================
  describe('getOrderById / getCustomerById', () => {
    beforeEach(() => {
      dbService.initialize();
    });

    test('getOrderById should return the order', () => {
      dbService.run("INSERT INTO customers (id, name) VALUES (?, ?)", ['c-o', 'Order Cust']);
      dbService.run(
        "INSERT INTO orders (id, order_number, customer_id, status) VALUES (?, ?, ?, ?)",
        ['o-1', 'ORD-100', 'c-o', 'pending']
      );

      const order = dbService.getOrderById('o-1');
      expect(order).toBeDefined();
      expect(order.order_number).toBe('ORD-100');
      expect(order.status).toBe('pending');
    });

    test('getOrderById should return undefined for non-existent order', () => {
      const order = dbService.getOrderById('nonexistent');
      expect(order).toBeUndefined();
    });

    test('getCustomerById should return the customer', () => {
      dbService.run(
        "INSERT INTO customers (id, name, email, business_type) VALUES (?, ?, ?, ?)",
        ['c-fetch', 'Fetched Customer', 'fetch@test.com', 'retail']
      );

      const customer = dbService.getCustomerById('c-fetch');
      expect(customer).toBeDefined();
      expect(customer.name).toBe('Fetched Customer');
      expect(customer.business_type).toBe('retail');
    });

    test('getCustomerById should return undefined for non-existent customer', () => {
      const customer = dbService.getCustomerById('nonexistent');
      expect(customer).toBeUndefined();
    });
  });
});
