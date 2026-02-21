// Seed: Financial - Invoices (80), Transactions (120), Budgets (24)
const { v4: uuidv4 } = require('uuid');

module.exports = async function seedFinancial(db, { log, helpers, orders, customers, ownerId }) {
  const { randomInt, pickRandom, formatDateTime, randomDate, randomFloat } = helpers;

  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  // ==================== INVOICES ====================
  log('Seeding invoices (80 invoices - all statuses, edge cases)...');
  const invoiceStatuses = ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'];
  const invoices = [];

  // Specific invoice scenarios
  const invoiceScenarios = [
    // DRAFT invoices
    { status: 'draft', amount: 5000000, discount: 0 },
    { status: 'draft', amount: 15000000, discount: 1500000 },
    { status: 'draft', amount: 50000000, discount: 5000000 },

    // SENT invoices (not yet paid)
    { status: 'sent', amount: 8000000, discount: 0, daysUntilDue: 14 },
    { status: 'sent', amount: 25000000, discount: 2500000, daysUntilDue: 7 },
    { status: 'sent', amount: 100000000, discount: 10000000, daysUntilDue: 30 },

    // PAID invoices
    { status: 'paid', amount: 10000000, discount: 0, daysAgo: 7 },
    { status: 'paid', amount: 35000000, discount: 3500000, daysAgo: 30 },
    { status: 'paid', amount: 75000000, discount: 7500000, daysAgo: 90 },
    { status: 'paid', amount: 150000000, discount: 15000000, daysAgo: 180 },

    // PARTIAL payment
    { status: 'partial', amount: 20000000, discount: 0, partialPaid: 10000000 },
    { status: 'partial', amount: 50000000, discount: 5000000, partialPaid: 25000000 },

    // OVERDUE invoices
    { status: 'overdue', amount: 12000000, discount: 0, daysOverdue: 7 },
    { status: 'overdue', amount: 30000000, discount: 3000000, daysOverdue: 30 },
    { status: 'overdue', amount: 80000000, discount: 8000000, daysOverdue: 90 },

    // CANCELLED invoices
    { status: 'cancelled', amount: 5000000, discount: 0 },
    { status: 'cancelled', amount: 25000000, discount: 2500000 },
  ];

  let invNum = 1;
  invoiceScenarios.forEach((scenario) => {
    const order = pickRandom(orders);
    const customer = customers.find((c) => c.id === order.customer_id) || customers[0];
    const subtotal = scenario.amount;
    const discount = scenario.discount;
    const ppnRate = 0.11;
    const ppnAmount = Math.round((subtotal - discount) * ppnRate);
    const totalAmount = subtotal - discount + ppnAmount;

    let issueDate = new Date(now);
    let dueDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    if (scenario.daysAgo) {
      issueDate = new Date(now.getTime() - scenario.daysAgo * 24 * 60 * 60 * 1000);
      dueDate = new Date(issueDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    }
    if (scenario.daysOverdue) {
      issueDate = new Date(now.getTime() - (scenario.daysOverdue + 14) * 24 * 60 * 60 * 1000);
      dueDate = new Date(now.getTime() - scenario.daysOverdue * 24 * 60 * 60 * 1000);
    }
    if (scenario.daysUntilDue) {
      issueDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dueDate = new Date(now.getTime() + scenario.daysUntilDue * 24 * 60 * 60 * 1000);
    }

    invoices.push({
      id: uuidv4(),
      invoice_number: `INV-${String(invNum++).padStart(4, '0')}`,
      order_id: order.id,
      customer_id: customer.id,
      subtotal: subtotal,
      discount: discount,
      ppn_rate: ppnRate,
      ppn_amount: ppnAmount,
      total_amount: totalAmount,
      status: scenario.status,
      issue_date: formatDateTime(issueDate),
      due_date: formatDateTime(dueDate),
      notes:
        scenario.status === 'partial'
          ? `Partial payment received: Rp ${scenario.partialPaid?.toLocaleString()}`
          : null,
      created_by: ownerId,
    });
  });

  // Generate more random invoices
  for (let i = invNum; i <= 80; i++) {
    const order = orders[(i - 1) % orders.length];
    const customer = customers.find((c) => c.id === order.customer_id) || customers[0];
    const subtotal = order.total_amount;
    const discount = Math.random() > 0.7 ? Math.round(subtotal * 0.1) : 0;
    const ppnRate = 0.11;
    const ppnAmount = Math.round((subtotal - discount) * ppnRate);
    const totalAmount = subtotal - discount + ppnAmount;
    const issueDate = new Date(order.created_at);
    const dueDate = new Date(issueDate.getTime() + 14 * 24 * 60 * 60 * 1000);

    invoices.push({
      id: uuidv4(),
      invoice_number: `INV-${String(i).padStart(4, '0')}`,
      order_id: order.id,
      customer_id: customer.id,
      subtotal: subtotal,
      discount: discount,
      ppn_rate: ppnRate,
      ppn_amount: ppnAmount,
      total_amount: totalAmount,
      status: pickRandom(invoiceStatuses),
      issue_date: formatDateTime(issueDate),
      due_date: formatDateTime(dueDate),
      notes: null,
      created_by: ownerId,
    });
  }

  const insertInvoice = db.prepare(
    `INSERT INTO invoices (id, invoice_number, order_id, customer_id, subtotal, discount, ppn_rate, ppn_amount, total_amount, status, issue_date, due_date, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  invoices.forEach((inv) =>
    insertInvoice.run(
      inv.id,
      inv.invoice_number,
      inv.order_id,
      inv.customer_id,
      inv.subtotal,
      inv.discount,
      inv.ppn_rate,
      inv.ppn_amount,
      inv.total_amount,
      inv.status,
      inv.issue_date,
      inv.due_date,
      inv.notes,
      inv.created_by
    )
  );
  log(`   Created ${invoices.length} invoices`);

  // ==================== FINANCIAL TRANSACTIONS ====================
  log('Seeding financial transactions (120 transactions)...');
  const transTypes = ['income', 'expense'];
  const incomeCategories = ['sales', 'deposit', 'refund_reversal', 'other_income'];
  const expenseCategories = [
    'materials',
    'labor',
    'utilities',
    'rent',
    'marketing',
    'equipment',
    'transport',
    'maintenance',
    'office',
    'misc',
  ];
  const transactions = [];

  for (let i = 0; i < 120; i++) {
    const type = pickRandom(transTypes);
    const category =
      type === 'income' ? pickRandom(incomeCategories) : pickRandom(expenseCategories);
    const order = Math.random() > 0.4 ? pickRandom(orders) : null;
    const transDate = randomDate(oneYearAgo, now);
    const amount = type === 'income' ? randomInt(1000000, 100000000) : randomInt(100000, 20000000);

    transactions.push({
      id: uuidv4(),
      type: type,
      amount: amount,
      category: category,
      order_id: order ? order.id : null,
      payment_date: formatDateTime(transDate),
      description: `${type === 'income' ? 'Payment received' : 'Payment for'} - ${category}`,
    });
  }

  const insertTrans = db.prepare(
    `INSERT INTO financial_transactions (id, type, amount, category, order_id, payment_date, description) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  transactions.forEach((t) =>
    insertTrans.run(t.id, t.type, t.amount, t.category, t.order_id, t.payment_date, t.description)
  );
  log(`   Created ${transactions.length} financial transactions`);

  // ==================== BUDGETS ====================
  log('Seeding budgets (24 budgets - monthly and quarterly)...');
  const budgetCategories = [
    'materials',
    'labor',
    'utilities',
    'rent',
    'marketing',
    'equipment',
    'office',
    'transport',
    'maintenance',
    'insurance',
    'training',
    'misc',
  ];
  const budgets = [];

  // Monthly budgets for current year
  for (let month = 0; month < 12; month++) {
    const startDate = new Date(now.getFullYear(), month, 1);
    const endDate = new Date(now.getFullYear(), month + 1, 0);

    budgets.push({
      id: uuidv4(),
      category: budgetCategories[month % budgetCategories.length],
      amount: randomInt(5000000, 50000000),
      period: 'monthly',
      start_date: formatDateTime(startDate),
      end_date: formatDateTime(endDate),
      notes: `Monthly budget for ${budgetCategories[month % budgetCategories.length]}`,
      created_by: ownerId,
    });
  }

  // Quarterly budgets
  for (let q = 0; q < 4; q++) {
    const startDate = new Date(now.getFullYear(), q * 3, 1);
    const endDate = new Date(now.getFullYear(), (q + 1) * 3, 0);

    budgets.push({
      id: uuidv4(),
      category: 'overall',
      amount: randomInt(100000000, 500000000),
      period: 'quarterly',
      start_date: formatDateTime(startDate),
      end_date: formatDateTime(endDate),
      notes: `Q${q + 1} overall budget`,
      created_by: ownerId,
    });
  }

  // Yearly budgets
  for (let i = 0; i < 4; i++) {
    budgets.push({
      id: uuidv4(),
      category: pickRandom(budgetCategories),
      amount: randomInt(200000000, 1000000000),
      period: 'yearly',
      start_date: formatDateTime(new Date(now.getFullYear(), 0, 1)),
      end_date: formatDateTime(new Date(now.getFullYear(), 11, 31)),
      notes: 'Annual budget',
      created_by: ownerId,
    });
  }

  const insertBudget = db.prepare(
    `INSERT INTO budgets (id, category, amount, period, start_date, end_date, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  budgets.forEach((b) =>
    insertBudget.run(
      b.id,
      b.category,
      b.amount,
      b.period,
      b.start_date,
      b.end_date,
      b.notes,
      b.created_by
    )
  );
  log(`   Created ${budgets.length} budgets`);

  return { invoices, transactions, budgets };
};
