#!/usr/bin/env bash
#
# One-shot CMG Android launcher.
# Kills any previously running CMG Android build/dev processes so a fresh build
# starts cleanly, then launches the Android app via start-cmg-android.sh.
# The Firebase emulators must already be running (use start-cmg-emulators.sh).
#
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> Stopping any running CMG Android build/dev processes..."

# Stop a previous invocation of the Android launcher, if any.
pkill -TERM -f "${SCRIPT_DIR}/start-cmg-android.sh" 2>/dev/null || true
# Stop any Gradle daemon/build for this workspace's Android project.
pkill -TERM -f "${SCRIPT_DIR}/frontend/android" 2>/dev/null || true
# Stop a Capacitor sync still holding this workspace's Vite build.
pkill -TERM -f "${SCRIPT_DIR}/frontend/node_modules/.bin/vite" 2>/dev/null || true

sleep 1
clear
exec "${SCRIPT_DIR}/start-cmg-android.sh"
