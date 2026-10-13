#!/usr/bin/env bash
# The Farm Manager bar in src/components/site-nav.tsx must stay byte-identical
# to scripts/pins/site-nav.tsx and to AiEA's copy in scripts/pins/aiea-site-nav.tsx.
#
# Pinned to AiEA branch cursor/farm-manager-zone-nav-1339 @ a57499a94c39
# ("Address Farm Manager bar review"; same bytes at tip 2048f2cc1a53):
# indigo active-tab underline, sticky bar, account link omitted when
# zone="maintenance", client fetch of /api/auth/me only outside that zone.
# sha256 4e0ca12bb826d6410ff1d8a843a94f4b7f5b5b85d6d0f85afb33abe0374b8ac3
set -euo pipefail
cd "$(dirname "$0")/.."

sha256sum -c scripts/pins/site-nav.sha256
sha256sum -c scripts/pins/aiea-site-nav.sha256

if ! cmp -s src/components/site-nav.tsx scripts/pins/site-nav.tsx; then
  echo "src/components/site-nav.tsx is not byte-identical to scripts/pins/site-nav.tsx" >&2
  diff -u scripts/pins/site-nav.tsx src/components/site-nav.tsx >&2 || true
  exit 1
fi

if ! cmp -s src/components/site-nav.tsx scripts/pins/aiea-site-nav.tsx; then
  echo "src/components/site-nav.tsx is not byte-identical to scripts/pins/aiea-site-nav.tsx" >&2
  diff -u scripts/pins/aiea-site-nav.tsx src/components/site-nav.tsx >&2 || true
  exit 1
fi
