#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 VPS for Nếp Nhà. Run as root:
#   bash setup.sh --admin-key "ssh-ed25519 AAAA... you@pc" --deploy-key "ssh-ed25519 AAAA... github-deploy"
# What it does: users "nepnha" (sudo, your key) and "deploy" (docker, the GitHub Actions key); SSH with keys only,
# no root login; ufw (22, 80, 443); fail2ban; automatic security updates; 2 GB swap; Docker; restic;
# the folders of the site; the backup timers. Running it again is safe.
# Keep this root session open until you have logged in as "nepnha" from a second window.
set -euo pipefail

ADMIN_KEY=""
DEPLOY_KEY=""
while [ $# -gt 0 ]; do
  case "$1" in
    --admin-key) ADMIN_KEY=${2:-}; shift 2 ;;
    --deploy-key) DEPLOY_KEY=${2:-}; shift 2 ;;
    *) echo "unknown option: $1" >&2; exit 1 ;;
  esac
done

log() { printf '\n== %s\n' "$*"; }
die() { echo "ERROR: $*" >&2; exit 1; }

[ "$(id -u)" = 0 ] || die "run as root"
# shellcheck source=/dev/null
. /etc/os-release
if [ "${ID:-}" != ubuntu ] || [ "${VERSION_ID:-}" != "24.04" ]; then
  die "this script is for Ubuntu 24.04 (found ${PRETTY_NAME:-unknown})"
fi
for key in "$ADMIN_KEY" "$DEPLOY_KEY"; do
  [[ "$key" =~ ^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp256)\ [A-Za-z0-9+/=]+ ]] || die "pass both --admin-key and --deploy-key as one-line public keys"
done
[ "$ADMIN_KEY" != "$DEPLOY_KEY" ] || die "use two different keys: one for you, one for GitHub Actions"

export DEBIAN_FRONTEND=noninteractive

log "time zone and packages"
timedatectl set-timezone Asia/Ho_Chi_Minh
apt-get update -q
# Keep the provider's changed config files instead of stopping at a question.
apt-get upgrade -yq -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold
apt-get install -yq ca-certificates curl gnupg ufw fail2ban python3-systemd unattended-upgrades restic openssl

log "users"
add_user() {
  local user=$1 key=$2
  id "$user" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$user"
  install -d -m 700 -o "$user" -g "$user" "/home/$user/.ssh"
  local file="/home/$user/.ssh/authorized_keys"
  touch "$file"
  grep -qxF "$key" "$file" || echo "$key" >> "$file"
  chown "$user:$user" "$file"
  chmod 600 "$file"
}
add_user nepnha "$ADMIN_KEY"
add_user deploy "$DEPLOY_KEY"
usermod -aG sudo nepnha
if ! passwd -S nepnha | grep -q ' P '; then
  echo "Set a password for user nepnha (needed for sudo, never for SSH):"
  passwd nepnha
fi

log "SSH: keys only, no root login"
cat > /etc/ssh/sshd_config.d/10-nepnha.conf <<'EOF'
# Written by infra/vps/setup.sh. This file sorts before 50-cloud-init.conf, and the first value wins.
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
AllowUsers nepnha deploy
EOF
sshd -t || die "the new SSH config is invalid; fix /etc/ssh/sshd_config.d/10-nepnha.conf"
systemctl reload-or-restart ssh
# "sshd -t" checks only the syntax. Check the values sshd really uses: a provider image may lack the
# "Include sshd_config.d/*.conf" line, or ship a drop-in that sorts before ours (the first value wins).
effective=$(sshd -T 2>/dev/null)
for want in "passwordauthentication no" "kbdinteractiveauthentication no" "permitrootlogin no"; do
  if ! grep -qx "$want" <<<"$effective"; then
    die "sshd does not use '$want'. Check /etc/ssh/sshd_config (it must include sshd_config.d/*.conf) and the other files in /etc/ssh/sshd_config.d/, then run this script again."
  fi
done

log "firewall"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable
# Docker writes its own iptables rules for published ports, past ufw. Only Caddy publishes ports (80, 443),
# so nothing else is reachable; never publish the Postgres port in compose.

log "fail2ban"
cat > /etc/fail2ban/jail.d/nepnha.local <<'EOF'
[sshd]
enabled = true
backend = systemd
maxretry = 5
bantime = 1h
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban

log "automatic security updates"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
cat > /etc/apt/apt.conf.d/52nepnha-unattended <<'EOF'
// Reboot after an update that needs it, after the 02:30 backup. Containers start again by themselves.
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:30";
EOF
systemctl enable --now unattended-upgrades

log "swap (2 GB)"
if ! swapon --show | grep -q /swapfile; then
  [ -f /swapfile ] || { fallocate -l 2G /swapfile; chmod 600 /swapfile; mkswap /swapfile; }
  swapon /swapfile
fi
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
echo 'vm.swappiness=10' > /etc/sysctl.d/90-nepnha.conf
sysctl -q --system

log "Docker (official apt repository)"
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -q
  apt-get install -yq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker
# The docker group gives root rights on this machine; only the deploy user gets it.
usermod -aG docker deploy

log "folders"
install -d -m 750 -o deploy -g deploy /opt/nepnha
install -d -m 755 -o 10001 -g 10001 /srv/nepnha/media
install -d -m 700 -o root -g root /srv/nepnha/backup
# nepnha may read the deploy files (not .env, which is mode 600; use sudo -u deploy for that).
usermod -aG deploy nepnha

log "backup timers"
# deploy.yml copies the unit files and the backup scripts to /opt/nepnha on each deploy. Install the units now
# when they are already there (a second run); otherwise docs/deploy.md installs them after the first deploy.
if [ -f /opt/nepnha/systemd/nepnha-backup.timer ]; then
  install -m 644 /opt/nepnha/systemd/nepnha-*.service /opt/nepnha/systemd/nepnha-*.timer /etc/systemd/system/
  systemctl daemon-reload
  systemctl enable --now nepnha-backup.timer nepnha-restore-test.timer
  systemctl list-timers 'nepnha-*' --no-pager
else
  echo "No unit files in /opt/nepnha/systemd yet: install the timers after the first deploy (docs/deploy.md, step 6)."
fi

log "done"
cat <<'EOF'
Next steps (docs/deploy.md):
  1. In a NEW window, check that you can log in:  ssh nepnha@<ip>
     Only then close this root window.
  2. As nepnha, write /opt/nepnha/.env with init-env.sh (docs/deploy.md, step 4).
EOF
