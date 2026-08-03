import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function readProjectFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('ShipGlows public installer', () => {
  test('serves the generated shell artifact instead of a duplicated template', () => {
    const route = readProjectFile('src/pages/shipglows-script.ts')
    const installer = readProjectFile('src/generated/shipglows-installer.sh')
    const windowsInstaller = readProjectFile('src/generated/shipglows-installer.ps1')

    expect(route).toContain("import installer from '../generated/shipglows-installer.sh?raw'")
    expect(route).toContain('export const prerender = false')
    expect(route).not.toContain('const installer = `')
    expect(installer).toMatch(/^#!\/usr\/bin\/env sh/)
    expect(installer).toContain('SHIPGLOWS_INSTALL_MODE')
    expect(installer).toContain('Mode d\'installation: $INSTALL_MODE')
    expect(installer).toContain('$SHIPGLOWS_DIR/local/install.sh')
    expect(installer).toContain('$SHIPGLOWS_DIR/cli/install.sh')
    expect(route).toContain("format === 'powershell'")
    expect(route).toContain("import windowsInstaller from '../generated/shipglows-installer.ps1?raw'")
    expect(windowsInstaller).toContain('local/install_local.ps1')
    expect(windowsInstaller).toContain('ShipGlowsDir')
    expect(installer).toContain('https://github.com/dianedef/ShipGlows.git')
    expect(windowsInstaller).toContain('https://github.com/dianedef/ShipGlows.git')
    expect(windowsInstaller).toContain("Alias('Version', 'Tag', 'Ref')")
    expect(windowsInstaller).not.toContain('Expand-Archive')
    expect(windowsInstaller).toContain('Get-Command tar.exe')
    expect(windowsInstaller).toContain('Parser]::ParseFile')
    expect(windowsInstaller).toContain('Get-FileHash')
    expect(windowsInstaller).toContain('Source commit: $($source.Commit)')
    expect(windowsInstaller).toContain('must contain exactly one local/install_local.ps1')
    expect(windowsInstaller).toContain("Join-Path $env:WINDIR 'System32\\tar.exe'")
    expect(windowsInstaller).toContain('$tarPath -tf $ArchivePath')
    expect(windowsInstaller).toContain('$tarPath -xf $ArchivePath -C $DestinationPath $installerEntries[0]')
    expect(windowsInstaller).toContain('[switch]$DownloadOnly')
    expect(windowsInstaller).toContain('commit/$encodedRef.patch')
    expect(windowsInstaller).not.toContain('api.github.com')
    expect(windowsInstaller).not.toContain('5.75.134.202')
  })

  test('keeps legacy environment reads inside a deprecated canonical-first adapter', () => {
    const installer = readProjectFile('src/generated/shipglows-installer.sh')
    const windowsInstaller = readProjectFile('src/generated/shipglows-installer.ps1')

    expect(installer).toContain('legacy_value "${SHIPGLOWS_INSTALL_MODE:-}" "${SHIPGLOWZ_INSTALL_MODE:-}" "${SHIPFLOW_INSTALL_MODE:-}"')
    expect(installer).toContain('Deprecated SHIPGLOWZ_* variable detected')
    expect(installer).toContain('$INSTALL_HOME/shipglowz/.git')
    expect(installer).toContain('reusing it without moving or overwriting it')
    expect(windowsInstaller).toContain('Resolve-CompatibleValue $env:SHIPGLOWS_REPO_URL $env:SHIPGLOWZ_REPO_URL $env:SHIPFLOW_REPO_URL')
    expect(windowsInstaller).toContain('Canonical SHIPGLOWS_* values always win')
  })

  test('publishes one sudo-free interactive command in English and French', () => {
    const content = readProjectFile('src/data/scriptInstallPages.ts')
    const shipglowsSection = content.slice(content.indexOf('\tshipglows: {'))
    const command = 'curl -fsSL https://www.winflowz.com/shipglows-script | sh'

    expect(shipglowsSection.match(new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))).toHaveLength(2)
    expect(shipglowsSection).not.toContain('shipglows-script | sudo sh')
    expect(shipglowsSection).toContain('SHIPGLOWS_INSTALL_MODE=local sh')
    expect(shipglowsSection).toContain('SHIPGLOWS_INSTALL_MODE=full sh')
    expect(shipglowsSection).toContain('public repository')
    expect(shipglowsSection).toContain('dépôt public')
  })

  test('publishes the native PowerShell command for Windows without WSL', () => {
    const content = readProjectFile('src/data/scriptInstallPages.ts')
    const shipglowsSection = content.slice(content.indexOf('\tshipglows: {'))
    expect(shipglowsSection).toContain('shipglows-script?format=powershell')
    expect(shipglowsSection).toContain('powershell.exe -NoProfile -ExecutionPolicy Bypass')
    expect(shipglowsSection).toContain('UAC')
    expect(shipglowsSection).toContain("platform: 'windows'")
    expect(shipglowsSection).toContain("mode: 'full'")
  })

  test('publishes platform and mode selectors for the installer page', () => {
    const component = readProjectFile('src/components/scripts/ScriptInstallPage.astro')
    expect(component).toContain('data-install-selector')
    expect(component).toContain('data-platform={platform}')
    expect(component).toContain('data-mode={mode}')
    expect(component).toContain('data-install-command')
    expect(component).not.toMatch(/querySelector(?:All)?<[^>]+>/)
  })
})
