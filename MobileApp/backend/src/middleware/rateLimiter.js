// Rate limiter middleware
const RateLimiterService = require('../services/RateLimiterService');

const rateLimiter = new RateLimiterService();

/**
 * Rate limiter middleware factory
 */
function createRateLimiter(options = {}) {
  const maxRequests = options.maxRequests || 100;
  const windowSeconds = options.windowSeconds || 60;

  return async (request, reply) => {
    // Use IP address or user ID as identifier
    const identifier = request.user?.userId || request.ip;

    const result = rateLimiter.checkLimit(identifier, maxRequests, windowSeconds);

    // Set rate limit headers
    reply.header('X-RateLimit-Limit', maxRequests);
    reply.header('X-RateLimit-Remaining', result.remaining);
    reply.header('X-RateLimit-Reset', result.resetIn);

    if (!result.allowed) {
      return reply.status(429).send({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${result.resetIn} seconds.`,
        resetIn: result.resetIn
      });
    }
  };
}

module.exports = {
  createRateLimiter,
  rateLimiter
};
