#!/usr/bin/env bash
# Restores the site from a restic snapshot: replaces the database and the uploaded images.
# Usage (root, on the VPS): /opt/nepnha/backup/restore.sh [snapshot-id|latest]
# List the snapshots first with: /opt/nepnha/backup/snapshots.sh
set -euo pipefail
# shellcheck source=infra/backup/lib.sh
. "$(dirname "$0")/lib.sh"
load_env

SNAPSHOT=${1:-latest}
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

echo "This replaces the database and $MEDIA_HOST_DIR with snapshot '$SNAPSHOT'."
echo "The site is down for a short time. Type KHOI PHUC to go on:"
read -r answer
[ "$answer" = "KHOI PHUC" ] || { echo "stopped, nothing changed"; exit 1; }

restic restore "$SNAPSHOT" --target "$WORK"
DUMP="$WORK$STAGE_DIR/nepnha.dump"
[ -s "$DUMP" ] || { echo "no database dump in snapshot $SNAPSHOT" >&2; exit 1; }

echo "stopping web and api"
compose stop web api

echo "restoring the database"
compose exec -T postgres pg_restore -U nepnha -d nepnha --clean --if-exists --no-owner --exit-on-error < "$DUMP"

echo "restoring the images"
if [ -d "$WORK$MEDIA_HOST_DIR" ]; then
  # rsync is not installed by default; cp + a fresh folder gives the same result for this small folder.
  find "$MEDIA_HOST_DIR" -mindepth 1 -delete
  cp -a "$WORK$MEDIA_HOST_DIR/." "$MEDIA_HOST_DIR/"
fi

echo "starting api and web"
# A new web container: its page cache (inside the container) still holds the content from before the restore.
compose up -d --force-recreate api web
echo "restore done"
