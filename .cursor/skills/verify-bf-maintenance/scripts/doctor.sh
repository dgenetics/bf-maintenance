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

# App is mounted at /maintenance (basePath). VERIFY_BASE_URL stays the origin.
MOUNT="${BASE%/}/maintenance"

# 1) Signed-out pages redirect to AiEA login with next=<original path>.
check_login_redirect() {
  local path="$1"
  local headers
  headers=$(mktemp)
  local code
  code=$(curl -s -D "$headers" -o /dev/null -w '%{http_code}' --max-time 10 "$BASE$path" || echo "000")
  echo "GET $path -> $code"
  if [[ "$code" != "302" && "$code" != "307" ]]; then
    echo "FAIL: expected redirect to /login"
    cat "$headers"
    rm -f "$headers"
    exit 1
  fi
  python3 - "$headers" "$path" <<'PY'
import sys
from urllib.parse import urlparse, parse_qs, unquote
headers = open(sys.argv[1], encoding="utf-8", errors="replace").read().splitlines()
path = sys.argv[2]
loc = ""
for line in headers:
    if line.lower().startswith("location:"):
        loc = line.split(":", 1)[1].strip()
        break
u = urlparse(loc)
if u.path != "/login":
    raise SystemExit(f"FAIL: location path {u.path!r} is not /login ({loc})")
nxt = unquote(parse_qs(u.query).get("next", [""])[0])
if nxt != path:
    raise SystemExit(f"FAIL: next={nxt!r} for {path} ({loc})")
print(f"location: {loc}")
PY
  rm -f "$headers"
}
check_login_redirect "/maintenance"
check_login_redirect "/maintenance/schedules"

# Host root redirects onto the mount (bookmarks / installed app).
root_headers=$(mktemp)
root_code=$(curl -s -D "$root_headers" -o /dev/null -w '%{http_code}' --max-time 10 "$BASE/" || echo "000")
echo "GET / -> $root_code"
[[ "$root_code" == "307" || "$root_code" == "308" ]] || { echo "FAIL: / should redirect to /maintenance"; rm -f "$root_headers"; exit 1; }
if ! grep -qiE '^location: *(https?://[^[:space:]]*)?/maintenance[[:space:]]*$' "$root_headers"; then
  echo "FAIL: / Location header was not /maintenance"
  cat "$root_headers"
  rm -f "$root_headers"
  exit 1
fi
rm -f "$root_headers"

# TEMPORARY: unprefixed integration routes redirect onto /maintenance/api/integrations.
# 307 preserves POST. Follow it and expect the JSON auth error, not the HTML shell.
bridge=$(curl -s -L -o /tmp/bf-doctor-bridge.json -w '%{http_code}' --max-time 10 \
  -X POST "$BASE/api/integrations/tasks/complete" \
  -H 'content-type: application/json' \
  -d '{"taskId":"doctor-bridge"}' || echo "000")
echo "POST /api/integrations/tasks/complete (followed) -> $bridge $(head -c 180 /tmp/bf-doctor-bridge.json)"
[[ "$bridge" == "401" || "$bridge" == "503" ]] || { echo "FAIL: integration bridge did not reach the JSON handler"; exit 1; }
if ! grep -q '"error"' /tmp/bf-doctor-bridge.json; then
  echo "FAIL: integration bridge body was not JSON"
  exit 1
fi

# bf no longer has its own login. AiEA (or the local stand-in) does.
gone=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
  -X POST "$MOUNT/api/auth/login" \
  -H 'content-type: application/json' \
  -d '{}' || echo "000")
echo "POST /maintenance/api/auth/login -> $gone"
[[ "$gone" == "404" ]] || { echo "FAIL: bf login route should be gone"; exit 1; }

if [[ -n "${BF_INTEGRATION_SECRET:-}" ]]; then
  authed=$(curl -s -o /tmp/bf-doctor-int.json -w '%{http_code}' --max-time 10 \
    -X POST "$BASE/api/integrations/tasks/complete" \
    -H "authorization: Bearer ${BF_INTEGRATION_SECRET}" \
    -H 'content-type: application/json' \
    -d '{}' || echo "000")
  echo "POST /api/integrations/tasks/complete with secret, no cookie -> $authed $(head -c 180 /tmp/bf-doctor-int.json)"
  [[ "$authed" == "400" ]] || { echo "FAIL: integration secret should reach the handler without a session cookie"; exit 1; }
fi

# 2) Auth — wrong password rejected by AiEA login (same origin)
[[ -n "$EMAIL" && -n "$PASSWORD" ]] || { echo "FAIL: AIEA_SMOKE_EMAIL and AIEA_SMOKE_PASSWORD not set"; exit 2; }
bad=$(curl -s -o /tmp/bf-doctor-bad.json -w '%{http_code}' --max-time 10 \
  -X POST "$BASE/api/auth/login" \
  -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"__doctor_wrong__\"}" || echo "000")
echo "POST /api/auth/login wrong password -> $bad"
[[ "$bad" == "401" || "$bad" == "403" ]] || { echo "FAIL: expected 401/403 for wrong password"; exit 1; }

