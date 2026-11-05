#!/usr/bin/env bash
# Monthly restore test: restores the latest snapshot into a temporary folder, loads the dump into a throwaway
# Postgres container and checks that the tables are there. Touches nothing of the running site.
# Run by nepnha-restore-test.timer (root) on the VPS; CI runs it after backup.sh.
set -euo pipefail
# shellcheck source=infra/backup/lib.sh
. "$(dirname "$0")/lib.sh"
load_env
# The monthly test has its own check, so its result never hides or fakes the result of the nightly backup.
HEALTHCHECK_URL=${RESTORE_HEALTHCHECK_URL:-}

WORK=$(work_dir)
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
  # Over TCP (-h 127.0.0.1): the temporary server of the image entrypoint listens only on the unix socket,
  # so a TCP answer comes from the final server.
  if docker exec "$NAME" psql -h 127.0.0.1 -U nepnha -d nepnha -tAc 'select 1' >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec -i "$NAME" pg_restore -h 127.0.0.1 -U nepnha -d nepnha --no-owner --exit-on-error < "$DUMP"

tables=$(docker exec "$NAME" psql -h 127.0.0.1 -U nepnha -d nepnha -tAc \
  "select count(*) from information_schema.tables where table_schema = 'public'")
migrations=$(docker exec "$NAME" psql -h 127.0.0.1 -U nepnha -d nepnha -tAc \
  "select count(*) from flyway_schema_history where success")
echo "tables: $tables, applied migrations: $migrations"
if [ "$tables" -eq 0 ] || [ "$migrations" -eq 0 ]; then
  echo "the restored database is empty" >&2
  exit 1
fi

ping_hc ""
echo "restore test done"
