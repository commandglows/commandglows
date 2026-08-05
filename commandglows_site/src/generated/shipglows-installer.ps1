# ShipGlows native Windows bootstrap.
# This is the PowerShell counterpart to install-shipglows.sh. It intentionally
# installs only the local tunnel layer; the complete server installer remains
# Linux/Ubuntu-only.

[CmdletBinding()]
param(
    [string]$RepoUrl,
    [Alias('Version', 'Tag', 'Ref')]
    [string]$Branch,
    [string]$ShipGlowsDir,
    [switch]$DownloadOnly
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Deprecated compatibility adapter. Canonical SHIPGLOWS_* values always win.
function Resolve-CompatibleValue([string]$Canonical, [string]$LegacyShipGlowz, [string]$LegacyShipFlow, [string]$Default) {
    if ($Canonical) { return $Canonical }
    if ($LegacyShipGlowz) { Write-Warning 'Deprecated SHIPGLOWZ_* variable detected; migrate to SHIPGLOWS_*.'; return $LegacyShipGlowz }
    if ($LegacyShipFlow) { Write-Warning 'Deprecated SHIPFLOW_* variable detected; migrate to SHIPGLOWS_*.'; return $LegacyShipFlow }
    return $Default
}

if (-not $RepoUrl) { $RepoUrl = Resolve-CompatibleValue $env:SHIPGLOWS_REPO_URL $env:SHIPGLOWZ_REPO_URL $env:SHIPFLOW_REPO_URL 'https://github.com/commandglows/shipglows.git' }
if (-not $Branch) { $Branch = Resolve-CompatibleValue $env:SHIPGLOWS_BRANCH $env:SHIPGLOWZ_BRANCH $env:SHIPFLOW_BRANCH 'main' }
if (-not $ShipGlowsDir) { $ShipGlowsDir = Resolve-CompatibleValue $env:SHIPGLOWS_DIR $env:SHIPGLOWZ_DIR $env:SHIPFLOW_DIR (Join-Path $env:USERPROFILE 'shipglows') }

function Write-Info([string]$Message) { Write-Host "[ShipGlows] $Message" -ForegroundColor Cyan }
function Write-Warn([string]$Message) { Write-Host "[ShipGlows] $Message" -ForegroundColor Yellow }
function Fail([string]$Message) { Write-Error "[ShipGlows] $Message"; exit 1 }
function Remove-PathIfPresent([string]$Path) {
    if (Test-Path -LiteralPath $Path) {
        Remove-Item -LiteralPath $Path -Force -Recurse -ErrorAction SilentlyContinue
    }
}
function Extract-ShipGlowsLocalInstaller([string]$ArchivePath, [string]$DestinationPath) {
    $windowsTarPath = Join-Path $env:WINDIR 'System32\tar.exe'
    if (Test-Path -LiteralPath $windowsTarPath) {
        $tarPath = $windowsTarPath
    } else {
        $fallbackTar = Get-Command tar.exe -CommandType Application -All -ErrorAction SilentlyContinue | Select-Object -First 1
        $tarPath = if ($fallbackTar) { $fallbackTar.Source } else { $null }
    }
    if (-not $tarPath) {
        Fail 'Windows tar.exe is required to extract ShipGlows without Microsoft.PowerShell.Archive.'
    }

    $archiveEntries = @(& $tarPath -tf $ArchivePath)
    if ($LASTEXITCODE -ne 0) {
        Fail 'Could not inspect the ShipGlows archive with tar.exe.'
    }
    $installerEntries = @(
        $archiveEntries | Where-Object { $_ -match '^[^/]+/local/install_local\.ps1$' }
    )
    if ($installerEntries.Count -ne 1) {
        Fail 'The ShipGlows archive must contain exactly one local/install_local.ps1.'
    }

    & $tarPath -xf $ArchivePath -C $DestinationPath $installerEntries[0]
    if ($LASTEXITCODE -ne 0) {
        Fail 'Could not extract local/install_local.ps1 with tar.exe.'
    }

    return $installerEntries[0]
}
function Resolve-GitHubSource([string]$RepositoryUrl, [string]$Ref) {
    $archiveBase = $RepositoryUrl.TrimEnd('/') -replace '\.git$', ''
    if ($archiveBase -notmatch '^https://github\.com/([^/]+/[^/]+)$') {
        Fail 'RepoUrl must point to a public GitHub repository for the Windows installation without Git.'
    }

    $repositoryPath = $Matches[1]
    $encodedRef = [Uri]::EscapeDataString($Ref)
    $commitPatchUrl = "https://github.com/$repositoryPath/commit/$encodedRef.patch"
    $commitResponse = (& curl.exe -fsSL $commitPatchUrl | Out-String)
    if ($LASTEXITCODE -ne 0) {
        Fail "Could not resolve ShipGlows ref: $Ref"
    }

    $commitMatch = [regex]::Match($commitResponse, '(?m)^From ([0-9a-f]{40}) ')
    if (-not $commitMatch.Success) {
        Fail "GitHub did not return a valid commit for ref: $Ref"
    }
    $commitSha = $commitMatch.Groups[1].Value

    [PSCustomObject]@{
        Commit = $commitSha
        ArchiveUrl = "https://github.com/$repositoryPath/archive/$commitSha.zip"
    }
}
function Assert-PowerShellSyntax([string]$Path) {
    $parseTokens = $null
    $parseErrors = $null
    [void][System.Management.Automation.Language.Parser]::ParseFile(
        $Path,
        [ref]$parseTokens,
        [ref]$parseErrors
    )

    if ($parseErrors -and $parseErrors.Count -gt 0) {
        foreach ($parseError in $parseErrors) {
            Write-Host ("[ShipGlows] PowerShell syntax error at line {0}: {1}" -f $parseError.Extent.StartLineNumber, $parseError.Message) -ForegroundColor Red
        }
        Fail "PowerShell syntax validation failed for $Path"
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

$source = Resolve-GitHubSource -RepositoryUrl $RepoUrl -Ref $Branch
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ("shipglows-local-" + [guid]::NewGuid().ToString('N'))
$archivePath = Join-Path $tempRoot 'shipglows.zip'
$extractRoot = Join-Path $tempRoot 'extract'
$localDirectory = Join-Path $ShipGlowsDir 'local'
$localInstaller = Join-Path $localDirectory 'install_local.ps1'
New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
New-Item -ItemType Directory -Path $extractRoot -Force | Out-Null

try {
    Write-Info "Downloading ShipGlows local installer from commit $($source.Commit)..."
    & curl.exe -fsSL $source.ArchiveUrl -o $archivePath
    if ($LASTEXITCODE -ne 0) { Fail 'ShipGlows download failed.' }

    $installerEntry = Extract-ShipGlowsLocalInstaller -ArchivePath $archivePath -DestinationPath $extractRoot
    $installerCandidates = @(
        Get-ChildItem -LiteralPath $extractRoot -Recurse -Force -File -Filter 'install_local.ps1' |
            Where-Object { $_.Directory.Name -eq 'local' }
    )
    if ($installerCandidates.Count -ne 1) {
        Fail 'The ShipGlows archive must contain exactly one local/install_local.ps1.'
    }

    New-Item -ItemType Directory -Path $localDirectory -Force | Out-Null
    Copy-Item -LiteralPath $installerCandidates[0].FullName -Destination $localInstaller -Force
} finally {
    Remove-PathIfPresent $tempRoot
}

if (-not (Test-Path -LiteralPath $localInstaller)) {
    Fail "Installed Windows local installer not found: $localInstaller"
}

$localInstallerHash = (Get-FileHash -LiteralPath $localInstaller -Algorithm SHA256).Hash
Write-Info "Installed local installer: $localInstaller"
Write-Info "Source commit: $($source.Commit)"
Write-Info "SHA256: $localInstallerHash"
Assert-PowerShellSyntax -Path $localInstaller
Write-Info 'PowerShell syntax validation passed.'

if ($DownloadOnly) {
    Write-Info 'Download-only validation completed.'
    exit 0
}

Write-Info 'Lancement de la configuration locale Windows.'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $localInstaller
if ($LASTEXITCODE -ne 0) { Fail 'Native Windows configuration failed.' }

Write-Host ''
Write-Host 'ShipGlows native Windows installation completed.' -ForegroundColor Green
Write-Host 'Utilise ensuite: tunnel -Port 3001' -ForegroundColor Green
