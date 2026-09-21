#!/usr/bin/env bash
# Full verification gate: optional launch → doctor → drive one feature → evidence.
# Does not delete evidence. Cleanup of local server is caller's job (or --cleanup).
#
# Usage:
#   VERIFY_BASE_URL=https://bf-maintenance.vercel.app gate.sh
#   gate.sh --local          # launch on 3100, doctor, drive pin-gate, cleanup
#   gate.sh --feature systems-list
#
# Env: BF_ACCESS_PIN, VERIFY_BASE_URL / SMOKE_BASE_URL, VERIFY_FEATURE (default pin-gate)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib.sh"
load_env

LOCAL=0
CLEANUP=0
FEATURE="${VERIFY_FEATURE:-pin-gate}"
PORT=3100
while [[ $# -gt 0 ]]; do
  case "$1" in
    --local) LOCAL=1; CLEANUP=1; shift ;;
    --cleanup) CLEANUP=1; shift ;;
    --feature) FEATURE="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --base-url) VERIFY_BASE_URL="$2"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

RUN_ID="$(new_run_id)"
OUT="$(ensure_run_dir "$RUN_ID")"
export VERIFY_RUN_ID="$RUN_ID"
SHA=$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || echo unknown)

{
  echo "# verify-bf-maintenance $RUN_ID"
  echo "- sha: \`$SHA\`"
  echo "- started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "- feature: \`$FEATURE\`"
} > "$OUT/SUMMARY.md"

BASE="${VERIFY_BASE_URL:-${SMOKE_BASE_URL:-}}"
if [[ "$LOCAL" == "1" ]]; then
  set +e
  LAUNCH_OUT=$("$SCRIPT_DIR/launch.sh" "$PORT" "$RUN_ID" 2>"$OUT/launch.txt")
  LC=$?
  set -e
  echo "- launch exit: $LC" >> "$OUT/SUMMARY.md"
  if [[ $LC -ne 0 ]]; then
    echo "- result: **FAIL** launch" >> "$OUT/SUMMARY.md"
    cat "$OUT/launch.txt" >&2 || true
    exit $LC
  fi
  BASE="http://127.0.0.1:${PORT}"
fi
BASE="${BASE:-http://127.0.0.1:3100}"
echo "- base: $BASE" >> "$OUT/SUMMARY.md"

# Ensure playwright-core present
if [[ ! -d "$SCRIPT_DIR/node_modules/playwright-core" ]]; then
  (cd "$SCRIPT_DIR" && npm install --silent)
fi

set +e
VERIFY_BASE_URL="$BASE" "$SCRIPT_DIR/doctor.sh" "$BASE" >"$OUT/doctor.txt" 2>&1
DOC=$?
set -e
echo "- doctor exit: $DOC" >> "$OUT/SUMMARY.md"
if [[ $DOC -ne 0 ]]; then
  echo "- result: **FAIL** doctor" >> "$OUT/SUMMARY.md"
  echo "doctor failed; see $OUT/doctor.txt" >&2
  [[ "$CLEANUP" == "1" ]] && "$SCRIPT_DIR/cleanup.sh" "$RUN_ID" || true
  exit $DOC
fi

set +e
node "$SCRIPT_DIR/drive.mjs" --feature "$FEATURE" --base-url "$BASE" --run-id "$RUN_ID" \
  >"$OUT/drive.txt" 2>&1
DRV=$?
set -e
echo "- drive ($FEATURE) exit: $DRV" >> "$OUT/SUMMARY.md"
if [[ $DRV -ne 0 ]]; then
  echo "- result: **FAIL** drive" >> "$OUT/SUMMARY.md"
  echo "drive failed; see $OUT/drive.txt" >&2
  [[ "$CLEANUP" == "1" ]] && "$SCRIPT_DIR/cleanup.sh" "$RUN_ID" || true
  exit $DRV
fi

# Append drive steps to SUMMARY if JSON present
if [[ -f "$OUT/drive-$FEATURE.json" ]]; then
  echo "- drive steps:" >> "$OUT/SUMMARY.md"
  python3 - <<PY >> "$OUT/SUMMARY.md"
import json
d=json.load(open("$OUT/drive-$FEATURE.json"))
for s in d.get("steps", []):
    print(f"  - {s}")
PY
fi

echo "- result: **PASS**" >> "$OUT/SUMMARY.md"
echo "- finished: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$OUT/SUMMARY.md"
echo "- evidence: \`$OUT\`" >> "$OUT/SUMMARY.md"

if [[ "$CLEANUP" == "1" ]]; then
  "$SCRIPT_DIR/cleanup.sh" "$RUN_ID"
  echo "- cleanup: ran (evidence retained)" >> "$OUT/SUMMARY.md"
fi

echo "PASS evidence=$OUT"
