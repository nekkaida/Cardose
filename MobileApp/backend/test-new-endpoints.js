// Test script for new API endpoints
const http = require('http');

const BASE_URL = 'http://localhost:3000';
let TOKEN = '';

function makeRequest(method, path, data = null, token = null) {
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

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('Testing New API Endpoints');
  console.log('='.repeat(60));

  try {
    // 1. Login first
    console.log('\n1. LOGIN TEST');
    console.log('-'.repeat(40));
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      username: 'owner',
      password: 'owner123'
    });
    console.log(`Status: ${loginRes.status}`);
    if (loginRes.data.success) {
      TOKEN = loginRes.data.token;
      console.log('Login successful, token received');
    } else {
      console.log('Login failed:', loginRes.data.error);
      return;
    }

    // 2. Test /orders/latest-number
    console.log('\n2. TEST /orders/latest-number');
    console.log('-'.repeat(40));
    const orderNumRes = await makeRequest('GET', '/api/orders/latest-number', null, TOKEN);
    console.log(`Status: ${orderNumRes.status}`);
    console.log(`Response: ${JSON.stringify(orderNumRes.data, null, 2)}`);

    // 3. Create a customer first for communications test
    console.log('\n3. CREATE CUSTOMER FOR TESTING');
    console.log('-'.repeat(40));
    const customerRes = await makeRequest('POST', '/api/customers', {
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '08123456789',
      business_type: 'corporate'
    }, TOKEN);
    console.log(`Status: ${customerRes.status}`);
    const customerId = customerRes.data.customerId;
    console.log(`Customer ID: ${customerId}`);

    // 4. Test customer communications
    console.log('\n4. TEST /customers/:id/communications POST');
    console.log('-'.repeat(40));
    const commRes = await makeRequest('POST', `/api/customers/${customerId}/communications`, {
      type: 'email',
      direction: 'outbound',
      subject: 'Test Subject',
      content: 'Test communication content'
    }, TOKEN);
    console.log(`Status: ${commRes.status}`);
    console.log(`Response: ${JSON.stringify(commRes.data, null, 2)}`);

    console.log('\n5. TEST /customers/:id/communications GET');
    console.log('-'.repeat(40));
    const getCommRes = await makeRequest('GET', `/api/customers/${customerId}/communications`, null, TOKEN);
    console.log(`Status: ${getCommRes.status}`);
    console.log(`Communications count: ${getCommRes.data.communications?.length || 0}`);

    // 5. Create inventory item for reorder alert test
    console.log('\n6. CREATE INVENTORY ITEM FOR TESTING');
    console.log('-'.repeat(40));
    const invRes = await makeRequest('POST', '/api/inventory', {
      name: 'Test Material',
      category: 'paper',
      current_stock: 5,
      reorder_level: 10,
      unit_cost: 1000
    }, TOKEN);
    console.log(`Status: ${invRes.status}`);
    console.log(`Response: ${JSON.stringify(invRes.data, null, 2)}`);
    const itemId = invRes.data.itemId;
    console.log(`Item ID: ${itemId}`);

    // 6. Test reorder alerts
    console.log('\n7. TEST /inventory/reorder-alerts POST');
    console.log('-'.repeat(40));
    const alertRes = await makeRequest('POST', '/api/inventory/reorder-alerts', {
      item_id: itemId,
      priority: 'high',
      notes: 'Stock is low'
    }, TOKEN);
    console.log(`Status: ${alertRes.status}`);
    console.log(`Response: ${JSON.stringify(alertRes.data, null, 2)}`);

    console.log('\n8. TEST /inventory/reorder-alerts GET');
    console.log('-'.repeat(40));
    const getAlertsRes = await makeRequest('GET', '/api/inventory/reorder-alerts', null, TOKEN);
    console.log(`Status: ${getAlertsRes.status}`);
    console.log(`Alerts count: ${getAlertsRes.data.alerts?.length || 0}`);

    // 7. Test production endpoints
    console.log('\n9. TEST /production/schedule GET');
    console.log('-'.repeat(40));
    const scheduleRes = await makeRequest('GET', '/api/production/schedule', null, TOKEN);
    console.log(`Status: ${scheduleRes.status}`);
    console.log(`Response: ${JSON.stringify(scheduleRes.data, null, 2)}`);

    console.log('\n10. TEST /production/analytics GET');
    console.log('-'.repeat(40));
    const prodAnalyticsRes = await makeRequest('GET', '/api/production/analytics?period=week', null, TOKEN);
    console.log(`Status: ${prodAnalyticsRes.status}`);
    console.log(`Response: ${JSON.stringify(prodAnalyticsRes.data, null, 2)}`);

    console.log('\n11. TEST /production/templates GET');
    console.log('-'.repeat(40));
    const templatesRes = await makeRequest('GET', '/api/production/templates', null, TOKEN);
    console.log(`Status: ${templatesRes.status}`);
    console.log(`Templates count: ${templatesRes.data.templates?.length || 0}`);

    // 8. Test financial analytics
    console.log('\n12. TEST /financial/analytics/revenue GET');
    console.log('-'.repeat(40));
    const revenueRes = await makeRequest('GET', '/api/financial/analytics/revenue?period=month', null, TOKEN);
    console.log(`Status: ${revenueRes.status}`);
    console.log(`Response: ${JSON.stringify(revenueRes.data, null, 2)}`);

    console.log('\n' + '='.repeat(60));
    console.log('ALL TESTS COMPLETED!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Test error:', error.message);
  }
}

runTests();
