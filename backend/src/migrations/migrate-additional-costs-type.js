/**
 * Migration script to handle the additional_costs type column change
 * 
 * This script:
 * 1. Renames the existing 'type' column to 'category' (preserving repair/shipping/parts data)
 * 2. Adds a new 'type' column as ENUM('expense', 'income') with default 'expense'
 * 
 * Run this manually before starting the backend:
 * node backend/src/migrations/migrate-additional-costs-type.js
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
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

async function migrate() {
  try {
    console.log('Starting migration...');
    
    // Check if category column already exists
    const [categoryExists] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='additional_costs' AND column_name='category';
    `);
    
    if (categoryExists.length === 0) {
      console.log('Step 1: Renaming type column to category...');
      await sequelize.query('ALTER TABLE additional_costs RENAME COLUMN type TO category;');
      console.log('✓ Renamed type to category');
    } else {
      console.log('✓ Category column already exists, skipping rename');
    }
    
    // Check if new type column exists
    const [typeColumn] = await sequelize.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns 
      WHERE table_name='additional_costs' AND column_name='type';
    `);
    
    if (typeColumn.length === 0) {
      console.log('Step 2: Creating ENUM type...');
      await sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE enum_additional_costs_type AS ENUM('expense', 'income');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      console.log('✓ Created ENUM type');
      
      console.log('Step 3: Adding new type column...');
      await sequelize.query(`
        ALTER TABLE additional_costs 
        ADD COLUMN type enum_additional_costs_type NOT NULL DEFAULT 'expense';
      `);
      console.log('✓ Added new type column');
      
      console.log('Step 4: Adding comment...');
      await sequelize.query(`
        COMMENT ON COLUMN additional_costs.type IS 'expense for costs added, income for parts sold or credits';
      `);
      console.log('✓ Added column comment');
    } else if (typeColumn[0].udt_name !== 'enum_additional_costs_type') {
      console.log('⚠️  Warning: type column exists but is not the correct ENUM type');
      console.log(`   Current type: ${typeColumn[0].data_type} (${typeColumn[0].udt_name})`);
      console.log('   This likely means the migration was partially applied.');
      console.log('   Please verify the column manually.');
    } else {
      console.log('✓ Type column already migrated correctly');
    }
    
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migrate();
