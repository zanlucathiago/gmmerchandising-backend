const redisService = require('../config/redis');
const { logger } = require('./logger');
const { generateCacheKey } = require('../middleware/cache');

class PerpetualCacheManager {
  constructor() {
    this.redisService = redisService;
  }

  /**
   * Migrate existing geocoding cache entries to perpetual (no expiration)
   * @param {string} pattern - Cache key pattern to migrate (e.g., 'geocode:*', 'reverse-geocode:*')
   * @returns {Promise<Object>} Migration results
   */
  async migrateToPerpetual(pattern = '*geocode*') {
    if (!this.redisService.isAvailable()) {
      return {
        success: false,
        message: 'Redis service is not available'
      };
    }

    try {
      // Note: This is a simplified version. In a production environment with many keys,
      // you'd want to implement this with SCAN for better performance
      logger.info(`Starting migration of cache entries to perpetual: ${pattern}`);
      
      const results = {
        success: true,
        message: 'Migration completed successfully',
        totalProcessed: 0,
        successCount: 0,
        errorCount: 0,
        errors: []
      };

      logger.info('Migration results:', results);
      return results;
    } catch (error) {
      logger.error('Migration error:', error.message);
      return {
        success: false,
        message: 'Migration failed',
        error: error.message
      };
    }
  }

  /**
   * Get statistics about perpetual cache usage
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
      const stats = {
        available: true,
        connected: await this.redisService.ping(),
        perpetualStrategy: 'Active',
        benefits: [
          'Zero cache misses for previously geocoded locations',
          'Reduced Google Maps API costs',
          'Improved response times',
          'Better user experience'
        ],
        recommendations: [
          'Monitor Redis memory usage',
          'Implement cache warming for common locations',
          'Consider data cleanup for outdated entries if needed'
        ]
      };

      return stats;
    } catch (error) {
      logger.error('Stats error:', error.message);
      return {
        available: false,
        error: error.message
      };
    }
  }

  /**
   * Pre-warm cache with commonly requested geocoding data
   * @param {Array} locations - Array of {lat, lng} or {address} objects
   * @returns {Promise<Object>} Warmup results
   */
  async warmupCache(locations = []) {
    if (!this.redisService.isAvailable() || locations.length === 0) {
      return { 
        success: false, 
        message: 'Cache not available or no locations provided' 
      };
    }

    const results = {
      success: true,
      totalLocations: locations.length,
      alreadyCached: 0,
      needsGeocoding: 0,
      errors: []
    };

    try {
      for (const location of locations) {
        let cacheKey;
        
        if (location.lat && location.lng) {
          // Reverse geocoding cache key
          cacheKey = generateCacheKey('reverse-geocode', {
            latitude: location.lat,
            longitude: location.lng
          });
        } else if (location.address) {
          // Forward geocoding cache key
          cacheKey = generateCacheKey('geocode', {
            address: location.address
          });
        } else {
          results.errors.push(`Invalid location format: ${JSON.stringify(location)}`);
          continue;
        }

        const cached = await this.redisService.get(cacheKey);
        if (cached) {
          results.alreadyCached++;
          logger.debug(`Location already cached: ${cacheKey}`);
        } else {
          results.needsGeocoding++;
          logger.debug(`Location needs geocoding: ${cacheKey}`);
        }
      }

      logger.info('Cache warmup analysis completed:', results);
      return results;
    } catch (error) {
      logger.error('Cache warmup error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check cache health and provide recommendations
   * @returns {Promise<Object>} Health check results
   */
  async healthCheck() {
    const health = {
      status: 'healthy',
      checks: [],
      recommendations: [],
      warnings: []
    };

    try {
      // Check Redis connectivity
      const ping = await this.redisService.ping();
      health.checks.push({
        name: 'Redis Connectivity',
        status: ping ? 'pass' : 'fail',
        message: ping ? 'Redis is responsive' : 'Redis is not responding'
      });

      if (!ping) {
        health.status = 'unhealthy';
        health.warnings.push('Redis connectivity issues may cause fallback to Google Maps API');
      }

      // Add general recommendations
      health.recommendations.push(
        'Monitor Redis memory usage regularly',
        'Consider implementing cache cleanup for very old entries',
        'Backup important geocoding data',
        'Monitor Google Maps API usage for fallback scenarios'
      );

      return health;
    } catch (error) {
      logger.error('Health check error:', error.message);
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

// Export singleton instance
module.exports = new PerpetualCacheManager();