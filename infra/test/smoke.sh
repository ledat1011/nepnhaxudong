#!/usr/bin/env bash
# Smoke test of the production stack through Caddy. Usage: smoke.sh <base-url>
#   base-url: for example https://localhost:8443 (the smoke compose file publishes Caddy there).
# Env: SMOKE_ADMIN_EMAIL, SMOKE_ADMIN_PASSWORD (the bootstrap admin of a fresh database).
# docker compose must reach the stack (COMPOSE_FILE / COMPOSE_ENV_FILES or the current folder).
# Needs curl and jq. Stops at the first failed check and prints its name.
set -euo pipefail

BASE=${1:?usage: smoke.sh <base-url>}
BASE=${BASE%/}
: "${SMOKE_ADMIN_EMAIL:?}" "${SMOKE_ADMIN_PASSWORD:?}"

T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
JAR="$T/jar.txt"
# -k: the smoke stack uses Caddy's local CA for "localhost".
CURL=(curl -k -sS --max-time 30 -c "$JAR" -b "$JAR")

step() { printf '\n== %s\n' "$*"; }
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
# Prints the HTTP status; the body goes to $T/body and the headers to $T/headers.
status() { "${CURL[@]}" -o "$T/body" -D "$T/headers" -w '%{http_code}' "$@"; }
header() { grep -i "^$1:" "$T/headers" | tail -n 1 | cut -d' ' -f2- | tr -d '\r'; }
csrf() { "${CURL[@]}" "$BASE/api/auth/csrf" | jq -r .token; }

step "API health is UP (waits up to 180 s)"
for _ in $(seq 1 90); do
  if "${CURL[@]}" "$BASE/api/actuator/health" 2>/dev/null | grep -q '"status":"UP"'; then break; fi
  sleep 2
done
"${CURL[@]}" "$BASE/api/actuator/health" | grep -q '"status":"UP"' || fail "health is not UP"

step "GET /vi answers 200 and tells Cloudflare not to cache it"
code=$(status "$BASE/vi")
[ "$code" = 200 ] || fail "/vi answered $code"
[ "$(header Cloudflare-CDN-Cache-Control)" = "no-store" ] || fail "/vi has no Cloudflare-CDN-Cache-Control: no-store"

step "The CSRF cookie is Secure (the API sees HTTPS behind Caddy)"
"${CURL[@]}" -o /dev/null -D "$T/headers" "$BASE/api/auth/csrf"
grep -i '^set-cookie: XSRF-TOKEN=' "$T/headers" | grep -qi 'secure' || fail "XSRF-TOKEN cookie is not Secure"

step "Log in as the first admin and change the temporary password"
jq -n --arg e "$SMOKE_ADMIN_EMAIL" --arg p "$SMOKE_ADMIN_PASSWORD" '{email:$e,password:$p}' > "$T/login.json"
code=$(status -H "X-XSRF-TOKEN: $(csrf)" -H 'Content-Type: application/json' --data @"$T/login.json" "$BASE/api/auth/login")
[ "$code" = 200 ] || fail "login answered $code: $(cat "$T/body")"
grep -i '^set-cookie: NEPNHA_SESSION=' "$T/headers" | grep -qi 'secure' || fail "session cookie is not Secure"
NEW_PASSWORD="Smoke-$(head -c 18 /dev/urandom | base64 | tr -dc 'A-Za-z0-9')"
jq -n --arg c "$SMOKE_ADMIN_PASSWORD" --arg n "$NEW_PASSWORD" '{currentPassword:$c,newPassword:$n}' > "$T/pw.json"
code=$(status -H "X-XSRF-TOKEN: $(csrf)" -H 'Content-Type: application/json' --data @"$T/pw.json" "$BASE/api/auth/password")
[ "$code" = 204 ] || fail "password change answered $code: $(cat "$T/body")"

step "Upload a WebP image to the packaged API (TwelveMonkeys plugin) and read it back through Caddy"
# A 1x1 lossy WebP (the same bytes as WEBP_1X1 in api/src/test/java/vn/nepnhaxudong/media/TestImages.java).
echo 'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA' | base64 -d > "$T/tiny.webp"
code=$(status -H "X-XSRF-TOKEN: $(csrf)" -F "file=@$T/tiny.webp;type=image/webp" -F altVi=smoke -F altEn=smoke "$BASE/api/admin/media")
[ "$code" = 201 ] || fail "upload answered $code: $(cat "$T/body")"
MEDIA_URL=$(jq -r .url "$T/body")
case "$MEDIA_URL" in /media/*) ;; *) fail "unexpected media url: $MEDIA_URL" ;; esac
code=$(status "$BASE$MEDIA_URL")
[ "$code" = 200 ] || fail "$MEDIA_URL answered $code"
[ "$(header Content-Type)" = "image/webp" ] || fail "$MEDIA_URL has Content-Type '$(header Content-Type)'"
[ "$(header X-Content-Type-Options)" = "nosniff" ] || fail "$MEDIA_URL has no nosniff"
header Cache-Control | grep -q immutable || fail "$MEDIA_URL is not cached as immutable"
code=$(status "$BASE/media/2000/01/missing.webp")
[ "$code" = 404 ] || fail "a missing image answered $code"
header Cache-Control | grep -q immutable && fail "a 404 of /media is cached as immutable"

step "A change in admin reaches the cached home page (API -> web revalidate)"
TITLE="SMOKE-$(head -c 6 /dev/urandom | base64 | tr -dc 'A-Za-z0-9')"
jq -n --arg t "$TITLE" '{year:2024,title:{vi:$t},description:{vi:"smoke"}}' > "$T/tl.json"
code=$(status -H "X-XSRF-TOKEN: $(csrf)" -H 'Content-Type: application/json' --data @"$T/tl.json" "$BASE/api/admin/timeline")
[ "$code" = 201 ] || fail "timeline create answered $code: $(cat "$T/body")"
found=no
for _ in $(seq 1 20); do
  if "${CURL[@]}" "$BASE/vi" | grep -q "$TITLE"; then found=yes; break; fi
  sleep 1
done
[ "$found" = yes ] || fail "/vi does not show the new timeline event after 20 s"

step "POST /api/revalidate of the web app is not reachable from outside"
code=$(status -X POST -H 'Content-Type: application/json' --data '{"tags":["home"]}' "$BASE/api/revalidate")
case "$code" in 2*) fail "/api/revalidate answered $code from outside" ;; esac

step "A body over 16 MB is refused with 413"
head -c 17000000 /dev/zero > "$T/big.bin"
code=$(status -H "X-XSRF-TOKEN: $(csrf)" -F "file=@$T/big.bin;type=image/jpeg" -F altVi=x -F altEn=x "$BASE/api/admin/media" || true)
[ "$code" = 413 ] || fail "a 17 MB upload answered $code"

step "Postgres publishes no port"
if docker compose port postgres 5432 2>/dev/null | grep -q .; then fail "postgres publishes port 5432"; fi

step "Login is rate limited per IP"
codes=""
for _ in $(seq 1 6); do
  codes="$codes $(status -H 'Content-Type: application/json' --data '{"email":"nobody@example.test","password":"x"}' "$BASE/api/auth/login")"
done
echo "login answers:$codes"
case "$codes" in *429*) ;; *) fail "no 429 after 6 quick logins" ;; esac

printf '\nAll smoke checks passed.\n'
