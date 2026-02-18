// Authentication routes for Premium Gift Box backend - Using DatabaseService
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const EmailService = require('../services/EmailService');

async function authRoutes(fastify, options) {
  const db = fastify.db;
  const emailService = new EmailService();

  // Register route
  fastify.post('/register', {
    config: {
      rateLimit: {
        max: 3,
        timeWindow: '1 minute'
      }
    },
    schema: {
      body: {
        type: 'object',
        required: ['username', 'password', 'email', 'fullName'],
        properties: {
          username: { type: 'string', minLength: 3 },
          password: { type: 'string', minLength: 8 },
          email: { type: 'string', format: 'email' },
          fullName: { type: 'string', minLength: 1 },
          phone: { type: 'string' }
        },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    try {
      const { username, password, email, fullName, phone } = request.body;

      // Validation
      if (!username || !password || !email || !fullName) {
        return reply.status(400).send({
          error: 'Missing required fields: username, password, email, fullName'
        });
      }

      if (password.length < 8) {
        return reply.status(400).send({
          error: 'Password must be at least 8 characters long'
        });
      }
      if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        return reply.status(400).send({
          error: 'Password must contain uppercase, lowercase, and a number'
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
      const userRole = 'employee'; // Only admins can assign elevated roles via /api/users

      db.db.prepare(`
        INSERT INTO users (id, username, email, password_hash, role, full_name, phone, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      `).run(userId, username, email, passwordHash, userRole, fullName, phone || null);

      // Generate JWT token
      const token = fastify.jwt.sign({
        id: userId,
        username,
        email,
        role: userRole,
        jti: crypto.randomUUID()
      }, { expiresIn: '24h' });

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
      reply.status(500).send({ success: false, error: 'An internal error occurred' });
    }
  });

  // Login route
  fastify.post('/login', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute'
      }
    },
    schema: {
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' }
        },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
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
        role: user.role,
        jti: crypto.randomUUID()
      }, { expiresIn: '24h' });

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
      reply.status(500).send({ success: false, error: 'An internal error occurred' });
    }
  });

  // Logout route (server-side token blacklisting)
  fastify.post('/logout', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      db.db.prepare('INSERT OR IGNORE INTO revoked_tokens (token_jti, user_id, expires_at) VALUES (?, ?, datetime(?, \'unixepoch\'))').run(request.user.jti, request.user.id, request.user.exp);
    } catch (error) {
      fastify.log.error('Failed to revoke token:', error);
    }
    return {
      success: true,
      message: 'Logged out successfully'
    };
  });

  // Get current user profile
  fastify.get('/profile', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const user = db.db.prepare('SELECT id, username, email, full_name, phone, role, avatar_url, is_active, created_at, updated_at FROM users WHERE id = ?').get(request.user.id);

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
    schema: {
      body: {
        type: 'object',
        properties: {
          fullName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' }
        },
        additionalProperties: false
      }
    },
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { fullName, email, phone } = request.body;
      const userId = request.user.id;

      if (email) {
        const existing = db.db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, userId);
        if (existing) {
          return reply.status(409).send({ error: 'Email is already in use' });
        }
      }

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
    schema: {
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 8 }
        },
        additionalProperties: false
      }
    },
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { currentPassword, newPassword } = request.body;

      if (!currentPassword || !newPassword) {
        return reply.status(400).send({
          error: 'Current password and new password are required'
        });
      }

      if (newPassword.length < 8) {
        return reply.status(400).send({
          error: 'Password must be at least 8 characters long'
        });
      }
      if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        return reply.status(400).send({
          error: 'Password must contain uppercase, lowercase, and a number'
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
  fastify.post('/request-reset', {
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' }
        },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    try {
      const { email } = request.body;

      if (!email) {
        return reply.status(400).send({ error: 'Email is required' });
      }

      const user = db.db.prepare('SELECT id, email, full_name FROM users WHERE email = ?').get(email);

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

      // Store token hash in database for verification
      const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      db.db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = datetime(\'now\', \'+1 hour\'), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(tokenHash, user.id);

      // Send reset token via email
      try {
        const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
        await emailService.sendEmail(
          user.email,
          'Password Reset - Premium Gift Box',
          `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#2C5530;color:white;padding:20px;text-align:center"><h1>Premium Gift Box</h1></div>
            <div style="padding:20px;background:#f9f9f9">
              <h2>Password Reset Request</h2>
              <p>Hi ${user.full_name},</p>
              <p>We received a request to reset your password. Click the link below to set a new password:</p>
              <p><a href="${resetUrl}" style="background:#2C5530;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;display:inline-block">Reset Password</a></p>
              <p>This link expires in 1 hour. If you did not request this, please ignore this email.</p>
              <p>Best regards,<br>Premium Gift Box Team</p>
            </div>
          </div>`
        );
      } catch (emailError) {
        fastify.log.error('Failed to send password reset email:', emailError);
      }

      return {
        success: true,
        message: 'If the email exists, reset instructions will be sent'
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to process reset request' });
    }
  });

  // Reset password with token
  fastify.post('/reset-password', {
    schema: {
      body: {
        type: 'object',
        required: ['resetToken', 'newPassword'],
        properties: {
          resetToken: { type: 'string' },
          newPassword: { type: 'string', minLength: 8 }
        },
        additionalProperties: false
      }
    }
  }, async (request, reply) => {
    try {
      const { resetToken, newPassword } = request.body;

      if (!resetToken || !newPassword) {
        return reply.status(400).send({
          error: 'Reset token and new password are required'
        });
      }

      if (newPassword.length < 8) {
        return reply.status(400).send({
          error: 'Password must be at least 8 characters long'
        });
      }
      if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        return reply.status(400).send({
          error: 'Password must contain uppercase, lowercase, and a number'
        });
      }

      // Verify reset token
      const decoded = fastify.jwt.verify(resetToken);

      if (decoded.type !== 'reset') {
        return reply.status(400).send({ error: 'Invalid reset token' });
      }

      // Verify token exists in DB and hasn't expired
      const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const user = db.db.prepare('SELECT * FROM users WHERE id = ? AND reset_token = ? AND reset_token_expires > datetime(\'now\')').get(decoded.id, tokenHash);
      if (!user) {
        return reply.status(400).send({ error: 'Invalid or expired reset token' });
      }

      // Hash new password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      db.db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(passwordHash, decoded.id);

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
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    return {
      valid: true,
      user: request.user
    };
  });
}

module.exports = authRoutes;
