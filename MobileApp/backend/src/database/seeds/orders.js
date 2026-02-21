// Seed: Orders (100 orders - all statuses, priorities, edge cases)
const { v4: uuidv4 } = require('uuid');

module.exports = async function seedOrders(db, { log, helpers, customers }) {
  const { randomInt, pickRandom, formatDateTime, randomDate } = helpers;

  log('Seeding orders (100 orders - all statuses, priorities, edge cases)...');

  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

  const orderStatuses = [
    'pending',
    'designing',
    'approved',
    'production',
    'quality_control',
    'completed',
    'cancelled',
  ];
  const boxTypes = ['executive', 'luxury', 'premium', 'standard', 'custom'];
  const priorities = ['low', 'normal', 'high', 'urgent'];
  const orders = [];

  // Create specific test orders first
  const specificOrders = [
    // PENDING orders
    { status: 'pending', priority: 'urgent', due: tomorrow, created: now },
    { status: 'pending', priority: 'high', due: nextWeek, created: oneWeekAgo },
    { status: 'pending', priority: 'normal', due: nextMonth, created: oneMonthAgo },
    { status: 'pending', priority: 'low', due: nextMonth, created: sixMonthsAgo },

    // DESIGNING orders
    { status: 'designing', priority: 'urgent', due: tomorrow, created: oneWeekAgo },
    { status: 'designing', priority: 'high', due: nextWeek, created: oneMonthAgo },
    { status: 'designing', priority: 'normal', due: nextMonth, created: oneMonthAgo },

    // APPROVED orders
    { status: 'approved', priority: 'urgent', due: tomorrow, created: oneWeekAgo },
    { status: 'approved', priority: 'high', due: nextWeek, created: oneMonthAgo },
    { status: 'approved', priority: 'normal', due: nextMonth, created: sixMonthsAgo },

    // PRODUCTION orders
    { status: 'production', priority: 'urgent', due: tomorrow, created: oneWeekAgo },
    { status: 'production', priority: 'high', due: nextWeek, created: oneMonthAgo },
    { status: 'production', priority: 'normal', due: nextMonth, created: oneMonthAgo },
    { status: 'production', priority: 'low', due: nextMonth, created: sixMonthsAgo },

    // QUALITY_CONTROL orders
    { status: 'quality_control', priority: 'urgent', due: tomorrow, created: oneWeekAgo },
    { status: 'quality_control', priority: 'high', due: nextWeek, created: oneMonthAgo },
    { status: 'quality_control', priority: 'normal', due: nextMonth, created: oneMonthAgo },

    // COMPLETED orders (various dates)
    {
      status: 'completed',
      priority: 'normal',
      due: oneWeekAgo,
      created: oneMonthAgo,
      completed: oneWeekAgo,
    },
    {
      status: 'completed',
      priority: 'high',
      due: oneMonthAgo,
      created: sixMonthsAgo,
      completed: oneMonthAgo,
    },
    {
      status: 'completed',
      priority: 'urgent',
      due: sixMonthsAgo,
      created: oneYearAgo,
      completed: sixMonthsAgo,
    },

    // CANCELLED orders
    { status: 'cancelled', priority: 'normal', due: oneWeekAgo, created: oneMonthAgo },
    { status: 'cancelled', priority: 'high', due: oneMonthAgo, created: sixMonthsAgo },
  ];

  let orderNum = 1;
  specificOrders.forEach((spec) => {
    const customer = pickRandom(customers);
    const totalAmount = randomInt(1000000, 100000000);
    orders.push({
      id: uuidv4(),
      order_number: `ORD-${String(orderNum++).padStart(4, '0')}`,
      customer_id: customer.id,
      status: spec.status,
      priority: spec.priority,
      total_amount: totalAmount,
      final_price: Math.round(totalAmount * 1.11),
      box_type: pickRandom(boxTypes),
      due_date: formatDateTime(spec.due),
      estimated_completion: formatDateTime(spec.due),
      actual_completion: spec.completed ? formatDateTime(spec.completed) : null,
      created_at: formatDateTime(spec.created),
    });
  });

  // Generate more random orders
  for (let i = orderNum; i <= 100; i++) {
    const customer = pickRandom(customers);
    const status = pickRandom(orderStatuses);
    const createdDate = randomDate(oneYearAgo, now);
    const dueDate = new Date(createdDate.getTime() + randomInt(7, 60) * 24 * 60 * 60 * 1000);
    const totalAmount = randomInt(500000, 50000000);
    const isCompleted = status === 'completed';

    orders.push({
      id: uuidv4(),
      order_number: `ORD-${String(i).padStart(4, '0')}`,
      customer_id: customer.id,
      status: status,
      priority: pickRandom(priorities),
      total_amount: totalAmount,
      final_price: Math.round(totalAmount * 1.11),
      box_type: pickRandom(boxTypes),
      due_date: formatDateTime(dueDate),
      estimated_completion: formatDateTime(dueDate),
      actual_completion: isCompleted
        ? formatDateTime(new Date(dueDate.getTime() - randomInt(0, 7) * 24 * 60 * 60 * 1000))
        : null,
      created_at: formatDateTime(createdDate),
    });
  }

  const insertOrder = db.prepare(
    `INSERT INTO orders (id, order_number, customer_id, status, priority, total_amount, final_price, box_type, due_date, estimated_completion, actual_completion, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  orders.forEach((o) =>
    insertOrder.run(
      o.id,
      o.order_number,
      o.customer_id,
      o.status,
      o.priority,
      o.total_amount,
      o.final_price,
      o.box_type,
      o.due_date,
      o.estimated_completion,
      o.actual_completion,
      o.created_at
    )
  );
  log(`   Created ${orders.length} orders`);

  return { orders };
};
