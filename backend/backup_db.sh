#!/bin/bash

# Define backup directory
BACKUP_DIR="./db_backups"
mkdir -p "$BACKUP_DIR"

# Generate timestamp for the backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PATH="$BACKUP_DIR/attendance_prod_$TIMESTAMP.archive"

# Make sure to set your production MONGODB_URI in the environment before running this
if [ -z "$MONGODB_URI" ]; then
  echo "Error: MONGODB_URI environment variable is not set."
  echo "Usage: MONGODB_URI='your-production-uri' ./backup_db.sh"
  exit 1
fi

echo "Starting database backup..."
# Run mongodump connecting to the MongoDB URI
mongodump --uri="$MONGODB_URI" --archive="$BACKUP_PATH"

if [ $? -eq 0 ]; then
  echo "✅ Backup successfully created at: $BACKUP_PATH"
else
  echo "❌ Backup failed."
  exit 1
fi
