// In-memory cache service for performance optimization
class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttlTimers = new Map();
  }

  /**
   * Set cache value with optional TTL
   */
  set(key, value, ttlSeconds = 300) {
    // Clear existing TTL timer if exists
    if (this.ttlTimers.has(key)) {
      clearTimeout(this.ttlTimers.get(key));
    }

    // Set cache value
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttlSeconds,
    });

    // Set TTL timer
    if (ttlSeconds > 0) {
      const timer = setTimeout(() => {
        this.delete(key);
      }, ttlSeconds * 1000);

      this.ttlTimers.set(key, timer);
    }

    return true;
  }

  /**
   * Get cache value
   */
  get(key) {
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    const age = (now - cached.timestamp) / 1000;

    if (cached.ttl > 0 && age > cached.ttl) {
      this.delete(key);
      return null;
    }

    return cached.value;
  }

  /**
   * Check if key exists in cache
   */
  has(key) {
    return this.cache.has(key) && this.get(key) !== null;
  }

  /**
   * Delete cache entry
   */
  delete(key) {
    // Clear TTL timer
    if (this.ttlTimers.has(key)) {
      clearTimeout(this.ttlTimers.get(key));
      this.ttlTimers.delete(key);
    }

    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    // Clear all TTL timers
    for (const timer of this.ttlTimers.values()) {
      clearTimeout(timer);
    }

    this.cache.clear();
    this.ttlTimers.clear();

    return true;
  }

  /**
   * Get or set cache value
   */
  async getOrSet(key, fetchFunction, ttlSeconds = 300) {
    const cached = this.get(key);

    if (cached !== null) {
      return cached;
    }

    const value = await fetchFunction();
    this.set(key, value, ttlSeconds);

    return value;
  }

  /**
   * Invalidate cache by pattern
   */
  invalidatePattern(pattern) {
    const regex = new RegExp(pattern);
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [key, cached] of this.cache.entries()) {
      const age = (now - cached.timestamp) / 1000;

      if (cached.ttl > 0 && age > cached.ttl) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      total: this.cache.size,
      valid: validEntries,
      expired: expiredEntries,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Estimate memory usage (rough calculation)
   */
  estimateMemoryUsage() {
    let size = 0;

    for (const [key, cached] of this.cache.entries()) {
      size += key.length * 2; // String chars are 2 bytes
      size += JSON.stringify(cached.value).length * 2;
    }

    return {
      bytes: size,
      kilobytes: (size / 1024).toFixed(2),
      megabytes: (size / 1024 / 1024).toFixed(2),
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, cached] of this.cache.entries()) {
      const age = (now - cached.timestamp) / 1000;

      if (cached.ttl > 0 && age > cached.ttl) {
        this.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

module.exports = CacheService;
