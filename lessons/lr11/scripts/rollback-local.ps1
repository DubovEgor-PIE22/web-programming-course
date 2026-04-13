# rollback-local.ps1 — откат к предыдущему тегу (Windows PowerShell)
# Использование: .\scripts\rollback-local.ps1 <tag>
param(
  [Parameter(Mandatory)][string]$Tag
)
$ErrorActionPreference = "Stop"

$Image = "quiz-backend:$Tag"

Write-Host "==> Rolling back to image: $Image" -ForegroundColor Cyan

$exists = docker image inspect $Image 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "ERROR: image '$Image' not found locally." -ForegroundColor Red
  Write-Host "Available images:"
  docker images quiz-backend --format "  {{.Tag}}"
  exit 1
}

Write-Host "==> Tagging '$Image' as quiz-backend:latest"
docker tag $Image quiz-backend:latest

Write-Host "==> Restarting backend container"
docker compose up -d backend

Write-Host "==> Smoke-check after rollback"
Start-Sleep -Seconds 5

try {
  $resp = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 5
  if ($resp.StatusCode -eq 200) {
    Write-Host "Rollback to '$Tag' successful ✓" -ForegroundColor Green
  }
} catch {
  Write-Host "WARNING: /health check failed — check: docker compose logs backend" -ForegroundColor Yellow
}
