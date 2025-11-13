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

// Database setup
const Database = require('./services/DatabaseService');
const db = new Database();

// Make database available in all routes
fastify.decorate('db', db);

// Register routes
fastify.register(require('./routes/auth'), { prefix: '/api/auth' });
fastify.register(require('./routes/orders'), { prefix: '/api/orders' });
fastify.register(require('./routes/customers'), { prefix: '/api/customers' });
fastify.register(require('./routes/inventory'), { prefix: '/api/inventory' });
fastify.register(require('./routes/financial'), { prefix: '/api/financial' });
fastify.register(require('./routes/analytics'), { prefix: '/api/analytics' });

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
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();