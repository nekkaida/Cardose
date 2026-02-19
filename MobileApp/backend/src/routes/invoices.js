// Invoice routes (separate from financial)
const { v4: uuidv4 } = require('uuid');
const { parsePagination, safeJsonParse } = require('../utils/pagination');

async function invoicesRoutes(fastify, options) {
  const db = fastify.db;
  const PPN_RATE = 0.11; // 11% Indonesian VAT

  // Get all invoices (requires authentication)
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { status, customer_id, startDate, endDate } = request.query;
      const { limit, page, offset } = parsePagination(request.query);

      let query = `
        SELECT i.*, c.name as customer_name, o.order_number
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN orders o ON i.order_id = o.id
        WHERE 1=1
      `;
      const params = [];

      if (status) {
        query += ' AND i.status = ?';
        params.push(status);
      }
      if (customer_id) {
        query += ' AND i.customer_id = ?';
        params.push(customer_id);
      }
      if (startDate) {
        query += ' AND DATE(i.issue_date) >= ?';
        params.push(startDate);
      }
      if (endDate) {
        query += ' AND DATE(i.issue_date) <= ?';
        params.push(endDate);
      }

      query += ' ORDER BY i.issue_date DESC, i.created_at DESC';

      // Get total count
      const countQuery = query.replace(
        /SELECT i\.\*, c\.name as customer_name, o\.order_number/,
        'SELECT COUNT(*) as total'
      );
      const countResult = db.db.prepare(countQuery).get(...params);
      const total = countResult ? countResult.total : 0;

      // Add pagination
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const invoices = db.db.prepare(query).all(...params);

      // Calculate stats
      const allInvoices = db.db.prepare('SELECT status, total_amount FROM invoices').all();
      const stats = {
        total: allInvoices.length,
        unpaid: allInvoices.filter((i) => i.status === 'unpaid').length,
        paid: allInvoices.filter((i) => i.status === 'paid').length,
        overdue: allInvoices.filter((i) => i.status === 'overdue').length,
        cancelled: allInvoices.filter((i) => i.status === 'cancelled').length,
        totalValue: allInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0),
        paidValue: allInvoices
          .filter((i) => i.status === 'paid')
          .reduce((sum, i) => sum + (i.total_amount || 0), 0),
        unpaidValue: allInvoices
          .filter((i) => i.status === 'unpaid' || i.status === 'overdue')
          .reduce((sum, i) => sum + (i.total_amount || 0), 0),
      };

      return {
        success: true,
        invoices,
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

  // Get invoice by ID (requires authentication)
  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params;

      const invoice = db.db
        .prepare(
          `
        SELECT i.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone, o.order_number
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN orders o ON i.order_id = o.id
        WHERE i.id = ?
      `
        )
        .get(id);

      if (!invoice) {
        reply.code(404);
        return { success: false, error: 'Invoice not found' };
      }

      // Parse items if exists
      invoice.items = safeJsonParse(invoice.items, []);

      // Get payments for this invoice
      const payments = db.db
        .prepare(
          `
        SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC
      `
        )
        .all(id);

      return {
        success: true,
        invoice: { ...invoice, payments },
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Create invoice (requires authentication)
  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['customer_id'],
          properties: {
            customer_id: { type: 'string' },
            order_id: { type: 'string' },
            subtotal: { type: 'number' },
            discount: { type: 'number' },
            due_date: { type: 'string' },
            notes: { type: 'string' },
            items: { type: 'array' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const {
          order_id,
          customer_id,
          subtotal,
          discount = 0,
          due_date,
          notes,
          items,
        } = request.body;

        if (!customer_id) {
          reply.code(400);
          return { success: false, error: 'Customer ID is required' };
        }

        const id = uuidv4();
        const invoiceNumber = await generateInvoiceNumber(db);

        const afterDiscount = (subtotal || 0) - discount;
        const ppnAmount = afterDiscount * PPN_RATE;
        const totalAmount = afterDiscount + ppnAmount;

        db.db
          .prepare(
            `
        INSERT INTO invoices (id, invoice_number, order_id, customer_id, subtotal, discount, ppn_rate, ppn_amount, total_amount, status, issue_date, due_date, notes, items)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', DATE('now'), ?, ?, ?)
      `
          )
          .run(
            id,
            invoiceNumber,
            order_id,
            customer_id,
            subtotal || 0,
            discount,
            PPN_RATE * 100,
            ppnAmount,
            totalAmount,
            due_date,
            notes,
            items ? JSON.stringify(items) : null
          );

        const invoice = db.db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);

        return {
          success: true,
          message: 'Invoice created successfully',
          invoiceId: id,
          invoice,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Update invoice status (requires authentication)
  fastify.patch(
    '/:id/status',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'] },
            paid_date: { type: 'string' },
            payment_method: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { status, paid_date, payment_method } = request.body;

        if (!status) {
          reply.code(400);
          return { success: false, error: 'Status is required' };
        }

        const validStatuses = ['unpaid', 'paid', 'overdue', 'cancelled', 'partial'];
        if (!validStatuses.includes(status)) {
          reply.code(400);
          return { success: false, error: 'Invalid status value' };
        }

        const existing = db.db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
        if (!existing) {
          reply.code(404);
          return { success: false, error: 'Invoice not found' };
        }

        const fields = ['status = ?'];
        const values = [status];

        if (status === 'paid') {
          fields.push('paid_date = ?');
          values.push(paid_date || new Date().toISOString().split('T')[0]);
          if (payment_method) {
            fields.push('payment_method = ?');
            values.push(payment_method);
          }
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        db.db.prepare(`UPDATE invoices SET ${fields.join(', ')} WHERE id = ?`).run(...values);

        return { success: true, message: 'Invoice status updated successfully' };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );

  // Delete invoice (owner/manager only)
  fastify.delete(
    '/:id',
    { preHandler: [fastify.authenticate, fastify.authorize(['owner', 'manager'])] },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const existing = db.db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
        if (!existing) {
          reply.code(404);
          return { success: false, error: 'Invoice not found' };
        }

        db.db.prepare('DELETE FROM payments WHERE invoice_id = ?').run(id);
        db.db.prepare('DELETE FROM invoices WHERE id = ?').run(id);

        return { success: true, message: 'Invoice deleted successfully' };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { success: false, error: 'An internal error occurred' };
      }
    }
  );
}

// Generate unique invoice number
async function generateInvoiceNumber(db) {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const latestInvoice = db.db
    .prepare(
      'SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1'
    )
    .get(`${prefix}%`);

  let nextNumber = 1;
  if (latestInvoice) {
    const currentNumber = parseInt(latestInvoice.invoice_number.split('-').pop());
    nextNumber = currentNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}

module.exports = invoicesRoutes;
