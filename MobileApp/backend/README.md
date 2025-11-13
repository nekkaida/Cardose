# Cardose Backend Server

> Self-hosted Node.js + Fastify + SQLite backend for business management

## 🎯 Overview

The backend server provides RESTful API endpoints for the Cardose business management system. Built with **Fastify** for high performance and **SQLite** for zero-configuration database management.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Initialize database
npm run init-db

# Start development server
npm run dev

# Start production server
npm start
```

Server will run on: `http://localhost:3000`

## 📁 Project Structure

```
backend/
├── src/
│   ├── server.js              # Main server file
│   ├── routes/                # API routes
│   │   ├── auth.js            # Authentication
│   │   ├── orders.js          # Order management
│   │   ├── customers.js       # Customer CRM
│   │   ├── inventory.js       # Inventory control
│   │   ├── financial.js       # Financial tracking
│   │   └── analytics.js       # Analytics
│   ├── services/              # Business logic
│   │   └── DatabaseService.js
│   ├── database/              # Database files
│   │   ├── init.js            # DB initialization
│   │   ├── schema.sql         # DB schema
│   │   └── premium_gift_box.db # SQLite database
│   └── data/                  # Sample/seed data
└── package.json
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Orders
- `GET /api/orders` - List all orders
- `GET /api/orders/:id` - Get order details
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

### Customers
- `GET /api/customers` - List customers
- `GET /api/customers/:id` - Get customer details
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer

### Inventory
- `GET /api/inventory` - List inventory items
- `POST /api/inventory` - Add inventory item
- `PUT /api/inventory/:id` - Update stock levels

### Financial
- `GET /api/financial/transactions` - List transactions
- `POST /api/financial/transactions` - Record transaction
- `GET /api/financial/summary` - Financial summary

### Analytics
- `GET /api/analytics/dashboard` - Dashboard metrics
- `GET /api/analytics/revenue` - Revenue analytics
- `GET /api/analytics/customers` - Customer analytics

### Health Check
- `GET /api/health` - Server health status

## 🗄 Database

### Technology
- **SQLite 3** - File-based, zero-configuration
- **Location**: `src/database/premium_gift_box.db`
- **Backup**: Automatic daily backups

### Schema
- `users` - User accounts
- `orders` - Order records
- `customers` - Customer information
- `inventory` - Stock management
- `transactions` - Financial transactions
- `communications` - Communication logs

### Management Commands

```bash
# Initialize fresh database
npm run init-db

# Run migrations
npm run migrate

# Seed with sample data
npm run seed

# Backup database
npm run backup

# Sync to backup location
npm run sync
```

## ⚙️ Configuration

### Environment Variables

Create `.env` file (optional):

```env
PORT=3000
HOST=0.0.0.0
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

### Default Configuration
- **Port**: 3000
- **Host**: 0.0.0.0 (accessible on local network)
- **CORS**: Enabled for development
- **JWT Secret**: Auto-generated (change for production)

## 🔐 Security

- **JWT Authentication**: Token-based auth
- **Role-Based Access**: Owner, Manager, Employee roles
- **Data Validation**: Joi schema validation
- **SQL Injection Protection**: Parameterized queries
- **Password Hashing**: bcryptjs

## 📊 Performance

- **Framework**: Fastify (fastest Node.js framework)
- **Throughput**: 10,000+ requests/second
- **Database**: Indexed queries for fast lookups
- **Response Time**: <50ms for most endpoints

## 🛠 Development

### Available Scripts

```bash
npm start         # Production server
npm run dev       # Development with auto-reload
npm run lint      # Code linting
npm run test      # Run tests (if available)
```

### Adding New Endpoints

1. Create route file in `src/routes/`
2. Define route handler
3. Register in `src/server.js`
4. Add validation schema

Example:
```javascript
// src/routes/example.js
module.exports = async function (fastify, opts) {
  fastify.get('/api/example', async (request, reply) => {
    return { message: 'Hello World' };
  });
};

// src/server.js
fastify.register(require('./routes/example'));
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000
```

### Database Locked
```bash
# Close all connections and restart
rm src/database/premium_gift_box.db-journal
npm run init-db
```

### CORS Issues
Check `src/server.js` CORS configuration:
```javascript
fastify.register(require('@fastify/cors'), {
  origin: true // Allow all origins
});
```

## 📚 Dependencies

### Core
- **fastify**: Web framework
- **sqlite3**: Database driver
- **@fastify/jwt**: JWT authentication
- **@fastify/cors**: CORS support
- **@fastify/multipart**: File uploads

### Utilities
- **bcryptjs**: Password hashing
- **uuid**: Unique ID generation
- **joi**: Data validation
- **date-fns**: Date manipulation

## 🚀 Deployment

### Local Network Access

Server runs on `0.0.0.0:3000`, accessible via:
- Local: `http://localhost:3000`
- Network: `http://192.168.1.x:3000`

Find your IP:
```bash
# Windows
ipconfig

# Linux/Mac
ifconfig
```

### Production Deployment

1. Set environment variables
2. Use process manager (PM2)
3. Set up reverse proxy (nginx)
4. Enable HTTPS

```bash
# Using PM2
npm install -g pm2
pm2 start src/server.js --name cardose-backend
pm2 save
pm2 startup
```

## 📈 Monitoring

### Health Check
```bash
curl http://localhost:3000/api/health
```

### Logs
Fastify logger outputs to console. In production, pipe to file:
```bash
npm start > logs/server.log 2>&1
```

## 🔄 Backup Strategy

### Automatic Backups
- **Frequency**: Daily at 2 AM
- **Location**: `src/database/backups/`
- **Retention**: 30 days

### Manual Backup
```bash
npm run backup
```

### Sync to Backup Computer
```bash
npm run sync
```

## 📞 Support

For backend-specific issues:
1. Check server logs
2. Verify database integrity
3. Test endpoints with curl/Postman
4. Review API documentation

---

**Backend Server Ready! 🚀**
