// Invoices API Tests
const { buildApp, createTestUserAndGetToken, makeAuthenticatedRequest, createTestCustomer } = require('./helpers');

describe('Invoices API', () => {
  let app;
  let authToken;
  let testCustomerId;
  let testInvoiceId;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create a test user and get token
    const { token } = await createTestUserAndGetToken(app);
    authToken = token;

    // Create a test customer
    testCustomerId = await createTestCustomer(app, authToken);
  });

  afterAll(async () => {
    await app.close();
  });

  // ==================== CREATE INVOICE TESTS ====================
  describe('POST /api/invoices', () => {
    test('should create invoice with valid data', async () => {
      const invoiceData = {
        customer_id: testCustomerId,
        subtotal: 100000,
        due_date: '2026-03-01'
      };

      const response = await makeAuthenticatedRequest(app, 'POST', '/api/invoices', authToken, invoiceData);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.invoiceId).toBeDefined();

      testInvoiceId = data.invoiceId;
    });

    test('should reject invoice creation without customer_id', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/invoices', authToken, {
        subtotal: 100000,
        due_date: '2026-03-01'
      });

      expect(response.statusCode).toBe(400);
    });

    test('should reject invoice creation without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/invoices',
        payload: {
          customer_id: testCustomerId,
          subtotal: 100000
        }
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== LIST INVOICES TESTS ====================
  describe('GET /api/invoices', () => {
    test('should list all invoices', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/invoices', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.invoices)).toBe(true);
    });

    test('should filter invoices by status', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/invoices?status=draft', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should support pagination', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/invoices?page=1&limit=5', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/invoices'
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== GET SINGLE INVOICE TESTS ====================
  describe('GET /api/invoices/:id', () => {
    test('should get invoice by valid ID', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', `/api/invoices/${testInvoiceId}`, authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.invoice).toBeDefined();
    });

    test('should return 404 for non-existent invoice', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/invoices/non-existent-id-123', authToken);

      expect(response.statusCode).toBe(404);
    });
  });

  // ==================== UPDATE INVOICE STATUS TESTS ====================
  describe('PATCH /api/invoices/:id/status', () => {
    test('should update invoice status to paid', async () => {
      const response = await makeAuthenticatedRequest(app, 'PATCH', `/api/invoices/${testInvoiceId}/status`, authToken, {
        status: 'paid',
        paid_date: '2026-02-10'
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should reject invalid status', async () => {
      const response = await makeAuthenticatedRequest(app, 'PATCH', `/api/invoices/${testInvoiceId}/status`, authToken, {
        status: 'invalid_status'
      });

      expect(response.statusCode).toBe(400);
    });

    test('should return 404 for non-existent invoice', async () => {
      const response = await makeAuthenticatedRequest(app, 'PATCH', '/api/invoices/non-existent-id-123/status', authToken, {
        status: 'paid'
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
