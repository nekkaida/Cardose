// Authentication API Tests
const { buildApp } = require('./helpers');

describe('Authentication API', () => {
  let app;
  let testUser;
  let authToken;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // ==================== REGISTER TESTS ====================
  describe('POST /api/auth/register', () => {
    test('should register a new user with valid data', async () => {
      const userData = {
        username: 'testuser_' + Date.now(),
        email: `test${Date.now()}@example.com`,
        password: 'Test123!',
        fullName: 'Test User',
        role: 'employee'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: userData
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
      expect(data.user).toBeDefined();
      expect(data.user.username).toBe(userData.username);
      expect(data.user.email).toBe(userData.email);

      // Save for later tests
      testUser = { ...userData, id: data.user.id };
      authToken = data.token;
    });

    test('should reject registration with duplicate username', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          username: testUser.username,
          email: 'different@example.com',
          password: 'Test123!',
          fullName: 'Another User'
        }
      });

      expect(response.statusCode).toBe(409);
      const data = JSON.parse(response.body);
      expect(data.error).toContain('already exists');
    });

    test('should reject registration with duplicate email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          username: 'different_user_' + Date.now(),
          email: testUser.email,
          password: 'Test123!',
          fullName: 'Another User'
        }
      });

      expect(response.statusCode).toBe(409);
      const data = JSON.parse(response.body);
      expect(data.error).toContain('already exists');
    });

    test('should reject registration with short password (< 6 chars)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          username: 'newuser_' + Date.now(),
          email: `new${Date.now()}@example.com`,
          password: '12345',
          fullName: 'New User'
        }
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.error).toContain('6 characters');
    });

    test('should reject registration with missing required fields', async () => {
      // Missing username
      let response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'Test123!',
          fullName: 'Test User'
        }
      });
      expect(response.statusCode).toBe(400);

      // Missing email
      response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          username: 'testuser',
          password: 'Test123!',
          fullName: 'Test User'
        }
      });
      expect(response.statusCode).toBe(400);

      // Missing password
      response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          username: 'testuser',
          email: 'test@example.com',
          fullName: 'Test User'
        }
      });
      expect(response.statusCode).toBe(400);

      // Missing fullName
      response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          username: 'testuser',
          email: 'test@example.com',
          password: 'Test123!'
        }
      });
      expect(response.statusCode).toBe(400);
    });
  });

  // ==================== LOGIN TESTS ====================
  describe('POST /api/auth/login', () => {
    test('should login with valid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          username: testUser.username,
          password: testUser.password
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
      expect(data.user).toBeDefined();
      expect(data.user.username).toBe(testUser.username);

      // Update authToken
      authToken = data.token;
    });

    test('should reject login with wrong password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          username: testUser.username,
          password: 'wrongpassword'
        }
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid');
    });

    test('should reject login with non-existent user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          username: 'nonexistent_user_xyz',
          password: 'Test123!'
        }
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
    });

    test('should reject login with missing credentials', async () => {
      // Missing username
      let response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          password: 'Test123!'
        }
      });
      expect(response.statusCode).toBe(400);

      // Missing password
      response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          username: testUser.username
        }
      });
      expect(response.statusCode).toBe(400);
    });
  });

  // ==================== LOGOUT TESTS ====================
  describe('POST /api/auth/logout', () => {
    test('should logout with valid token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should reject logout without token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout'
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== GET /ME TESTS ====================
  describe('GET /api/auth/me', () => {
    test('should get current user with valid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.username).toBe(testUser.username);
    });

    test('should reject without token (401)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me'
      });

      expect(response.statusCode).toBe(401);
    });

    test('should reject with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          Authorization: 'Bearer invalid_token_here'
        }
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== PROFILE UPDATE TESTS ====================
  describe('PUT /api/auth/profile', () => {
    test('should update profile with valid data', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/auth/profile',
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        payload: {
          fullName: 'Updated Name',
          phone: '08123456789'
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should reject profile update without token', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/auth/profile',
        payload: {
          fullName: 'Updated Name'
        }
      });

      expect(response.statusCode).toBe(401);
    });

    test('should reject profile update with no data', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/auth/profile',
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        payload: {}
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ==================== CHANGE PASSWORD TESTS ====================
  describe('POST /api/auth/change-password', () => {
    test('should change password with correct current password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/change-password',
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        payload: {
          currentPassword: testUser.password,
          newPassword: 'NewPassword123!'
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);

      // Update testUser password for future tests
      testUser.password = 'NewPassword123!';

      // Re-login to get new token
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          username: testUser.username,
          password: testUser.password
        }
      });
      const loginData = JSON.parse(loginResponse.body);
      authToken = loginData.token;
    });

    test('should reject with wrong current password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/change-password',
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        payload: {
          currentPassword: 'wrongpassword',
          newPassword: 'NewPassword456!'
        }
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.error).toContain('incorrect');
    });

    test('should reject with short new password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/change-password',
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        payload: {
          currentPassword: testUser.password,
          newPassword: '12345'
        }
      });

      expect(response.statusCode).toBe(400);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/change-password',
        payload: {
          currentPassword: 'oldpassword',
          newPassword: 'newpassword'
        }
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==================== PASSWORD RESET TESTS ====================
  describe('POST /api/auth/request-reset', () => {
    test('should return success for valid email without exposing token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/request-reset',
        payload: {
          email: testUser.email
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.resetToken).toBeUndefined(); // Token must NOT be in response
      expect(data.message).toBe('If the email exists, reset instructions will be sent');
    });

    test('should return success even for non-existent email (security)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/request-reset',
        payload: {
          email: 'nonexistent@example.com'
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });

    test('should reject with missing email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/request-reset',
        payload: {}
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let resetToken;

    beforeAll(async () => {
      // Generate a reset token directly via JWT (token is no longer exposed in API response)
      const user = app.db.db.prepare('SELECT id, email FROM users WHERE email = ?').get(testUser.email);
      resetToken = app.jwt.sign(
        { id: user.id, email: user.email, type: 'reset' },
        { expiresIn: '1h' }
      );
    });

    test('should reset password with valid token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/reset-password',
        payload: {
          resetToken: resetToken,
          newPassword: 'ResetPassword123!'
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);

      // Update password for future tests
      testUser.password = 'ResetPassword123!';
    });

    test('should reject with invalid token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/reset-password',
        payload: {
          resetToken: 'invalid_token_here',
          newPassword: 'NewPassword123!'
        }
      });

      expect(response.statusCode).toBe(500);
    });

    test('should reject with short new password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/reset-password',
        payload: {
          resetToken: resetToken,
          newPassword: '12345'
        }
      });

      expect(response.statusCode).toBe(400);
    });

    test('should reject with missing fields', async () => {
      // Missing resetToken
      let response = await app.inject({
        method: 'POST',
        url: '/api/auth/reset-password',
        payload: {
          newPassword: 'NewPassword123!'
        }
      });
      expect(response.statusCode).toBe(400);

      // Missing newPassword
      response = await app.inject({
        method: 'POST',
        url: '/api/auth/reset-password',
        payload: {
          resetToken: resetToken
        }
      });
      expect(response.statusCode).toBe(400);
    });
  });

  // ==================== VERIFY TOKEN TEST ====================
  describe('GET /api/auth/verify', () => {
    test('should verify valid token', async () => {
      // First login to get fresh token
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          username: testUser.username,
          password: testUser.password
        }
      });
      const loginData = JSON.parse(loginResponse.body);
      const freshToken = loginData.token;

      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/verify',
        headers: {
          Authorization: `Bearer ${freshToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.valid).toBe(true);
      expect(data.user).toBeDefined();
    });

    test('should reject invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/verify',
        headers: {
          Authorization: 'Bearer invalid_token'
        }
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
