$ErrorActionPreference = "Stop"

param(
    [string]$Target = "full"
)

$repoRoot = Split-Path -Parent $PSCommandPath
$artifactRoot = Join-Path $repoRoot "artifacts\agent-prompt-v2\local-ci"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logPath = Join-Path $artifactRoot "ci-local-$timestamp.log"
$portableNodeHome = Join-Path $repoRoot ".tools\node-v22.22.1-win-x64"
$portableNodeExe = Join-Path $portableNodeHome "node.exe"
$runnerScript = Join-Path $repoRoot "scripts\ci\full.mjs"
$bootstrapScript = Join-Path $repoRoot "scripts\bootstrap\install-node-portable.ps1"

New-Item -ItemType Directory -Force -Path $artifactRoot | Out-Null

function Set-DefaultEnv {
    param(
        [string]$Key,
        [string]$Value
    )

    $current = [Environment]::GetEnvironmentVariable($Key)
    if ([string]::IsNullOrWhiteSpace($current)) {
        Set-Item -Path "Env:$Key" -Value $Value
    }
}

if (!(Get-Command node -ErrorAction SilentlyContinue) -and !(Test-Path $portableNodeExe)) {
    & $bootstrapScript
}

$nodeExe = if (Get-Command node -ErrorAction SilentlyContinue) {
    (Get-Command node).Source
} elseif (Test-Path $portableNodeExe) {
    $portableNodeExe
} else {
    throw "Node runtime could not be resolved. Run ./scripts/bootstrap/install-node-portable.ps1 first."
}

Set-DefaultEnv "API_CORS_ORIGINS" "http://localhost:3001"
Set-DefaultEnv "API_PORT" "3000"
Set-DefaultEnv "DATABASE_URL" "postgresql://postgres:postgrespassword@localhost:5432/birthub_cycle1"
Set-DefaultEnv "NEXT_PUBLIC_API_URL" "http://localhost:3000"
Set-DefaultEnv "NEXT_PUBLIC_APP_URL" "http://localhost:3001"
Set-DefaultEnv "NEXT_PUBLIC_ENVIRONMENT" "ci-local"
Set-DefaultEnv "NODE_ENV" "test"
Set-DefaultEnv "QUEUE_NAME" "birthub-cycle1"
Set-DefaultEnv "REDIS_URL" "redis://localhost:6379"
Set-DefaultEnv "SESSION_SECRET" "ci-local-secret"
Set-DefaultEnv "WEB_BASE_URL" "http://localhost:3001"

Start-Transcript -Path $logPath | Out-Null

try {
    Push-Location $repoRoot

    Write-Host ""
    Write-Host "=============================="
    Write-Host "BIRTHHUB LOCAL CI"
    Write-Host "=============================="
    Write-Host "Target: $Target"
    Write-Host "Node:   $nodeExe"
    Write-Host "Log:    $logPath"
    Write-Host ""

    if ($Target -eq "full") {
        & $nodeExe $runnerScript full
    } else {
        & $nodeExe $runnerScript task $Target
    }
} finally {
    Pop-Location
    Stop-Transcript | Out-Null
}
