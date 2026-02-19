// Analytics API Tests
const { buildApp, createTestUserAndGetToken, makeAuthenticatedRequest } = require('./helpers');

describe('Analytics API', () => {
  let app;
  let authToken;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create a test user and get token
    const { token } = await createTestUserAndGetToken(app, { role: 'owner' });
    authToken = token;
  });

  afterAll(async () => {
    await app.close();
  });

  // ==================== DASHBOARD OVERVIEW TESTS ====================
  describe('GET /api/analytics/dashboard', () => {
    test('should get dashboard overview with default period (month)', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/analytics/dashboard',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.period).toBe('month');
      expect(data.revenue).toBeDefined();
      expect(data.orders).toBeDefined();
      expect(data.customers).toBeDefined();
      expect(data.inventory).toBeDefined();
      expect(data.production).toBeDefined();
    });

    test('should get dashboard overview with week period', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/analytics/dashboard?period=week',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.period).toBe('week');
    });

    test('should get dashboard overview with quarter period', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/analytics/dashboard?period=quarter',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.period).toBe('quarter');
    });

    test('should get dashboard overview with year period', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/analytics/dashboard?period=year',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.period).toBe('year');
    });

    test('should handle invalid period gracefully', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/analytics/dashboard?period=invalid',
        authToken
      );

      expect(response.statusCode).toBe(200);
      // Should default to month for invalid period
    });

    test('should include revenue statistics', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/analytics/dashboard',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.revenue).toHaveProperty('total_revenue');
      expect(data.revenue).toHaveProperty('paid_revenue');
      expect(data.revenue).toHaveProperty('pending_revenue');
      expect(data.revenue).toHaveProperty('average_order_value');
    });

    test('should include order statistics', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/analytics/dashboard',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.orders).toHaveProperty('total_orders');
      expect(data.orders).toHaveProperty('completed_orders');
      expect(data.orders).toHaveProperty('active_orders');
      expect(data.orders).toHaveProperty('cancelled_orders');
    });

    test('should include customer statistics', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/analytics/dashboard',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.customers).toHaveProperty('total_customers');
      expect(data.customers).toHaveProperty('vip_customers');
      expect(data.customers).toHaveProperty('regular_customers');
      expect(data.customers).toHaveProperty('new_customers');
    });

    test('should include inventory statistics', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/analytics/dashboard',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.inventory).toHaveProperty('total_materials');
      expect(data.inventory).toHaveProperty('out_of_stock');
      expect(data.inventory).toHaveProperty('low_stock');
      expect(data.inventory).toHaveProperty('total_value');
    });

    test('should include production statistics', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/analytics/dashboard',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.production).toHaveProperty('designing');
      expect(data.production).toHaveProperty('in_production');
      expect(data.production).toHaveProperty('quality_control');
      expect(data.production).toHaveProperty('urgent_orders');
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/dashboard',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== REVENUE TREND TESTS ====================
  describe('GET /api/analytics/revenue-trend', () => {
    test('should get revenue trend with default 12 months', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/analytics/revenue-trend',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.trend).toBeDefined();
      expect(Array.isArray(data.trend)).toBe(true);
    });

    test('should get revenue trend with custom months', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/analytics/revenue-trend?months=6',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.trend).toBeDefined();
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/revenue-trend',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== CUSTOMER ANALYTICS TESTS ====================
  describe('GET /api/analytics/customers', () => {
    test('should get customer analytics', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/analytics/customers',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.top_customers).toBeDefined();
      expect(data.acquisition_trend).toBeDefined();
      expect(data.by_business_type).toBeDefined();
    });

    test('should return top customers array', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/analytics/customers',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(Array.isArray(data.top_customers)).toBe(true);
    });

    test('should return acquisition trend array', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/analytics/customers',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(Array.isArray(data.acquisition_trend)).toBe(true);
    });

    test('should return business type breakdown', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/analytics/customers',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(Array.isArray(data.by_business_type)).toBe(true);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/customers',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== PRODUCT ANALYTICS TESTS ====================
  describe('GET /api/analytics/products', () => {
    test('should get product analytics', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/analytics/products',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.by_box_type).toBeDefined();
      expect(data.average_dimensions).toBeDefined();
    });

    test('should return box type breakdown', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/analytics/products',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(Array.isArray(data.by_box_type)).toBe(true);
    });

    test('should return average dimensions', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/analytics/products',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.average_dimensions).toBeDefined();
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/products',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== PRODUCTION PERFORMANCE TESTS ====================
  describe('GET /api/analytics/production-performance', () => {
    test('should get production performance analytics', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/analytics/production-performance',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.stage_performance).toBeDefined();
      expect(data.delivery_performance).toBeDefined();
      expect(data.quality_performance).toBeDefined();
      expect(data.task_performance).toBeDefined();
    });

    test('should return stage performance array', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/analytics/production-performance',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(Array.isArray(data.stage_performance)).toBe(true);
    });

    test('should return delivery performance metrics', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/analytics/production-performance',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.delivery_performance).toHaveProperty('total_completed');
      expect(data.delivery_performance).toHaveProperty('on_time_deliveries');
      expect(data.delivery_performance).toHaveProperty('on_time_rate');
    });

    test('should return quality performance metrics', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/analytics/production-performance',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.quality_performance).toHaveProperty('total_checks');
      expect(data.quality_performance).toHaveProperty('passed_checks');
      expect(data.quality_performance).toHaveProperty('failed_checks');
      expect(data.quality_performance).toHaveProperty('pass_rate');
    });

    test('should return task performance metrics', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/analytics/production-performance',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.task_performance).toHaveProperty('total_tasks');
      expect(data.task_performance).toHaveProperty('completed_tasks');
      expect(data.task_performance).toHaveProperty('cancelled_tasks');
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/production-performance',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== INVENTORY ANALYTICS TESTS ====================
  describe('GET /api/analytics/inventory-analytics', () => {
    test('should get inventory analytics', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/analytics/inventory-analytics',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.top_materials).toBeDefined();
      expect(data.stock_alerts).toBeDefined();
      expect(data.movement_trends).toBeDefined();
    });

    test('should return top materials array', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/analytics/inventory-analytics',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(Array.isArray(data.top_materials)).toBe(true);
    });

    test('should return stock alerts summary', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/analytics/inventory-analytics',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.stock_alerts).toHaveProperty('total_materials');
      expect(data.stock_alerts).toHaveProperty('out_of_stock');
      expect(data.stock_alerts).toHaveProperty('low_stock');
      expect(data.stock_alerts).toHaveProperty('adequate_stock');
    });

    test('should return movement trends array', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/analytics/inventory-analytics',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(Array.isArray(data.movement_trends)).toBe(true);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/inventory-analytics',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
