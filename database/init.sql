-- Gear Tracker Database Initialization Script
-- This script is automatically executed when the PostgreSQL container starts

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- The database 'gear_tracker' is already created by the postgres container
-- Tables will be created by Sequelize when the backend starts

-- You can add any initial seed data here if needed
-- For example, creating a default admin user (password should be hashed in the application)

-- Note: The Sequelize ORM will handle table creation based on the models
-- when the application starts with sync() in development mode
