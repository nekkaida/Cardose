# Phase 4: Full Sweep — Backend Hardening, Web Features & DevOps

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the Cardose remediation by hardening the backend (shared utilities, schema validation, missing tests), adding missing web dashboard pages (Production, Settings, Reports, Users), and setting up DevOps (Docker, CI/CD).

**Architecture:** Extract shared backend utilities (parsePagination, response helpers) to DRY up 9 route files. Add Fastify JSON schema validation to all 45 unvalidated POST/PUT endpoints. Register 13 missing routes in test helpers and write tests. Add 4 new web dashboard pages with API functions. Dockerize all 3 components. Add GitHub Actions CI.

**Tech Stack:** Fastify 4.x, better-sqlite3, Jest, React 19, TypeScript, Tailwind CSS, Docker, GitHub Actions

**Commit convention:** Atomic conventional commits, 1 commit per file, no co-author tags.

---

## Group A: Backend — Extract Shared Utilities (DRY)

### Task A1: Create parsePagination utility module

**Files:**
- Create: `MobileApp/backend/src/utils/pagination.js`

**Implementation:**

```javascript
// Shared pagination utility
function parsePagination(query) {
  const limit = Math.min(Math.max(parseInt(query.limit) || 50, 1), 200);
  const page = Math.max(parseInt(query.page) || 1, 1);
  const offset = (page - 1) * limit;
  return { limit, page, offset };
}

module.exports = { parsePagination };
```

**Commit:** `refactor(utils): extract shared parsePagination utility`

### Task A2: Replace duplicated parsePagination in all 9 route files

**Files to modify (remove local `parsePagination`, add `require`):**
- `MobileApp/backend/src/routes/orders.js`
- `MobileApp/backend/src/routes/customers.js`
- `MobileApp/backend/src/routes/inventory.js`
- `MobileApp/backend/src/routes/production.js`
- `MobileApp/backend/src/routes/financial.js`
- `MobileApp/backend/src/routes/notifications.js`
- `MobileApp/backend/src/routes/purchase-orders.js`
- `MobileApp/backend/src/routes/invoices.js`
- `MobileApp/backend/src/routes/quality-checks.js`

For each file:
1. Add `const { parsePagination } = require('../utils/pagination');` at top (or inside the function scope if the function is module-level)
2. Remove the local `parsePagination` function definition
3. Verify existing tests still pass: `npx jest --runInBand --no-coverage`

**Important:** In `orders.js`, `customers.js`, `inventory.js` the parsePagination may be inline inside `GET /` handler — extract that to use the shared one. In `production.js`, `financial.js`, `notifications.js`, `purchase-orders.js`, `invoices.js`, `quality-checks.js` it's a module-level function — just remove it and add the require.

**Commit per file:** `refactor(routes): use shared parsePagination in <filename>`

### Task A3: Run tests to verify refactor

**Run:** `cd MobileApp/backend && npx jest --runInBand --no-coverage`
**Expected:** 312/312 pass

---

## Group B: Backend — Fastify Schema Validation

Add Fastify JSON schema validation to POST/PUT/PATCH endpoints that currently lack it. This replaces manual `if (!field)` checks with Fastify's built-in schema validation which returns 400 automatically.

### Task B1: Add schema validation to production.js (7 endpoints)

**File:** `MobileApp/backend/src/routes/production.js`

Add `schema: { body: { ... } }` to these route options:

1. **POST `/tasks`** — required: `order_id`, `title`; optional: `description`, `assigned_to`, `due_date`, `priority`
2. **PUT `/tasks/:id`** — optional: `title`, `description`, `assigned_to`, `due_date`, `priority`, `status`
3. **PUT `/tasks/:id/assign`** — required: `assigned_to`
4. **PUT `/tasks/:id/quality`** — required: `quality_status`; optional: `quality_notes`
5. **POST `/quality-checks`** — required: `order_id`, `check_type`; optional: `status`, `notes`
6. **POST `/workflows`** — required: `order_id`; optional: `name`, `steps`
7. **PATCH `/orders/:id/stage`** — required: `stage`

