// Search API Tests
const { buildApp, createTestUserAndGetToken, makeAuthenticatedRequest, createTestCustomer, createTestOrder, createTestInventoryItem } = require('./helpers');

describe('Search API', () => {
  let app;
  let authToken;
  let testCustomerId;
  let testOrderId;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create a test user and get token
    const { token } = await createTestUserAndGetToken(app);
    authToken = token;

    // Create test data for search
    testCustomerId = await createTestCustomer(app, authToken, { name: 'SearchableCustomer' });
    testOrderId = await createTestOrder(app, authToken, testCustomerId);
    await createTestInventoryItem(app, authToken, { name: 'SearchableMaterial' });
  });

  afterAll(async () => {
    await app.close();
  });

  // ==================== GLOBAL SEARCH TESTS ====================
  describe('GET /api/search', () => {
    test('should return empty results for empty query', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/search', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.total).toBe(0);
    });

    test('should search across all types', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/search?q=Searchable', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.results).toBeDefined();
      expect(data.results.customers).toBeDefined();
      expect(data.results.orders).toBeDefined();
      expect(data.results.invoices).toBeDefined();
      expect(data.results.inventory).toBeDefined();
    });

    test('should search with query parameter', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/search?query=test', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should filter by type (customers only)', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/search?q=Searchable&type=customers', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.results.customers).toBeDefined();
      // Other types should not be searched
      expect(data.results.orders).toBeUndefined();
    });

    test('should filter by type (orders only)', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/search?q=ORD&type=orders', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.results.orders).toBeDefined();
    });

    test('should filter by type (inventory only)', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/search?q=Material&type=inventory', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.results.inventory).toBeDefined();
    });

    test('should limit results', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/search?q=test&limit=5', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/search?q=test'
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== ADVANCED ORDER SEARCH TESTS ====================
  describe('POST /api/search/orders', () => {
    test('should search orders with no filters', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/search/orders', authToken, {});

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.orders)).toBe(true);
    });

    test('should filter by customer_id', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/search/orders', authToken, {
        customer_id: testCustomerId
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should filter by status', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/search/orders', authToken, {
        status: 'pending'
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should filter by priority', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/search/orders', authToken, {
        priority: 'normal'
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should filter by date range', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/search/orders', authToken, {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should filter by amount range', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/search/orders', authToken, {
        minAmount: 10000,
        maxAmount: 1000000
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should combine multiple filters', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/search/orders', authToken, {
        status: 'pending',
        priority: 'normal',
        minAmount: 1000
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should limit results', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/search/orders', authToken, {
        limit: 5
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.orders.length).toBeLessThanOrEqual(5);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/search/orders',
        payload: {}
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== CUSTOMER SEARCH TESTS ====================
  describe('GET /api/search/customers', () => {
    test('should search customers', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/search/customers', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.customers)).toBe(true);
    });

    test('should search by query', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/search/customers?q=Searchable', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should filter by business_type', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/search/customers?business_type=corporate', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should filter by loyalty_status', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/search/customers?loyalty_status=new', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should combine query and filters', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/search/customers?q=test&business_type=corporate', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should limit results', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/search/customers?limit=5', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.customers.length).toBeLessThanOrEqual(5);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/search/customers'
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
