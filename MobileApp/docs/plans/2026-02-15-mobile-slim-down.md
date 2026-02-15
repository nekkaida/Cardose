# Mobile App Slim-Down: Web Primary + Thin Mobile Companion

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Strip the mobile app from a full-featured duplicate of the web dashboard down to a 4-screen workshop companion tool (Order Photos, QC Checklist, Order Status Board, Profile/Logout), and fix the status enum divergence across all platforms.

**Architecture:** The web dashboard becomes the primary business system for all CRUD, analytics, reports, and admin. The mobile app retains only features that genuinely require a phone: camera photo capture, hands-free QC checklist, and quick order status updates. All offline sync infrastructure (DatabaseService, syncSlice) is removed — the mobile app becomes a thin API client.

**Tech Stack:** React Native (Expo), Redux Toolkit (auth + ui slices only), Fastify backend, React web dashboard

---

## Pre-Flight: Current State

### What exists now (mobile):
- **31 screens** across 7 tab navigators
- **8 Redux slices** (auth, orders, customers, inventory, financial, production, ui, sync)
- **12 services** including 1,045-line DatabaseService for offline SQLite
- **5 stack navigators** + bottom tab navigator
- **10 type definition files**

### What we're keeping:
- `LoginScreen.tsx` — auth
- `OrderPhotosScreen.tsx` — camera + photo gallery
- `QualityControlScreen.tsx` — production floor checklist
- `ProfileScreen.tsx` — user info + logout
- `CameraCapture.tsx`, `ImageGallery.tsx` — photo components
- `ErrorBoundary.tsx` — crash safety
- `useAuthenticatedFetch.ts` — API hook (used by QC and Profile)
- `authSlice.ts`, `uiSlice.ts` — auth + toast state
- `ApiService.ts`, `FileService.ts` — API communication

### What we're creating:
- `StatusBoardScreen.tsx` — new screen: order list with quick status updates
- `backend/src/routes/config.js` — new endpoint: single source of truth for statuses

### What we're removing:
- **20+ screens** (all CRUD for orders, customers, inventory, financial, analytics, dashboard)
- **5 navigators** (OrdersNavigator, CustomersNavigator, InventoryNavigator, ProductionNavigator, FinancialNavigator)
- **6 Redux slices** (orders, customers, inventory, financial, production, sync)
- **9 services** (OrderService, CustomerService, InventoryService, FinancialService, ProductionService, AnalyticsService, CommunicationService, DesignService, IndonesianBusinessService)
- **DatabaseService.ts** (1,045 lines of offline SQLite)
- **8 type files** (Order, Customer, Inventory, Financial, Production, Analytics, Communication, Design)

---

## Task 1: Backend — Add `/api/config` Endpoint (Single Source of Truth)

**Why:** Three platforms define statuses independently. Backend must be the authority.

**Files:**
- Create: `backend/src/routes/config.js`
- Modify: `backend/src/server.js` (add route registration)

**Step 1: Create `backend/src/routes/config.js`**

```javascript
// Application configuration endpoint (public, no auth required)
async function configRoutes(fastify, options) {
  /**
   * GET /api/config
   * Returns all application enums and constants.
   * Both web and mobile clients consume this on startup.
   */
  fastify.get('/', async (request, reply) => {
    return {
      success: true,
      config: {
        statuses: {
          order: [
            { value: 'pending', label: 'Pending', color: '#FFA500' },
            { value: 'designing', label: 'Designing', color: '#4169E1' },
            { value: 'approved', label: 'Approved', color: '#9370DB' },
            { value: 'production', label: 'In Production', color: '#FF8C00' },
            { value: 'quality_control', label: 'Quality Control', color: '#FFD700' },
            { value: 'completed', label: 'Completed', color: '#228B22' },
            { value: 'cancelled', label: 'Cancelled', color: '#DC143C' },
          ],
          task: [
            { value: 'pending', label: 'Pending', color: '#FFA500' },
            { value: 'in_progress', label: 'In Progress', color: '#9370DB' },
            { value: 'completed', label: 'Completed', color: '#228B22' },
            { value: 'cancelled', label: 'Cancelled', color: '#DC143C' },
          ],
          invoice: [
            { value: 'draft', label: 'Draft', color: '#808080' },
            { value: 'sent', label: 'Sent', color: '#4169E1' },
            { value: 'paid', label: 'Paid', color: '#228B22' },
            { value: 'overdue', label: 'Overdue', color: '#DC143C' },
            { value: 'cancelled', label: 'Cancelled', color: '#696969' },
          ],
        },
        priorities: [
          { value: 'low', label: 'Low', color: '#6B7280' },
          { value: 'normal', label: 'Normal', color: '#3B82F6' },
          { value: 'high', label: 'High', color: '#F59E0B' },
          { value: 'urgent', label: 'Urgent', color: '#EF4444' },
        ],
        boxTypes: [
          { value: 'standard', label: 'Standard' },
          { value: 'premium', label: 'Premium' },
          { value: 'luxury', label: 'Luxury' },
          { value: 'custom', label: 'Custom' },
        ],
      },
    };
  });
}

module.exports = configRoutes;
```

