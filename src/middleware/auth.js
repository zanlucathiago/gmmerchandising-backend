const { admin } = require('../config/firebase');
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

    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
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
      expiresAt: decodedToken.exp
    };

    logger.info(`Authenticated user: ${decodedToken.uid} (${req.user.isAnonymous ? 'anonymous' : 'registered'})`);
    next();
  } catch (error) {
    logger.error('Firebase token verification failed:', error.message);
    
    // Handle specific Firebase Auth errors
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
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
};

module.exports = {
  authenticateFirebaseToken
};
