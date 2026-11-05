#!/usr/bin/env bash
# Monthly restore test: restores the latest snapshot into a temporary folder, loads the dump into a throwaway
# Postgres container and checks that the tables are there. Touches nothing of the running site.
# Run by nepnha-restore-test.timer (root) on the VPS; CI runs it after backup.sh.
set -euo pipefail
# shellcheck source=infra/backup/lib.sh
. "$(dirname "$0")/lib.sh"
load_env

WORK=$(mktemp -d)
NAME="nepnha-restore-test-$$"
on_exit() {
  local rc=$?
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  rm -rf "$WORK"
  if [ "$rc" -ne 0 ]; then
    echo "restore test FAILED (exit $rc)" >&2
    ping_hc /fail
  fi
}
trap on_exit EXIT

echo "restoring the latest snapshot into $WORK"
restic restore latest --tag nepnha --host nepnha --target "$WORK"
DUMP="$WORK$STAGE_DIR/nepnha.dump"
[ -s "$DUMP" ] || { echo "no database dump in the snapshot" >&2; exit 1; }
[ -d "$WORK$MEDIA_HOST_DIR" ] || { echo "no media folder in the snapshot" >&2; exit 1; }
echo "media files in the snapshot: $(find "$WORK$MEDIA_HOST_DIR" -type f | wc -l)"

echo "loading the dump into a throwaway Postgres"
docker run -d --name "$NAME" --network none -e POSTGRES_PASSWORD=restore-test -e POSTGRES_USER=nepnha \
  -e POSTGRES_DB=nepnha postgres:16-alpine >/dev/null
for _ in $(seq 1 60); do
  # pg_isready also answers while the init scripts still run; a query on the final server is the real check.
  if docker exec "$NAME" psql -U nepnha -d nepnha -tAc 'select 1' >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec -i "$NAME" pg_restore -U nepnha -d nepnha --no-owner --exit-on-error < "$DUMP"

tables=$(docker exec "$NAME" psql -U nepnha -d nepnha -tAc \
  "select count(*) from information_schema.tables where table_schema = 'public'")
migrations=$(docker exec "$NAME" psql -U nepnha -d nepnha -tAc \
  "select count(*) from flyway_schema_history where success")
echo "tables: $tables, applied migrations: $migrations"
if [ "$tables" -eq 0 ] || [ "$migrations" -eq 0 ]; then
  echo "the restored database is empty" >&2
  exit 1
fi

ping_hc ""
echo "restore test done"
