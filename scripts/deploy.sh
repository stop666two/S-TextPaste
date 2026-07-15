#!/bin/bash
# S-TextPaste One-Click Deploy to Cloudflare Workers
# Usage: ./scripts/deploy.sh [database_id]
# Requires: wrangler.toml with D1 binding named "DB"

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== S-TextPaste Deploy ==="
echo ""

if [ -z "$1" ]; then
  echo "[?] Usage: ./scripts/deploy.sh <database_id>"
  echo ""
  echo "  1. Create a D1 database:"
  echo "     npx wrangler d1 create s-textpaste-db"
  echo "  2. Note the database_id from output"
  echo "  3. Add to wrangler.toml under [[d1_databases]]:"
  echo '     database_id = "<id>"'
  echo "  4. Run this script: ./scripts/deploy.sh <database_id>"
  exit 1
fi

DB_ID="$1"
echo "[1/5] Updating wrangler.toml with database ID..."

# Update database_id in wrangler.toml (at project root)
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/database_id = \".*\"/database_id = \"$DB_ID\"/" "$ROOT/wrangler.toml"
else
  sed -i "s/database_id = \".*\"/database_id = \"$DB_ID\"/" "$ROOT/wrangler.toml"
fi

echo "[2/5] Installing dependencies..."
cd "$ROOT/frontend" && npm install --silent

echo "[3/5] Building frontend..."
cd "$ROOT/frontend" && npx tsc --noEmit && npx vite build

echo "[4/5] Copying build to worker/public..."
rm -rf "$ROOT/worker/public"
mkdir -p "$ROOT/worker/public"
cp -r "$ROOT/frontend/dist/"* "$ROOT/worker/public/"

echo "[5/5] Deploying to Cloudflare Workers..."
cd "$ROOT" && npx wrangler deploy

echo ""
echo "=== Deployment Complete ==="