Schema format example for Fastify:
```javascript
fastify.post('/tasks', {
  preHandler: [fastify.authenticate],
  schema: {
    body: {
      type: 'object',
      required: ['order_id', 'title'],
      properties: {
        order_id: { type: 'string' },
        title: { type: 'string', minLength: 1 },
        description: { type: 'string' },
        assigned_to: { type: 'string' },
        due_date: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] }
      }
    }
  }
}, async (request, reply) => { ... });
```

After adding schemas, you can remove the manual `if (!order_id)` / `if (!title)` checks since Fastify handles this automatically (returns 400 with schema error).

**Commit:** `security(routes): add schema validation to production endpoints`

### Task B2: Add schema validation to financial.js (5 endpoints)

**File:** `MobileApp/backend/src/routes/financial.js`

1. **POST `/transactions`** — required: `type`, `amount`; optional: `category`, `description`, `order_id`, `payment_method`, `payment_date`
2. **POST `/budgets`** — required: `category`, `amount`, `period`; optional: `start_date`, `end_date`, `notes`
3. **POST `/invoices`** — required: `customer_id`; optional: `order_id`, `subtotal`, `discount`, `due_date`, `notes`, `items`
4. **PATCH `/invoices/:id/status`** — required: `status`; optional: `paid_date`, `payment_method`
5. **POST `/calculate-pricing`** — required: `materials`; optional: `labor_cost`, `overhead_percentage`, `profit_margin`, `discount_percentage`, `quantity`

**Commit:** `security(routes): add schema validation to financial endpoints`

### Task B3: Add schema validation to purchase-orders.js (2 endpoints)

**File:** `MobileApp/backend/src/routes/purchase-orders.js`

1. **POST `/`** — required: `supplier`; optional: `items`, `total_amount`, `expected_date`, `notes`
2. **PATCH `/:id/status`** — required: `status`; optional: `received_date`

**Commit:** `security(routes): add schema validation to purchase-orders endpoints`

### Task B4: Add schema validation to invoices.js (2 endpoints)

**File:** `MobileApp/backend/src/routes/invoices.js`

1. **POST `/`** — required: `customer_id`; optional: `order_id`, `subtotal`, `discount`, `due_date`, `notes`, `items`
2. **PATCH `/:id/status`** — required: `status`; optional: `paid_date`, `payment_method`

**Commit:** `security(routes): add schema validation to invoices endpoints`

### Task B5: Add schema validation to quality-checks.js (2 endpoints)

**File:** `MobileApp/backend/src/routes/quality-checks.js`

1. **POST `/`** — required: `order_id`; optional: `checklist_items`, `overall_status`, `notes`, `checked_by`
2. **PUT `/:id`** — optional: `checklist_items`, `overall_status`, `notes`

**Commit:** `security(routes): add schema validation to quality-checks endpoints`

### Task B6: Add schema validation to notifications.js (4 endpoints)

**File:** `MobileApp/backend/src/routes/notifications.js`

1. **POST `/`** — required: `title`, `message`; optional: `type`, `priority`, `user_id`
2. **POST `/check/overdue-invoices`** — no body required (trigger endpoint)
3. **POST `/check/low-stock`** — no body required
4. **POST `/check/order-deadlines`** — no body required

**Commit:** `security(routes): add schema validation to notifications endpoints`

### Task B7: Add schema validation to templates.js (4 endpoints)

**File:** `MobileApp/backend/src/routes/templates.js`

1. **POST `/`** — required: `name`, `type`; optional: `content`, `category`, `variables`
2. **PUT `/:templateId`** — optional: `name`, `type`, `content`, `category`, `variables`, `is_active`
3. **POST `/:templateId/render`** — required: `data`
4. **POST `/:templateId/duplicate`** — optional: `name`

**Commit:** `security(routes): add schema validation to templates endpoints`

### Task B8: Add schema validation to webhooks.js (2 endpoints)

**File:** `MobileApp/backend/src/routes/webhooks.js`

1. **POST `/`** — required: `url`, `event_type`; optional: `description`, `is_active`
2. **PUT `/:webhookId`** — optional: `url`, `event_type`, `description`, `is_active`

**Commit:** `security(routes): add schema validation to webhooks endpoints`

### Task B9: Add schema validation to settings.js (2 endpoints)

**File:** `MobileApp/backend/src/routes/settings.js`

