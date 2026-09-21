# Pin gate

## Sub-features
- Unlock with farm PIN
- Reject wrong PIN
- Session cookie for subsequent API calls

## How to get to it (user POV)
Open the app root. Locked UI asks for PIN before systems/maintenance.

## Driving it with curl
```bash
# wrong
curl -s -o /tmp/bad.json -w "%{http_code}" -X POST "$BASE/api/auth/login" \
  -H 'content-type: application/json' -d '{"pin":"0000"}'
# expect 401

# right (pin from BF_ACCESS_PIN)
curl -s -c /tmp/bf.jar -o /tmp/ok.json -w "%{http_code}" -X POST "$BASE/api/auth/login" \
  -H 'content-type: application/json' -d "{\"pin\":\"$BF_ACCESS_PIN\"}"
# expect 200 + Set-Cookie
```

## Gotchas
- Env var is `BF_ACCESS_PIN` (see `.env.example`).
- Vercel Preview may also have Deployment Protection (Vercel SSO) in front of the app PIN.
