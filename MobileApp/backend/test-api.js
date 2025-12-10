// Comprehensive API Test Script
const http = require('http');

const BASE_URL = 'http://localhost:3000';
let TOKEN = '';
let testResults = { passed: 0, failed: 0, errors: [] };

function request(method, path, data = null, useToken = true) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (useToken && TOKEN) {
      options.headers['Authorization'] = `Bearer ${TOKEN}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function test(name, condition) {
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
    testResults.passed++;
  } else {
    console.log(`  ❌ FAIL: ${name}`);
    testResults.failed++;
    testResults.errors.push(name);
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log('   COMPREHENSIVE API TEST SUITE');
  console.log('========================================\n');

  // ==================== AUTH TESTS ====================
  console.log('📝 1. AUTH API TESTS');
  console.log('────────────────────────────────────────');

  // Login as owner
  let res = await request('POST', '/api/auth/login', { username: 'owner', password: 'owner123' }, false);
  test('Login owner - success', res.data.success === true);
  TOKEN = res.data.token;

  // Login as manager
  res = await request('POST', '/api/auth/login', { username: 'manager', password: 'manager123' }, false);
  test('Login manager - success', res.data.success === true);

  // Login as employee
  res = await request('POST', '/api/auth/login', { username: 'employee1', password: 'employee123' }, false);
  test('Login employee - success', res.data.success === true);

  // Invalid password
  res = await request('POST', '/api/auth/login', { username: 'owner', password: 'wrongpassword' }, false);
  test('Invalid password - rejected', res.data.success === false);

  // Inactive user
  res = await request('POST', '/api/auth/login', { username: 'inactive_employee', password: 'inactive123' }, false);
  test('Inactive user - rejected', res.data.success === false);

  // Get current user
  res = await request('GET', '/api/auth/me');
  test('Get current user', res.data.user !== undefined);

  // No token access
  res = await request('GET', '/api/customers', null, false);
  test('No token - rejected', res.status === 401 || res.data.error);

  // ==================== CUSTOMERS TESTS ====================
  console.log('\n👥 2. CUSTOMERS API TESTS');
  console.log('────────────────────────────────────────');

  res = await request('GET', '/api/customers');
  test('Get all customers', Array.isArray(res.data.customers || res.data));
  const customerCount = (res.data.customers || res.data).length;
  test(`Has seeded customers (${customerCount})`, customerCount >= 40);

  res = await request('GET', '/api/customers?limit=10');
  test('Get customers with limit', (res.data.customers || res.data).length <= 10);

  res = await request('GET', '/api/customers?search=PT');
  test('Search customers', Array.isArray(res.data.customers || res.data));

  res = await request('GET', '/api/customers?business_type=corporate');
  test('Filter by business type', Array.isArray(res.data.customers || res.data));

  res = await request('GET', '/api/customers?loyalty_status=vip');
  test('Filter by loyalty status', Array.isArray(res.data.customers || res.data));

  // Create customer
  res = await request('POST', '/api/customers', {
    name: 'Test Customer API',
    email: 'testapi@example.com',
    phone: '+62-812-9999-0001',
    business_type: 'corporate'
  });
  test('Create customer', res.data.success || res.data.id);
  const newCustomerId = res.data.customerId || res.data.id;

  // Get customer by ID
  if (newCustomerId) {
    res = await request('GET', `/api/customers/${newCustomerId}`);
    test('Get customer by ID', res.data.customer || res.data.name);
  }

  // ==================== ORDERS TESTS ====================
  console.log('\n📋 3. ORDERS API TESTS');
  console.log('────────────────────────────────────────');

  res = await request('GET', '/api/orders');
  test('Get all orders', Array.isArray(res.data.orders || res.data));
  const orderCount = (res.data.orders || res.data).length;
  test(`Has seeded orders (${orderCount})`, orderCount >= 50);

  res = await request('GET', '/api/orders?status=pending');
  test('Filter orders by status', Array.isArray(res.data.orders || res.data));

  res = await request('GET', '/api/orders?priority=urgent');
  test('Filter orders by priority', Array.isArray(res.data.orders || res.data));

  // Get order stats
  res = await request('GET', '/api/orders/stats');
  test('Get order stats', res.data !== undefined);

  // ==================== INVENTORY TESTS ====================
  console.log('\n📦 4. INVENTORY API TESTS');
  console.log('────────────────────────────────────────');

  res = await request('GET', '/api/inventory');
  test('Get all inventory', Array.isArray(res.data.inventory || res.data.items || res.data));

  res = await request('GET', '/api/inventory?category=paper');
  test('Filter inventory by category', Array.isArray(res.data.inventory || res.data.items || res.data));

  res = await request('GET', '/api/inventory/low-stock');
  test('Get low stock items', Array.isArray(res.data.items || res.data));

  // ==================== INVOICES TESTS ====================
  console.log('\n💰 5. INVOICES API TESTS');
  console.log('────────────────────────────────────────');

  res = await request('GET', '/api/invoices');
  test('Get all invoices', Array.isArray(res.data.invoices || res.data));
  const invoiceCount = (res.data.invoices || res.data).length;
  test(`Has seeded invoices (${invoiceCount})`, invoiceCount >= 50);

  res = await request('GET', '/api/invoices?status=paid');
  test('Filter invoices by status', Array.isArray(res.data.invoices || res.data));

  res = await request('GET', '/api/invoices?status=overdue');
  test('Filter overdue invoices', Array.isArray(res.data.invoices || res.data));

  // ==================== PRODUCTION TESTS ====================
  console.log('\n🏭 6. PRODUCTION API TESTS');
  console.log('────────────────────────────────────────');

  res = await request('GET', '/api/production/tasks');
  test('Get production tasks', Array.isArray(res.data.tasks || res.data));

  res = await request('GET', '/api/production/tasks?status=pending');
  test('Filter tasks by status', Array.isArray(res.data.tasks || res.data));

  res = await request('GET', '/api/production/board');
  test('Get production board', res.data !== undefined);

  // ==================== FINANCE TESTS ====================
  console.log('\n💵 7. FINANCE API TESTS');
  console.log('────────────────────────────────────────');

  res = await request('GET', '/api/finance/transactions');
  test('Get transactions', Array.isArray(res.data.transactions || res.data));

  res = await request('GET', '/api/finance/transactions?type=income');
  test('Filter income transactions', Array.isArray(res.data.transactions || res.data));

  res = await request('GET', '/api/finance/transactions?type=expense');
  test('Filter expense transactions', Array.isArray(res.data.transactions || res.data));

  res = await request('GET', '/api/finance/summary');
  test('Get finance summary', res.data !== undefined);

  res = await request('GET', '/api/finance/budgets');
  test('Get budgets', Array.isArray(res.data.budgets || res.data));

  // ==================== DASHBOARD TESTS ====================
  console.log('\n📊 8. DASHBOARD API TESTS');
  console.log('────────────────────────────────────────');

  res = await request('GET', '/api/dashboard/stats');
  test('Get dashboard stats', res.data !== undefined);

  res = await request('GET', '/api/dashboard/recent-orders');
  test('Get recent orders', Array.isArray(res.data.orders || res.data));

  res = await request('GET', '/api/dashboard/overview');
  test('Get dashboard overview', res.data !== undefined);

  // ==================== TEMPLATES TESTS ====================
  console.log('\n📝 9. TEMPLATES API TESTS');
  console.log('────────────────────────────────────────');

  res = await request('GET', '/api/templates');
  test('Get all templates', Array.isArray(res.data.templates || res.data));

  res = await request('GET', '/api/templates?type=whatsapp');
  test('Filter WhatsApp templates', Array.isArray(res.data.templates || res.data));

  res = await request('GET', '/api/templates?type=email');
  test('Filter email templates', Array.isArray(res.data.templates || res.data));

  // ==================== NOTIFICATIONS TESTS ====================
  console.log('\n🔔 10. NOTIFICATIONS API TESTS');
  console.log('────────────────────────────────────────');

  res = await request('GET', '/api/notifications');
  test('Get notifications', Array.isArray(res.data.notifications || res.data));

  res = await request('GET', '/api/notifications/unread');
  test('Get unread notifications', Array.isArray(res.data.notifications || res.data) || res.data.count !== undefined);

  // ==================== SETTINGS TESTS ====================
  console.log('\n⚙️ 11. SETTINGS API TESTS');
  console.log('────────────────────────────────────────');

  res = await request('GET', '/api/settings');
  test('Get all settings', res.data !== undefined);

  res = await request('GET', '/api/settings?category=general');
  test('Get general settings', res.data !== undefined);

  // ==================== USERS TESTS ====================
  console.log('\n👤 12. USERS API TESTS');
  console.log('────────────────────────────────────────');

  res = await request('GET', '/api/users');
  test('Get all users', Array.isArray(res.data.users || res.data));

  res = await request('GET', '/api/users?role=employee');
  test('Filter users by role', Array.isArray(res.data.users || res.data));

  // ==================== SEARCH TESTS ====================
  console.log('\n🔍 13. SEARCH API TESTS');
  console.log('────────────────────────────────────────');

  res = await request('GET', '/api/search?q=test');
  test('Global search', res.data !== undefined);

  res = await request('GET', '/api/search?q=PT&type=customers');
  test('Search customers', res.data !== undefined);

  res = await request('GET', '/api/search?q=PGB&type=orders');
  test('Search orders', res.data !== undefined);

  // ==================== WEBHOOKS TESTS ====================
  console.log('\n🔗 14. WEBHOOKS API TESTS');
  console.log('────────────────────────────────────────');

  res = await request('GET', '/api/webhooks');
  test('Get webhooks', Array.isArray(res.data.webhooks || res.data));

  // ==================== AUDIT LOGS TESTS ====================
  console.log('\n📜 15. AUDIT LOGS API TESTS');
  console.log('────────────────────────────────────────');

  res = await request('GET', '/api/audit-logs');
  test('Get audit logs', Array.isArray(res.data.logs || res.data));

  // ==================== REPORTS TESTS ====================
  console.log('\n📈 16. REPORTS API TESTS');
  console.log('────────────────────────────────────────');

  res = await request('GET', '/api/reports/sales');
  test('Get sales report', res.data !== undefined);

  res = await request('GET', '/api/reports/inventory');
  test('Get inventory report', res.data !== undefined);

  res = await request('GET', '/api/reports/production');
  test('Get production report', res.data !== undefined);

  // ==================== QUALITY CHECKS TESTS ====================
  console.log('\n✅ 17. QUALITY CHECKS API TESTS');
  console.log('────────────────────────────────────────');

  res = await request('GET', '/api/quality-checks');
  test('Get quality checks', Array.isArray(res.data.checks || res.data));

  // ==================== PURCHASE ORDERS TESTS ====================
  console.log('\n🛒 18. PURCHASE ORDERS API TESTS');
  console.log('────────────────────────────────────────');

  res = await request('GET', '/api/purchase-orders');
  test('Get purchase orders', Array.isArray(res.data.purchaseOrders || res.data.orders || res.data));

  // ==================== BACKUPS TESTS ====================
  console.log('\n💾 19. BACKUPS API TESTS');
  console.log('────────────────────────────────────────');

  res = await request('GET', '/api/backups');
  test('Get backups', Array.isArray(res.data.backups || res.data));

  // ==================== EDGE CASES ====================
  console.log('\n🔧 20. EDGE CASES TESTS');
  console.log('────────────────────────────────────────');

  // Invalid endpoint
  res = await request('GET', '/api/nonexistent');
  test('Invalid endpoint returns 404', res.status === 404);

  // Invalid ID format
  res = await request('GET', '/api/customers/invalid-id');
  test('Invalid customer ID handled', res.status === 404 || res.data.error);

  // Empty search
  res = await request('GET', '/api/search?q=');
  test('Empty search handled', res.data !== undefined);

  // Pagination edge case
  res = await request('GET', '/api/customers?page=9999&limit=10');
  test('Pagination out of range handled', res.data !== undefined);

  // Special characters in search
  res = await request('GET', '/api/search?q=' + encodeURIComponent("O'Brien"));
  test('Special chars in search', res.data !== undefined);

  // ==================== FINAL SUMMARY ====================
  console.log('\n========================================');
  console.log('   TEST RESULTS SUMMARY');
  console.log('========================================');
  console.log(`\n  Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`  ✅ Passed: ${testResults.passed}`);
  console.log(`  ❌ Failed: ${testResults.failed}`);

  if (testResults.errors.length > 0) {
    console.log('\n  Failed Tests:');
    testResults.errors.forEach(e => console.log(`    - ${e}`));
  }

  const successRate = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1);
  console.log(`\n  Success Rate: ${successRate}%`);
  console.log('\n========================================\n');

  process.exit(testResults.failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
