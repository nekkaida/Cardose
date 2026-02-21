// Reports API Tests
const { buildApp, createTestUserAndGetToken, makeAuthenticatedRequest } = require('./helpers');

describe('Reports API', () => {
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

  // ==================== SALES REPORT TESTS ====================
  describe('GET /api/reports/sales', () => {
    test('should get sales report with default date range', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/reports/sales', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.report).toBeDefined();
      expect(data.report.period).toBeDefined();
      expect(data.report.period.start).toBeDefined();
      expect(data.report.period.end).toBeDefined();
      expect(data.report.sales).toBeDefined();
      expect(Array.isArray(data.report.sales)).toBe(true);
      expect(data.report.summary).toBeDefined();
      expect(data.report.topCustomers).toBeDefined();
      expect(Array.isArray(data.report.topCustomers)).toBe(true);
    });

    test('should get sales report with custom date params', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/reports/sales?startDate=2026-01-01&endDate=2026-12-31',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.report).toBeDefined();
      expect(data.report.period.start).toBe('2026-01-01');
      expect(data.report.period.end).toBe('2026-12-31');
    });

    test('should include summary statistics in sales report', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/reports/sales?startDate=2026-01-01&endDate=2026-12-31',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.report.summary).toHaveProperty('totalInvoices');
      expect(data.report.summary).toHaveProperty('totalRevenue');
      expect(data.report.summary).toHaveProperty('totalTax');
      expect(data.report.summary).toHaveProperty('averageInvoice');
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/reports/sales',
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    test('should return 400 for invalid startDate', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/reports/sales?startDate=not-a-date',
        authToken
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toContain('startDate');
    });

    test('should return 400 for invalid endDate', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/reports/sales?endDate=2026-02-30',
        authToken
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toContain('endDate');
    });

    test('should return 400 when startDate is after endDate', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/reports/sales?startDate=2026-12-31&endDate=2026-01-01',
        authToken
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toContain('startDate');
    });

    test('should return 200 when only one date param is provided', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/reports/sales?startDate=2026-01-01',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });
  });

  // ==================== INVENTORY REPORT TESTS ====================
  describe('GET /api/reports/inventory', () => {
    test('should get inventory report', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/reports/inventory',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.report).toBeDefined();
      expect(data.report.summary).toBeDefined();
      expect(data.report.byCategory).toBeDefined();
      expect(data.report.lowStockItems).toBeDefined();
      expect(data.report.recentMovements).toBeDefined();
    });

    test('should include inventory summary statistics', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/reports/inventory',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.report.summary).toHaveProperty('totalItems');
      expect(data.report.summary).toHaveProperty('outOfStock');
      expect(data.report.summary).toHaveProperty('lowStock');
      expect(data.report.summary).toHaveProperty('totalValue');
    });

    test('should return arrays for byCategory and lowStockItems', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/reports/inventory',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(Array.isArray(data.report.byCategory)).toBe(true);
      expect(Array.isArray(data.report.lowStockItems)).toBe(true);
      expect(Array.isArray(data.report.recentMovements)).toBe(true);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/reports/inventory',
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });
  });

  // ==================== PRODUCTION REPORT TESTS ====================
  describe('GET /api/reports/production', () => {
    test('should get production report with default date range', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/reports/production',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.report).toBeDefined();
      expect(data.report.period).toBeDefined();
      expect(data.report.period.start).toBeDefined();
      expect(data.report.period.end).toBeDefined();
      expect(data.report.ordersByStatus).toBeDefined();
      expect(data.report.taskStats).toBeDefined();
      expect(data.report.qualityStats).toBeDefined();
    });

    test('should include completion rate in production report', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/reports/production',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.report).toHaveProperty('completionRate');
    });

    test('should return arrays for ordersByStatus and taskStats', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/reports/production',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(Array.isArray(data.report.ordersByStatus)).toBe(true);
      expect(Array.isArray(data.report.taskStats)).toBe(true);
      expect(Array.isArray(data.report.qualityStats)).toBe(true);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/reports/production',
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    test('should return 400 for invalid date params', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/reports/production?startDate=bad',
        authToken
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
    });
  });

  // ==================== CUSTOMER REPORT TESTS ====================
  describe('GET /api/reports/customers', () => {
    test('should get customer report', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/reports/customers',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.report).toBeDefined();
      expect(data.report.summary).toBeDefined();
      expect(data.report.byBusinessType).toBeDefined();
      expect(data.report.byLoyaltyStatus).toBeDefined();
      expect(data.report.topCustomers).toBeDefined();
    });

    test('should include customer summary statistics', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/reports/customers',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.report.summary).toHaveProperty('totalCustomers');
      expect(data.report.summary).toHaveProperty('vipCustomers');
      expect(data.report.summary).toHaveProperty('totalRevenue');
      expect(data.report.summary).toHaveProperty('averageSpent');
      expect(data.report.summary).toHaveProperty('newThisMonth');
    });

    test('should return arrays for byBusinessType and topCustomers', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/reports/customers',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(Array.isArray(data.report.byBusinessType)).toBe(true);
      expect(Array.isArray(data.report.byLoyaltyStatus)).toBe(true);
      expect(Array.isArray(data.report.topCustomers)).toBe(true);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/reports/customers',
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });
  });

  // ==================== FINANCIAL REPORT TESTS ====================
  describe('GET /api/reports/financial', () => {
    test('should get financial report with default date range', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/reports/financial',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.report).toBeDefined();
      expect(data.report.period).toBeDefined();
      expect(data.report.period.start).toBeDefined();
      expect(data.report.period.end).toBeDefined();
      expect(data.report.summary).toBeDefined();
      expect(data.report.byCategory).toBeDefined();
      expect(data.report.invoiceStats).toBeDefined();
    });

    test('should include financial summary statistics', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/reports/financial',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.report.summary).toHaveProperty('totalIncome');
      expect(data.report.summary).toHaveProperty('totalExpense');
      expect(data.report.summary).toHaveProperty('netIncome');
      expect(data.report.summary).toHaveProperty('incomeCount');
      expect(data.report.summary).toHaveProperty('expenseCount');
    });

    test('should return arrays for byCategory and invoiceStats', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/reports/financial',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(Array.isArray(data.report.byCategory)).toBe(true);
      expect(Array.isArray(data.report.invoiceStats)).toBe(true);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/reports/financial',
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    test('should return 400 for invalid date params', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/reports/financial?endDate=invalid',
        authToken
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
    });

    test('should return 400 when startDate is after endDate', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/reports/financial?startDate=2026-12-31&endDate=2026-01-01',
        authToken
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
    });
  });
});
