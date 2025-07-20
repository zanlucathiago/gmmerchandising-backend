const logger = {
  info: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    const logMessage = Object.keys(meta).length > 0 
      ? `[${timestamp}] INFO: ${message} ${JSON.stringify(meta)}`
      : `[${timestamp}] INFO: ${message}`;
    console.log(logMessage);
  },
  
  error: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    const logMessage = Object.keys(meta).length > 0 
      ? `[${timestamp}] ERROR: ${message} ${JSON.stringify(meta)}`
      : `[${timestamp}] ERROR: ${message}`;
    console.error(logMessage);
  },
  
  warn: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    const logMessage = Object.keys(meta).length > 0 
      ? `[${timestamp}] WARN: ${message} ${JSON.stringify(meta)}`
      : `[${timestamp}] WARN: ${message}`;
    console.warn(logMessage);
  },
  
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      const logMessage = Object.keys(meta).length > 0 
        ? `[${timestamp}] DEBUG: ${message} ${JSON.stringify(meta)}`
        : `[${timestamp}] DEBUG: ${message}`;
      console.log(logMessage);
    }
  }
};

module.exports = {
  logger
};
