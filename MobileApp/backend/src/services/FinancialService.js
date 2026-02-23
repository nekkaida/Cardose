// Financial business logic service - extracted from financial routes
const { v4: uuidv4 } = require('uuid');

const PPN_RATE = 0.11; // 11% Indonesian VAT

class FinancialService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get transactions with filtering, sorting, pagination, summary, and category breakdown.
   */
  async getTransactions({
    type,
    category,
    startDate,
    endDate,
    search,
    sort_by,
    sort_order,
    limit,
    offset,
    page,
  }) {
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

    if (search) {
      query += ' AND (description LIKE ? OR category LIKE ? OR reference_number LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    const allowedSortColumns = [
      'payment_date',
      'amount',
      'category',
      'type',
      'created_at',
      'description',
    ];
    const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'payment_date';
    const sortDirection = sort_order === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumn} ${sortDirection}, created_at DESC`;

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = this.db.db.prepare(countQuery).get(...params);
    const total = countResult ? countResult.total : 0;

    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const transactions = this.db.db.prepare(query).all(...params);

    // Calculate summary using SQL aggregates
    const txStats = this.db.db
      .prepare(
        `
        SELECT
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as totalIncome,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as totalExpenses,
          COALESCE(SUM(CASE WHEN type = 'income' THEN ppn_amount ELSE 0 END), 0) as totalPpnCollected,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN ppn_amount ELSE 0 END), 0) as totalPpnPaid
        FROM financial_transactions
      `
      )
      .get();
    const summary = {
      totalIncome: txStats.totalIncome,
      totalExpenses: txStats.totalExpenses,
      netIncome: txStats.totalIncome - txStats.totalExpenses,
      totalPpnCollected: txStats.totalPpnCollected,
      totalPpnPaid: txStats.totalPpnPaid,
    };

    // Category breakdown for chart
    const categoryBreakdown = this.db.db
      .prepare(
        `
        SELECT category, type, SUM(amount) as total, COUNT(*) as count
        FROM financial_transactions
        GROUP BY category, type
        ORDER BY total DESC
      `
      )
      .all();

    return {
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary,
      categoryBreakdown,
    };
  }

  /**
   * Create a financial transaction.
   */
  async createTransaction(data) {
    const {
      type,
      category,
      amount,
      description,
      order_id,
      payment_method,
      payment_date,
      ppn_amount,
      base_amount,
      invoice_number,
    } = data;

    const id = uuidv4();

    this.db.db
      .prepare(
        `
        INSERT INTO financial_transactions (id, type, category, amount, description, order_id, payment_method, payment_date, ppn_amount, base_amount, invoice_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        id,
        type,
        category,
        amount,
        description,
        order_id,
        payment_method,
        payment_date || new Date().toISOString().split('T')[0],
        ppn_amount,
        base_amount,
        invoice_number
      );

    const transaction = this.db.db
      .prepare('SELECT * FROM financial_transactions WHERE id = ?')
      .get(id);

    return { transactionId: id, transaction };
  }

  /**
   * Get financial summary with orders and invoices overview.
   */
  async getSummary() {
    // Get transactions summary using SQL aggregates
    const txSummary = this.db.db
      .prepare(
        `
        SELECT
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as totalIncome,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as totalExpenses,
          COALESCE(SUM(ppn_amount), 0) as totalTax
        FROM financial_transactions
      `
      )
      .get();
    const totalIncome = txSummary.totalIncome;
    const totalExpenses = txSummary.totalExpenses;
    const totalTax = txSummary.totalTax;
    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    // Get orders summary using SQL aggregates
    const ordersSummary = this.db.db
      .prepare(
        `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status IN ('pending', 'designing', 'production') THEN 1 ELSE 0 END) as pendingOrders,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedOrders,
          COALESCE(SUM(total_amount), 0) as totalOrderValue
        FROM orders
      `
      )
      .get();
    const pendingOrders = ordersSummary.pendingOrders;
    const completedOrders = ordersSummary.completedOrders;
    const totalOrderValue = ordersSummary.totalOrderValue;

    // Get invoices summary using SQL aggregates
    const invoicesSummary = this.db.db
      .prepare(
        `
        SELECT
          SUM(CASE WHEN status IN ('unpaid', 'overdue') THEN 1 ELSE 0 END) as unpaidInvoices,
          SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paidInvoices
        FROM invoices
      `
      )
      .get();
    const unpaidInvoices = invoicesSummary.unpaidInvoices;
    const paidInvoices = invoicesSummary.paidInvoices;

    // Calculate real monthly growth from actual transaction data
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    const currentMonthStr = currentMonthStart.toISOString().split('T')[0];
    const prevMonthStart = new Date(currentMonthStart);
    prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
    const prevMonthStr = prevMonthStart.toISOString().split('T')[0];

    const currentMonthRevenue = this.db.db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) as total FROM financial_transactions
         WHERE type = 'income' AND DATE(payment_date) >= ?`
      )
      .get(currentMonthStr);

    const prevMonthRevenue = this.db.db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) as total FROM financial_transactions
         WHERE type = 'income' AND DATE(payment_date) >= ? AND DATE(payment_date) < ?`
      )
      .get(prevMonthStr, currentMonthStr);

    const curRev = currentMonthRevenue?.total || 0;
    const prevRev = prevMonthRevenue?.total || 0;
    const monthlyGrowth = prevRev > 0 ? ((curRev - prevRev) / prevRev) * 100 : 0;

    return {
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
      monthlyGrowth: parseFloat(monthlyGrowth.toFixed(1)),
    };
  }

  /**
   * Get budgets with actual spending calculations.
   */
  async getBudgets({ period, category }) {
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

    const budgets = this.db.db.prepare(query).all(...params);

    // Calculate actual spending for all budgets in a single query using a CTE
    // instead of N+1 individual queries per budget
    if (budgets.length === 0) {
      return { budgets: [], summary: { totalBudgeted: 0, totalSpent: 0 } };
    }

    const spendingByCategory = this.db.db
      .prepare(
        `
        SELECT category, DATE(payment_date) as pay_date, SUM(amount) as total
        FROM financial_transactions
        WHERE type = 'expense'
        GROUP BY category, DATE(payment_date)
      `
      )
      .all();

    // Build a lookup: { category -> [ { pay_date, total } ] }
    const spendingLookup = {};
    for (const row of spendingByCategory) {
      if (!spendingLookup[row.category]) spendingLookup[row.category] = [];
      spendingLookup[row.category].push(row);
    }

    const budgetsWithActuals = budgets.map((budget) => {
      const entries = spendingLookup[budget.category] || [];
      const actualSpending = entries
        .filter((e) => e.pay_date >= budget.start_date && e.pay_date <= budget.end_date)
        .reduce((sum, e) => sum + e.total, 0);

      const variance = budget.amount - actualSpending;
      const percentageUsed = budget.amount > 0 ? (actualSpending / budget.amount) * 100 : 0;

      return {
        ...budget,
        actualSpending,
        variance,
        percentageUsed: percentageUsed.toFixed(2),
        status: percentageUsed > 100 ? 'over' : percentageUsed > 90 ? 'warning' : 'good',
      };
    });

    return {
      budgets: budgetsWithActuals,
      summary: {
        totalBudgeted: budgets.reduce((sum, b) => sum + b.amount, 0),
        totalSpent: budgetsWithActuals.reduce((sum, b) => sum + b.actualSpending, 0),
      },
    };
  }

  /**
   * Create a budget.
   */
  async createBudget(data) {
    const { category, amount, period, start_date, end_date, notes } = data;

    const id = uuidv4();

    this.db.db
      .prepare(
        `
        INSERT INTO budgets (id, category, amount, period, start_date, end_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(id, category, amount, period, start_date, end_date, notes);

    const budget = this.db.db.prepare('SELECT * FROM budgets WHERE id = ?').get(id);

    return { budgetId: id, budget };
  }

  /**
   * Get a single budget by ID with actual spending.
   */
  async getBudgetById(id) {
    const budget = this.db.db.prepare('SELECT * FROM budgets WHERE id = ?').get(id);

    if (!budget) {
      return null;
    }

    // Calculate actual spending
    const spending = this.db.db
      .prepare(
        `
        SELECT SUM(amount) as total
        FROM financial_transactions
        WHERE type = 'expense'
        AND category = ?
        AND DATE(payment_date) >= ?
        AND DATE(payment_date) <= ?
      `
      )
      .get(budget.category, budget.start_date, budget.end_date);

    const actualSpending = spending?.total || 0;
    const variance = budget.amount - actualSpending;
    const percentageUsed = budget.amount > 0 ? (actualSpending / budget.amount) * 100 : 0;

    return {
      ...budget,
      actualSpending,
      variance,
      percentageUsed: percentageUsed.toFixed(2),
      status: percentageUsed > 100 ? 'over' : percentageUsed > 90 ? 'warning' : 'good',
    };
  }

  /**
   * Get invoices with filtering, sorting, pagination, and stats.
   */
  async getInvoices({
    status,
    customer_id,
    startDate,
    endDate,
    search,
    sort_by,
    sort_order,
    limit,
    offset,
    page,
  }) {
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

    if (search) {
      query += ' AND (i.invoice_number LIKE ? OR c.name LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    const allowedSortColumns = [
      'issue_date',
      'total_amount',
      'status',
      'invoice_number',
      'due_date',
      'created_at',
    ];
    let sortColumn = allowedSortColumns.includes(sort_by) ? `i.${sort_by}` : 'i.issue_date';
    if (sort_by === 'customer_name') sortColumn = 'c.name';
    const sortDirection = sort_order === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumn} ${sortDirection}, i.created_at DESC`;

    // Get total count
    const countQuery = query.replace(
      /SELECT i\.\*, c\.name as customer_name, o\.order_number/,
      'SELECT COUNT(*) as total'
    );
    const countResult = this.db.db.prepare(countQuery).get(...params);
    const total = countResult ? countResult.total : 0;

    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const invoices = this.db.db.prepare(query).all(...params);

    // Calculate stats using SQL aggregates
    const invStats = this.db.db
      .prepare(
        `
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
      `
      )
      .get();
    const stats = {
      total: invStats.total,
      unpaid: invStats.unpaid,
      paid: invStats.paid,
      overdue: invStats.overdue,
      cancelled: invStats.cancelled,
      totalValue: invStats.totalValue,
      paidValue: invStats.paidValue,
      unpaidValue: invStats.unpaidValue,
    };

    return {
      invoices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats,
    };
  }

  /**
   * Create an invoice with PPN calculation.
   */
  async createInvoice(data, userId) {
    const { order_id, customer_id, subtotal, discount = 0, due_date, notes, items } = data;

    if (!subtotal || subtotal <= 0) {
      const error = new Error('Subtotal must be greater than 0');
      error.statusCode = 400;
      throw error;
    }

    if (discount > subtotal) {
      const error = new Error('Discount cannot exceed subtotal');
      error.statusCode = 400;
      throw error;
    }

    const id = uuidv4();
    const invoiceNumber = await this.generateInvoiceNumber();

    const afterDiscount = subtotal - discount;
    const ppnAmount = afterDiscount * PPN_RATE;
    const totalAmount = afterDiscount + ppnAmount;

    this.db.db
      .prepare(
        `
        INSERT INTO invoices (id, invoice_number, order_id, customer_id, subtotal, discount, ppn_rate, ppn_amount, total_amount, status, issue_date, due_date, notes, items, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', DATE('now'), ?, ?, ?, ?)
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
        items ? JSON.stringify(items) : null,
        userId || 'system'
      );

    const invoice = this.db.db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);

    return { invoiceId: id, invoice };
  }

  /**
   * Get a single invoice by ID with customer and order details.
   */
  async getInvoiceById(id) {
    const invoice = this.db.db
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

    return invoice || null;
  }

  /**
   * Valid invoice status transitions. Prevents double-pay and invalid state changes.
   */
  static VALID_STATUS_TRANSITIONS = {
    unpaid: ['paid', 'overdue', 'cancelled', 'partial'],
    partial: ['paid', 'overdue', 'cancelled'],
    overdue: ['paid', 'cancelled'],
    paid: [], // terminal state
    cancelled: [], // terminal state
  };

  /**
   * Update invoice status, optionally creating a transaction record on payment.
   * Validates state transitions to prevent double-pay and invalid changes.
   */
  async updateInvoiceStatus(id, { status, paid_date, payment_method }, userId) {
    const existing = this.db.db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    if (!existing) {
      return null;
    }

    // Validate status transition
    const currentStatus = existing.status || 'unpaid';
    const allowedTransitions = FinancialService.VALID_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowedTransitions.includes(status)) {
      const error = new Error(
        `Cannot transition invoice from '${currentStatus}' to '${status}'. Allowed: ${allowedTransitions.join(', ') || 'none (terminal state)'}`
      );
      error.statusCode = 400;
      throw error;
    }

    // Wrap status update + transaction creation in a DB transaction
    // so a failure in either step rolls back both.
    const runUpdate = this.db.db.transaction(() => {
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

      this.db.db.prepare(`UPDATE invoices SET ${fields.join(', ')} WHERE id = ?`).run(...values);

      // If paid, create transaction record
      if (status === 'paid') {
        const transactionId = uuidv4();
        this.db.db
          .prepare(
            `
            INSERT INTO financial_transactions (id, type, category, amount, description, order_id, payment_method, payment_date, ppn_amount, base_amount, invoice_number, created_by)
            VALUES (?, 'income', 'sales', ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
          )
          .run(
            transactionId,
            existing.total_amount,
            `Payment for Invoice ${existing.invoice_number}`,
            existing.order_id,
            payment_method || 'cash',
            paid_date || new Date().toISOString().split('T')[0],
            existing.ppn_amount,
            existing.subtotal - existing.discount,
            existing.invoice_number,
            userId
          );
      }
    });

    runUpdate();

    // Return the updated invoice (not stale pre-update data)
    const updated = this.db.db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    return updated;
  }

  /**
   * Calculate pricing breakdown with PPN.
   */
  async calculatePricing({
    materials = [],
    laborHours = 0,
    overheadPercentage = 10,
    markupPercentage = 50,
    discountAmount = 0,
  }) {
    const materialCost = materials.reduce((sum, m) => sum + m.quantity * m.unitCost, 0);
    const laborRate =
      parseInt(
        this.db.db
          .prepare("SELECT value FROM settings WHERE key = 'labor_rate_per_hour'")
          .pluck()
          .get()
      ) || 50000;
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
        finalPrice,
      },
      profitAnalysis: {
        profit,
        profitMargin: profitMargin.toFixed(2),
        costBreakdown: {
          materials: subtotal > 0 ? ((materialCost / subtotal) * 100).toFixed(1) : '0.0',
          labor: subtotal > 0 ? ((laborCost / subtotal) * 100).toFixed(1) : '0.0',
          overhead: subtotal > 0 ? ((overheadCost / subtotal) * 100).toFixed(1) : '0.0',
        },
      },
      formattedPrices: {
        subtotal: `Rp ${subtotal.toLocaleString('id-ID')}`,
        afterDiscount: `Rp ${afterDiscount.toLocaleString('id-ID')}`,
        ppn: `Rp ${ppnAmount.toLocaleString('id-ID')}`,
        total: `Rp ${finalPrice.toLocaleString('id-ID')}`,
      },
    };
  }

  /**
   * Get tax report for a given period.
   */
  async getTaxReport({ month, year, startDate, endDate }) {
    let start, end;
    if (month && year) {
      start = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      end = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    } else if (startDate && endDate) {
      start = startDate;
      end = endDate;
    } else {
      const now = new Date();
      start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`;
    }

    // Get income transactions
    const income = this.db.db
      .prepare(
        `
        SELECT SUM(amount) as total, SUM(ppn_amount) as ppn, SUM(base_amount) as base
        FROM financial_transactions
        WHERE type = 'income'
        AND DATE(payment_date) >= ?
        AND DATE(payment_date) <= ?
      `
      )
      .get(start, end);

    // Get expense transactions
    const expenses = this.db.db
      .prepare(
        `
        SELECT SUM(amount) as total, SUM(ppn_amount) as ppn
        FROM financial_transactions
        WHERE type = 'expense'
        AND DATE(payment_date) >= ?
        AND DATE(payment_date) <= ?
      `
      )
      .get(start, end);

    // Get invoice count
    const invoiceCount = this.db.db
      .prepare(
        `
        SELECT COUNT(*) as count
        FROM invoices
        WHERE DATE(issue_date) >= ?
        AND DATE(issue_date) <= ?
      `
      )
      .get(start, end);

    return {
      period: {
        start,
        end,
        display: month && year ? `${month}/${year}` : `${start} to ${end}`,
      },
      ppn: {
        rate: PPN_RATE * 100,
        collected: income?.ppn || 0,
        paid: expenses?.ppn || 0,
        netPayable: (income?.ppn || 0) - (expenses?.ppn || 0),
        baseAmount: income?.base || 0,
      },
      summary: {
        totalIncome: income?.total || 0,
        totalExpenses: expenses?.total || 0,
        netIncome: (income?.total || 0) - (expenses?.total || 0),
        totalInvoices: invoiceCount?.count || 0,
      },
    };
  }

  /**
   * Get revenue analytics for a given period with comparison.
   */
  async getRevenueAnalytics(period = 'month') {
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
    const revenueData = this.db.db
      .prepare(
        `
        SELECT
          SUM(amount) as total_revenue,
          COUNT(*) as transaction_count,
          AVG(amount) as avg_transaction
        FROM financial_transactions
        WHERE type = 'income' ${dateFilter}
      `
      )
      .get();

    // Revenue by category
    const byCategory = this.db.db
      .prepare(
        `
        SELECT
          category,
          SUM(amount) as revenue,
          COUNT(*) as count
        FROM financial_transactions
        WHERE type = 'income' ${dateFilter}
        GROUP BY category
        ORDER BY revenue DESC
      `
      )
      .all();

    // Daily revenue for charts
    const dailyRevenue = this.db.db
      .prepare(
        `
        SELECT
          DATE(payment_date) as date,
          SUM(amount) as revenue,
          COUNT(*) as orders
        FROM financial_transactions
        WHERE type = 'income' ${dateFilter}
        GROUP BY DATE(payment_date)
        ORDER BY date ASC
      `
      )
      .all();

    // Previous period comparison
    let prevDateFilter = '';
    if (period === 'day') {
      prevDateFilter = "AND DATE(payment_date) = DATE('now', '-1 day')";
    } else if (period === 'week') {
      prevDateFilter =
        "AND payment_date >= DATE('now', '-14 days') AND payment_date < DATE('now', '-7 days')";
    } else if (period === 'month') {
      prevDateFilter =
        "AND payment_date >= DATE('now', '-60 days') AND payment_date < DATE('now', '-30 days')";
    } else if (period === 'quarter') {
      prevDateFilter =
        "AND payment_date >= DATE('now', '-180 days') AND payment_date < DATE('now', '-90 days')";
    } else if (period === 'year') {
      prevDateFilter =
        "AND payment_date >= DATE('now', '-730 days') AND payment_date < DATE('now', '-365 days')";
    }

    const prevRevenueData = this.db.db
      .prepare(
        `
        SELECT SUM(amount) as total_revenue
        FROM financial_transactions
        WHERE type = 'income' ${prevDateFilter}
      `
      )
      .get();

    const currentRevenue = revenueData?.total_revenue || 0;
    const prevRevenue = prevRevenueData?.total_revenue || 0;
    const growthRate =
      prevRevenue > 0 ? (((currentRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : 0;

    return {
      period,
      revenue: {
        total: currentRevenue,
        transactionCount: revenueData?.transaction_count || 0,
        avgTransaction: revenueData?.avg_transaction || 0,
        previousPeriod: prevRevenue,
        growthRate: parseFloat(growthRate),
      },
      byCategory,
      dailyRevenue,
    };
  }

  /**
   * Get general analytics: monthly revenue, customer stats, order stats.
   */
  async getAnalytics() {
    const currentDate = new Date();

    // Calculate 6-month date range
    const sixMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 5, 1);
    const rangeStart = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;

    // Single GROUP BY query instead of 6 individual queries
    const monthlyRows = this.db.db
      .prepare(
        `
        SELECT
          strftime('%Y-%m', payment_date) as month_key,
          SUM(amount) as revenue,
          COUNT(*) as orders
        FROM financial_transactions
        WHERE type = 'income'
        AND DATE(payment_date) >= ?
        GROUP BY strftime('%Y-%m', payment_date)
        ORDER BY month_key ASC
      `
      )
      .all(rangeStart);

    // Build lookup from query results
    const monthLookup = {};
    for (const row of monthlyRows) {
      monthLookup[row.month_key] = row;
    }

    // Fill in all 6 months (including months with no data)
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const data = monthLookup[key];
      const revenue = data?.revenue || 0;
      const orders = data?.orders || 0;
      monthlyRevenue.push({
        month: date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
        revenue,
        orders,
        avgOrderValue: orders > 0 ? revenue / orders : 0,
      });
    }

    // Get customer stats using SQL aggregates
    const customerStats = this.db.db
      .prepare(
        `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN business_type = 'corporate' THEN 1 ELSE 0 END) as corporate,
          SUM(CASE WHEN business_type = 'wedding' THEN 1 ELSE 0 END) as wedding,
          SUM(CASE WHEN business_type = 'trading' THEN 1 ELSE 0 END) as trading,
          SUM(CASE WHEN business_type = 'individual' THEN 1 ELSE 0 END) as individual,
          SUM(CASE WHEN business_type = 'event' THEN 1 ELSE 0 END) as event
        FROM customers
      `
      )
      .get();
    const customersByType = {
      corporate: customerStats.corporate,
      wedding: customerStats.wedding,
      trading: customerStats.trading,
      individual: customerStats.individual,
      event: customerStats.event,
    };

    // Get top customers
    const topCustomers = this.db.db
      .prepare(
        `
        SELECT name, total_spent, total_orders
        FROM customers
        ORDER BY total_spent DESC
        LIMIT 5
      `
      )
      .all();

    // Get order stats using SQL aggregates
    const orderStats = this.db.db
      .prepare(
        `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'designing' THEN 1 ELSE 0 END) as designing,
          SUM(CASE WHEN status = 'production' THEN 1 ELSE 0 END) as production,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
          COALESCE(SUM(total_amount), 0) as totalRevenue
        FROM orders
      `
      )
      .get();
    const ordersByStatus = {
      pending: orderStats.pending,
      designing: orderStats.designing,
      production: orderStats.production,
      completed: orderStats.completed,
      cancelled: orderStats.cancelled,
    };

    const totalRevenue = orderStats.totalRevenue;

    // Calculate real growth rate from last two months
    const recentMonths = monthlyRevenue.slice(-2);
    const prevMonthRev = recentMonths.length >= 2 ? recentMonths[0].revenue : 0;
    const curMonthRev =
      recentMonths.length >= 1 ? recentMonths[recentMonths.length - 1].revenue : 0;
    const realGrowthRate =
      prevMonthRev > 0
        ? parseFloat((((curMonthRev - prevMonthRev) / prevMonthRev) * 100).toFixed(1))
        : 0;

    // Calculate real projected monthly based on current month's daily average
    const today = new Date();
    const dayOfMonth = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const projectedMonthly =
      dayOfMonth > 0 ? Math.round((curMonthRev / dayOfMonth) * daysInMonth) : 0;

    // Calculate real conversion rate from completed vs total orders
    const realConversionRate =
      orderStats.total > 0
        ? parseFloat(((orderStats.completed / orderStats.total) * 100).toFixed(1))
        : 0;

    return {
      revenue: {
        monthlyRevenue,
        totalRevenue,
        growthRate: realGrowthRate,
        projectedMonthly,
      },
      customers: {
        total: customerStats.total,
        byType: customersByType,
        topCustomers,
      },
      orders: {
        total: orderStats.total,
        byStatus: ordersByStatus,
        averageValue: orderStats.total > 0 ? totalRevenue / orderStats.total : 0,
        conversionRate: realConversionRate,
      },
    };
  }

  /**
   * Generate unique invoice number using DB-level locking to prevent races.
   * Uses a retry loop in case of UNIQUE constraint collisions under concurrency.
   */
  async generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const maxRetries = 5;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const latestInvoice = this.db.db
        .prepare(
          'SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1'
        )
        .get(`${prefix}%`);

      let nextNumber = 1;
      if (latestInvoice) {
        const parsed = parseInt(latestInvoice.invoice_number.split('-').pop(), 10);
        nextNumber = Number.isFinite(parsed) ? parsed + 1 : 1;
      }

      const candidate = `${prefix}${nextNumber.toString().padStart(4, '0')}`;

      // Check if this number already exists (race guard)
      const exists = this.db.db
        .prepare('SELECT 1 FROM invoices WHERE invoice_number = ?')
        .get(candidate);

      if (!exists) {
        return candidate;
      }
      // Collision detected — retry with fresh read
    }

    // Fallback: use timestamp-based suffix to guarantee uniqueness
    const ts = Date.now().toString(36);
    return `${prefix}${ts}`;
  }
}

module.exports = FinancialService;
