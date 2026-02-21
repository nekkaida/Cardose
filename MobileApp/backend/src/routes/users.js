// User management routes
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

async function usersRoutes(fastify, options) {
  const db = fastify.db;

  // Get all users (requires authentication, owner/manager only)
  fastify.get(
    '/',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['owner', 'manager'])],
      schema: {
        querystring: {
          type: 'object',
          properties: {
            role: { type: 'string', enum: ['owner', 'manager', 'employee'] },
            is_active: { type: 'string', enum: ['true', 'false'] },
            search: { type: 'string' },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
            page: { type: 'integer', minimum: 1, default: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { role, is_active, search, limit, page } = request.query;

        let whereClause = ' WHERE 1=1';
        const params = [];

        if (role) {
          whereClause += ' AND role = ?';
          params.push(role);
        }
        if (is_active !== undefined) {
          whereClause += ' AND is_active = ?';
          params.push(is_active === 'true' ? 1 : 0);
        }
        if (search) {
          whereClause += ' AND (username LIKE ? OR email LIKE ? OR full_name LIKE ?)';
          const searchTerm = `%${search}%`;
          params.push(searchTerm, searchTerm, searchTerm);
        }

        // Get total count
        const countResult = db.db
          .prepare(`SELECT COUNT(*) as total FROM users${whereClause}`)
          .get(...params);
        const total = countResult ? countResult.total : 0;

        // Get paginated users
        const offset = (page - 1) * limit;
        const users = db.db
          .prepare(
            `SELECT id, username, email, full_name, phone, role, is_active, created_at, updated_at
           FROM users${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
          )
          .all(...params, limit, offset);

        // Get role counts using SQL aggregates
        const statsRow = db.db
          .prepare(
            `SELECT
            COUNT(*) as total,
            SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive,
            SUM(CASE WHEN role = 'owner' THEN 1 ELSE 0 END) as owners,
            SUM(CASE WHEN role = 'manager' THEN 1 ELSE 0 END) as managers,
            SUM(CASE WHEN role = 'employee' THEN 1 ELSE 0 END) as employees
          FROM users`
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
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          stats,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Get user by ID (requires authentication)
  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params;

      const user = db.db
        .prepare(
          `SELECT id, username, email, full_name, phone, role, is_active, created_at, updated_at
         FROM users WHERE id = ?`
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

  // Create user (owner/manager only)
  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['owner', 'manager'])],
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

        // Managers cannot create owner accounts
        if (role === 'owner' && request.user.role !== 'owner') {
          reply.code(403);
          return { success: false, error: 'Only owners can create owner accounts' };
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
            `INSERT INTO users (id, username, email, password_hash, full_name, phone, role, is_active, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`
          )
          .run(id, username, email, passwordHash, full_name, phone, role);

        const user = db.db
          .prepare(
            `SELECT id, username, email, full_name, phone, role, is_active, created_at
           FROM users WHERE id = ?`
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

  // Update user (owner/manager only)
  fastify.put(
    '/:id',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['owner', 'manager'])],
      schema: {
        body: {
          type: 'object',
          properties: {
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

        const existing = db.db.prepare('SELECT id, role FROM users WHERE id = ?').get(id);
        if (!existing) {
          reply.code(404);
          return { success: false, error: 'User not found' };
        }

        // Managers cannot promote to owner or edit owner accounts
        if (request.user.role !== 'owner') {
          if (existing.role === 'owner') {
            reply.code(403);
            return { success: false, error: 'Only owners can edit owner accounts' };
          }
          if (updates.role === 'owner') {
            reply.code(403);
            return { success: false, error: 'Only owners can assign the owner role' };
          }
        }

        // Check email uniqueness if being updated
        if (updates.email !== undefined) {
          const emailTaken = db.db
            .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
            .get(updates.email, id);
          if (emailTaken) {
            reply.code(409);
            return { success: false, error: 'Email already in use' };
          }
        }

        const fields = [];
        const values = [];

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
            `SELECT id, username, email, full_name, phone, role, is_active, created_at, updated_at
           FROM users WHERE id = ?`
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

  // Activate/Deactivate user (owner/manager only)
  fastify.patch(
    '/:id/status',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['owner', 'manager'])],
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

        // Prevent self-deactivation
        if (id === request.user.id && !is_active) {
          reply.code(400);
          return { success: false, error: 'You cannot deactivate your own account' };
        }

        const existing = db.db.prepare('SELECT id, role FROM users WHERE id = ?').get(id);
        if (!existing) {
          reply.code(404);
          return { success: false, error: 'User not found' };
        }

        // Managers cannot toggle owner status
        if (existing.role === 'owner' && request.user.role !== 'owner') {
          reply.code(403);
          return { success: false, error: 'Only owners can change owner account status' };
        }

        // Prevent deactivating the last active owner
        if (!is_active && existing.role === 'owner') {
          const activeOwners = db.db
            .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'owner' AND is_active = 1")
            .get();
          if (activeOwners.count <= 1) {
            reply.code(400);
            return { success: false, error: 'Cannot deactivate the last active owner' };
          }
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

        // Prevent self-deletion
        if (id === request.user.id) {
          reply.code(400);
          return { success: false, error: 'You cannot delete your own account' };
        }

        const existing = db.db.prepare('SELECT id, role FROM users WHERE id = ?').get(id);
        if (!existing) {
          reply.code(404);
          return { success: false, error: 'User not found' };
        }

        // Prevent deleting the last active owner
        if (existing.role === 'owner') {
          const activeOwners = db.db
            .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'owner' AND is_active = 1")
            .get();
          if (activeOwners.count <= 1) {
            reply.code(400);
            return { success: false, error: 'Cannot delete the last active owner' };
          }
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
