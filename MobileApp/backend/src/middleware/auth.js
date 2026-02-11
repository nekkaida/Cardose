// Authentication middleware plugin
const fp = require('fastify-plugin');

async function authPlugin(fastify, options) {
  // Authenticate decorator - verifies JWT token
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      if (err.code === 'FAST_JWT_EXPIRED') {
        return reply.status(401).send({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      return reply.status(401).send({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
    }
  });

  // Role-based authorization decorator
  fastify.decorate('authorize', (roles) => {
    return async function (request, reply) {
      try {
        await request.jwtVerify();

        if (!roles.includes(request.user.role)) {
          return reply.status(403).send({ error: 'Insufficient permissions', code: 'FORBIDDEN' });
        }
      } catch (err) {
        if (err.code === 'FAST_JWT_EXPIRED') {
          return reply.status(401).send({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
        }
        return reply.status(401).send({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
      }
    };
  });
}

// Use fastify-plugin to skip encapsulation so decorators are available globally
module.exports = fp(authPlugin);
