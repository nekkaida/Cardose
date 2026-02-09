# Phase 3 Critical Remediation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the highest-impact bugs and security issues across backend, mobile, and web dashboard identified in the Phase 3 audit.

**Architecture:** Fix database instance leaks (8 route files creating separate DB connections), add missing indexes, fix broken user ID references, add authorization guards, add error boundaries and error display to frontend apps, and fix Dashboard data contract mismatch.

**Tech Stack:** Fastify 4 + better-sqlite3, React Native + Expo 52 + Redux Toolkit, React 19 + Tailwind CSS

---

### Task 1: Backend - Fix 8 route files creating new DatabaseService instances

These 8 files create `new DatabaseService()` per request instead of using the shared `fastify.db` singleton, causing memory leaks and multiple DB connections.

**Files to modify:**
- `MobileApp/backend/src/routes/audit.js` - lines 1-7
- `MobileApp/backend/src/routes/audit-logs.js` - lines 1-7
- `MobileApp/backend/src/routes/backup.js` - lines 1-10
- `MobileApp/backend/src/routes/dashboard.js` - lines 1-7
- `MobileApp/backend/src/routes/invoices.js` - lines 1-7
- `MobileApp/backend/src/routes/notifications.js` - lines 1-7
- `MobileApp/backend/src/routes/purchase-orders.js` - lines 1-7
- `MobileApp/backend/src/routes/quality-checks.js` - lines 1-7

**Pattern to fix in each file:**

Remove:
```javascript
const DatabaseService = require('../services/DatabaseService');
// ... other imports
const db = new DatabaseService();
db.initialize();

async function xyzRoutes(fastify, options) {
```

Replace with:
```javascript
// ... other imports (keep uuid, fs, path, etc.)

async function xyzRoutes(fastify, options) {
  const db = fastify.db;
```

This matches the correct pattern already used in orders.js, customers.js, inventory.js, financial.js, production.js, settings.js, webhooks.js, sync.js.

**Test:** Run `npx jest --runInBand --detectOpenHandles` — all 312 tests must pass.

**Commit:** 1 commit per file, format: `fix(routes): use shared database instance in {routename} routes`

---

### Task 2: Backend - Add database indexes to DatabaseService.js

**File:** `MobileApp/backend/src/services/DatabaseService.js`

Add an `addIndexes()` method called after `createTables()` in `initialize()`. Add these indexes:

```javascript
addIndexes() {
  const indexes = [
    // Users
    'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active)',

    // Orders
    'CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
    'CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number)',

    // Customers
    'CREATE INDEX IF NOT EXISTS idx_customers_loyalty_status ON customers(loyalty_status)',
    'CREATE INDEX IF NOT EXISTS idx_customers_business_type ON customers(business_type)',
    'CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at)',

    // Inventory
    'CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_materials(category)',
    'CREATE INDEX IF NOT EXISTS idx_inventory_stock_level ON inventory_materials(current_stock, reorder_level)',

    // Inventory movements
    'CREATE INDEX IF NOT EXISTS idx_inv_movements_item_id ON inventory_movements(item_id)',
    'CREATE INDEX IF NOT EXISTS idx_inv_movements_created_at ON inventory_movements(created_at)',

    // Transactions
    'CREATE INDEX IF NOT EXISTS idx_transactions_type ON financial_transactions(type)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON financial_transactions(created_at)',

    // Invoices
    'CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id)',

    // Production tasks
    'CREATE INDEX IF NOT EXISTS idx_prod_tasks_order_id ON production_tasks(order_id)',
    'CREATE INDEX IF NOT EXISTS idx_prod_tasks_status ON production_tasks(status)',
    'CREATE INDEX IF NOT EXISTS idx_prod_tasks_assigned_to ON production_tasks(assigned_to)',

    // Audit logs
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)',

    // Notifications
    'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)',

    // Communication messages
    'CREATE INDEX IF NOT EXISTS idx_comm_msgs_customer_id ON communication_messages(customer_id)',

    // Files
    'CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by)',

    // Quality checks
    'CREATE INDEX IF NOT EXISTS idx_quality_checks_order_id ON quality_checks(order_id)',
  ];

  for (const sql of indexes) {
    this.db.prepare(sql).run();
  }
}
```

