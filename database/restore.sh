#!/bin/bash

# Gear Tracker - Database Restore Script
# Usage: ./restore.sh <backup_file>

if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <backup_file>"
    echo "Example: ./restore.sh backups/gear_tracker_backup_20231225_120000.sql"
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Restoring database from: $BACKUP_FILE"
echo "WARNING: This will overwrite the current database!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

# Restore backup
docker exec -i gear-tracker-db psql -U postgres gear_tracker < "$BACKUP_FILE"

echo "Database restored successfully!"
