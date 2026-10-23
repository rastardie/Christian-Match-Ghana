#!/usr/bin/env bash
#
# Start the CMG Firebase emulators for the staging project.
# Kills any previously running emulators / dev servers first so ports are free,
# then starts auth, firestore, storage, and functions with data import/export.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Use the project-declared Node 22 runtime when Homebrew provides it.
for node_bin in /opt/homebrew/opt/node@22/bin /usr/local/opt/node@22/bin; do
  if [[ -x "$node_bin/node" ]]; then
    export PATH="$node_bin:$PATH"
    break
  fi
done

FIREBASE_BIN="backend/functions/node_modules/.bin/firebase"
EMULATOR_DATA=".firebase-emulator-data"

# Emulator + local dev/preview ports used by this project.
PORTS=(4000 4400 4500 5001 8080 8085 9099 9199 9299 9499 4173)

echo "==> Stopping any running Firebase emulators and local dev servers..."

# 1) Gracefully stop Firebase emulator processes (Java emulators + firebase CLI).
pkill -TERM -f 'firebase.*emulators:start'      2>/dev/null || true
pkill -TERM -f 'cloud-firestore-emulator'       2>/dev/null || true
pkill -TERM -f 'firebase-database-emulator'     2>/dev/null || true
pkill -TERM -f 'cloud-storage-rules-runtime'    2>/dev/null || true
pkill -TERM -f 'firestore-emulator'             2>/dev/null || true
# Local Vite dev/preview servers for this workspace (frees the frontend ports).
pkill -TERM -f "${SCRIPT_DIR}/frontend/node_modules/.bin/vite" 2>/dev/null || true

# 2) Free any process still bound to a known emulator/dev port.
for port in "${PORTS[@]}"; do
  pids="$(lsof -nP -iTCP:"${port}" -sTCP:LISTEN -t 2>/dev/null || true)"
  if [ -n "${pids}" ]; then
    echo "   releasing port ${port} (pids: ${pids//$'\n'/ })"
    # shellcheck disable=SC2086
    kill -TERM ${pids} 2>/dev/null || true
  fi
done

# 3) Give graceful shutdown a moment, then force-kill anything still bound.
sleep 2
for port in "${PORTS[@]}"; do
  pids="$(lsof -nP -iTCP:"${port}" -sTCP:LISTEN -t 2>/dev/null || true)"
  if [ -n "${pids}" ]; then
    echo "   force releasing port ${port} (pids: ${pids//$'\n'/ })"
    # shellcheck disable=SC2086
    kill -KILL ${pids} 2>/dev/null || true
  fi
done

echo "==> Starting Firebase emulators (staging)..."
clear
exec "${FIREBASE_BIN}" emulators:start \
  --project staging \
  --only auth,firestore,storage,functions,pubsub \
  --import="${EMULATOR_DATA}" \
  --export-on-exit="${EMULATOR_DATA}"
