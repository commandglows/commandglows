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

if (Get-Command wsl.exe -ErrorAction SilentlyContinue) {
    $wslStatus = & wsl.exe --status 2>$null
    if ($LASTEXITCODE -eq 0 -and $wslStatus) {
        Write-Warn 'WSL est disponible. Pour le CLI complet, utilise le parcours WSL.'
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
        Fail 'RepoUrl doit pointer vers un dépôt GitHub public pour l’installation Windows sans Git.'
    }

    $tempRoot = Join-Path ([IO.Path]::GetTempPath()) ("shipglowz-" + [guid]::NewGuid().ToString('N'))
    $archivePath = Join-Path $tempRoot 'shipglowz.zip'
    New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
    try {
        Write-Info "Téléchargement de ShipGlowz dans $ShipglowzDir..."
        & curl.exe -fsSL $archiveUrl -o $archivePath
        if ($LASTEXITCODE -ne 0) { Fail 'Le téléchargement de ShipGlowz a échoué.' }
        Expand-Archive -LiteralPath $archivePath -DestinationPath $tempRoot -Force
        $extracted = Get-ChildItem -LiteralPath $tempRoot -Directory | Select-Object -First 1
        if (-not $extracted) { Fail 'L’archive ShipGlowz est invalide.' }
        Move-Item -LiteralPath $extracted.FullName -Destination $ShipglowzDir
    } finally {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
} elseif (-not (Test-Path -LiteralPath (Join-Path $ShipglowzDir 'local/install_local.ps1'))) {
    Fail "$ShipglowzDir existe déjà mais ne contient pas une installation ShipGlowz valide."
}

$localInstaller = Join-Path $ShipglowzDir 'local/install_local.ps1'
if (-not (Test-Path -LiteralPath $localInstaller)) {
    Fail "Installateur Windows introuvable: $localInstaller"
}

Write-Info 'Lancement de la configuration locale Windows.'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $localInstaller
if ($LASTEXITCODE -ne 0) { Fail 'La configuration locale Windows a échoué.' }

Write-Host ''
Write-Host 'Installation locale ShipGlowz terminée.' -ForegroundColor Green
Write-Host 'Utilise ensuite: tunnel -Port 3001' -ForegroundColor Green