1. **PUT `/:key`** — required: `value`; optional: `description`
2. **POST `/batch`** — required: `settings`

**Commit:** `security(routes): add schema validation to settings endpoints`

### Task B10: Add schema validation to communication.js (key endpoints)

**File:** `MobileApp/backend/src/routes/communication.js`

1. **POST `/whatsapp/send`** — required: `to`, `message`
2. **POST `/email/send`** — required: `to`, `subject`, `body`
3. Notification endpoints (`/whatsapp/notify/*`, `/email/notify/*`) — required: `order_id` or `invoice_id` depending on endpoint

**Commit:** `security(routes): add schema validation to communication endpoints`

### Task B11: Run full test suite to verify schemas don't break existing tests

**Run:** `cd MobileApp/backend && npx jest --runInBand --no-coverage`
**Expected:** 312/312 pass (schemas should be additive — existing tests send valid data)

---

## Group C: Backend — Register Missing Routes in Test Helpers & Write Tests

### Task C1: Register 13 missing routes in test helpers

**File:** `MobileApp/backend/tests/helpers.js`

Add these route registrations to `buildApp()`:

```javascript
// Add after existing route registrations (line ~71):
fastify.register(require('../src/routes/notifications'), { prefix: '/api/notifications' });
fastify.register(require('../src/routes/invoices'), { prefix: '/api/invoices' });
fastify.register(require('../src/routes/purchase-orders'), { prefix: '/api/purchase-orders' });
fastify.register(require('../src/routes/quality-checks'), { prefix: '/api/quality-checks' });
fastify.register(require('../src/routes/reports'), { prefix: '/api/reports' });
fastify.register(require('../src/routes/templates'), { prefix: '/api/templates' });
fastify.register(require('../src/routes/webhooks'), { prefix: '/api/webhooks' });
fastify.register(require('../src/routes/audit'), { prefix: '/api/audit' });
fastify.register(require('../src/routes/audit-logs'), { prefix: '/api/audit-logs' });
fastify.register(require('../src/routes/sync'), { prefix: '/api/sync' });
fastify.register(require('../src/routes/backup'), { prefix: '/api/backup' });
fastify.register(require('../src/routes/communication'), { prefix: '/api/communication' });
```

Note: `files.js` requires `@fastify/multipart` — register that too if adding file tests:
```javascript
await fastify.register(require('@fastify/multipart'));
fastify.register(require('../src/routes/files'), { prefix: '/api/files' });
```

**Commit:** `test(helpers): register all 13 missing routes in test app builder`

### Task C2: Write tests for notifications routes

**Create:** `MobileApp/backend/tests/notifications.test.js`

Test cases:
- GET `/api/notifications` — should list notifications, reject without auth
- POST `/api/notifications` — should create notification with valid data, reject without title
- PATCH `/api/notifications/:id/read` — should mark as read
- DELETE `/api/notifications/:id` — should delete notification

Follow the pattern in existing tests (see `orders.test.js` for structure). Use `buildApp`, `createTestUserAndGetToken`, `makeAuthenticatedRequest` from helpers.

**Commit:** `test(routes): add notifications endpoint tests`

### Task C3: Write tests for invoices routes

**Create:** `MobileApp/backend/tests/invoices.test.js`

Test cases:
- GET `/api/invoices` — list all, filter by status, filter by customer_id, pagination, reject without auth
- POST `/api/invoices` — create with valid data, reject without customer_id, reject without auth
- GET `/api/invoices/:id` — get by ID, 404 for non-existent
- PATCH `/api/invoices/:id/status` — update status, reject invalid status, 404 for non-existent

**Commit:** `test(routes): add invoices endpoint tests`

### Task C4: Write tests for purchase-orders routes

**Create:** `MobileApp/backend/tests/purchase-orders.test.js`

Test cases:
- GET `/api/purchase-orders` — list all, filter by status, filter by supplier, pagination, reject without auth
- POST `/api/purchase-orders` — create with valid data, reject without supplier, reject without auth
- GET `/api/purchase-orders/:id` — get by ID, 404 for non-existent
- PATCH `/api/purchase-orders/:id/status` — update status, reject invalid status

**Commit:** `test(routes): add purchase-orders endpoint tests`