**Step 2: Register in `backend/src/server.js`**

Add this line alongside other route registrations:
```javascript
fastify.register(require('./routes/config'), { prefix: '/api/config' });
```

**Step 3: Commit**
```
feat(backend): add /api/config endpoint as single source of truth for statuses
```

---

## Task 2: Web Dashboard — Fix Status List to Match Backend

**Why:** Web currently uses `['pending', 'in_progress', 'completed', 'cancelled']` — missing `designing`, `approved`, `production`, `quality_control`.

**Files:**
- Modify: `web-dashboard/src/pages/OrdersPage.tsx` (line 24)

**Step 1: Update the STATUSES constant**

Change line 24 from:
```typescript
const STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'] as const;
```
To:
```typescript
const STATUSES = ['pending', 'designing', 'approved', 'production', 'quality_control', 'completed', 'cancelled'] as const;
```

**Step 2: Verify web builds**
```bash
cd web-dashboard && npm run build
```

**Step 3: Commit**
```
fix(web-dashboard): align order statuses with backend validation
```

---

## Task 3: Mobile — Create `StatusBoardScreen.tsx`

**Why:** This replaces the entire Orders tab. Shows all active orders grouped by status with one-tap status changes.

**Files:**
- Create: `mobile/src/screens/StatusBoard/StatusBoardScreen.tsx`

**Step 1: Create the screen**

The screen should:
- Fetch orders from `/orders?limit=100` using `useAuthenticatedFetch`
- Fetch status definitions from `/config` on mount
- Display orders as cards grouped by current status
- Each card shows: order number, customer name, box type, due date
- Tapping a card opens a status picker (bottom sheet or modal)
- Selecting a new status calls `PATCH /orders/:id/status` with `{ status, notes }`
- Pull-to-refresh to reload orders
- Color-coded status headers using colors from `/api/config`
- Overdue orders highlighted (due_date < today)

**Dependencies (all already installed):**
- `useAuthenticatedFetch` hook
- `theme/theme` for styling
- React Native core components only (no new packages)

**Step 2: Commit**
```
feat(mobile): add StatusBoardScreen for quick order status updates
```

---

## Task 4: Mobile — Rewrite `App.tsx` (4 Tabs)

**Why:** Replace 7-tab navigator with 4 focused tabs.

**Files:**
- Modify: `mobile/App.tsx`

**Step 1: New tab structure**

```
Tab 1: "Orders"    → StatusBoardScreen     (icon: 📋)
Tab 2: "Photos"    → OrderPhotosScreen *   (icon: 📸)
Tab 3: "QC"        → QualityControlScreen  (icon: ✅)
Tab 4: "Profile"   → ProfileScreen         (icon: 👤)
```

*Note: Photos and QC screens need an `orderId` param. Two approaches:
- **Option A:** The tab shows a simple order picker first (search/select), then navigates to the actual screen. This requires a small stack navigator per tab.
- **Option B:** The StatusBoard screen has action buttons on each order card: "Photos" and "QC Check". These navigate to the respective screens using a root stack.

**Recommended: Option B** — The StatusBoard is the hub. Each order card has "Photos" and "QC" action buttons. This means we need a single Stack navigator wrapping all screens, not a tab navigator with stacks.

**Revised navigation structure:**
```
Stack Navigator (root):
  ├── MainTabs (bottom tab navigator)
  │   ├── "Orders" → StatusBoardScreen
  │   └── "Profile" → ProfileScreen
  ├── OrderPhotos → OrderPhotosScreen (params: orderId, orderNumber)
  └── QualityCheck → QualityControlScreen (params: orderId)
```

This means Photos and QC are reached from order cards on the StatusBoard, not as standalone tabs. Cleaner UX — you always pick which order first.

**Step 2: Remove all old imports**

Remove imports for:
- `DashboardScreen`
- `OrdersNavigator`
- `CustomersNavigator`
- `InventoryNavigator`
- `ProductionNavigator`
- `FinancialNavigator`
- `DatabaseService` (remove from initialization)

**Step 3: Remove `DatabaseService.initialize()` from startup**

In the `useEffect` init block, remove `await DatabaseService.initialize()`.

**Step 4: Commit**
```
refactor(mobile): rewrite App.tsx with slim 2-tab + stack navigation
```

