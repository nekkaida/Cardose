const env = require('./config/env');
const Sentry = require('@sentry/node');

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    enabled: env.NODE_ENV === 'production',
    tracesSampleRate: 0.1,
  });
}

const fastify = require('fastify')({ logger: true });
const path = require('path');

// Register security plugins
fastify.register(require('@fastify/helmet'));

fastify.register(require('@fastify/cors'), {
  origin: env.CORS_ORIGIN
    ? env.CORS_ORIGIN.split(',')
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8081'],
  credentials: true,
});

fastify.register(require('@fastify/rate-limit'), {
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (request) => request.ip,
  hook: 'onRequest',
});

// Stricter rate limit for auth endpoints (applied per-route below)
fastify.decorate('authRateLimit', {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: '1 minute',
    },
  },
});

fastify.register(require('@fastify/jwt'), {
  secret: env.JWT_SECRET,
});

fastify.register(require('@fastify/multipart'));

// Database setup
const Database = require('./services/DatabaseService');
const db = new Database(fastify.log);

// Make database available in all routes
fastify.decorate('db', db);

// Sentry error handler — only reports 5xx to Sentry, preserves Fastify's
// default validation error format (statusCode + message) for 4xx errors.
fastify.setErrorHandler((error, request, reply) => {
  const statusCode = error.statusCode || 500;

  // Only report unexpected server errors to Sentry (not validation/auth errors)
  if (statusCode >= 500 && env.SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: { url: request.url, method: request.method },
    });
  }

  // Let Fastify's default format through for validation errors (4xx)
  if (error.validation) {
    reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: error.message,
    });
    return;
  }

  fastify.log.error(error);
  reply.status(statusCode).send({
    statusCode,
    error:
      statusCode >= 500 && env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message,
    message: error.message,
  });
});

// Ensure revoked_tokens table exists (migration for existing databases)
fastify.addHook('onReady', async () => {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS revoked_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_jti TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      revoked_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_revoked_tokens_jti ON revoked_tokens(token_jti);
  `);
});

// Swagger API documentation (development only)
if (env.NODE_ENV !== 'production') {
  fastify.register(require('@fastify/swagger'), {
    openapi: {
      info: {
        title: 'Cardose API',
        description: 'Premium Gift Box Business Management API',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  });
  fastify.register(require('@fastify/swagger-ui'), {
    routePrefix: '/docs',
  });
}

// Register authentication middleware globally
fastify.register(require('./middleware/auth'));

// Register routes
fastify.register(require('./routes/auth'), {
  prefix: '/api/auth',
  config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
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
fastify.register(require('./routes/config'), { prefix: '/api/config' });

// Log Swagger docs URL after routes are registered
if (env.NODE_ENV !== 'production') {
  fastify.addHook('onReady', async () => {
    fastify.log.info('API documentation available at http://%s:%s/docs', env.HOST, env.PORT);
  });
}

// Backup service setup (logger injected after fastify is ready)
const BackupService = require('./services/BackupService');
const backupService = new BackupService(undefined, fastify.log);

// Notification service setup (logger injected after fastify is ready)
const NotificationService = require('./services/NotificationService');
const notificationService = new NotificationService(db, fastify.log);

// Health check endpoint
fastify.get('/api/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Start server
const start = async () => {
  try {
    // Initialize database
    await db.initialize();

    await fastify.listen({ port: env.PORT, host: env.HOST });
    fastify.log.info('Premium Gift Box Server running on http://%s:%s', env.HOST, env.PORT);

    // Warn about missing optional service credentials
    const EmailService = require('./services/EmailService');
    const emailCheck = new EmailService();
    if (emailCheck.configWarning) {
      fastify.log.warn(emailCheck.configWarning);
    }
    if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN) {
      fastify.log.warn(
        'WhatsApp credentials not set (WHATSAPP_PHONE_NUMBER_ID/WHATSAPP_ACCESS_TOKEN) - WhatsApp features disabled'
      );
    }

    // Start automatic backup if enabled
    if (env.AUTO_BACKUP) {
      backupService.startAutoBackup(env.BACKUP_FREQUENCY);
    }

    // Start automated notifications if enabled
    if (env.ENABLE_NOTIFICATIONS) {
      notificationService.startAutomatedChecks();
    }
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  fastify.log.info('Shutting down gracefully...');
  try {
    await fastify.close();
    db.close();
    fastify.log.info('Server closed.');
    process.exit(0);
  } catch (err) {
    fastify.log.error(err, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
