// Authentication middleware plugin
const fp = require('fastify-plugin');

async function authPlugin(fastify, options) {
  // Authenticate decorator - verifies JWT token
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();

      // Check if token has been revoked (logout blacklist)
      // Only check if jti exists - old tokens issued before jti was added won't have it
      const db = fastify.db;
      if (request.user.jti) {
        const revoked = db.db.prepare('SELECT 1 FROM revoked_tokens WHERE token_jti = ?').get(request.user.jti);
        if (revoked) {
          return reply.status(401).send({ error: 'Token has been revoked' });
        }
      }

      // Check if user account is still active
      const user = db.db.prepare('SELECT is_active FROM users WHERE id = ?').get(request.user.id);
      if (!user || !user.is_active) {
        return reply.status(401).send({ error: 'Account is deactivated' });
      }
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

        // Check if token has been revoked (logout blacklist)
        // Only check if jti exists - old tokens issued before jti was added won't have it
        const db = fastify.db;
        if (request.user.jti) {
          const revoked = db.db.prepare('SELECT 1 FROM revoked_tokens WHERE token_jti = ?').get(request.user.jti);
          if (revoked) {
            return reply.status(401).send({ error: 'Token has been revoked' });
          }
        }

        // Check if user account is still active
        const user = db.db.prepare('SELECT is_active FROM users WHERE id = ?').get(request.user.id);
        if (!user || !user.is_active) {
          return reply.status(401).send({ error: 'Account is deactivated' });
        }

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
