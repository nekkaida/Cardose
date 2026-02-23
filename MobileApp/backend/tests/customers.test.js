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

      expect(response.statusCode).toBe(201);
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

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should return 201 status code on successful creation', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/customers', authToken, {
        name: 'Status Code Test ' + Date.now(),
      });

      expect(response.statusCode).toBe(201);
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
      // Verify search actually returned matching results
      if (data.customers.length > 0) {
        const hasMatch = data.customers.some(c => c.name.includes('UniqueSearchName'));
        expect(hasMatch).toBe(true);
      }
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
      // Verify all returned customers have the correct business_type
      if (data.customers.length > 0) {
        expect(data.customers.every(c => c.business_type === 'corporate')).toBe(true);
      }
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
      expect(data.customer).toBeDefined();
      expect(data.customer.name).toBe('Updated Customer Name');
      expect(data.customer.phone).toBe('08198765432');
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

    test('should reject update with empty name', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        `/api/customers/${testCustomerId}`,
        authToken,
        { name: '   ' }
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.error).toContain('empty');
    });

    test('should return customer even with no changes', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        `/api/customers/${testCustomerId}`,
        authToken,
        {}
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.customer).toBeDefined();
      expect(data.customer.id).toBe(testCustomerId);
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

      expect(response.statusCode).toBe(201);
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

      expect(response.statusCode).toBe(201);
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

      expect(response.statusCode).toBe(201);
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

    test('should reject communication with invalid direction', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        `/api/customers/${testCustomerId}/communications`,
        authToken,
        {
          type: 'email',
          direction: 'invalid',
          content: 'Test content',
        }
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.error).toContain('direction');
    });

    test('should reject communication with overly long content', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        `/api/customers/${testCustomerId}/communications`,
        authToken,
        {
          type: 'email',
          content: 'x'.repeat(10001),
        }
      );

      expect(response.statusCode).toBe(400);
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

    test('should return 409 when customer has existing orders', async () => {
      // Create customer
      const custResponse = await makeAuthenticatedRequest(app, 'POST', '/api/customers', authToken, {
        name: 'Customer With Orders ' + Date.now(),
        email: `withorders${Date.now()}@example.com`,
      });
      const custData = JSON.parse(custResponse.body);
      const custId = custData.customerId || custData.customer?.id;

      // Create an order for this customer
      await makeAuthenticatedRequest(app, 'POST', '/api/orders', authToken, {
        customer_id: custId,
        order_number: 'ORD-DEL-TEST-' + Date.now(),
        status: 'pending',
        priority: 'normal',
        total_amount: 50000,
        items: [],
      });

      // Attempt to delete - should be blocked
      const response = await makeAuthenticatedRequest(
        app,
        'DELETE',
        `/api/customers/${custId}`,
        authToken
      );

      expect(response.statusCode).toBe(409);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toContain('existing order');
    });

    test('should return 403 for employee role', async () => {
      // Create employee user
      const { token: employeeToken } = await createTestUserAndGetToken(app, {
        username: 'employee_' + Date.now(),
        email: `employee${Date.now()}@example.com`,
        role: 'employee',
      });

      const response = await makeAuthenticatedRequest(
        app,
        'DELETE',
        `/api/customers/${testCustomerId}`,
        employeeToken
      );

      expect(response.statusCode).toBe(403);
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

  // ==================== SORTING TESTS ====================
  describe('GET /api/customers (sorting)', () => {
    test('should sort customers by name ascending', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/customers?sort_by=name&sort_order=asc',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      if (data.customers.length >= 2) {
        expect(data.customers[0].name.localeCompare(data.customers[1].name)).toBeLessThanOrEqual(0);
      }
    });

    test('should sort customers by total_spent descending', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/customers?sort_by=total_spent&sort_order=desc',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      if (data.customers.length >= 2) {
        expect(data.customers[0].total_spent).toBeGreaterThanOrEqual(data.customers[1].total_spent);
      }
    });

    test('should ignore invalid sort column and fall back to created_at', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/customers?sort_by=DROP_TABLE&sort_order=desc',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });
  });

  // ==================== NOTES UPDATE TEST ====================
  describe('PUT /api/customers/:id (notes field)', () => {
    test('should update notes field', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        `/api/customers/${testCustomerId}`,
        authToken,
        {
          notes: 'Updated notes content',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.customer.notes).toBe('Updated notes content');
    });

    test('should clear notes field with empty string', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        `/api/customers/${testCustomerId}`,
        authToken,
        {
          notes: '',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.customer.notes).toBe('');
    });
  });

  // ==================== ENUM VALIDATION TESTS ====================
  describe('Enum validation', () => {
    test('should reject invalid business_type on create', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/customers', authToken, {
        name: 'Enum Test ' + Date.now(),
        business_type: 'invalid_type',
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.error).toContain('Invalid business type');
    });

    test('should reject invalid loyalty_status on create', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/customers', authToken, {
        name: 'Enum Test ' + Date.now(),
        loyalty_status: 'platinum',
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.error).toContain('Invalid loyalty status');
    });

    test('should reject invalid business_type on update', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        `/api/customers/${testCustomerId}`,
        authToken,
        {
          business_type: 'invalid_type',
        }
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.error).toContain('Invalid business type');
    });

    test('should reject invalid loyalty_status on update', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        `/api/customers/${testCustomerId}`,
        authToken,
        {
          loyalty_status: 'gold',
        }
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.error).toContain('Invalid loyalty status');
    });
  });

  // ==================== STATS IN LIST RESPONSE ====================
  describe('GET /api/customers (stats)', () => {
    test('should include stats with trading field in list response', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/customers',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.stats).toBeDefined();
      expect(typeof data.stats.corporate).toBe('number');
      expect(typeof data.stats.trading).toBe('number');
      expect(typeof data.stats.wedding).toBe('number');
      expect(typeof data.stats.individual).toBe('number');
      expect(typeof data.stats.event).toBe('number');
      expect(typeof data.stats.totalValue).toBe('number');
      expect(typeof data.stats.loyalty_new).toBe('number');
      expect(typeof data.stats.loyalty_regular).toBe('number');
      expect(typeof data.stats.loyalty_vip).toBe('number');
    });
  });
});
