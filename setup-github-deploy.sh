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

if [ -f /tmp/cmg-production-web-config.json ]; then
  python3 - <<'PY' | gh secret set FIREBASE_API_KEY --repo "$REPO"
import json
with open('/tmp/cmg-production-web-config.json') as f:
    print(json.load(f)['apiKey'], end='')
PY
  echo 'Stored Firebase API key from local Firebase config (value not displayed).'
else
  set_secret FIREBASE_API_KEY "Firebase production web API key"
fi
find_paystack_key() {
  python3 - <<'PY'
import re
import urllib.parse
import urllib.request
from html.parser import HTMLParser

class Parser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.src = []
    def handle_starttag(self, tag, attrs):
        if tag == 'script':
            src = dict(attrs).get('src')
            if src:
                self.src.append(src)

base = 'https://christianmatchghana.com/'
try:
    html = urllib.request.urlopen(base, timeout=20).read().decode('utf-8', 'ignore')
    parser = Parser()
    parser.feed(html)
    for src in parser.src:
        url = src if src.startswith('http') else urllib.parse.urljoin(base, src)
        try:
            text = urllib.request.urlopen(url, timeout=20).read().decode('utf-8', 'ignore')
        except Exception:
            continue
        match = re.search(r'pk_(?:live|test)_[A-Za-z0-9_-]+', text)
        if match:
            print(match.group(0), end='')
            break
except Exception:
    pass
PY
}

PAYSTACK_KEY="$(find_paystack_key)"
if [ -n "$PAYSTACK_KEY" ]; then
  printf '%s' "$PAYSTACK_KEY" | gh secret set PAYSTACK_PUBLIC_KEY --repo "$REPO"
  unset PAYSTACK_KEY
  echo 'Stored Paystack public key detected from the live production frontend (value not displayed).'
else
  set_secret PAYSTACK_PUBLIC_KEY "Paystack public key (pk_live_...)"
fi

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
