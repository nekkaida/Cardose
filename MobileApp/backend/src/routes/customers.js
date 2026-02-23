// Customer management routes - Using DatabaseService
const { v4: uuidv4 } = require('uuid');
const { parsePagination } = require('../utils/pagination');

const VALID_BUSINESS_TYPES = ['corporate', 'individual', 'wedding', 'trading', 'event'];
const VALID_LOYALTY_STATUSES = ['new', 'regular', 'vip'];

async function customerRoutes(fastify, options) {
  const db = fastify.db;

  const logAudit = (userId, action, entityType, entityId, details = null) => {
    try {
      db.db
        .prepare(
          `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, created_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
        )
        .run(
          uuidv4(),
          userId,
          action,
          entityType,
          entityId,
          details ? JSON.stringify(details) : null
        );
    } catch {
      // Audit logging should not break the request
    }
  };

  // Get all customers (requires authentication)
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { search, business_type, loyalty_status, sort_by, sort_order } = request.query;
      const { limit, page, offset } = parsePagination(request.query);

      let whereClause = 'WHERE 1=1';
      const params = [];

      if (search) {
        whereClause += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (business_type) {
        whereClause += ' AND business_type = ?';
        params.push(business_type);
      }

      if (loyalty_status) {
        whereClause += ' AND loyalty_status = ?';
        params.push(loyalty_status);
      }

      // Dynamic sorting with whitelist to prevent SQL injection
      const allowedSortColumns = {
        name: 'name',
        email: 'email',
        business_type: 'business_type',
        loyalty_status: 'loyalty_status',
        total_orders: 'total_orders',
        total_spent: 'total_spent',
        created_at: 'created_at',
      };
      const sortColumn = allowedSortColumns[sort_by] || 'created_at';
      const sortDirection = sort_order === 'asc' ? 'ASC' : 'DESC';

      // Count query (no ORDER BY needed)
      const countResult = db.db
        .prepare(`SELECT COUNT(*) as total FROM customers ${whereClause}`)
        .get(...params);
      const total = countResult ? countResult.total : 0;

      // Data query with sort + pagination
      const dataQuery = `SELECT * FROM customers ${whereClause} ORDER BY ${sortColumn} ${sortDirection} LIMIT ? OFFSET ?`;
      const customers = db.db.prepare(dataQuery).all(...params, limit, offset);

      // Calculate stats using SQL aggregates (respects filters)
      const statsRow = db.db
        .prepare(
          `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN business_type = 'corporate' THEN 1 ELSE 0 END) as corporate,
          SUM(CASE WHEN business_type = 'wedding' THEN 1 ELSE 0 END) as wedding,
          SUM(CASE WHEN business_type = 'individual' THEN 1 ELSE 0 END) as individual,
          SUM(CASE WHEN business_type = 'trading' THEN 1 ELSE 0 END) as trading,
          SUM(CASE WHEN business_type = 'event' THEN 1 ELSE 0 END) as event,
          COALESCE(SUM(total_spent), 0) as totalValue,
          SUM(CASE WHEN loyalty_status = 'new' THEN 1 ELSE 0 END) as loyalty_new,
          SUM(CASE WHEN loyalty_status = 'regular' THEN 1 ELSE 0 END) as loyalty_regular,
          SUM(CASE WHEN loyalty_status = 'vip' THEN 1 ELSE 0 END) as loyalty_vip
        FROM customers ${whereClause}
      `
        )
        .get(...params);
      const stats = {
        corporate: statsRow.corporate,
        wedding: statsRow.wedding,
        trading: statsRow.trading,
        individual: statsRow.individual,
        event: statsRow.event,
        totalValue: statsRow.totalValue,
        loyalty_new: statsRow.loyalty_new,
        loyalty_regular: statsRow.loyalty_regular,
        loyalty_vip: statsRow.loyalty_vip,
      };

      return {
        success: true,
        customers,
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
  });

  // Create customer (requires authentication)
  fastify.post(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            email: { type: 'string', maxLength: 255 },
            phone: { type: 'string', maxLength: 25 },
            address: { type: 'string', maxLength: 500 },
            notes: { type: 'string', maxLength: 2000 },
            business_type: { type: 'string' },
            loyalty_status: { type: 'string' },
          },
        },
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { name, email, phone, address, business_type, loyalty_status = 'new' } = request.body;

        if (!name) {
          reply.code(400);
          return { success: false, error: 'Customer name is required' };
        }

        if (business_type && !VALID_BUSINESS_TYPES.includes(business_type)) {
          reply.code(400);
          return {
            success: false,
            error: `Invalid business type. Must be one of: ${VALID_BUSINESS_TYPES.join(', ')}`,
          };
        }

        if (!VALID_LOYALTY_STATUSES.includes(loyalty_status)) {
          reply.code(400);
          return {
            success: false,
            error: `Invalid loyalty status. Must be one of: ${VALID_LOYALTY_STATUSES.join(', ')}`,
          };
        }

        const id = uuidv4();
        const stmt = db.db.prepare(`
        INSERT INTO customers (id, name, email, phone, address, business_type, loyalty_status, total_orders, total_spent)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)
      `);
        stmt.run(id, name, email, phone, address, business_type, loyalty_status);

        const customer = db.db.prepare('SELECT * FROM customers WHERE id = ?').get(id);

        logAudit(request.user.id, 'create', 'customer', id, { name });

        reply.code(201);
        return {
          success: true,
          message: 'Customer created successfully',
          customerId: id,
          customer,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Get customer by ID (requires authentication)
  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params;
      const customer = db.db.prepare('SELECT * FROM customers WHERE id = ?').get(id);

      if (!customer) {
        reply.code(404);
        return { success: false, error: 'Customer not found' };
      }

      // Get customer orders
      const orders = db.db
        .prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 10')
        .all(id);

      return {
        success: true,
        customer: {
          ...customer,
          recentOrders: orders,
        },
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Update customer (requires authentication)
  fastify.put(
    '/:id',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            email: { type: 'string', maxLength: 255 },
            phone: { type: 'string', maxLength: 25 },
            address: { type: 'string', maxLength: 500 },
            notes: { type: 'string', maxLength: 2000 },
            business_type: { type: 'string' },
            loyalty_status: { type: 'string' },
          },
        },
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const updates = request.body;

        const existing = db.db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
        if (!existing) {
          reply.code(404);
          return { success: false, error: 'Customer not found' };
        }

        const fields = [];
        const values = [];

        if (updates.name !== undefined) {
          if (typeof updates.name === 'string' && !updates.name.trim()) {
            reply.code(400);
            return { success: false, error: 'Customer name cannot be empty' };
          }
          fields.push('name = ?');
          values.push(updates.name);
        }
        if (updates.email !== undefined) {
          fields.push('email = ?');
          values.push(updates.email);
        }
        if (updates.phone !== undefined) {
          fields.push('phone = ?');
          values.push(updates.phone);
        }
        if (updates.address !== undefined) {
          fields.push('address = ?');
          values.push(updates.address);
        }
        if (updates.business_type !== undefined) {
          if (!VALID_BUSINESS_TYPES.includes(updates.business_type)) {
            reply.code(400);
            return {
              success: false,
              error: `Invalid business type. Must be one of: ${VALID_BUSINESS_TYPES.join(', ')}`,
            };
          }
          fields.push('business_type = ?');
          values.push(updates.business_type);
        }
        if (updates.loyalty_status !== undefined) {
          if (!VALID_LOYALTY_STATUSES.includes(updates.loyalty_status)) {
            reply.code(400);
            return {
              success: false,
              error: `Invalid loyalty status. Must be one of: ${VALID_LOYALTY_STATUSES.join(', ')}`,
            };
          }
          fields.push('loyalty_status = ?');
          values.push(updates.loyalty_status);
        }
        if (updates.notes !== undefined) {
          fields.push('notes = ?');
          values.push(updates.notes);
        }

        if (fields.length === 0) {
          return { success: true, message: 'No changes made', customer: existing };
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        const query = `UPDATE customers SET ${fields.join(', ')} WHERE id = ?`;
        db.db.prepare(query).run(...values);

        const customer = db.db.prepare('SELECT * FROM customers WHERE id = ?').get(id);

        logAudit(request.user.id, 'update', 'customer', id, {
          fields: Object.keys(updates).filter((k) => updates[k] !== undefined),
        });

        return {
          success: true,
          message: 'Customer updated successfully',
          customer,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Delete customer (requires authentication)
  fastify.delete(
    '/:id',
    { preHandler: [fastify.authenticate, fastify.authorize(['owner', 'manager'])] },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const existing = db.db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
        if (!existing) {
          reply.code(404);
          return { success: false, error: 'Customer not found' };
        }

        const relatedOrders = db.db
          .prepare('SELECT COUNT(*) as count FROM orders WHERE customer_id = ?')
          .get(id);
        if (relatedOrders.count > 0) {
          reply.code(409);
          return {
            success: false,
            error: `Cannot delete customer with ${relatedOrders.count} existing order(s). Delete or reassign orders first.`,
          };
        }

        db.db.prepare('DELETE FROM customers WHERE id = ?').run(id);

        logAudit(request.user.id, 'delete', 'customer', id, { name: existing.name });

        return {
          success: true,
          message: 'Customer deleted successfully',
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Get customer communications (requires authentication)
  fastify.get(
    '/:id/communications',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { type } = request.query;
        const limit = Math.min(Math.max(parseInt(request.query.limit) || 50, 1), 200);

        // Check if customer exists
        const customer = db.db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
        if (!customer) {
          reply.code(404);
          return { success: false, error: 'Customer not found' };
        }

        let query = 'SELECT * FROM communication_messages WHERE customer_id = ?';
        const params = [id];

        if (type) {
          query += ' AND type = ?';
          params.push(type);
        }

        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);

        const communications = db.db.prepare(query).all(...params);

        return {
          success: true,
          communications,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Create customer communication (requires authentication)
  fastify.post(
    '/:id/communications',
    {
      schema: {
        body: {
          type: 'object',
          required: ['type', 'content'],
          properties: {
            type: { type: 'string' },
            direction: { type: 'string' },
            subject: { type: 'string', maxLength: 500 },
            content: { type: 'string', maxLength: 10000 },
          },
        },
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { type, direction = 'outbound', subject, content } = request.body;

        // Check if customer exists
        const customer = db.db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
        if (!customer) {
          reply.code(404);
          return { success: false, error: 'Customer not found' };
        }

        if (!type || !content) {
          reply.code(400);
          return { success: false, error: 'Type and content are required' };
        }

        const validTypes = ['email', 'whatsapp', 'sms'];
        if (!validTypes.includes(type)) {
          reply.code(400);
          return {
            success: false,
            error: 'Invalid communication type. Must be email, whatsapp, or sms',
          };
        }

        const validDirections = ['inbound', 'outbound'];
        if (!validDirections.includes(direction)) {
          reply.code(400);
          return { success: false, error: 'Invalid direction. Must be inbound or outbound' };
        }

        const commId = uuidv4();
        db.db
          .prepare(
            `
        INSERT INTO communication_messages (id, customer_id, type, direction, subject, content, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
      `
          )
          .run(commId, id, type, direction, subject, content, request.user.id);

        const communication = db.db
          .prepare('SELECT * FROM communication_messages WHERE id = ?')
          .get(commId);

        logAudit(request.user.id, 'create', 'communication', commId, { customer_id: id, type });

        reply.code(201);
        return {
          success: true,
          message: 'Communication created successfully',
          communicationId: commId,
          communication,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );
}

module.exports = customerRoutes;
