# Financial Management System Documentation

## Overview

The Financial Management System provides comprehensive tools for managing invoices, pricing calculations, budget tracking, and tax reporting for the Premium Gift Box business. This system is designed specifically for Indonesian businesses with built-in PPN (Pajak Pertambahan Nilai) tax automation at 11%.

## Features

### 1. Invoice Management
- **Create and manage invoices** with automatic numbering (INV-YYYY-XXXXXX format)
- **Track invoice status**: unpaid, paid, overdue, cancelled
- **Automatic PPN calculation** at 11% rate
- **Discount support** with automatic recalculation
- **Customer linking** to associate invoices with customers
- **Order linking** to associate invoices with specific orders
- **Payment tracking** with payment method and date recording
- **Automatic transaction creation** when invoices are marked as paid

### 2. Pricing Calculator
- **Material cost calculation** with unlimited materials support
- **Labor cost calculation** at IDR 50,000/hour
- **Overhead cost calculation** as percentage of materials + labor
- **Markup configuration** for profit margin
- **Discount support** applied before tax
- **Automatic PPN calculation** at 11%
- **Profit analysis** with profit margin percentage
- **Cost breakdown** showing percentage distribution

### 3. Budget Tracking
- **Create budgets** by category (materials, labor, marketing, etc.)
- **Period-based budgets**: monthly, quarterly, yearly
- **Actual spending tracking** from financial transactions
- **Variance analysis** showing budget vs actual
- **Status indicators**: good (< 90%), warning (90-100%), over (> 100%)
- **Visual progress bars** for quick budget health assessment

### 4. Tax Reporting
- **PPN collection tracking** from invoices
- **PPN payment tracking** from expenses
- **Net PPN payable calculation** (collected - paid)
- **Period-based reports** (daily, weekly, monthly, quarterly, yearly)
- **Income and expense summaries** for tax filing

## API Endpoints

### Invoice Endpoints

#### Create Invoice
```
POST /api/financial/invoices
```

**Request Body:**
```json
{
  "orderId": "order-uuid",
  "dueDate": "2024-12-31",
  "discountAmount": 100000,
  "notes": "Special discount for VIP customer"
}
```

**Response:**
```json
{
  "success": true,
  "invoice": {
    "id": "invoice-uuid",
    "invoice_number": "INV-2024-123456",
    "subtotal": 1000000,
    "discount": 100000,
    "ppn_rate": 11,
    "ppn_amount": 99000,
    "total_amount": 999000,
    "status": "unpaid",
    "issue_date": "2024-01-15",
    "due_date": "2024-12-31"
  }
}
```

#### Get Invoice
```
GET /api/financial/invoices/:invoiceId
```

**Response:**
```json
{
  "invoice": {
    "id": "invoice-uuid",
    "invoice_number": "INV-2024-123456",
    "customer_name": "John Doe",
    "order_number": "ORD-2024-001",
    "subtotal": 1000000,
    "discount": 100000,
    "ppn_rate": 11,
    "ppn_amount": 99000,
    "total_amount": 999000,
    "status": "unpaid",
    "issue_date": "2024-01-15",
    "due_date": "2024-12-31",
    "notes": "Special discount for VIP customer"
  }
}
```

#### List Invoices
```
GET /api/financial/invoices?status=unpaid&customerId=customer-uuid&startDate=2024-01-01&endDate=2024-12-31
```

**Response:**
```json
{
  "invoices": [
    {
      "id": "invoice-uuid",
      "invoice_number": "INV-2024-123456",
      "customer_name": "John Doe",
      "total_amount": 999000,
      "status": "unpaid",
      "issue_date": "2024-01-15",
      "due_date": "2024-12-31"
    }
  ],
  "total": 1
}
```

#### Update Invoice Status
```
PUT /api/financial/invoices/:invoiceId/status
```

**Request Body:**
```json
{
  "status": "paid",
  "paidDate": "2024-01-20",
  "paymentMethod": "bank_transfer"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Invoice status updated",
  "transaction_created": true
}
```

### Pricing Calculator Endpoint

#### Calculate Pricing
```
POST /api/financial/calculate-pricing
```

**Request Body:**
```json
{
  "materials": [
    {
      "name": "Premium Cardboard",
      "quantity": 10,
      "unitCost": 50000
    },
    {
      "name": "Ribbon",
      "quantity": 5,
      "unitCost": 20000
    }
  ],
  "laborHours": 8,
  "overheadPercentage": 10,
  "markupPercentage": 50,
  "discountAmount": 50000
}
```