### Task C5: Write tests for quality-checks routes

**Create:** `MobileApp/backend/tests/quality-checks.test.js`

Test cases:
- GET `/api/quality-checks` — list all, filter by order_id, pagination, reject without auth
- POST `/api/quality-checks` — create with valid data, reject without order_id, reject without auth
- GET `/api/quality-checks/:id` — get by ID, 404 for non-existent
- PUT `/api/quality-checks/:id` — update with valid data, 404 for non-existent

**Commit:** `test(routes): add quality-checks endpoint tests`

### Task C6: Write tests for reports routes

**Create:** `MobileApp/backend/tests/reports.test.js`

Test cases:
- GET `/api/reports/sales` — get sales report, with date filters, reject without auth
- GET `/api/reports/inventory` — get inventory report
- GET `/api/reports/production` — get production report
- GET `/api/reports/customers` — get customer report
- GET `/api/reports/financial` — get financial report

**Commit:** `test(routes): add reports endpoint tests`

### Task C7: Write tests for templates routes

**Create:** `MobileApp/backend/tests/templates.test.js`

Test cases:
- POST `/api/templates` — create template, reject without name, reject without auth
- GET `/api/templates` — list all, filter by type, filter by category
- GET `/api/templates/:templateId` — get by ID, 404 for non-existent
- PUT `/api/templates/:templateId` — update, 404 for non-existent
- DELETE `/api/templates/:templateId` — delete, 404 for non-existent
- POST `/api/templates/:templateId/duplicate` — duplicate template

**Commit:** `test(routes): add templates endpoint tests`

### Task C8: Write tests for webhooks routes

**Create:** `MobileApp/backend/tests/webhooks.test.js`

Test cases:
- POST `/api/webhooks` — register webhook, reject without url, reject without auth
- GET `/api/webhooks` — list all, reject without auth
- PUT `/api/webhooks/:webhookId` — update, 404 for non-existent (requires owner/manager role)
- DELETE `/api/webhooks/:webhookId` — delete, 404 for non-existent (requires owner/manager role)
- POST `/api/webhooks/:webhookId/test` — test webhook
- GET `/api/webhooks/:webhookId/logs` — get logs

Note: PUT and DELETE require `owner` or `manager` role. Use `createTestUserAndGetToken(app, { role: 'owner' })`.

**Commit:** `test(routes): add webhooks endpoint tests`

### Task C9: Write tests for audit routes

**Create:** `MobileApp/backend/tests/audit.test.js`

Test cases:
- GET `/api/audit` — list audit entries, pagination, reject without auth
- GET `/api/audit/stats` — get audit stats

**Commit:** `test(routes): add audit endpoint tests`

### Task C10: Write tests for audit-logs routes

**Create:** `MobileApp/backend/tests/audit-logs.test.js`

Test cases:
- GET `/api/audit-logs` — list logs, pagination, filter by action, reject without auth

**Commit:** `test(routes): add audit-logs endpoint tests`

### Task C11: Write tests for backup routes

**Create:** `MobileApp/backend/tests/backup.test.js`

Test cases:
- GET `/api/backup` — list backups, reject without auth
- POST `/api/backup/create` — create backup, reject without auth

**Commit:** `test(routes): add backup endpoint tests`

### Task C12: Write tests for sync routes

**Create:** `MobileApp/backend/tests/sync.test.js`

Test cases:
- POST `/api/sync/register-device` — register device, reject without auth
- POST `/api/sync/pull` — pull changes, reject without auth
- GET `/api/sync/status` — get sync status

**Commit:** `test(routes): add sync endpoint tests`

### Task C13: Run full test suite

**Run:** `cd MobileApp/backend && npx jest --runInBand --no-coverage`
**Expected:** All tests pass (312 existing + new tests)

---

## Group D: Web Dashboard — Add Missing Pages

### Task D1: Add Production, Settings, Reports, Users API functions to ApiContext

**File:** `MobileApp/web-dashboard/src/contexts/ApiContext.tsx`

Add to the interface and implementation:

