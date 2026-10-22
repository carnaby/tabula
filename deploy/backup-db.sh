#!/bin/bash
# /srv/tabula/backup-db.sh
# Backs up the tabula PostgreSQL database (tabula-db container).
#
# Absolute docker path: on this NAS, non-interactive shells (cron, NAS Task Scheduler, and
# `ssh host cmd`) get PATH /usr/bin:/bin:/usr/sbin:/sbin, which does NOT include /usr/local/bin --
# that's where NAS Container Manager symlinks `docker`
# (-> /var/packages/ContainerManager/target/usr/bin/docker). A bare `docker` here would fail with
# "command not found" under NAS Task Scheduler exactly the way it does over a non-interactive ssh
# session, so every docker invocation below uses the absolute path.
#
# set -o pipefail: without it, `pg_dump | gzip` only reports gzip's exit code, so a failing
# pg_dump (e.g. container down, auth failure) would still exit 0 and silently produce an empty/
# truncated backup. With pipefail, a non-zero exit from pg_dump fails the whole pipeline and this
# script exits non-zero.
set -o pipefail

BACKUP_DIR="/srv/tabula/backups"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"

/usr/local/bin/docker exec tabula-db pg_dump -U tabula tabula | gzip > "$BACKUP_DIR/tabula-$DATE.sql.gz"
STATUS=$?

if [ $STATUS -ne 0 ]; then
  echo "Database backup FAILED (exit $STATUS)" >&2
  rm -f "$BACKUP_DIR/tabula-$DATE.sql.gz"
  exit $STATUS
fi

# Clean up old backups (30+ days)
find "$BACKUP_DIR" -name "tabula-*.sql.gz" -mtime +30 -delete

echo "Database backup completed:"
echo "  - tabula-$DATE.sql.gz"
