#!/usr/bin/env bash
# Deploys one release on the VPS. Called by .github/workflows/deploy.yml over SSH as user "deploy":
#   /opt/nepnha/deploy.sh <image-tag> <site-host>
# Pulls the images of <image-tag>, starts them, checks health through Caddy, and goes back to the previous tag
# when the check fails. The caller must be logged in to ghcr.io for the pull.
# Manual rollback: /opt/nepnha/deploy.sh "$(cat /opt/nepnha/.previous-tag)" <site-host>
set -euo pipefail

TAG=${1:?usage: deploy.sh <image-tag> <site-host>}
EXPECTED_HOST=${2:?usage: deploy.sh <image-tag> <site-host>}
NEPNHA_DIR=${NEPNHA_DIR:-/opt/nepnha}
ENV_FILE="$NEPNHA_DIR/.env"
HEALTH_WAIT_SECONDS=${HEALTH_WAIT_SECONDS:-180}
# Test only (a local CA for "localhost"): HEALTH_CURL_INSECURE=1 adds -k. Never set it on the VPS.
CURL_TLS=()
[ "${HEALTH_CURL_INSECURE:-}" = 1 ] && CURL_TLS=(-k)
cd "$NEPNHA_DIR"

env_get() { grep -E "^$1=" "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true; }
set_tag() {
  if grep -qE '^IMAGE_TAG=' "$ENV_FILE"; then
    sed -i "s|^IMAGE_TAG=.*|IMAGE_TAG=$1|" "$ENV_FILE"
  else
    echo "IMAGE_TAG=$1" >> "$ENV_FILE"
  fi
}

[ -f "$ENV_FILE" ] || { echo "$ENV_FILE is missing: run init-env.sh first (docs/deploy.md)" >&2; exit 1; }
SITE_HOST=$(env_get SITE_HOST)
# The web image is built for https://<site-host>; a different SITE_HOST in .env would break images and links.
if [ "$SITE_HOST" != "$EXPECTED_HOST" ]; then
  echo "SITE_HOST in $ENV_FILE is '$SITE_HOST', but the images were built for '$EXPECTED_HOST'." >&2
  echo "Change one of them so they match (docs/deploy.md, section about the domain)." >&2
  exit 1
fi
PREVIOUS=$(env_get IMAGE_TAG)

# Checks the site through Caddy on this machine. --resolve sends the request to the local Caddy with the real
# host name, so the real certificate is checked and Cloudflare is not in the way.
healthy() {
  local deadline=$((SECONDS + HEALTH_WAIT_SECONDS))
  local url
  while [ "$SECONDS" -lt "$deadline" ]; do
    if curl -fsS "${CURL_TLS[@]}" -m 10 --resolve "$SITE_HOST:443:127.0.0.1" "https://$SITE_HOST/api/actuator/health" 2>/dev/null \
        | grep -q '"status":"UP"'; then
      url="https://$SITE_HOST/vi"
      if curl -fsS "${CURL_TLS[@]}" -m 20 -o /dev/null --resolve "$SITE_HOST:443:127.0.0.1" "$url"; then
        return 0
      fi
    fi
    sleep 3
  done
  return 1
}

# Removes Nếp Nhà images of other tags. Keeps the current tag and the previous one, so a manual rollback needs
# no pull (the GHCR packages are private). Never touches other images on the machine.
prune_old_images() {
  local prefix keep_prev ref tag
  prefix=$(env_get IMAGE_PREFIX)
  keep_prev=$(cat "$NEPNHA_DIR/.previous-tag" 2>/dev/null || true)
  docker image ls --format '{{.Repository}}:{{.Tag}}' | while read -r ref; do
    case "$ref" in "$prefix"/nepnha-*:*) ;; *) continue ;; esac
    tag=${ref##*:}
    if [ "$tag" = "$TAG" ] || [ "$tag" = "$keep_prev" ]; then continue; fi
    docker image rm "$ref" >/dev/null 2>&1 || true
  done
}

# deploy.yml uploads the compose file of the new release as compose.next.yml. The file in use is kept as
# compose.prev.yml, so a rollback starts the old images with the compose file they were tested with.
NEXT_COMPOSE=compose.yml
[ ! -f compose.next.yml ] || NEXT_COMPOSE=compose.next.yml

echo "pulling images for tag $TAG"
IMAGE_TAG=$TAG docker compose -f "$NEXT_COMPOSE" pull --quiet

if [ "$NEXT_COMPOSE" = compose.next.yml ]; then
  if [ -f compose.yml ]; then cp compose.yml compose.prev.yml; fi
  mv compose.next.yml compose.yml
fi

echo "starting tag $TAG (previous: ${PREVIOUS:-none})"
set_tag "$TAG"
# No "set -e" stop here: when "up" fails (a container cannot start, postgres is unhealthy), the health check
# below fails too, and the rollback still runs.
docker compose up -d --remove-orphans || echo "docker compose up failed for $TAG" >&2

if healthy; then
  echo "release $TAG is healthy"
  if [ -n "$PREVIOUS" ] && [ "$PREVIOUS" != "$TAG" ]; then
    echo "$PREVIOUS" > "$NEPNHA_DIR/.previous-tag"
  fi
  prune_old_images
  exit 0
fi

echo "release $TAG FAILED the health check; recent logs:" >&2
docker compose ps >&2 || true
docker compose logs --tail 80 >&2 || true
if [ -z "$PREVIOUS" ] || [ "$PREVIOUS" = "$TAG" ]; then
  echo "no previous release to go back to" >&2
  exit 1
fi
echo "going back to $PREVIOUS" >&2
if [ -f compose.prev.yml ]; then cp compose.prev.yml compose.yml; fi
set_tag "$PREVIOUS"
docker compose up -d --remove-orphans || echo "docker compose up failed for $PREVIOUS" >&2
if healthy; then
  echo "rolled back to $PREVIOUS" >&2
else
  echo "the previous release $PREVIOUS is not healthy either" >&2
fi
exit 1
