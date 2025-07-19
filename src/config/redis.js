const { Redis } = require('@upstash/redis');
const { createClient } = require('redis');
const { logger } = require('../utils/logger');

class RedisService {
  constructor() {
    this.isUpstash = process.env.NODE_ENV === 'production';
    this.client = null;
    this.isEnabled = false;
    this.initializationPromise = this.initializeClient();
  }

  async initializeClient() {
    try {
      if (this.isUpstash) {
        // Use Upstash Redis for production
        if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
          logger.warn('Upstash Redis credentials not found. Caching will be disabled.');
          return;
        }

        this.client = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        this.isEnabled = true;
        logger.info('Upstash Redis client initialized successfully');
      } else {
        // Use local Redis for development
        const redisConfig = {
          socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT) || 6379,
            connectTimeout: 10000,
          },
          database: parseInt(process.env.REDIS_DB) || 0,
        };

        if (process.env.REDIS_PASSWORD) {
          redisConfig.password = process.env.REDIS_PASSWORD;
        }

        this.client = createClient(redisConfig);
        
        this.client.on('error', (err) => {
          logger.warn('Local Redis connection error:', err.message);
          this.isEnabled = false;
        });

        this.client.on('connect', () => {
          logger.info('Local Redis client connected successfully');
          this.isEnabled = true;
        });

        try {
          await this.client.connect();
        } catch (error) {
          logger.warn('Failed to connect to local Redis:', error.message);
          logger.info('Caching will be disabled. Make sure Redis is running locally or check your configuration.');
          this.client = null;
          this.isEnabled = false;
        }
      }
    } catch (error) {
      logger.error('Failed to initialize Redis client:', error.message);
      this.client = null;
      this.isEnabled = false;
    }
  }

  async ensureInitialized() {
    await this.initializationPromise;
  }

  /**
   * Get data from Redis cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} Cached data or null if not found
   */
  async get(key) {
    await this.ensureInitialized();
    
    if (!this.isEnabled || !this.client) {
      return null;
    }

    try {
      let data;
      
      if (this.isUpstash) {
        // Upstash Redis
        data = await this.client.get(key);
      } else {
        // Local Redis
        data = await this.client.get(key);
      }

      if (data) {
        logger.debug(`Cache hit for key: ${key}`);
        
        // Handle different data types returned by Redis
        if (typeof data === 'string') {
          try {
            return JSON.parse(data);
          } catch (parseError) {
            logger.warn(`Failed to parse cached data for key ${key}:`, parseError.message);
            return null;
          }
        } else if (typeof data === 'object' && data !== null) {
          // Data is already an object (Upstash sometimes returns parsed JSON)
          return data;
        } else {
          logger.warn(`Unexpected data type for key ${key}:`, typeof data);
          return null;
        }
      }
      logger.debug(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      logger.error(`Redis get error for key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Set data in Redis cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in seconds (default: 1 hour)
   * @returns {Promise<boolean>} Success status
   */
  async set(key, data, ttl = 3600) {
    await this.ensureInitialized();
    
    if (!this.isEnabled || !this.client) {
      return false;
    }

    try {
      // Ensure data is properly serialized
      const serializedData = typeof data === 'string' ? data : JSON.stringify(data);
      
      if (this.isUpstash) {
        // Upstash Redis
        await this.client.setex(key, ttl, serializedData);
      } else {
        // Local Redis
        await this.client.setEx(key, ttl, serializedData);
      }
      
      logger.debug(`Cache set for key: ${key}, TTL: ${ttl}s`);
      return true;
    } catch (error) {
      logger.error(`Redis set error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Delete data from Redis cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async del(key) {
    await this.ensureInitialized();
    
    if (!this.isEnabled || !this.client) {
      return false;
    }

    try {
      const result = await this.client.del(key);
      logger.debug(`Cache deleted for key: ${key}`);
      return result > 0;
    } catch (error) {
      logger.error(`Redis delete error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Check if cache is enabled and available
   * @returns {boolean} Cache availability status
   */
  isAvailable() {
    return this.isEnabled && this.client !== null;
  }

  /**
   * Test Redis connection
   * @returns {Promise<boolean>} Connection status
   */
  async ping() {
    await this.ensureInitialized();
    
    if (!this.isEnabled || !this.client) {
      return false;
    }

    try {
      if (this.isUpstash) {
        // Upstash Redis
        const result = await this.client.ping();
        return result === 'PONG';
      } else {
        // Local Redis
        const result = await this.client.ping();
        return result === 'PONG';
      }
    } catch (error) {
      logger.error('Redis ping error:', error.message);
      return false;
    }
  }
}

// Export singleton instance
module.exports = new RedisService();
