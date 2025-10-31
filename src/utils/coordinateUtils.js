/**
 * Utility functions for coordinate processing
 */

/**
 * Round coordinates to specified decimal places
 * @param {number} coordinate - The coordinate value to round
 * @param {number} decimalPlaces - Number of decimal places (default: 2)
 * @returns {number} Rounded coordinate
 */
function roundCoordinate(coordinate, decimalPlaces = 2) {
  if (typeof coordinate !== 'number' || isNaN(coordinate)) {
    throw new Error('Coordinate must be a valid number');
  }
  
  const multiplier = Math.pow(10, decimalPlaces);
  return Math.round(coordinate * multiplier) / multiplier;
}

/**
 * Round latitude and longitude coordinates to specified decimal places
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {number} decimalPlaces - Number of decimal places (default: 2)
 * @returns {Object} Object with rounded latitude and longitude
 */
function roundCoordinates(latitude, longitude, decimalPlaces = 2) {
  return {
    latitude: roundCoordinate(latitude, decimalPlaces),
    longitude: roundCoordinate(longitude, decimalPlaces)
  };
}

/**
 * Check if coordinates are equal when rounded to the same precision
 * @param {number} lat1 - First latitude
 * @param {number} lng1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lng2 - Second longitude
 * @param {number} decimalPlaces - Number of decimal places for comparison (default: 2)
 * @returns {boolean} True if coordinates are equal when rounded
 */
function areCoordinatesEqual(lat1, lng1, lat2, lng2, decimalPlaces = 2) {
  const rounded1 = roundCoordinates(lat1, lng1, decimalPlaces);
  const rounded2 = roundCoordinates(lat2, lng2, decimalPlaces);
  
  return rounded1.latitude === rounded2.latitude && 
         rounded1.longitude === rounded2.longitude;
}

module.exports = {
  roundCoordinate,
  roundCoordinates,
  areCoordinatesEqual
};