$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$nodeBootstrap = Join-Path $PSScriptRoot "install-node-portable.ps1"
$portableNodeHome = Join-Path $repoRoot ".tools\node-v22.22.1-win-x64"
$portableNodeExe = Join-Path $portableNodeHome "node.exe"
$corepackHome = Join-Path $repoRoot ".tools\corepack-home"

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

Add-ToolPathEntries -PortableNodeHome $portableNodeHome

Write-Host "[bootstrap] Starting local bootstrap audit"

if (!(Test-Path $portableNodeExe) -and !(Get-Command node -ErrorAction SilentlyContinue)) {
    & $nodeBootstrap
    Add-ToolPathEntries -PortableNodeHome $portableNodeHome
}

$nodeVersion = if (Get-Command node -ErrorAction SilentlyContinue) {
    (& node --version)
} elseif (Test-Path $portableNodeExe) {
    (& $portableNodeExe --version)
} else {
    $null
}

$portablePnpm = Join-Path $portableNodeHome "pnpm.CMD"
$pnpmCommand = Get-Command pnpm -ErrorAction SilentlyContinue
$pnpmVersion = if (Test-Path $portablePnpm) {
    (& $portablePnpm --version) 2>&1
} elseif ($pnpmCommand) {
    (& $pnpmCommand.Source --version) 2>&1
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
Write-Host "  Node:   $(if ($nodeVersion) { $nodeVersion } else { 'missing' })"
Write-Host "  pnpm:   $(if ($pnpmVersion) { $pnpmVersion } else { 'missing' })"
Write-Host "  Python: $(if ($pythonVersion) { $pythonVersion } else { 'missing' })"
Write-Host "  Docker: $(if ($dockerVersion) { $dockerVersion } else { 'missing' })"

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
