#!/usr/bin/env bash
# Tear down agent-started instances. Never deletes evidence/.
# Usage: cleanup.sh [run-id]
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib.sh"

stop_pidfile() {
  local pidfile="$1"
  [[ -f "$pidfile" ]] || return 0
  local pid
  pid=$(cat "$pidfile" || true)
  if [[ -n "${pid:-}" ]]; then
    # farm-door starts bf as its own process group. Signal the group and the pid.
    kill -TERM -"$pid" 2>/dev/null || true
    kill -TERM "$pid" 2>/dev/null || true
    sleep 0.5
    kill -KILL -"$pid" 2>/dev/null || true
    kill -KILL "$pid" 2>/dev/null || true
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "stopped pid $pid ($pidfile)"
    fi
  fi
  rm -f "$pidfile"
}

RUN_ID="${1:-}"
if [[ -z "$RUN_ID" && -f "$EVIDENCE_ROOT/.last-run-id" ]]; then
  RUN_ID=$(cat "$EVIDENCE_ROOT/.last-run-id")
fi

if [[ -n "$RUN_ID" ]]; then
  stop_pidfile "$EVIDENCE_ROOT/$RUN_ID/server.pid"
  stop_pidfile "$EVIDENCE_ROOT/$RUN_ID/bf.pid"
else
  shopt -s nullglob
  for f in "$EVIDENCE_ROOT"/*/server.pid "$EVIDENCE_ROOT"/*/bf.pid; do
    stop_pidfile "$f"
  done
fi
echo "cleanup done (evidence retained under $EVIDENCE_ROOT)"
