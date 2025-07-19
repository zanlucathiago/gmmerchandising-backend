#!/usr/bin/env node

/**
 * Cache cleanup script
 * Usage: node scripts/cache-cleanup.js [pattern]
 */

require('dotenv').config();
const redisService = require('../src/config/redis');
const { logger } = require('../src/utils/logger');

async function main() {
  console.log('🧹 Starting cache cleanup...\n');

  if (!redisService.isAvailable()) {
    console.log('❌ Redis is not available. Check your environment configuration.');
    process.exit(1);
  }

  // Test Redis connection
  const pingResult = await redisService.ping();
  if (!pingResult) {
    console.log('❌ Cannot connect to Redis. Check your connection.');
    process.exit(1);
  }

  console.log('✅ Connected to Redis successfully');

  const pattern = process.argv[2];
  
  if (pattern) {
    console.log(`\n🎯 Clearing cache entries matching pattern: ${pattern}`);
    
    // Since Upstash doesn't support KEYS command, we can only clear specific keys
    // For now, let's just attempt to clear the specific key
    const deleted = await redisService.del(pattern);
    
    if (deleted) {
      console.log(`✅ Cleared cache key: ${pattern}`);
    } else {
      console.log(`ℹ️  Key not found or already deleted: ${pattern}`);
    }
  } else {
    console.log(`
ℹ️  Cache cleanup options:

1. Clear specific key:
   npm run cache-cleanup "reverse-geocode:067fba21bab2f4ae3e4dfd2a7a238962"

2. Test a specific key:
   npm run cache-diagnostic "reverse-geocode:067fba21bab2f4ae3e4dfd2a7a238962"

Note: Upstash Redis doesn't support pattern-based deletion.
You'll need to specify exact keys to clear.
`);
  }

  console.log('\n✨ Cache cleanup completed!');
}

// Handle the specific problematic key mentioned in the error
async function clearProblematicKey() {
  const problematicKey = 'reverse-geocode:067fba21bab2f4ae3e4dfd2a7a238962';
  console.log(`\n🔧 Attempting to clear the problematic key: ${problematicKey}`);
  
  try {
    const deleted = await redisService.del(problematicKey);
    if (deleted) {
      console.log('✅ Problematic key cleared successfully');
    } else {
      console.log('ℹ️  Key was not found (may have been already cleared or expired)');
    }
  } catch (error) {
    console.log(`❌ Error clearing problematic key: ${error.message}`);
  }
}

// If no arguments provided, clear the specific problematic key from the error
if (process.argv.length === 2) {
  clearProblematicKey().then(() => {
    main().catch(error => {
      console.error('💥 Cleanup script failed:', error.message);
      process.exit(1);
    });
  });
} else {
  main().catch(error => {
    console.error('💥 Cleanup script failed:', error.message);
    process.exit(1);
  });
}
