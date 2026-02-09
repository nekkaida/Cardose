// Customer management routes - Using DatabaseService
const { v4: uuidv4 } = require('uuid');

async function customerRoutes(fastify, options) {
  const db = fastify.db;

  // Get all customers (requires authentication)
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      function parsePagination(query) {
        const limit = Math.min(Math.max(parseInt(query.limit) || 50, 1), 200);
        const page = Math.max(parseInt(query.page) || 1, 1);
        const offset = (page - 1) * limit;
        return { limit, page, offset };
      }

      const { search, business_type, loyalty_status } = request.query;
      const { limit, page, offset } = parsePagination(request.query);

      let query = 'SELECT * FROM customers WHERE 1=1';
      const params = [];

      if (search) {
        query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (business_type) {
        query += ' AND business_type = ?';
        params.push(business_type);
      }

      if (loyalty_status) {
        query += ' AND loyalty_status = ?';
        params.push(loyalty_status);
      }

      query += ' ORDER BY created_at DESC';

      // Get total count
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
      const countResult = db.db.prepare(countQuery).get(...params);
      const total = countResult ? countResult.total : 0;

      // Add pagination
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const customers = db.db.prepare(query).all(...params);

      // Calculate stats using SQL aggregates
      const statsRow = db.db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN business_type = 'corporate' THEN 1 ELSE 0 END) as corporate,
          SUM(CASE WHEN business_type = 'wedding' THEN 1 ELSE 0 END) as wedding,
          SUM(CASE WHEN business_type = 'individual' THEN 1 ELSE 0 END) as individual,
          SUM(CASE WHEN business_type = 'event' THEN 1 ELSE 0 END) as event,
          COALESCE(SUM(total_spent), 0) as totalValue
        FROM customers
      `).get();
      const stats = {
        corporate: statsRow.corporate,
        wedding: statsRow.wedding,
        individual: statsRow.individual,
        event: statsRow.event,
        totalValue: statsRow.totalValue
      };

      return {
        success: true,
        customers,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        stats
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Create customer (requires authentication)
  fastify.post('/', {
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1 },
          business_type: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          address: { type: 'string' },
          loyalty_status: { type: 'string' }
        },
        additionalProperties: false
      }
    },
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { name, email, phone, business_type, loyalty_status = 'new' } = request.body;

      if (!name) {
        reply.code(400);
        return { success: false, error: 'Customer name is required' };
      }

      const id = uuidv4();
      const stmt = db.db.prepare(`
        INSERT INTO customers (id, name, email, phone, business_type, loyalty_status, total_orders, total_spent)
        VALUES (?, ?, ?, ?, ?, ?, 0, 0)
      `);
      stmt.run(id, name, email, phone, business_type, loyalty_status);

      const customer = db.db.prepare('SELECT * FROM customers WHERE id = ?').get(id);

      return {
        success: true,
        message: 'Customer created successfully',
        customerId: id,
        customer
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

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
      const orders = db.db.prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 10').all(id);

      return {
        success: true,
        customer: {
          ...customer,
          recentOrders: orders
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Update customer (requires authentication)
  fastify.put('/:id', {
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          business_type: { type: 'string' },
          loyalty_status: { type: 'string' }
        },
        additionalProperties: false
      }
    },
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
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

      if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
      if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email); }
      if (updates.phone !== undefined) { fields.push('phone = ?'); values.push(updates.phone); }
      if (updates.business_type !== undefined) { fields.push('business_type = ?'); values.push(updates.business_type); }
      if (updates.loyalty_status !== undefined) { fields.push('loyalty_status = ?'); values.push(updates.loyalty_status); }

      if (fields.length === 0) {
        return { success: true, message: 'No changes made' };
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      const query = `UPDATE customers SET ${fields.join(', ')} WHERE id = ?`;
      db.db.prepare(query).run(...values);

      const customer = db.db.prepare('SELECT * FROM customers WHERE id = ?').get(id);

      return {
        success: true,
        message: 'Customer updated successfully',
        customer
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Delete customer (requires authentication)
  fastify.delete('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['owner', 'manager'])] }, async (request, reply) => {
    try {
      const { id } = request.params;

      const existing = db.db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
      if (!existing) {
        reply.code(404);
        return { success: false, error: 'Customer not found' };
      }

      db.db.prepare('DELETE FROM customers WHERE id = ?').run(id);

      return {
        success: true,
        message: 'Customer deleted successfully'
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get customer communications (requires authentication)
  fastify.get('/:id/communications', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { type, limit = 50 } = request.query;

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
      params.push(parseInt(limit));

      const communications = db.db.prepare(query).all(...params);

      return {
        success: true,
        communications
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Create customer communication (requires authentication)
  fastify.post('/:id/communications', { preHandler: [fastify.authenticate] }, async (request, reply) => {
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
        return { success: false, error: 'Invalid communication type. Must be email, whatsapp, or sms' };
      }

      const commId = uuidv4();
      db.db.prepare(`
        INSERT INTO communication_messages (id, customer_id, type, direction, subject, content, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
      `).run(commId, id, type, direction, subject, content, request.user.id);

      const communication = db.db.prepare('SELECT * FROM communication_messages WHERE id = ?').get(commId);

      return {
        success: true,
        message: 'Communication created successfully',
        communicationId: commId,
        communication
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });
}

module.exports = customerRoutes;
