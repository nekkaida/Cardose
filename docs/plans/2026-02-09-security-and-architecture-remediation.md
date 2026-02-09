# Security & Architecture Remediation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all critical security vulnerabilities and architectural anti-patterns identified in the Cardose codebase review, starting with issues that allow anonymous system takeover and working down to structural improvements.

**Architecture:** Surgical fixes to the existing Fastify + SQLite backend. No framework changes, no new libraries beyond `@fastify/rate-limit` and `@fastify/helmet`. Every route file gets its redundant `DatabaseService` removed in favor of the shared `fastify.db` instance. Auth middleware gets `return` statements. Registration gets locked down. JWT gets expiration.

**Tech Stack:** Node.js, Fastify 4.x, better-sqlite3, bcryptjs, @fastify/jwt, @fastify/rate-limit (new), @fastify/helmet (new)

---

## Phase 1: Stop the Bleeding (Critical Security)

These 7 tasks fix vulnerabilities that allow anonymous system takeover. Do them first. Do them now.

---

### Task 1: Remove Hardcoded JWT Secret Fallback

The server falls back to `'premium-gift-box-secret-key-change-in-production'` if `JWT_SECRET` is not set. Anyone who reads the source can forge tokens.

**Files:**
- Modify: `MobileApp/backend/src/server.js:9-11`
- Modify: `MobileApp/backend/.env.example:7`

**Step 1: Fix server.js -- crash on missing secret**

Replace lines 9-11 in `server.js`:

```javascript
// OLD:
fastify.register(require('@fastify/jwt'), {
  secret: process.env.JWT_SECRET || 'premium-gift-box-secret-key-change-in-production'
});

// NEW:
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error('FATAL: JWT_SECRET environment variable is required. Server cannot start without it.');
  process.exit(1);
}
fastify.register(require('@fastify/jwt'), {
  secret: jwtSecret
});
```

**Step 2: Fix .env.example -- placeholder only**

```
# OLD:
JWT_SECRET=premium-gift-box-secret-key-change-in-production

# NEW:
JWT_SECRET=CHANGE_ME_TO_A_RANDOM_64_CHAR_STRING
```

**Step 3: Create .env for development if it doesn't exist**

Create `MobileApp/backend/.env` (gitignored) with a real random secret for local dev:

```
JWT_SECRET=dev-local-secret-do-not-use-in-production-abc123xyz789
```

**Step 4: Run server to verify it starts with .env and crashes without**

```bash
cd MobileApp/backend
node -e "delete process.env.JWT_SECRET; require('./src/server.js')" 2>&1 | head -5
# Expected: FATAL error message, exit code 1

JWT_SECRET=test-secret node -e "require('./src/server.js')" 2>&1 | head -5
# Expected: Server starts successfully
```

**Step 5: Commit**

```bash
git add MobileApp/backend/src/server.js MobileApp/backend/.env.example
git commit -m "security: require JWT_SECRET env var, remove hardcoded fallback"
```

---

### Task 2: Add JWT Token Expiration

Tokens never expire. A stolen token grants permanent access.

**Files:**
- Modify: `MobileApp/backend/src/routes/auth.js:59-64` (register token)
- Modify: `MobileApp/backend/src/routes/auth.js:115-120` (login token)

**Step 1: Add expiresIn to register token (line 59)**

```javascript
// OLD:
const token = fastify.jwt.sign({
  id: userId,
  username,
  email,
  role: userRole
});

// NEW:
const token = fastify.jwt.sign({
  id: userId,
  username,
  email,
  role: userRole
}, { expiresIn: '24h' });
```

**Step 2: Add expiresIn to login token (line 115)**

```javascript
// OLD:
const token = fastify.jwt.sign({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role
});

// NEW:
const token = fastify.jwt.sign({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role
}, { expiresIn: '24h' });
```

**Step 3: Run auth tests**

```bash
cd MobileApp/backend
npm run test:auth
# Expected: All tests pass (token format doesn't change, just adds exp claim)
```

**Step 4: Commit**

```bash
git add MobileApp/backend/src/routes/auth.js
git commit -m "security: add 24h expiration to all JWT tokens"
```

