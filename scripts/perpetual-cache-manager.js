#!/usr/bin/env node

/**
 * Perpetual Cache Management Script
 * 
 * This script helps manage the perpetual geocoding cache for the GM Merchandising Backend.
 * It provides utilities to check cache status, migrate existing cache, and perform maintenance.
 * 
 * Usage:
 * node scripts/perpetual-cache-manager.js [command]
 * 
 * Commands:
 * - status: Check cache status and statistics
 * - health: Perform health check
 * - migrate: Migrate existing cache entries to perpetual
 * - info: Show detailed information about perpetual caching
 */

require('dotenv').config();
const redisService = require('../src/config/redis');
const perpetualCache = require('../src/utils/perpetualCache');
const { logger } = require('../src/utils/logger');

class PerpetualCacheManager {
  constructor() {
    this.commands = {
      status: this.showStatus.bind(this),
      health: this.performHealthCheck.bind(this),
      migrate: this.migrateToPerpetual.bind(this),
      info: this.showInfo.bind(this),
      help: this.showHelp.bind(this)
    };
  }

  async run() {
    const command = process.argv[2] || 'help';
    
    console.log('🚀 GM Merchandising - Perpetual Cache Manager');
    console.log('=' .repeat(50));
    
    if (this.commands[command]) {
      try {
        await this.commands[command]();
      } catch (error) {
        console.error('❌ Command failed:', error.message);
        process.exit(1);
      }
    } else {
      console.log(`❌ Unknown command: ${command}`);
      this.showHelp();
      process.exit(1);
    }
  }

  async showStatus() {
    console.log('📊 Cache Status Check');
    console.log('-'.repeat(30));
    
    try {
      // Check Redis connection
      const isAvailable = redisService.isAvailable();
      const ping = isAvailable ? await redisService.ping() : false;
      
      console.log(`Redis Available: ${isAvailable ? '✅' : '❌'}`);
      console.log(`Redis Ping: ${ping ? '✅ PONG' : '❌ No response'}`);
      
      if (isAvailable && ping) {
        const stats = await perpetualCache.getStats();
        console.log('\n📈 Cache Statistics:');
        console.log(`Strategy: ${stats.perpetualStrategy || 'Unknown'}`);
        
        if (stats.benefits) {
          console.log('\n✨ Benefits:');
          stats.benefits.forEach(benefit => console.log(`  • ${benefit}`));
        }
        
        if (stats.recommendations) {
          console.log('\n💡 Recommendations:');
          stats.recommendations.forEach(rec => console.log(`  • ${rec}`));
        }
      }
    } catch (error) {
      console.error('❌ Status check failed:', error.message);
    }
  }

  async performHealthCheck() {
    console.log('🔍 Health Check');
    console.log('-'.repeat(30));
    
    try {
      const health = await perpetualCache.healthCheck();
      
      console.log(`Overall Status: ${this.getStatusIcon(health.status)} ${health.status.toUpperCase()}`);
      
      if (health.checks) {
        console.log('\n🔧 Detailed Checks:');
        health.checks.forEach(check => {
          const icon = check.status === 'pass' ? '✅' : '❌';
          console.log(`  ${icon} ${check.name}: ${check.message}`);
        });
      }
      
      if (health.warnings && health.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        health.warnings.forEach(warning => console.log(`  • ${warning}`));
      }
      
      if (health.recommendations && health.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        health.recommendations.forEach(rec => console.log(`  • ${rec}`));
      }
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
    }
  }

  async migrateToPerpetual() {
    console.log('🔄 Migrating to Perpetual Cache');
    console.log('-'.repeat(30));
    
    try {
      console.log('Starting migration process...');
      const results = await perpetualCache.migrateToPerpetual();
      
      if (results.success) {
        console.log('✅ Migration completed successfully!');
        console.log(`Total processed: ${results.totalProcessed || 0}`);
        console.log(`Successful: ${results.successCount || 0}`);
        console.log(`Errors: ${results.errorCount || 0}`);
      } else {
        console.log('❌ Migration failed:', results.message);
        if (results.error) {
          console.log('Error details:', results.error);
        }
      }
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
    }
  }

  showInfo() {
    console.log('📚 Perpetual Cache Information');
    console.log('-'.repeat(30));
    
    console.log('🎯 What is Perpetual Cache?');
    console.log('Perpetual cache stores geocoding responses without expiration,');
    console.log('ensuring that once a location is geocoded, it never needs to be');
    console.log('looked up again from the Google Maps API.');
    
    console.log('\n✨ Key Benefits:');
    console.log('  • Zero cache misses for previously geocoded locations');
    console.log('  • Significant reduction in Google Maps API costs');
    console.log('  • Dramatically improved response times');
    console.log('  • Better user experience with instant responses');
    console.log('  • Reduced dependency on external API availability');
    
    console.log('\n🔧 How it works:');
    console.log('  1. First request for a location hits Google Maps API');
    console.log('  2. Response is cached in Redis with no expiration');
    console.log('  3. Subsequent requests for same location served from cache');
    console.log('  4. Cache persists until manually cleared or Redis restart');
    
    console.log('\n📊 Monitoring:');
    console.log('  • Use /api/geocoding/cache/stats for statistics');
    console.log('  • Use /api/geocoding/cache/info for specific cache keys');
    console.log('  • Monitor Redis memory usage in production');
    
    console.log('\n⚠️  Considerations:');
    console.log('  • Monitor Redis memory usage');
    console.log('  • Consider cleanup for very old or invalid entries');
    console.log('  • Ensure Redis backup for important data');
    console.log('  • Fallback to Google Maps API if Redis is unavailable');
  }

  showHelp() {
    console.log('📖 Available Commands:');
    console.log('-'.repeat(30));
    console.log('status   - Check cache status and statistics');
    console.log('health   - Perform comprehensive health check');
    console.log('migrate  - Migrate existing cache entries to perpetual');
    console.log('info     - Show detailed information about perpetual caching');
    console.log('help     - Show this help message');
    
    console.log('\n💡 Usage Examples:');
    console.log('node scripts/perpetual-cache-manager.js status');
    console.log('node scripts/perpetual-cache-manager.js health');
    console.log('node scripts/perpetual-cache-manager.js migrate');
  }

  getStatusIcon(status) {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'unhealthy': return '❌';
      case 'error': return '💥';
      default: return '❓';
    }
  }
}

// Run the manager if this script is executed directly
if (require.main === module) {
  const manager = new PerpetualCacheManager();
  manager.run().then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  }).catch(error => {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = PerpetualCacheManager;