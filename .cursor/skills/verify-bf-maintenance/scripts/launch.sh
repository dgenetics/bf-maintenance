#!/usr/bin/env bash
# Start an agent-owned bf-maintenance instance on a non-colliding port.
# Usage: launch.sh [port] [run-id]
# Writes server.pid + server.url under evidence/<run-id>/.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib.sh"
load_env

PORT="${1:-3100}"
RUN_ID="${2:-$(new_run_id)}"
OUT="$(ensure_run_dir "$RUN_ID")"
BASE="http://127.0.0.1:${PORT}"

if curl -s -o /dev/null --max-time 1 "$BASE/" 2>/dev/null; then
  echo "port $PORT already answering — refusing to hijack" >&2
  exit 3
fi

cd "$REPO_ROOT"
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "copied .env.example → .env (set BF_SESSION_SECRET + identity DB before driving)" >&2
fi
if [[ ! -d node_modules ]]; then
  npm ci
fi
npx prisma generate >/dev/null
# Prefer production server for stable verification (built artifact).
if [[ ! -d .next ]]; then
  npm run build
fi

# Use a disposable sqlite file so we do not corrupt the developer's dev.db.
VERIFY_DB="$OUT/verify.db"
if [[ ! -f "$VERIFY_DB" ]]; then
  if [[ -f "$REPO_ROOT/dev.db" ]]; then
    cp "$REPO_ROOT/dev.db" "$VERIFY_DB"
  else
    # Prisma 7 dropped --skip-generate on db push; generate already ran above.
    DATABASE_URL="file:$VERIFY_DB" npx prisma db push
  fi
fi

# Seed AiEA-shaped identity DB for account login (local/CI).
IDENTITY_DB="$OUT/aiea-identity.db"
export BF_AUTH_EMAIL="${BF_AUTH_EMAIL:-verify@beausoleil.test}"
export BF_AUTH_PASSWORD="${BF_AUTH_PASSWORD:-verify-pass-1234}"
export BF_SESSION_SECRET="${BF_SESSION_SECRET:-verify-session-secret-change-me}"
node "$REPO_ROOT/scripts/seed-identity-db.mjs" "$IDENTITY_DB" \
  "$BF_AUTH_EMAIL" "$BF_AUTH_PASSWORD" "Verify User"

nohup env DATABASE_URL="file:$VERIFY_DB" \
  AIEA_DATABASE_URL="file:$IDENTITY_DB" \
  BF_SESSION_SECRET="$BF_SESSION_SECRET" \
  BF_AUTH_EMAIL="$BF_AUTH_EMAIL" \
  BF_AUTH_PASSWORD="$BF_AUTH_PASSWORD" \
  PORT="$PORT" \
  npm run start -- -p "$PORT" -H 127.0.0.1 \
  >"$OUT/server.txt" 2>&1 &
echo $! >"$OUT/server.pid"
echo "$BASE" >"$OUT/server.url"
echo "$RUN_ID" >"$OUT/../.last-run-id"

ready=0
for _ in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 "$BASE/" || true)
  if [[ "$code" == "200" ]]; then
    ready=1
    break
  fi
  sleep 1
done
if [[ "$ready" != "1" ]]; then
  echo "server did not become ready on $BASE" >&2
  tail -n 40 "$OUT/server.txt" >&2 || true
  exit 1
fi

echo "launched $BASE pid=$(cat "$OUT/server.pid") run=$RUN_ID"
echo "$RUN_ID"
