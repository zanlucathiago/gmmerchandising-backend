const crypto = require('crypto');
const redisService = require('../config/redis');
const { logger } = require('../utils/logger');

/**
 * Generate cache key based on request data and user
 * @param {string} prefix - Cache key prefix
 * @param {Object} data - Data to include in cache key
 * @param {string} userId - User ID for user-specific caching
 * @returns {string} Generated cache key
 */
function generateCacheKey(prefix, data, userId = null) {
  const dataString = JSON.stringify(data);
  const hash = crypto.createHash('md5').update(dataString).digest('hex');
  
  if (userId) {
    return `${prefix}:user:${userId}:${hash}`;
  }
  return `${prefix}:${hash}`;
}

/**
 * Middleware to cache geocoding responses
 * @param {string} cachePrefix - Prefix for cache keys (e.g., 'geocode', 'reverse-geocode')
 * @param {number} ttl - Cache time-to-live in seconds (default: 24 hours)
 * @param {boolean} userSpecific - Whether to make cache user-specific (default: false)
 * @returns {Function} Express middleware function
 */
function cacheGeocodingResponse(cachePrefix, ttl = 86400, userSpecific = false) {
  return async (req, res, next) => {
    // Skip caching if Redis is not available
    if (!redisService.isAvailable()) {
      return next();
    }

    try {
      // Generate cache key based on request data
      let cacheData;
      if (cachePrefix === 'reverse-geocode') {
        cacheData = { latitude: req.coordinates.latitude, longitude: req.coordinates.longitude };
      } else if (cachePrefix === 'geocode') {
        cacheData = { address: req.address };
      } else {
        return next();
      }

      const userId = userSpecific && req.user ? req.user.uid : null;
      const cacheKey = generateCacheKey(cachePrefix, cacheData, userId);

      // Try to get cached response
      const cachedResponse = await redisService.get(cacheKey);
      if (cachedResponse && typeof cachedResponse === 'object') {
        // Log the request even when serving from cache
        const logData = { cacheKey, userId, cached: true };
        
        // Add client info to log if available (for reverse geocoding)
        if (req.clientInfo && cachePrefix === 'reverse-geocode') {
          logData.clientInfo = req.clientInfo;
          logData.coordinates = { 
            latitude: req.coordinates.latitude, 
            longitude: req.coordinates.longitude 
          };
          logger.info(`📱 App Version: ${req.clientInfo.appVersion || 'N/A'}`);
          logger.info(`🔢 Build Number: ${req.clientInfo.buildNumber || 'N/A'}`);
          logger.info(`📲 Platform: ${req.clientInfo.platform || 'N/A'}`);
          logger.info(`📍 Coordinates: ${req.coordinates.latitude}, ${req.coordinates.longitude}`);
          logger.info(`⚡ Served from Redis cache`);
          
          // Log cached address details if available
          if (cachedResponse.data && cachedResponse.data.formatted_address) {
            logger.info(`🏠 Cached Address: ${cachedResponse.data.formatted_address}`);
            logger.info(`📍 Place ID: ${cachedResponse.data.place_id}`);
            
            const components = cachedResponse.data.address_components;
            if (components && components.administrative_area_level_2) {
              logger.info(`🏙️  City: ${components.administrative_area_level_2}`);
            }
            if (components && components.administrative_area_level_1) {
              logger.info(`🗺️  State: ${components.administrative_area_level_1}`);
            }
            if (components && components.country) {
              logger.info(`🌎 Country: ${components.country} (${components.country_code || 'N/A'})`);
            }
          }
          
          logger.info(`${'='.repeat(60)}\n`);
        } else if (cachePrefix === 'geocode') {
          logData.address = req.address;
          logger.info(`🏠 Address: ${req.address}`);
          logger.info(`⚡ Served from Redis cache`);
          
          // Log cached coordinates if available
          if (cachedResponse.data && cachedResponse.data.geometry && cachedResponse.data.geometry.location) {
            logger.info(`🏠 Cached Address: ${cachedResponse.data.formatted_address}`);
            logger.info(`📍 Coordinates: ${cachedResponse.data.geometry.location.lat}, ${cachedResponse.data.geometry.location.lng}`);
            logger.info(`🌍 Location Type: ${cachedResponse.data.geometry.location_type}`);
          }
          
          logger.info(`${'='.repeat(60)}\n`);
        } else {
          logger.info(`🚀 [CACHED] Serving cached response for ${cachePrefix}`);
          logger.info(`⚡ Served from Redis cache`);
          logger.info(`${'='.repeat(60)}\n`);
        }
        
        return res.status(200).json({
          ...cachedResponse,
          cached: true,
          cacheTimestamp: new Date().toISOString()
        });
      }

      // Store original res.json function
      const originalJson = res.json;

      // Override res.json to cache successful responses
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode === 200 && data.success) {
          // Cache the response data (without the cached flag)
          const responseToCache = { ...data };
          delete responseToCache.cached;
          delete responseToCache.cacheTimestamp;
          
          redisService.set(cacheKey, responseToCache, ttl).catch(error => {
            logger.error('Failed to cache response:', error.message);
          });
          
          logger.info(`Response cached for ${cachePrefix}`, { cacheKey, ttl, userId });
        }

        // Call original res.json
        originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error.message);
      next();
    }
  };
}

