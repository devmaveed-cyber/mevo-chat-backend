#!/usr/bin/env bash
# Creates a dedicated MongoDB Atlas project + M0 cluster for Mevo Chat,
# migrates data from the old shared cluster, and updates .env.
#
# Prerequisites:
#   brew install mongodb-atlas-cli
#   atlas auth login
#
# Usage:
#   cd Mevo_chat_backend
#   bash scripts/setup-mevo-atlas.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
PROJECT_NAME="Mevo Chat"
CLUSTER_NAME="MevoCluster0"
DB_NAME="mevo_chat"
DB_USER="mevo_chat_user"
REGION="${ATLAS_REGION:-US_EAST_1}"

red()   { printf '\033[0;31m%s\033[0m\n' "$1"; }
green() { printf '\033[0;32m%s\033[0m\n' "$1"; }
yellow(){ printf '\033[0;33m%s\033[0m\n' "$1"; }

if ! command -v atlas >/dev/null 2>&1; then
  red "MongoDB Atlas CLI not found. Install: brew install mongodb-atlas-cli"
  exit 1
fi

if ! atlas auth whoami >/dev/null 2>&1; then
  red "Atlas CLI not logged in."
  yellow "Run this first, then re-run this script:"
  echo "  atlas auth login"
  exit 1
fi

green "Logged in to Atlas as: $(atlas auth whoami 2>/dev/null | head -1)"

ORG_ID="$(atlas organizations list --output json | node -e "
  const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
  const org=(d.results&&d.results[0])||d[0];
  if(!org||!org.id){process.exit(1)}
  console.log(org.id);
")"

yellow "Using organization: $ORG_ID"

# Skip if project already exists
EXISTING_PROJECT_ID="$(atlas projects list --output json | node -e "
  const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
  const list=d.results||d;
  const p=list.find(x=>x.name==='$PROJECT_NAME');
  if(p) console.log(p.id);
" || true)"

if [ -n "$EXISTING_PROJECT_ID" ]; then
  yellow "Project '$PROJECT_NAME' already exists (id: $EXISTING_PROJECT_ID)"
  PROJECT_ID="$EXISTING_PROJECT_ID"
else
  yellow "Creating Atlas project: $PROJECT_NAME"
  PROJECT_ID="$(atlas projects create "$PROJECT_NAME" --orgId "$ORG_ID" --output json | node -e "
    const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
    console.log(d.id||d.projectId);
  ")"
  green "Created project: $PROJECT_ID"
fi

# Create cluster if missing
if atlas clusters describe "$CLUSTER_NAME" --projectId "$PROJECT_ID" >/dev/null 2>&1; then
  yellow "Cluster '$CLUSTER_NAME' already exists"
else
  yellow "Creating M0 cluster '$CLUSTER_NAME' in $REGION (takes ~3-5 min)..."
  atlas clusters create "$CLUSTER_NAME" \
    --projectId "$PROJECT_ID" \
    --provider AWS \
    --region "$REGION" \
    --tier M0
fi

yellow "Waiting for cluster to become available..."
atlas clusters watch "$CLUSTER_NAME" --projectId "$PROJECT_ID"

# Network access — allow current IP + localhost dev
CURRENT_IP="$(curl -s https://checkip.amazonaws.com | tr -d '[:space:]')"
yellow "Allowing network access for IP: $CURRENT_IP"
atlas accessLists create "$CURRENT_IP/32" --projectId "$PROJECT_ID" --comment "Mevo dev machine" 2>/dev/null || true
atlas accessLists create "0.0.0.0/0" --projectId "$PROJECT_ID" --comment "Dev wide access" 2>/dev/null || true

# Database user
DB_PASSWORD="$(openssl rand -base64 18 | tr -dc 'A-Za-z0-9' | head -c 20)"
ENCODED_PASSWORD="$(node -e "console.log(encodeURIComponent('$DB_PASSWORD'))")"

if atlas dbusers describe "$DB_USER" --projectId "$PROJECT_ID" >/dev/null 2>&1; then
  yellow "Database user '$DB_USER' already exists — updating password"
  atlas dbusers update "$DB_USER" \
    --projectId "$PROJECT_ID" \
    --password "$DB_PASSWORD"
else
  yellow "Creating database user: $DB_USER"
  atlas dbusers create \
    --username "$DB_USER" \
    --password "$DB_PASSWORD" \
    --projectId "$PROJECT_ID" \
    --role "readWriteAnyDatabase@admin"
fi

CONN_JSON="$(atlas clusters connectionStrings describe "$CLUSTER_NAME" --projectId "$PROJECT_ID" --output json)"
HOST="$(node -e "
  const d=JSON.parse(process.argv[1]);
  const cs=d.standardSrv || (d.connectionStrings && d.connectionStrings.standardSrv) || '';
  const m=cs.match(/mongodb\\+srv:\\/\\/([^/?]+)/);
  if(!m) throw new Error('Could not parse connection string: ' + cs);
  console.log(m[1]);
" "$CONN_JSON")"

NEW_URI="mongodb+srv://${DB_USER}:${ENCODED_PASSWORD}@${HOST}/${DB_NAME}?retryWrites=true&w=majority&appName=${CLUSTER_NAME}"

green "New cluster ready."
echo "  Project : $PROJECT_NAME"
echo "  Cluster : $CLUSTER_NAME"
echo "  Database: $DB_NAME"
echo "  User    : $DB_USER"

# Migrate data from old .env URI
if [ -f "$ENV_FILE" ]; then
  OLD_URI="$(grep '^MONGODB_URI=' "$ENV_FILE" | cut -d= -f2-)"
  if [ -n "$OLD_URI" ] && [ "$OLD_URI" != "$NEW_URI" ]; then
    yellow "Migrating data from old cluster..."
    node "$ROOT_DIR/scripts/migrate-mevo-data.js" "$NEW_URI"
  fi
fi

# Backup old .env and write new URI
cp "$ENV_FILE" "$ENV_FILE.bak.$(date +%Y%m%d%H%M%S)" 2>/dev/null || true

if grep -q '^MONGODB_URI=' "$ENV_FILE" 2>/dev/null; then
  node -e "
    const fs=require('fs');
    const p='$ENV_FILE';
    let c=fs.readFileSync(p,'utf8');
    c=c.replace(/^MONGODB_URI=.*/m, 'MONGODB_URI=$NEW_URI');
    fs.writeFileSync(p,c);
  "
else
  echo "MONGODB_URI=$NEW_URI" >> "$ENV_FILE"
fi

green "Done! .env updated with dedicated Mevo Chat Atlas cluster."
yellow "Atlas UI: Projects → '$PROJECT_NAME' → $CLUSTER_NAME → Browse Collections → $DB_NAME"
echo ""
echo "Restart backend:"
echo "  cd \"$ROOT_DIR\" && npm run dev"
