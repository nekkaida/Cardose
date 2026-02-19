// Financial API Tests
const {
  buildApp,
  createTestUserAndGetToken,
  makeAuthenticatedRequest,
  createTestCustomer,
  createTestOrder,
} = require('./helpers');

describe('Financial API', () => {
  let app;
  let authToken;
  let testCustomerId;
  let testOrderId;
  let testTransactionId;
  let testBudgetId;
  let testInvoiceId;

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

  // ==================== TRANSACTIONS TESTS ====================
  describe('GET /api/financial/transactions', () => {
    test('should get all transactions', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/financial/transactions',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.transactions)).toBe(true);
    });

    test('should filter by type', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/financial/transactions?type=income',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should filter by date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        `/api/financial/transactions?startDate=${startDate}&endDate=${endDate}`,
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
        '/api/financial/transactions?page=1&limit=10',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/financial/transactions',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/financial/transactions', () => {
    test('should create income transaction', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/financial/transactions',
        authToken,
        {
          type: 'income',
          category: 'sales',
          amount: 500000,
          description: 'Test sales income',
          payment_method: 'transfer',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.transactionId).toBeDefined();
      testTransactionId = data.transactionId;
    });

    test('should create expense transaction', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/financial/transactions',
        authToken,
        {
          type: 'expense',
          category: 'materials',
          amount: 100000,
          description: 'Material purchase',
          payment_method: 'cash',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should reject without type', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/financial/transactions',
        authToken,
        {
          amount: 100000,
        }
      );

      expect(response.statusCode).toBe(400);
    });

    test('should reject without amount', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/financial/transactions',
        authToken,
        {
          type: 'income',
        }
      );

      expect(response.statusCode).toBe(400);
    });
  });

  // ==================== FINANCIAL SUMMARY TESTS ====================
  describe('GET /api/financial/summary', () => {
    test('should get financial summary', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/financial/summary',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.summary).toBeDefined();
      expect(data.summary.totalRevenue).toBeDefined();
      expect(data.summary.totalExpenses).toBeDefined();
    });
  });

  // ==================== BUDGETS TESTS ====================
  describe('GET /api/financial/budgets', () => {
    test('should get all budgets', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/financial/budgets',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.budgets)).toBe(true);
    });

    test('should filter by period', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/financial/budgets?period=monthly',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });
  });

  describe('POST /api/financial/budgets', () => {
    test('should create budget', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/financial/budgets',
        authToken,
        {
          category: 'materials',
          amount: 5000000,
          period: 'monthly',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.budgetId).toBeDefined();
      testBudgetId = data.budgetId;
    });

    test('should reject without category', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/financial/budgets',
        authToken,
        {
          amount: 5000000,
          period: 'monthly',
        }
      );

      expect(response.statusCode).toBe(400);
    });

    test('should reject without amount', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/financial/budgets',
        authToken,
        {
          category: 'materials',
          period: 'monthly',
        }
      );

      expect(response.statusCode).toBe(400);
    });

    test('should reject without period', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/financial/budgets',
        authToken,
        {
          category: 'materials',
          amount: 5000000,
        }
      );

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/financial/budgets/:id', () => {
    test('should get budget by valid ID', async () => {
      if (testBudgetId) {
        const response = await makeAuthenticatedRequest(
          app,
          'GET',
          `/api/financial/budgets/${testBudgetId}`,
          authToken
        );

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);
        expect(data.success).toBe(true);
        expect(data.budget).toBeDefined();
      }
    });

    test('should return 404 for non-existent budget', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/financial/budgets/non-existent-id-123',
        authToken
      );

      expect(response.statusCode).toBe(404);
    });
  });

  // ==================== INVOICES TESTS ====================
  describe('GET /api/financial/invoices', () => {
    test('should get all invoices', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/financial/invoices',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.invoices)).toBe(true);
    });

    test('should filter by status', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/financial/invoices?status=unpaid',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should filter by customer_id', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        `/api/financial/invoices?customer_id=${testCustomerId}`,
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });
  });

  describe('POST /api/financial/invoices', () => {
    test('should create invoice', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/financial/invoices',
        authToken,
        {
          customer_id: testCustomerId,
          order_id: testOrderId,
          subtotal: 500000,
          discount: 50000,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          items: [{ description: 'Premium Gift Box', quantity: 10, unit_price: 50000 }],
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.invoiceId).toBeDefined();
      testInvoiceId = data.invoiceId;
    });

    test('should reject without customer_id', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/financial/invoices',
        authToken,
        {
          subtotal: 500000,
        }
      );

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/financial/invoices/:id', () => {
    test('should get invoice by valid ID', async () => {
      if (testInvoiceId) {
        const response = await makeAuthenticatedRequest(
          app,
          'GET',
          `/api/financial/invoices/${testInvoiceId}`,
          authToken
        );

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);
        expect(data.success).toBe(true);
        expect(data.invoice).toBeDefined();
      }
    });

    test('should return 404 for non-existent invoice', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/financial/invoices/non-existent-id-123',
        authToken
      );

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/financial/invoices/:id/status', () => {
    test('should update invoice status to paid', async () => {
      if (testInvoiceId) {
        const response = await makeAuthenticatedRequest(
          app,
          'PATCH',
          `/api/financial/invoices/${testInvoiceId}/status`,
          authToken,
          {
            status: 'paid',
            payment_method: 'transfer',
          }
        );

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);
        expect(data.success).toBe(true);
      }
    });

    test('should reject invalid status', async () => {
      if (testInvoiceId) {
        const response = await makeAuthenticatedRequest(
          app,
          'PATCH',
          `/api/financial/invoices/${testInvoiceId}/status`,
          authToken,
          {
            status: 'invalid_status',
          }
        );

        expect(response.statusCode).toBe(400);
      }
    });

    test('should return 404 for non-existent invoice', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PATCH',
        '/api/financial/invoices/non-existent-id-123/status',
        authToken,
        {
          status: 'paid',
        }
      );

      expect(response.statusCode).toBe(404);
    });
  });

  // ==================== CALCULATE PRICING TESTS ====================
  describe('POST /api/financial/calculate-pricing', () => {
    test('should calculate pricing with materials', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/financial/calculate-pricing',
        authToken,
        {
          materials: [
            { quantity: 10, unitCost: 5000 },
            { quantity: 5, unitCost: 2000 },
          ],
          laborHours: 5,
          overheadPercentage: 10,
          markupPercentage: 50,
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.pricing).toBeDefined();
      expect(data.pricing.breakdown).toBeDefined();
    });

    test('should calculate pricing with discount', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/financial/calculate-pricing',
        authToken,
        {
          materials: [{ quantity: 10, unitCost: 5000 }],
          laborHours: 2,
          discountAmount: 10000,
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });
  });

  // ==================== TAX REPORT TESTS ====================
  describe('GET /api/financial/tax-report', () => {
    test('should get tax report for current month', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/financial/tax-report',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.ppn).toBeDefined();
    });

    test('should get tax report for specific month/year', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/financial/tax-report?month=1&year=2024',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should get tax report for date range', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/financial/tax-report?startDate=2024-01-01&endDate=2024-12-31',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });
  });

  // ==================== REVENUE ANALYTICS TESTS ====================
  describe('GET /api/financial/analytics/revenue', () => {
    test('should get revenue analytics (month)', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/financial/analytics/revenue?period=month',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.analytics).toBeDefined();
    });

    test('should get revenue analytics (week)', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/financial/analytics/revenue?period=week',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should get revenue analytics (year)', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/financial/analytics/revenue?period=year',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });
  });

  // ==================== GENERAL ANALYTICS TESTS ====================
  describe('GET /api/financial/analytics', () => {
    test('should get general financial analytics', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/financial/analytics',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.analytics).toBeDefined();
    });
  });
});