---

### Task 3: Lock Down Registration -- No Self-Assigned Roles

Anyone can `POST /register` with `{"role":"owner"}` and get admin access.

**Files:**
- Modify: `MobileApp/backend/src/routes/auth.js:20-82`

**Step 1: Force employee role on self-registration**

Replace line 51:

```javascript
// OLD:
const userRole = role === 'owner' || role === 'manager' ? role : 'employee';

// NEW:
const userRole = 'employee'; // Only admins can assign elevated roles via /api/users
```

**Step 2: Run auth tests**

```bash
cd MobileApp/backend
npm run test:auth
# Expected: Tests pass. If any test expects role escalation via register, update that test.
```

**Step 3: Commit**

```bash
git add MobileApp/backend/src/routes/auth.js
git commit -m "security: force employee role on self-registration, prevent privilege escalation"
```

---

### Task 4: Fix Auth Middleware -- Add Missing `return` Statements

The `authenticate` and `authorize` decorators send error responses but don't halt execution. The route handler may still run.

**Files:**
- Modify: `MobileApp/backend/src/middleware/auth.js`

**Step 1: Add return to authenticate decorator (line 10)**

```javascript
// OLD:
fastify.decorate('authenticate', async function (request, reply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ error: 'Authentication required' });
  }
});

// NEW:
fastify.decorate('authenticate', async function (request, reply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send({ error: 'Authentication required' });
  }
});
```

**Step 2: Add return to authorize decorator (line 21, 24)**

```javascript
// OLD:
fastify.decorate('authorize', (roles) => {
  return async function (request, reply) {
    try {
      await request.jwtVerify();

      if (!roles.includes(request.user.role)) {
        reply.status(403).send({ error: 'Insufficient permissions' });
      }
    } catch (err) {
      reply.status(401).send({ error: 'Authentication required' });
    }
  };
});

// NEW:
fastify.decorate('authorize', (roles) => {
  return async function (request, reply) {
    try {
      await request.jwtVerify();

      if (!roles.includes(request.user.role)) {
        return reply.status(403).send({ error: 'Insufficient permissions' });
      }
    } catch (err) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
  };
});
```

**Step 3: Remove duplicate authenticate in auth.js route file**

In `MobileApp/backend/src/routes/auth.js`, remove lines 10-17 (the local `authenticate` re-definition) and lines 379-406 (the unused `authenticateDecorator` export). Replace the local `authenticate` usage in preHandler with `fastify.authenticate`.

Replace line 142:
```javascript
// OLD:
preHandler: [authenticate]

// NEW:
preHandler: [fastify.authenticate]
```

Do the same for lines 152, 182, 210, 244, 369 in auth.js -- every `preHandler: [authenticate]` becomes `preHandler: [fastify.authenticate]`.

Also remove the export of `authenticateDecorator`:
```javascript
// OLD:
module.exports = authRoutes;
module.exports.authenticateDecorator = authenticateDecorator;

// NEW:
module.exports = authRoutes;
```

**Step 4: Run all tests**

```bash
cd MobileApp/backend
npm test
# Expected: All tests pass
```

**Step 5: Commit**

```bash
git add MobileApp/backend/src/middleware/auth.js MobileApp/backend/src/routes/auth.js
git commit -m "security: add return to auth middleware, remove duplicate auth definitions"
```

---

### Task 5: Fix SQL Injection via Dynamic Column Names

`updateUser`, `updateInvoice`, and `updateBudget` interpolate `Object.keys()` directly into SQL.

**Files:**
- Modify: `MobileApp/backend/src/services/DatabaseService.js:592-600, 744-752, 800-808`

**Step 1: Add field whitelists to all three methods**

```javascript
// Replace updateUser (line 592):
updateUser(userId, updates) {
  const allowedFields = ['full_name', 'email', 'phone', 'role', 'is_active', 'username'];
  const fields = Object.keys(updates).filter(f => allowedFields.includes(f));
  if (fields.length === 0) return { changes: 0 };
  const values = fields.map(f => updates[f]);
  const setClause = fields.map(field => `${field} = ?`).join(', ');
  const sql = `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  return this.run(sql, [...values, userId]);
}

