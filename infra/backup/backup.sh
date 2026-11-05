#!/usr/bin/env bash
# Nightly backup: pg_dump of the database + the uploaded images -> one restic snapshot (encrypted).
# Keeps 7 daily and 4 weekly snapshots. Run by nepnha-backup.timer (root) on the VPS.
set -euo pipefail
# shellcheck source=infra/backup/lib.sh
. "$(dirname "$0")/lib.sh"
load_env

on_exit() {
  local rc=$?
  rm -f "$STAGE_DIR/nepnha.dump"
  if [ "$rc" -ne 0 ]; then
    echo "backup FAILED (exit $rc)" >&2
    ping_hc /fail
  fi
}
trap on_exit EXIT

ping_hc /start

if ! restic cat config >/dev/null 2>&1; then
  echo "creating the restic repository $RESTIC_REPOSITORY"
  restic init
fi

echo "dumping the database"
mkdir -p "$STAGE_DIR"
chmod 700 "$STAGE_DIR"
compose exec -T postgres pg_dump -U nepnha -d nepnha -Fc > "$STAGE_DIR/nepnha.dump"
[ -s "$STAGE_DIR/nepnha.dump" ] || { echo "the database dump is empty" >&2; exit 1; }

echo "sending $STAGE_DIR/nepnha.dump and $MEDIA_HOST_DIR to restic"
# One snapshot with fixed paths: the restore scripts read <restore>$STAGE_DIR/nepnha.dump and <restore>$MEDIA_HOST_DIR.
restic backup --tag nepnha --host nepnha "$STAGE_DIR" "$MEDIA_HOST_DIR"

restic forget --tag nepnha --host nepnha --keep-daily 7 --keep-weekly 4 --prune
restic check

ping_hc ""
echo "backup done"
