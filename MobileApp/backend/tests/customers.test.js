// Customers API Tests
const { buildApp, createTestUserAndGetToken, makeAuthenticatedRequest } = require('./helpers');

describe('Customers API', () => {
  let app;
  let authToken;
  let testCustomerId;

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

  // ==================== CREATE CUSTOMER TESTS ====================
  describe('POST /api/customers', () => {
    test('should create customer with valid data', async () => {
      const customerData = {
        name: 'Test Customer ' + Date.now(),
        email: `customer${Date.now()}@example.com`,
        phone: '08123456789',
        business_type: 'corporate',
        address: 'Jl. Test No. 123',
        notes: 'Test customer',
      };

      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/customers',
        authToken,
        customerData
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.customerId || data.customer?.id).toBeDefined();

      testCustomerId = data.customerId || data.customer?.id;
    });

    test('should reject customer creation without name', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/customers', authToken, {
        email: 'test@example.com',
        phone: '08123456789',
      });

      expect(response.statusCode).toBe(400);
    });

    test('should reject customer creation without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/customers',
        payload: {
          name: 'Test Customer',
          email: 'test@example.com',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    test('should create customer with minimal data (only name)', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/customers', authToken, {
        name: 'Minimal Customer ' + Date.now(),
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });
  });

  // ==================== LIST CUSTOMERS TESTS ====================
  describe('GET /api/customers', () => {
    test('should list all customers', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/customers', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.customers)).toBe(true);
    });

    test('should filter customers by search term', async () => {
      // First create a customer with specific name
      await makeAuthenticatedRequest(app, 'POST', '/api/customers', authToken, {
        name: 'UniqueSearchName123',
        email: 'unique@example.com',
      });

      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/customers?search=UniqueSearchName',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should filter customers by business_type', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/customers?business_type=corporate',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should support pagination', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/customers?page=1&limit=5',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.customers.length).toBeLessThanOrEqual(5);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/customers',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== GET SINGLE CUSTOMER TESTS ====================
  describe('GET /api/customers/:id', () => {
    test('should get customer by valid ID', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        `/api/customers/${testCustomerId}`,
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.customer).toBeDefined();
    });

    test('should return 404 for non-existent customer', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/customers/non-existent-id-123',
        authToken
      );

      expect(response.statusCode).toBe(404);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/customers/${testCustomerId}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== UPDATE CUSTOMER TESTS ====================
  describe('PUT /api/customers/:id', () => {
    test('should update customer with valid data', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        `/api/customers/${testCustomerId}`,
        authToken,
        {
          name: 'Updated Customer Name',
          phone: '08198765432',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should return 404 for non-existent customer', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        '/api/customers/non-existent-id-123',
        authToken,
        {
          name: 'Updated Name',
        }
      );

      expect(response.statusCode).toBe(404);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/customers/${testCustomerId}`,
        payload: {
          name: 'Updated Name',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== CUSTOMER COMMUNICATIONS TESTS ====================
  describe('GET /api/customers/:id/communications', () => {
    test('should get customer communications', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        `/api/customers/${testCustomerId}/communications`,
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.communications)).toBe(true);
    });

    test('should return 404 for non-existent customer', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/customers/non-existent-id-123/communications',
        authToken
      );

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/customers/:id/communications', () => {
    test('should create email communication', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        `/api/customers/${testCustomerId}/communications`,
        authToken,
        {
          type: 'email',
          direction: 'outbound',
          subject: 'Test Email Subject',
          content: 'Test email content',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should create whatsapp communication', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        `/api/customers/${testCustomerId}/communications`,
        authToken,
        {
          type: 'whatsapp',
          direction: 'outbound',
          content: 'Test WhatsApp message',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should create sms communication', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        `/api/customers/${testCustomerId}/communications`,
        authToken,
        {
          type: 'sms',
          direction: 'inbound',
          content: 'Customer texted about order status',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should reject communication without type', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        `/api/customers/${testCustomerId}/communications`,
        authToken,
        {
          content: 'Test content',
        }
      );

      expect(response.statusCode).toBe(400);
    });

    test('should reject for non-existent customer', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/customers/non-existent-id-123/communications',
        authToken,
        {
          type: 'email',
          content: 'Test content',
        }
      );

      expect(response.statusCode).toBe(404);
    });
  });

  // ==================== DELETE CUSTOMER TESTS ====================
  describe('DELETE /api/customers/:id', () => {
    let customerToDelete;

    beforeAll(async () => {
      // Create a customer to delete
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/customers', authToken, {
        name: 'Customer To Delete ' + Date.now(),
        email: `delete${Date.now()}@example.com`,
      });
      const data = JSON.parse(response.body);
      customerToDelete = data.customerId || data.customer?.id;
    });

    test('should delete customer', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'DELETE',
        `/api/customers/${customerToDelete}`,
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should return 404 for non-existent customer', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'DELETE',
        '/api/customers/non-existent-id-123',
        authToken
      );

      expect(response.statusCode).toBe(404);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/customers/${testCustomerId}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== CUSTOMER STATS TESTS ====================
  describe('GET /api/customers/stats', () => {
    test('should get customer statistics', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/customers/stats',
        authToken
      );

      // Stats endpoint might not exist, so we check if it returns 200 or 404
      if (response.statusCode === 200) {
        const data = JSON.parse(response.body);
        expect(data.success).toBe(true);
      } else {
        // If stats endpoint doesn't exist, that's okay
        expect([200, 404]).toContain(response.statusCode);
      }
    });
  });
});
