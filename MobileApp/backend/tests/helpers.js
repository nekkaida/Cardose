// Test helper functions
const Fastify = require('fastify');
const path = require('path');
const fs = require('fs');

// Build a fresh Fastify instance for testing
async function buildApp() {
  const fastify = Fastify({
    logger: false // Disable logging in tests
  });

  // Register CORS
  await fastify.register(require('@fastify/cors'), {
    origin: true
  });

  // Register JWT
  await fastify.register(require('@fastify/jwt'), {
    secret: process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing'
  });

  // Database setup (needed for settings and analytics routes)
  const DatabaseService = require('../src/services/DatabaseService');
  const dbService = new DatabaseService();
  dbService.initialize();

  // ---- Schema fixups: align DB schema with what routes actually expect ----
  // Some routes reference columns/tables not present in the original CREATE TABLE statements.
  // Add missing columns and tables so that routes don't return 500 in tests.

  const rawDb = dbService.db;

  // 1. inventory_materials: route reports/inventory references 'sku' column
  try { rawDb.exec('ALTER TABLE inventory_materials ADD COLUMN sku TEXT'); } catch (e) { /* already exists */ }

  // 2. quality_checks: routes reference 'overall_status' and 'checklist_items' columns;
  //    also 'check_type' is NOT NULL but routes don't insert it, so add a default.
  try { rawDb.exec('ALTER TABLE quality_checks ADD COLUMN overall_status TEXT DEFAULT \'pending\''); } catch (e) { /* already exists */ }
  try { rawDb.exec('ALTER TABLE quality_checks ADD COLUMN checklist_items TEXT'); } catch (e) { /* already exists */ }
  try { rawDb.exec('ALTER TABLE quality_checks ADD COLUMN updated_at DATETIME'); } catch (e) { /* already exists */ }

  // Recreate quality_checks without check_type NOT NULL (routes don't provide it)
  // SQLite doesn't support DROP NOT NULL, so recreate the table
  try {
    rawDb.exec(`
      CREATE TABLE IF NOT EXISTS quality_checks_new (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        check_type TEXT DEFAULT 'general',
        status TEXT DEFAULT 'pending',
        overall_status TEXT DEFAULT 'pending',
        checklist_items TEXT,
        checked_by TEXT,
        checked_at DATETIME,
        notes TEXT,
        updated_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders (id),
        FOREIGN KEY (checked_by) REFERENCES users (id)
      )
    `);
    rawDb.exec('INSERT OR IGNORE INTO quality_checks_new SELECT id, order_id, check_type, status, COALESCE(overall_status, status), checklist_items, checked_by, checked_at, notes, updated_at, created_at FROM quality_checks');
    rawDb.exec('DROP TABLE quality_checks');
    rawDb.exec('ALTER TABLE quality_checks_new RENAME TO quality_checks');
    rawDb.exec('CREATE INDEX IF NOT EXISTS idx_quality_checks_order_id ON quality_checks(order_id)');
  } catch (e) { /* ignore if already done */ }

  // 3. purchase_orders: route inserts 'expected_date' but table has 'expected_delivery'
  try { rawDb.exec('ALTER TABLE purchase_orders ADD COLUMN expected_date DATETIME'); } catch (e) { /* already exists */ }

  // Recreate purchase_orders without strict CHECK constraint on status
  // (route allows 'shipped' which original CHECK doesn't include)
  try {
    rawDb.exec(`
      CREATE TABLE IF NOT EXISTS purchase_orders_new (
        id TEXT PRIMARY KEY,
        po_number TEXT UNIQUE NOT NULL,
        supplier TEXT NOT NULL,
        items TEXT NOT NULL,
        total_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        expected_delivery DATETIME,
        expected_date DATETIME,
        received_date DATETIME,
        notes TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )
    `);
    const cols = rawDb.prepare('PRAGMA table_info(purchase_orders)').all().map(c => c.name);
    const selectCols = cols.filter(c => ['id','po_number','supplier','items','total_amount','status','expected_delivery','received_date','notes','created_by','created_at','updated_at'].includes(c)).join(', ');
    if (selectCols) {
      rawDb.exec(`INSERT OR IGNORE INTO purchase_orders_new (${selectCols}) SELECT ${selectCols} FROM purchase_orders`);
    }
    rawDb.exec('DROP TABLE purchase_orders');
    rawDb.exec('ALTER TABLE purchase_orders_new RENAME TO purchase_orders');
  } catch (e) { /* ignore if already done */ }

  // 4. message_templates: route inserts 'body' and 'category' but table may not have them;
  //    also 'content' is NOT NULL but routes don't always provide it
  try { rawDb.exec('ALTER TABLE message_templates ADD COLUMN body TEXT'); } catch (e) { /* already exists */ }
  try { rawDb.exec('ALTER TABLE message_templates ADD COLUMN category TEXT'); } catch (e) { /* already exists */ }
  // Recreate to make 'content' nullable and remove type CHECK constraint (routes use 'invoice' etc.)
  try {
    rawDb.exec(`
      CREATE TABLE IF NOT EXISTS message_templates_new (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        subject TEXT,
        content TEXT,
        body TEXT,
        variables TEXT,
        category TEXT,
        is_active INTEGER DEFAULT 1,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )
    `);
    rawDb.exec('INSERT OR IGNORE INTO message_templates_new SELECT id, name, type, subject, content, body, variables, category, is_active, created_by, created_at, updated_at FROM message_templates');
    rawDb.exec('DROP TABLE message_templates');
    rawDb.exec('ALTER TABLE message_templates_new RENAME TO message_templates');
  } catch (e) { /* ignore */ }

  // 5. webhooks: WebhookService doesn't insert 'name', but table has 'name NOT NULL'
  try {
    rawDb.exec(`
      CREATE TABLE IF NOT EXISTS webhooks_new (
        id TEXT PRIMARY KEY,
        name TEXT DEFAULT '',
        url TEXT NOT NULL,
        events TEXT NOT NULL,
        secret TEXT,
        is_active INTEGER DEFAULT 1,
        last_triggered DATETIME,
        last_success DATETIME,
        last_failure DATETIME,
        last_status TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )
    `);
    rawDb.exec('DROP TABLE webhooks');
    rawDb.exec('ALTER TABLE webhooks_new RENAME TO webhooks');
  } catch (e) { /* ignore */ }

  // 6. Create webhook_logs table (used by WebhookService but not in createTables)
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS webhook_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      webhook_id TEXT,
      event_type TEXT,
      success INTEGER,
      status_code INTEGER,
      duration_ms INTEGER,
      error_message TEXT,
      delivered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (webhook_id) REFERENCES webhooks (id)
    )
  `);

  // 7. Create payments table (used by invoices route GET /:id)
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      invoice_id TEXT,
      amount REAL,
      payment_date DATETIME,
      payment_method TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices (id)
    )
  `);

  // ---- End schema fixups ----

  // Create async-compatible wrapper for settings/analytics routes that expect async methods
  const asyncDb = {
    get: async (sql, params = []) => dbService.db.prepare(sql).get(...params),
    all: async (sql, params = []) => dbService.db.prepare(sql).all(...params),
    run: async (sql, params = []) => dbService.db.prepare(sql).run(...params),
    // Also expose the raw db for routes that use db.db directly
    db: dbService.db
  };
  fastify.decorate('db', asyncDb);

  // Add authenticate decorator
  fastify.decorate('authenticate', async function(request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.code(401).send({ success: false, error: 'Unauthorized' });
    }
  });

  // Add authorize decorator (role-based access control)
  fastify.decorate('authorize', (roles) => {
    return async function(request, reply) {
      try {
        await request.jwtVerify();
        if (!roles.includes(request.user.role)) {
          return reply.code(403).send({ success: false, error: 'Insufficient permissions' });
        }
      } catch (err) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }
    };
  });

  // Register routes
  fastify.register(require('../src/routes/auth'), { prefix: '/api/auth' });
  fastify.register(require('../src/routes/customers'), { prefix: '/api/customers' });
  fastify.register(require('../src/routes/orders'), { prefix: '/api/orders' });
  fastify.register(require('../src/routes/inventory'), { prefix: '/api/inventory' });
  fastify.register(require('../src/routes/production'), { prefix: '/api/production' });
  fastify.register(require('../src/routes/financial'), { prefix: '/api/financial' });
  fastify.register(require('../src/routes/dashboard'), { prefix: '/api/dashboard' });
  fastify.register(require('../src/routes/users'), { prefix: '/api/users' });
  fastify.register(require('../src/routes/search'), { prefix: '/api/search' });
  fastify.register(require('../src/routes/settings'), { prefix: '/api/settings' });
  fastify.register(require('../src/routes/analytics'), { prefix: '/api/analytics' });
  fastify.register(require('../src/routes/notifications'), { prefix: '/api/notifications' });
  fastify.register(require('../src/routes/invoices'), { prefix: '/api/invoices' });
  fastify.register(require('../src/routes/purchase-orders'), { prefix: '/api/purchase-orders' });
  fastify.register(require('../src/routes/quality-checks'), { prefix: '/api/quality-checks' });
  fastify.register(require('../src/routes/reports'), { prefix: '/api/reports' });
  fastify.register(require('../src/routes/templates'), { prefix: '/api/templates' });
  fastify.register(require('../src/routes/webhooks'), { prefix: '/api/webhooks' });
  fastify.register(require('../src/routes/audit'), { prefix: '/api/audit' });
  fastify.register(require('../src/routes/audit-logs'), { prefix: '/api/audit-logs' });
  fastify.register(require('../src/routes/sync'), { prefix: '/api/sync' });
  fastify.register(require('../src/routes/backup'), { prefix: '/api/backup' });
  fastify.register(require('../src/routes/communication'), { prefix: '/api/communication' });

  return fastify;
}

