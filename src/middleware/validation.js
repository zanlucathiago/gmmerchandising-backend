const { roundCoordinates } = require('../utils/coordinateUtils');

const validateCoordinates = (req, res, next) => {
  const { latitude, longitude } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({
      error: 'Both latitude and longitude are required',
      code: 'MISSING_COORDINATES'
    });
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({
      error: 'Latitude and longitude must be valid numbers',
      code: 'INVALID_COORDINATES_FORMAT'
    });
  }

  if (lat < -90 || lat > 90) {
    return res.status(400).json({
      error: 'Latitude must be between -90 and 90 degrees',
      code: 'INVALID_LATITUDE_RANGE'
    });
  }

  if (lng < -180 || lng > 180) {
    return res.status(400).json({
      error: 'Longitude must be between -180 and 180 degrees',
      code: 'INVALID_LONGITUDE_RANGE'
    });
  }

  // Round coordinates to 3 decimal places for consistency in cache and API calls
  const roundedCoordinates = roundCoordinates(lat, lng, 3);

  // Add rounded coordinates to request
  req.coordinates = roundedCoordinates;
  
  // Store original coordinates for reference if needed
  req.originalCoordinates = { latitude: lat, longitude: lng };
  
  // Extract optional client info for logging
  const { appVersion, buildNumber, platform } = req.body;
  req.clientInfo = {
    appVersion: appVersion || null,
    buildNumber: buildNumber || null,
    platform: platform || null
  };
  
  next();
};

const validateAddress = (req, res, next) => {
  const { address } = req.body;

  if (!address) {
    return res.status(400).json({
      error: 'Address is required',
      code: 'MISSING_ADDRESS'
    });
  }

  if (typeof address !== 'string') {
    return res.status(400).json({
      error: 'Address must be a string',
      code: 'INVALID_ADDRESS_FORMAT'
    });
  }

  if (address.trim().length === 0) {
    return res.status(400).json({
      error: 'Address cannot be empty',
      code: 'EMPTY_ADDRESS'
    });
  }

  if (address.length > 500) {
    return res.status(400).json({
      error: 'Address is too long (maximum 500 characters)',
      code: 'ADDRESS_TOO_LONG'
    });
  }

  req.address = address.trim();
  next();
};

module.exports = {
  validateCoordinates,
  validateAddress
};