// Replace updateInvoice (line 744):
updateInvoice(invoiceId, updates) {
  const allowedFields = ['status', 'subtotal', 'discount', 'discount_type', 'ppn_rate', 'ppn_amount', 'total_amount', 'paid_amount', 'due_date', 'notes', 'payment_date'];
  const fields = Object.keys(updates).filter(f => allowedFields.includes(f));
  if (fields.length === 0) return { changes: 0 };
  const values = fields.map(f => updates[f]);
  const setClause = fields.map(field => `${field} = ?`).join(', ');
  const sql = `UPDATE invoices SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  return this.run(sql, [...values, invoiceId]);
}

// Replace updateBudget (line 800):
updateBudget(budgetId, updates) {
  const allowedFields = ['category', 'amount', 'period', 'start_date', 'end_date', 'notes'];
  const fields = Object.keys(updates).filter(f => allowedFields.includes(f));
  if (fields.length === 0) return { changes: 0 };
  const values = fields.map(f => updates[f]);
  const setClause = fields.map(field => `${field} = ?`).join(', ');
  const sql = `UPDATE budgets SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  return this.run(sql, [...values, budgetId]);
}
```

**Step 2: Run tests**

```bash
cd MobileApp/backend
npm test
```

**Step 3: Commit**

```bash
git add MobileApp/backend/src/services/DatabaseService.js
git commit -m "security: whitelist allowed fields in update methods to prevent SQL injection"
```

---

### Task 6: Remove Reset Token from API Response

The password reset endpoint returns the token in the response body, allowing account takeover.

**Files:**
- Modify: `MobileApp/backend/src/routes/auth.js:314-318`

**Step 1: Remove resetToken from response**

```javascript
// OLD:
return {
  success: true,
  message: 'Reset token generated',
  resetToken // Remove this in production, send via email instead
};

// NEW:
return {
  success: true,
  message: 'If the email exists, reset instructions will be sent'
};
```

**Step 2: Run auth tests**

```bash
cd MobileApp/backend
npm run test:auth
# If tests relied on resetToken in response, update them to test the new behavior
```

**Step 3: Commit**

```bash
git add MobileApp/backend/src/routes/auth.js
git commit -m "security: remove reset token from API response"
```

---

### Task 7: Install and Configure Security Packages (Helmet, Rate Limit, CORS)

No rate limiting, no security headers, CORS allows all origins.

**Files:**
- Modify: `MobileApp/backend/package.json`
- Modify: `MobileApp/backend/src/server.js`

**Step 1: Install packages**

```bash
cd MobileApp/backend
npm install @fastify/rate-limit @fastify/helmet
```

**Step 2: Update server.js**

Replace the CORS and add helmet + rate limit at the top of server.js (after line 3):

```javascript
// Register security plugins
fastify.register(require('@fastify/helmet'));

fastify.register(require('@fastify/cors'), {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
});

fastify.register(require('@fastify/rate-limit'), {
  max: 100,
  timeWindow: '1 minute'
});
```

**Step 3: Add stricter rate limits on auth routes in auth.js**

At the top of the register and login handlers, add config:

```javascript
// Register route -- strict rate limit
fastify.post('/register', {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '15 minutes'
    }
  }
}, async (request, reply) => {
  // ... existing handler
});

