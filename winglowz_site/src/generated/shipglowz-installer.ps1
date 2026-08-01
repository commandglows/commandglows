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
function Expand-ShipglowzArchive([string]$ArchivePath, [string]$DestinationPath) {
    $tarCommand = Get-Command tar.exe -CommandType Application -ErrorAction SilentlyContinue
    if (-not $tarCommand) {
        Fail 'Windows tar.exe is required to extract ShipGlowz without Microsoft.PowerShell.Archive.'
    }

    & $tarCommand.Source -xf $ArchivePath -C $DestinationPath
    if ($LASTEXITCODE -ne 0) {
        Fail 'ShipGlowz archive extraction with tar.exe failed.'
    }
}
function Resolve-GitHubSource([string]$RepositoryUrl, [string]$Ref) {
    $archiveBase = $RepositoryUrl.TrimEnd('/') -replace '\.git$', ''
    if ($archiveBase -notmatch '^https://github\.com/([^/]+/[^/]+)$') {
        Fail 'RepoUrl must point to a public GitHub repository for the Windows installation without Git.'
    }

    $repositoryPath = $Matches[1]
    $encodedRef = [Uri]::EscapeDataString($Ref)
    $commitApiUrl = "https://api.github.com/repos/$repositoryPath/commits/$encodedRef"
    $commitResponse = (& curl.exe -fsSL -H 'Accept: application/vnd.github+json' $commitApiUrl | Out-String)
    if ($LASTEXITCODE -ne 0) {
        Fail "Could not resolve ShipGlowz ref: $Ref"
    }

    try {
        $commitSha = ($commitResponse | ConvertFrom-Json).sha
    } catch {
        Fail "GitHub returned an invalid commit response for ref: $Ref"
    }
    if (-not $commitSha -or $commitSha -notmatch '^[0-9a-f]{40}$') {
        Fail "GitHub did not return a valid commit for ref: $Ref"
    }

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
            Write-Host ("[ShipGlowz] PowerShell syntax error at line {0}: {1}" -f $parseError.Extent.StartLineNumber, $parseError.Message) -ForegroundColor Red
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
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ("shipglowz-local-" + [guid]::NewGuid().ToString('N'))
$archivePath = Join-Path $tempRoot 'shipglowz.zip'
$extractRoot = Join-Path $tempRoot 'extract'
$localDirectory = Join-Path $ShipglowzDir 'local'
$localInstaller = Join-Path $localDirectory 'install_local.ps1'
New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
New-Item -ItemType Directory -Path $extractRoot -Force | Out-Null

try {
    Write-Info "Downloading ShipGlowz local installer from commit $($source.Commit)..."
    & curl.exe -fsSL $source.ArchiveUrl -o $archivePath
    if ($LASTEXITCODE -ne 0) { Fail 'ShipGlowz download failed.' }

    Expand-ShipglowzArchive -ArchivePath $archivePath -DestinationPath $extractRoot
    $installerCandidates = @(
        Get-ChildItem -LiteralPath $extractRoot -Recurse -Force -File -Filter 'install_local.ps1' |
            Where-Object { $_.Directory.Name -eq 'local' }
    )
    if ($installerCandidates.Count -ne 1) {
        Fail 'The ShipGlowz archive must contain exactly one local/install_local.ps1.'
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

Write-Info 'Lancement de la configuration locale Windows.'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $localInstaller
if ($LASTEXITCODE -ne 0) { Fail 'Native Windows configuration failed.' }

Write-Host ''
Write-Host 'ShipGlowz native Windows installation completed.' -ForegroundColor Green
Write-Host 'Utilise ensuite: tunnel -Port 3001' -ForegroundColor Green
