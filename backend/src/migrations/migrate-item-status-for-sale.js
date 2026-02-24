/**
 * Migration script to add 'for_sale' status to items
 * 
 * This script:
 * 1. Drops the existing status ENUM constraint
 * 2. Recreates the constraint with 'owned', 'for_sale', 'sold' values
 * 
 * Run this manually before starting the backend:
 * node backend/src/migrations/migrate-item-status-for-sale.js
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
    console.log('Starting migration to add for_sale status...');
    
    // Check current enum values
    const [enumValues] = await sequelize.query(`
      SELECT e.enumlabel 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname = 'enum_items_status';
    `);
    
    const currentValues = enumValues.map(v => v.enumlabel);
    console.log('Current status values:', currentValues);
    
    if (currentValues.includes('for_sale')) {
      console.log('✓ for_sale status already exists, skipping migration');
      return;
    }
    
    console.log('Step 1: Adding for_sale to status enum...');
    
    // Add the new enum value
    await sequelize.query(`
      ALTER TYPE enum_items_status ADD VALUE IF NOT EXISTS 'for_sale' BEFORE 'sold';
    `);
    
    console.log('✓ Successfully added for_sale status');
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
