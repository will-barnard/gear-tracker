#!/bin/sh
# Docker entrypoint script for backend.
# Waits for postgres, then starts the server. Schema changes are applied by the
# server itself on boot (src/db/migrate.js), so there's nothing to run here.

set -e

echo "🚀 Starting Gear Tracker Backend..."

echo "⏳ Waiting for database..."
timeout=30
counter=0
until node -e "const { Sequelize } = require('sequelize'); const s = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, { host: process.env.DB_HOST, port: process.env.DB_PORT, dialect: 'postgres', logging: false }); s.authenticate().then(() => { console.log('Database ready'); process.exit(0); }).catch(() => process.exit(1));" 2>/dev/null; do
  counter=$((counter + 1))
  if [ $counter -gt $timeout ]; then
    echo "❌ Database connection timeout after ${timeout}s"
    exit 1
  fi
  echo "   Waiting for database... (${counter}s)"
  sleep 1
done

echo "✅ Database is ready"
echo "🎸 Starting Gear Tracker server..."
exec "$@"
