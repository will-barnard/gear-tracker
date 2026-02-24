/**
 * Migration script to add is_listed_online column to items
 * 
 * This script:
 * 1. Adds a boolean column to track if an item is actively listed in online marketplaces
 * 
 * Run this manually before starting the backend:
 * node backend/src/migrations/migrate-add-is-listed-online.js
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

async function migrate(sequelizeInstance) {
  // Use provided instance or create new one
  const sequelize = sequelizeInstance || new Sequelize(
    process.env.DB_NAME || 'geartracker',
    process.env.DB_USER || 'geartracker',
    process.env.DB_PASSWORD || 'password',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: console.log
    }
  );

  try {
    console.log('Starting migration to add is_listed_online column...');
    
    // Check if column already exists
    const [columnExists] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='items' AND column_name='is_listed_online';
    `);
    
    if (columnExists.length > 0) {
      console.log('✓ is_listed_online column already exists, skipping migration');
      return;
    }
    
    console.log('Step 1: Adding is_listed_online column...');
    
    await sequelize.query(`
      ALTER TABLE items 
      ADD COLUMN is_listed_online BOOLEAN NOT NULL DEFAULT false;
    `);
    
    console.log('✓ Successfully added is_listed_online column');
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    // Only close if we created our own instance
    if (!sequelizeInstance) {
      await sequelize.close();
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = migrate;