In `initialize()`, call `this.addIndexes()` after `this.createTables()`.

**Test:** Run `npx jest --runInBand --detectOpenHandles` — all 312 tests must pass.

**Commit:** `perf(database): add indexes for foreign keys and frequently queried columns`

---

### Task 3: Backend - Fix request.user.userId bug in 3 route files

JWT signs with `{ id: userId }` but sync.js, webhooks.js, and templates.js access `request.user.userId` which is `undefined`.

**Files:**
- `MobileApp/backend/src/routes/sync.js` - lines 16, 38: change `request.user.userId` → `request.user.id`
- `MobileApp/backend/src/routes/webhooks.js` - lines 16, 38: change `request.user.userId` → `request.user.id`
- `MobileApp/backend/src/routes/templates.js` - lines 16, 140, 158: change `request.user.userId` → `request.user.id`

**Test:** Run `npx jest --runInBand --detectOpenHandles` — all 312 tests must pass.

**Commit:** 1 per file, format: `fix(routes): use correct user ID field in {routename} routes`

---

### Task 4: Backend - Add authorization to settings and webhooks sensitive routes

Settings PUT/DELETE allow any authenticated user to modify system settings. Webhooks PUT/DELETE allow any user to modify any webhook.

**Files:**
- `MobileApp/backend/src/routes/settings.js` — add `fastify.authorize(['owner', 'manager'])` to PUT, DELETE, and POST/batch routes
- `MobileApp/backend/src/routes/webhooks.js` — add `fastify.authorize(['owner', 'manager'])` to PUT and DELETE routes

**Pattern:**
```javascript
// Before:
fastify.put('/:key', { preHandler: [fastify.authenticate] }, async (request, reply) => {

// After:
fastify.put('/:key', { preHandler: [fastify.authenticate, fastify.authorize(['owner', 'manager'])] }, async (request, reply) => {
```

**Test:** Run settings and relevant test suites. Verify 312/312 pass.

**Commit:** 1 per file: `security(routes): require manager/owner role for {routename} mutations`

---

### Task 5: Backend - Add pagination caps to routes without validation

Routes without pagination validation allow `?limit=999999999` causing memory exhaustion.

**Files to check and fix (add parsePagination helper):**
- `MobileApp/backend/src/routes/audit.js`
- `MobileApp/backend/src/routes/audit-logs.js`
- `MobileApp/backend/src/routes/invoices.js`
- `MobileApp/backend/src/routes/notifications.js`
- `MobileApp/backend/src/routes/purchase-orders.js`
- `MobileApp/backend/src/routes/quality-checks.js`
- `MobileApp/backend/src/routes/templates.js`
- `MobileApp/backend/src/routes/webhooks.js`
- `MobileApp/backend/src/routes/reports.js`

**Pattern:** Add to each route file's GET list endpoint:
```javascript
function parsePagination(query) {
  const limit = Math.min(Math.max(parseInt(query.limit) || 50, 1), 200);
  const page = Math.max(parseInt(query.page) || 1, 1);
  const offset = (page - 1) * limit;
  return { limit, page, offset };
}
```

Replace any `const limit = parseInt(request.query.limit) || 50;` with `const { limit, page, offset } = parsePagination(request.query);`

**Test:** Run full test suite. 312/312 must pass.

**Commit:** 1 per file: `fix(routes): validate and cap pagination parameters in {routename}`

---

### Task 6: Mobile - Add ErrorBoundary component

**Files:**
- Create: `MobileApp/mobile/src/components/ErrorBoundary.tsx`
- Modify: `MobileApp/mobile/App.tsx`

**ErrorBoundary.tsx:**
```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.error?.message || 'An unexpected error occurred'}</Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8 },
  message: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  button: { backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
```

**App.tsx:** Wrap the `<Provider store={store}>` children with `<ErrorBoundary>`.

**Commit:** `feat(mobile): add ErrorBoundary component for crash recovery`

---

### Task 7: Mobile - Remove auth from Redux Persist whitelist

**File:** `MobileApp/mobile/src/store/index.ts` (line 42)

Change:
```typescript
whitelist: ['auth', 'ui'],
```
To:
```typescript
whitelist: ['ui'],
```

This prevents auth tokens from being persisted in plaintext AsyncStorage. The `initializeAuth` thunk in authSlice already handles token restoration from AsyncStorage directly with its own key.

