// Communication API Tests
const { buildApp, createTestUserAndGetToken, makeAuthenticatedRequest } = require('./helpers');

describe('Communication API', () => {
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

  // ============= WhatsApp Send =============
  describe('POST /api/communication/whatsapp/send', () => {
    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/communication/whatsapp/send',
        payload: { to: '08123456789', message: 'Hello' }
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    test('should reject with missing "to" field (schema validation)', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/whatsapp/send', authToken,
        { message: 'Hello' }
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.message).toContain('to');
    });

    test('should reject with missing "message" field (schema validation)', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/whatsapp/send', authToken,
        { to: '08123456789' }
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.message).toContain('message');
    });

    test('should reject with empty body (schema validation)', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/whatsapp/send', authToken,
        {}
      );

      expect(response.statusCode).toBe(400);
    });
  });

  // ============= WhatsApp Notify Order =============
  describe('POST /api/communication/whatsapp/notify/order', () => {
    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/communication/whatsapp/notify/order',
        payload: { orderId: 'some-id' }
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    test('should reject with missing orderId (schema validation)', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/whatsapp/notify/order', authToken,
        {}
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.message).toContain('orderId');
    });

    test('should return 404 for non-existent order', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/whatsapp/notify/order', authToken,
        { orderId: 'non-existent-order-id' }
      );

      expect(response.statusCode).toBe(404);
      const data = JSON.parse(response.body);
      expect(data.error).toContain('not found');
    });
  });

  // ============= WhatsApp Notify Invoice =============
  describe('POST /api/communication/whatsapp/notify/invoice', () => {
    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/communication/whatsapp/notify/invoice',
        payload: { invoiceId: 'some-id' }
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    test('should reject with missing invoiceId (schema validation)', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/whatsapp/notify/invoice', authToken,
        {}
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.message).toContain('invoiceId');
    });

    test('should return 404 for non-existent invoice', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/whatsapp/notify/invoice', authToken,
        { invoiceId: 'non-existent-invoice-id' }
      );

      expect(response.statusCode).toBe(404);
      const data = JSON.parse(response.body);
      expect(data.error).toContain('not found');
    });
  });

  // ============= WhatsApp Notify Production =============
  describe('POST /api/communication/whatsapp/notify/production', () => {
    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/communication/whatsapp/notify/production',
        payload: { orderId: 'some-id', stage: 'cutting' }
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    test('should reject with missing orderId (schema validation)', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/whatsapp/notify/production', authToken,
        { stage: 'cutting' }
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.message).toContain('orderId');
    });

    test('should reject with missing stage (schema validation)', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/whatsapp/notify/production', authToken,
        { orderId: 'some-id' }
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.message).toContain('stage');
    });

    test('should return 404 for non-existent order', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/whatsapp/notify/production', authToken,
        { orderId: 'non-existent-order-id', stage: 'cutting' }
      );

      expect(response.statusCode).toBe(404);
      const data = JSON.parse(response.body);
      expect(data.error).toContain('not found');
    });
  });

  // ============= WhatsApp Payment Reminder =============
  describe('POST /api/communication/whatsapp/notify/payment-reminder', () => {
    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/communication/whatsapp/notify/payment-reminder',
        payload: { invoiceId: 'some-id' }
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    test('should reject with missing invoiceId (schema validation)', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/whatsapp/notify/payment-reminder', authToken,
        {}
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.message).toContain('invoiceId');
    });

    test('should return 404 for non-existent invoice', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/whatsapp/notify/payment-reminder', authToken,
        { invoiceId: 'non-existent-invoice-id' }
      );

      expect(response.statusCode).toBe(404);
      const data = JSON.parse(response.body);
      expect(data.error).toContain('not found');
    });
  });

  // ============= WhatsApp Bulk Send =============
  describe('POST /api/communication/whatsapp/bulk-send', () => {
    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/communication/whatsapp/bulk-send',
        payload: { customerIds: ['id1'], message: 'Hello' }
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    test('should reject with missing customerIds (schema validation)', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/whatsapp/bulk-send', authToken,
        { message: 'Hello' }
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.message).toContain('customerIds');
    });

    test('should reject with empty customerIds array', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/whatsapp/bulk-send', authToken,
        { customerIds: [], message: 'Hello' }
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.error).toContain('Customer IDs');
    });

    test('should reject with missing message (schema validation)', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/whatsapp/bulk-send', authToken,
        { customerIds: ['id1'] }
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.message).toContain('message');
    });

    test('should reject with non-existent customer IDs (no phone numbers found)', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/whatsapp/bulk-send', authToken,
        { customerIds: ['non-existent-1', 'non-existent-2'], message: 'Hello' }
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.error).toContain('No customers');
    });
  });

  // ============= Communication Logs =============
  describe('GET /api/communication/logs', () => {
    test('should return logs with authentication', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'GET', '/api/communication/logs', authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.logs).toBeDefined();
      expect(Array.isArray(data.logs)).toBe(true);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.total).toBeDefined();
      expect(data.pagination.limit).toBeDefined();
      expect(data.pagination.offset).toBeDefined();
      expect(data.pagination.pages).toBeDefined();
    });

    test('should support query parameters for filtering', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'GET', '/api/communication/logs?type=whatsapp&limit=10&offset=0', authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.offset).toBe(0);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/communication/logs'
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });
  });

  // ============= WhatsApp Webhook Verification =============
  describe('GET /api/communication/whatsapp/webhook', () => {
    test('should return challenge with valid verify token', async () => {
      const verifyToken = 'premium-gift-box-webhook-token';
      const challenge = 'test-challenge-string';

      const response = await app.inject({
        method: 'GET',
        url: `/api/communication/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=${challenge}`
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe(challenge);
    });

    test('should return 403 with invalid verify token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/communication/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=test'
      });

      expect(response.statusCode).toBe(403);
    });

    test('should return 403 with missing mode', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/communication/whatsapp/webhook?hub.verify_token=premium-gift-box-webhook-token&hub.challenge=test'
      });

      expect(response.statusCode).toBe(403);
    });

    test('should return 403 with wrong mode', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/communication/whatsapp/webhook?hub.mode=unsubscribe&hub.verify_token=premium-gift-box-webhook-token&hub.challenge=test'
      });

      expect(response.statusCode).toBe(403);
    });
  });

  // ============= Email Send =============
  describe('POST /api/communication/email/send', () => {
    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/communication/email/send',
        payload: { to: 'test@example.com', subject: 'Test', html: '<p>Hello</p>' }
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    test('should reject with missing "to" field (schema validation)', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/email/send', authToken,
        { subject: 'Test', html: '<p>Hello</p>' }
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.message).toContain('to');
    });

    test('should reject with missing "subject" field (schema validation)', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/email/send', authToken,
        { to: 'test@example.com', html: '<p>Hello</p>' }
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.message).toContain('subject');
    });

    test('should reject with missing "html" field (schema validation)', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/email/send', authToken,
        { to: 'test@example.com', subject: 'Test' }
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.message).toContain('html');
    });
  });

  // ============= Email Notify Order =============
  describe('POST /api/communication/email/notify/order', () => {
    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/communication/email/notify/order',
        payload: { orderId: 'some-id' }
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    test('should reject with missing orderId (schema validation)', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/email/notify/order', authToken,
        {}
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.message).toContain('orderId');
    });

    test('should return 404 for non-existent order', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/email/notify/order', authToken,
        { orderId: 'non-existent-order-id' }
      );

      expect(response.statusCode).toBe(404);
      const data = JSON.parse(response.body);
      expect(data.error).toContain('not found');
    });
  });

  // ============= Email Notify Invoice =============
  describe('POST /api/communication/email/notify/invoice', () => {
    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/communication/email/notify/invoice',
        payload: { invoiceId: 'some-id' }
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    test('should reject with missing invoiceId (schema validation)', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/email/notify/invoice', authToken,
        {}
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.message).toContain('invoiceId');
    });

    test('should return 404 for non-existent invoice', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/email/notify/invoice', authToken,
        { invoiceId: 'non-existent-invoice-id' }
      );

      expect(response.statusCode).toBe(404);
      const data = JSON.parse(response.body);
      expect(data.error).toContain('not found');
    });
  });

  // ============= Email Notify Production =============
  describe('POST /api/communication/email/notify/production', () => {
    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/communication/email/notify/production',
        payload: { orderId: 'some-id', stage: 'printing' }
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    test('should reject with missing orderId (schema validation)', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/email/notify/production', authToken,
        { stage: 'printing' }
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.message).toContain('orderId');
    });

    test('should reject with missing stage (schema validation)', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/email/notify/production', authToken,
        { orderId: 'some-id' }
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.message).toContain('stage');
    });

    test('should return 404 for non-existent order', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/email/notify/production', authToken,
        { orderId: 'non-existent-order-id', stage: 'printing' }
      );

      expect(response.statusCode).toBe(404);
      const data = JSON.parse(response.body);
      expect(data.error).toContain('not found');
    });
  });

  // ============= Email Payment Reminder =============
  describe('POST /api/communication/email/notify/payment-reminder', () => {
    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/communication/email/notify/payment-reminder',
        payload: { invoiceId: 'some-id' }
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    test('should reject with missing invoiceId (schema validation)', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/email/notify/payment-reminder', authToken,
        {}
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.message).toContain('invoiceId');
    });

    test('should return 404 for non-existent invoice', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/email/notify/payment-reminder', authToken,
        { invoiceId: 'non-existent-invoice-id' }
      );

      expect(response.statusCode).toBe(404);
      const data = JSON.parse(response.body);
      expect(data.error).toContain('not found');
    });
  });

  // ============= Email Bulk Send =============
  describe('POST /api/communication/email/bulk-send', () => {
    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/communication/email/bulk-send',
        payload: { customerIds: ['id1'], subject: 'Test', html: '<p>Hi</p>' }
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    test('should reject with missing customerIds (schema validation)', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/email/bulk-send', authToken,
        { subject: 'Test', html: '<p>Hi</p>' }
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.message).toContain('customerIds');
    });

    test('should reject with empty customerIds array', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/email/bulk-send', authToken,
        { customerIds: [], subject: 'Test', html: '<p>Hi</p>' }
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.error).toContain('Customer IDs');
    });

    test('should reject with missing subject (schema validation)', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/email/bulk-send', authToken,
        { customerIds: ['id1'], html: '<p>Hi</p>' }
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.message).toContain('subject');
    });

    test('should reject with missing html (schema validation)', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/email/bulk-send', authToken,
        { customerIds: ['id1'], subject: 'Test' }
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.message).toContain('html');
    });

    test('should reject with non-existent customer IDs (no email addresses found)', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/communication/email/bulk-send', authToken,
        { customerIds: ['non-existent-1', 'non-existent-2'], subject: 'Test', html: '<p>Hi</p>' }
      );

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.error).toContain('No customers');
    });
  });
});
