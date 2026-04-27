#!/usr/bin/env bash
# Light regression smoke. One happy-path call per endpoint group.
# Usage:
#   bash tools/qa/regression-smoke.sh                      # full surface
#   bash tools/qa/regression-smoke.sh auth onboarding      # only specified groups
#
# Exit code:
#   0 = all checks passed
#   1 = one or more checks failed (see stdout for which)
#
# This script is intentionally shallow. It catches "the API is broken in an obvious
# way" — not subtle bugs. Use /run-diff-test for depth.

set -uo pipefail

BASE="http://localhost:8080/api/v1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Pretty output ─────────────────────────────────────────────────────────────
PASS=0
FAIL=0
declare -a FAILED
ts() { date +"%H:%M:%S"; }
ok()   { PASS=$((PASS+1)); printf "  [%s] ✓ %s\n" "$(ts)" "$1"; }
nope() { FAIL=$((FAIL+1)); FAILED+=("$1"); printf "  [%s] ✗ %s — got: %s\n" "$(ts)" "$1" "${2:-}"; }

# ── Health gate ───────────────────────────────────────────────────────────────
H=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/health")
if [ "$H" != "200" ]; then
  echo "✗ Health check failed (HTTP $H). Server not ready. Aborting."
  exit 1
fi
echo "Health: ok"