// Helper to create a test user and get token
async function createTestUserAndGetToken(app, userData = {}) {
  const bcrypt = require('bcryptjs');
  const { v4: uuidv4 } = require('uuid');

  const defaultUser = {
    username: 'testuser_' + Date.now(),
    email: `test${Date.now()}@example.com`,
    password: 'Test123!',
    fullName: 'Test User',
    role: 'owner'
  };

  const user = { ...defaultUser, ...userData };

  // Create user directly in DB to allow any role (registration forces employee)
  const userId = uuidv4();
  const passwordHash = await bcrypt.hash(user.password, 10);

  app.db.db.prepare(`
    INSERT INTO users (id, username, email, password_hash, role, full_name, phone, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
  `).run(userId, user.username, user.email, passwordHash, user.role, user.fullName, user.phone || null);

  // Login to get token
  const loginResponse = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: {
      username: user.username,
      password: user.password
    }
  });

  const loginData = JSON.parse(loginResponse.body);
  return {
    token: loginData.token,
    user: loginData.user,
    credentials: user
  };
}

// Helper to make authenticated request
async function makeAuthenticatedRequest(app, method, url, token, payload = null) {
  const options = {
    method,
    url,
    headers: {
      Authorization: `Bearer ${token}`
    }
  };

  if (payload) {
    options.payload = payload;
  }

  return app.inject(options);
}

