// Customer management routes - Using DatabaseService
const DatabaseService = require('../services/DatabaseService');
const { v4: uuidv4 } = require('uuid');

async function customerRoutes(fastify, options) {
  const db = new DatabaseService();
  db.initialize();

  // Get all customers (requires authentication)
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { search, business_type, loyalty_status, limit = 100, page = 1 } = request.query;

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
      const offset = (page - 1) * limit;
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);

      const customers = db.db.prepare(query).all(...params);

      // Calculate stats
      const allCustomers = db.db.prepare('SELECT business_type, total_spent FROM customers').all();
      const stats = {
        corporate: allCustomers.filter(c => c.business_type === 'corporate').length,
        wedding: allCustomers.filter(c => c.business_type === 'wedding').length,
        individual: allCustomers.filter(c => c.business_type === 'individual').length,
        event: allCustomers.filter(c => c.business_type === 'event').length,
        totalValue: allCustomers.reduce((sum, c) => sum + (c.total_spent || 0), 0)
      };

      return {
        success: true,
        customers,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
        stats
      };
    } catch (error) {
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Create customer
  fastify.post('/', async (request, reply) => {
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
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Get customer by ID
  fastify.get('/:id', async (request, reply) => {
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
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Update customer
  fastify.put('/:id', async (request, reply) => {
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
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Delete customer
  fastify.delete('/:id', async (request, reply) => {
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
      reply.code(500);
      return { success: false, error: error.message };
    }
  });
}

module.exports = customerRoutes;
