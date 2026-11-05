#!/usr/bin/env bash
# Restores the site from a restic snapshot: replaces the database and the uploaded images.
# Usage (root, on the VPS): /opt/nepnha/backup/restore.sh [snapshot-id|latest]
# List the snapshots first with: /opt/nepnha/backup/snapshots.sh
set -euo pipefail
# shellcheck source=infra/backup/lib.sh
. "$(dirname "$0")/lib.sh"
# Root only: the images belong to UID 10001. Checked before anything is changed, so a run without the
# rights cannot drop the database and then stop half way.
if [ "$(id -u)" != 0 ]; then echo "run as root: sudo bash $0 ${1:-latest}" >&2; exit 1; fi
load_env

SNAPSHOT=${1:-latest}
WORK=$(work_dir)
trap 'rm -rf "$WORK"' EXIT

echo "This replaces the database and $MEDIA_HOST_DIR with snapshot '$SNAPSHOT'."
echo "The site is down for a short time. Type KHOI PHUC to go on:"
read -r answer
[ "$answer" = "KHOI PHUC" ] || { echo "stopped, nothing changed"; exit 1; }

restic restore "$SNAPSHOT" --tag nepnha --host nepnha --target "$WORK"
DUMP="$WORK$STAGE_DIR/nepnha.dump"
[ -s "$DUMP" ] || { echo "no database dump in snapshot $SNAPSHOT" >&2; exit 1; }

echo "stopping web and api"
compose stop web api

echo "restoring the database"
# Drop the whole schema first: "pg_restore --clean" drops only the objects in the dump, so tables of a newer
# migration would stay while flyway_schema_history goes back, and Flyway would fail on the next start.
compose exec -T postgres psql -U nepnha -d nepnha -v ON_ERROR_STOP=1 -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
compose exec -T postgres pg_restore -U nepnha -d nepnha --no-owner --exit-on-error --single-transaction < "$DUMP"

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
