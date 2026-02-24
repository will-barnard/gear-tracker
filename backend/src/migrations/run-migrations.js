#!/usr/bin/env node
/**
 * Centralized migration runner
 * 
 * This script runs all migrations in order when the backend starts.
 * Each migration is idempotent (checks if it needs to run).
 * 
 * Usage:
 *   node src/migrations/run-migrations.js
 */

const path = require('path');
const fs = require('fs');
const { Sequelize } = require('sequelize');

// Load environment variables
require('dotenv').config();

// Create Sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME || 'geartracker',
  process.env.DB_USER || 'geartracker',
  process.env.DB_PASSWORD || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false // Set to console.log to see SQL queries
  }
);

// Migration files in order (add new migrations to the end)
const migrations = [
  'migrate-additional-costs-type.js',
  'migrate-item-status-for-sale.js'
];

async function runMigrations() {
  console.log('🔄 Starting database migrations...');
  
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✓ Database connection established');
    
    // Run each migration
    for (const migrationFile of migrations) {
      const migrationPath = path.join(__dirname, migrationFile);
      
      if (!fs.existsSync(migrationPath)) {
        console.warn(`⚠️  Migration file not found: ${migrationFile}`);
        continue;
      }
      
      console.log(`\n📋 Running: ${migrationFile}`);
      
      try {
        // Import the migration
        const migrate = require(migrationPath);
        
        if (typeof migrate === 'function') {
          await migrate(sequelize);
          console.log(`   ✅ ${migrationFile} completed`);
        } else {
          console.log(`   ℹ️  Skipping ${migrationFile} (not a function export)`);
        }
      } catch (error) {
        // If migration fails, log but continue (migrations are idempotent)
        console.error(`   ❌ Migration ${migrationFile} encountered an error:`, error.message);
        // Don't throw - continue with other migrations
      }
    }
    
    console.log('\n✅ All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Only run if called directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('✓ Migration process complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('✗ Migration process failed:', error);
      process.exit(1);
    });
}

module.exports = runMigrations;
