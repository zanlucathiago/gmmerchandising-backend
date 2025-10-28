const { admin, getAllFirebaseAuths } = require('../config/firebase');
const { logger } = require('../utils/logger');

const authenticateFirebaseToken = async (req, res, next) => {
  try {
    // Log incoming request
    const timestamp = new Date().toISOString();
    logger.info(`${'🔥'.repeat(30)}`);
    logger.info(`🔐 [${timestamp}] Authenticating ${req.method} ${req.originalUrl}`);
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'Authorization header is required',
        code: 'MISSING_AUTH_HEADER'
      });
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({
        error: 'Bearer token is required',
        code: 'MISSING_TOKEN'
      });
    }

    // Get all Firebase auth instances
    const firebaseAuths = getAllFirebaseAuths();
    
    let decodedToken = null;
    let authenticatedWith = null;
    let lastError = null;

    // Try to authenticate with each Firebase configuration
    for (const firebaseAuth of firebaseAuths) {
      try {
        logger.info(`Attempting authentication with Firebase config: ${firebaseAuth.name}`);
        decodedToken = await firebaseAuth.auth.verifyIdToken(token);
        authenticatedWith = firebaseAuth.name;
        logger.info(`✅ Successfully authenticated with Firebase config: ${firebaseAuth.name}`);
        break;
      } catch (error) {
        lastError = error;
        logger.info(`❌ Authentication failed with Firebase config: ${firebaseAuth.name} - ${error.message}`);
        continue;
      }
    }

    // If authentication failed with all configurations
    if (!decodedToken) {
      logger.error('Firebase token verification failed with all configurations:', lastError?.message);
      
      // Handle specific Firebase Auth errors from the last attempt
      if (lastError?.code === 'auth/id-token-expired') {
        return res.status(401).json({
          error: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        });
      } else if (lastError?.code === 'auth/id-token-revoked') {
        return res.status(401).json({
          error: 'Token has been revoked',
          code: 'TOKEN_REVOKED'
        });
      } else if (lastError?.code === 'auth/invalid-id-token') {
        return res.status(401).json({
          error: 'Invalid token format',
          code: 'INVALID_TOKEN'
        });
      }

      return res.status(401).json({
        error: 'Authentication failed with all Firebase configurations',
        code: 'AUTH_FAILED'
      });
    }

    // Check if the user is anonymous (if you want to specifically validate anonymous users)
    if (!decodedToken.firebase.sign_in_provider) {
      return res.status(401).json({
        error: 'Invalid authentication provider',
        code: 'INVALID_PROVIDER'
      });
    }

    // Add user information to request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      isAnonymous: decodedToken.firebase.sign_in_provider === 'anonymous',
      provider: decodedToken.firebase.sign_in_provider,
      authTime: decodedToken.auth_time,
      issuedAt: decodedToken.iat,
      expiresAt: decodedToken.exp,
      authenticatedWith: authenticatedWith // Which Firebase config was used
    };

    logger.info(`Authenticated user: ${decodedToken.uid} (${req.user.isAnonymous ? 'anonymous' : 'registered'}) via ${authenticatedWith} config`);
    next();
  } catch (error) {
    logger.error('Unexpected error during authentication:', error.message);
    
    return res.status(500).json({
      error: 'Internal authentication error',
      code: 'INTERNAL_AUTH_ERROR'
    });
  }
};

// Middleware específico para autenticar apenas com uma configuração Firebase específica
const authenticateWithSpecificFirebase = (configName) => {
  return async (req, res, next) => {
    try {
      const timestamp = new Date().toISOString();
      logger.info(`🔐 [${timestamp}] Authenticating ${req.method} ${req.originalUrl} with ${configName} config`);
      
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({
          error: 'Authorization header is required',
          code: 'MISSING_AUTH_HEADER'
        });
      }

      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;

      if (!token) {
        return res.status(401).json({
          error: 'Bearer token is required',
          code: 'MISSING_TOKEN'
        });
      }

      const firebaseAuths = getAllFirebaseAuths();
      const firebaseAuth = firebaseAuths.find(auth => auth.name === configName);

      if (!firebaseAuth) {
        return res.status(500).json({
          error: `Firebase configuration '${configName}' not found`,
          code: 'CONFIG_NOT_FOUND'
        });
      }

      const decodedToken = await firebaseAuth.auth.verifyIdToken(token);

      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || null,
        isAnonymous: decodedToken.firebase.sign_in_provider === 'anonymous',
        provider: decodedToken.firebase.sign_in_provider,
        authTime: decodedToken.auth_time,
        issuedAt: decodedToken.iat,
        expiresAt: decodedToken.exp,
        authenticatedWith: configName
      };

      logger.info(`Authenticated user: ${decodedToken.uid} with ${configName} config`);
      next();
    } catch (error) {
      logger.error(`Firebase token verification failed with ${configName}:`, error.message);
      
      if (error.code === 'auth/id-token-expired') {
        return res.status(401).json({
          error: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        });
      } else if (error.code === 'auth/id-token-revoked') {
        return res.status(401).json({
          error: 'Token has been revoked',
          code: 'TOKEN_REVOKED'
        });
      } else if (error.code === 'auth/invalid-id-token') {
        return res.status(401).json({
          error: 'Invalid token format',
          code: 'INVALID_TOKEN'
        });
      }

      return res.status(401).json({
        error: `Authentication failed with ${configName}`,
        code: 'AUTH_FAILED'
      });
    }
  };
};

module.exports = {
  authenticateFirebaseToken,
  authenticateWithSpecificFirebase
};
