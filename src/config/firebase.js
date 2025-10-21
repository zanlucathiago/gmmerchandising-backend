const admin = require('firebase-admin');
const { logger } = require('../utils/logger');

let firebaseApps = {};

const createFirebaseConfig = (configName, envPrefix) => {
  const requiredEnvVars = [
    `${envPrefix}_PROJECT_ID`,
    `${envPrefix}_PRIVATE_KEY_ID`,
    `${envPrefix}_PRIVATE_KEY`,
    `${envPrefix}_CLIENT_EMAIL`,
    `${envPrefix}_CLIENT_ID`
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    logger.warn(`Missing Firebase environment variables for ${configName}: ${missingVars.join(', ')}`);
    return null;
  }

  return {
    type: "service_account",
    project_id: process.env[`${envPrefix}_PROJECT_ID`],
    private_key_id: process.env[`${envPrefix}_PRIVATE_KEY_ID`],
    private_key: process.env[`${envPrefix}_PRIVATE_KEY`].replace(/\\n/g, '\n'),
    client_email: process.env[`${envPrefix}_CLIENT_EMAIL`],
    client_id: process.env[`${envPrefix}_CLIENT_ID`],
    auth_uri: process.env[`${envPrefix}_AUTH_URI`] || "https://accounts.google.com/o/oauth2/auth",
    token_uri: process.env[`${envPrefix}_TOKEN_URI`] || "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env[`${envPrefix}_CLIENT_CERT_URL`]
  };
};

const initializeFirebase = () => {
  try {
    if (Object.keys(firebaseApps).length > 0) {
      return firebaseApps;
    }

    // Configuration for primary Firebase project
    const primaryConfig = createFirebaseConfig('primary', 'FIREBASE');
    if (primaryConfig) {
      firebaseApps.primary = admin.initializeApp({
        credential: admin.credential.cert(primaryConfig),
        projectId: primaryConfig.project_id
      }, 'primary');
      logger.info('Primary Firebase Admin SDK initialized successfully');
    }

    // Configuration for anonymous Firebase project
    const anonymousConfig = createFirebaseConfig('anonymous', 'FIREBASE_ANONYMOUS');
    if (anonymousConfig) {
      firebaseApps.anonymous = admin.initializeApp({
        credential: admin.credential.cert(anonymousConfig),
        projectId: anonymousConfig.project_id
      }, 'anonymous');
      logger.info('Anonymous Firebase Admin SDK initialized successfully');
    }

    // Ensure at least one configuration exists
    if (Object.keys(firebaseApps).length === 0) {
      throw new Error('No valid Firebase configurations found. Please check your environment variables.');
    }

    logger.info(`Firebase initialized with ${Object.keys(firebaseApps).length} configuration(s): ${Object.keys(firebaseApps).join(', ')}`);
    return firebaseApps;
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK:', error.message);
    throw error;
  }
};

const getFirebaseApp = (appName = 'primary') => {
  if (!firebaseApps[appName]) {
    throw new Error(`Firebase Admin SDK not initialized for app: ${appName}`);
  }
  return firebaseApps[appName];
};

const getFirebaseApps = () => {
  if (Object.keys(firebaseApps).length === 0) {
    throw new Error('No Firebase Admin SDK apps initialized');
  }
  return firebaseApps;
};

const getAllFirebaseAuths = () => {
  const apps = getFirebaseApps();
  return Object.keys(apps).map(appName => ({
    name: appName,
    auth: apps[appName].auth()
  }));
};

module.exports = {
  initializeFirebase,
  getFirebaseApp,
  getFirebaseApps,
  getAllFirebaseAuths,
  admin
};
