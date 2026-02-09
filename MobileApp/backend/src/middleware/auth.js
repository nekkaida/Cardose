// Authentication middleware plugin
const fp = require('fastify-plugin');

async function authPlugin(fastify, options) {
  // Authenticate decorator - verifies JWT token
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
  });

  // Role-based authorization decorator
  fastify.decorate('authorize', (roles) => {
    return async function (request, reply) {
      try {
        await request.jwtVerify();

        if (!roles.includes(request.user.role)) {
          return reply.status(403).send({ error: 'Insufficient permissions' });
        }
      } catch (err) {
        return reply.status(401).send({ error: 'Authentication required' });
      }
    };
  });
}

// Use fastify-plugin to skip encapsulation so decorators are available globally
module.exports = fp(authPlugin);
