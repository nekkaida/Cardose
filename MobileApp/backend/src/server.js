const fastify = require('fastify')({ logger: true });
const path = require('path');

// Register security plugins
fastify.register(require('@fastify/helmet'));

fastify.register(require('@fastify/cors'), {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8081'],
  credentials: true
});

fastify.register(require('@fastify/rate-limit'), {
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (request) => request.ip,
  hook: 'onRequest'
});

// Stricter rate limit for auth endpoints (applied per-route below)
fastify.decorate('authRateLimit', {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: '1 minute'
    }
  }
});

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error('FATAL: JWT_SECRET environment variable is required. Server cannot start without it.');
  process.exit(1);
}
fastify.register(require('@fastify/jwt'), {
  secret: jwtSecret
});

fastify.register(require('@fastify/multipart'));

// Database setup
const Database = require('./services/DatabaseService');
const db = new Database();

// Make database available in all routes
fastify.decorate('db', db);

// Register authentication middleware globally
fastify.register(require('./middleware/auth'));

// Register routes
fastify.register(require('./routes/auth'), {
  prefix: '/api/auth',
  config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
});
fastify.register(require('./routes/files'), { prefix: '/api/files' });
fastify.register(require('./routes/orders'), { prefix: '/api/orders' });
fastify.register(require('./routes/customers'), { prefix: '/api/customers' });
fastify.register(require('./routes/inventory'), { prefix: '/api/inventory' });
fastify.register(require('./routes/financial'), { prefix: '/api/financial' });
fastify.register(require('./routes/production'), { prefix: '/api/production' });
fastify.register(require('./routes/analytics'), { prefix: '/api/analytics' });
fastify.register(require('./routes/communication'), { prefix: '/api/communication' });
fastify.register(require('./routes/backup'), { prefix: '/api/backup' });
fastify.register(require('./routes/sync'), { prefix: '/api/sync' });
fastify.register(require('./routes/templates'), { prefix: '/api/templates' });
fastify.register(require('./routes/notifications'), { prefix: '/api/notifications' });
fastify.register(require('./routes/reports'), { prefix: '/api/reports' });
fastify.register(require('./routes/settings'), { prefix: '/api/settings' });
fastify.register(require('./routes/audit'), { prefix: '/api/audit' });
fastify.register(require('./routes/dashboard'), { prefix: '/api/dashboard' });
fastify.register(require('./routes/search'), { prefix: '/api/search' });
fastify.register(require('./routes/webhooks'), { prefix: '/api/webhooks' });
fastify.register(require('./routes/invoices'), { prefix: '/api/invoices' });
fastify.register(require('./routes/users'), { prefix: '/api/users' });
fastify.register(require('./routes/quality-checks'), { prefix: '/api/quality-checks' });
fastify.register(require('./routes/purchase-orders'), { prefix: '/api/purchase-orders' });
fastify.register(require('./routes/audit-logs'), { prefix: '/api/audit-logs' });

// Backup service setup
const BackupService = require('./services/BackupService');
const backupService = new BackupService();

// Notification service setup
const NotificationService = require('./services/NotificationService');
const notificationService = new NotificationService(db);

// Health check endpoint
fastify.get('/api/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Start server
const start = async () => {
  try {
    // Initialize database
    await db.initialize();
    
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    console.log(`🚀 Premium Gift Box Server running on http://${host}:${port}`);
    console.log(`📱 Mobile app can connect to: http://192.168.1.x:${port}`);

    // Start automatic backup if enabled
    if (process.env.AUTO_BACKUP === 'true') {
      const backupFrequency = parseInt(process.env.BACKUP_FREQUENCY || '4');
      backupService.startAutoBackup(backupFrequency);
    }

    // Start automated notifications if enabled
    if (process.env.ENABLE_NOTIFICATIONS !== 'false') {
      notificationService.startAutomatedChecks();
    }
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

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

start();