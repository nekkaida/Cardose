// Quality Checks API Tests
const {
  buildApp,
  createTestUserAndGetToken,
  makeAuthenticatedRequest,
  createTestCustomer,
  createTestOrder,
} = require('./helpers');

describe('Quality Checks API', () => {
  let app;
  let authToken;
  let testCustomerId;
  let testOrderId;
  let testCheckId;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create a test user and get token
    const { token } = await createTestUserAndGetToken(app);
    authToken = token;

    // Create a test customer
    testCustomerId = await createTestCustomer(app, authToken);

    // Create a test order
    testOrderId = await createTestOrder(app, authToken, testCustomerId);
  });

  afterAll(async () => {
    await app.close();
  });

  // ==================== CREATE QUALITY CHECK TESTS ====================
  describe('POST /api/quality-checks', () => {
    test('should create quality check with valid data', async () => {
      const checkData = {
        order_id: testOrderId,
        checklist_items: [{ name: 'Visual inspection', status: 'pending' }],
        overall_status: 'pending',
        notes: 'Test check',
      };

      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/quality-checks',
        authToken,
        checkData
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.checkId).toBeDefined();

      testCheckId = data.checkId;
    });

    test('should reject quality check creation without order_id', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/quality-checks',
        authToken,
        {
          checklist_items: [{ name: 'Visual inspection', status: 'pending' }],
          overall_status: 'pending',
          notes: 'Test check',
        }
      );

      expect(response.statusCode).toBe(400);
    });

    test('should reject quality check creation without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/quality-checks',
        payload: {
          order_id: testOrderId,
          checklist_items: [{ name: 'Visual inspection', status: 'pending' }],
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== LIST QUALITY CHECKS TESTS ====================
  describe('GET /api/quality-checks', () => {
    test('should list all quality checks', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/quality-checks', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.checks)).toBe(true);
    });

    test('should filter quality checks by order_id', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        `/api/quality-checks?order_id=${testOrderId}`,
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
        '/api/quality-checks?page=1&limit=5',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/quality-checks',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== GET SINGLE QUALITY CHECK TESTS ====================
  describe('GET /api/quality-checks/:id', () => {
    test('should get quality check by valid ID', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        `/api/quality-checks/${testCheckId}`,
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.check).toBeDefined();
    });

    test('should return 404 for non-existent quality check', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/quality-checks/non-existent-id-123',
        authToken
      );

      expect(response.statusCode).toBe(404);
    });
  });

  // ==================== UPDATE QUALITY CHECK TESTS ====================
  describe('PUT /api/quality-checks/:id', () => {
    test('should update quality check with valid data', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        `/api/quality-checks/${testCheckId}`,
        authToken,
        {
          overall_status: 'passed',
          notes: 'Updated - all checks passed',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should return 404 for non-existent quality check', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        '/api/quality-checks/non-existent-id-123',
        authToken,
        {
          overall_status: 'passed',
          notes: 'Updated',
        }
      );

      expect(response.statusCode).toBe(404);
    });
  });
});
