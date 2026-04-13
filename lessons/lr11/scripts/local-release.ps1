# local-release.ps1 — локальный CD-like сценарий (Windows PowerShell)
# Использование: .\scripts\local-release.ps1 [tag]
param(
  [string]$Tag = "local-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
)

$Image = "quiz-backend:$Tag"
$ErrorActionPreference = "Stop"

Write-Host "==> [1/4] Building Docker image: $Image" -ForegroundColor Cyan
docker build -t $Image .

Write-Host "==> [2/4] Tagging as 'quiz-backend:latest'" -ForegroundColor Cyan
docker tag $Image quiz-backend:latest

Write-Host "==> [3/4] Starting stack with docker compose" -ForegroundColor Cyan
$env:IMAGE_TAG = $Tag
docker compose up -d --build

Write-Host "==> [4/4] Smoke-check /health (up to 30s)" -ForegroundColor Cyan
$ok = $false
for ($i = 1; $i -le 10; $i++) {
  try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 3
    if ($resp.StatusCode -eq 200) {
      Write-Host "    /health -> 200 OK ✓" -ForegroundColor Green
      $ok = $true
      break
    }
  } catch {
    Write-Host "    Attempt $i/10: not ready, retrying in 3s..."
    Start-Sleep -Seconds 3
  }
}

if (-not $ok) {
  Write-Host "ERROR: smoke-check failed." -ForegroundColor Red
  docker compose logs --tail=50 backend
  exit 1
}

Write-Host ""
Write-Host "Release '$Tag' deployed successfully!" -ForegroundColor Green
Write-Host "To rollback: .\scripts\rollback-local.ps1 <previous-tag>"
