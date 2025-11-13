// Authentication routes for Premium Gift Box backend
const bcrypt = require('bcryptjs');
const jwt = require('@fastify/jwt');

async function authRoutes(fastify, options) {
  // Register route
  fastify.post('/register', async (request, reply) => {
    try {
      const { username, password, email } = request.body;
      
      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // For now, just return success (database integration would be here)
      return { 
        success: true, 
        message: 'User registered successfully',
        user: { username, email }
      };
    } catch (error) {
      reply.status(500).send({ error: 'Registration failed' });
    }
  });

  // Login route
  fastify.post('/login', async (request, reply) => {
    try {
      const { username, password } = request.body;
      
      // For demo purposes, accept any login
      if (username && password) {
        const token = fastify.jwt.sign({ 
          username, 
          id: 'demo_user_1',
          role: 'admin'
        });
        
        return { 
          success: true, 
          token,
          user: { username, role: 'admin' }
        };
      }
      
      reply.status(401).send({ error: 'Invalid credentials' });
    } catch (error) {
      reply.status(500).send({ error: 'Login failed' });
    }
  });

  // Add authenticate decorator
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Authentication required' });
    }
  });

  // Protected route example
  fastify.get('/profile', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    return { user: request.user };
  });
}

module.exports = authRoutes;