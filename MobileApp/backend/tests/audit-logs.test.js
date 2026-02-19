// Audit Logs API Tests
const { buildApp, createTestUserAndGetToken, makeAuthenticatedRequest } = require('./helpers');

describe('Audit Logs API', () => {
  let app;
  let authToken;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    const { token } = await createTestUserAndGetToken(app);
    authToken = token;
  });

  afterAll(async () => {
    await app.close();
  });

  // ==================== GET AUDIT LOGS TESTS ====================
  describe('GET /api/audit-logs', () => {
    test('should list audit logs', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/audit-logs', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.logs).toBeDefined();
      expect(Array.isArray(data.logs)).toBe(true);
      expect(data.total).toBeDefined();
      expect(data.page).toBeDefined();
      expect(data.limit).toBeDefined();
      expect(data.totalPages).toBeDefined();
    });

    test('should support pagination', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/audit-logs?page=1&limit=5',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.page).toBe(1);
      expect(data.limit).toBe(5);
      expect(data.logs.length).toBeLessThanOrEqual(5);
    });

    test('should filter by action', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/audit-logs?action=login',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.logs)).toBe(true);
      // All returned logs should have the filtered action
      data.logs.forEach((log) => {
        expect(log.action).toBe('login');
      });
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit-logs',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
