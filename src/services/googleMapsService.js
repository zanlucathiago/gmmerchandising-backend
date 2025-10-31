const { Client } = require('@googlemaps/google-maps-services-js');
const { logger } = require('../utils/logger');
const { roundCoordinates } = require('../utils/coordinateUtils');

class GoogleMapsService {
  constructor() {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY environment variable is required');
    }
    
    this.client = new Client({});
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
  }

  async reverseGeocode(latitude, longitude) {
    try {
  // Ensure coordinates are rounded to 2 decimal places for consistency
  const roundedCoords = roundCoordinates(latitude, longitude, 2);
      
  logger.debug(`Using rounded coordinates for API call`, { latitude: roundedCoords.latitude, longitude: roundedCoords.longitude });
      
      const response = await this.client.reverseGeocode({
        params: {
          latlng: { lat: roundedCoords.latitude, lng: roundedCoords.longitude },
          key: this.apiKey,
          result_type: ['street_address', 'route', 'locality', 'administrative_area_level_1', 'country', 'postal_code']
        }
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Google Maps API error: ${response.data.status}`);
      }

      const results = response.data.results;
      if (!results || results.length === 0) {
        return {
          success: false,
          message: 'No address found for the provided coordinates',
          coordinates: roundedCoords
        };
      }

      // Process the first result for the most accurate address
      const firstResult = results[0];
      const addressComponents = this.parseAddressComponents(firstResult.address_components);
      
      return {
        success: true,
        data: {
          coordinates: roundedCoords, // Return rounded coordinates
          formatted_address: firstResult.formatted_address,
          place_id: firstResult.place_id,
          address_components: addressComponents,
          geometry: {
            location: firstResult.geometry.location,
            location_type: firstResult.geometry.location_type,
            bounds: firstResult.geometry.bounds,
            viewport: firstResult.geometry.viewport
          },
          types: firstResult.types
        }
      };
    } catch (error) {
  logger.error('Google Maps reverse geocoding error', { error: error.message });
      throw new Error(`Failed to reverse geocode coordinates: ${error.message}`);
    }
  }

  async geocode(address) {
    try {
  const response = await this.client.geocode({
        params: {
          address: address,
          key: this.apiKey
        }
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Google Maps API error: ${response.data.status}`);
      }

      const results = response.data.results;
      if (!results || results.length === 0) {
        return {
          success: false,
          message: 'No coordinates found for the provided address',
          address: address
        };
      }

      const firstResult = results[0];
      const addressComponents = this.parseAddressComponents(firstResult.address_components);
      
      return {
        success: true,
        data: {
          address: address,
          formatted_address: firstResult.formatted_address,
          place_id: firstResult.place_id,
          address_components: addressComponents,
          geometry: {
            location: firstResult.geometry.location,
            location_type: firstResult.geometry.location_type,
            bounds: firstResult.geometry.bounds,
            viewport: firstResult.geometry.viewport
          },
          types: firstResult.types
        }
      };
    } catch (error) {
  logger.error('Google Maps geocoding error', { error: error.message });
      throw new Error(`Failed to geocode address: ${error.message}`);
    }
  }

  parseAddressComponents(components) {
    const parsed = {};
    
    components.forEach(component => {
      component.types.forEach(type => {
        parsed[type] = {
          long_name: component.long_name,
          short_name: component.short_name
        };
      });
    });

    return {
      street_number: parsed.street_number?.long_name || null,
      route: parsed.route?.long_name || null,
      locality: parsed.locality?.long_name || null,
      administrative_area_level_1: parsed.administrative_area_level_1?.long_name || null,
      administrative_area_level_2: parsed.administrative_area_level_2?.long_name || null,
      country: parsed.country?.long_name || null,
      country_code: parsed.country?.short_name || null,
      postal_code: parsed.postal_code?.long_name || null,
      sublocality: parsed.sublocality?.long_name || null,
      neighborhood: parsed.neighborhood?.long_name || null
    };
  }
}

module.exports = GoogleMapsService;
