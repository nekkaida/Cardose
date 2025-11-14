# Production & Inventory Management System Documentation

## Overview

The Production & Inventory Management System provides comprehensive tools for managing production workflows, task assignments, quality control, inventory tracking, and purchase orders for the Premium Gift Box business.

## Features

### Production Management

#### 1. Production Dashboard
- **Real-time statistics**: Active orders, completed today, pending approval, quality issues
- **Stage distribution**: Visual breakdown of orders across production stages
- **Active orders tracking**: Priority-based order list with completion percentages
- **Quick actions**: Direct navigation to task management, quality control, materials, and reports

#### 2. Production Stages
- **Designing**: Initial design phase with customer approval
- **Approved**: Design approved, ready for production
- **Production**: Active manufacturing phase
- **Quality Control**: Quality inspection and testing
- **Completed**: Order finished and ready for delivery

#### 3. Task Management
- **Create tasks** linked to specific orders
- **Priority levels**: Low, Normal, High, Urgent
- **Task statuses**: Pending, In Progress, Completed, Cancelled
- **Task assignment** to team members
- **Due date tracking** with alerts
- **Task history** and completion tracking

#### 4. Quality Control
- **Default checklist** with 10 standard quality checks:
  1. Material quality inspection
  2. Dimensions accuracy check
  3. Color matching verification
  4. Structural integrity test
  5. Finishing quality review
  6. Assembly completeness check
  7. Branding/labeling accuracy
  8. Packaging condition inspection
  9. Final cleanliness check
  10. Documentation completeness
- **Custom checklist items** can be added per order
- **Item-specific notes** for failed or questionable checks
- **Overall status**: Passed, Needs Review, Failed
- **Quality check history** per order
- **Automatic order completion** when quality check passes

### Inventory Management

#### 1. Material Inventory
- **Material categories**: Cardboard, Fabric, Ribbon, Accessories, Packaging, Tools
- **Stock tracking**: Current stock, reorder level, unit cost
- **Stock status alerts**:
  - **Out of Stock**: Current stock = 0
  - **Low Stock**: Current stock ≤ reorder level
  - **In Stock**: Current stock > reorder level
- **Supplier management**: Track suppliers per material
- **Unit tracking**: Support for various units (pcs, meters, kg, etc.)
- **Total inventory value** calculation
- **Last restocked date** tracking

#### 2. Inventory Movements
- **Movement types**:
  - **Purchase**: Add stock (from supplier or purchase order)
  - **Usage**: Reduce stock (for production)
  - **Sale**: Reduce stock (direct sale)
  - **Waste**: Reduce stock (damaged/expired materials)
  - **Adjustment**: Set exact stock level (for corrections)
- **Automatic stock updates** based on movement type
- **Movement history** with filters by date, type, and item
- **Cost tracking** per movement
- **Order linkage** for production-related movements
- **User audit trail** (who created each movement)

#### 3. Purchase Orders
- **PO number generation**: PO-YYYY-XXXXXX format
- **Multi-item purchase orders**: Add multiple materials in one PO
- **PO statuses**: Pending, Ordered, Received, Cancelled
- **Expected delivery date** tracking
- **Automatic inventory updates** when PO is marked as received
- **Automatic movement records** created for received items
- **Total amount calculation** based on quantities and unit costs
- **Supplier tracking** per PO

#### 4. Inventory Statistics
- Total materials count
- Low stock items count
- Out of stock items count
- Total inventory value (IDR)
- Recent movements count (last 7 days)

## API Endpoints

### Production Endpoints

#### Get Production Statistics
```
GET /api/production/stats
```

**Response:**
```json
{
  "stats": {
    "active_orders": 15,
    "completed_today": 3,
    "pending_approval": 5,
    "quality_issues": 2,
    "stage_distribution": {
      "designing": 5,
      "production": 7,
      "quality_control": 3,
      "completed": 12
    }
  }
}
```

#### Get Active Production Orders
```
GET /api/production/active-orders
```

**Response:**
```json
{
  "orders": [
    {
      "id": "order-uuid",
      "order_number": "ORD-2024-001",
      "customer_name": "John Doe",
      "status": "production",
      "current_stage": "production",
      "estimated_completion": "2024-12-31",
      "priority": "high",
      "completion_percentage": 60,
      "created_at": "2024-01-15T00:00:00Z"
    }
  ]
}
```

