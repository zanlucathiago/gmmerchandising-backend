const request = require('supertest');
const app = require('../src/index');

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn()
  },
  auth: () => ({
    verifyIdToken: jest.fn().mockResolvedValue({
      uid: 'test-user-123',
      email: null,
      firebase: {
        sign_in_provider: 'anonymous'
      },
      auth_time: Date.now(),
      iat: Date.now(),
      exp: Date.now() + 3600
    })
  })
}));

// Mock Google Maps Service
jest.mock('@googlemaps/google-maps-services-js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    reverseGeocode: jest.fn().mockResolvedValue({
      data: {
        status: 'OK',
        results: [{
          formatted_address: 'Test Address, Test City, Test Country',
          place_id: 'test_place_id',
          address_components: [
            {
              long_name: 'Test City',
              short_name: 'Test City',
              types: ['locality']
            },
            {
              long_name: 'Test Country',
              short_name: 'TC',
              types: ['country']
            }
          ],
          geometry: {
            location: { lat: 40.7128, lng: -74.0060 },
            location_type: 'APPROXIMATE'
          },
          types: ['locality']
        }]
      }
    }),
    geocode: jest.fn().mockResolvedValue({
      data: {
        status: 'OK',
        results: [{
          formatted_address: 'Test Address, Test City, Test Country',
          place_id: 'test_place_id',
          address_components: [
            {
              long_name: 'Test City',
              short_name: 'Test City',
              types: ['locality']
            }
          ],
          geometry: {
            location: { lat: 40.7128, lng: -74.0060 },
            location_type: 'ROOFTOP'
          },
          types: ['street_address']
        }]
      }
    })
  }))
}));

describe('Geocoding API', () => {
  const validToken = 'valid-firebase-token';
  
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
      expect(response.body.service).toBe('gmmerchandising-backend');
    });
  });

  describe('POST /api/geocoding/reverse', () => {
    it('should reverse geocode coordinates successfully', async () => {
      const response = await request(app)
        .post('/api/geocoding/reverse')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          latitude: 40.7128,
          longitude: -74.0060
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.coordinates).toEqual({
        latitude: 40.7128,
        longitude: -74.0060
      });
      expect(response.body.user.uid).toBe('test-user-123');
    });

    it('should return 400 for missing coordinates', async () => {
      const response = await request(app)
        .post('/api/geocoding/reverse')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('MISSING_COORDINATES');
    });

    it('should return 400 for invalid coordinates', async () => {
      const response = await request(app)
        .post('/api/geocoding/reverse')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          latitude: 'invalid',
          longitude: -74.0060
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_COORDINATES_FORMAT');
    });

    it('should return 401 for missing auth token', async () => {
      const response = await request(app)
        .post('/api/geocoding/reverse')
        .send({
          latitude: 40.7128,
          longitude: -74.0060
        });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('MISSING_AUTH_HEADER');
    });
  });

  describe('POST /api/geocoding/forward', () => {
    it('should forward geocode address successfully', async () => {
      const response = await request(app)
        .post('/api/geocoding/forward')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          address: 'Test Address, Test City'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.geometry.location).toEqual({
        lat: 40.7128,
        lng: -74.0060
      });
    });

    it('should return 400 for missing address', async () => {
      const response = await request(app)
        .post('/api/geocoding/forward')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('MISSING_ADDRESS');
    });
  });

  describe('GET /api/geocoding/status', () => {
    it('should return service status', async () => {
      const response = await request(app)
        .get('/api/geocoding/status')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.services.googleMaps).toBe('Connected');
      expect(response.body.services.firebase).toBe('Connected');
    });
  });
});
