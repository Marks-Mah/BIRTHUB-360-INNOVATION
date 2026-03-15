$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$nodeBootstrap = Join-Path $PSScriptRoot "install-node-portable.ps1"
$portableNodeHome = Join-Path $repoRoot ".tools\node-v22.22.1-win-x64"
$portableNodeExe = Join-Path $portableNodeHome "node.exe"

Write-Host "[bootstrap] Starting local bootstrap audit"

if (!(Test-Path $portableNodeExe) -and !(Get-Command node -ErrorAction SilentlyContinue)) {
    & $nodeBootstrap
}

$nodeVersion = if (Get-Command node -ErrorAction SilentlyContinue) {
    (& node --version)
} elseif (Test-Path $portableNodeExe) {
    (& $portableNodeExe --version)
} else {
    $null
}

$pythonCommand = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCommand) {
    $pythonCommand = Get-Command py -ErrorAction SilentlyContinue
}

$pythonVersion = if ($pythonCommand) {
    (& $pythonCommand.Source --version) 2>&1
} else {
    $null
}

$dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
$dockerVersion = if ($dockerCommand) {
    (& $dockerCommand.Source --version)
} else {
    $null
}

Write-Host ""
Write-Host "[bootstrap] Runtime summary"
Write-Host "  Node:   $($nodeVersion ?? 'missing')"
Write-Host "  Python: $($pythonVersion ?? 'missing')"
Write-Host "  Docker: $($dockerVersion ?? 'missing')"

if (-not $pythonVersion) {
    Write-Warning "Python 3.12+ is still missing. 'pnpm test:agents' remains blocked until Python is installed."
}

if (-not $dockerVersion) {
    Write-Warning "Docker is still missing. Local Postgres 16 / Redis 7 bootstrap via compose remains blocked."
}

Write-Host ""
Write-Host "[bootstrap] Next commands"
Write-Host "  1. pwsh ./ci-local.ps1"
Write-Host "  2. pnpm ci:task core"
Write-Host "  3. pnpm ci:task satellites"
Write-Host "  4. pnpm ci:full"
