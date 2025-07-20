const express = require('express');
const GoogleMapsService = require('../services/googleMapsService');
const { authenticateFirebaseToken } = require('../middleware/auth');
const { validateCoordinates, validateAddress } = require('../middleware/validation');
const { cacheGeocodingResponse } = require('../middleware/cache');
const redisService = require('../config/redis');
const { logger } = require('../utils/logger');

const router = express.Router();
const googleMapsService = new GoogleMapsService();

/**
 * @route POST /api/geocoding/reverse
 * @description Convert coordinates (latitude, longitude) to address using Google Maps Geocoding API
 * @access Private (requires Firebase authentication)
 * @body { latitude: number, longitude: number, appVersion?: string, buildNumber?: string, platform?: string }
 */
router.post('/reverse', 
  authenticateFirebaseToken, 
  validateCoordinates, 
  cacheGeocodingResponse('reverse-geocode', 86400), // Cache for 24 hours
  async (req, res, next) => {
  try {
    const { latitude, longitude } = req.coordinates;
    const clientInfo = req.clientInfo || {};
    
    logger.info(`� [FRESH] Reverse Geocoding Request from user ${req.user.uid}`);
    logger.info(`📱 App Version: ${clientInfo.appVersion || 'N/A'}`);
    logger.info(`🔢 Build Number: ${clientInfo.buildNumber || 'N/A'}`);
    logger.info(`📲 Platform: ${clientInfo.platform || 'N/A'}`);
    logger.info(`📍 Coordinates: ${latitude}, ${longitude}`);
    logger.info(`🔍 Querying Google Maps API...`);

    const result = await googleMapsService.reverseGeocode(latitude, longitude);
    
    if (!result.success) {
      logger.info(`❌ Reverse geocoding failed for user ${req.user.uid}`);
      logger.info(`${'='.repeat(60)}\n`);
      return res.status(404).json({
        success: false,
        message: result.message,
        coordinates: result.coordinates
      });
    }

    logger.info(`✅ Reverse geocoding successful for user ${req.user.uid}`);
    logger.info(`🏠 Full Address: ${result.data.formatted_address}`);
    logger.info(`📍 Place ID: ${result.data.place_id}`);
    logger.info(`🌍 Location Type: ${result.data.geometry.location_type}`);
    
    // Log key address components if available
    const components = result.data.address_components;
    if (components.administrative_area_level_2) {
      logger.info(`🏙️  City: ${components.administrative_area_level_2}`);
    }
    if (components.administrative_area_level_1) {
      logger.info(`🗺️  State: ${components.administrative_area_level_1}`);
    }
    if (components.country) {
      logger.info(`🌎 Country: ${components.country} (${components.country_code})`);
    }
    
    logger.info(`${'='.repeat(60)}\n`);

    res.status(200).json({
      success: true,
      message: 'Address retrieved successfully',
      data: result.data,
      user: {
        uid: req.user.uid,
        isAnonymous: req.user.isAnonymous
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/geocoding/forward
 * @description Convert address to coordinates using Google Maps Geocoding API
 * @access Private (requires Firebase authentication)
 * @body { address: string }
 */
router.post('/forward', 
  authenticateFirebaseToken, 
  validateAddress, 
  cacheGeocodingResponse('geocode', 86400), // Cache for 24 hours
  async (req, res, next) => {
  try {
    const address = req.address;
    
    logger.info(`🚀 [FRESH] Forward Geocoding Request from user ${req.user.uid}`);
    logger.info(`🏠 Address: ${address}`);
    logger.info(`🔍 Querying Google Maps API...`);

    const result = await googleMapsService.geocode(address);
    
    if (!result.success) {
      logger.info(`❌ Forward geocoding failed for user ${req.user.uid}`);
      logger.info(`${'='.repeat(60)}\n`);
      return res.status(404).json({
        success: false,
        message: result.message,
        address: result.address
      });
    }

    logger.info(`✅ Forward geocoding successful for user ${req.user.uid}`);
    logger.info(`🏠 Full Address: ${result.data.formatted_address}`);
    logger.info(`📍 Coordinates: ${result.data.geometry.location.lat}, ${result.data.geometry.location.lng}`);
    logger.info(`📍 Place ID: ${result.data.place_id}`);
    logger.info(`🌍 Location Type: ${result.data.geometry.location_type}`);
    logger.info(`${'='.repeat(60)}\n`);

    res.status(200).json({
      success: true,
      message: 'Coordinates retrieved successfully',
      data: result.data,
      user: {
        uid: req.user.uid,
        isAnonymous: req.user.isAnonymous
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/geocoding/status
 * @description Check the status of the geocoding service
 * @access Private (requires Firebase authentication)
 */
router.get('/status', authenticateFirebaseToken, async (req, res) => {
  try {
    const redisStatus = redisService.isAvailable() ? 'Connected' : 'Disconnected';
    const redisPing = await redisService.ping();
    
    res.status(200).json({
      success: true,
      message: 'Geocoding service is operational',
      timestamp: new Date().toISOString(),
      user: {
        uid: req.user.uid,
        isAnonymous: req.user.isAnonymous,
        provider: req.user.provider
      },
      services: {
        googleMaps: 'Connected',
        firebase: 'Connected',
        redis: redisStatus,
        redisPing: redisPing
      }
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      message: 'Geocoding service is operational (Redis check failed)',
      timestamp: new Date().toISOString(),
      user: {
        uid: req.user.uid,
        isAnonymous: req.user.isAnonymous,
        provider: req.user.provider
      },
      services: {
        googleMaps: 'Connected',
        firebase: 'Connected',
        redis: 'Error',
        redisError: error.message
      }
    });
  }
});

module.exports = router;
