// Users API Tests
const { buildApp, createTestUserAndGetToken, makeAuthenticatedRequest } = require('./helpers');

describe('Users API', () => {
  let app;
  let authToken;
  let testUserId;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create a test user and get token
    const { token, user } = await createTestUserAndGetToken(app, { role: 'owner' });
    authToken = token;
  });

  afterAll(async () => {
    await app.close();
  });

  // ==================== LIST USERS TESTS ====================
  describe('GET /api/users', () => {
    test('should get all users', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/users', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.users)).toBe(true);
    });

    test('should filter users by role', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/users?role=owner', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should filter users by active status', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/users?is_active=true', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should search users', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/users?search=test', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should support pagination', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/users?page=1&limit=10', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.page).toBe(1);
      expect(data.limit).toBe(10);
    });

    test('should include stats', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/users', authToken);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.stats).toBeDefined();
      expect(data.stats.total).toBeDefined();
      expect(data.stats.byRole).toBeDefined();
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users'
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== CREATE USER TESTS ====================
  describe('POST /api/users', () => {
    test('should create user with valid data', async () => {
      const userData = {
        username: 'newuser_' + Date.now(),
        email: `newuser${Date.now()}@example.com`,
        password: 'Test123!',
        full_name: 'New Test User',
        phone: '08123456789',
        role: 'employee'
      };

      const response = await makeAuthenticatedRequest(app, 'POST', '/api/users', authToken, userData);

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.userId).toBeDefined();
      expect(data.user).toBeDefined();
      testUserId = data.userId;
    });

    test('should reject duplicate username', async () => {
      const userData = {
        username: 'duplicate_user_' + Date.now(),
        email: `duplicate1${Date.now()}@example.com`,
        password: 'Test123!',
        full_name: 'Duplicate User'
      };

      // Create first user
      await makeAuthenticatedRequest(app, 'POST', '/api/users', authToken, userData);

      // Try to create duplicate
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/users', authToken, {
        ...userData,
        email: `different${Date.now()}@example.com`
      });

      expect(response.statusCode).toBe(409);
    });

    test('should reject duplicate email', async () => {
      const email = `unique_email${Date.now()}@example.com`;

      // Create first user
      await makeAuthenticatedRequest(app, 'POST', '/api/users', authToken, {
        username: 'user1_' + Date.now(),
        email,
        password: 'Test123!',
        full_name: 'User 1'
      });

      // Try to create with same email
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/users', authToken, {
        username: 'user2_' + Date.now(),
        email,
        password: 'Test123!',
        full_name: 'User 2'
      });

      expect(response.statusCode).toBe(409);
    });

    test('should reject without username', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/users', authToken, {
        email: 'test@example.com',
        password: 'Test123!',
        full_name: 'Test User'
      });

      expect(response.statusCode).toBe(400);
    });

    test('should reject without email', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/users', authToken, {
        username: 'testuser',
        password: 'Test123!',
        full_name: 'Test User'
      });

      expect(response.statusCode).toBe(400);
    });

    test('should reject without password', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/users', authToken, {
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User'
      });

      expect(response.statusCode).toBe(400);
    });

    test('should reject without full_name', async () => {
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/users', authToken, {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123!'
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ==================== GET USER BY ID TESTS ====================
  describe('GET /api/users/:id', () => {
    test('should get user by valid ID', async () => {
      if (testUserId) {
        const response = await makeAuthenticatedRequest(app, 'GET', `/api/users/${testUserId}`, authToken);

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);
        expect(data.success).toBe(true);
        expect(data.user).toBeDefined();
        expect(data.user.id).toBe(testUserId);
      }
    });

    test('should return 404 for non-existent user', async () => {
      const response = await makeAuthenticatedRequest(app, 'GET', '/api/users/non-existent-id-123', authToken);

      expect(response.statusCode).toBe(404);
    });

    test('should not return password hash', async () => {
      if (testUserId) {
        const response = await makeAuthenticatedRequest(app, 'GET', `/api/users/${testUserId}`, authToken);

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);
        expect(data.user.password_hash).toBeUndefined();
      }
    });
  });

  // ==================== UPDATE USER TESTS ====================
  describe('PUT /api/users/:id', () => {
    test('should update user with valid data', async () => {
      if (testUserId) {
        const response = await makeAuthenticatedRequest(app, 'PUT', `/api/users/${testUserId}`, authToken, {
          full_name: 'Updated Name',
          phone: '08198765432'
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);
        expect(data.success).toBe(true);
        expect(data.user.full_name).toBe('Updated Name');
      }
    });

    test('should update user role', async () => {
      if (testUserId) {
        const response = await makeAuthenticatedRequest(app, 'PUT', `/api/users/${testUserId}`, authToken, {
          role: 'manager'
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);
        expect(data.success).toBe(true);
      }
    });

    test('should update user password', async () => {
      if (testUserId) {
        const response = await makeAuthenticatedRequest(app, 'PUT', `/api/users/${testUserId}`, authToken, {
          password: 'NewPassword123!'
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);
        expect(data.success).toBe(true);
      }
    });

    test('should return 404 for non-existent user', async () => {
      const response = await makeAuthenticatedRequest(app, 'PUT', '/api/users/non-existent-id-123', authToken, {
        full_name: 'Updated Name'
      });

      expect(response.statusCode).toBe(404);
    });

    test('should handle no changes gracefully', async () => {
      if (testUserId) {
        const response = await makeAuthenticatedRequest(app, 'PUT', `/api/users/${testUserId}`, authToken, {});

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);
        expect(data.success).toBe(true);
      }
    });
  });

  // ==================== USER STATUS TESTS ====================
  describe('PATCH /api/users/:id/status', () => {
    test('should deactivate user', async () => {
      if (testUserId) {
        const response = await makeAuthenticatedRequest(app, 'PATCH', `/api/users/${testUserId}/status`, authToken, {
          is_active: false
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);
        expect(data.success).toBe(true);
        expect(data.message).toContain('deactivated');
      }
    });

    test('should activate user', async () => {
      if (testUserId) {
        const response = await makeAuthenticatedRequest(app, 'PATCH', `/api/users/${testUserId}/status`, authToken, {
          is_active: true
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);
        expect(data.success).toBe(true);
        expect(data.message).toContain('activated');
      }
    });

    test('should return 404 for non-existent user', async () => {
      const response = await makeAuthenticatedRequest(app, 'PATCH', '/api/users/non-existent-id-123/status', authToken, {
        is_active: false
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ==================== DELETE USER TESTS ====================
  describe('DELETE /api/users/:id', () => {
    let userToDelete;

    beforeAll(async () => {
      // Create a user to delete
      const response = await makeAuthenticatedRequest(app, 'POST', '/api/users', authToken, {
        username: 'user_to_delete_' + Date.now(),
        email: `delete${Date.now()}@example.com`,
        password: 'Test123!',
        full_name: 'User To Delete'
      });
      const data = JSON.parse(response.body);
      userToDelete = data.userId;
    });

    test('should delete user', async () => {
      if (userToDelete) {
        const response = await makeAuthenticatedRequest(app, 'DELETE', `/api/users/${userToDelete}`, authToken);

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);
        expect(data.success).toBe(true);
      }
    });

    test('should return 404 for non-existent user', async () => {
      const response = await makeAuthenticatedRequest(app, 'DELETE', '/api/users/non-existent-id-123', authToken);

      expect(response.statusCode).toBe(404);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/users/some-id'
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