#### Update Order Stage
```
PUT /api/production/orders/:orderId/stage
```

**Request Body:**
```json
{
  "stage": "quality_control",
  "notes": "Moving to quality control for final inspection"
}
```

#### Create Production Task
```
POST /api/production/tasks
```

**Request Body:**
```json
{
  "orderId": "order-uuid",
  "title": "Install ribbon decorations",
  "description": "Add premium satin ribbons to all boxes",
  "assignedTo": "user-uuid",
  "dueDate": "2024-12-25",
  "priority": "high"
}
```

#### Get Production Tasks
```
GET /api/production/tasks?orderId=order-uuid&status=pending&assignedTo=user-uuid
```

#### Update Task Status
```
PUT /api/production/tasks/:taskId/status
```

**Request Body:**
```json
{
  "status": "completed",
  "notes": "All ribbons installed successfully"
}
```

#### Create Quality Check
```
POST /api/production/quality-check
```

**Request Body:**
```json
{
  "orderId": "order-uuid",
  "checklistItems": [
    {
      "id": "1",
      "name": "Material quality inspection",
      "checked": true,
      "notes": "Premium cardboard in excellent condition"
    },
    {
      "id": "2",
      "name": "Dimensions accuracy check",
      "checked": false,
      "notes": "Width 2mm off specification, needs adjustment"
    }
  ],
  "overallStatus": "needs_review",
  "notes": "Minor dimensional issue detected, requires correction"
}
```

#### Get Quality Checks
```
GET /api/production/quality-checks/:orderId
```

#### Get Production Timeline
```
GET /api/production/orders/:orderId/timeline
```

**Response:**
```json
{
  "order": {
    "id": "order-uuid",
    "order_number": "ORD-2024-001",
    "status": "production",
    "created_at": "2024-01-15",
    "estimated_completion": "2024-12-31"
  },
  "timeline": {
    "stages": [...],
    "tasks": [...],
    "quality_checks": [...]
  }
}
```

### Inventory Endpoints

#### Get All Materials
```
GET /api/inventory/materials?category=cardboard&lowStock=true
```

#### Get Material by ID
```
GET /api/inventory/materials/:materialId
```

#### Create Material
```
POST /api/inventory/materials
```

**Request Body:**
```json
{
  "name": "Premium Cardboard 300gsm",
  "category": "cardboard",
  "supplier": "PT Karton Indonesia",
  "unitCost": 50000,
  "currentStock": 100,
  "reorderLevel": 20,
  "unit": "sheets",
  "notes": "High-quality cardboard for luxury boxes"
}
```

#### Update Material
```
PUT /api/inventory/materials/:materialId
```

#### Delete Material
```
DELETE /api/inventory/materials/:materialId
```

#### Record Inventory Movement
```
POST /api/inventory/movements
```

**Request Body:**
```json
{
  "type": "usage",
  "itemId": "material-uuid",
  "itemType": "material",
  "quantity": 10,
  "unitCost": 50000,
  "reason": "Production for Order ORD-2024-001",
  "orderId": "order-uuid",
  "notes": "Used for luxury gift box production"
}
```

#### Get Inventory Movements
```
GET /api/inventory/movements?itemId=material-uuid&type=usage&startDate=2024-01-01&endDate=2024-12-31
```

#### Get Inventory Statistics
```
GET /api/inventory/stats
```

**Response:**
```json
{
  "stats": {
    "total_materials": 45,
    "low_stock_items": 8,
    "out_of_stock_items": 2,
    "total_inventory_value": 15000000,
    "recent_movements": 23
  }
}
```

#### Get Low Stock Alerts
```
GET /api/inventory/alerts
```

**Response:**
```json
{
  "alerts": [
    {
      "id": "material-uuid",
      "name": "Premium Ribbon",
      "current_stock": 0,
      "reorder_level": 50,
      "unit": "meters",
      "category": "ribbon"
    }
  ]
}
```

#### Create Purchase Order
```
POST /api/inventory/purchase-orders
```

