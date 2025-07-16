const express = require('express');
const GoogleMapsService = require('../services/googleMapsService');
const { authenticateFirebaseToken } = require('../middleware/auth');
const { validateCoordinates, validateAddress } = require('../middleware/validation');
const { logger } = require('../utils/logger');

const router = express.Router();
const googleMapsService = new GoogleMapsService();

/**
 * @route POST /api/geocoding/reverse
 * @description Convert coordinates (latitude, longitude) to address using Google Maps Geocoding API
 * @access Private (requires Firebase authentication)
 * @body { latitude: number, longitude: number }
 */
router.post('/reverse', authenticateFirebaseToken, validateCoordinates, async (req, res, next) => {
  try {
    const { latitude, longitude } = req.coordinates;
    
    logger.info(`Reverse geocoding request from user ${req.user.uid}:`, { latitude, longitude });

    const result = await googleMapsService.reverseGeocode(latitude, longitude);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message,
        coordinates: result.coordinates
      });
    }

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
router.post('/forward', authenticateFirebaseToken, validateAddress, async (req, res, next) => {
  try {
    const address = req.address;
    
    logger.info(`Forward geocoding request from user ${req.user.uid}:`, { address });

    const result = await googleMapsService.geocode(address);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message,
        address: result.address
      });
    }

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
router.get('/status', authenticateFirebaseToken, (req, res) => {
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
      firebase: 'Connected'
    }
  });
});

module.exports = router;
