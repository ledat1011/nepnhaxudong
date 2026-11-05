#!/usr/bin/env bash
# Tests infra/vps/deploy.sh without a VPS: a local registry, a good release and a broken one.
#   1. deploy "good" -> exit 0, the site is healthy.
#   2. deploy "bad" (the API image is replaced by an image that serves nothing on 8080) -> exit 1,
#      .env is back on "good", the site is healthy again, .previous-tag is not changed.
# Needs the smoke images (see run-smoke.sh) and free ports 127.0.0.1:443 and 127.0.0.1:5000.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
SRC_PREFIX=${IMAGE_PREFIX:-nepnha-local}
SRC_TAG=${IMAGE_TAG:-smoke}
REG=localhost:5000
D=$(mktemp -d)
host_path() { if command -v cygpath >/dev/null; then cygpath -m "$1"; else printf '%s' "$1"; fi; }

cleanup() {
  local rc=$?
  if [ "$rc" -ne 0 ]; then (cd "$D" && docker compose logs --tail 60) || true; fi
  (cd "$D" && docker compose down -v --remove-orphans) >/dev/null 2>&1 || true
  docker rm -f nepnha-deploy-test-registry >/dev/null 2>&1 || true
  rm -rf "$D" 2>/dev/null || true
  exit "$rc"
}
trap cleanup EXIT
fail() { echo "FAIL: $*" >&2; exit 1; }

docker run -d --name nepnha-deploy-test-registry -p 127.0.0.1:5000:5000 registry:2 >/dev/null
for name in api web caddy; do
  docker tag "$SRC_PREFIX/nepnha-$name:$SRC_TAG" "$REG/nepnha-$name:good"
  docker push -q "$REG/nepnha-$name:good" >/dev/null
done
# The broken release: same web and Caddy, but "api" is a Caddy image that listens on 80, not 8080.
docker tag "$SRC_PREFIX/nepnha-web:$SRC_TAG" "$REG/nepnha-web:bad"
docker tag "$SRC_PREFIX/nepnha-caddy:$SRC_TAG" "$REG/nepnha-caddy:bad"
docker tag "$SRC_PREFIX/nepnha-caddy:$SRC_TAG" "$REG/nepnha-api:bad"
for name in api web caddy; do docker push -q "$REG/nepnha-$name:bad" >/dev/null; done

mkdir -p "$D/media"
chmod 777 "$D/media"
cp "$ROOT/infra/compose.prod.yml" "$D/compose.yml"
cp "$ROOT/infra/vps/deploy.sh" "$D/deploy.sh"
cat > "$D/compose.override.yml" <<'EOF'
services:
  caddy:
    ports: !override
      - "127.0.0.1:443:443"
EOF
{
  grep -vE '^(IMAGE_PREFIX|IMAGE_TAG)=' "$ROOT/infra/test/smoke.env"
  echo "IMAGE_PREFIX=$REG"
  echo "IMAGE_TAG="
  echo "MEDIA_HOST_DIR=$(host_path "$D/media")"
} > "$D/.env"

export NEPNHA_DIR="$D" HEALTH_CURL_INSECURE=1
tag_now() { grep -E '^IMAGE_TAG=' "$D/.env" | cut -d= -f2-; }

printf '\n== deploy.sh refuses a SITE_HOST that does not match .env\n'
if bash "$D/deploy.sh" good other.example >/dev/null 2>&1; then fail "deploy.sh accepted a wrong site host"; fi

printf '\n== deploy the good release\n'
bash "$D/deploy.sh" good localhost || fail "the good release did not deploy"
[ "$(tag_now)" = good ] || fail "IMAGE_TAG is '$(tag_now)' after the good deploy"

printf '\n== deploy a broken release: it must fail and go back to the good one\n'
if HEALTH_WAIT_SECONDS=60 bash "$D/deploy.sh" bad localhost; then fail "the broken release was reported as healthy"; fi
[ "$(tag_now)" = good ] || fail "IMAGE_TAG is '$(tag_now)' after the rollback, want good"
curl -fsS -k -m 10 --resolve localhost:443:127.0.0.1 https://localhost/api/actuator/health | grep -q '"status":"UP"' \
  || fail "the site is not healthy after the rollback"
[ ! -e "$D/.previous-tag" ] || fail ".previous-tag was written although no release replaced another one successfully"

printf '\nDeploy test passed.\n'
