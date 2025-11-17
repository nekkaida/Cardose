# Premium Gift Box API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token
- `GET /auth/me` - Get current user info
- `PUT /auth/profile` - Update user profile
- `PUT /auth/password` - Change password

### Customers
- `GET /customers` - List all customers
- `POST /customers` - Create new customer
- `GET /customers/:id` - Get customer by ID
- `PUT /customers/:id` - Update customer
- `DELETE /customers/:id` - Delete customer

### Orders
- `GET /orders` - List all orders
- `POST /orders` - Create new order
- `GET /orders/:id` - Get order by ID
- `PUT /orders/:id` - Update order
- `DELETE /orders/:id` - Delete order
- `PUT /orders/:id/status` - Update order status

### Invoices (Financial)
- `GET /financial/invoices` - List all invoices
- `POST /financial/invoices` - Create new invoice
- `GET /financial/invoices/:id` - Get invoice by ID
- `PUT /financial/invoices/:id` - Update invoice
- `GET /financial/invoices/:id/pdf` - Download invoice as PDF
- `GET /financial/invoices/:id/excel` - Download invoice as Excel
- `GET /financial/reports/pdf` - Generate financial report PDF
- `GET /financial/reports/excel` - Generate financial report Excel

### Inventory
- `GET /inventory/materials` - List all materials
- `POST /inventory/materials` - Add new material
- `GET /inventory/materials/:id` - Get material by ID
- `PUT /inventory/materials/:id` - Update material
- `DELETE /inventory/materials/:id` - Delete material
- `POST /inventory/materials/:id/adjust` - Adjust stock level

### Production
- `GET /production/tasks` - List production tasks
- `POST /production/tasks` - Create production task
- `PUT /production/tasks/:id` - Update task
- `GET /production/quality-checks` - List quality checks
- `POST /production/quality-checks` - Create quality check

### Files
- `POST /files/upload` - Upload file
- `GET /files` - List uploaded files
- `GET /files/:id` - Download file
- `DELETE /files/:id` - Delete file

### Analytics
- `GET /analytics/dashboard` - Get dashboard analytics
- `GET /analytics/revenue-trend` - Get revenue trend
- `GET /analytics/customers` - Get customer analytics
- `GET /analytics/products` - Get product analytics
- `GET /analytics/production-performance` - Get production metrics
- `GET /analytics/inventory-analytics` - Get inventory analytics

### Communication
- `POST /communication/whatsapp/send` - Send WhatsApp message
- `POST /communication/whatsapp/notify/order` - Send order notification via WhatsApp
- `POST /communication/whatsapp/notify/invoice` - Send invoice notification via WhatsApp
- `POST /communication/email/send` - Send email
- `POST /communication/email/notify/order` - Send order confirmation email
- `POST /communication/email/notify/invoice` - Send invoice email
- `GET /communication/logs` - Get communication logs

### Templates
- `GET /templates` - List message templates
- `POST /templates` - Create template
- `GET /templates/:id` - Get template by ID
- `PUT /templates/:id` - Update template
- `DELETE /templates/:id` - Delete template
- `POST /templates/:id/render` - Render template with data
- `POST /templates/initialize-defaults` - Initialize default templates

### Backup & Sync
- `POST /backup/create` - Create manual backup
- `GET /backup/list` - List all backups
- `GET /backup/stats` - Get backup statistics
- `GET /backup/download/:filename` - Download backup file
- `POST /backup/restore` - Restore from backup
- `POST /sync/register-device` - Register device for sync
- `GET /sync/devices` - Get registered devices
- `POST /sync/full-sync` - Perform full synchronization

### Notifications
- `POST /notifications/check/overdue-invoices` - Check overdue invoices
- `POST /notifications/check/low-stock` - Check low stock items
- `POST /notifications/send/daily-digest` - Send daily digest

### Reports
- `GET /reports/customers` - Generate customer report
- `GET /reports/sales` - Generate sales report
- `GET /reports/products` - Generate product report
- `GET /reports/inventory` - Generate inventory report
- `GET /reports/production` - Generate production report
- `GET /reports/financial` - Generate financial report
- `GET /reports/comprehensive` - Generate comprehensive report

### Dashboard
- `GET /dashboard` - Get comprehensive dashboard data
- `GET /dashboard/sales-trend` - Get sales trend
- `GET /dashboard/product-mix` - Get product mix data

### Search
- `GET /search?query=<term>` - Global search
- `POST /search/orders` - Advanced order search

### Settings
- `GET /settings` - Get all settings
- `GET /settings/:key` - Get specific setting
- `PUT /settings/:key` - Update setting
- `POST /settings/batch` - Batch update settings

### Audit
- `GET /audit/logs` - Get audit logs
- `GET /audit/stats` - Get audit statistics
- `GET /audit/export` - Export audit logs
- `POST /audit/log` - Log custom action

### Webhooks
- `POST /webhooks` - Register webhook
- `GET /webhooks` - List webhooks
- `PUT /webhooks/:id` - Update webhook
- `DELETE /webhooks/:id` - Delete webhook
- `POST /webhooks/:id/test` - Test webhook
- `GET /webhooks/:id/logs` - Get webhook delivery logs

## Query Parameters

### Pagination
- `limit` - Number of items per page (default: 50)
- `offset` - Number of items to skip (default: 0)

### Date Filters
- `startDate` - Start date (YYYY-MM-DD)
- `endDate` - End date (YYYY-MM-DD)
- `period` - Time period (week, month, quarter, year)

### Status Filters
- `status` - Filter by status
- `boxType` - Filter by box type
- `customerId` - Filter by customer ID

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": "Detailed error description"
}
```

## Webhook Events

Available webhook events:
- `order.created` - New order created
- `order.updated` - Order status updated
- `invoice.created` - New invoice created
- `invoice.paid` - Invoice marked as paid
- `customer.created` - New customer added
- `inventory.low_stock` - Material stock is low
- `*` - All events

## Rate Limits

No rate limits currently enforced for self-hosted deployment.

## Indonesian Business Features

- Currency: IDR (Indonesian Rupiah)
- Tax: PPN 11%
- Date format: Indonesian locale (id-ID)
- Invoice numbering: INV-YYYY-XXXXXX
- NPWP (tax ID) support

## Environment Variables

```bash
PORT=3000
JWT_SECRET=your-secret-key
DATABASE_PATH=./data/premiumgiftbox.db

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=your_id
WHATSAPP_ACCESS_TOKEN=your_token

# Email/SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password

# Backup
AUTO_BACKUP=true
BACKUP_FREQUENCY=4
```