---

## Task 5: Mobile — Slim Down Redux Store

**Why:** 6 of 8 slices are for features we just removed.

**Files:**
- Modify: `mobile/src/store/index.ts`

**Step 1: Remove imports and reducers**

Keep only:
```typescript
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  ui: uiReducer,
});
```

Remove from blacklist/whitelist — simplify persist config to just whitelist `['ui']`.

**Step 2: Commit**
```
refactor(mobile): strip Redux store to auth + ui slices only
```

---

## Task 6: Mobile — Update `config.ts`

**Why:** Remove SYNC_CONFIG, update STATUS_OPTIONS to match backend, remove OFFLINE_MODE flag.

**Files:**
- Modify: `mobile/src/config.ts`

**Step 1: Remove `SYNC_CONFIG` block entirely** (lines ~57-75)

**Step 2: Update `STATUS_OPTIONS` to match backend**

```typescript
export const STATUS_OPTIONS = {
  ORDER: [
    { value: 'pending', label: 'Pending', color: '#FFA500' },
    { value: 'designing', label: 'Designing', color: '#4169E1' },
    { value: 'approved', label: 'Approved', color: '#9370DB' },
    { value: 'production', label: 'In Production', color: '#FF8C00' },
    { value: 'quality_control', label: 'Quality Control', color: '#FFD700' },
    { value: 'completed', label: 'Completed', color: '#228B22' },
    { value: 'cancelled', label: 'Cancelled', color: '#DC143C' },
  ],
  TASK: [
    { value: 'pending', label: 'Pending', color: '#FFA500' },
    { value: 'in_progress', label: 'In Progress', color: '#9370DB' },
    { value: 'completed', label: 'Completed', color: '#228B22' },
    { value: 'cancelled', label: 'Cancelled', color: '#DC143C' },
  ],
  INVOICE: [
    { value: 'draft', label: 'Draft', color: '#808080' },
    { value: 'sent', label: 'Sent', color: '#4169E1' },
    { value: 'paid', label: 'Paid', color: '#228B22' },
    { value: 'overdue', label: 'Overdue', color: '#DC143C' },
    { value: 'cancelled', label: 'Cancelled', color: '#696969' },
  ],
};
```

**Step 3: Set `OFFLINE_MODE: false`** in APP_CONFIG.FEATURES

**Step 4: Commit**
```
refactor(mobile): align statuses with backend, remove sync config
```

---

## Task 7: Mobile — Delete Unused Files

**Why:** Remove all the code that's no longer referenced.

**Files to delete:**

### Services (9 files):
```
mobile/src/services/DatabaseService.ts
mobile/src/services/OrderService.ts
mobile/src/services/CustomerService.ts
mobile/src/services/InventoryService.ts
mobile/src/services/FinancialService.ts
mobile/src/services/ProductionService.ts
mobile/src/services/AnalyticsService.ts
mobile/src/services/CommunicationService.ts
mobile/src/services/DesignService.ts
mobile/src/services/IndonesianBusinessService.ts
```

### Redux Slices (6 files):
```
mobile/src/store/slices/syncSlice.ts
mobile/src/store/slices/ordersSlice.ts
mobile/src/store/slices/customersSlice.ts
mobile/src/store/slices/inventorySlice.ts
mobile/src/store/slices/financialSlice.ts
mobile/src/store/slices/productionSlice.ts
```

### Screens (20+ files):
```
mobile/src/screens/Dashboard/DashboardScreen.tsx
mobile/src/screens/OrderManagement/OrdersScreen.tsx
mobile/src/screens/OrderManagement/OrderDetailsScreen.tsx
mobile/src/screens/OrderManagement/CreateOrderScreen.tsx
mobile/src/screens/OrderManagement/UpdateOrderStatusScreen.tsx
mobile/src/screens/CustomerDatabase/CustomersScreen.tsx
mobile/src/screens/CustomerDatabase/CustomerDetailsScreen.tsx
mobile/src/screens/CustomerDatabase/CreateCustomerScreen.tsx
mobile/src/screens/Inventory/InventoryScreen.tsx
mobile/src/screens/Inventory/InventoryListScreen.tsx
mobile/src/screens/Inventory/InventoryMaterialsScreen.tsx
mobile/src/screens/Inventory/MaterialDetailsScreen.tsx
mobile/src/screens/Inventory/CreateMaterialScreen.tsx
mobile/src/screens/Production/ProductionListScreen.tsx
mobile/src/screens/Production/ProductionDashboard.tsx
mobile/src/screens/Production/TaskDetailsScreen.tsx
mobile/src/screens/Production/TaskManagementScreen.tsx
mobile/src/screens/Production/CreateTaskScreen.tsx
mobile/src/screens/Financial/FinancialScreen.tsx
mobile/src/screens/Financial/FinancialListScreen.tsx
mobile/src/screens/Financial/InvoiceListScreen.tsx
mobile/src/screens/Financial/InvoiceDetailsScreen.tsx
mobile/src/screens/Financial/CreateInvoiceScreen.tsx
mobile/src/screens/Financial/RecordPaymentScreen.tsx
mobile/src/screens/Financial/BudgetTrackerScreen.tsx
mobile/src/screens/Financial/PricingCalculatorScreen.tsx
mobile/src/screens/Analytics/AnalyticsScreen.tsx
```