# 3) Auth — correct credentials issue aiea_session
jar=$(mktemp)
ok=$(curl -s -c "$jar" -o /tmp/bf-doctor-ok.json -w '%{http_code}' --max-time 15 \
  -X POST "$BASE/api/auth/login" \
  -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" || echo "000")
echo "POST /api/auth/login right creds -> $ok"
[[ "$ok" == "200" ]] || { echo "FAIL: login failed: $(cat /tmp/bf-doctor-ok.json)"; rm -f "$jar"; exit 1; }
if ! grep -q aiea_session "$jar"; then
  echo "FAIL: no aiea_session cookie after login"
  rm -f "$jar"
  exit 1
fi

# Expired aiea_session is signed out. Do this before any successful verify so
# the 45s memory cache is not holding the previous lookup. The local stand-in
# moves expiresAt into the past; a real AiEA host has no /__verify/expire.
expire=$(curl -s -o /tmp/bf-doctor-expire.json -w '%{http_code}' --max-time 10 \
  -b "$jar" -c "$jar" -X POST "$BASE/__verify/expire" || echo "000")
echo "POST /__verify/expire -> $expire"
if [[ "$expire" == "200" ]]; then
  exp_page=$(curl -s -D /tmp/bf-doctor-exp.hdr -o /dev/null -w '%{http_code}' --max-time 10 \
    -b "$jar" "$MOUNT/schedules" || echo "000")
  echo "GET /maintenance/schedules after expiry -> $exp_page"
  [[ "$exp_page" == "302" || "$exp_page" == "307" ]] || { echo "FAIL: expired session should redirect"; rm -f "$jar"; exit 1; }
  if ! grep -qi '^location: .*/login' /tmp/bf-doctor-exp.hdr; then
    echo "FAIL: expired session did not redirect to /login"
    cat /tmp/bf-doctor-exp.hdr
    rm -f "$jar"
    exit 1
  fi
  exp_me=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
    -b "$jar" "$MOUNT/api/auth/me" || echo "000")
  echo "GET /maintenance/api/auth/me after expiry -> $exp_me"
  [[ "$exp_me" == "401" ]] || { echo "FAIL: expired session should be 401"; rm -f "$jar"; exit 1; }
  ok=$(curl -s -c "$jar" -o /tmp/bf-doctor-ok.json -w '%{http_code}' --max-time 15 \
    -X POST "$BASE/api/auth/login" \
    -H 'content-type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" || echo "000")
  echo "POST /api/auth/login again after expiry -> $ok"
  [[ "$ok" == "200" ]] || { echo "FAIL: re-login failed"; rm -f "$jar"; exit 1; }
else
  echo "skip expiry check (no local session stand-in)"
fi

# 4) Session valid
me=$(curl -s -b "$jar" -o /tmp/bf-doctor-me.json -w '%{http_code}' --max-time 10 \
  "$MOUNT/api/auth/me" || echo "000")
echo "GET /maintenance/api/auth/me -> $me $(cat /tmp/bf-doctor-me.json)"
[[ "$me" == "200" ]] || { rm -f "$jar"; exit 1; }

# 5) Authenticated API — systems
sys=$(curl -s -b "$jar" -o /tmp/bf-doctor-systems.json -w '%{http_code}' --max-time 15 \
  "$MOUNT/api/systems" || echo "000")
echo "GET /maintenance/api/systems -> $sys"
[[ "$sys" == "200" ]] || { echo "FAIL: systems"; rm -f "$jar"; exit 1; }
python3 - <<'PY'
import json
data = json.load(open("/tmp/bf-doctor-systems.json"))
assert isinstance(data, list), type(data)
print(f"systems_count: {len(data)}")
PY

# 6) Tasks data plane — use ?open=1 (bare GET /api/tasks can 500 on live Turso)
tasks=$(curl -s -b "$jar" -o /tmp/bf-doctor-tasks.json -w '%{http_code}' --max-time 15 \
  "$MOUNT/api/tasks?open=1" || echo "000")
echo "GET /maintenance/api/tasks?open=1 -> $tasks"
[[ "$tasks" == "200" ]] || { echo "FAIL: tasks open"; rm -f "$jar"; exit 1; }
python3 - <<'PY'
import json
data = json.load(open("/tmp/bf-doctor-tasks.json"))
assert isinstance(data, list), type(data)
print(f"open_tasks_count: {len(data)}")
PY

# Authenticated page renders (session cookie, no second login).
page=$(curl -s -b "$jar" -o /tmp/bf-doctor-page.html -w '%{http_code}' --max-time 15 \
  "$MOUNT" || echo "000")
echo "GET /maintenance with session -> $page"
[[ "$page" == "200" ]] || { echo "FAIL: signed-in /maintenance not 200"; rm -f "$jar"; exit 1; }
if ! grep -qiE 'Farm Manager|Maintenance|Beausoleil' /tmp/bf-doctor-page.html; then
  echo "FAIL: signed-in HTML did not include the app shell"
  rm -f "$jar"
  exit 1
fi

rm -f "$jar"
echo "doctor OK"
