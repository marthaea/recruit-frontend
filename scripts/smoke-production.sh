#!/usr/bin/env bash
# Read-only production smoke checks (no credentials). See docs/DEPLOYMENT-RUNBOOK.md.
set -euo pipefail

BASE="${SMOKE_BASE_URL:-https://recruitfront.netlify.app}"
API_DIRECT="${SMOKE_API_URL:-https://api.mukasamatthew.com}"

check() {
  local url="$1"
  local expect="$2"
  local code
  code="$(curl --retry 3 --retry-delay 1 -sS -o /dev/null -w '%{http_code}' "$url")"
  if [[ "$code" != "$expect" ]]; then
    echo "FAIL $url expected HTTP $expect got $code" >&2
    exit 1
  fi
  echo "OK   $url ($code)"
}

check "$BASE/" 200
check "$BASE/vacancies" 200
check "$BASE/login" 200
check "$BASE/api/jobs" 200
check "$BASE/api/settings" 200

jobs="$(curl --retry 3 -sS "$BASE/api/jobs")"
total="$(python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('total', len(d.get('data',[]))))" <<<"$jobs")"
direct="$(curl --retry 3 -sS "$API_DIRECT/api/jobs")"
direct_total="$(python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('total', len(d.get('data',[]))))" <<<"$direct")"

if [[ "$total" != "$direct_total" ]]; then
  echo "FAIL job count mismatch: proxy=$total direct=$direct_total" >&2
  exit 1
fi
echo "OK   job count via proxy matches API ($total)"

auth_code="$(curl --retry 3 -sS -o /dev/null -w '%{http_code}' -X POST "$API_DIRECT/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke-invalid@example.com","password":"invalid"}')"
if [[ "$auth_code" != "401" ]]; then
  echo "FAIL auth login expected 401 got $auth_code" >&2
  exit 1
fi
echo "OK   auth rejects invalid credentials (401)"

echo "All production smoke checks passed."