```typescript
// Production
getProductionBoard: () => Promise<any>;
getProductionTasks: (params?: Record<string, any>) => Promise<any>;
getProductionStats: () => Promise<any>;

// Reports
getSalesReport: (params?: Record<string, any>) => Promise<any>;
getInventoryReport: () => Promise<any>;
getProductionReport: () => Promise<any>;
getCustomerReport: () => Promise<any>;

// Users
getUsers: (params?: Record<string, any>) => Promise<any>;
createUser: (userData: any) => Promise<any>;
updateUser: (id: string, updates: any) => Promise<any>;
updateUserStatus: (id: string, status: any) => Promise<any>;
deleteUser: (id: string) => Promise<any>;

// Settings
getSettings: () => Promise<any>;
updateSetting: (key: string, value: any) => Promise<any>;
deleteSetting: (key: string) => Promise<any>;
```

Add corresponding implementations following the existing pattern (`api.get`/`api.post`/`api.put`).

**Commit:** `feat(web): add production, reports, users and settings API functions`

### Task D2: Add translation keys for new pages

**File:** `MobileApp/web-dashboard/src/contexts/LanguageContext.tsx`

Add to both `en` and `id` sections:

```typescript
// Analytics (missing)
'analytics.title': 'Business Analytics',

// Production
'nav.production': 'Production',
'production.title': 'Production Management',
'production.board': 'Production Board',
'production.tasks': 'Tasks',

// Reports
'nav.reports': 'Reports',
'reports.title': 'Reports',

// Users
'nav.users': 'Users',
'users.title': 'User Management',

// Settings
'nav.settings': 'Settings',
'settings.title': 'Settings',
```

And Indonesian translations:
```typescript
'nav.production': 'Produksi',
'production.title': 'Manajemen Produksi',
'nav.reports': 'Laporan',
'reports.title': 'Laporan',
'nav.users': 'Pengguna',
'users.title': 'Manajemen Pengguna',
'nav.settings': 'Pengaturan',
'settings.title': 'Pengaturan',
```

**Commit:** `feat(web): add translation keys for production, reports, users and settings pages`

### Task D3: Create ProductionPage

**Create:** `MobileApp/web-dashboard/src/pages/ProductionPage.tsx`

Features:
- Kanban-style board showing orders by production stage (designing, in_production, quality_control)
- Production stats cards (total tasks, in progress, completed, urgent)
- Uses `getProductionBoard()` and `getProductionStats()` from API
- Loading spinner, error state with retry (same pattern as other pages)
- IDR currency formatting with `Intl.NumberFormat('id-ID')`

Layout: Stats cards on top, then a 3-column grid for Kanban stages (Designing | In Production | Quality Control), each column shows order cards with customer name, priority badge, due date.

**Commit:** `feat(web): add ProductionPage with Kanban board and stats`

### Task D4: Create ReportsPage

**Create:** `MobileApp/web-dashboard/src/pages/ReportsPage.tsx`

Features:
- Report type selector (Sales, Inventory, Production, Customers, Financial)
- Date range picker (start date, end date inputs)
- Summary cards showing key metrics for selected report
- Data table showing report details
- Uses `getSalesReport()`, `getInventoryReport()`, etc. from API
- Loading spinner, error state with retry

**Commit:** `feat(web): add ReportsPage with multi-type report viewer`

### Task D5: Create UsersPage

**Create:** `MobileApp/web-dashboard/src/pages/UsersPage.tsx`

Features:
- Users table with columns: Name, Email, Role, Status, Actions
- Role badge colors (owner=purple, manager=blue, employee=green)
- Status toggle (active/inactive)
- Search by name/email
- Uses `getUsers()`, `updateUserStatus()` from API
- Loading spinner, error state with retry, pagination

**Commit:** `feat(web): add UsersPage with user management table`

### Task D6: Create SettingsPage

**Create:** `MobileApp/web-dashboard/src/pages/SettingsPage.tsx`

Features:
- Settings grouped by category (General, Business, Notifications)
- Key-value display with edit capability
- Uses `getSettings()`, `updateSetting()` from API
- Loading spinner, error state with retry

**Commit:** `feat(web): add SettingsPage with settings editor`

### Task D7: Add new pages to App.tsx routes and Sidebar navigation

**Files:**
- Modify: `MobileApp/web-dashboard/src/App.tsx`
- Modify: `MobileApp/web-dashboard/src/components/Sidebar.tsx`

