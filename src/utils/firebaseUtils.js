const { getFirebaseApps, getAllFirebaseAuths } = require('../config/firebase');
const { logger } = require('./logger');

/**
 * Utility functions for managing multiple Firebase configurations
 */

/**
 * Get information about all available Firebase configurations
 * @returns {Object} Configuration information
 */
const getFirebaseConfigInfo = () => {
  try {
    const apps = getFirebaseApps();
    const auths = getAllFirebaseAuths();
    
    return {
      totalConfigurations: Object.keys(apps).length,
      availableConfigurations: Object.keys(apps),
      configurations: auths.map(auth => ({
        name: auth.name,
        projectId: apps[auth.name].options.projectId,
        status: 'active'
      }))
    };
  } catch (error) {
    return {
      totalConfigurations: 0,
      availableConfigurations: [],
      configurations: [],
      error: error.message
    };
  }
};

/**
 * Validate that a specific Firebase configuration is available
 * @param {string} configName - Name of the configuration to validate
 * @returns {boolean} Whether the configuration is available
 */
const isFirebaseConfigAvailable = (configName) => {
  try {
    const apps = getFirebaseApps();
    return apps.hasOwnProperty(configName);
  } catch (error) {
    logger.error(`Error checking Firebase config availability for ${configName}:`, error.message);
    return false;
  }
};

/**
 * Get the project ID for a specific Firebase configuration
 * @param {string} configName - Name of the configuration
 * @returns {string|null} Project ID or null if not found
 */
const getProjectIdForConfig = (configName) => {
  try {
    const apps = getFirebaseApps();
    if (apps[configName]) {
      return apps[configName].options.projectId;
    }
    return null;
  } catch (error) {
    logger.error(`Error getting project ID for config ${configName}:`, error.message);
    return null;
  }
};

/**
 * Verify if a token belongs to a specific Firebase project
 * @param {string} token - Firebase ID token
 * @param {string} configName - Configuration name to verify against
 * @returns {Promise<boolean>} Whether the token is valid for the specified config
 */
const verifyTokenForConfig = async (token, configName) => {
  try {
    const auths = getAllFirebaseAuths();
    const firebaseAuth = auths.find(auth => auth.name === configName);
    
    if (!firebaseAuth) {
      return false;
    }

    await firebaseAuth.auth.verifyIdToken(token);
    return true;
  } catch (error) {
    logger.debug(`Token verification failed for config ${configName}:`, error.message);
    return false;
  }
};

/**
 * Get authentication statistics
 * @returns {Object} Authentication statistics
 */
const getAuthStatistics = () => {
  const configInfo = getFirebaseConfigInfo();
  
  return {
    ...configInfo,
    supportsMultipleConfigs: configInfo.totalConfigurations > 1,
    primaryConfigAvailable: isFirebaseConfigAvailable('primary'),
    anonymousConfigAvailable: isFirebaseConfigAvailable('anonymous'),
    timestamp: new Date().toISOString()
  };
};

/**
 * Log Firebase configuration status
 */
const logFirebaseStatus = () => {
  const stats = getAuthStatistics();
  
  logger.info('🔧 Firebase Configuration Status:');
  logger.info(`   📊 Total Configurations: ${stats.totalConfigurations}`);
  logger.info(`   📋 Available: [${stats.availableConfigurations.join(', ')}]`);
  logger.info(`   🔄 Multi-Config Support: ${stats.supportsMultipleConfigs ? 'Enabled' : 'Disabled'}`);
  logger.info(`   🔑 Primary Config: ${stats.primaryConfigAvailable ? 'Available' : 'Not Available'}`);
  logger.info(`   👤 Anonymous Config: ${stats.anonymousConfigAvailable ? 'Available' : 'Not Available'}`);
  
  if (stats.error) {
    logger.warn(`   ⚠️  Error: ${stats.error}`);
  }
};

module.exports = {
  getFirebaseConfigInfo,
  isFirebaseConfigAvailable,
  getProjectIdForConfig,
  verifyTokenForConfig,
  getAuthStatistics,
  logFirebaseStatus
};