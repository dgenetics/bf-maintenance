#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
BASE="${SMOKE_BASE_URL:-http://127.0.0.1:3100}"
PIN="${BF_ACCESS_PIN:-}"
if [[ -z "$PIN" ]]; then
  echo "BF_ACCESS_PIN not set; skip smoke" >&2
  exit 2
fi
code=$(curl -s -o /tmp/bf-smoke-bad.json -w "%{http_code}" -X POST "$BASE/api/auth/login" \
  -H 'content-type: application/json' -d '{"pin":"__wrong__"}' || true)
echo "wrong pin -> $code"
[[ "$code" == "401" || "$code" == "403" ]] || { echo "expected 401/403 for wrong pin"; exit 1; }

jar=$(mktemp)
code=$(curl -s -c "$jar" -o /tmp/bf-smoke-ok.json -w "%{http_code}" -X POST "$BASE/api/auth/login" \
  -H 'content-type: application/json' -d "{\"pin\":\"$PIN\"}")
echo "right pin -> $code"
[[ "$code" == "200" ]] || { echo "login failed: $(cat /tmp/bf-smoke-ok.json)"; exit 1; }

code=$(curl -s -b "$jar" -o /tmp/bf-smoke-tasks.json -w "%{http_code}" "$BASE/api/tasks")
echo "GET /api/tasks -> $code"
[[ "$code" == "200" ]] || { echo "tasks failed"; exit 1; }
python3 - <<'PY'
import json
json.load(open("/tmp/bf-smoke-tasks.json"))
print("tasks json ok")
PY
rm -f "$jar"
echo "smoke ok"