// Login route -- strict rate limit
fastify.post('/login', {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: '15 minutes'
    }
  }
}, async (request, reply) => {
  // ... existing handler
});
```

**Step 4: Add CORS_ORIGIN to .env.example**

```
CORS_ORIGIN=http://localhost:3000
```

**Step 5: Run tests**

```bash
cd MobileApp/backend
npm test
```

**Step 6: Commit**

```bash
git add MobileApp/backend/package.json MobileApp/backend/package-lock.json MobileApp/backend/src/server.js MobileApp/backend/src/routes/auth.js MobileApp/backend/.env.example
git commit -m "security: add helmet, rate limiting, restrict CORS origins"
```

---

## Phase 2: Fix Architecture (Eliminate Redundant DB Connections)

Every route file creates `new DatabaseService()` + `db.initialize()`, opening redundant SQLite connections and running table creation 7+ times. The server already provides `fastify.db`. Fix all routes to use it.

---

### Task 8: Remove Redundant DatabaseService from All Route Files

**Files to modify** (remove `new DatabaseService()` + `db.initialize()`, use `fastify.db` instead):
- `MobileApp/backend/src/routes/auth.js` (lines 7-8)
- `MobileApp/backend/src/routes/orders.js` (lines 3, 6-7)
- `MobileApp/backend/src/routes/customers.js` (lines 2, 5-6)
- `MobileApp/backend/src/routes/inventory.js` (lines 3, 6-7)
- `MobileApp/backend/src/routes/financial.js` (lines 3, 6-7)
- `MobileApp/backend/src/routes/production.js` (lines 3, 6-7)
- `MobileApp/backend/src/routes/search.js` (lines 2, 5-6)

**Step 1: In each file, apply this pattern**

For each route file listed above:

1. Remove the `const DatabaseService = require(...)` import line
2. Remove the `const db = new DatabaseService();` line
3. Remove the `db.initialize();` line
4. Add `const db = fastify.db;` as the first line inside the route function

Example for `orders.js`:
```javascript
// OLD:
const { v4: uuidv4 } = require('uuid');
const DatabaseService = require('../services/DatabaseService');

