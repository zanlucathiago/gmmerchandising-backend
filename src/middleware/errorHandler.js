const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Default error
  let error = {
    message: 'Internal Server Error',
    status: 500
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    error.message = 'Validation Error';
    error.status = 400;
    error.details = err.message;
  } else if (err.name === 'CastError') {
    error.message = 'Invalid data format';
    error.status = 400;
  } else if (err.code === 11000) {
    error.message = 'Duplicate field value';
    error.status = 400;
  } else if (err.message.includes('Google Maps API error')) {
    error.message = 'Geocoding service error';
    error.status = 503;
    error.details = err.message;
  } else if (err.message.includes('Firebase')) {
    error.message = 'Authentication service error';
    error.status = 503;
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production') {
    delete error.details;
  }

  res.status(error.status).json({
    error: error.message,
    ...(error.details && { details: error.details }),
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  errorHandler
};
