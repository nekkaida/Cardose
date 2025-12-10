// Authentication routes for Premium Gift Box backend - Using DatabaseService
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const DatabaseService = require('../services/DatabaseService');

async function authRoutes(fastify, options) {
  const db = new DatabaseService();
  db.initialize();

  // Define authenticate function for this scope
  const authenticate = async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Authentication required' });
    }
  };

  // Register route
  fastify.post('/register', async (request, reply) => {
    try {
      const { username, password, email, fullName, phone, role = 'employee' } = request.body;

      // Validation
      if (!username || !password || !email || !fullName) {
        return reply.status(400).send({
          error: 'Missing required fields: username, password, email, fullName'
        });
      }

      if (password.length < 6) {
        return reply.status(400).send({
          error: 'Password must be at least 6 characters long'
        });
      }

      // Check if user already exists
      const existingUser = db.db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
      if (existingUser) {
        return reply.status(409).send({
          error: 'Username or email already exists'
        });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const userId = uuidv4();
      const userRole = role === 'owner' || role === 'manager' ? role : 'employee';

      db.db.prepare(`
        INSERT INTO users (id, username, email, password_hash, role, full_name, phone, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      `).run(userId, username, email, passwordHash, userRole, fullName, phone || null);

      // Generate JWT token
      const token = fastify.jwt.sign({
        id: userId,
        username,
        email,
        role: userRole
      });

      return {
        success: true,
        message: 'User registered successfully',
        token,
        user: {
          id: userId,
          username,
          email,
          fullName,
          role: userRole
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Registration failed: ' + error.message });
    }
  });

  // Login route
  fastify.post('/login', async (request, reply) => {
    try {
      const { username, password } = request.body;

      if (!username || !password) {
        return reply.status(400).send({
          success: false,
          error: 'Username and password are required'
        });
      }

      // Get user from database
      const user = db.db.prepare('SELECT * FROM users WHERE username = ?').get(username);

      if (!user) {
        return reply.status(401).send({ success: false, error: 'Invalid username or password' });
      }

      if (!user.is_active) {
        return reply.status(403).send({ success: false, error: 'Account is deactivated' });
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatch) {
        return reply.status(401).send({ success: false, error: 'Invalid username or password' });
      }

      // Generate JWT token
      const token = fastify.jwt.sign({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      });

      return {
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          phone: user.phone,
          role: user.role
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ success: false, error: 'Login failed: ' + error.message });
    }
  });

  // Logout route (client-side token removal, optional server-side tracking)
  fastify.post('/logout', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    return {
      success: true,
      message: 'Logged out successfully'
    };
  });

  // Get current user profile (/me endpoint for test compatibility)
  fastify.get('/me', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const user = db.db.prepare('SELECT * FROM users WHERE id = ?').get(request.user.id);

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          phone: user.phone,
          role: user.role,
          isActive: user.is_active === 1,
          createdAt: user.created_at
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch profile' });
    }
  });

  // Get current user profile
  fastify.get('/profile', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const user = db.db.prepare('SELECT * FROM users WHERE id = ?').get(request.user.id);

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          phone: user.phone,
          role: user.role,
          isActive: user.is_active === 1,
          createdAt: user.created_at
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch profile' });
    }
  });

  // Update user profile
  fastify.put('/profile', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { fullName, email, phone } = request.body;
      const userId = request.user.id;

      const fields = [];
      const values = [];

      if (fullName) { fields.push('full_name = ?'); values.push(fullName); }
      if (email) { fields.push('email = ?'); values.push(email); }
      if (phone !== undefined) { fields.push('phone = ?'); values.push(phone); }

      if (fields.length === 0) {
        return reply.status(400).send({ error: 'No updates provided' });
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(userId);

      db.db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);

      return {
        success: true,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to update profile' });
    }
  });

  // Change password
  fastify.post('/change-password', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { currentPassword, newPassword } = request.body;

      if (!currentPassword || !newPassword) {
        return reply.status(400).send({
          error: 'Current password and new password are required'
        });
      }

      if (newPassword.length < 6) {
        return reply.status(400).send({
          error: 'New password must be at least 6 characters long'
        });
      }

      const user = db.db.prepare('SELECT * FROM users WHERE id = ?').get(request.user.id);

      // Verify current password
      const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);

      if (!passwordMatch) {
        return reply.status(401).send({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      db.db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newPasswordHash, user.id);

      return {
        success: true,
        message: 'Password changed successfully'
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to change password' });
    }
  });

  // Request password reset (generates reset token)
  fastify.post('/request-reset', async (request, reply) => {
    try {
      const { email } = request.body;

      if (!email) {
        return reply.status(400).send({ error: 'Email is required' });
      }

      const user = db.db.prepare('SELECT * FROM users WHERE email = ?').get(email);

      if (!user) {
        // Don't reveal if email exists for security
        return {
          success: true,
          message: 'If email exists, reset instructions will be sent'
        };
      }

      // Generate reset token (valid for 1 hour)
      const resetToken = fastify.jwt.sign(
        { id: user.id, email: user.email, type: 'reset' },
        { expiresIn: '1h' }
      );

      // In production, send email with reset link
      // For now, return token (for testing/development)
      return {
        success: true,
        message: 'Reset token generated',
        resetToken // Remove this in production, send via email instead
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to process reset request' });
    }
  });

  // Reset password with token
  fastify.post('/reset-password', async (request, reply) => {
    try {
      const { resetToken, newPassword } = request.body;

      if (!resetToken || !newPassword) {
        return reply.status(400).send({
          error: 'Reset token and new password are required'
        });
      }

      if (newPassword.length < 6) {
        return reply.status(400).send({
          error: 'Password must be at least 6 characters long'
        });
      }

      // Verify reset token
      const decoded = fastify.jwt.verify(resetToken);

      if (decoded.type !== 'reset') {
        return reply.status(400).send({ error: 'Invalid reset token' });
      }

      // Hash new password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      db.db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(passwordHash, decoded.id);

      return {
        success: true,
        message: 'Password reset successfully'
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return reply.status(400).send({ error: 'Reset token has expired' });
      }
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to reset password' });
    }
  });

  // Verify JWT token (for debugging/testing)
  fastify.get('/verify', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    return {
      valid: true,
      user: request.user
    };
  });
}

// Add authenticate decorator globally
async function authenticateDecorator(fastify, options) {
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Authentication required' });
    }
  });

  // Add role-based authorization decorator
  fastify.decorate('authorize', (roles) => {
    return async function (request, reply) {
      try {
        await request.jwtVerify();

        if (!roles.includes(request.user.role)) {
          reply.status(403).send({ error: 'Insufficient permissions' });
        }
      } catch (err) {
        reply.status(401).send({ error: 'Authentication required' });
      }
    };
  });
}

module.exports = authRoutes;
module.exports.authenticateDecorator = authenticateDecorator;
