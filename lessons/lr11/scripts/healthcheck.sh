#!/usr/bin/env bash
# healthcheck.sh — smoke-check после запуска контейнеров
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

check() {
  local endpoint="$1"
  local expected="$2"
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${endpoint}" || echo "000")
  if [ "${status}" = "${expected}" ]; then
    echo "  ✓ ${endpoint} -> ${status}"
  else
    echo "  ✗ ${endpoint} -> ${status} (expected ${expected})"
    return 1
  fi
}

echo "Running smoke-checks against ${BASE_URL}"
check "/health"         "200"
check "/api/auth/login" "422"   # expects body -> 422 or 400
check "/api/sessions"   "401"   # no token -> 401

echo "All smoke-checks passed ✓"
