#!/usr/bin/env bash
# Starts the production stack from already built images in a throwaway folder laid out like /opt/nepnha on the
# VPS, runs smoke.sh, then (when restic is installed) a backup, the restore test and a real restore.
# Removes everything at the end.
# Usage: infra/test/run-smoke.sh
# Env: IMAGE_PREFIX, IMAGE_TAG (default nepnha-local / smoke), KEEP=1 to leave the stack running.
# Build the images first, for example:
#   docker build -t nepnha-local/nepnha-api:smoke api
#   docker build -t nepnha-local/nepnha-web:smoke --build-arg SITE_URL=https://localhost web
#   docker build -t nepnha-local/nepnha-caddy:smoke infra/caddy
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
IMAGE_PREFIX=${IMAGE_PREFIX:-nepnha-local}
IMAGE_TAG=${IMAGE_TAG:-smoke}
D=$(mktemp -d)
export NEPNHA_DIR="$D"

# Docker on Windows needs a Windows path for the bind mount (Git Bash gives /tmp/...).
host_path() { if command -v cygpath >/dev/null; then cygpath -m "$1"; else printf '%s' "$1"; fi; }

mkdir -p "$D/media"
chmod 777 "$D/media" # test only: the API runs as UID 10001; on the VPS setup.sh gives the folder to that UID
cp "$ROOT/infra/compose.prod.yml" "$D/compose.yml"
cp "$ROOT/infra/test/compose.smoke.yml" "$D/compose.override.yml"
{
  grep -vE '^(IMAGE_PREFIX|IMAGE_TAG)=' "$ROOT/infra/test/smoke.env"
  echo "IMAGE_PREFIX=$IMAGE_PREFIX"
  echo "IMAGE_TAG=$IMAGE_TAG"
  echo "MEDIA_HOST_DIR=$(host_path "$D/media")"
} > "$D/.env"

cleanup() {
  local rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "--- docker compose logs (failure) ---"
    (cd "$D" && docker compose logs --tail 150) || true
  fi
  if [ "${KEEP:-}" = 1 ]; then
    echo "KEEP=1: the stack keeps running in $D (stop it with: cd $D && docker compose down -v)"
  else
    (cd "$D" && docker compose down -v --remove-orphans) >/dev/null 2>&1 || true
    rm -rf "$D" 2>/dev/null || true
  fi
  exit "$rc"
}
trap cleanup EXIT

env_value() { grep -E "^$1=" "$D/.env" | cut -d= -f2-; }

(cd "$D" && docker compose up -d)
(cd "$D" && SMOKE_ADMIN_EMAIL=$(env_value BOOTSTRAP_ADMIN_EMAIL) SMOKE_ADMIN_PASSWORD=$(env_value BOOTSTRAP_ADMIN_PASSWORD) \
  bash "$ROOT/infra/test/smoke.sh" https://localhost:8443)

if command -v restic >/dev/null; then
  printf '\n== backup and restore test\n'
  export RESTIC_REPOSITORY="$D/restic" RESTIC_PASSWORD=smoke-restic-password STAGE_DIR="$D/stage" \
    WORK_BASE="$D/work" MEDIA_HOST_DIR="$D/media"
  bash "$ROOT/infra/backup/backup.sh"
  bash "$ROOT/infra/backup/restore-test.sh"
  printf '\n== real restore of the latest snapshot, then the site must be healthy again\n'
  # restore.sh needs root (the images belong to UID 10001); -E keeps the test variables.
  echo "KHOI PHUC" | sudo -E bash "$ROOT/infra/backup/restore.sh" latest
  ok=no
  for _ in $(seq 1 60); do
    if curl -ksS -m 10 https://localhost:8443/api/actuator/health 2>/dev/null | grep -q '"status":"UP"'; then ok=yes; break; fi
    sleep 3
  done
  [ "$ok" = yes ] || { echo "FAIL: the API is not healthy after restore.sh" >&2; exit 1; }
else
  echo "restic is not installed: skipped the backup and restore test"
fi
printf '\nSmoke run passed.\n'
