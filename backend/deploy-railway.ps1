# Deploy backend to Railway without Git
# Run: powershell -ExecutionPolicy Bypass -File .\deploy-railway.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "Loading variables from ../.env ..." -ForegroundColor Cyan
$envFile = Join-Path $PSScriptRoot "..\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: .env file not found in project root." -ForegroundColor Red
    exit 1
}

Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $val = $matches[2].Trim()
        if ($key -and $val -and $key -ne 'PORT') {
            Write-Host "  -> $key"
            npx @railway/cli variables --set "${key}=${val}"
        }
    }
}

Write-Host "Deploying to Railway..." -ForegroundColor Cyan
npx @railway/cli up -s dietmealfitbot-api -y --detach

Write-Host "Creating public domain..." -ForegroundColor Cyan
npx @railway/cli domain

Write-Host ""
Write-Host "Done! Check status:" -ForegroundColor Green
npx @railway/cli status
