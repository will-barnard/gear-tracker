#!/bin/sh
# Docker entrypoint script for backend
# This runs migrations before starting the server

set -e

echo "🚀 Starting Gear Tracker Backend..."

# Wait for database to be ready
echo "⏳ Waiting for database..."
timeout=30
counter=0
until node -e "const { Sequelize } = require('sequelize'); const s = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, { host: process.env.DB_HOST, port: process.env.DB_PORT, dialect: 'postgres' }); s.authenticate().then(() => { console.log('Database ready'); process.exit(0); }).catch(() => process.exit(1));" 2>/dev/null; do
  counter=$((counter + 1))
  if [ $counter -gt $timeout ]; then
    echo "❌ Database connection timeout after ${timeout}s"
    exit 1
  fi
  echo "   Waiting for database... (${counter}s)"
  sleep 1
done

echo "✅ Database is ready"

# Run migrations
echo ""
echo "🔄 Running database migrations..."
node src/migrations/run-migrations.js

if [ $? -eq 0 ]; then
  echo "✅ Migrations completed"
else
  echo "⚠️  Warning: Some migrations may have failed, but continuing..."
fi

# Start the application
echo ""
echo "🎸 Starting Gear Tracker server..."
exec "$@"
