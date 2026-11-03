#!/usr/bin/env bash
# Cloud session check: prints tool versions and one summary line.
# Needs no root. Safe to run more than once.
set -euo pipefail

if command -v node >/dev/null 2>&1; then
  node_version="$(node --version)"
else
  node_version="missing"
fi
echo "node: ${node_version}"

if command -v java >/dev/null 2>&1; then
  java_version="$(java -version 2>&1 | head -n 1 | sed -E 's/.*"([^"]+)".*/\1/')"
else
  java_version="missing"
fi
echo "java: ${java_version}"

docker_state="missing"
if command -v docker >/dev/null 2>&1; then
  echo "docker: $(docker --version 2>&1 || true)"
  if docker info >/dev/null 2>&1; then
    docker_state="ok"
  else
    echo "docker: 'docker info' failed (daemon not reachable)"
  fi
else
  echo "docker: not installed"
fi

if command -v corepack >/dev/null 2>&1; then
  if corepack enable >/dev/null 2>&1; then
    echo "corepack: enabled"
  else
    echo "corepack: 'corepack enable' not permitted here (needs write access to the node bin folder); skipped"
  fi
else
  echo "corepack: not installed"
fi

echo "node=${node_version} java=${java_version} docker=${docker_state}"
