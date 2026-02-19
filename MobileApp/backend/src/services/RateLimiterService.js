// Rate limiter service for API protection
class RateLimiterService {
  constructor() {
    this.requests = new Map();
    this.cleanupInterval = null;
    this.startCleanup();
  }

  /**
   * Check if request is allowed
   */
  checkLimit(identifier, maxRequests = 100, windowSeconds = 60) {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }

    const userRequests = this.requests.get(identifier);

    // Remove old requests outside the window
    const validRequests = userRequests.filter((timestamp) => now - timestamp < windowMs);

    this.requests.set(identifier, validRequests);

    // Check if limit exceeded
    if (validRequests.length >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: Math.ceil((validRequests[0] + windowMs - now) / 1000),
      };
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);

    return {
      allowed: true,
      remaining: maxRequests - validRequests.length,
      resetIn: windowSeconds,
    };
  }

  /**
   * Get rate limit info
   */
  getLimitInfo(identifier, maxRequests = 100, windowSeconds = 60) {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    if (!this.requests.has(identifier)) {
      return {
        used: 0,
        remaining: maxRequests,
        resetIn: windowSeconds,
      };
    }

    const userRequests = this.requests.get(identifier);
    const validRequests = userRequests.filter((timestamp) => now - timestamp < windowMs);

    return {
      used: validRequests.length,
      remaining: Math.max(0, maxRequests - validRequests.length),
      resetIn:
        validRequests.length > 0
          ? Math.ceil((validRequests[0] + windowMs - now) / 1000)
          : windowSeconds,
    };
  }

  /**
   * Reset limits for identifier
   */
  reset(identifier) {
    return this.requests.delete(identifier);
  }

  /**
   * Clear all limits
   */
  clearAll() {
    this.requests.clear();
    return true;
  }

  /**
   * Start cleanup interval
   */
  startCleanup() {
    // Clean up old entries every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000
    );
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clean up old entries
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour
    let cleaned = 0;

    for (const [identifier, timestamps] of this.requests.entries()) {
      const validRequests = timestamps.filter((timestamp) => now - timestamp < maxAge);

      if (validRequests.length === 0) {
        this.requests.delete(identifier);
        cleaned++;
      } else {
        this.requests.set(identifier, validRequests);
      }
    }

    return cleaned;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      total_identifiers: this.requests.size,
      total_requests: Array.from(this.requests.values()).reduce((sum, arr) => sum + arr.length, 0),
    };
  }
}

module.exports = RateLimiterService;
