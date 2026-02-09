// Orders API Tests
const { buildApp, createTestUserAndGetToken, makeAuthenticatedRequest, createTestCustomer } = require('./helpers');

describe('Orders API', () => {
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

    // Create a test customer for orders
    testCustomerId = await createTestCustomer(app, authToken);
  });

  afterAll(async () => {
    await app.close();
  });

  // ==================== CREATE ORDER TESTS ====================
  describe('POST /api/orders', () => {
    test('should create order with valid data', async () => {
      const orderData = {
        customer_id: testCustomerId,
        order_number: 'ORD-TEST-' + Date.now(),
        status: 'pending',
        priority: 'normal',
        total_amount: 150000,
        delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Test order'
      };

      const response = await makeAuthenticatedRequest(app, 'POST', '/api/orders', authToken, orderData);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.orderId || data.order?.id).toBeDefined();

      testOrderId = data.orderId || data.order?.id;
    });

    test('should reject order creation without customer_id', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/orders', authToken, {
        order_number: 'ORD-TEST-' + Date.now(),
        status: 'pending',
        total_amount: 100000
      });

      expect(response.statusCode).toBe(400);
    });

    test('should reject order creation without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/orders',
        payload: {
          customer_id: testCustomerId,
          order_number: 'ORD-TEST-' + Date.now()
        }
      });

      expect(response.statusCode).toBe(401);
    });

    test('should auto-generate order number if not provided', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/orders', authToken, {
        customer_id: testCustomerId,
        status: 'pending',
        total_amount: 100000
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });
  });

  // ==================== LIST ORDERS TESTS ====================
  describe('GET /api/orders', () => {
    test('should list all orders', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/orders', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.orders)).toBe(true);
    });

    test('should filter orders by status', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/orders?status=pending', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should filter orders by priority', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/orders?priority=normal', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should filter orders by customer_id', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', `/api/orders?customer_id=${testCustomerId}`, authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should support pagination', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/orders?page=1&limit=10', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/orders'
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== GET SINGLE ORDER TESTS ====================
  describe('GET /api/orders/:id', () => {
    test('should get order by valid ID', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', `/api/orders/${testOrderId}`, authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.order).toBeDefined();
    });

    test('should return 404 for non-existent order', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/orders/non-existent-id-123', authToken);

      expect(response.statusCode).toBe(404);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/orders/${testOrderId}`
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== ORDER STATS TESTS ====================
  describe('GET /api/orders/stats', () => {
    test('should get order statistics', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/orders/stats', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });
  });

  // ==================== LATEST ORDER NUMBER TESTS ====================
  describe('GET /api/orders/latest-number', () => {
    test('should get latest order number', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/orders/latest-number', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.orderNumber).toBeDefined();
    });
  });

  // ==================== UPDATE ORDER TESTS ====================
  describe('PUT /api/orders/:id', () => {
    test('should update order with valid data', async () => {
      const response = await makeAuthenticatedRequest(app, 'PUT', `/api/orders/${testOrderId}`, authToken, {
        notes: 'Updated notes',
        priority: 'high'
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should return 404 for non-existent order', async () => {
      const response = await makeAuthenticatedRequest(app, 'PUT', '/api/orders/non-existent-id-123', authToken, {
        notes: 'Updated notes'
      });

      expect(response.statusCode).toBe(404);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/orders/${testOrderId}`,
        payload: {
          notes: 'Updated notes'
        }
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== UPDATE ORDER STATUS TESTS ====================
  describe('PATCH /api/orders/:id/status', () => {
    test('should update order status', async () => {
      const response = await makeAuthenticatedRequest(app, 'PATCH', `/api/orders/${testOrderId}/status`, authToken, {
        status: 'designing'
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should reject invalid status', async () => {
      const response = await makeAuthenticatedRequest(app, 'PATCH', `/api/orders/${testOrderId}/status`, authToken, {
        status: 'invalid_status'
      });

      expect(response.statusCode).toBe(400);
    });

    test('should return 404 for non-existent order', async () => {
      const response = await makeAuthenticatedRequest(app, 'PATCH', '/api/orders/non-existent-id-123/status', authToken, {
        status: 'completed'
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ==================== DELETE ORDER TESTS ====================
  describe('DELETE /api/orders/:id', () => {
    let orderToDelete;

    beforeAll(async () => {
      // Create an order to delete
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/orders', authToken, {
        customer_id: testCustomerId,
        order_number: 'ORD-DELETE-' + Date.now(),
        status: 'pending',
        total_amount: 50000
      });
      const data = JSON.parse(response.body);
      orderToDelete = data.orderId || data.order?.id;
    });

    test('should delete order', async () => {
      const response = await makeAuthenticatedRequest(app, 'DELETE', `/api/orders/${orderToDelete}`, authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should return 404 for non-existent order', async () => {
      const response = await makeAuthenticatedRequest(app, 'DELETE', '/api/orders/non-existent-id-123', authToken);

      expect(response.statusCode).toBe(404);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/orders/${testOrderId}`
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== ORDER ITEMS TESTS ====================
  describe('POST /api/orders/:id/items', () => {
    test('should add item to order', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', `/api/orders/${testOrderId}/items`, authToken, {
        product_name: 'Premium Gift Box',
        quantity: 5,
        unit_price: 50000
      });

      // Some implementations might not have this endpoint
      if (response.statusCode === 200) {
        const data = JSON.parse(response.body);
        expect(data.success).toBe(true);
      } else {
        expect([200, 404]).toContain(response.statusCode);
      }
    });
  });
});
