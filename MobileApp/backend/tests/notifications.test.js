// Notifications API Tests
const { buildApp, createTestUserAndGetToken, makeAuthenticatedRequest } = require('./helpers');

describe('Notifications API', () => {
  let app;
  let authToken;
  let testNotificationId;

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

  // ==================== CREATE NOTIFICATION TESTS ====================
  describe('POST /api/notifications', () => {
    test('should create notification with valid data', async () => {
      const notificationData = {
        title: 'Test Notification',
        message: 'Test notification message',
        type: 'info',
        priority: 'normal',
      };

      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/notifications',
        authToken,
        notificationData
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.notificationId).toBeDefined();

      testNotificationId = data.notificationId;
    });

    test('should reject notification creation without title', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/notifications',
        authToken,
        {
          message: 'Test message without title',
        }
      );

      expect(response.statusCode).toBe(400);
    });

    test('should reject notification creation without message', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/notifications',
        authToken,
        {
          title: 'Test title without message',
        }
      );

      expect(response.statusCode).toBe(400);
    });

    test('should reject notification creation without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/notifications',
        payload: {
          title: 'Test Notification',
          message: 'Test message',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== LIST NOTIFICATIONS TESTS ====================
  describe('GET /api/notifications', () => {
    test('should list all notifications', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/notifications', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.notifications)).toBe(true);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/notifications',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== MARK AS READ TESTS ====================
  describe('PATCH /api/notifications/:id/read', () => {
    test('should mark notification as read', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PATCH',
        `/api/notifications/${testNotificationId}/read`,
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should return 404 for non-existent notification', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PATCH',
        '/api/notifications/non-existent-id-123/read',
        authToken
      );

      expect(response.statusCode).toBe(404);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/notifications/${testNotificationId}/read`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== DELETE NOTIFICATION TESTS ====================
  describe('DELETE /api/notifications/:id', () => {
    let notificationToDelete;

    beforeAll(async () => {
      // Create a notification to delete
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/notifications',
        authToken,
        {
          title: 'Notification To Delete',
          message: 'This notification will be deleted',
          type: 'info',
        }
      );
      const data = JSON.parse(response.body);
      notificationToDelete = data.notificationId;
    });

    test('should delete notification', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'DELETE',
        `/api/notifications/${notificationToDelete}`,
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should return 404 for non-existent notification', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'DELETE',
        '/api/notifications/non-existent-id-123',
        authToken
      );

      expect(response.statusCode).toBe(404);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/notifications/${testNotificationId}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
