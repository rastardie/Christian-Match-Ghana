#!/usr/bin/env bash
# Build and deploy the staging frontend to https://christianmatch.com/dev.
# Firebase backend remains in the existing staging project alias: staging.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRED_FILE="$ROOT/.deploy/stormerhost.env"
FRONTEND_DIR="$ROOT/frontend"
DIST_DIR="$FRONTEND_DIR/dist"
ENV_FILE="$FRONTEND_DIR/.env.staging-web"

if [ ! -f "$CRED_FILE" ]; then
  echo "ERROR: Missing $CRED_FILE"
  echo "Copy .deploy/stormerhost.env.example to .deploy/stormerhost.env and fill in StormerHost credentials."
  exit 1
fi
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: Missing $ENV_FILE"
  exit 1
fi
command -v lftp >/dev/null 2>&1 || { echo "ERROR: lftp is required (brew install lftp)."; exit 1; }

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

REMOTE="$CMG_DEPLOY_PROTOCOL://$CMG_DEPLOY_HOST:$CMG_DEPLOY_PORT"
REMOTE_DEV_DIR="${CMG_DEPLOY_REMOTE_DIR%/}/dev"

# Build only with the staging web environment. Vite reads .env.staging-web.
echo "==> Building staging frontend for /dev"
(
  cd "$FRONTEND_DIR"
  npm exec vite -- build --mode staging-web
  node scripts/generate-messaging-sw.mjs --mode=staging-web
)

# Apache fallback for React client-side routes under /dev.
cat > "$DIST_DIR/.htaccess" <<'EOF'
RewriteEngine On
RewriteBase /dev/
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]
RewriteRule ^ index.html [L]
EOF

[ -f "$DIST_DIR/index.html" ] || { echo "ERROR: build output missing ($DIST_DIR/index.html)"; exit 1; }

echo "==> Uploading staging frontend to $CMG_DEPLOY_HOST:$REMOTE_DEV_DIR"
lftp <<EOF
set net:timeout 20
set sftp:auto-confirm yes
open -u "$CMG_DEPLOY_USER","$CMG_DEPLOY_PASS" $REMOTE
mkdir -p "$REMOTE_DEV_DIR"
mirror -R --verbose --exclude-glob .DS_Store "$DIST_DIR/" "$REMOTE_DEV_DIR/"
bye
EOF

echo "==> Verifying https://christianmatch.com/dev/"
code="$(curl -ksS -o /dev/null -w '%{http_code}' https://christianmatch.com/dev/ || true)"
echo "HTTP $code"
[ "$code" = "200" ] || { echo "ERROR: /dev verification returned HTTP $code"; exit 1; }
echo "==> Staging frontend deploy complete."
