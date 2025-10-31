
const LOG_LEVELS = ['error', 'warn', 'info', 'debug'];
const getLogLevel = () => {
  const envLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info');
  const idx = LOG_LEVELS.indexOf(envLevel.toLowerCase());
  return idx === -1 ? 2 : idx; // default to 'info'
};

function formatLog(level, message, meta) {
  const timestamp = new Date().toISOString();
  let log = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  if (meta && Object.keys(meta).length > 0) {
    log += ' ' + JSON.stringify(meta);
  }
  return log;
}

const logger = {
  error: (message, meta = {}) => {
    if (getLogLevel() >= 0) {
      console.error(formatLog('error', message, meta));
    }
  },
  warn: (message, meta = {}) => {
    if (getLogLevel() >= 1) {
      console.warn(formatLog('warn', message, meta));
    }
  },
  info: (message, meta = {}) => {
    if (getLogLevel() >= 2) {
      console.log(formatLog('info', message, meta));
    }
  },
  debug: (message, meta = {}) => {
    if (getLogLevel() >= 3) {
      console.log(formatLog('debug', message, meta));
    }
  }
};

module.exports = {
  logger
};