# ── Scope ─────────────────────────────────────────────────────────────────────
FEATURES=("$@")
if [ ${#FEATURES[@]} -eq 0 ]; then
  FEATURES=(auth onboarding profile banks rates)
fi
in_scope() {
  for g in "${FEATURES[@]}"; do [ "$g" = "$1" ] && return 0; done
  return 1
}

# ── Setup: ensure smoke users exist ───────────────────────────────────────────
SMOKE_PRO_EMAIL="qa-smoke-pro@regression.dev"
SMOKE_PRO_PHONE="+2348011000111"
SMOKE_CLIENT_EMAIL="qa-smoke-client@regression.dev"
SMOKE_CLIENT_PHONE="+2348011000112"

# ── Helpers ───────────────────────────────────────────────────────────────────
flush() { node "$SCRIPT_DIR/flush-all.mjs" >/dev/null 2>&1; }

# Login or register on demand
login_or_register() {
  local email=$1 phone=$2 wanted_role=${3:-client}
  flush
  local resp
  resp=$(curl -s -X POST "$BASE/auth/login" -H 'content-type: application/json' \
    -d "{\"email\":\"$email\",\"password\":\"Password123!\"}")
  local at
  at=$(echo "$resp" | python3 -c "import sys,json
try:
  d=json.load(sys.stdin)
  print(d['data']['access_token'])
except Exception:
  print('')" 2>/dev/null)
  if [ -z "$at" ]; then
    # Need to register
    flush
    local reg
    reg=$(node "$SCRIPT_DIR/register-user.mjs" "$email" "$phone" 2>/dev/null)
    at=$(echo "$reg" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null || echo "")
    if [ "$wanted_role" = "professional" ] && [ -n "$at" ]; then
      flush
      curl -s -X POST "$BASE/onboarding/role" -H "Authorization: Bearer $at" \
        -H 'content-type: application/json' -d '{"role":"professional"}' >/dev/null
      # Re-login to get JWT with the new role claim
      flush
      resp=$(curl -s -X POST "$BASE/auth/login" -H 'content-type: application/json' \
        -d "{\"email\":\"$email\",\"password\":\"Password123!\"}")
      at=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['access_token'])" 2>/dev/null || echo "")
    fi
  fi
  echo "$at"
}

# ── auth ──────────────────────────────────────────────────────────────────────
if in_scope auth; then
  echo ""
  echo "── auth ──"
  PRO_AT=$(login_or_register "$SMOKE_PRO_EMAIL" "$SMOKE_PRO_PHONE" professional)
  CLIENT_AT=$(login_or_register "$SMOKE_CLIENT_EMAIL" "$SMOKE_CLIENT_PHONE" client)

  [ -n "$PRO_AT" ] && ok "auth: pro login + role=professional" || nope "auth: pro login" "no token"
  [ -n "$CLIENT_AT" ] && ok "auth: client login" || nope "auth: client login" "no token"

  flush
  HC=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/auth/login" \
    -H 'content-type: application/json' \
    -d "{\"email\":\"$SMOKE_PRO_EMAIL\",\"password\":\"DELIBERATELY_WRONG_PASSWORD\"}")
  [ "$HC" = "401" ] && ok "auth: wrong password → 401" || nope "auth: wrong password expected 401" "$HC"

  flush
  HC=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/me" -H "Authorization: Bearer $PRO_AT")
  [ "$HC" = "200" ] && ok "auth: bearer token works on /me" || nope "auth: /me with bearer" "$HC"
fi

# ── onboarding ────────────────────────────────────────────────────────────────
if in_scope onboarding; then
  echo ""
  echo "── onboarding ──"
  PRO_AT=${PRO_AT:-$(login_or_register "$SMOKE_PRO_EMAIL" "$SMOKE_PRO_PHONE" professional)}

  HC=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/onboarding/status" -H "Authorization: Bearer $PRO_AT")
  [ "$HC" = "200" ] && ok "onboarding: GET /status" || nope "onboarding: GET /status" "$HC"

  HC=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/onboarding/handle/check?handle=somefreehandle$RANDOM" -H "Authorization: Bearer $PRO_AT")
  [ "$HC" = "200" ] && ok "onboarding: GET /handle/check (available)" || nope "onboarding: handle/check" "$HC"

  HC=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/onboarding/handle/check?handle=admin" -H "Authorization: Bearer $PRO_AT")
  [ "$HC" = "200" ] && ok "onboarding: handle/check reserved (returns 200, available:false)" || nope "onboarding: handle/check reserved" "$HC"

  HC=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH "$BASE/onboarding/kyc/professional" \
    -H "Authorization: Bearer $PRO_AT" -H 'content-type: application/json' \
    -d '{"occupation":"Smoke Test Engineer"}')
  [ "$HC" = "200" ] && ok "onboarding: PATCH /kyc/professional" || nope "onboarding: PATCH /kyc/professional" "$HC"
fi

# ── profile ───────────────────────────────────────────────────────────────────
if in_scope profile; then
  echo ""
  echo "── profile ──"
  PRO_AT=${PRO_AT:-$(login_or_register "$SMOKE_PRO_EMAIL" "$SMOKE_PRO_PHONE" professional)}

  HC=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/me" -H "Authorization: Bearer $PRO_AT")
  [ "$HC" = "200" ] && ok "profile: GET /me" || nope "profile: GET /me" "$HC"

  HC=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH "$BASE/me" \
    -H "Authorization: Bearer $PRO_AT" -H 'content-type: application/json' \
    -d '{"description":"smoke test"}')
  [ "$HC" = "200" ] && ok "profile: PATCH /me" || nope "profile: PATCH /me" "$HC"

  HC=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/me/notification-preferences" -H "Authorization: Bearer $PRO_AT")
  [ "$HC" = "200" ] && ok "profile: GET /me/notification-preferences" || nope "profile: notification-preferences" "$HC"

  HC=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/me/bank-account" -H "Authorization: Bearer $PRO_AT")
  [ "$HC" = "200" ] && ok "profile: GET /me/bank-account" || nope "profile: bank-account read" "$HC"

  flush
  HC=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/me/sensitive-action/otp" \
    -H "Authorization: Bearer $PRO_AT" -H 'content-type: application/json' \
    -d '{"action":"change_password"}')
  [ "$HC" = "200" ] && ok "profile: POST sensitive-action/otp" || nope "profile: sensitive-action otp" "$HC"
fi

