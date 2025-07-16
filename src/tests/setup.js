// Test setup file
process.env.NODE_ENV = 'test';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FIREBASE_PRIVATE_KEY_ID = 'test-key-id';
process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----\n';
process.env.FIREBASE_CLIENT_EMAIL = 'test@test-project.iam.gserviceaccount.com';
process.env.FIREBASE_CLIENT_ID = 'test-client-id';
process.env.FIREBASE_CLIENT_CERT_URL = 'https://test.googleapis.com/test';
process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';
