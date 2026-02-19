// Files API Tests
const { buildApp, createTestUserAndGetToken, makeAuthenticatedRequest } = require('./helpers');

describe('Files API', () => {
  let app;
  let authToken;
  let authUser;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    const auth = await createTestUserAndGetToken(app);
    authToken = auth.token;
    authUser = auth.user;
  });

  afterAll(async () => {
    await app.close();
  });

  // ============= Upload File =============
  describe('POST /api/files/upload', () => {
    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/files/upload',
        headers: {
          'content-type': 'multipart/form-data; boundary=boundary',
        },
        payload:
          '--boundary\r\nContent-Disposition: form-data; name="file"; filename="test.txt"\r\nContent-Type: text/plain\r\n\r\nhello\r\n--boundary--',
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });
  });

  // ============= Get File by ID =============
  describe('GET /api/files/:fileId', () => {
    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/files/some-file-id',
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    test('should return 404 for non-existent file', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/files/non-existent-file-id',
        authToken
      );

      expect(response.statusCode).toBe(404);
      const data = JSON.parse(response.body);
      expect(data.error).toContain('not found');
    });
  });

  // ============= Get Thumbnail =============
  describe('GET /api/files/:fileId/thumbnail', () => {
    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/files/some-file-id/thumbnail',
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    test('should return 404 for non-existent file', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/files/non-existent-file-id/thumbnail',
        authToken
      );

      expect(response.statusCode).toBe(404);
      const data = JSON.parse(response.body);
      expect(data.error).toContain('not found');
    });
  });

  // ============= Get File Metadata =============
  describe('GET /api/files/:fileId/metadata', () => {
    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/files/some-file-id/metadata',
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    test('should return 404 for non-existent file', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/files/non-existent-file-id/metadata',
        authToken
      );

      expect(response.statusCode).toBe(404);
      const data = JSON.parse(response.body);
      expect(data.error).toContain('not found');
    });
  });

  // ============= Delete File =============
  describe('DELETE /api/files/:fileId', () => {
    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/files/some-file-id',
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    test('should return 404 for non-existent file', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'DELETE',
        '/api/files/non-existent-file-id',
        authToken
      );

      expect(response.statusCode).toBe(404);
      const data = JSON.parse(response.body);
      expect(data.error).toContain('not found');
    });
  });

  // ============= List Files by User =============
  describe('GET /api/files/user/:userId', () => {
    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/files/user/some-user-id',
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    test('should return files list for own user (owner role)', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        `/api/files/user/${authUser.id}`,
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.files).toBeDefined();
      expect(Array.isArray(data.files)).toBe(true);
    });

    test('should allow owner role to view other user files', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/files/user/some-other-user-id',
        authToken
      );

      // Owner role should be allowed to see other users' files
      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.files).toBeDefined();
      expect(Array.isArray(data.files)).toBe(true);
    });

    test('should reject non-owner viewing other user files', async () => {
      // Create an employee user
      const { token: employeeToken, user: employeeUser } = await createTestUserAndGetToken(app, {
        role: 'employee',
      });

      // Employee trying to view another user's files
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        `/api/files/user/${authUser.id}`,
        employeeToken
      );

      expect(response.statusCode).toBe(403);
      const data = JSON.parse(response.body);
      expect(data.error).toContain('Permission denied');
    });
  });

  // ============= File Stats =============
  describe('GET /api/files/stats/summary', () => {
    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/files/stats/summary',
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    test('should return file statistics', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/files/stats/summary',
        authToken
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.totalFiles).toBeDefined();
      expect(data.totalSize).toBeDefined();
      expect(data.totalSizeMB).toBeDefined();
    });
  });
});
