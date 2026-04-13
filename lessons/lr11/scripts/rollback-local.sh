#!/usr/bin/env bash
# rollback-local.sh — откат к предыдущему тегу (Linux/macOS)
# Использование: bash scripts/rollback-local.sh <tag>
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <previous-tag>"
  exit 1
fi

TAG="$1"
IMAGE="quiz-backend:${TAG}"

echo "==> Rolling back to image: ${IMAGE}"

# Check if image exists locally
if ! docker image inspect "${IMAGE}" &>/dev/null; then
  echo "ERROR: image '${IMAGE}' not found locally."
  echo "Available images:"
  docker images quiz-backend --format "  {{.Tag}}"
  exit 1
fi

echo "==> Tagging '${IMAGE}' as quiz-backend:latest"
docker tag "${IMAGE}" quiz-backend:latest

echo "==> Restarting backend container"
docker compose up -d backend

echo "==> Smoke-check after rollback"
sleep 5
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || true)

if [ "${STATUS}" = "200" ]; then
  echo "Rollback to '${TAG}' successful ✓"
else
  echo "WARNING: /health returned ${STATUS} — check docker compose logs backend"
fi
