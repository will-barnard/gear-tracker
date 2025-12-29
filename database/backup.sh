#!/bin/bash

# Gear Tracker - Database Backup Script
# Run this script to create a backup of your PostgreSQL database

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="gear_tracker_backup_${TIMESTAMP}.sql"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create backup
docker exec gear-tracker-db pg_dump -U postgres gear_tracker > "${BACKUP_DIR}/${BACKUP_FILE}"

echo "Backup created: ${BACKUP_DIR}/${BACKUP_FILE}"

# Optional: Keep only last 7 backups
cd $BACKUP_DIR
ls -t gear_tracker_backup_*.sql | tail -n +8 | xargs -r rm

echo "Old backups cleaned up (keeping last 7)"
