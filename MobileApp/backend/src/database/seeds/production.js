// Seed: Production - Tasks (150), Quality Checks (60), Order Stages (150), Production Logs (80)
const { v4: uuidv4 } = require('uuid');

module.exports = async function seedProduction(
  db,
  { log, helpers, orders, users, ownerId, employeeIds }
) {
  const { randomInt, pickRandom, formatDateTime, randomDate, randomFloat } = helpers;

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
  const priorities = ['low', 'normal', 'high', 'urgent'];

  // ==================== PRODUCTION TASKS ====================
  log('Seeding production tasks (150 tasks - all statuses, assignments)...');
  const taskStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
  const taskTitles = [
    'Design Layout',
    'Print Materials',
    'Cut Cardboard',
    'Assemble Box Base',
    'Apply Foil Stamping',
    'Quality Check - Materials',
    'Apply Lamination',
    'Install Magnetic Closure',
    'Add Interior Lining',
    'Final Assembly',
    'Quality Check - Final',
    'Packaging',
    'Add Ribbon Decoration',
    'Embossing',
    'Customer Review',
    'Design Revision',
    'Sample Creation',
    'Bulk Production',
  ];
  const tasks = [];

  for (let i = 0; i < 150; i++) {
    const order = orders[i % orders.length];
    const status = pickRandom(taskStatuses);
    const createdDate = new Date(order.created_at);
    const dueDate = new Date(createdDate.getTime() + randomInt(1, 14) * 24 * 60 * 60 * 1000);
    const isCompleted = status === 'completed';
    const assignedTo = Math.random() > 0.1 ? pickRandom(employeeIds) : null; // 10% unassigned

    tasks.push({
      id: uuidv4(),
      order_id: order.id,
      title: pickRandom(taskTitles),
      description: `Task ${i + 1} for order ${order.order_number}`,
      status: status,
      priority: pickRandom(priorities),
      assigned_to: assignedTo,
      estimated_hours: randomFloat(0.5, 8),
      actual_hours: isCompleted ? randomFloat(0.5, 10) : null,
      start_date: formatDateTime(createdDate),
      due_date: formatDateTime(dueDate),
      completed_at: isCompleted
        ? formatDateTime(new Date(dueDate.getTime() - randomInt(0, 3) * 24 * 60 * 60 * 1000))
        : null,
      notes:
        Math.random() > 0.7
          ? 'Task note: ' +
            pickRandom([
              'Priority item',
              'Customer requested changes',
              'Waiting for materials',
              'In progress',
            ])
          : null,
      created_by: ownerId,
    });
  }

  const insertTask = db.prepare(
    `INSERT INTO production_tasks (id, order_id, title, description, status, priority, assigned_to, estimated_hours, actual_hours, start_date, due_date, completed_at, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  tasks.forEach((t) =>
    insertTask.run(
      t.id,
      t.order_id,
      t.title,
      t.description,
      t.status,
      t.priority,
      t.assigned_to,
      t.estimated_hours,
      t.actual_hours,
      t.start_date,
      t.due_date,
      t.completed_at,
      t.notes,
      t.created_by
    )
  );
  log(`   Created ${tasks.length} production tasks`);

  // ==================== QUALITY CHECKS ====================
  log('Seeding quality checks (60 checks - all statuses)...');
  const qcStatuses = ['pending', 'passed', 'failed'];
  const qcTypes = ['visual', 'dimensional', 'material', 'finish', 'assembly', 'packaging', 'final'];
  const qualityChecks = [];

  for (let i = 0; i < 60; i++) {
    const order = pickRandom(orders);
    const status = pickRandom(qcStatuses);
    const checkDate = randomDate(sixMonthsAgo, now);

    qualityChecks.push({
      id: uuidv4(),
      order_id: order.id,
      check_type: pickRandom(qcTypes),
      status: status,
      checked_by: status !== 'pending' ? pickRandom(users.filter((u) => u.is_active)).id : null,
      checked_at: status !== 'pending' ? formatDateTime(checkDate) : null,
      notes:
        status === 'failed'
          ? pickRandom([
              'Defect found',
              'Color mismatch',
              'Dimension incorrect',
              'Material damage',
              'Assembly issue',
            ])
          : null,
    });
  }

  const insertQC = db.prepare(
    `INSERT INTO quality_checks (id, order_id, check_type, status, checked_by, checked_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  qualityChecks.forEach((qc) =>
    insertQC.run(
      qc.id,
      qc.order_id,
      qc.check_type,
      qc.status,
      qc.checked_by,
      qc.checked_at,
      qc.notes
    )
  );
  log(`   Created ${qualityChecks.length} quality checks`);

  // ==================== ORDER STAGES ====================
  log('Seeding order stages (150 stages)...');
  const stageNames = [
    'inquiry',
    'quote',
    'design',
    'design_approval',
    'material_prep',
    'production',
    'finishing',
    'quality_check',
    'packaging',
    'ready',
    'delivery',
    'completed',
  ];
  const orderStages = [];

  for (let i = 0; i < 150; i++) {
    const order = orders[i % orders.length];
    const stage = pickRandom(stageNames);
    const startDate = new Date(order.created_at);
    const hasEndDate = Math.random() > 0.3;

    orderStages.push({
      id: uuidv4(),
      order_id: order.id,
      stage: stage,
      start_date: formatDateTime(startDate),
      end_date: hasEndDate
        ? formatDateTime(new Date(startDate.getTime() + randomInt(1, 7) * 24 * 60 * 60 * 1000))
        : null,
      notes: Math.random() > 0.7 ? `Stage note: ${stage} for order ${order.order_number}` : null,
      created_by: pickRandom(users.filter((u) => u.is_active)).id,
    });
  }

  const insertStage = db.prepare(
    `INSERT INTO order_stages (id, order_id, stage, start_date, end_date, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  orderStages.forEach((s) =>
    insertStage.run(s.id, s.order_id, s.stage, s.start_date, s.end_date, s.notes, s.created_by)
  );
  log(`   Created ${orderStages.length} order stages`);

  // ==================== PRODUCTION LOGS ====================
  log('Seeding production logs (80 logs)...');
  const prodActions = [
    'started',
    'paused',
    'resumed',
    'completed',
    'note_added',
    'issue_reported',
    'issue_resolved',
  ];
  const prodLogs = [];

  for (let i = 0; i < 80; i++) {
    const task = pickRandom(tasks);
    const action = pickRandom(prodActions);

    prodLogs.push({
      id: uuidv4(),
      task_id: task.id,
      action: action,
      description: `Production log: ${action} for task "${task.title}"`,
      hours_worked: ['completed', 'paused'].includes(action) ? randomFloat(0.5, 4) : null,
      created_by: pickRandom(users.filter((u) => u.is_active)).id,
    });
  }

  const insertProdLog = db.prepare(
    `INSERT INTO production_logs (id, task_id, action, description, hours_worked, created_by) VALUES (?, ?, ?, ?, ?, ?)`
  );
  prodLogs.forEach((l) =>
    insertProdLog.run(l.id, l.task_id, l.action, l.description, l.hours_worked, l.created_by)
  );
  log(`   Created ${prodLogs.length} production logs`);

  return { tasks, qualityChecks, orderStages, prodLogs };
};
