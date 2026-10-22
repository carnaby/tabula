#!/bin/bash
# Backs up the Tabula PostgreSQL database (tabula-db container) to a gzipped SQL dump.
#
# Env: BACKUP_DIR (default: ./backups next to this script), DOCKER (default: docker),
#      DB_CONTAINER (default: tabula-db), KEEP_DAYS (default: 30).
#
# Some NAS schedulers / cron run with a PATH that lacks docker -- set DOCKER to its absolute
# path, e.g. DOCKER=/usr/local/bin/docker.
#
# set -o pipefail: without it, `pg_dump | gzip` only reports gzip's exit code, so a failing
# pg_dump (e.g. container down, auth failure) would still exit 0 and silently produce an empty/
# truncated backup. With pipefail, a non-zero exit from pg_dump fails the whole pipeline.
set -o pipefail

BACKUP_DIR="${BACKUP_DIR:-$(dirname "$0")/backups}"
DOCKER="${DOCKER:-docker}"
DB_CONTAINER="${DB_CONTAINER:-tabula-db}"
KEEP_DAYS="${KEEP_DAYS:-30}"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"

"$DOCKER" exec "$DB_CONTAINER" pg_dump -U tabula tabula | gzip > "$BACKUP_DIR/tabula-$DATE.sql.gz"
STATUS=$?

if [ $STATUS -ne 0 ]; then
  echo "Database backup FAILED (exit $STATUS)" >&2
  rm -f "$BACKUP_DIR/tabula-$DATE.sql.gz"
  exit $STATUS
fi

# Clean up old backups
find "$BACKUP_DIR" -name "tabula-*.sql.gz" -mtime +"$KEEP_DAYS" -delete

echo "Database backup completed:"
echo "  - tabula-$DATE.sql.gz"
