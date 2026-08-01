# ShipGlowz native Windows bootstrap.
# This is the PowerShell counterpart to install-shipglowz.sh. It intentionally
# installs only the local tunnel layer; the complete server installer remains
# Linux/Ubuntu-only.

[CmdletBinding()]
param(
    [string]$RepoUrl = $(if ($env:SHIPGLOWZ_REPO_URL) { $env:SHIPGLOWZ_REPO_URL } else { 'https://github.com/dianedef/shipglowz.git' }),
    [Alias('Version', 'Tag', 'Ref')]
    [string]$Branch = $(if ($env:SHIPGLOWZ_BRANCH) { $env:SHIPGLOWZ_BRANCH } else { 'main' }),
    [string]$ShipglowzDir = $(if ($env:SHIPGLOWZ_DIR) { $env:SHIPGLOWZ_DIR } else { Join-Path $env:USERPROFILE 'shipglowz' })
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-Info([string]$Message) { Write-Host "[ShipGlowz] $Message" -ForegroundColor Cyan }
function Write-Warn([string]$Message) { Write-Host "[ShipGlowz] $Message" -ForegroundColor Yellow }
function Fail([string]$Message) { Write-Error "[ShipGlowz] $Message"; exit 1 }
function Remove-PathIfPresent([string]$Path) {
    if (Test-Path -LiteralPath $Path) {
        Remove-Item -LiteralPath $Path -Force -Recurse -ErrorAction SilentlyContinue
    }
}

if (Get-Command wsl.exe -ErrorAction SilentlyContinue) {
    $wslProbeOutput = (& wsl.exe -e sh -lc 'printf ok' 2>$null | Out-String).Trim()
    if ($LASTEXITCODE -eq 0 -and $wslProbeOutput -eq 'ok') {
        Write-Warn 'WSL est disponible. Pour le CLI complet, utilise le parcours WSL.'
    } else {
        Write-Warn 'WSL is detected but unusable on this machine; using native Windows local mode.'
    }
}

$parent = Split-Path -Parent $ShipglowzDir
if (-not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
}

if (-not (Test-Path -LiteralPath $ShipglowzDir)) {
    $archiveBase = $RepoUrl.TrimEnd('/') -replace '\.git$', ''
    if ($archiveBase -match '^https://github\.com/([^/]+/[^/]+)$') {
        $archiveUrl = "https://github.com/$($Matches[1])/archive/refs/heads/$Branch.zip"
    } else {
        Fail 'RepoUrl must point to a public GitHub repository for the Windows installation without Git.'
    }

    $tempRoot = Join-Path ([IO.Path]::GetTempPath()) ("shipglowz-" + [guid]::NewGuid().ToString('N'))
    $archivePath = Join-Path $tempRoot 'shipglowz.zip'
    $extractRoot = Join-Path $tempRoot 'extract'
    New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $extractRoot -Force | Out-Null
    try {
        Write-Info "Downloading ShipGlowz into $ShipglowzDir..."
        & curl.exe -fsSL $archiveUrl -o $archivePath
        if ($LASTEXITCODE -ne 0) { Fail 'ShipGlowz download failed.' }
        Expand-Archive -LiteralPath $archivePath -DestinationPath $extractRoot
        $extracted = Get-ChildItem -LiteralPath $extractRoot -Force -Directory | Select-Object -First 1
        if (-not $extracted) { Fail 'The ShipGlowz archive is invalid.' }
        Move-Item -LiteralPath $extracted.FullName -Destination $ShipglowzDir
    } finally {
        Remove-PathIfPresent $tempRoot
    }
} elseif (-not (Test-Path -LiteralPath (Join-Path $ShipglowzDir 'local/install_local.ps1'))) {
    Fail "$ShipglowzDir already exists but does not contain a valid ShipGlowz installation."
}

$localInstaller = Join-Path $ShipglowzDir 'local/install_local.ps1'
if (-not (Test-Path -LiteralPath $localInstaller)) {
    Fail "Installateur Windows introuvable: $localInstaller"
}

# Repair an existing checkout that still contains the legacy generated script.
# The bootstrap must not silently keep executing an older local installer.
$localInstallerBytes = [IO.File]::ReadAllBytes($localInstaller)
$localInstallerText = [Text.Encoding]::UTF8.GetString($localInstallerBytes)
$legacyMarkers = @(
    ('`' + [char]36 + 'Port')
    ([char]36 + '{YELLOW}')
    ([char]36 + '{GREEN}')
    ([char]36 + '{NC}')
)
$hasLegacyMarker = $legacyMarkers | Where-Object { $localInstallerText.Contains($_) } | Select-Object -First 1
$hasUtf8Bom = $localInstallerBytes.Length -ge 3 -and $localInstallerBytes[0] -eq 0xEF -and $localInstallerBytes[1] -eq 0xBB -and $localInstallerBytes[2] -eq 0xBF
if ($hasLegacyMarker -or -not $hasUtf8Bom) {
    Write-Warn 'The existing local Windows installer is outdated; refreshing only local/install_local.ps1.'
    $archiveBase = $RepoUrl.TrimEnd('/') -replace '\.git$', ''
    if ($archiveBase -notmatch '^https://github\.com/([^/]+/[^/]+)$') {
        Fail 'RepoUrl must point to a public GitHub repository to refresh the Windows installer.'
    }
    $archiveUrl = "https://github.com/$($Matches[1])/archive/refs/heads/$Branch.zip"
    $tempRoot = Join-Path ([IO.Path]::GetTempPath()) ("shipglowz-refresh-" + [guid]::NewGuid().ToString('N'))
    $archivePath = Join-Path $tempRoot 'shipglowz.zip'
    $extractRoot = Join-Path $tempRoot 'extract'
    New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $extractRoot -Force | Out-Null
    try {
        & curl.exe -fsSL $archiveUrl -o $archivePath
        if ($LASTEXITCODE -ne 0) { Fail 'ShipGlowz installer refresh failed.' }
        Expand-Archive -LiteralPath $archivePath -DestinationPath $extractRoot
        $extracted = Get-ChildItem -LiteralPath $extractRoot -Force -Directory | Select-Object -First 1
        $freshLocalInstaller = if ($extracted) { Join-Path $extracted.FullName 'local/install_local.ps1' } else { $null }
        if (-not $freshLocalInstaller -or -not (Test-Path -LiteralPath $freshLocalInstaller)) {
            Fail 'The refreshed ShipGlowz archive does not contain local/install_local.ps1.'
        }
        Copy-Item -LiteralPath $freshLocalInstaller -Destination $localInstaller -Force
    } finally {
        Remove-PathIfPresent $tempRoot
    }
}

Write-Info 'Lancement de la configuration locale Windows.'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $localInstaller
if ($LASTEXITCODE -ne 0) { Fail 'Native Windows configuration failed.' }

Write-Host ''
Write-Host 'ShipGlowz native Windows installation completed.' -ForegroundColor Green
Write-Host 'Utilise ensuite: tunnel -Port 3001' -ForegroundColor Green