**Response:**
```json
{
  "pricing": {
    "breakdown": {
      "materialCost": 600000,
      "laborCost": 400000,
      "overheadCost": 100000,
      "subtotal": 1100000,
      "markupAmount": 550000,
      "discountAmount": 50000,
      "afterDiscount": 1600000,
      "ppnAmount": 176000,
      "finalPrice": 1776000
    },
    "profitAnalysis": {
      "profit": 500000,
      "profitMargin": 31.25,
      "costBreakdown": {
        "materials": 54.55,
        "labor": 36.36,
        "overhead": 9.09
      }
    }
  }
}
```

### Budget Endpoints

#### Create Budget
```
POST /api/financial/budgets
```

**Request Body:**
```json
{
  "category": "marketing",
  "amount": 5000000,
  "period": "monthly",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "notes": "Social media advertising budget"
}
```

**Response:**
```json
{
  "success": true,
  "budget": {
    "id": "budget-uuid",
    "category": "marketing",
    "amount": 5000000,
    "period": "monthly",
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "notes": "Social media advertising budget"
  }
}
```

#### Get Budget with Actual Spending
```
GET /api/financial/budgets/:budgetId
```

**Response:**
```json
{
  "budget": {
    "id": "budget-uuid",
    "category": "marketing",
    "amount": 5000000,
    "period": "monthly",
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "actualSpending": 4500000,
    "variance": 500000,
    "percentageUsed": 90,
    "status": "warning"
  }
}
```

#### List All Budgets
```
GET /api/financial/budgets
```

**Response:**
```json
{
  "budgets": [
    {
      "id": "budget-uuid",
      "category": "marketing",
      "amount": 5000000,
      "period": "monthly",
      "actualSpending": 4500000,
      "variance": 500000,
      "percentageUsed": 90,
      "status": "warning"
    }
  ]
}
```

### Tax Report Endpoint

#### Get Tax Report
```
GET /api/financial/tax-report?startDate=2024-01-01&endDate=2024-12-31
```

**Alternative query parameters:**
```
GET /api/financial/tax-report?month=1&year=2024
GET /api/financial/tax-report?quarter=1&year=2024
```

**Response:**
```json
{
  "period": {
    "start": "2024-01-01",
    "end": "2024-12-31"
  },
  "ppn": {
    "rate": 11,
    "collected": 17600000,
    "paid": 2200000,
    "netPayable": 15400000,
    "baseAmount": 160000000
  },
  "invoices": {
    "count": 45,
    "totalAmount": 160000000
  },
  "summary": {
    "totalIncome": 160000000,
    "totalExpenses": 20000000,
    "netIncome": 140000000
  }
}
```

## Mobile Screens

### 1. Invoice List Screen

**Location:** `MobileApp/mobile/src/screens/Financial/InvoiceListScreen.tsx`

**Features:**
- Search invoices by invoice number or customer name
- Filter by status (all, unpaid, paid, overdue, cancelled)
- Pull-to-refresh for latest data
- Status-based color coding
- Navigate to invoice details
- FAB button to create new invoice

### 2. Pricing Calculator Screen

**Location:** `MobileApp/mobile/src/screens/Financial/PricingCalculatorScreen.tsx`

**Features:**
- Add/remove materials dynamically
- Labor hours input with IDR 50,000/hour rate
- Overhead percentage configuration
- Markup percentage configuration
- Discount amount input
- Real-time calculation display
- Profit analysis with margin percentage
- Cost breakdown pie chart
- Reset form functionality

### 3. Budget Tracker Screen

**Location:** `MobileApp/mobile/src/screens/Financial/BudgetTrackerScreen.tsx`

**Features:**
- Create budgets by category and period
- Visual progress bars showing budget utilization
- Status indicators (good/warning/over)
- Actual spending vs budget variance
- Edit and delete budgets
- Period selection (monthly/quarterly/yearly)
- Pull-to-refresh for latest data

## Database Schema

