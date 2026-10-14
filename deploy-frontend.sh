#!/usr/bin/env bash
#
# Automated production frontend deploy to Stormer Host (cPanel).
# Builds the frontend with production env and uploads frontend/dist/ via SFTP/FTP.
#
# Usage:
#   ./deploy-frontend.sh
#
# Credentials come from .deploy/stormerhost.env (git-ignored). Create it from
# .deploy/stormerhost.env.example. Production build env comes from frontend/.env.production.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRED_FILE="$ROOT/.deploy/stormerhost.env"
FRONTEND_DIR="$ROOT/frontend"
DIST_DIR="$FRONTEND_DIR/dist"

if [ ! -f "$CRED_FILE" ]; then
  echo "ERROR: Missing $CRED_FILE"
  echo "Create it from .deploy/stormerhost.env.example and fill in your cPanel SFTP/FTP credentials."
  exit 1
fi

# Load credentials (not echoed).
set -a
# shellcheck disable=SC1090
source "$CRED_FILE"
set +a

: "${CMG_DEPLOY_PROTOCOL:=sftp}"
: "${CMG_DEPLOY_PORT:=22}"
: "${CMG_DEPLOY_REMOTE_DIR:=public_html}"
for v in CMG_DEPLOY_HOST CMG_DEPLOY_USER CMG_DEPLOY_PASS; do
  if [ -z "${!v:-}" ]; then echo "ERROR: $v is not set in $CRED_FILE"; exit 1; fi
done

command -v lftp >/dev/null 2>&1 || { echo "ERROR: lftp is required (brew install lftp)."; exit 1; }

# --- 1. Production build (exclude .env.local per deployment policy) ---
if [ ! -f "$FRONTEND_DIR/.env.production" ]; then
  echo "ERROR: $FRONTEND_DIR/.env.production not found."
  echo "Create it from frontend/.env.production.example with real production values."
  exit 1
fi
if ! grep -q '^VITE_FIREBASE_PROJECT_ID=christianmatch-app' "$FRONTEND_DIR/.env.production"; then
  echo "ERROR: frontend/.env.production must set VITE_FIREBASE_PROJECT_ID=christianmatch-app"
  exit 1
fi

RESTORE_ENV_LOCAL=""
if [ -f "$FRONTEND_DIR/.env.local" ]; then
  mv "$FRONTEND_DIR/.env.local" "$FRONTEND_DIR/.env.local.deploybak"
  RESTORE_ENV_LOCAL="yes"
fi
restore_env_local() {
  if [ -n "$RESTORE_ENV_LOCAL" ] && [ -f "$FRONTEND_DIR/.env.local.deploybak" ]; then
    mv -f "$FRONTEND_DIR/.env.local.deploybak" "$FRONTEND_DIR/.env.local" || true
  fi
}
trap restore_env_local EXIT

echo "==> Building production frontend"
( cd "$FRONTEND_DIR" && npm run build -- --mode production )

restore_env_local
trap - EXIT

[ -f "$DIST_DIR/index.html" ] || { echo "ERROR: build output missing ($DIST_DIR/index.html)"; exit 1; }

REMOTE="$CMG_DEPLOY_PROTOCOL://$CMG_DEPLOY_HOST:$CMG_DEPLOY_PORT"

# --- 2. Optional backup of current remote document root ---
if [ "${CMG_DEPLOY_BACKUP:-false}" = "true" ]; then
  TS="$(date +%Y%m%d-%H%M%S)"
  BK="$ROOT/.deploy/backups/$TS"
  mkdir -p "$BK"
  echo "==> Backing up current remote $CMG_DEPLOY_REMOTE_DIR to .deploy/backups/$TS"
  lftp <<EOF || echo "WARN: backup step failed (continuing)"
set net:timeout 20
set sftp:auto-confirm yes
open -u "$CMG_DEPLOY_USER","$CMG_DEPLOY_PASS" $REMOTE
mirror --verbose "$CMG_DEPLOY_REMOTE_DIR" "$BK"
bye
EOF
fi

# --- 3. Upload dist/ -> remote document root ---
DELETE_FLAG=""
[ "${CMG_DEPLOY_DELETE:-false}" = "true" ] && DELETE_FLAG="--delete"
echo "==> Uploading dist/ to $CMG_DEPLOY_HOST:$CMG_DEPLOY_REMOTE_DIR"
lftp <<EOF
set net:timeout 20
set sftp:auto-confirm yes
open -u "$CMG_DEPLOY_USER","$CMG_DEPLOY_PASS" $REMOTE
mirror -R $DELETE_FLAG --verbose --exclude-glob .DS_Store "$DIST_DIR/" "$CMG_DEPLOY_REMOTE_DIR/"
bye
EOF

# --- 4. Verify ---
echo "==> Verifying https://christianmatchghana.com"
code="$(curl -s -o /dev/null -w '%{http_code}' https://christianmatchghana.com/ || true)"
echo "HTTP $code"
echo "==> Deploy complete."
