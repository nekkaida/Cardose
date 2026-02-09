// Dashboard API Tests
const { buildApp, createTestUserAndGetToken, makeAuthenticatedRequest, createTestCustomer, createTestOrder } = require('./helpers');

describe('Dashboard API', () => {
  let app;
  let authToken;
  let testCustomerId;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create a test user and get token
    const { token } = await createTestUserAndGetToken(app);
    authToken = token;

    // Create a test customer for data
    testCustomerId = await createTestCustomer(app, authToken);

    // Create some orders for dashboard data
    await createTestOrder(app, authToken, testCustomerId);
    await createTestOrder(app, authToken, testCustomerId);
  });

  afterAll(async () => {
    await app.close();
  });

  // ==================== DASHBOARD STATS TESTS ====================
  describe('GET /api/dashboard/stats', () => {
    test('should get dashboard stats', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/dashboard/stats', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.stats).toBeDefined();
      expect(data.stats.orders).toBeDefined();
      expect(data.stats.customers).toBeDefined();
      expect(data.stats.invoices).toBeDefined();
      expect(data.stats.inventory).toBeDefined();
      expect(data.stats.tasks).toBeDefined();
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboard/stats'
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== RECENT ORDERS TESTS ====================
  describe('GET /api/dashboard/recent-orders', () => {
    test('should get recent orders', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/dashboard/recent-orders', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.orders)).toBe(true);
    });

    test('should limit results', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/dashboard/recent-orders?limit=5', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.orders.length).toBeLessThanOrEqual(5);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboard/recent-orders'
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== DASHBOARD OVERVIEW TESTS ====================
  describe('GET /api/dashboard/overview', () => {
    test('should get dashboard overview', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/dashboard/overview', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.overview).toBeDefined();
      expect(data.overview.revenue).toBeDefined();
      expect(data.overview.orders).toBeDefined();
      expect(data.overview.customers).toBeDefined();
      expect(data.overview.alerts).toBeDefined();
      expect(data.overview.today).toBeDefined();
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboard/overview'
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== SALES TREND TESTS ====================
  describe('GET /api/dashboard/sales-trend', () => {
    test('should get sales trend (default 30 days)', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/dashboard/sales-trend', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.trend)).toBe(true);
    });

    test('should get sales trend for 7 days', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/dashboard/sales-trend?days=7', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.trend.length).toBe(7);
    });

    test('should get sales trend for 14 days', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/dashboard/sales-trend?days=14', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.trend.length).toBe(14);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboard/sales-trend'
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== PRODUCT MIX TESTS ====================
  describe('GET /api/dashboard/product-mix', () => {
    test('should get product mix', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/dashboard/product-mix', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.productMix)).toBe(true);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboard/product-mix'
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== TOP CUSTOMERS TESTS ====================
  describe('GET /api/dashboard/top-customers', () => {
    test('should get top customers', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/dashboard/top-customers', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.customers)).toBe(true);
    });

    test('should limit results', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/dashboard/top-customers?limit=5', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.customers.length).toBeLessThanOrEqual(5);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboard/top-customers'
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