async function ordersRoutes(fastify, options) {
  const db = new DatabaseService();
  db.initialize();

// NEW:
const { v4: uuidv4 } = require('uuid');

async function ordersRoutes(fastify, options) {
  const db = fastify.db;
```

The rest of each file references `db.db.prepare(...)` which continues to work because `fastify.db` is the same DatabaseService instance.

**Step 2: Verify analytics.js is already correct (line 5)**

`analytics.js` already uses `const db = fastify.db;` -- confirm this and leave it as-is.

**Step 3: Run ALL tests**

```bash
cd MobileApp/backend
npm test
```

**Step 4: Commit**

```bash
git add MobileApp/backend/src/routes/
git commit -m "refactor: use shared fastify.db instead of creating redundant DatabaseService instances"
```

---

### Task 9: Enable Foreign Key Enforcement and Add Graceful Shutdown

Foreign keys are declared but never enforced. No graceful shutdown closes DB connections.

**Files:**
- Modify: `MobileApp/backend/src/services/DatabaseService.js:20-21`
- Modify: `MobileApp/backend/src/server.js` (add shutdown handler)

**Step 1: Enable foreign keys after opening connection (after line 20)**

```javascript
// After: this.db = new Database(this.dbPath);
// Add:
this.db.pragma('journal_mode = WAL');
this.db.pragma('foreign_keys = ON');
```

**Step 2: Add graceful shutdown to server.js (before the `start()` call)**

```javascript
// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...');
  try {
    await fastify.close();
    db.close();
    console.log('Server closed.');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

**Step 3: Add close() method to DatabaseService if missing**

Check if `close()` exists. If not, add:

```javascript
close() {
  if (this.db) {
    this.db.close();
    console.log('Database connection closed.');
  }
}
```

**Step 4: Run tests**

```bash
cd MobileApp/backend
npm test
```

**Step 5: Commit**

```bash
git add MobileApp/backend/src/services/DatabaseService.js MobileApp/backend/src/server.js
git commit -m "fix: enable foreign keys, WAL mode, add graceful shutdown"
```

---

## Phase 3: Input Validation & Error Handling

---

### Task 10: Sanitize Error Messages -- Stop Leaking Internals

**Files:**
- Modify: All route files' catch blocks

**Step 1: Create a helper function**

Add to the top of `server.js` or create `MobileApp/backend/src/utils/errors.js`:

```javascript
function safeError(error, fastify) {
  fastify.log.error(error);
  return { success: false, error: 'An internal error occurred' };
}
```

**Step 2: Replace raw error.message in catch blocks**

In every route file, replace patterns like:
```javascript
reply.status(500).send({ error: 'Registration failed: ' + error.message });
```
With:
```javascript
fastify.log.error(error);
reply.status(500).send({ success: false, error: 'An internal error occurred' });
```

Apply this to all catch blocks across: `auth.js`, `orders.js`, `customers.js`, `inventory.js`, `financial.js`, `production.js`, `search.js`.

**Step 3: Run tests**

```bash
cd MobileApp/backend
npm test
# Some tests may check for specific error messages -- update those assertions
```

**Step 4: Commit**

```bash
git add MobileApp/backend/src/routes/
git commit -m "security: sanitize error messages, stop leaking internal details"
```

---

### Task 11: Add Role-Based Authorization to Destructive Endpoints

The `authorize` decorator exists but is never used. Any employee can delete anything.

**Files:**
- Modify: `MobileApp/backend/src/routes/orders.js` (DELETE)
- Modify: `MobileApp/backend/src/routes/customers.js` (DELETE)
- Modify: `MobileApp/backend/src/routes/inventory.js` (DELETE)
- Modify: `MobileApp/backend/src/routes/financial.js` (DELETE, create invoice)
- Modify: `MobileApp/backend/src/routes/users.js` (all user management)

**Step 1: Add authorize to destructive endpoints**

For DELETE operations, add `fastify.authorize(['owner', 'manager'])`:

```javascript
// Example for orders DELETE:
// OLD:
fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {

// NEW:
fastify.delete('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['owner', 'manager'])] }, async (request, reply) => {
```

Apply this pattern to:
- `orders.js` DELETE /:id
- `customers.js` DELETE /:id
- `inventory.js` DELETE /:id
- `financial.js` DELETE operations
- `users.js` POST (create), PUT (update), DELETE

**Step 2: Run tests**

```bash
cd MobileApp/backend
npm test
```

**Step 3: Commit**

```bash
git add MobileApp/backend/src/routes/
git commit -m "security: add role-based authorization to destructive endpoints"
```

---

### Task 12: Add Pagination Validation

No validation on `limit` and `page` query params -- negative or huge values accepted.

**Files:**
- Modify: All route files with pagination (orders.js, customers.js, inventory.js, financial.js, production.js)

**Step 1: Add validation helper**

Add to the top of each route function (or create a shared util):

```javascript
function parsePagination(query) {
  let limit = Math.min(Math.max(parseInt(query.limit) || 50, 1), 200);
  let page = Math.max(parseInt(query.page) || 1, 1);
  const offset = (page - 1) * limit;
  return { limit, page, offset };
}
```

**Step 2: Replace raw parseInt usage in each file's pagination**

```javascript
// OLD:
const { limit = 100, page = 1 } = request.query;
// ... later:
const offset = (page - 1) * limit;
params.push(parseInt(limit), offset);

// NEW:
const { limit, page, offset } = parsePagination(request.query);
// ... later:
params.push(limit, offset);
```

**Step 3: Run tests**

```bash
cd MobileApp/backend
npm test
```

**Step 4: Commit**

```bash
git add MobileApp/backend/src/routes/
git commit -m "fix: validate pagination parameters, cap limit at 200"
```

---

## Phase 4: Unauthenticated File Access & Path Traversal

---

### Task 13: Add Authentication to File Download Endpoints

File downloads require no auth. Anyone with a UUID can download business documents.

**Files:**
- Modify: `MobileApp/backend/src/routes/files.js`

**Step 1: Add preHandler to file download routes**

Find the `GET /:fileId` and `GET /:fileId/thumbnail` routes and add authentication:

```javascript
// OLD:
fastify.get('/:fileId', async (request, reply) => {

// NEW:
fastify.get('/:fileId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
```

Do the same for the thumbnail endpoint.

**Step 2: Keep the static /uploads/ path protected**

In `server.js`, add a preHandler hook for the static route or remove the static file serving entirely (files should be served through the authenticated endpoint, not directly).

Consider removing:
```javascript
// Remove from server.js:
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '../uploads'),
  prefix: '/uploads/',
});
```

**Step 3: Run tests**

```bash
cd MobileApp/backend
npm test
```

**Step 4: Commit**

```bash
git add MobileApp/backend/src/routes/files.js MobileApp/backend/src/server.js
git commit -m "security: require authentication for file downloads, remove public uploads path"
```

---

### Task 14: Fix Path Traversal in Backup Deletion

The backup DELETE endpoint uses user-supplied `filename` without sanitization.

**Files:**
- Modify: `MobileApp/backend/src/routes/backup.js`

**Step 1: Add path sanitization**

Find the DELETE `/:filename` handler and add:

```javascript
fastify.delete('/:filename', { preHandler: [fastify.authenticate, fastify.authorize(['owner'])] }, async (request, reply) => {
  const { filename } = request.params;

  // Prevent path traversal
  const sanitized = path.basename(filename);
  if (sanitized !== filename || filename.includes('..')) {
    return reply.status(400).send({ error: 'Invalid filename' });
  }

  const filepath = path.join(backupDir, sanitized);
  // ... rest of handler
});
```

**Step 2: Also restrict backup operations to owner role only**

Add `fastify.authorize(['owner'])` to all backup endpoints.

**Step 3: Run tests**

```bash
cd MobileApp/backend
npm test
```

**Step 4: Commit**

```bash
git add MobileApp/backend/src/routes/backup.js
git commit -m "security: fix path traversal in backup deletion, restrict to owner role"
```

---

## Phase 5: Remove Duplicate Route Aliases

---

### Task 15: Remove Duplicate Route Registrations

`/api/finance` is a duplicate of `/api/financial`. `/api/backups` is a duplicate of `/api/backup`. Each creates extra DB connections.

**Files:**
- Modify: `MobileApp/backend/src/server.js:38, 57`

**Step 1: Remove the aliases**

```javascript
// DELETE these lines:
fastify.register(require('./routes/financial'), { prefix: '/api/finance' }); // alias
fastify.register(require('./routes/backup'), { prefix: '/api/backups' }); // alias for /api/backup
```

**Step 2: Run tests**

```bash
cd MobileApp/backend
npm test
```

**Step 3: Commit**

```bash
git add MobileApp/backend/src/server.js
git commit -m "cleanup: remove duplicate route aliases /api/finance and /api/backups"
```

---

## Verification

After all tasks, run the full test suite and verify the server starts:

```bash
cd MobileApp/backend
JWT_SECRET=test-secret-for-verification npm test
JWT_SECRET=test-secret-for-verification node src/server.js &
sleep 2

# Test that unauthenticated registration gets employee role
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123456","email":"test@test.com","fullName":"Test","role":"owner"}' | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');const j=JSON.parse(d);console.log('Role:',j.user.role);process.exit(j.user.role==='employee'?0:1)"

# Test that token has expiration
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123456"}' | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');const j=JSON.parse(d);const payload=JSON.parse(Buffer.from(j.token.split('.')[1],'base64').toString());console.log('Has exp:',!!payload.exp);process.exit(payload.exp?0:1)"

# Test rate limiting
for i in $(seq 1 12); do curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"wrong","password":"wrong"}'; done
# Expected: last few should return 429

kill %1
```

---

## Summary

| Task | Severity | What It Fixes |
|------|----------|--------------|
| 1 | CRITICAL | Hardcoded JWT secret |
| 2 | CRITICAL | Tokens never expire |
| 3 | CRITICAL | Anyone can register as owner |
| 4 | CRITICAL | Auth middleware doesn't halt execution |
| 5 | CRITICAL | SQL injection via dynamic column names |
| 6 | HIGH | Reset token exposed in response |
| 7 | HIGH | No rate limiting, no security headers, open CORS |
| 8 | HIGH | 7+ redundant DB connections per startup |
| 9 | MEDIUM | Foreign keys not enforced, no graceful shutdown |
| 10 | MEDIUM | Internal error details leaked to clients |
| 11 | HIGH | No role-based authorization on destructive ops |
| 12 | MEDIUM | Unbounded pagination parameters |
| 13 | HIGH | Unauthenticated file downloads |
| 14 | HIGH | Path traversal in backup deletion |
| 15 | LOW | Duplicate route registrations waste resources |

**Total: 15 tasks, ~45 steps, focused on backend security and architecture.**

Mobile app and web dashboard issues are tracked separately -- they are less urgent because the backend is the trust boundary.
