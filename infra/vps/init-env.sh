#!/usr/bin/env bash
# Writes /opt/nepnha/.env with random secrets. Run once on the VPS, as user "nepnha" or "deploy":
#   bash init-env.sh <public-ipv4> <first-admin-email>
# Prints the temporary admin password and the backup password once. It never overwrites an existing .env.
set -euo pipefail

IP=${1:?usage: init-env.sh <public-ipv4> <first-admin-email>}
EMAIL=${2:?usage: init-env.sh <public-ipv4> <first-admin-email>}
NEPNHA_DIR=${NEPNHA_DIR:-/opt/nepnha}
ENV_FILE="$NEPNHA_DIR/.env"

[[ "$IP" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}$ ]] || { echo "not an IPv4 address: $IP" >&2; exit 1; }
[[ "$EMAIL" == *@*.* ]] || { echo "not an email address: $EMAIL" >&2; exit 1; }
if [ -e "$ENV_FILE" ]; then
  echo "$ENV_FILE already exists; nothing changed. Edit it by hand if needed." >&2
  exit 1
fi

# Cut with a substring, not "head -c": head would close the pipe early, and pipefail would stop the script.
secret() {
  local s
  s=$(openssl rand -base64 96 | tr -dc 'A-Za-z0-9')
  printf '%s' "${s:0:$1}"
}
ADMIN_PASSWORD="Tam-$(secret 20)"
RESTIC_PASSWORD=$(secret 40)

umask 077
cat > "$ENV_FILE" <<EOF
# Written by init-env.sh on $(date -I). Explanation of each line: infra/prod.env.example in the repo.
SITE_HOST=${IP//./-}.sslip.io
TLS_MODE=acme
CLOUDFLARE_API_TOKEN=
IMAGE_PREFIX=ghcr.io/ledat1011
IMAGE_TAG=
POSTGRES_PASSWORD=$(secret 40)
REVALIDATE_SECRET=$(secret 48)
BOOTSTRAP_ADMIN_EMAIL=$EMAIL
BOOTSTRAP_ADMIN_PASSWORD=$ADMIN_PASSWORD
MEDIA_HOST_DIR=/srv/nepnha/media
RESTIC_REPOSITORY=/srv/nepnha/backup/restic
RESTIC_PASSWORD=$RESTIC_PASSWORD
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
HEALTHCHECK_URL=
RESTORE_HEALTHCHECK_URL=
EOF
chmod 600 "$ENV_FILE"

cat <<EOF

Wrote $ENV_FILE (mode 600).
Site address: https://${IP//./-}.sslip.io

Save these two values in your password manager now. They are shown only this time.
  Temporary admin password ($EMAIL): $ADMIN_PASSWORD
  Backup password (RESTIC_PASSWORD):  $RESTIC_PASSWORD

Without the backup password no backup can be read, also not by you.
EOF