**Request Body:**
```json
{
  "supplier": "PT Material Supply",
  "items": [
    {
      "materialId": "material-uuid-1",
      "quantity": 100,
      "unitCost": 50000
    },
    {
      "materialId": "material-uuid-2",
      "quantity": 50,
      "unitCost": 30000
    }
  ],
  "expectedDelivery": "2024-12-31",
  "notes": "Urgent restock for upcoming orders"
}
```

**Response:**
```json
{
  "success": true,
  "poId": "po-uuid",
  "poNumber": "PO-2024-123456",
  "message": "Purchase order created successfully"
}
```

#### Get Purchase Orders
```
GET /api/inventory/purchase-orders?status=pending
```

#### Update Purchase Order Status
```
PUT /api/inventory/purchase-orders/:poId/status
```

**Request Body:**
```json
{
  "status": "received",
  "receivedDate": "2024-12-20"
}
```

**Note**: When status is set to "received", the system automatically:
1. Creates inventory movements for all items
2. Updates material stock levels
3. Updates last_restocked dates

## Database Schema

### Production Tasks Table
```sql
CREATE TABLE IF NOT EXISTS production_tasks (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    due_date DATE,
    completed_at DATETIME,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### Quality Checks Table
```sql
CREATE TABLE IF NOT EXISTS quality_checks (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    checklist_items TEXT NOT NULL, -- JSON array of checklist items
    overall_status TEXT DEFAULT 'pending' CHECK (overall_status IN ('pending', 'passed', 'failed', 'needs_review')),
    notes TEXT,
    checked_by TEXT NOT NULL,
    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (checked_by) REFERENCES users(id)
);
```

### Purchase Orders Table
```sql
CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    po_number TEXT UNIQUE NOT NULL,
    supplier TEXT NOT NULL,
    items TEXT NOT NULL, -- JSON array of purchase items
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'received', 'cancelled')),
    expected_delivery DATE,
    received_date DATE,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

## Mobile Screens

### 1. Production Dashboard
**Location:** `MobileApp/mobile/src/screens/Production/ProductionDashboard.tsx`

**Features:**
- Statistics cards: Active orders, completed today, pending approval, quality issues
- Stage distribution with progress bars
- Active orders list with priority and completion percentage
- Quick action buttons for navigation

### 2. Task Management Screen
**Location:** `MobileApp/mobile/src/screens/Production/TaskManagementScreen.tsx`

**Features:**
- Filter tasks by status
- Create new tasks with priority and due dates
- Update task status (Start, Complete, Cancel)
- View task details and assignments
- Color-coded priorities

### 3. Quality Control Screen
**Location:** `MobileApp/mobile/src/screens/Production/QualityControlScreen.tsx`

**Features:**
- Standard quality checklist (10 items)
- Add custom checklist items
- Item-specific notes for issues
- Completion percentage tracking
- Overall status selection (Passed/Needs Review/Failed)
- Quality check history per order
- Automatic status suggestion based on completion

### 4. Inventory Materials Screen
**Location:** `MobileApp/mobile/src/screens/Inventory/InventoryMaterialsScreen.tsx`

**Features:**
- Search and filter by category
- Stock status indicators (In Stock/Low Stock/Out of Stock)
- Current stock and reorder level display
- Total inventory value per item
- Create, edit, delete materials
- View movement history
- Color-coded stock alerts

## Usage Examples

### Production Workflow

1. **Order enters production**:
   - Order status changes from "approved" to "production"
   - Stage transition recorded in order_stages table

2. **Create production tasks**:
   ```javascript
   POST /api/production/tasks
   {
     "orderId": "order-123",
     "title": "Cut cardboard pieces",
     "priority": "high",
     "dueDate": "2024-12-25"
   }
   ```

3. **Workers update task status**:
   - Mark as "in_progress" when starting
   - Mark as "completed" when finished

4. **Move to quality control**:
   ```javascript
   PUT /api/production/orders/order-123/stage
   {
     "stage": "quality_control"
   }
   ```

5. **Perform quality check**:
   - Check all items in the checklist
   - Add notes for any issues
   - Select overall status
   - Submit quality check

6. **Order completion**:
   - If quality check passes, order automatically moves to "completed"
   - If quality check fails, order returns to "production" for corrections

### Inventory Management Workflow

