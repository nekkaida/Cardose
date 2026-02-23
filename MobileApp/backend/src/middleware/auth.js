// Authentication middleware plugin
const fp = require('fastify-plugin');

async function authPlugin(fastify, options) {
  // Authenticate decorator - verifies JWT token
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();

      const db = fastify.db;

      // Check if token has been revoked (logout blacklist)
      if (request.user.jti) {
        try {
          const revoked = db.db
            .prepare('SELECT 1 FROM revoked_tokens WHERE token_jti = ?')
            .get(request.user.jti);
          if (revoked) {
            return reply.status(401).send({ error: 'Token has been revoked' });
          }
        } catch (e) {
          // Fail closed: if we can't check revocation, deny access
          fastify.log.error(e, 'Revocation check failed — denying request');
          return reply.status(500).send({ error: 'Authentication verification failed' });
        }
      }

      // Check if user account is still active
      try {
        const user = db.db.prepare('SELECT is_active FROM users WHERE id = ?').get(request.user.id);
        if (!user || !user.is_active) {
          return reply.status(401).send({ error: 'Account is deactivated' });
        }
      } catch (e) {
        // Fail closed: if we can't verify user status, deny access
        fastify.log.error(e, 'User status check failed — denying request');
        return reply.status(500).send({ error: 'Authentication verification failed' });
      }
    } catch (err) {
      if (err.code === 'FAST_JWT_EXPIRED') {
        return reply.status(401).send({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      return reply.status(401).send({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
    }
  });

  // Role-based authorization decorator
  // Always used after `authenticate` in preHandler chains, so JWT/revocation/active
  // checks have already passed. This decorator only checks role membership.
  fastify.decorate('authorize', (roles) => {
    return async function (request, reply) {
      // Fail closed: if authenticate didn't run (or failed to set user), deny
      if (!request.user) {
        return reply.status(401).send({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
      }

      if (!roles.includes(request.user.role)) {
        return reply.status(403).send({ error: 'Insufficient permissions', code: 'FORBIDDEN' });
      }
    };
  });
}

// Use fastify-plugin to skip encapsulation so decorators are available globally
module.exports = fp(authPlugin);
