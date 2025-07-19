#!/usr/bin/env node

/**
 * Cache diagnostic and repair script
 * Usage: node scripts/cache-diagnostic.js
 */

require('dotenv').config();
const cacheDiagnostic = require('../src/utils/cacheDiagnostic');
const { logger } = require('../src/utils/logger');

async function main() {
  console.log('🔍 Running cache diagnostic...\n');

  // Run full diagnostic
  const results = await cacheDiagnostic.runDiagnostic();

  console.log('📊 Diagnostic Results:');
  console.log(`├── Redis Available: ${results.redisAvailable ? '✅' : '❌'}`);
  console.log(`├── Ping Success: ${results.pingSuccess ? '✅' : '❌'}`);
  console.log(`├── Set Success: ${results.setSuccess ? '✅' : '❌'}`);
  console.log(`├── Get Success: ${results.getSuccess ? '✅' : '❌'}`);
  console.log(`└── Data Integrity: ${results.dataIntegrity ? '✅' : '❌'}`);

  if (results.errors.length > 0) {
    console.log('\n❗ Errors found:');
    results.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

  // Test specific problematic key if provided as argument
  const testKey = process.argv[2];
  if (testKey) {
    console.log(`\n🔍 Testing specific key: ${testKey}`);
    const keyTest = await cacheDiagnostic.testCacheKey(testKey);
    
    console.log('📋 Key Test Results:');
    console.log(`├── Key Exists: ${keyTest.keyExists ? '✅' : '❌'}`);
    console.log(`├── Data Valid: ${keyTest.dataValid ? '✅' : '❌'}`);
    console.log(`├── Data Type: ${keyTest.dataType}`);
    
    if (keyTest.error) {
      console.log(`└── Error: ${keyTest.error}`);
      
      // Offer to fix the corrupted key
      console.log('\n🔧 Attempting to fix corrupted key...');
      const fixed = await cacheDiagnostic.fixCorruptedKey(testKey);
      console.log(`Fix result: ${fixed ? '✅ Fixed' : '❌ Failed to fix'}`);
    }

    if (keyTest.rawData && keyTest.dataType === 'string') {
      console.log(`Raw data preview: ${keyTest.rawData.substring(0, 100)}...`);
    }
  }

  console.log('\n✨ Cache diagnostic completed!');
  
  if (results.redisAvailable && results.pingSuccess && results.getSuccess && results.setSuccess && results.dataIntegrity) {
    console.log('🎉 Cache is working perfectly!');
    process.exit(0);
  } else {
    console.log('⚠️  Cache has issues that need attention.');
    process.exit(1);
  }
}

// Run the diagnostic
main().catch(error => {
  console.error('💥 Diagnostic script failed:', error.message);
  process.exit(1);
});
