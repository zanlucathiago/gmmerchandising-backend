# GM Merchandising Backend

A secure backend service that provides geocoding functionality using Google Maps API with Firebase authentication.

## Features

- 🗺️ **Reverse Geocoding**: Convert coordinates (latitude, longitude) to addresses
- 📍 **Forward Geocoding**: Convert addresses to coordinates
- 🔐 **Firebase Authentication**: Secure endpoints with Firebase anonymous/registered auth
- 🛡️ **Security**: Rate limiting, CORS, helmet protection
- ✅ **Validation**: Input validation for coordinates and addresses
- 📝 **Logging**: Comprehensive logging system
- 🚀 **Production Ready**: Error handling, environment configuration

## Prerequisites

- Node.js 16+ 
- Firebase project with Authentication enabled
- Google Maps API key with Geocoding API enabled

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd gmmerchandising-backend
npm install
```

### 2. Environment Setup

Copy the example environment file:
```bash
cp .env.example .env
```

Fill in your environment variables in `.env`:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Firebase Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CLIENT_CERT_URL=your-client-cert-url

# Google Maps API
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Optional: CORS origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### 3. Get Firebase Service Account

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project → Project Settings → Service Accounts
3. Click "Generate new private key" 
4. Use the downloaded JSON to fill the Firebase environment variables

### 4. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Geocoding API
3. Create credentials (API Key)
4. Restrict the key to Geocoding API for security

### 5. Run the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

### Authentication

All endpoints require a Firebase ID token in the Authorization header:

```
Authorization: Bearer YOUR_FIREBASE_ID_TOKEN
```

### Endpoints

#### 1. Reverse Geocoding

Convert coordinates to address.

**POST** `/api/geocoding/reverse`

**Request Body:**
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060
}
```

**Response:**
```json
{
  "success": true,
  "message": "Address retrieved successfully",
  "data": {
    "coordinates": {
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "formatted_address": "New York, NY, USA",
    "place_id": "ChIJOwg_06VPwokRYv534QaPC8g",
    "address_components": {
      "street_number": null,
      "route": null,
      "locality": "New York",
      "administrative_area_level_1": "New York",
      "country": "United States",
      "country_code": "US",
      "postal_code": null
    },
    "geometry": {
      "location": {
        "lat": 40.7127753,
        "lng": -74.0059728
      },
      "location_type": "APPROXIMATE"
    }
  },
  "user": {
    "uid": "firebase-user-id",
    "isAnonymous": true
  }
}
```

#### 2. Forward Geocoding

Convert address to coordinates.

**POST** `/api/geocoding/forward`

**Request Body:**
```json
{
  "address": "1600 Amphitheatre Parkway, Mountain View, CA"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Coordinates retrieved successfully",
  "data": {
    "address": "1600 Amphitheatre Parkway, Mountain View, CA",
    "formatted_address": "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA",
    "place_id": "ChIJtYuu0V25j4ARwu5e4wwRYgE",
    "address_components": {
      "street_number": "1600",
      "route": "Amphitheatre Parkway",
      "locality": "Mountain View",
      "administrative_area_level_1": "California",
      "country": "United States",
      "country_code": "US",
      "postal_code": "94043"
    },
    "geometry": {
      "location": {
        "lat": 37.4224764,
        "lng": -122.0842499
      },
      "location_type": "ROOFTOP"
    }
  },
  "user": {
    "uid": "firebase-user-id", 
    "isAnonymous": false
  }
}
```

#### 3. Service Status

Check service health and authentication.

**GET** `/api/geocoding/status`

**Response:**
```json
{
  "success": true,
  "message": "Geocoding service is operational",
  "timestamp": "2025-07-15T10:30:00.000Z",
  "user": {
    "uid": "firebase-user-id",
    "isAnonymous": true,
    "provider": "anonymous"
  },
  "services": {
    "googleMaps": "Connected",
    "firebase": "Connected"
  }
}
```

#### 4. Health Check

Basic health check (no authentication required).

**GET** `/health`

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-07-15T10:30:00.000Z",
  "service": "gmmerchandising-backend"
}
```

## Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2025-07-15T10:30:00.000Z"
}
```

