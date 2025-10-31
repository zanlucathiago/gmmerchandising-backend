const redisService = require('../config/redis');
const { logger } = require('./logger');

class CacheManager {
  constructor() {
    this.redisService = redisService;
  }

  /**
   * Get cache statistics and information
   * @returns {Promise<Object>} Cache statistics
   */
  async getStats() {
    if (!this.redisService.isAvailable()) {
      return {
        available: false,
        message: 'Redis service is not available'
      };
    }

    try {
      const ping = await this.redisService.ping();
      return {
        available: true,
        connected: ping,
        message: ping ? 'Redis is connected and responsive' : 'Redis connection issue'
      };
    } catch (error) {
  logger.error('Cache stats error', { error: error.message });
      return {
        available: false,
        error: error.message
      };
    }
  }

  /**
   * Warm up cache with commonly requested data
   * @param {Array} locations - Array of {latitude, longitude} or {address} objects
   * @returns {Promise<Object>} Warmup results
   */
  async warmup(locations = []) {
    if (!this.redisService.isAvailable() || locations.length === 0) {
      return { success: false, message: 'Cache not available or no locations provided' };
    }

    let successCount = 0;
    let failCount = 0;

    for (const location of locations) {
      try {
        if (location.latitude && location.longitude) {
          // This would typically involve calling your geocoding service
          // and caching the results, but for now we'll just log it
          logger.debug('Would warm up reverse geocoding cache', { latitude: location.latitude, longitude: location.longitude });
          successCount++;
        } else if (location.address) {
          logger.debug('Would warm up geocoding cache', { address: location.address });
          successCount++;
        }
      } catch (error) {
        failCount++;
  logger.error('Cache warmup failed for location', { location, error: error.message });
      }
    }

    return {
      success: true,
      processed: locations.length,
      successful: successCount,
      failed: failCount
    };
  }

  /**
   * Clear cache entries by pattern (limited in Upstash)
   * Note: Upstash Redis doesn't support KEYS command, so this is a placeholder
   * In production, you'd need to track keys separately or use a different approach
   * @param {string} pattern - Pattern to match (e.g., 'geocode:*')
   * @returns {Promise<Object>} Clear operation results
   */
  async clearByPattern(pattern) {
    logger.warn(`Cache clear by pattern '${pattern}' requested, but not implemented for Upstash Redis`);
    // Warn só se debug
    if (process.env.NODE_ENV === 'development') {
      logger.warn(`Cache clear by pattern '${pattern}' requested, but not implemented for Upstash Redis`);
    }
    return {
      success: false,
      message: 'Pattern-based cache clearing not available with Upstash Redis'
    };
  }

  /**
   * Clear specific cache entry
   * @param {string} key - Cache key to clear
   * @returns {Promise<boolean>} Success status
   */
  async clear(key) {
    if (!this.redisService.isAvailable()) {
      return false;
    }

    try {
      const result = await this.redisService.del(key);
      logger.info('Cache cleared', { key });
      return result;
    } catch (error) {
      logger.error('Failed to clear cache', { key, error: error.message });
      return false;
    }
  }

  /**
   * Check if a specific key exists in cache
   * @param {string} key - Cache key to check
   * @returns {Promise<boolean>} Existence status
   */
  async exists(key) {
    if (!this.redisService.isAvailable()) {
      return false;
    }

    try {
      const data = await this.redisService.get(key);
      return data !== null;
    } catch (error) {
      logger.error(`Failed to check cache existence for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Get cache entry with metadata
   * @param {string} key - Cache key
   * @returns {Promise<Object|null>} Cache data with metadata or null
   */
  async getWithMetadata(key) {
    if (!this.redisService.isAvailable()) {
      return null;
    }

    try {
      const data = await this.redisService.get(key);
      if (data) {
        return {
          data,
          key,
          retrieved: new Date().toISOString(),
          cached: true
        };
      }
      return null;
    } catch (error) {
      logger.error(`Failed to get cache with metadata for key ${key}:`, error.message);
      return null;
    }
  }
}

// Export singleton instance
module.exports = new CacheManager();
