// Settings API Tests
const { buildApp, createTestUserAndGetToken, makeAuthenticatedRequest } = require('./helpers');

describe('Settings API', () => {
  let app;
  let authToken;
  const testKey = 'test_setting_' + Date.now();

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

  // ==================== GET ALL SETTINGS TESTS ====================
  describe('GET /api/settings', () => {
    test('should get all settings', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/settings', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.settings).toBeDefined();
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/settings',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== CREATE/UPDATE SETTING TESTS ====================
  describe('PUT /api/settings/:key', () => {
    test('should create a new setting', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        `/api/settings/${testKey}`,
        authToken,
        {
          value: 'test_value',
          description: 'Test setting description',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.setting.key).toBe(testKey);
      expect(data.setting.value).toBe('test_value');
    });

    test('should update an existing setting', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        `/api/settings/${testKey}`,
        authToken,
        {
          value: 'updated_value',
          description: 'Updated description',
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.setting.value).toBe('updated_value');
    });

    test('should reject without value', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'PUT',
        '/api/settings/some_key',
        authToken,
        {
          description: 'Only description, no value',
        }
      );

      expect(response.statusCode).toBe(400);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/settings/${testKey}`,
        payload: {
          value: 'test_value',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== GET SINGLE SETTING TESTS ====================
  describe('GET /api/settings/:key', () => {
    test('should get setting by key', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        `/api/settings/${testKey}`,
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.setting).toBeDefined();
      expect(data.setting.key).toBe(testKey);
    });

    test('should return 404 for non-existent setting', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/settings/non_existent_setting_key_12345',
        authToken
      );

      expect(response.statusCode).toBe(404);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/settings/${testKey}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== BATCH UPDATE SETTINGS TESTS ====================
  describe('POST /api/settings/batch', () => {
    test('should batch update multiple settings', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/settings/batch',
        authToken,
        {
          settings: {
            batch_setting_1: 'value1',
            batch_setting_2: 'value2',
            batch_setting_3: 'value3',
          },
        }
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.updated).toBe(3);
    });

    test('should reject without settings object', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/settings/batch',
        authToken,
        {}
      );

      expect(response.statusCode).toBe(400);
    });

    test('should reject with invalid settings format', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/settings/batch',
        authToken,
        {
          settings: 'not an object',
        }
      );

      expect(response.statusCode).toBe(400);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/settings/batch',
        payload: {
          settings: {
            test_key: 'test_value',
          },
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== DELETE SETTING TESTS ====================
  describe('DELETE /api/settings/:key', () => {
    const keyToDelete = 'key_to_delete_' + Date.now();

    beforeAll(async () => {
      // Create a setting to delete
      await makeAuthenticatedRequest(app, 'PUT', `/api/settings/${keyToDelete}`, authToken, {
        value: 'delete_me',
      });
    });

    test('should delete setting', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'DELETE',
        `/api/settings/${keyToDelete}`,
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should successfully delete non-existent key (no error)', async () => {
      // SQLite DELETE doesn't error on non-existent rows
      const response = await makeAuthenticatedRequest(
        app,
        'DELETE',
        '/api/settings/definitely_does_not_exist_12345',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/settings/some_key',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
