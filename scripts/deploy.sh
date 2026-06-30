#!/bin/bash
# S-TextPaste One-Click Deploy to Cloudflare Workers
# Usage: ./deploy.sh [database_id]

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== S-TextPaste Deploy ==="
echo ""

# Step 1: Create D1 database if database_id not provided
if [ -z "$1" ]; then
  echo "[?] No database_id provided. Create one?"
  echo "    Run: wrangler d1 create s-textpaste-db"
  echo "    Then: ./deploy.sh <database_id>"
  echo ""
  echo "Or deploy with existing database:"
  echo "    ./deploy.sh <database_id>"
  exit 1
fi

DB_ID="$1"
echo "[1/5] Configuring D1 database: $DB_ID"

# Update wrangler.toml with database_id
sed -i.bak "s/YOUR_DATABASE_ID_HERE/$DB_ID/" "$ROOT/worker/wrangler.toml"
rm -f "$ROOT/worker/wrangler.toml.bak"

# Step 2: Install dependencies
echo "[2/5] Installing frontend dependencies..."
cd "$ROOT/frontend" && npm install --silent

# Step 3: Install worker dependencies
echo "[3/5] Installing worker dependencies..."
cd "$ROOT/worker" && npm install --silent

# Step 4: Build frontend
echo "[4/5] Building frontend..."
cd "$ROOT/frontend" && npx tsc --noEmit && npx vite build

# Copy to worker/public
echo "       Copying build to worker/public..."
rm -rf "$ROOT/worker/public"
mkdir -p "$ROOT/worker/public"
cp -r "$ROOT/frontend/dist/"* "$ROOT/worker/public/"

# Step 5: Deploy
echo "[5/5] Deploying to Cloudflare Workers..."
cd "$ROOT/worker" && npx wrangler deploy

echo ""
echo "=== Deployment Complete ==="
echo "Your S-TextPaste is now live!"