# ── banks ─────────────────────────────────────────────────────────────────────
if in_scope banks; then
  echo ""
  echo "── banks ──"
  PRO_AT=${PRO_AT:-$(login_or_register "$SMOKE_PRO_EMAIL" "$SMOKE_PRO_PHONE" professional)}

  HC=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/banks" -H "Authorization: Bearer $PRO_AT")
  [ "$HC" = "200" ] && ok "banks: GET /banks (200)" || nope "banks: GET /banks" "$HC"

  ETAG=$(curl -si "$BASE/banks" -H "Authorization: Bearer $PRO_AT" | grep -i '^etag:' | sed 's/^[Ee][Tt][Aa][Gg]: //;s/\r//')
  if [ -n "$ETAG" ]; then
    HC304=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/banks" -H "Authorization: Bearer $PRO_AT" -H "If-None-Match: $ETAG")
    [ "$HC304" = "304" ] && ok "banks: ETag revalidation → 304" || nope "banks: ETag revalidation" "$HC304"
  else
    nope "banks: ETag header missing" ""
  fi

  flush
  # Note: /banks/resolve hits Paystack live. Use test bank 001 if seeded; otherwise skip.
  HAS_TEST_BANK=$(node "$SCRIPT_DIR/db.mjs" "SELECT count(*)::int as c FROM banks WHERE code = '001' AND is_active = TRUE" 2>/dev/null | python3 -c "import sys,json; print(json.loads(sys.stdin.read().strip())['c'])" 2>/dev/null || echo 0)
  if [ "$HAS_TEST_BANK" -ge 1 ]; then
    HC=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/banks/resolve?account_number=1101011940&bank_code=001" -H "Authorization: Bearer $PRO_AT")
    [ "$HC" = "200" ] && ok "banks: GET /banks/resolve (test bank 001)" || nope "banks: /banks/resolve" "$HC"
  else
    echo "  [skip] banks: /banks/resolve (test bank 001 not seeded; would burn real Paystack quota)"
  fi
fi

# ── rates ─────────────────────────────────────────────────────────────────────
if in_scope rates; then
  echo ""
  echo "── rates ──"
  PRO_AT=${PRO_AT:-$(login_or_register "$SMOKE_PRO_EMAIL" "$SMOKE_PRO_PHONE" professional)}
  CLIENT_AT=${CLIENT_AT:-$(login_or_register "$SMOKE_CLIENT_EMAIL" "$SMOKE_CLIENT_PHONE" client)}

  HC=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/me/rates" -H "Authorization: Bearer $PRO_AT")
  [ "$HC" = "200" ] && ok "rates: GET /me/rates (pro)" || nope "rates: GET as pro" "$HC"

  HC=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/me/rates" -H "Authorization: Bearer $CLIENT_AT")
  [ "$HC" = "403" ] && ok "rates: client → 403" || nope "rates: client expected 403" "$HC"

  # Find an unused (call_type, duration) shape so POST doesn't 409 against existing rows
  flush
  USED=$(curl -s "$BASE/me/rates" -H "Authorization: Bearer $PRO_AT" | python3 -c "
import sys, json
d = json.load(sys.stdin).get('data', [])
print(','.join([r['call_type']+':'+str(r['duration_minutes']) for r in d]))
")
  PICKED=""
  for d in 5 10 15 20 25 30 45 60; do
    for ct in audio video; do
      pair="$ct:$d"
      if ! echo "$USED" | grep -q "$pair"; then
        PICKED="$ct $d"
        break 2
      fi
    done
  done
  if [ -n "$PICKED" ]; then
    set -- $PICKED
    BODY="{\"call_type\":\"$1\",\"duration_minutes\":$2,\"price_kobo\":1000000}"
    flush
    HC=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/me/rates" \
      -H "Authorization: Bearer $PRO_AT" -H 'content-type: application/json' -d "$BODY")
    [ "$HC" = "201" ] && ok "rates: POST /me/rates ($PICKED)" || nope "rates: POST /me/rates" "$HC"
  else
    echo "  [skip] rates: POST — all 16 shapes already exist for smoke pro"
  fi
fi

# ── Tally ─────────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════"
echo "  Passed: $PASS"
echo "  Failed: $FAIL"
if [ $FAIL -gt 0 ]; then
  echo "  Failures:"
  for f in "${FAILED[@]}"; do echo "    - $f"; done
  exit 1
fi
exit 0
