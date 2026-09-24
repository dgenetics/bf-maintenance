#!/usr/bin/env bash
# Instance health: is this bf-maintenance worth driving?
# Checks process/port, auth, and identity — not merely compile.
# Usage: doctor.sh [base-url]
# Env: AIEA_SMOKE_EMAIL, AIEA_SMOKE_PASSWORD (required), VERIFY_BASE_URL / SMOKE_BASE_URL
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib.sh"
load_env

BASE="${1:-$(default_base_url)}"
EMAIL="${AIEA_SMOKE_EMAIL:-}"
PASSWORD="${AIEA_SMOKE_PASSWORD:-}"
PKG_VERSION=$(node -p "require('$REPO_ROOT/package.json').version" 2>/dev/null || echo unknown)
SHA=$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)

echo "== doctor bf-maintenance =="
echo "base: $BASE"
echo "repo_sha: $SHA"
echo "package_version: $PKG_VERSION"

# 1) Port / process answering
code=$(curl -s -o /tmp/bf-doctor-root.html -w '%{http_code}' --max-time 10 "$BASE/" || echo "000")
echo "GET / -> $code"
[[ "$code" == "200" ]] || { echo "FAIL: root not 200"; exit 1; }
if ! grep -qiE 'Beausoleil|Maintenance|Sign in|Checking access|Get started' /tmp/bf-doctor-root.html; then
  echo "WARN: root HTML did not mention Beausoleil/Maintenance (SPA shell may still be ok)"
fi

# 2) Auth — wrong password rejected
[[ -n "$EMAIL" && -n "$PASSWORD" ]] || { echo "FAIL: AIEA_SMOKE_EMAIL and AIEA_SMOKE_PASSWORD not set"; exit 2; }
bad=$(curl -s -o /tmp/bf-doctor-bad.json -w '%{http_code}' --max-time 10 \
  -X POST "$BASE/api/auth/login" \
  -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"__doctor_wrong__\"}" || echo "000")
echo "POST /api/auth/login wrong password -> $bad"
[[ "$bad" == "401" || "$bad" == "403" ]] || { echo "FAIL: expected 401/403 for wrong password"; exit 1; }

# 3) Auth — correct credentials + session
jar=$(mktemp)
ok=$(curl -s -c "$jar" -o /tmp/bf-doctor-ok.json -w '%{http_code}' --max-time 15 \
  -X POST "$BASE/api/auth/login" \
  -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" || echo "000")
echo "POST /api/auth/login right creds -> $ok"
[[ "$ok" == "200" ]] || { echo "FAIL: login failed: $(cat /tmp/bf-doctor-ok.json)"; rm -f "$jar"; exit 1; }
if ! grep -q bf_session "$jar"; then
  echo "FAIL: no bf_session cookie after login"
  rm -f "$jar"
  exit 1
fi

# 4) Session valid
me=$(curl -s -b "$jar" -o /tmp/bf-doctor-me.json -w '%{http_code}' --max-time 10 \
  "$BASE/api/auth/me" || echo "000")
echo "GET /api/auth/me -> $me $(cat /tmp/bf-doctor-me.json)"
[[ "$me" == "200" ]] || { rm -f "$jar"; exit 1; }

# 5) Authenticated API — systems
sys=$(curl -s -b "$jar" -o /tmp/bf-doctor-systems.json -w '%{http_code}' --max-time 15 \
  "$BASE/api/systems" || echo "000")
echo "GET /api/systems -> $sys"
[[ "$sys" == "200" ]] || { echo "FAIL: systems"; rm -f "$jar"; exit 1; }
python3 - <<'PY'
import json
data = json.load(open("/tmp/bf-doctor-systems.json"))
assert isinstance(data, list), type(data)
print(f"systems_count: {len(data)}")
PY

# 6) Tasks data plane — use ?open=1 (bare GET /api/tasks can 500 on live Turso)
tasks=$(curl -s -b "$jar" -o /tmp/bf-doctor-tasks.json -w '%{http_code}' --max-time 15 \
  "$BASE/api/tasks?open=1" || echo "000")
echo "GET /api/tasks?open=1 -> $tasks"
[[ "$tasks" == "200" ]] || { echo "FAIL: tasks open"; rm -f "$jar"; exit 1; }
python3 - <<'PY'
import json
data = json.load(open("/tmp/bf-doctor-tasks.json"))
assert isinstance(data, list), type(data)
print(f"open_tasks_count: {len(data)}")
PY

rm -f "$jar"
echo "doctor OK"