/**
 * Middleware to cache any API response based on URL and query parameters
 * @param {string} cachePrefix - Prefix for cache keys
 * @param {number} ttl - Cache time-to-live in seconds
 * @param {boolean} userSpecific - Whether to make cache user-specific
 * @returns {Function} Express middleware function
 */
function cacheResponse(cachePrefix, ttl = 3600, userSpecific = false) {
  return async (req, res, next) => {
    if (!redisService.isAvailable()) {
      return next();
    }

    try {
      const cacheData = {
        url: req.originalUrl,
        method: req.method,
        body: req.body,
        query: req.query
      };

      const userId = userSpecific && req.user ? req.user.uid : null;
      const cacheKey = generateCacheKey(cachePrefix, cacheData, userId);

      const cachedResponse = await redisService.get(cacheKey);
      if (cachedResponse) {
        logger.info(`Serving cached response for ${cachePrefix}`, { url: req.originalUrl, userId });
        return res.status(cachedResponse.statusCode || 200).json({
          ...cachedResponse.data,
          cached: true,
          cacheTimestamp: new Date().toISOString()
        });
      }

      const originalJson = res.json;
      const originalStatus = res.status;
      let statusCode = 200;

      res.status = function(code) {
        statusCode = code;
        return originalStatus.call(this, code);
      };

      res.json = function(data) {
        if (statusCode === 200 && data.success !== false) {
          const responseToCache = {
            statusCode,
            data: { ...data }
          };
          delete responseToCache.data.cached;
          delete responseToCache.data.cacheTimestamp;

          redisService.set(cacheKey, responseToCache, ttl).catch(error => {
            logger.error('Failed to cache response:', error.message);
          });

          logger.info(`Response cached for ${cachePrefix}`, { url: req.originalUrl, ttl, userId });
        }

        originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error.message);
      next();
    }
  };
}

/**
 * Middleware to invalidate cache for specific patterns
 * @param {string|string[]} patterns - Cache key patterns to invalidate
 * @returns {Function} Express middleware function
 */
function invalidateCache(patterns) {
  return async (req, res, next) => {
    if (!redisService.isAvailable()) {
      return next();
    }

    try {
      const patternsArray = Array.isArray(patterns) ? patterns : [patterns];
      
      for (const pattern of patternsArray) {
        // This would need to be implemented based on your Redis setup
        // Upstash doesn't support pattern deletion directly, so you'd need to track keys
        logger.info(`Cache invalidation requested for pattern: ${pattern}`);
      }
    } catch (error) {
      logger.error('Cache invalidation error:', error.message);
    }

    next();
  };
}

module.exports = {
  cacheGeocodingResponse,
  cacheResponse,
  invalidateCache,
  generateCacheKey
};