### Invoices Table
```sql
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    order_id TEXT,
    customer_id TEXT NOT NULL,
    subtotal REAL NOT NULL,
    discount REAL DEFAULT 0,
    ppn_rate REAL NOT NULL,
    ppn_amount REAL NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue', 'cancelled')),
    issue_date DATE NOT NULL,
    due_date DATE,
    paid_date DATE,
    payment_method TEXT,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### Budgets Table
```sql
CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    period TEXT NOT NULL CHECK (period IN ('monthly', 'quarterly', 'yearly')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

## Usage Examples

### Creating an Invoice from an Order

1. **Navigate to Order Details**
2. **Click "Generate Invoice"**
3. **System automatically:**
   - Retrieves order total price
   - Gets customer information
   - Calculates PPN at 11%
   - Generates unique invoice number
   - Creates invoice record

### Using the Pricing Calculator

1. **Navigate to Financial > Pricing Calculator**
2. **Add Materials:**
   - Click "Add Material" for each material
   - Enter material name, quantity, and unit cost
3. **Enter Labor Hours:**
   - Input estimated labor hours
   - System calculates at IDR 50,000/hour
4. **Configure Overhead:**
   - Set overhead percentage (default 10%)
5. **Set Markup:**
   - Set desired markup percentage (default 50%)
6. **Apply Discount (optional):**
   - Enter discount amount if applicable
7. **Click "Calculate"**
8. **Review Results:**
   - Final price with PPN
   - Profit margin analysis
   - Cost breakdown percentages

### Budget Tracking Workflow

1. **Create Budget:**
   - Navigate to Financial > Budget Tracker
   - Click "New Budget"
   - Select category (materials, labor, marketing, etc.)
   - Enter budget amount
   - Select period (monthly/quarterly/yearly)
   - Set start and end dates
2. **System Automatically:**
   - Tracks actual spending from financial transactions
   - Calculates variance (budget - actual)
   - Shows percentage used
   - Updates status indicator
3. **Monitor Budget Health:**
   - Green (good): < 90% used
   - Orange (warning): 90-100% used
   - Red (over): > 100% used

## Tax Compliance (PPN)

### PPN Rate
- **Fixed at 11%** as per Indonesian tax regulations
- Automatically applied to all pricing calculations
- Tracked separately in invoice records

### Tax Reporting
- **Monthly/Quarterly Reports:** Generate tax reports for filing
- **PPN Collected:** Sum of all PPN amounts from invoices
- **PPN Paid:** Sum of all PPN amounts from expense transactions
- **Net PPN Payable:** Difference between collected and paid

### Tax Filing Requirements
1. Generate monthly/quarterly tax report
2. Verify PPN collected and paid amounts
3. Calculate net PPN payable
4. Submit to tax authority with proper documentation

## Security & Authentication

All financial endpoints require authentication:
```
Authorization: Bearer <jwt-token>
```

### Permission Requirements
- **Create/Update Invoices:** owner, manager, employee
- **Create/Update Budgets:** owner, manager
- **View Financial Reports:** owner, manager, employee
- **Delete Records:** owner, manager only

## Best Practices

### Invoice Management
1. Always link invoices to orders when possible
2. Set realistic due dates (typically 30 days from issue)
3. Mark invoices as paid promptly with payment method
4. Add notes for special terms or conditions
5. Review overdue invoices weekly

### Pricing Strategy
1. Regularly update material costs
2. Review labor rate quarterly
3. Adjust overhead based on actual costs
4. Set competitive markup percentages
5. Use discounts strategically for customer retention

### Budget Planning
1. Create budgets at the start of each period
2. Review budget variance weekly
3. Adjust spending when approaching warning threshold
4. Plan for seasonal variations
5. Track budget effectiveness over time

## Troubleshooting

### Invoice Total Doesn't Match
- Verify discount amount is correct
- Check PPN calculation (11% of subtotal minus discount)
- Ensure order total_price is set correctly

### Budget Variance Incorrect
- Verify transaction dates fall within budget period
- Check transaction category matches budget category
- Ensure financial_transactions table is up to date

### Pricing Calculator Shows Wrong Results
- Verify material quantities and unit costs
- Check labor hours input
- Confirm overhead and markup percentages
- Ensure discount amount is reasonable

## Future Enhancements

1. **PDF Invoice Generation:** Generate printable PDF invoices
2. **Email Integration:** Send invoices directly to customers
3. **Payment Gateway Integration:** Accept online payments
4. **Multi-currency Support:** Support currencies beyond IDR
5. **Advanced Analytics:** Cash flow forecasting, trend analysis
6. **Budget Alerts:** Notifications when approaching budget limits
7. **Recurring Invoices:** Automatic invoice generation for subscriptions

## Support

For issues or questions regarding the financial management system, please contact the development team or refer to the main project documentation.
