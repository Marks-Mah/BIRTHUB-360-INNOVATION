$ErrorActionPreference = "Stop"

$repo = "C:\Users\marce\OneDrive\Documents\GitHub\PROJETO-FINAL-BIRTHUB-360-INNOVATION"
$log = "$repo\docs\evidence\ci-local.log"

if (!(Test-Path "$repo\docs\evidence")) {
    New-Item -ItemType Directory -Path "$repo\docs\evidence" -Force
}

Start-Transcript -Path $log

Write-Host ""
Write-Host "=============================="
Write-Host "BIRTHHUB LOCAL CI"
Write-Host "=============================="
Write-Host ""

cd $repo

Write-Host "STEP 1 — Install dependencies"
pnpm install

Write-Host ""
Write-Host "STEP 2 — Prisma Generate"
pnpm prisma generate

Write-Host ""
Write-Host "STEP 3 — Typecheck"
pnpm -r exec tsc --noEmit

Write-Host ""
Write-Host "STEP 4 — Build"
pnpm build

Write-Host ""
Write-Host "STEP 5 — Tests"
pnpm test

Write-Host ""
Write-Host "STEP 6 — Agents Tests"
pnpm test:agents

Write-Host ""
Write-Host "=============================="
Write-Host "CI LOCAL COMPLETED"
Write-Host "=============================="

Stop-Transcript