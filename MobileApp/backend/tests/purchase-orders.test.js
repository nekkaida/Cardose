// Purchase Orders API Tests
const { buildApp, createTestUserAndGetToken, makeAuthenticatedRequest } = require('./helpers');

describe('Purchase Orders API', () => {
  let app;
  let authToken;
  let testPurchaseOrderId;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create a test user and get token
    const { token } = await createTestUserAndGetToken(app);
    authToken = token;
  });

  afterAll(async () => {
    await app.close();
  });

  // ==================== CREATE PURCHASE ORDER TESTS ====================
  describe('POST /api/purchase-orders', () => {
    test('should create purchase order with valid data', async () => {
      const poData = {
        supplier: 'Test Supplier',
        items: [{ name: 'Paper', qty: 100 }],
        total_amount: 500000,
        expected_date: '2026-03-01'
      };

      const response = await makeAuthenticatedRequest(app, 'POST', '/api/purchase-orders', authToken, poData);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.purchaseOrderId).toBeDefined();

      testPurchaseOrderId = data.purchaseOrderId;
    });

    test('should reject purchase order creation without supplier', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/purchase-orders', authToken, {
        items: [{ name: 'Paper', qty: 100 }],
        total_amount: 500000
      });

      expect(response.statusCode).toBe(400);
    });

    test('should reject purchase order creation without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/purchase-orders',
        payload: {
          supplier: 'Test Supplier',
          items: [{ name: 'Paper', qty: 100 }]
        }
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== LIST PURCHASE ORDERS TESTS ====================
  describe('GET /api/purchase-orders', () => {
    test('should list all purchase orders', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/purchase-orders', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.purchaseOrders) || Array.isArray(data.orders)).toBe(true);
    });

    test('should filter purchase orders by status', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/purchase-orders?status=pending', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should support pagination', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/purchase-orders?page=1&limit=5', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/purchase-orders'
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== GET SINGLE PURCHASE ORDER TESTS ====================
  describe('GET /api/purchase-orders/:id', () => {
    test('should get purchase order by valid ID', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', `/api/purchase-orders/${testPurchaseOrderId}`, authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.purchaseOrder).toBeDefined();
    });

    test('should return 404 for non-existent purchase order', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/purchase-orders/non-existent-id-123', authToken);

      expect(response.statusCode).toBe(404);
    });
  });

  // ==================== UPDATE PURCHASE ORDER STATUS TESTS ====================
  describe('PATCH /api/purchase-orders/:id/status', () => {
    test('should update purchase order status to ordered', async () => {
      const response = await makeAuthenticatedRequest(app, 'PATCH', `/api/purchase-orders/${testPurchaseOrderId}/status`, authToken, {
        status: 'ordered'
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should reject invalid status', async () => {
      const response = await makeAuthenticatedRequest(app, 'PATCH', `/api/purchase-orders/${testPurchaseOrderId}/status`, authToken, {
        status: 'invalid_status'
      });

      expect(response.statusCode).toBe(400);
    });

    test('should return 404 for non-existent purchase order', async () => {
      const response = await makeAuthenticatedRequest(app, 'PATCH', '/api/purchase-orders/non-existent-id-123/status', authToken, {
        status: 'ordered'
      });

      expect(response.statusCode).toBe(404);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/purchase-orders/${testPurchaseOrderId}/status`,
        payload: {
          status: 'ordered'
        }
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
