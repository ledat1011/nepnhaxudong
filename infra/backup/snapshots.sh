#!/usr/bin/env bash
# Lists the backup snapshots (root, on the VPS): /opt/nepnha/backup/snapshots.sh
set -euo pipefail
# shellcheck source=infra/backup/lib.sh
. "$(dirname "$0")/lib.sh"
load_env
restic snapshots --tag nepnha