**Commit:** `security(mobile): remove auth state from Redux Persist whitelist`

---

### Task 8: Web Dashboard - Add ErrorBoundary component

**Files:**
- Create: `MobileApp/web-dashboard/src/components/ErrorBoundary.tsx`
- Modify: `MobileApp/web-dashboard/src/App.tsx`

**ErrorBoundary.tsx:**
```tsx
import React from 'react';

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-4">{this.state.error?.message || 'An unexpected error occurred'}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**App.tsx:** Wrap `<BrowserRouter>` with `<ErrorBoundary>`.

**Commit:** `feat(web): add ErrorBoundary component for crash recovery`

---

### Task 9: Web Dashboard - Add error states to all data pages

Add `error` state and display to these 5 pages:
- `MobileApp/web-dashboard/src/pages/CustomersPage.tsx`
- `MobileApp/web-dashboard/src/pages/InventoryPage.tsx`
- `MobileApp/web-dashboard/src/pages/FinancialPage.tsx`
- `MobileApp/web-dashboard/src/pages/AnalyticsPage.tsx`
- `MobileApp/web-dashboard/src/pages/OrdersPage.tsx`

**Pattern for each page:**

Add state:
```typescript
const [error, setError] = useState<string | null>(null);
```

In catch block:
```typescript
} catch (error) {
  console.error('Error loading data:', error);
  setError('Failed to load data. Please try again.');
}
```

Add error display after loading check:
```typescript
if (error) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
      <p className="font-medium">Error</p>
      <p className="text-sm">{error}</p>
      <button onClick={() => { setError(null); loadData(); }} className="mt-2 text-sm text-red-600 underline">
        Try Again
      </button>
    </div>
  );
}
```

**Commit:** 1 per file: `fix(web): add error state and display to {PageName}`

---

### Task 10: Web Dashboard - Fix Dashboard to use actual API response structure

**File:** `MobileApp/web-dashboard/src/pages/Dashboard.tsx`

The Dashboard expects `analytics.kpis`, `analytics.revenue.monthlyRevenue`, `analytics.customers.customerSegments` but the actual API returns `{ revenue: {total_revenue, paid_revenue, ...}, orders: {...}, customers: {...}, inventory: {...}, production: {...} }`.

Replace the KPI cards section to use the actual fields. Replace the hardcoded "Recent Activity" section with a simple display of recent orders from the API (or a message saying "Activity feed coming soon" if no endpoint exists).

Fix the chart section to use actual fields: `revenue.total_revenue`, `orders.total_orders`, `customers.total_customers`, `inventory.totalItems`.

**Commit:** `fix(web): align Dashboard component with actual analytics API response`

---

### Task 11: Web Dashboard - Add axios interceptor for 401 handling

**File:** `MobileApp/web-dashboard/src/contexts/ApiContext.tsx`

Add an axios instance with interceptors:
```typescript
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

Replace all `axios.get/post/put/delete` calls with `api.get/post/put/delete`.

**Commit:** `feat(web): add axios interceptor for automatic 401 handling and token injection`

---

### Task 12: Web Dashboard - Add pagination to data tables

**Files:**
- `MobileApp/web-dashboard/src/pages/CustomersPage.tsx`
- `MobileApp/web-dashboard/src/pages/InventoryPage.tsx`
- `MobileApp/web-dashboard/src/pages/OrdersPage.tsx`

**Pattern for each page:**

Add state:
```typescript
const [page, setPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
const pageSize = 25;
```

Pass to API:
```typescript
const data = await getCustomers({ page, limit: pageSize });
setTotalPages(data.totalPages || 1);
```

Add pagination controls below table:
```typescript
<div className="flex items-center justify-between px-6 py-3 border-t">
  <span className="text-sm text-gray-700">Page {page} of {totalPages}</span>
  <div className="space-x-2">
    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
      className="px-3 py-1 text-sm border rounded disabled:opacity-50">Previous</button>
    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
      className="px-3 py-1 text-sm border rounded disabled:opacity-50">Next</button>
  </div>
</div>
```

Update ApiContext to accept params: modify `getCustomers`, `getOrders`, `getInventory` to pass query params.

**Commit:** 1 per file: `feat(web): add pagination to {PageName}`
