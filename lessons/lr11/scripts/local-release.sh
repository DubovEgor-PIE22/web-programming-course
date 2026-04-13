#!/usr/bin/env bash
# local-release.sh — локальный CD-like сценарий (Linux/macOS)
# Использование: bash scripts/local-release.sh [TAG]
set -euo pipefail

TAG="${1:-local-$(date +%Y%m%d-%H%M%S)}"
IMAGE="quiz-backend:${TAG}"

echo "==> [1/4] Building Docker image: ${IMAGE}"
docker build -t "${IMAGE}" .

echo "==> [2/4] Tagging as 'quiz-backend:latest'"
docker tag "${IMAGE}" quiz-backend:latest

echo "==> [3/4] Starting stack with docker compose"
IMAGE_TAG="${TAG}" docker compose up -d --build

echo "==> [4/4] Smoke-check (waiting up to 30s for /health)"
for i in $(seq 1 10); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || true)
  if [ "${STATUS}" = "200" ]; then
    echo "    /health -> 200 OK ✓"
    break
  fi
  echo "    Attempt ${i}/10: status=${STATUS}, retrying in 3s..."
  sleep 3
done

if [ "${STATUS}" != "200" ]; then
  echo "ERROR: smoke-check failed after 30s. Check logs:"
  docker compose logs --tail=50 backend
  exit 1
fi

echo ""
echo "Release '${TAG}' deployed successfully!"
echo "To rollback: bash scripts/rollback-local.sh <previous-tag>"
