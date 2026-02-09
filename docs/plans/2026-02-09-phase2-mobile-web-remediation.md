# Phase 2: Mobile App & Web Dashboard Remediation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all critical bugs, data-loss vulnerabilities, and non-functional UI across mobile app and web dashboard.

**Architecture:** Fix mobile dual-auth by removing AuthContext (keep Redux authSlice as single source of truth), centralize all API URLs through config.ts, complete mobile DatabaseService update functions, fix web dashboard to use real API data, add token validation, remove demo credentials.

**Tech Stack:** React Native + Expo 52 + Redux Toolkit (mobile), React 19 + Tailwind CSS (web), Fastify 4 (backend)

---

## Task 1: Mobile - Remove AuthContext, Keep Redux authSlice as Single Auth Source

**Problem:** Two auth systems (AuthContext + Redux authSlice) with incompatible User types and no coordination. AuthContext defines `role: 'owner' | 'manager' | 'employee'` while authSlice defines `role: 'admin' | 'manager' | 'sales' | 'production' | 'finance'`. Both independently manage token/user in AsyncStorage, creating race conditions.

**Decision:** Keep Redux authSlice (it's more complete: has register, changePassword, refreshUser, proper loading/error states). Remove AuthContext entirely. The correct role type from the backend is `'owner' | 'manager' | 'employee'`.

**Files:**
- Delete: `MobileApp/mobile/src/contexts/AuthContext.tsx`
- Modify: `MobileApp/mobile/src/store/slices/authSlice.ts` (fix role types)
- Modify: `MobileApp/mobile/src/screens/Auth/LoginScreen.tsx` (use Redux instead of direct fetch)
- Modify: Any files importing `useAuth` or `AuthProvider` or `useAuthenticatedFetch`

**Steps:**

1. Fix the User type in `authSlice.ts:24` — change role from `'admin' | 'manager' | 'sales' | 'production' | 'finance'` to `'owner' | 'manager' | 'employee'` to match the backend:
```typescript
export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: 'owner' | 'manager' | 'employee';
  avatar_url?: string;
  phone?: string;
  created_at: string;
}
```

2. Find all files that import from `AuthContext.tsx` (useAuth, AuthProvider, useAuthenticatedFetch). Replace each usage:
   - `useAuth()` for auth state → use Redux selectors: `useAppSelector(selectUser)`, `useAppSelector(selectIsAuthenticated)`, etc.
   - `AuthProvider` wrapper → remove from component tree (Redux Provider already wraps the app)
   - `useAuthenticatedFetch()` → use `ApiService` methods which already handle auth tokens
   - `const { login } = useAuth()` → `const dispatch = useAppDispatch(); dispatch(login(credentials))`
   - `const { logout } = useAuth()` → `dispatch(logout())`

3. Update `LoginScreen.tsx` to use Redux `login` thunk instead of direct `fetch('http://localhost:3000/...')`:
```typescript
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { login, selectAuthLoading, selectAuthError } from '../../store/slices/authSlice';

// In handler:
const result = await dispatch(login({ username, password })).unwrap();
```

4. Delete `MobileApp/mobile/src/contexts/AuthContext.tsx`

5. Commit: `refactor(mobile): remove AuthContext, use Redux authSlice as single auth source`

---

## Task 2: Mobile - Centralize API URL Using config.ts

**Problem:** API URL `http://localhost:3000` is hardcoded in 4 files. The config.ts already has `API_CONFIG.API_URL` but nothing uses it. localhost won't work on physical devices.

**Files:**
- Modify: `MobileApp/mobile/src/services/ApiService.ts:30`
- Modify: `MobileApp/mobile/src/services/FileService.ts:3`
- Modify: `MobileApp/mobile/src/screens/Auth/LoginScreen.tsx:41,77`
- Reference: `MobileApp/mobile/src/config.ts:17-29` (already has API_CONFIG)

**Steps:**

1. In `ApiService.ts:30`, replace hardcoded URL:
```typescript
// Before:
private static readonly BASE_URL = 'http://localhost:3000/api';

// After:
import { API_CONFIG } from '../config';
// ...
private static readonly BASE_URL = API_CONFIG.API_URL;
```

2. In `FileService.ts:3`, replace hardcoded URL:
```typescript
// Before:
const API_BASE_URL = 'http://localhost:3000/api';

// After:
import { API_CONFIG } from '../config';
const API_BASE_URL = API_CONFIG.API_URL;
```

3. In `LoginScreen.tsx`, remove direct fetch calls with hardcoded URLs. After Task 1, LoginScreen should use Redux dispatch which goes through ApiService. If any direct fetch calls remain, replace `'http://localhost:3000/api'` with `API_CONFIG.API_URL`.

4. Commit: `fix(mobile): centralize API URL through config.ts`

---

## Task 3: Mobile - Fix updateOrder to Handle All Fields

**Problem:** `DatabaseService.updateOrder()` only handles `status` and `total_price` (2 of 23 fields). The comment says "Add other fields as needed." When syncing from server via `cacheOrders()`, most fields are silently dropped, causing data loss.

**Files:**
- Modify: `MobileApp/mobile/src/services/DatabaseService.ts:416-439`

**Steps:**

1. Replace the `updateOrder` method to handle all Order table columns:

```typescript
static async updateOrder(orderId: string, updates: Partial<Order>): Promise<void> {
  const fieldMap: Record<string, (val: any) => any> = {
    order_number: (v) => v,
    customer_id: (v) => v,
    status: (v) => v,
    priority: (v) => v,
    box_type: (v) => v,
    width: (v) => v,
    height: (v) => v,
    depth: (v) => v,
    materials: (v) => JSON.stringify(v),
    colors: (v) => JSON.stringify(v),
    special_requests: (v) => v,
    design_files: (v) => JSON.stringify(v),
    material_cost: (v) => v,
    labor_cost: (v) => v,
    markup_percentage: (v) => v,
    total_price: (v) => v,
    currency: (v) => v,
    estimated_completion: (v) => v,
    actual_completion: (v) => v,
    whatsapp_thread: (v) => v,
    last_contact: (v) => v,
    created_by: (v) => v,
    updated_by: (v) => v,
  };

  const fields: string[] = [];
  const params: any[] = [];

  for (const [col, transform] of Object.entries(fieldMap)) {
    if ((updates as any)[col] !== undefined) {
      fields.push(`${col} = ?`);
      params.push(transform((updates as any)[col]));
    }
  }

  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(orderId);

  const sql = `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`;
  await this.executeQuery(sql, params);
}
```

2. Commit: `fix(mobile): handle all order fields in DatabaseService.updateOrder`

---

## Task 4: Mobile - Fix updateCustomer to Handle All Fields

**Problem:** `DatabaseService.updateCustomer()` only handles `name` and `loyalty_status` (2 of 20+ fields). Same data loss pattern as updateOrder.

**Files:**
- Modify: `MobileApp/mobile/src/services/DatabaseService.ts:567-589`

**Steps:**

1. Replace the `updateCustomer` method to handle all Customer table columns:

```typescript
static async updateCustomer(customerId: string, updates: Partial<Customer>): Promise<void> {
  const fieldMap: Record<string, (val: any) => any> = {
    name: (v) => v,
    email: (v) => v,
    whatsapp: (v) => v,
    phone: (v) => v,
    address: (v) => JSON.stringify(v),
    business_type: (v) => v,
    company_name: (v) => v,
    industry: (v) => v,
    tax_id: (v) => v,
    preferred_contact: (v) => v,
    loyalty_status: (v) => v,
    referred_by: (v) => v,
    notes: (v) => v,
    tags: (v) => JSON.stringify(v),
    preferences: (v) => JSON.stringify(v),
    metrics: (v) => JSON.stringify(v),
    created_by: (v) => v,
    updated_by: (v) => v,
  };

  const fields: string[] = [];
  const params: any[] = [];

  for (const [col, transform] of Object.entries(fieldMap)) {
    if ((updates as any)[col] !== undefined) {
      fields.push(`${col} = ?`);
      params.push(transform((updates as any)[col]));
    }
  }

  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(customerId);

  const sql = `UPDATE customers SET ${fields.join(', ')} WHERE id = ?`;
  await this.executeQuery(sql, params);
}
```

2. Commit: `fix(mobile): handle all customer fields in DatabaseService.updateCustomer`

---

## Task 5: Mobile - Fix DashboardScreen Bugs

**Problem 1:** `inProductionOrders` filters for `'pending'` instead of `'in_production'` (copy-paste from `pendingOrders`). Dashboard shows identical counts for "Pending" and "In Production".

**Problem 2:** `activeTasks` also filters for `'pending'` with same comment pattern.

**Problem 3:** `loadDashboardData` uses `Promise.all` — if any of the 8 dispatches fail, all fail silently.

**Files:**
- Modify: `MobileApp/mobile/src/screens/Dashboard/DashboardScreen.tsx:53-68,85-88`

**Steps:**

1. Fix line 86 — change status filter from `'pending'` to `'in_production'`:
```typescript
// Before:
const inProductionOrders = orders.filter(o => o.status === 'pending').length;

// After:
const inProductionOrders = orders.filter(o => o.status === 'in_production').length;
```

2. Fix line 88 — change activeTasks filter:
```typescript
// Before:
const activeTasks = tasks.filter(t => t.status === 'pending').length;

// After:
const activeTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'assigned').length;
```

3. Fix lines 53-68 — replace `Promise.all` with `Promise.allSettled`:
```typescript
const loadDashboardData = async () => {
  const results = await Promise.allSettled([
    dispatch(fetchOrders()).unwrap(),
    dispatch(fetchOrderAnalytics({ period: 'month' })).unwrap(),
    dispatch(fetchCustomers()).unwrap(),
    dispatch(fetchMaterials()).unwrap(),
    dispatch(fetchLowStockItems()).unwrap(),
    dispatch(fetchInvoices()).unwrap(),
    dispatch(fetchFinancialAnalytics({ period: 'month' })).unwrap(),
    dispatch(fetchTasks()).unwrap(),
  ]);

  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length > 0) {
    console.warn(`Dashboard: ${failures.length} of ${results.length} requests failed`);
  }
};
```

4. Commit: `fix(mobile): fix DashboardScreen status filters and use Promise.allSettled`

---

## Task 6: Web Dashboard - Fix Token Validation on Restore

**Problem:** `AuthContext.tsx` blindly trusts token from localStorage without validation. Expired/tampered tokens are silently accepted.

**Files:**
- Modify: `MobileApp/web-dashboard/src/contexts/AuthContext.tsx:39-52`

**Steps:**

1. Add token validation on mount by calling `/api/auth/verify`:
```typescript
useEffect(() => {
  const initAuth = async () => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');

    if (savedToken && savedUser) {
      try {
        // Validate token with backend
        const response = await axios.get('http://localhost:3001/api/auth/verify', {
          headers: { Authorization: `Bearer ${savedToken}` }
        });

        if (response.data.valid) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
          axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
        } else {
          // Token invalid - clear storage
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        }
      } catch {
        // Verification failed - clear storage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }

    setLoading(false);
  };

  initAuth();
}, []);
```

2. Commit: `security(web): validate JWT token on restore from localStorage`

---

## Task 7: Web Dashboard - Remove Demo Credentials

**Problem:** Hardcoded demo credentials on login page. Security risk if deployed.

**Files:**
- Modify: `MobileApp/web-dashboard/src/pages/LoginPage.tsx:125-130`

**Steps:**

1. Remove the entire demo credentials section (lines 125-130):
```typescript
// DELETE THIS BLOCK:
{/* Demo Credentials */}
<div className="mt-6 p-4 bg-blue-50 rounded-lg">
  <h3 className="text-sm font-medium text-blue-800 mb-2">Demo Credentials:</h3>
  <p className="text-sm text-blue-600">Username: demo</p>
  <p className="text-sm text-blue-600">Password: password</p>
</div>
```

2. Commit: `security(web): remove hardcoded demo credentials from login page`

---

## Task 8: Web Dashboard - Centralize API URL

**Problem:** API URL `http://localhost:3001/api` is hardcoded in both AuthContext.tsx and ApiContext.tsx. Should be configurable.

**Files:**
- Modify: `MobileApp/web-dashboard/src/contexts/ApiContext.tsx:4`
- Modify: `MobileApp/web-dashboard/src/contexts/AuthContext.tsx:56`

**Steps:**

1. Create a shared config constant in ApiContext.tsx (or a new config file):
```typescript
// At top of ApiContext.tsx - replace line 4:
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
```

2. In AuthContext.tsx, use the same pattern for the login URL:
```typescript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Then in login function:
const response = await axios.post(`${API_BASE_URL}/auth/login`, { ... });
```

3. Commit: `fix(web): centralize API URL with environment variable support`

---

## Task 9: Web Dashboard - Wire OrdersPage to Real API Data

**Problem:** `OrdersPage.tsx` fetches from API but ignores the response and uses hardcoded mock data (3 fake orders).

**Files:**
- Modify: `MobileApp/web-dashboard/src/pages/OrdersPage.tsx:29-72`

**Steps:**

1. Update the Order interface to match backend response format:
```typescript
interface Order {
  id: string;
  orderNumber: string;
  order_number?: string; // backend uses snake_case
  customerName: string;
  customer_name?: string;
  status: string;
  priority: string;
  totalAmount: number;
  total_amount?: number;
  dueDate: string;
  due_date?: string;
  createdAt: string;
  created_at?: string;
}
```

2. Replace `loadOrders` to use actual API data and normalize field names:
```typescript
const loadOrders = async () => {
  try {
    setLoading(true);
    const data = await getOrders();
    const apiOrders = (data.orders || []).map((o: any) => ({
      id: o.id,
      orderNumber: o.order_number || o.orderNumber || '',
      customerName: o.customer_name || o.customerName || 'Unknown',
      status: o.status || 'pending',
      priority: o.priority || 'normal',
      totalAmount: o.total_amount || o.totalAmount || 0,
      dueDate: o.due_date || o.dueDate || '',
      createdAt: o.created_at || o.createdAt || '',
    }));
    setOrders(apiOrders);
  } catch (error) {
    console.error('Error loading orders:', error);
  } finally {
    setLoading(false);
  }
};
```

3. Commit: `fix(web): wire OrdersPage to real API data instead of mock data`

---

## Task 10: Web Dashboard - Implement CustomersPage with Real Data

**Problem:** CustomersPage fetches data but shows only placeholder text "Customer management interface will be displayed here."

**Files:**
- Modify: `MobileApp/web-dashboard/src/pages/CustomersPage.tsx`

**Steps:**

1. Replace the placeholder content with a proper data table similar to OrdersPage:
   - Show customer name, email, phone, business_type, loyalty_status
   - Add search filter
   - Add business type filter
   - Format table with proper columns
   - Keep the existing API fetch (already calls getCustomers)

2. Commit: `feat(web): implement CustomersPage with real data table`

---

## Task 11: Web Dashboard - Implement InventoryPage with Real Data

**Problem:** InventoryPage fetches data but shows only placeholder text.

**Files:**
- Modify: `MobileApp/web-dashboard/src/pages/InventoryPage.tsx`

**Steps:**

1. Replace the placeholder content with a proper data table:
   - Show item name, category, current_stock, reorder_level, unit_cost
   - Add search filter
   - Add category filter
   - Highlight low stock items (current_stock <= reorder_level) in red
   - Keep the existing API fetch

2. Commit: `feat(web): implement InventoryPage with real data table`

---

## Task 12: Web Dashboard - Implement FinancialPage with Real Data

**Problem:** FinancialPage fetches data but shows only placeholder text.

**Files:**
- Modify: `MobileApp/web-dashboard/src/pages/FinancialPage.tsx`

**Steps:**

1. Replace the placeholder content with a financial summary display:
   - Show total revenue, total expenses, net profit summary cards
   - Show recent transactions table (from getTransactions)
   - Format all amounts in IDR currency
   - Keep the existing API fetch

2. Commit: `feat(web): implement FinancialPage with real data`

---

## Task 13: Web Dashboard - Implement AnalyticsPage with Real Data

**Problem:** AnalyticsPage fetches data but shows only placeholder text.

**Files:**
- Modify: `MobileApp/web-dashboard/src/pages/AnalyticsPage.tsx`

**Steps:**

1. Replace the placeholder content with analytics display:
   - Show key metrics cards (total orders, total revenue, total customers, avg order value)
   - Show order status distribution
   - Show top customers list
   - Keep the existing API fetch (getDashboardAnalytics)

2. Commit: `feat(web): implement AnalyticsPage with real data`

---

## Task 14: Web Dashboard - Wire Dashboard Quick Action Buttons

**Problem:** 4 Quick Action buttons on Dashboard and action buttons on all pages have no onClick handlers.

**Files:**
- Modify: `MobileApp/web-dashboard/src/pages/Dashboard.tsx:213-225`
- Modify: `MobileApp/web-dashboard/src/pages/OrdersPage.tsx:129-131,220-225`

**Steps:**

1. Dashboard Quick Actions - navigate to relevant pages:
```typescript
import { useNavigate } from 'react-router-dom';
// ...
const navigate = useNavigate();

<button onClick={() => navigate('/orders')} className="...">New Order</button>
<button onClick={() => navigate('/customers')} className="...">Add Customer</button>
<button onClick={() => navigate('/inventory')} className="...">Update Inventory</button>
<button onClick={() => navigate('/analytics')} className="...">View Reports</button>
```

2. OrdersPage - New Order button navigates (for now, no create form yet):
```typescript
<button onClick={() => alert('Create order form coming soon')} className="...">
```

3. OrdersPage - Edit/Delete row buttons - wire to API:
```typescript
<button onClick={() => alert(`Edit order ${order.id}`)} className="...">Edit</button>
<button onClick={() => handleDelete(order.id)} className="...">Delete</button>
```

4. Commit: `feat(web): wire quick action buttons to navigation`

---

## Task 15: Backend - Fix Performance Anti-Patterns (Full-Table Scans)

**Problem:** 12+ routes fetch entire tables with `.all()` then filter in JavaScript. Should use SQL `COUNT()` / `SUM()` / `GROUP BY`.

**Files:**
- Modify: `MobileApp/backend/src/routes/orders.js:49-81` (stats calculation)
- Modify: `MobileApp/backend/src/routes/customers.js:52` (stats calculation)
- Modify: `MobileApp/backend/src/routes/inventory.js:50` (stats calculation)
- Modify: `MobileApp/backend/src/routes/financial.js:54,116-130` (stats calculation)
- Modify: `MobileApp/backend/src/routes/users.js:50` (stats calculation)
- Modify: `MobileApp/backend/src/routes/production.js:170` (stats calculation)

**Steps:**

For each route file, replace the `.all()` + JS `.filter()` pattern with SQL aggregates. Example for orders.js:

```javascript
// Before (orders.js:49-80):
const allOrders = db.db.prepare('SELECT status, total_amount FROM orders').all();
const stats = {
  total: allOrders.length,
  pending: allOrders.filter(o => o.status === 'pending').length,
  // ... more JS filtering
};

// After:
const stats = db.db.prepare(`
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
    SUM(CASE WHEN status = 'in_production' THEN 1 ELSE 0 END) as in_production,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
    COALESCE(SUM(total_amount), 0) as total_revenue
  FROM orders
`).get();
```

Apply similar SQL-aggregate pattern to all affected route files.

Commit each file separately:
- `perf(orders): replace full-table scan with SQL aggregates for stats`
- `perf(customers): replace full-table scan with SQL aggregates for stats`
- `perf(inventory): replace full-table scan with SQL aggregates for stats`
- `perf(financial): replace full-table scan with SQL aggregates for stats`
- `perf(users): replace full-table scan with SQL aggregates for stats`
- `perf(production): replace full-table scan with SQL aggregates for stats`

---

## Task 16: Backend - Add JSON Schema Validation to Core Routes

**Problem:** Zero routes have Fastify JSON schema validation. Start with the highest-traffic routes: auth, orders, customers, inventory.

**Files:**
- Modify: `MobileApp/backend/src/routes/auth.js` (register, login, change-password)
- Modify: `MobileApp/backend/src/routes/orders.js` (POST, PUT, PATCH)
- Modify: `MobileApp/backend/src/routes/customers.js` (POST, PUT)
- Modify: `MobileApp/backend/src/routes/inventory.js` (POST, PUT)

**Steps:**

For each route, add Fastify schema option. Example for auth register:

```javascript
fastify.post('/register', {
  schema: {
    body: {
      type: 'object',
      required: ['username', 'password', 'email', 'fullName'],
      properties: {
        username: { type: 'string', minLength: 3, maxLength: 50 },
        password: { type: 'string', minLength: 6, maxLength: 128 },
        email: { type: 'string', format: 'email' },
        fullName: { type: 'string', minLength: 1, maxLength: 100 },
        phone: { type: 'string', maxLength: 20 },
      },
      additionalProperties: false,
    }
  }
}, async (request, reply) => { ... });
```

Apply to each mutation endpoint in the 4 route files.

Commit each file separately:
- `security(auth): add JSON schema validation to auth endpoints`
- `security(orders): add JSON schema validation to order endpoints`
- `security(customers): add JSON schema validation to customer endpoints`
- `security(inventory): add JSON schema validation to inventory endpoints`

---

## Execution Order

**Phase A - Mobile Critical Fixes (Tasks 1-5):**
- Task 1: Remove AuthContext (most impactful, blocks Task 2)
- Task 2: Centralize API URL (depends on Task 1 completing LoginScreen changes)
- Task 3: Fix updateOrder (independent)
- Task 4: Fix updateCustomer (independent)
- Task 5: Fix DashboardScreen bugs (independent)

**Phase B - Web Dashboard Fixes (Tasks 6-14):**
- Tasks 6-8: Security/config fixes (independent of each other)
- Task 9: Wire OrdersPage (independent)
- Tasks 10-13: Implement placeholder pages (independent of each other, can parallelize)
- Task 14: Wire buttons (depends on pages being implemented)

**Phase C - Backend Performance & Validation (Tasks 15-16):**
- Task 15: Fix performance anti-patterns (independent per file)
- Task 16: Add JSON schema validation (independent per file)
