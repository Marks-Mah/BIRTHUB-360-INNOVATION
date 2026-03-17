param(
    [string]$Target = "full"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSCommandPath
$artifactRoot = Join-Path $repoRoot "artifacts\agent-prompt-v2\local-ci"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logPath = Join-Path $artifactRoot "ci-local-$timestamp.log"
$portableNodeHome = Join-Path $repoRoot ".tools\node-v22.22.1-win-x64"
$portableNodeExe = Join-Path $portableNodeHome "node.exe"
$corepackHome = Join-Path $repoRoot ".tools\corepack-home"
$runnerScript = Join-Path $repoRoot "scripts\ci\full.mjs"
$bootstrapScript = Join-Path $repoRoot "scripts\bootstrap\install-node-portable.ps1"

New-Item -ItemType Directory -Force -Path $artifactRoot | Out-Null
New-Item -ItemType Directory -Force -Path $corepackHome | Out-Null
$env:COREPACK_HOME = $corepackHome

function Get-ExistingDirectories {
    param(
        [string[]]$Paths
    )

    $existing = @()

    foreach ($pathEntry in $Paths) {
        if (-not $pathEntry) {
            continue
        }

        try {
            if (Test-Path $pathEntry -PathType Container -ErrorAction Stop) {
                $existing += $pathEntry
            }
        } catch {
            continue
        }
    }

    return $existing | Select-Object -Unique
}

function Get-GitHubDesktopGitEntries {
    $localAppData = $env:LOCALAPPDATA
    if ([string]::IsNullOrWhiteSpace($localAppData)) {
        return @()
    }

    $desktopRoot = Join-Path $localAppData "GitHubDesktop"
    if (!(Test-Path $desktopRoot -PathType Container)) {
        return @()
    }

    $entries = @()
    foreach ($directory in Get-ChildItem $desktopRoot -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "app-*" }) {
        $entries += Get-ExistingDirectories @(
            (Join-Path $directory.FullName "resources\app\git\cmd"),
            (Join-Path $directory.FullName "resources\app\git\bin")
        )
    }

    return $entries
}

function Get-PortablePythonEntries {
    $localAppData = $env:LOCALAPPDATA
    if ([string]::IsNullOrWhiteSpace($localAppData)) {
        return @()
    }

    $programsRoot = Join-Path $localAppData "Programs\Python"
    if (!(Test-Path $programsRoot -PathType Container)) {
        return @()
    }

    $entries = @()
    $pythonHomes = Get-ChildItem $programsRoot -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^Python3\d{2,}$' } |
        Sort-Object Name -Descending

    foreach ($pythonHome in $pythonHomes) {
        $entries += $pythonHome.FullName
        $entries += Join-Path $pythonHome.FullName "Scripts"
    }

    $entries += Join-Path $programsRoot "Launcher"
    return Get-ExistingDirectories $entries
}

function Get-CommonToolPathEntries {
    param(
        [string]$PortableNodeHome
    )

    $programFilesX86 = ${env:ProgramFiles(x86)}
    $entries = @(
        $PortableNodeHome,
        (Join-Path $env:ProgramFiles "nodejs"),
        (Join-Path $env:ProgramFiles "Git\cmd"),
        (Join-Path $env:ProgramFiles "Git\bin"),
        (Join-Path $env:ProgramFiles "Docker\Docker\resources\bin"),
        (Join-Path $env:APPDATA "npm"),
        (Join-Path $env:LOCALAPPDATA "pnpm"),
        (Join-Path $env:USERPROFILE "scoop\shims")
    )

    if ($programFilesX86) {
        $entries += Join-Path $programFilesX86 "Git\cmd"
        $entries += Join-Path $programFilesX86 "Git\bin"
    }

    $entries += Get-PortablePythonEntries
    $entries += Get-GitHubDesktopGitEntries
    return Get-ExistingDirectories $entries
}

function Add-ToolPathEntries {
    param(
        [string]$PortableNodeHome
    )

    $currentEntries = @([Environment]::GetEnvironmentVariable("PATH", "Process") -split ";")
    $pathEntries = @()
    $pathEntries += Get-CommonToolPathEntries -PortableNodeHome $PortableNodeHome
    $pathEntries += $currentEntries
    $pathEntries = $pathEntries | Where-Object { $_ } | Select-Object -Unique

    [Environment]::SetEnvironmentVariable("PATH", ($pathEntries -join ";"), "Process")
}

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

Add-ToolPathEntries -PortableNodeHome $portableNodeHome

if (!(Get-Command node -ErrorAction SilentlyContinue) -and !(Test-Path $portableNodeExe)) {
    & $bootstrapScript
    Add-ToolPathEntries -PortableNodeHome $portableNodeHome
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
