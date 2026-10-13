#!/usr/bin/env bash
# The Farm Manager bar in src/components/site-nav.tsx must stay byte-identical
# to scripts/pins/site-nav.tsx and to AiEA's copy in scripts/pins/aiea-site-nav.tsx.
#
# SSO bar: both zones show Account (/account) or Sign in (/login?next=<current>),
# and both fetch /api/auth/me. This file must stay byte-identical to AiEA's
# src/components/site-nav.tsx once the parallel SSO PR lands. If that PR's
# bytes differ, re-pin scripts/pins/aiea-site-nav.sha256 from their file.
# sha256 6a13b05fcf4a700cbd4187e78c6c9d832f9a8bc0bddd453ca8a740cd625d2f0f
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
