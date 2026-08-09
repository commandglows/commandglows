# ShipGlows native Windows bootstrap. Local installs the SSH tunnel; full
# installs the native Windows DevServer without WSL or an automatic tunnel.

[CmdletBinding()]
param(
    [string]$RepoUrl = $(if ($env:SHIPGLOWS_REPO_URL) { $env:SHIPGLOWS_REPO_URL } else { '' }),
    [Alias('Version', 'Tag', 'Ref')]
    [string]$Branch = $(if ($env:SHIPGLOWS_BRANCH) { $env:SHIPGLOWS_BRANCH } else { '' }),
    [string]$ShipglowsDir = $(if ($env:SHIPGLOWS_DIR) { $env:SHIPGLOWS_DIR } else { Join-Path $env:USERPROFILE 'shipglows' }),
    [string]$InstallMode,
    [switch]$DownloadOnly
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Resolve-CompatibleValue([string]$Canonical, [string]$LegacyShipglowz, [string]$LegacyShipflow, [string]$Name) {
    if ($Canonical) { return $Canonical }
    if ($LegacyShipglowz) { Write-Warn "Deprecated SHIPGLOWZ_$Name detected; migrate to SHIPGLOWS_*."; return $LegacyShipglowz }
    if ($LegacyShipflow) { Write-Warn "Deprecated SHIPFLOW_$Name detected; migrate to SHIPGLOWS_*."; return $LegacyShipflow }
    return ''
}

function Write-Info([string]$Message) { Write-Host "[ShipGlows] $Message" -ForegroundColor Cyan }
function Write-Warn([string]$Message) { Write-Host "[ShipGlows] $Message" -ForegroundColor Yellow }
function Fail([string]$Message) { Write-Error "[ShipGlows] $Message"; exit 1 }
function Select-WindowsInstallMode {
    Write-Host ''
    Write-Host 'What would you like to install?' -ForegroundColor Cyan
    Write-Host '  1) SSH tunnel only (local)'
    Write-Host '     Connect this Windows PC to projects already running on another server.'
    Write-Host '  2) Local DevServer (full, recommended)'
    Write-Host '     Clone and run Astro, Python/FastAPI, and Flutter Web projects on this PC.'
    Write-Host '  0) Cancel'
    while ($true) {
        $choice = Read-Host 'Choose 1 or 2'
        switch ($choice.Trim()) {
            '' { Write-Warn 'A choice is required. Enter 1, 2, or 0.' }
            '1' { return 'local' }
            '2' { return 'full' }
            '0' { Fail 'Installation cancelled.' }
            default { Write-Warn 'Enter 1 for SSH tunnel, 2 for Local DevServer, or 0 to cancel.' }
        }
    }
}

$RepoUrl = Resolve-CompatibleValue $RepoUrl $env:SHIPGLOWZ_REPO_URL $env:SHIPFLOW_REPO_URL 'REPO_URL'
if (-not $RepoUrl) { $RepoUrl = 'https://github.com/commandglows/shipglows.git' }
$Branch = Resolve-CompatibleValue $Branch $env:SHIPGLOWZ_BRANCH $env:SHIPFLOW_BRANCH 'BRANCH'
if (-not $Branch) { $Branch = 'main' }
$InstallMode = Resolve-CompatibleValue $InstallMode $env:SHIPGLOWZ_INSTALL_MODE $env:SHIPFLOW_INSTALL_MODE 'INSTALL_MODE'
if ($InstallMode -and $InstallMode -notin @('local', 'full')) {
    Fail 'InstallMode must be local or full.'
}
if (-not $InstallMode) {
    if ($DownloadOnly -or [Console]::IsInputRedirected) {
        $InstallMode = 'local'
        Write-Info 'No interactive Windows console was detected; using local mode. Pass -InstallMode full to automate the DevServer installation.'
    } else {
        $InstallMode = Select-WindowsInstallMode
    }
}
function Remove-PathIfPresent([string]$Path) {
    if (Test-Path -LiteralPath $Path) {
        Remove-Item -LiteralPath $Path -Force -Recurse -ErrorAction SilentlyContinue
    }
}
function Extract-ShipglowsWindowsFiles([string]$ArchivePath, [string]$DestinationPath, [bool]$FullMode) {
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
    $entries = @()
    if (-not $FullMode) {
        $installerEntries = @(
            $archiveEntries | Where-Object { $_ -match '^[^/]+/local/install_local\.ps1$' }
        )
        if ($installerEntries.Count -ne 1) {
            Fail 'The ShipGlows archive must contain exactly one local/install_local.ps1.'
        }
        $entries += $installerEntries[0]
    }
    if ($FullMode) {
        $entries += @($archiveEntries | Where-Object { $_ -match '^[^/]+/cli/windows/(ShipGlows\.DevServer\.psm1|shipglows-devserver\.ps1|install-devserver\.ps1)$' })
        if ($entries.Count -ne 3) { Fail 'The ShipGlows archive is missing native Windows DevServer files.' }
    }

    & $tarPath -xf $ArchivePath -C $DestinationPath $entries
    if ($LASTEXITCODE -ne 0) {
        Fail 'Could not extract the Windows installation files with tar.exe.'
    }

    return $entries
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
        Write-Warn 'WSL is available. Use the WSL installation path for the complete Linux CLI.'
    } else {
        Write-Warn "WSL is detected but unusable on this machine; using native Windows $InstallMode mode."
    }
}

