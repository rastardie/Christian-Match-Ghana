#!/usr/bin/env bash
#
# One-shot CMG PWA launcher.
# Kills any previously running CMG Vite dev/preview servers (so stuck ports are
# freed), then starts the local PWA in Chrome via start-cmg-pwa.sh.
# The Firebase emulators must already be running (use start-cmg-emulators.sh).
#
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> Stopping any running CMG PWA dev servers..."

# Stop only this workspace's Vite dev/preview servers.
pkill -TERM -f "${SCRIPT_DIR}/frontend/node_modules/.bin/vite" 2>/dev/null || true

# Free leftover PWA preview ports (not the emulator ports).
for port in 3000 4173; do
  pids="$(lsof -nP -iTCP:"${port}" -sTCP:LISTEN -t 2>/dev/null || true)"
  if [ -n "${pids}" ]; then
    echo "   releasing port ${port} (pids: ${pids//$'\n'/ })"
    # shellcheck disable=SC2086
    kill -TERM ${pids} 2>/dev/null || true
  fi
done

sleep 1
clear
exec "${SCRIPT_DIR}/start-cmg-pwa.sh"
