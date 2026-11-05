# Shared helpers of the backup scripts. Source it; do not run it.
# NEPNHA_DIR: folder with compose.yml and .env (default /opt/nepnha).
# A variable already set in the environment wins over the value in .env (CI sets them directly).
# shellcheck shell=bash

NEPNHA_DIR=${NEPNHA_DIR:-/opt/nepnha}
ENV_FILE=${ENV_FILE:-$NEPNHA_DIR/.env}
# The database dump waits here before restic reads it. A fixed path keeps every snapshot in one restic group.
STAGE_DIR=${STAGE_DIR:-/var/tmp/nepnha-backup}

# Reads KEY=value from .env without running it as shell code (values may hold spaces or quotes).
env_get() {
  [ -f "$ENV_FILE" ] || return 0
  grep -E "^$1=" "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true
}

load_env() {
  local key
  for key in RESTIC_REPOSITORY RESTIC_PASSWORD AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY HEALTHCHECK_URL MEDIA_HOST_DIR; do
    if [ -z "${!key:-}" ]; then
      printf -v "$key" '%s' "$(env_get "$key")"
    fi
    export "${key?}"
  done
  : "${RESTIC_REPOSITORY:?RESTIC_REPOSITORY is not set}"
  : "${RESTIC_PASSWORD:?RESTIC_PASSWORD is not set}"
  MEDIA_HOST_DIR=${MEDIA_HOST_DIR:-/srv/nepnha/media}
  # restic reads the S3 keys only when they are set; an empty value would make it try them.
  [ -n "$AWS_ACCESS_KEY_ID" ] || unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
}

# Pings healthchecks.io (or any URL in HEALTHCHECK_URL). $1: "", "/start" or "/fail". Never fails the script.
ping_hc() {
  [ -n "${HEALTHCHECK_URL:-}" ] || return 0
  curl -fsS -m 10 --retry 3 -o /dev/null "${HEALTHCHECK_URL}$1" || echo "warning: health check ping failed" >&2
}

compose() { (cd "$NEPNHA_DIR" && docker compose "$@"); }