### Navigators (5 files):
```
mobile/src/navigation/OrdersNavigator.tsx
mobile/src/navigation/CustomersNavigator.tsx
mobile/src/navigation/InventoryNavigator.tsx
mobile/src/navigation/ProductionNavigator.tsx
mobile/src/navigation/FinancialNavigator.tsx
```

### Type files (8 files — keep index.ts):
```
mobile/src/types/Order.ts
mobile/src/types/Customer.ts
mobile/src/types/Inventory.ts
mobile/src/types/Financial.ts
mobile/src/types/Production.ts
mobile/src/types/Analytics.ts
mobile/src/types/Communication.ts
mobile/src/types/Design.ts
mobile/src/types/Indonesian.ts
```

**Step 1: Delete all files listed above**

**Step 2: Clean up `mobile/src/types/index.ts`** — remove re-exports of deleted types

**Step 3: Commit**
```
refactor(mobile): remove 48 unused files (screens, services, slices, types, navigators)
```

---

## Task 8: Mobile — Verify TypeScript Compiles

**Why:** Ensure nothing is broken after the mass deletion.

**Step 1: Run TypeScript check**
```bash
cd mobile && npx tsc --noEmit
```

**Step 2: Fix any import errors**

Common issues to expect:
- `ProfileScreen.tsx` may import from deleted services — verify it only uses `useAuthenticatedFetch` and `authSlice`
- `types/index.ts` may re-export deleted types
- Any remaining file importing a deleted module

**Step 3: Verify Expo starts**
```bash
cd mobile && npx expo start --no-dev --tunnel 2>&1 | head -20
```

**Step 4: Commit any fixes**
```
fix(mobile): resolve import errors after slim-down
```

---

## Task 9: Web Dashboard — Verify Build Still Works

**Step 1: Build web dashboard**
```bash
cd web-dashboard && npm run build
```

**Step 2: Commit any fixes if needed**

---

## Summary: Before vs After

| Metric | Before | After |
|--------|--------|-------|
| Screen files | 31 | 4 (Login, StatusBoard, OrderPhotos, QualityControl, Profile) |
| Redux slices | 8 | 2 (auth, ui) |
| Services | 12 | 3 (ApiService, FileService, useAuthenticatedFetch) |
| Navigators | 5 stack + 1 tab | 1 stack + 1 tab |
| Type files | 10 | 1 (index.ts) |
| Offline DB (DatabaseService) | 1,045 lines | 0 |
| Sync system (syncSlice) | 428 lines | 0 |
| Total files deleted | 0 | ~48 |
| API change touch points | 7 | 3 |

### Final mobile app structure:
```
mobile/
├── App.tsx                              (rewritten — 2 tabs + stack)
├── src/
│   ├── components/
│   │   ├── CameraCapture.tsx            (kept)
│   │   ├── ImageGallery.tsx             (kept)
│   │   └── ErrorBoundary.tsx            (kept)
│   ├── config.ts                        (cleaned — no sync, correct statuses)
│   ├── hooks/
│   │   └── useAuthenticatedFetch.ts     (kept)
│   ├── screens/
│   │   ├── Auth/LoginScreen.tsx         (kept)
│   │   ├── StatusBoard/StatusBoardScreen.tsx  (NEW)
│   │   ├── OrderPhotos/OrderPhotosScreen.tsx  (kept)
│   │   ├── Production/QualityControlScreen.tsx (kept)
│   │   └── Profile/ProfileScreen.tsx    (kept)
│   ├── services/
│   │   ├── ApiService.ts               (kept)
│   │   └── FileService.ts              (kept)
│   ├── store/
│   │   ├── index.ts                    (slimmed — auth + ui only)
│   │   ├── hooks.ts                    (kept)
│   │   └── slices/
│   │       ├── authSlice.ts            (kept)
│   │       └── uiSlice.ts             (kept)
│   ├── theme/
│   │   └── theme.ts                    (kept)
│   └── types/
│       └── index.ts                    (cleaned)
```