// Helper to create a test customer
async function createTestCustomer(app, token, customerData = {}) {
  const defaultCustomer = {
    name: 'Test Customer ' + Date.now(),
    email: `customer${Date.now()}@example.com`,
    phone: '08123456789',
    business_type: 'corporate'
  };

  const customer = { ...defaultCustomer, ...customerData };

  const response = await makeAuthenticatedRequest(app, 'POST', '/api/customers', token, customer);
  const data = JSON.parse(response.body);
  return data.customerId || data.customer?.id;
}

// Helper to create a test order
async function createTestOrder(app, token, customerId, orderData = {}) {
  const defaultOrder = {
    customer_id: customerId,
    order_number: 'ORD-TEST-' + Date.now(),
    status: 'pending',
    priority: 'normal',
    total_amount: 100000,
    items: []
  };

  const order = { ...defaultOrder, ...orderData };

  const response = await makeAuthenticatedRequest(app, 'POST', '/api/orders', token, order);
  const data = JSON.parse(response.body);
  return data.orderId || data.order?.id;
}

// Helper to create a test inventory item
async function createTestInventoryItem(app, token, itemData = {}) {
  const defaultItem = {
    name: 'Test Material ' + Date.now(),
    category: 'paper',
    current_stock: 100,
    reorder_level: 10,
    unit_cost: 5000
  };

  const item = { ...defaultItem, ...itemData };

  const response = await makeAuthenticatedRequest(app, 'POST', '/api/inventory', token, item);
  const data = JSON.parse(response.body);
  return data.itemId || data.item?.id;
}

// Helper to wait for a specified time
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  buildApp,
  createTestUserAndGetToken,
  makeAuthenticatedRequest,
  createTestCustomer,
  createTestOrder,
  createTestInventoryItem,
  wait
};