$source = Resolve-GitHubSource -RepositoryUrl $RepoUrl -Ref $Branch
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ("shipglows-windows-" + [guid]::NewGuid().ToString('N'))
$archivePath = Join-Path $tempRoot 'shipglows.zip'
$extractRoot = Join-Path $tempRoot 'extract'
$localDirectory = Join-Path $ShipglowsDir 'local'
$localInstaller = Join-Path $localDirectory 'install_local.ps1'
$windowsDirectory = Join-Path $ShipglowsDir 'cli\windows'
New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
New-Item -ItemType Directory -Path $extractRoot -Force | Out-Null

try {
    Write-Info "Downloading ShipGlows Windows files from commit $($source.Commit)..."
    & curl.exe -fsSL $source.ArchiveUrl -o $archivePath
    if ($LASTEXITCODE -ne 0) { Fail 'ShipGlows download failed.' }

    [void](Extract-ShipglowsWindowsFiles -ArchivePath $archivePath -DestinationPath $extractRoot -FullMode ($InstallMode -eq 'full'))
    if ($InstallMode -eq 'local') {
        $installerCandidates = @(
            Get-ChildItem -LiteralPath $extractRoot -Recurse -Force -File -Filter 'install_local.ps1' |
                Where-Object { $_.Directory.Name -eq 'local' }
        )
        if ($installerCandidates.Count -ne 1) {
            Fail 'The ShipGlows archive must contain exactly one local/install_local.ps1.'
        }
        New-Item -ItemType Directory -Path $localDirectory -Force | Out-Null
        Copy-Item -LiteralPath $installerCandidates[0].FullName -Destination $localInstaller -Force
    } else {
        $windowsCandidates = @(
            Get-ChildItem -LiteralPath $extractRoot -Recurse -Force -Directory -Filter 'windows' |
                Where-Object { Test-Path (Join-Path $_.FullName 'install-devserver.ps1') }
        )
        if ($windowsCandidates.Count -ne 1) { Fail 'Native Windows DevServer directory was not found in the archive.' }
        New-Item -ItemType Directory -Path $windowsDirectory -Force | Out-Null
        Get-ChildItem -LiteralPath $windowsCandidates[0].FullName -Force -File | Copy-Item -Destination $windowsDirectory -Force
    }
} finally {
    Remove-PathIfPresent $tempRoot
}

Write-Info "Source commit: $($source.Commit)"

if ($InstallMode -eq 'local') {
    if (-not (Test-Path -LiteralPath $localInstaller)) {
        Fail "Installed Windows local installer not found: $localInstaller"
    }
    $localInstallerHash = (Get-FileHash -LiteralPath $localInstaller -Algorithm SHA256).Hash
    Write-Info "Installed local installer: $localInstaller"
    Write-Info "SHA256: $localInstallerHash"
    Assert-PowerShellSyntax -Path $localInstaller
    Write-Info 'PowerShell syntax validation passed.'
}

if ($InstallMode -eq 'full') {
    foreach ($required in @('ShipGlows.DevServer.psm1','shipglows-devserver.ps1','install-devserver.ps1')) {
        Assert-PowerShellSyntax -Path (Join-Path $windowsDirectory $required)
    }
    Write-Info 'Native Windows DevServer files installed.'
}

if ($DownloadOnly) {
    Write-Info 'Download-only validation completed.'
    exit 0
}

if ($InstallMode -eq 'local') {
    Write-Info 'Starting native Windows local setup.'
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $localInstaller
    if ($LASTEXITCODE -ne 0) { Fail 'Native Windows configuration failed.' }
} else {
    Write-Info 'Installing the native Windows DevServer launcher.'
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $windowsDirectory 'install-devserver.ps1') -ShipglowsDir $ShipglowsDir
    if ($LASTEXITCODE -ne 0) { Fail 'Native Windows DevServer installation failed.' }
}

Write-Host ''
Write-Host 'ShipGlows native Windows installation completed.' -ForegroundColor Green
if ($InstallMode -eq 'local') {
    Write-Host 'Next: tunnel -Port 3001' -ForegroundColor Green
} else {
    Write-Host 'For local projects: s (or shipglows-dev)' -ForegroundColor Green
}
