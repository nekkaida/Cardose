// Financial management routes - Using DatabaseService
const { v4: uuidv4 } = require('uuid');
const { parsePagination, safeJsonParse } = require('../utils/pagination');
async function financialRoutes(fastify, options) {
  const db = fastify.db;
  const PPN_RATE = 0.11; // 11% Indonesian VAT

  // Get all transactions (requires authentication)
  fastify.get('/transactions', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { type, category, startDate, endDate } = request.query;
      const { limit, page, offset } = parsePagination(request.query);

      let query = 'SELECT * FROM financial_transactions WHERE 1=1';
      const params = [];

      if (type) {
        query += ' AND type = ?';
        params.push(type);
      }
      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }
      if (startDate) {
        query += ' AND DATE(payment_date) >= ?';
        params.push(startDate);
      }
      if (endDate) {
        query += ' AND DATE(payment_date) <= ?';
        params.push(endDate);
      }

      query += ' ORDER BY payment_date DESC, created_at DESC';

      // Get total count
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
      const countResult = db.db.prepare(countQuery).get(...params);
      const total = countResult ? countResult.total : 0;

      // Add pagination
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const transactions = db.db.prepare(query).all(...params);

      // Calculate summary using SQL aggregates
      const txStats = db.db.prepare(`
        SELECT
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as totalIncome,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as totalExpenses,
          COALESCE(SUM(CASE WHEN type = 'income' THEN ppn_amount ELSE 0 END), 0) as totalPpnCollected,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN ppn_amount ELSE 0 END), 0) as totalPpnPaid
        FROM financial_transactions
      `).get();
      const summary = {
        totalIncome: txStats.totalIncome,
        totalExpenses: txStats.totalExpenses,
        netIncome: txStats.totalIncome - txStats.totalExpenses,
        totalPpnCollected: txStats.totalPpnCollected,
        totalPpnPaid: txStats.totalPpnPaid
      };

      return {
        success: true,
        transactions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        summary
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Create transaction (requires authentication)
  fastify.post('/transactions', { preHandler: [fastify.authenticate], schema: { body: { type: 'object', required: ['type', 'amount'], properties: { type: { type: 'string', enum: ['income', 'expense'] }, amount: { type: 'number', minimum: 0 }, category: { type: 'string' }, description: { type: 'string' }, order_id: { type: 'string' }, payment_method: { type: 'string' }, payment_date: { type: 'string' } } } } }, async (request, reply) => {
    try {
      const { type, category, amount, description, order_id, payment_method, payment_date, ppn_amount, base_amount, invoice_number } = request.body;

      if (!type || !amount) {
        reply.code(400);
        return { success: false, error: 'Type and amount are required' };
      }

      const id = uuidv4();

      db.db.prepare(`
        INSERT INTO financial_transactions (id, type, category, amount, description, order_id, payment_method, payment_date, ppn_amount, base_amount, invoice_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, type, category, amount, description, order_id, payment_method, payment_date || new Date().toISOString().split('T')[0], ppn_amount, base_amount, invoice_number);

      const transaction = db.db.prepare('SELECT * FROM financial_transactions WHERE id = ?').get(id);

      return {
        success: true,
        message: 'Transaction recorded successfully',
        transactionId: id,
        transaction
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get financial summary (requires authentication)
  fastify.get('/summary', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      // Get transactions summary using SQL aggregates
      const txSummary = db.db.prepare(`
        SELECT
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as totalIncome,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as totalExpenses,
          COALESCE(SUM(ppn_amount), 0) as totalTax
        FROM financial_transactions
      `).get();
      const totalIncome = txSummary.totalIncome;
      const totalExpenses = txSummary.totalExpenses;
      const totalTax = txSummary.totalTax;
      const netProfit = totalIncome - totalExpenses;
      const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100) : 0;

      // Get orders summary using SQL aggregates
      const ordersSummary = db.db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status IN ('pending', 'designing', 'production') THEN 1 ELSE 0 END) as pendingOrders,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedOrders,
          COALESCE(SUM(total_amount), 0) as totalOrderValue
        FROM orders
      `).get();
      const pendingOrders = ordersSummary.pendingOrders;
      const completedOrders = ordersSummary.completedOrders;
      const totalOrderValue = ordersSummary.totalOrderValue;

      // Get invoices summary using SQL aggregates
      const invoicesSummary = db.db.prepare(`
        SELECT
          SUM(CASE WHEN status IN ('unpaid', 'overdue') THEN 1 ELSE 0 END) as unpaidInvoices,
          SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paidInvoices
        FROM invoices
      `).get();
      const unpaidInvoices = invoicesSummary.unpaidInvoices;
      const paidInvoices = invoicesSummary.paidInvoices;

      return {
        success: true,
        summary: {
          totalRevenue: totalIncome,
          totalExpenses: totalExpenses,
          totalTax: totalTax,
          netProfit: netProfit,
          profitMargin: profitMargin.toFixed(2),
          pendingInvoices: unpaidInvoices,
          paidInvoices: paidInvoices,
          pendingOrders: pendingOrders,
          completedOrders: completedOrders,
          totalOrders: ordersSummary.total,
          averageOrderValue: ordersSummary.total > 0 ? totalOrderValue / ordersSummary.total : 0,
          ppnRate: PPN_RATE * 100,
          monthlyGrowth: 12.5
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get all budgets (requires authentication)
  fastify.get('/budgets', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { period, category } = request.query;

      let query = 'SELECT * FROM budgets WHERE 1=1';
      const params = [];

      if (period) {
        query += ' AND period = ?';
        params.push(period);
      }
      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }

      query += ' ORDER BY start_date DESC';

      const budgets = db.db.prepare(query).all(...params);

      // Calculate actual spending for each budget
      const budgetsWithActuals = budgets.map(budget => {
        const spending = db.db.prepare(`
          SELECT SUM(amount) as total
          FROM financial_transactions
          WHERE type = 'expense'
          AND category = ?
          AND DATE(payment_date) >= ?
          AND DATE(payment_date) <= ?
        `).get(budget.category, budget.start_date, budget.end_date);

        const actualSpending = spending?.total || 0;
        const variance = budget.amount - actualSpending;
        const percentageUsed = budget.amount > 0 ? (actualSpending / budget.amount) * 100 : 0;

        return {
          ...budget,
          actualSpending,
          variance,
          percentageUsed: percentageUsed.toFixed(2),
          status: percentageUsed > 100 ? 'over' : percentageUsed > 90 ? 'warning' : 'good'
        };
      });

      return {
        success: true,
        budgets: budgetsWithActuals,
        summary: {
          totalBudgeted: budgets.reduce((sum, b) => sum + b.amount, 0),
          totalSpent: budgetsWithActuals.reduce((sum, b) => sum + b.actualSpending, 0)
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Create budget (requires authentication)
  fastify.post('/budgets', { preHandler: [fastify.authenticate], schema: { body: { type: 'object', required: ['category', 'amount', 'period'], properties: { category: { type: 'string' }, amount: { type: 'number', minimum: 0 }, period: { type: 'string' }, start_date: { type: 'string' }, end_date: { type: 'string' }, notes: { type: 'string' } } } } }, async (request, reply) => {
    try {
      const { category, amount, period, start_date, end_date, notes } = request.body;

      if (!category || !amount || !period) {
        reply.code(400);
        return { success: false, error: 'Category, amount, and period are required' };
      }

      const id = uuidv4();

      db.db.prepare(`
        INSERT INTO budgets (id, category, amount, period, start_date, end_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, category, amount, period, start_date, end_date, notes);

      const budget = db.db.prepare('SELECT * FROM budgets WHERE id = ?').get(id);

      return {
        success: true,
        message: 'Budget created successfully',
        budgetId: id,
        budget
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get budget by ID (requires authentication)
  fastify.get('/budgets/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params;

      const budget = db.db.prepare('SELECT * FROM budgets WHERE id = ?').get(id);

      if (!budget) {
        reply.code(404);
        return { success: false, error: 'Budget not found' };
      }

      // Calculate actual spending
      const spending = db.db.prepare(`
        SELECT SUM(amount) as total
        FROM financial_transactions
        WHERE type = 'expense'
        AND category = ?
        AND DATE(payment_date) >= ?
        AND DATE(payment_date) <= ?
      `).get(budget.category, budget.start_date, budget.end_date);

      const actualSpending = spending?.total || 0;
      const variance = budget.amount - actualSpending;
      const percentageUsed = budget.amount > 0 ? (actualSpending / budget.amount) * 100 : 0;

      return {
        success: true,
        budget: {
          ...budget,
          actualSpending,
          variance,
          percentageUsed: percentageUsed.toFixed(2),
          status: percentageUsed > 100 ? 'over' : percentageUsed > 90 ? 'warning' : 'good'
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // ==================== INVOICES ====================

  // Get all invoices (requires authentication)
  fastify.get('/invoices', { preHandler: [fastify.authenticate] }, async (request, reply) => {
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
      const countQuery = query.replace(/SELECT i\.\*, c\.name as customer_name, o\.order_number/, 'SELECT COUNT(*) as total');
      const countResult = db.db.prepare(countQuery).get(...params);
      const total = countResult ? countResult.total : 0;

      // Add pagination
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const invoices = db.db.prepare(query).all(...params);

      // Calculate stats using SQL aggregates
      const invStats = db.db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'unpaid' THEN 1 ELSE 0 END) as unpaid,
          SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid,
          SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
          COALESCE(SUM(total_amount), 0) as totalValue,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as paidValue,
          COALESCE(SUM(CASE WHEN status IN ('unpaid', 'overdue') THEN total_amount ELSE 0 END), 0) as unpaidValue
        FROM invoices
      `).get();
      const stats = {
        total: invStats.total,
        unpaid: invStats.unpaid,
        paid: invStats.paid,
        overdue: invStats.overdue,
        cancelled: invStats.cancelled,
        totalValue: invStats.totalValue,
        paidValue: invStats.paidValue,
        unpaidValue: invStats.unpaidValue
      };

      return {
        success: true,
        invoices,
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

  // Create invoice (requires authentication)
  fastify.post('/invoices', { preHandler: [fastify.authenticate], schema: { body: { type: 'object', required: ['customer_id'], properties: { customer_id: { type: 'string' }, order_id: { type: 'string' }, subtotal: { type: 'number' }, discount: { type: 'number' }, due_date: { type: 'string' }, notes: { type: 'string' }, items: { type: 'array' } } } } }, async (request, reply) => {
    try {
      const { order_id, customer_id, subtotal, discount = 0, due_date, notes, items } = request.body;

      if (!customer_id) {
        reply.code(400);
        return { success: false, error: 'Customer ID is required' };
      }

      const id = uuidv4();
      const invoiceNumber = await generateInvoiceNumber(db);

      const afterDiscount = (subtotal || 0) - discount;
      const ppnAmount = afterDiscount * PPN_RATE;
      const totalAmount = afterDiscount + ppnAmount;

      db.db.prepare(`
        INSERT INTO invoices (id, invoice_number, order_id, customer_id, subtotal, discount, ppn_rate, ppn_amount, total_amount, status, issue_date, due_date, notes, items)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', DATE('now'), ?, ?, ?)
      `).run(id, invoiceNumber, order_id, customer_id, subtotal || 0, discount, PPN_RATE * 100, ppnAmount, totalAmount, due_date, notes, items ? JSON.stringify(items) : null);

      const invoice = db.db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);

      return {
        success: true,
        message: 'Invoice created successfully',
        invoiceId: id,
        invoice
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get invoice by ID (requires authentication)
  fastify.get('/invoices/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params;

      const invoice = db.db.prepare(`
        SELECT i.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone, o.order_number
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN orders o ON i.order_id = o.id
        WHERE i.id = ?
      `).get(id);

      if (!invoice) {
        reply.code(404);
        return { success: false, error: 'Invoice not found' };
      }

      // Parse items if exists
      invoice.items = safeJsonParse(invoice.items, []);

      // Get payments for this invoice (payments table may not exist in all deployments)
      let payments = [];
      // Skip payments query since the table doesn't exist in the schema
      // In future, add payments table to DatabaseService if needed

      return {
        success: true,
        invoice: { ...invoice, payments }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Update invoice status (requires authentication)
  fastify.patch('/invoices/:id/status', { preHandler: [fastify.authenticate], schema: { body: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'] }, paid_date: { type: 'string' }, payment_method: { type: 'string' } } } } }, async (request, reply) => {
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

      // If paid, create transaction record
      if (status === 'paid') {
        const transactionId = uuidv4();
        db.db.prepare(`
          INSERT INTO financial_transactions (id, type, category, amount, description, order_id, payment_method, payment_date, ppn_amount, base_amount, invoice_number)
          VALUES (?, 'income', 'sales', ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          transactionId,
          existing.total_amount,
          `Payment for Invoice ${existing.invoice_number}`,
          existing.order_id,
          payment_method || 'cash',
          paid_date || new Date().toISOString().split('T')[0],
          existing.ppn_amount,
          existing.subtotal - existing.discount,
          existing.invoice_number
        );
      }

      return { success: true, message: 'Invoice status updated successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Calculate pricing (requires authentication)
  fastify.post('/calculate-pricing', { preHandler: [fastify.authenticate], schema: { body: { type: 'object', required: ['materials'], properties: { materials: { type: 'array' }, labor_cost: { type: 'number' }, overhead_percentage: { type: 'number' }, profit_margin: { type: 'number' }, discount_percentage: { type: 'number' }, quantity: { type: 'integer', minimum: 1 } } } } }, async (request, reply) => {
    try {
      const {
        materials = [],
        laborHours = 0,
        overheadPercentage = 10,
        markupPercentage = 50,
        discountAmount = 0
      } = request.body;

      const materialCost = materials.reduce((sum, m) => sum + (m.quantity * m.unitCost), 0);
      const laborRate = parseInt(db.db.prepare("SELECT value FROM settings WHERE key = 'labor_rate_per_hour'").pluck().get()) || 50000;
      const laborCost = laborHours * laborRate;
      const overheadCost = (materialCost + laborCost) * (overheadPercentage / 100);
      const subtotal = materialCost + laborCost + overheadCost;
      const markupAmount = subtotal * (markupPercentage / 100);
      const afterMarkup = subtotal + markupAmount;
      const afterDiscount = afterMarkup - discountAmount;
      const ppnAmount = afterDiscount * PPN_RATE;
      const finalPrice = afterDiscount + ppnAmount;
      const profit = afterDiscount - materialCost - laborCost - overheadCost;
      const profitMargin = afterDiscount > 0 ? (profit / afterDiscount) * 100 : 0;

      return {
        success: true,
        pricing: {
          breakdown: {
            materialCost,
            laborCost,
            overheadCost,
            subtotal,
            markupAmount,
            markupPercentage,
            afterMarkup,
            discountAmount,
            afterDiscount,
            ppnRate: PPN_RATE * 100,
            ppnAmount,
            finalPrice
          },
          profitAnalysis: {
            profit,
            profitMargin: profitMargin.toFixed(2),
            costBreakdown: {
              materials: ((materialCost / subtotal) * 100).toFixed(1),
              labor: ((laborCost / subtotal) * 100).toFixed(1),
              overhead: ((overheadCost / subtotal) * 100).toFixed(1)
            }
          },
          formattedPrices: {
            subtotal: `Rp ${subtotal.toLocaleString('id-ID')}`,
            afterDiscount: `Rp ${afterDiscount.toLocaleString('id-ID')}`,
            ppn: `Rp ${ppnAmount.toLocaleString('id-ID')}`,
            total: `Rp ${finalPrice.toLocaleString('id-ID')}`
          }
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get tax report (requires authentication)
  fastify.get('/tax-report', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { month, year, startDate, endDate } = request.query;

      let start, end;
      if (month && year) {
        start = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        end = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
      } else if (startDate && endDate) {
        if (startDate > endDate) {
          reply.code(400);
          return { success: false, error: 'startDate must be before or equal to endDate' };
        }
        start = startDate;
        end = endDate;
      } else {
        const now = new Date();
        start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`;
      }

      // Get income transactions
      const income = db.db.prepare(`
        SELECT SUM(amount) as total, SUM(ppn_amount) as ppn, SUM(base_amount) as base
        FROM financial_transactions
        WHERE type = 'income'
        AND DATE(payment_date) >= ?
        AND DATE(payment_date) <= ?
      `).get(start, end);

      // Get expense transactions
      const expenses = db.db.prepare(`
        SELECT SUM(amount) as total, SUM(ppn_amount) as ppn
        FROM financial_transactions
        WHERE type = 'expense'
        AND DATE(payment_date) >= ?
        AND DATE(payment_date) <= ?
      `).get(start, end);

      // Get invoice count
      const invoiceCount = db.db.prepare(`
        SELECT COUNT(*) as count
        FROM invoices
        WHERE DATE(issue_date) >= ?
        AND DATE(issue_date) <= ?
      `).get(start, end);

      return {
        success: true,
        period: {
          start,
          end,
          display: month && year ? `${month}/${year}` : `${start} to ${end}`
        },
        ppn: {
          rate: PPN_RATE * 100,
          collected: income?.ppn || 0,
          paid: expenses?.ppn || 0,
          netPayable: (income?.ppn || 0) - (expenses?.ppn || 0),
          baseAmount: income?.base || 0
        },
        summary: {
          totalIncome: income?.total || 0,
          totalExpenses: expenses?.total || 0,
          netIncome: (income?.total || 0) - (expenses?.total || 0),
          totalInvoices: invoiceCount?.count || 0
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get revenue analytics (requires authentication)
  fastify.get('/analytics/revenue', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { period = 'month' } = request.query;

      let dateFilter = '';
      if (period === 'day') {
        dateFilter = "AND DATE(payment_date) = DATE('now')";
      } else if (period === 'week') {
        dateFilter = "AND payment_date >= DATE('now', '-7 days')";
      } else if (period === 'month') {
        dateFilter = "AND payment_date >= DATE('now', '-30 days')";
      } else if (period === 'quarter') {
        dateFilter = "AND payment_date >= DATE('now', '-90 days')";
      } else if (period === 'year') {
        dateFilter = "AND payment_date >= DATE('now', '-365 days')";
      }

      // Total revenue in period
      const revenueData = db.db.prepare(`
        SELECT
          SUM(amount) as total_revenue,
          COUNT(*) as transaction_count,
          AVG(amount) as avg_transaction
        FROM financial_transactions
        WHERE type = 'income' ${dateFilter}
      `).get();

      // Revenue by category
      const byCategory = db.db.prepare(`
        SELECT
          category,
          SUM(amount) as revenue,
          COUNT(*) as count
        FROM financial_transactions
        WHERE type = 'income' ${dateFilter}
        GROUP BY category
        ORDER BY revenue DESC
      `).all();

      // Daily revenue for charts
      const dailyRevenue = db.db.prepare(`
        SELECT
          DATE(payment_date) as date,
          SUM(amount) as revenue,
          COUNT(*) as orders
        FROM financial_transactions
        WHERE type = 'income' ${dateFilter}
        GROUP BY DATE(payment_date)
        ORDER BY date ASC
      `).all();

      // Previous period comparison
      let prevDateFilter = '';
      if (period === 'day') {
        prevDateFilter = "AND DATE(payment_date) = DATE('now', '-1 day')";
      } else if (period === 'week') {
        prevDateFilter = "AND payment_date >= DATE('now', '-14 days') AND payment_date < DATE('now', '-7 days')";
      } else if (period === 'month') {
        prevDateFilter = "AND payment_date >= DATE('now', '-60 days') AND payment_date < DATE('now', '-30 days')";
      } else if (period === 'quarter') {
        prevDateFilter = "AND payment_date >= DATE('now', '-180 days') AND payment_date < DATE('now', '-90 days')";
      } else if (period === 'year') {
        prevDateFilter = "AND payment_date >= DATE('now', '-730 days') AND payment_date < DATE('now', '-365 days')";
      }

      const prevRevenueData = db.db.prepare(`
        SELECT SUM(amount) as total_revenue
        FROM financial_transactions
        WHERE type = 'income' ${prevDateFilter}
      `).get();

      const currentRevenue = revenueData?.total_revenue || 0;
      const prevRevenue = prevRevenueData?.total_revenue || 0;
      const growthRate = prevRevenue > 0
        ? ((currentRevenue - prevRevenue) / prevRevenue * 100).toFixed(1)
        : 0;

      return {
        success: true,
        analytics: {
          period,
          revenue: {
            total: currentRevenue,
            transactionCount: revenueData?.transaction_count || 0,
            avgTransaction: revenueData?.avg_transaction || 0,
            previousPeriod: prevRevenue,
            growthRate: parseFloat(growthRate)
          },
          byCategory,
          dailyRevenue
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });

  // Get analytics (requires authentication)
  fastify.get('/analytics', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const monthlyRevenue = [];
      const currentDate = new Date();

      // Generate last 6 months revenue data
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthStart = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        const monthEnd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${lastDay}`;

        const monthData = db.db.prepare(`
          SELECT SUM(amount) as revenue, COUNT(*) as orders
          FROM financial_transactions
          WHERE type = 'income'
          AND DATE(payment_date) >= ?
          AND DATE(payment_date) <= ?
        `).get(monthStart, monthEnd);

        monthlyRevenue.push({
          month: date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
          revenue: monthData?.revenue || 0,
          orders: monthData?.orders || 0,
          avgOrderValue: monthData?.orders > 0 ? (monthData?.revenue || 0) / monthData.orders : 0
        });
      }

      // Get customer stats using SQL aggregates
      const customerStats = db.db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN business_type = 'corporate' THEN 1 ELSE 0 END) as corporate,
          SUM(CASE WHEN business_type = 'wedding' THEN 1 ELSE 0 END) as wedding,
          SUM(CASE WHEN business_type = 'trading' THEN 1 ELSE 0 END) as trading,
          SUM(CASE WHEN business_type = 'individual' THEN 1 ELSE 0 END) as individual,
          SUM(CASE WHEN business_type = 'event' THEN 1 ELSE 0 END) as event
        FROM customers
      `).get();
      const customersByType = {
        corporate: customerStats.corporate,
        wedding: customerStats.wedding,
        trading: customerStats.trading,
        individual: customerStats.individual,
        event: customerStats.event
      };

      // Get top customers
      const topCustomers = db.db.prepare(`
        SELECT name, total_spent, total_orders
        FROM customers
        ORDER BY total_spent DESC
        LIMIT 5
      `).all();

      // Get order stats using SQL aggregates
      const orderStats = db.db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'designing' THEN 1 ELSE 0 END) as designing,
          SUM(CASE WHEN status = 'production' THEN 1 ELSE 0 END) as production,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
          COALESCE(SUM(total_amount), 0) as totalRevenue
        FROM orders
      `).get();
      const ordersByStatus = {
        pending: orderStats.pending,
        designing: orderStats.designing,
        production: orderStats.production,
        completed: orderStats.completed,
        cancelled: orderStats.cancelled
      };

      const totalRevenue = orderStats.totalRevenue;

      return {
        success: true,
        analytics: {
          revenue: {
            monthlyRevenue,
            totalRevenue,
            growthRate: 12.5,
            projectedMonthly: 25000000
          },
          customers: {
            total: customerStats.total,
            byType: customersByType,
            topCustomers
          },
          orders: {
            total: orderStats.total,
            byStatus: ordersByStatus,
            averageValue: orderStats.total > 0 ? totalRevenue / orderStats.total : 0,
            conversionRate: 85.5
          }
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'An internal error occurred' };
    }
  });
}

// Generate unique invoice number
async function generateInvoiceNumber(db) {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const latestInvoice = db.db.prepare(
    "SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1"
  ).get(`${prefix}%`);

  let nextNumber = 1;
  if (latestInvoice) {
    const currentNumber = parseInt(latestInvoice.invoice_number.split('-').pop());
    nextNumber = currentNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}

module.exports = financialRoutes;
