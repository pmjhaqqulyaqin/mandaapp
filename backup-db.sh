#!/bin/bash
# =============================================================================
# MandaApp Database Backup Script
# 
# Usage:
#   ./backup-db.sh                    # Manual backup
#   
# Cron (daily at 2 AM):
#   0 2 * * * /path/to/mandaapp/backup-db.sh >> /var/log/mandaapp-backup.log 2>&1
#
# Retention: Keeps last 14 days of backups automatically.
# =============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="${DB_CONTAINER:-mandaapp_db}"
DB_NAME="${DB_NAME:-mandaapp_prod}"
DB_USER="${DB_USER:-postgres}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[BACKUP]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"; }
err() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"; }

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

BACKUP_FILE="${BACKUP_DIR}/mandaapp_${TIMESTAMP}.sql.gz"

log "Starting database backup..."
log "Container: $CONTAINER_NAME | DB: $DB_NAME | User: $DB_USER"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  err "Container '$CONTAINER_NAME' is not running!"
  exit 1
fi

# Perform backup via docker exec + pg_dump, compressed with gzip
if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges | gzip > "$BACKUP_FILE"; then
  FILESIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
  log "✅ Backup completed: $BACKUP_FILE ($FILESIZE)"
else
  err "❌ Backup FAILED!"
  rm -f "$BACKUP_FILE"
  exit 1
fi

# Verify backup is not empty
if [ ! -s "$BACKUP_FILE" ]; then
  err "❌ Backup file is empty! Removing..."
  rm -f "$BACKUP_FILE"
  exit 1
fi

# Clean up old backups (retain last N days)
log "Cleaning backups older than ${RETENTION_DAYS} days..."
DELETED=$(find "$BACKUP_DIR" -name "mandaapp_*.sql.gz" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  log "Deleted $DELETED old backup(s)"
fi

# Summary
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "mandaapp_*.sql.gz" | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log "📊 Total backups: $TOTAL_BACKUPS | Storage used: $TOTAL_SIZE"
log "Done!"
