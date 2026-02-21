// ULTRA COMPREHENSIVE Seed Data Script for Premium Gift Box
// Covers ALL edge cases, ALL scenarios for complete API testing
const DatabaseService = require('../services/DatabaseService');

const seedUsers = require('./seeds/users');
const seedCustomers = require('./seeds/customers');
const seedOrders = require('./seeds/orders');
const seedInventory = require('./seeds/inventory');
const seedFinancial = require('./seeds/financial');
const seedProduction = require('./seeds/production');
const seedCommunications = require('./seeds/communications');

// Seed logger — silence with SEED_QUIET=1
const quiet = process.env.SEED_QUIET === '1';
const log = (...args) => {
  if (!quiet) console.log(...args);
};

// Shared helper functions used by seed modules
const helpers = {
  randomDate: (start, end) =>
    new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())),
  randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  randomFloat: (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2)),
  pickRandom: (arr) => arr[Math.floor(Math.random() * arr.length)],
  formatDate: (date) => date.toISOString().split('T')[0],
  formatDateTime: (date) => date.toISOString(),
};

// Initialize database
const dbService = new DatabaseService();
dbService.initialize();
const db = dbService.db;

log('\n🌱 Starting ULTRA COMPREHENSIVE database seeding...\n');
log('📋 This seed covers ALL edge cases and scenarios\n');

// Clear all existing data first (disable foreign keys to avoid constraint issues)
log('🗑️ Clearing existing data...');
db.exec('PRAGMA foreign_keys = OFF');

const tablesToClear = [
  'communication_messages',
  'quality_checks',
  'purchase_order_items',
  'purchase_orders',
  'inventory_movements',
  'webhooks',
  'webhook_configs',
  'audit_logs',
  'notifications',
  'settings',
  'message_templates',
  'budgets',
  'production_logs',
  'order_stages',
  'production_tasks',
  'invoice_items',
  'invoices',
  'transactions',
  'order_files',
  'files',
  'orders',
  'inventory',
  'customers',
  'users',
  'backups',
];

tablesToClear.forEach((table) => {
  try {
    db.exec(`DELETE FROM ${table}`);
  } catch (e) {
    // Table might not exist, ignore
  }
});

db.exec('PRAGMA foreign_keys = ON');
log('   ✅ Cleared all existing data\n');

// Run all seed modules in order (foreign key dependencies)
async function runSeeds() {
  // 1. Users first (no dependencies)
  const { users, ownerId, managerId, employeeIds } = await seedUsers(db, { log });

  // 2. Customers (no dependencies)
  const { customers } = await seedCustomers(db, { log });

  // 3. Orders (depends on customers)
  const { orders } = await seedOrders(db, { log, helpers, customers });

  // 4. Inventory (depends on users, orders)
  const { materials, movements, purchaseOrders } = await seedInventory(db, {
    log,
    helpers,
    users,
    orders,
    ownerId,
  });

  // 5. Financial (depends on orders, customers, ownerId)
  const { invoices, transactions, budgets } = await seedFinancial(db, {
    log,
    helpers,
    orders,
    customers,
    ownerId,
  });

  // 6. Production (depends on orders, users, ownerId, employeeIds)
  const { tasks, qualityChecks, orderStages, prodLogs } = await seedProduction(db, {
    log,
    helpers,
    orders,
    users,
    ownerId,
    employeeIds,
  });

  // 7. Communications (depends on users, customers, ownerId)
  const { templates, settings, notifications, auditLogs, webhooks, commMessages, backups } =
    await seedCommunications(db, {
      log,
      helpers,
      users,
      customers,
      ownerId,
    });

  // Close database
  db.close();

  // ==================== SUMMARY ====================
  log('\n' + '='.repeat(60));
  log('✨ ULTRA COMPREHENSIVE DATABASE SEEDING COMPLETED!');
  log('='.repeat(60));
  log('\n📊 DATA SUMMARY:');
  log('─'.repeat(40));
  log(`   Users:                 ${users.length}`);
  log(`   Customers:             ${customers.length}`);
  log(`   Materials:             ${materials.length}`);
  log(`   Orders:                ${orders.length}`);
  log(`   Invoices:              ${invoices.length}`);
  log(`   Production Tasks:      ${tasks.length}`);
  log(`   Financial Trans:       ${transactions.length}`);
  log(`   Budgets:               ${budgets.length}`);
  log(`   Message Templates:     ${templates.length}`);
  log(`   Settings:              ${settings.length}`);
  log(`   Notifications:         ${notifications.length}`);
  log(`   Audit Logs:            ${auditLogs.length}`);
  log(`   Webhooks:              ${webhooks.length}`);
  log(`   Inventory Movements:   ${movements.length}`);
  log(`   Purchase Orders:       ${purchaseOrders.length}`);
  log(`   Quality Checks:        ${qualityChecks.length}`);
  log(`   Comm. Messages:        ${commMessages.length}`);
  log(`   Backups:               ${backups.length}`);
  log(`   Order Stages:          ${orderStages.length}`);
  log(`   Production Logs:       ${prodLogs.length}`);
  log('─'.repeat(40));
  const totalRecords =
    users.length +
    customers.length +
    materials.length +
    orders.length +
    invoices.length +
    tasks.length +
    transactions.length +
    budgets.length +
    templates.length +
    settings.length +
    notifications.length +
    auditLogs.length +
    webhooks.length +
    movements.length +
    purchaseOrders.length +
    qualityChecks.length +
    commMessages.length +
    backups.length +
    orderStages.length +
    prodLogs.length;
  log(`   TOTAL RECORDS:         ${totalRecords}`);

  log('\n🔑 TEST ACCOUNTS:');
  log('─'.repeat(40));
  log('   OWNER:    owner / owner123');
  log('   MANAGER:  manager / manager123');
  log('   EMPLOYEE: employee1 / employee123');
  log('   DESIGNER: designer / designer123');
  log('   QC STAFF: qc_staff / qc123');
  log('   TEST:     test_user / test123');
  log('   INACTIVE: inactive_employee / inactive123 (disabled)');

  log('\n📋 EDGE CASES INCLUDED:');
  log('─'.repeat(40));
  log('   ✓ Users: active, inactive, all roles, special chars');
  log('   ✓ Customers: all business types, loyalty statuses, null fields');
  log('   ✓ Materials: all categories, low stock, out of stock, high value');
  log('   ✓ Orders: all statuses, priorities, overdue, completed');
  log('   ✓ Invoices: all statuses, partial payment, overdue');
  log('   ✓ Tasks: assigned, unassigned, all statuses');
  log('   ✓ Templates: all types, active/inactive, with/without variables');
  log('   ✓ Webhooks: active/inactive, various event types');
  log('   ✓ And much more...');

  log('\n🚀 Ready for comprehensive API testing!');
  log('='.repeat(60) + '\n');
}

runSeeds().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
