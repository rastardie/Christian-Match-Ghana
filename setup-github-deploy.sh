#!/usr/bin/env bash
set -euo pipefail

REPO="rastardie/Christian-Match-Ghana"
WORKFLOW="Deploy frontend to Stormer Host"

command -v gh >/dev/null 2>&1 || { echo 'ERROR: install gh first: brew install gh'; exit 1; }

if ! gh auth status -h github.com >/dev/null 2>&1; then
  echo 'Opening GitHub authentication in your browser...'
  gh auth login --hostname github.com --git-protocol https --web
fi

echo "Using repository: $REPO"

set_secret() {
  local name="$1"
  local prompt="$2"
  local value
  while true; do
    read -r -s -p "$prompt: " value
    echo
    if [ -n "$value" ]; then break; fi
    echo "Value cannot be empty. Try again."
  done
  printf '%s' "$value" | gh secret set "$name" --repo "$REPO"
  unset value
  echo "Stored GitHub Actions secret: $name"
}

set_secret() {
  local name="$1"
  local prompt="$2"
  local value
  while true; do
    read -r -s -p "$prompt: " value
    echo
    if [ -n "$value" ]; then break; fi
    echo "Value cannot be empty. Try again."
  done
  printf '%s' "$value" | gh secret set "$name" --repo "$REPO"
  unset value
  echo "Stored GitHub Actions secret: $name"
}

secret_exists() {
  gh secret list --repo "$REPO" --json name --jq ".[].name" | grep -qx "$1"
}

if secret_exists STORMERHOST_HOST; then
  echo 'Keeping existing GitHub secret: STORMERHOST_HOST'
else
  set_secret STORMERHOST_HOST "Stormer Host cPanel SFTP host"
fi

printf '%s' '22' | gh secret set STORMERHOST_PORT --repo "$REPO"
printf '%s' 'public_html' | gh secret set STORMERHOST_REMOTE_DIR --repo "$REPO"
printf '%s' 'sftp' | gh secret set STORMERHOST_PROTOCOL --repo "$REPO"
echo 'Set fixed deploy values: port=22, remote_dir=public_html, protocol=sftp'

set_secret STORMERHOST_USER "Stormer Host cPanel username"
set_secret STORMERHOST_PASS "Stormer Host cPanel password"

set_secret FIREBASE_API_KEY "Firebase production web API key"
set_secret PAYSTACK_PUBLIC_KEY "Paystack public key (pk_live_...)"

echo
echo 'Configured GitHub Actions secrets:'
gh secret list --repo "$REPO"

echo
echo 'Secrets are stored. No secret values were printed.'

read -r -p "Run the production frontend deploy now? Type DEPLOY to continue: " confirm
if [ "$confirm" = "DEPLOY" ]; then
  gh workflow run "$WORKFLOW" --repo "$REPO" -f confirm=DEPLOY
  echo 'Deploy workflow started. Monitor it with:'
  echo "gh run list --repo $REPO --workflow deploy-frontend.yml --limit 1"
else
  echo 'No deploy started. Run later with:'
  echo "gh workflow run \"$WORKFLOW\" --repo $REPO -f confirm=DEPLOY"
fi
