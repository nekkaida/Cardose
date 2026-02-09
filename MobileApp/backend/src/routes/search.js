// Global search routes - Using DatabaseService
async function searchRoutes(fastify, options) {
  const db = fastify.db;

  // Global search (requires authentication)
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { q, query, type, limit = 20 } = request.query;

      const searchQuery = q || query;
      if (!searchQuery) {
        return {
          success: true,
          results: {
            customers: [],
            orders: [],
            invoices: [],
            inventory: []
          },
          total: 0
        };
      }

      const searchTerm = `%${searchQuery}%`;
      const results = {};
      let total = 0;

      // Search customers
      if (!type || type === 'customers') {
        const customers = db.db.prepare(`
          SELECT id, name, email, phone, business_type, loyalty_status, total_spent
          FROM customers
          WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?
          ORDER BY total_spent DESC
          LIMIT ?
        `).all(searchTerm, searchTerm, searchTerm, parseInt(limit));
        results.customers = customers;
        total += customers.length;
      }

      // Search orders
      if (!type || type === 'orders') {
        const orders = db.db.prepare(`
          SELECT o.id, o.order_number, o.status, o.priority, o.total_amount, o.created_at, c.name as customer_name
          FROM orders o
          LEFT JOIN customers c ON o.customer_id = c.id
          WHERE o.order_number LIKE ? OR c.name LIKE ?
          ORDER BY o.created_at DESC
          LIMIT ?
        `).all(searchTerm, searchTerm, parseInt(limit));
        results.orders = orders;
        total += orders.length;
      }

      // Search invoices
      if (!type || type === 'invoices') {
        const invoices = db.db.prepare(`
          SELECT i.id, i.invoice_number, i.status, i.total_amount, i.issue_date, c.name as customer_name
          FROM invoices i
          LEFT JOIN customers c ON i.customer_id = c.id
          WHERE i.invoice_number LIKE ? OR c.name LIKE ?
          ORDER BY i.issue_date DESC
          LIMIT ?
        `).all(searchTerm, searchTerm, parseInt(limit));
        results.invoices = invoices;
        total += invoices.length;
      }

      // Search inventory
      if (!type || type === 'inventory') {
        const inventory = db.db.prepare(`
          SELECT id, name, category, supplier, current_stock, reorder_level
          FROM inventory_materials
          WHERE name LIKE ? OR supplier LIKE ?
          ORDER BY name ASC
          LIMIT ?
        `).all(searchTerm, searchTerm, parseInt(limit));
        results.inventory = inventory;
        total += inventory.length;
      }

      return {
        success: true,
        query: searchQuery,
        results,
        total
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Advanced order search (requires authentication)
  fastify.post('/orders', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const {
        customer_id,
        status,
        priority,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        boxType,
        limit = 50
      } = request.body;

      let query = `
        SELECT o.*, c.name as customer_name
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE 1=1
      `;
      const params = [];

      if (customer_id) {
        query += ' AND o.customer_id = ?';
        params.push(customer_id);
      }
      if (status) {
        query += ' AND o.status = ?';
        params.push(status);
      }
      if (priority) {
        query += ' AND o.priority = ?';
        params.push(priority);
      }
      if (startDate) {
        query += ' AND DATE(o.created_at) >= ?';
        params.push(startDate);
      }
      if (endDate) {
        query += ' AND DATE(o.created_at) <= ?';
        params.push(endDate);
      }
      if (minAmount) {
        query += ' AND o.total_amount >= ?';
        params.push(parseFloat(minAmount));
      }
      if (maxAmount) {
        query += ' AND o.total_amount <= ?';
        params.push(parseFloat(maxAmount));
      }
      if (boxType) {
        query += ' AND o.box_type = ?';
        params.push(boxType);
      }

      query += ' ORDER BY o.created_at DESC LIMIT ?';
      params.push(parseInt(limit));

      const orders = db.db.prepare(query).all(...params);

      return {
        success: true,
        orders,
        total: orders.length
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });

  // Search customers (requires authentication)
  fastify.get('/customers', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { q, business_type, loyalty_status, limit = 20 } = request.query;

      let query = 'SELECT * FROM customers WHERE 1=1';
      const params = [];

      if (q) {
        query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
        const searchTerm = `%${q}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
      if (business_type) {
        query += ' AND business_type = ?';
        params.push(business_type);
      }
      if (loyalty_status) {
        query += ' AND loyalty_status = ?';
        params.push(loyalty_status);
      }

      query += ' ORDER BY total_spent DESC LIMIT ?';
      params.push(parseInt(limit));

      const customers = db.db.prepare(query).all(...params);

      return {
        success: true,
        customers,
        total: customers.length
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });
}

module.exports = searchRoutes;
