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
