#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RELAY_DIR="$SCRIPT_DIR"

echo "==> Deploying LiveSync relay to Cloudflare Workers..."

# Check wrangler is available
if ! command -v wrangler &>/dev/null && ! npx wrangler --version &>/dev/null 2>&1; then
  echo "Error: wrangler not found. Install with: npm install -g wrangler"
  exit 1
fi

# Check authentication
if ! wrangler whoami &>/dev/null 2>&1; then
  echo "Error: wrangler is not authenticated. Run: wrangler login"
  exit 1
fi

# Install dependencies
echo "==> Installing dependencies..."
cd "$RELAY_DIR"
npm install --silent

# Deploy
echo "==> Running wrangler deploy..."
wrangler deploy

echo ""
echo "==> Relay deployed successfully!"
echo "    Use --relay <url> with the CLI to connect to your deployed relay."
