const redisService = require('../config/redis');
const { logger } = require('./logger');

/**
 * Utility to diagnose and fix cache issues
 */
class CacheDiagnostic {
  constructor() {
    this.redisService = redisService;
  }

  /**
   * Test cache operations with sample data
   * @returns {Promise<Object>} Diagnostic results
   */
  async runDiagnostic() {
    const results = {
      redisAvailable: false,
      pingSuccess: false,
      setSuccess: false,
      getSuccess: false,
      dataIntegrity: false,
      errors: []
    };

    try {
      // Check if Redis is available
      results.redisAvailable = this.redisService.isAvailable();
      if (!results.redisAvailable) {
        results.errors.push('Redis service is not available - check environment variables');
        return results;
      }

      // Test ping
      results.pingSuccess = await this.redisService.ping();
      if (!results.pingSuccess) {
        results.errors.push('Redis ping failed - check connection');
      }

      // Test set operation
      const testKey = `diagnostic:${Date.now()}`;
      const testData = {
        test: 'data',
        timestamp: new Date().toISOString(),
        number: 12345,
        boolean: true,
        nested: {
          value: 'nested test'
        }
      };

      results.setSuccess = await this.redisService.set(testKey, testData, 60);
      if (!results.setSuccess) {
        results.errors.push('Failed to set test data in Redis');
      }

      // Test get operation
      if (results.setSuccess) {
        const retrievedData = await this.redisService.get(testKey);
        results.getSuccess = retrievedData !== null;
        
        if (results.getSuccess) {
          // Check data integrity
          results.dataIntegrity = JSON.stringify(testData) === JSON.stringify(retrievedData);
          if (!results.dataIntegrity) {
            results.errors.push('Data integrity check failed - retrieved data does not match stored data');
            logger.debug('Original data:', testData);
            logger.debug('Retrieved data:', retrievedData);
          }
        } else {
          results.errors.push('Failed to retrieve test data from Redis');
        }

        // Clean up test data
        await this.redisService.del(testKey);
      }

      logger.info('Cache diagnostic completed:', results);
      return results;

    } catch (error) {
      results.errors.push(`Diagnostic error: ${error.message}`);
      logger.error('Cache diagnostic error:', error);
      return results;
    }
  }

  /**
   * Test specific cache key for issues
   * @param {string} key - Cache key to test
   * @returns {Promise<Object>} Test results
   */
  async testCacheKey(key) {
    const result = {
      keyExists: false,
      dataValid: false,
      dataType: null,
      rawData: null,
      parsedData: null,
      error: null
    };

    try {
      if (!this.redisService.isAvailable()) {
        result.error = 'Redis not available';
        return result;
      }

      // Get raw data directly from Redis
      const rawData = await this.redisService.client.get(key);
      result.keyExists = rawData !== null;
      result.rawData = rawData;
      result.dataType = typeof rawData;

      if (rawData) {
        try {
          // Try to parse the data using our service method
          result.parsedData = await this.redisService.get(key);
          result.dataValid = result.parsedData !== null;
        } catch (parseError) {
          result.error = `Parse error: ${parseError.message}`;
          result.dataValid = false;
        }
      }

      return result;
    } catch (error) {
      result.error = error.message;
      return result;
    }
  }

  /**
   * Fix corrupted cache entry by removing it
   * @param {string} key - Cache key to fix
   * @returns {Promise<boolean>} Success status
   */
  async fixCorruptedKey(key) {
    try {
      const deleted = await this.redisService.del(key);
      if (deleted) {
        logger.info(`Fixed corrupted cache key: ${key}`);
      } else {
        logger.warn(`Cache key not found or already deleted: ${key}`);
      }
      return deleted;
    } catch (error) {
      logger.error(`Failed to fix corrupted cache key ${key}:`, error.message);
      return false;
    }
  }
}

module.exports = new CacheDiagnostic();
