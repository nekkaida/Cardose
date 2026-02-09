// Audit API Tests
const { buildApp, createTestUserAndGetToken, makeAuthenticatedRequest } = require('./helpers');

describe('Audit API', () => {
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
  describe('GET /api/audit/logs', () => {
    test('should list audit logs', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/audit/logs', authToken);

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
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/audit/logs?page=1&limit=5', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.page).toBe(1);
      expect(data.limit).toBe(5);
      expect(data.logs.length).toBeLessThanOrEqual(5);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit/logs'
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== GET AUDIT STATS TESTS ====================
  describe('GET /api/audit/stats', () => {
    test('should get audit stats', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/audit/stats', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.stats).toBeDefined();
      expect(data.stats.total).toBeDefined();
      expect(data.stats.recentActivity).toBeDefined();
      expect(data.stats.byAction).toBeDefined();
      expect(data.stats.byEntityType).toBeDefined();
      expect(data.stats.byUser).toBeDefined();
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit/stats'
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
