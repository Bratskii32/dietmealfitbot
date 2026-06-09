# Деплой на Vercel без Git
# Запуск: правый клик → "Выполнить с PowerShell" или: .\deploy.ps1

Set-Location $PSScriptRoot

Write-Host "Сборка проекта..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "Деплой на Vercel..." -ForegroundColor Cyan
npx vercel deploy --prod --yes

Write-Host "Готово!" -ForegroundColor Green