1. **Add new material**:
   ```javascript
   POST /api/inventory/materials
   {
     "name": "Premium Satin Ribbon",
     "category": "ribbon",
     "supplier": "PT Ribbon Indonesia",
     "unitCost": 25000,
     "currentStock": 0,
     "reorderLevel": 100,
     "unit": "meters"
   }
   ```

2. **Create purchase order** for low stock items:
   ```javascript
   POST /api/inventory/purchase-orders
   {
     "supplier": "PT Ribbon Indonesia",
     "items": [
       {
         "materialId": "ribbon-uuid",
         "quantity": 500,
         "unitCost": 25000
       }
     ],
     "expectedDelivery": "2024-12-20"
   }
   ```

3. **Receive purchase order**:
   ```javascript
   PUT /api/inventory/purchase-orders/po-uuid/status
   {
     "status": "received",
     "receivedDate": "2024-12-18"
   }
   ```
   - System automatically creates inventory movement
   - Current stock updated: 0 + 500 = 500 meters
   - Last restocked date updated

4. **Use materials for production**:
   ```javascript
   POST /api/inventory/movements
   {
     "type": "usage",
     "itemId": "ribbon-uuid",
     "itemType": "material",
     "quantity": 50,
     "orderId": "order-123",
     "reason": "Production for Order ORD-2024-001"
   }
   ```
   - Current stock updated: 500 - 50 = 450 meters

5. **Monitor inventory alerts**:
   - Check `/api/inventory/alerts` for low stock items
   - Create purchase orders proactively

## Best Practices

### Production Management
1. **Stage transitions**: Always add notes when moving orders between stages
2. **Task assignment**: Assign tasks to specific team members for accountability
3. **Priority management**: Use "urgent" only for truly time-critical tasks
4. **Quality checks**: Perform quality checks before marking orders as completed
5. **Task due dates**: Set realistic due dates based on order deadlines

### Inventory Management
1. **Reorder levels**: Set reorder levels at 20-30% of typical monthly usage
2. **Regular audits**: Perform physical stock counts monthly and use "adjustment" movements
3. **Purchase order timing**: Place orders when stock reaches reorder level
4. **Supplier diversification**: Track multiple suppliers per material for reliability
5. **Cost tracking**: Update unit costs regularly to reflect current market prices
6. **Movement documentation**: Always add notes to movements for audit trail

### Quality Control
1. **Standard checklist**: Use the default checklist as a baseline for all orders
2. **Custom items**: Add order-specific checks for special requirements
3. **Detailed notes**: Document specific issues for failed or questionable items
4. **Review process**: Always set status to "needs_review" if any items fail
5. **History tracking**: Review previous quality checks before starting new ones

## Troubleshooting

### Production Issues

**Task not showing assigned to user**:
- Verify user ID is valid
- Check that user has appropriate role (not just any authenticated user)

**Order stuck in quality control**:
- Check quality_checks table for order
- Verify overall_status is set correctly
- Ensure quality check was submitted successfully

**Stage transitions not recording**:
- Verify order_stages table has correct foreign keys
- Check authentication token is valid
- Ensure created_by user ID exists

### Inventory Issues

**Stock not updating after movement**:
- Verify movement type is correct (purchase/usage/sale/waste/adjustment)
- Check that itemId matches existing material
- Ensure movement was successfully recorded in inventory_movements table

**Purchase order not updating stock**:
- Verify PO status was changed to "received"
- Check that items array in PO contains valid materialId values
- Review inventory_movements for automatic movement records

**Low stock alerts not showing**:
- Verify current_stock <= reorder_level in database
- Check reorder levels are set correctly (not 0)
- Ensure materials table has accurate stock data

## Future Enhancements

1. **Production Scheduling**: Gantt chart view of production timeline
2. **Barcode Scanning**: Quick material lookup and movement recording
3. **Mobile Photo Upload**: Attach quality check photos to orders
4. **Automated Reordering**: Automatic PO generation when stock hits reorder level
5. **Supplier Performance**: Track delivery times and quality from suppliers
6. **Waste Analytics**: Track and analyze material waste patterns
7. **Production Efficiency**: Time tracking and productivity metrics
8. **Predictive Inventory**: Machine learning for stock forecasting

## Support

For issues or questions regarding the production and inventory system, refer to the main project documentation or contact the development team.