App.tsx — Add imports and routes:
```tsx
import ProductionPage from './pages/ProductionPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';

// Add routes:
<Route path="/production" element={<ProductionPage />} />
<Route path="/reports" element={<ReportsPage />} />
<Route path="/users" element={<UsersPage />} />
<Route path="/settings" element={<SettingsPage />} />
```

Sidebar.tsx — Add navigation items after analytics:
```tsx
{
  name: t('nav.production'),
  href: '/production',
  icon: '🏭',
  current: location.pathname === '/production',
},
{
  name: t('nav.reports'),
  href: '/reports',
  icon: '📄',
  current: location.pathname === '/reports',
},
{
  name: t('nav.users'),
  href: '/users',
  icon: '🔑',
  current: location.pathname === '/users',
},
{
  name: t('nav.settings'),
  href: '/settings',
  icon: '⚙️',
  current: location.pathname === '/settings',
},
```

**Commit per file:**
- `feat(web): add production, reports, users and settings routes`
- `feat(web): add production, reports, users and settings to sidebar navigation`

### Task D8: Create web dashboard .env.example

**Create:** `MobileApp/web-dashboard/.env.example`

```
# API Configuration
REACT_APP_API_URL=http://localhost:3001/api
```

**Commit:** `docs(web): add .env.example with API configuration`

---

## Group E: DevOps — Docker & CI/CD

### Task E1: Create backend Dockerfile

**Create:** `MobileApp/backend/Dockerfile`

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/cardose.db

CMD ["node", "src/server.js"]
```

**Commit:** `devops(backend): add Dockerfile for backend service`

### Task E2: Create web dashboard Dockerfile

**Create:** `MobileApp/web-dashboard/Dockerfile`

```dockerfile
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Create:** `MobileApp/web-dashboard/nginx.conf`

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Commits:**
- `devops(web): add Dockerfile for web dashboard`
- `devops(web): add nginx config for SPA routing and API proxy`

### Task E3: Create docker-compose.yml

**Create:** `MobileApp/docker-compose.yml`

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET:-change-me-in-production}
      - PORT=3001
      - DB_PATH=/app/data/cardose.db
    volumes:
      - db-data:/app/data
      - uploads:/app/uploads
    restart: unless-stopped

  web-dashboard:
    build: ./web-dashboard
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  db-data:
  uploads:
```

**Commit:** `devops: add docker-compose for backend and web dashboard`

### Task E4: Create .dockerignore files

**Create:** `MobileApp/backend/.dockerignore`

```
node_modules
npm-debug.log
tests
jest.config.js
*.test.js
.env
data/*.db
```

**Create:** `MobileApp/web-dashboard/.dockerignore`

```
node_modules
npm-debug.log
build
.env
src/__tests__
```

**Commits:**
- `devops(backend): add .dockerignore`
- `devops(web): add .dockerignore`

### Task E5: Create GitHub Actions CI workflow

**Create:** `MobileApp/.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: './backend/package-lock.json'
      - run: npm ci
      - run: npx jest --runInBand --no-coverage

  web-build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./web-dashboard
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: './web-dashboard/package-lock.json'
      - run: npm ci
      - run: npm run build
```

**Commit:** `devops: add GitHub Actions CI workflow for backend tests and web build`

---

## Group F: Final Verification

### Task F1: Run full backend test suite

**Run:** `cd MobileApp/backend && npx jest --runInBand --no-coverage`
**Expected:** All tests pass (312 existing + new tests from Group C)

### Task F2: Verify web dashboard builds

**Run:** `cd MobileApp/web-dashboard && npm run build`
**Expected:** Build succeeds with no errors

### Task F3: Verify Docker builds

**Run:** `cd MobileApp && docker-compose build`
**Expected:** Both services build successfully

---

## Task Summary

| Group | Tasks | Description |
|-------|-------|-------------|
| A | 3 | Extract shared parsePagination utility |
| B | 11 | Add Fastify schema validation to 45 endpoints |
| C | 13 | Register missing routes + write tests for 11 route files |
| D | 8 | Add 4 web dashboard pages + API functions + translations |
| E | 5 | Docker + CI/CD setup |
| F | 3 | Final verification |
| **Total** | **43** | |
