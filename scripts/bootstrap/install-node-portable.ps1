param(
    [string]$NodeVersion = "22.22.1"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$toolsRoot = Join-Path $repoRoot ".tools"
$nodeFolder = "node-v$NodeVersion-win-x64"
$nodeHome = Join-Path $toolsRoot $nodeFolder
$nodeZip = Join-Path $toolsRoot "$nodeFolder.zip"
$shaFile = Join-Path $toolsRoot "node-v$NodeVersion-SHASUMS256.txt"
$corepackHome = Join-Path $toolsRoot "corepack-home"
$releaseBase = "https://nodejs.org/download/release/v$NodeVersion"

New-Item -ItemType Directory -Force -Path $toolsRoot | Out-Null
New-Item -ItemType Directory -Force -Path $corepackHome | Out-Null
$env:COREPACK_HOME = $corepackHome

if (!(Test-Path $nodeZip)) {
    Write-Host "[bootstrap] Downloading Node.js v$NodeVersion portable zip"
    $ProgressPreference = "SilentlyContinue"
    Invoke-WebRequest -Uri "$releaseBase/$nodeFolder.zip" -OutFile $nodeZip
}

if (!(Test-Path $shaFile)) {
    Write-Host "[bootstrap] Downloading SHASUMS256.txt"
    $ProgressPreference = "SilentlyContinue"
    Invoke-WebRequest -Uri "$releaseBase/SHASUMS256.txt" -OutFile $shaFile
}

$expectedHash = (
    Get-Content $shaFile |
        Select-String "$nodeFolder.zip" |
        Select-Object -First 1
).ToString().Split(" ", [System.StringSplitOptions]::RemoveEmptyEntries)[0]
$actualHash = (Get-FileHash $nodeZip -Algorithm SHA256).Hash.ToLower()

if ($expectedHash -ne $actualHash) {
    throw "Node.js zip checksum mismatch. Expected $expectedHash but got $actualHash."
}

if (!(Test-Path $nodeHome)) {
    Write-Host "[bootstrap] Expanding Node.js portable runtime"
    Expand-Archive -Path $nodeZip -DestinationPath $toolsRoot -Force
}

$nodeExe = Join-Path $nodeHome "node.exe"
$corepackCli = Join-Path $nodeHome "node_modules\corepack\dist\corepack.js"

if (!(Test-Path $nodeExe)) {
    throw "Node executable not found at $nodeExe"
}

Write-Host "[bootstrap] Enabling pnpm shim inside portable Node runtime"
& $nodeExe $corepackCli enable --install-directory $nodeHome pnpm
& $nodeExe $corepackCli prepare pnpm@9.1.0 --activate

$pythonPresent = [bool](Get-Command python -ErrorAction SilentlyContinue) -or [bool](Get-Command py -ErrorAction SilentlyContinue)
$dockerPresent = [bool](Get-Command docker -ErrorAction SilentlyContinue)

Write-Host ""
Write-Host "[bootstrap] Ready"
Write-Host "  Node: $nodeExe"
Write-Host "  pnpm: $(Join-Path $nodeHome 'pnpm.CMD')"

if (-not $pythonPresent) {
    Write-Warning "Python 3.12+ is still missing from PATH. Agent pytest suites will remain blocked."
}

if (-not $dockerPresent) {
    Write-Warning "Docker is still missing from PATH. Database/Redis bootstrap via compose will remain blocked."
}
