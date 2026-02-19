// User management routes - Using DatabaseService
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const DatabaseService = require('../services/DatabaseService');

async function usersRoutes(fastify, options) {
  const db = new DatabaseService();
  db.initialize();

  // Get all users (requires authentication)
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { role, is_active, search, limit = 100, page = 1 } = request.query;

      let query = `
        SELECT id, username, email, full_name, phone, role, is_active, created_at, updated_at
        FROM users WHERE 1=1
      `;
      const params = [];

      if (role) {
        query += ' AND role = ?';
        params.push(role);
      }
      if (is_active !== undefined) {
        query += ' AND is_active = ?';
        params.push(is_active === 'true' ? 1 : 0);
      }
      if (search) {
        query += ' AND (username LIKE ? OR email LIKE ? OR full_name LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      query += ' ORDER BY created_at DESC';

      // Get total count
      const countQuery = query.replace(
        /SELECT id, username, email, full_name, phone, role, is_active, created_at, updated_at/,
        'SELECT COUNT(*) as total'
      );
      const countResult = db.db.prepare(countQuery).get(...params);
      const total = countResult ? countResult.total : 0;

      // Add pagination
      const offset = (page - 1) * limit;
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);

      const users = db.db.prepare(query).all(...params);

      // Get role counts using SQL aggregates
      const statsRow = db.db
        .prepare(
          `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive,
          SUM(CASE WHEN role = 'owner' THEN 1 ELSE 0 END) as owners,
          SUM(CASE WHEN role = 'manager' THEN 1 ELSE 0 END) as managers,
          SUM(CASE WHEN role = 'employee' THEN 1 ELSE 0 END) as employees
        FROM users
      `
        )
        .get();
      const stats = {
        total: statsRow.total,
        active: statsRow.active,
        inactive: statsRow.inactive,
        byRole: {
          owner: statsRow.owners,
          manager: statsRow.managers,
          employee: statsRow.employees,
        },
      };

      return {
        success: true,
        users,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
        stats,
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get user by ID (requires authentication)
  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params;

      const user = db.db
        .prepare(
          `
        SELECT id, username, email, full_name, phone, role, is_active, created_at, updated_at
        FROM users WHERE id = ?
      `
        )
        .get(id);

      if (!user) {
        reply.code(404);
        return { success: false, error: 'User not found' };
      }

      return { success: true, user };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Create user (requires authentication)
  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['username', 'email', 'password', 'full_name'],
          properties: {
            username: { type: 'string', minLength: 3 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            full_name: { type: 'string', minLength: 1 },
            phone: { type: 'string' },
            role: { type: 'string', enum: ['owner', 'manager', 'employee'] },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { username, email, password, full_name, phone, role = 'employee' } = request.body;

        if (!username || !email || !password || !full_name) {
          reply.code(400);
          return { success: false, error: 'Username, email, password, and full_name are required' };
        }

        // Check if user exists
        const existing = db.db
          .prepare('SELECT id FROM users WHERE username = ? OR email = ?')
          .get(username, email);
        if (existing) {
          reply.code(409);
          return { success: false, error: 'Username or email already exists' };
        }

        const id = uuidv4();
        const passwordHash = await bcrypt.hash(password, 10);

        db.db
          .prepare(
            `
        INSERT INTO users (id, username, email, password_hash, full_name, phone, role, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      `
          )
          .run(id, username, email, passwordHash, full_name, phone, role);

        const user = db.db
          .prepare(
            `
        SELECT id, username, email, full_name, phone, role, is_active, created_at
        FROM users WHERE id = ?
      `
          )
          .get(id);

        return {
          success: true,
          message: 'User created successfully',
          userId: id,
          user,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Update user (requires authentication)
  fastify.put(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          properties: {
            username: { type: 'string' },
            email: { type: 'string' },
            full_name: { type: 'string' },
            phone: { type: 'string' },
            role: { type: 'string', enum: ['owner', 'manager', 'employee'] },
            is_active: { type: 'boolean' },
            password: { type: 'string', minLength: 6 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const updates = request.body;

        const existing = db.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        if (!existing) {
          reply.code(404);
          return { success: false, error: 'User not found' };
        }

        const fields = [];
        const values = [];

        if (updates.username !== undefined) {
          fields.push('username = ?');
          values.push(updates.username);
        }
        if (updates.email !== undefined) {
          fields.push('email = ?');
          values.push(updates.email);
        }
        if (updates.full_name !== undefined) {
          fields.push('full_name = ?');
          values.push(updates.full_name);
        }
        if (updates.phone !== undefined) {
          fields.push('phone = ?');
          values.push(updates.phone);
        }
        if (updates.role !== undefined) {
          fields.push('role = ?');
          values.push(updates.role);
        }
        if (updates.is_active !== undefined) {
          fields.push('is_active = ?');
          values.push(updates.is_active ? 1 : 0);
        }
        if (updates.password) {
          const passwordHash = await bcrypt.hash(updates.password, 10);
          fields.push('password_hash = ?');
          values.push(passwordHash);
        }

        if (fields.length === 0) {
          return { success: true, message: 'No changes made' };
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        db.db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);

        const user = db.db
          .prepare(
            `
        SELECT id, username, email, full_name, phone, role, is_active, created_at, updated_at
        FROM users WHERE id = ?
      `
          )
          .get(id);

        return { success: true, message: 'User updated successfully', user };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Activate/Deactivate user (requires authentication)
  fastify.patch(
    '/:id/status',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['is_active'],
          properties: {
            is_active: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { is_active } = request.body;

        const existing = db.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        if (!existing) {
          reply.code(404);
          return { success: false, error: 'User not found' };
        }

        db.db
          .prepare('UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(is_active ? 1 : 0, id);

        return {
          success: true,
          message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Delete user (owner only)
  fastify.delete(
    '/:id',
    { preHandler: [fastify.authenticate, fastify.authorize(['owner'])] },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const existing = db.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        if (!existing) {
          reply.code(404);
          return { success: false, error: 'User not found' };
        }

        db.db.prepare('DELETE FROM users WHERE id = ?').run(id);

        return { success: true, message: 'User deleted successfully' };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );
}

module.exports = usersRoutes;
