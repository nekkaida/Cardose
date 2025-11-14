const fastify = require('fastify')({ logger: true });
const path = require('path');

// Register plugins
fastify.register(require('@fastify/cors'), {
  origin: true // Allow all origins for local development
});

fastify.register(require('@fastify/jwt'), {
  secret: process.env.JWT_SECRET || 'premium-gift-box-secret-key-change-in-production'
});

fastify.register(require('@fastify/multipart'));

// Register static file serving
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '../uploads'),
  prefix: '/uploads/',
});

// Database setup
const Database = require('./services/DatabaseService');
const db = new Database();

// Make database available in all routes
fastify.decorate('db', db);

// Register authentication decorators globally
const { authenticateDecorator } = require('./routes/auth');
fastify.register(authenticateDecorator);

// Register routes
fastify.register(require('./routes/auth'), { prefix: '/api/auth' });
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

start();