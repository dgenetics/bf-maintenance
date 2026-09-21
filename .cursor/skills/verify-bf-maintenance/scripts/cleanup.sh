#!/usr/bin/env bash
set -euo pipefail
EVIDENCE_ROOT="$(cd "$(dirname "$0")/../evidence" && pwd)"
RUN_ID="${1:-}"
if [[ -z "$RUN_ID" ]]; then
  # clean latest pidfiles
  for f in "$EVIDENCE_ROOT"/*/server.pid; do
    [[ -f "$f" ]] || continue
    pid=$(cat "$f" || true)
    if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" || true
      echo "stopped $pid from $f"
    fi
    rm -f "$f"
  done
  exit 0
fi
pidfile="$EVIDENCE_ROOT/$RUN_ID/server.pid"
if [[ -f "$pidfile" ]]; then
  pid=$(cat "$pidfile")
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" || true
    echo "stopped $pid"
  fi
  rm -f "$pidfile"
fi