### Common Error Codes

**Authentication Errors:**
- `MISSING_AUTH_HEADER` - Authorization header missing
- `MISSING_TOKEN` - Bearer token missing
- `TOKEN_EXPIRED` - Firebase token expired
- `TOKEN_REVOKED` - Firebase token revoked
- `INVALID_TOKEN` - Invalid token format
- `AUTH_FAILED` - General authentication failure

**Validation Errors:**
- `MISSING_COORDINATES` - Latitude or longitude missing
- `INVALID_COORDINATES_FORMAT` - Invalid coordinate format
- `INVALID_LATITUDE_RANGE` - Latitude out of range (-90 to 90)
- `INVALID_LONGITUDE_RANGE` - Longitude out of range (-180 to 180)
- `MISSING_ADDRESS` - Address missing
- `INVALID_ADDRESS_FORMAT` - Address not a string
- `EMPTY_ADDRESS` - Address is empty
- `ADDRESS_TOO_LONG` - Address exceeds 500 characters

## Client Integration Examples

### JavaScript (Frontend)

```javascript
// Initialize Firebase Auth (anonymous)
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  // Your Firebase config
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Sign in anonymously and get token
async function getAuthToken() {
  const userCredential = await signInAnonymously(auth);
  return await userCredential.user.getIdToken();
}

// Reverse geocoding function
async function reverseGeocode(latitude, longitude) {
  const token = await getAuthToken();
  
  const response = await fetch('http://localhost:3000/api/geocoding/reverse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ latitude, longitude })
  });
  
  return await response.json();
}

// Usage
reverseGeocode(40.7128, -74.0060)
  .then(result => console.log(result))
  .catch(error => console.error(error));
```

### Python Client

```python
import requests
import firebase_admin
from firebase_admin import auth, credentials

# Initialize Firebase Admin (for testing)
cred = credentials.Certificate('path/to/serviceAccountKey.json')
firebase_admin.initialize_app(cred)

# Create custom token for testing (in production, use client SDK)
def get_test_token():
    custom_token = auth.create_custom_token('test-user')
    # In production, exchange this on client side for ID token
    return custom_token

def reverse_geocode(latitude, longitude, token):
    url = 'http://localhost:3000/api/geocoding/reverse'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }
    data = {
        'latitude': latitude,
        'longitude': longitude
    }
    
    response = requests.post(url, json=data, headers=headers)
    return response.json()

# Usage
# token = get_firebase_id_token()  # Get from Firebase client SDK
# result = reverse_geocode(40.7128, -74.0060, token)
# print(result)
```

## Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS Protection**: Configurable allowed origins
- **Helmet.js**: Security headers
- **Input Validation**: Coordinates and address validation
- **Firebase Auth**: Secure token verification
- **Error Sanitization**: No sensitive data in production errors

## Development

### Project Structure

```
src/
├── config/          # Configuration files
│   └── firebase.js  # Firebase Admin SDK setup
├── middleware/      # Express middleware
│   ├── auth.js      # Firebase authentication
│   ├── errorHandler.js
│   └── validation.js
├── routes/          # API routes
│   └── geocoding.js # Geocoding endpoints
├── services/        # External service integrations
│   └── googleMapsService.js
├── utils/           # Utility functions
│   └── logger.js    # Logging utility
└── index.js         # Main application entry
```

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests (Jest)

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | No | Environment (development/production) |
| `PORT` | No | Server port (default: 3000) |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `FIREBASE_PRIVATE_KEY_ID` | Yes | Firebase service account private key ID |
| `FIREBASE_PRIVATE_KEY` | Yes | Firebase service account private key |
| `FIREBASE_CLIENT_EMAIL` | Yes | Firebase service account email |
| `FIREBASE_CLIENT_ID` | Yes | Firebase service account client ID |
| `FIREBASE_CLIENT_CERT_URL` | Yes | Firebase service account cert URL |
| `GOOGLE_MAPS_API_KEY` | Yes | Google Maps Geocoding API key |
| `ALLOWED_ORIGINS` | No | CORS allowed origins (comma-separated) |

## License

ISC

## Support

For issues and questions, please create an issue in the repository.
