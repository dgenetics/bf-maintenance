#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
RUN_ID="${VERIFY_RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short HEAD 2>/dev/null || echo nogit)}"
OUT="$SKILL/evidence/$RUN_ID"
mkdir -p "$OUT"
SHA=$(git rev-parse HEAD 2>/dev/null || echo unknown)
{
  echo "# verify-bf-maintenance $RUN_ID"
  echo "- sha: \`$SHA\`"
  echo "- started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "$OUT/SUMMARY.md"

set +e
"$SKILL/scripts/doctor.sh" >"$OUT/doctor.log" 2>&1
DOC=$?
set -e
echo "- doctor exit: $DOC" >> "$OUT/SUMMARY.md"
if [[ $DOC -ne 0 ]]; then
  echo "- result: **FAIL** doctor" >> "$OUT/SUMMARY.md"
  echo "doctor failed; see $OUT/doctor.log" >&2
  exit $DOC
fi

SMOKE_BASE_URL="${SMOKE_BASE_URL:-http://127.0.0.1:3100}"
if curl -s -o /dev/null -w '' --max-time 2 "$SMOKE_BASE_URL/" 2>/dev/null; then
  set +e
  SMOKE_BASE_URL="$SMOKE_BASE_URL" "$SKILL/scripts/smoke.sh" >"$OUT/smoke.log" 2>&1
  SM=$?
  set -e
  echo "- smoke exit: $SM (base $SMOKE_BASE_URL)" >> "$OUT/SUMMARY.md"
  if [[ $SM -ne 0 ]]; then
    echo "- result: **FAIL** smoke" >> "$OUT/SUMMARY.md"
    exit $SM
  fi
else
  echo "- smoke: skipped (no server at $SMOKE_BASE_URL)" >> "$OUT/SUMMARY.md"
  echo "smoke skipped" > "$OUT/smoke.log"
fi

echo "- result: **PASS**" >> "$OUT/SUMMARY.md"
echo "- finished: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$OUT/SUMMARY.md"
echo "PASS evidence=$OUT"
