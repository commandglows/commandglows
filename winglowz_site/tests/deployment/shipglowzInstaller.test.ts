import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function readProjectFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('ShipGlowz public installer', () => {
  test('serves the generated shell artifact instead of a duplicated template', () => {
    const route = readProjectFile('src/pages/shipglowz-script.ts')
    const installer = readProjectFile('src/generated/shipglowz-installer.sh')
    const windowsInstaller = readProjectFile('src/generated/shipglowz-installer.ps1')

    expect(route).toContain("import installer from '../generated/shipglowz-installer.sh?raw'")
    expect(route).toContain('export const prerender = false')
    expect(route).not.toContain('const installer = `')
    expect(installer).toMatch(/^#!\/usr\/bin\/env sh/)
    expect(installer).toContain('SHIPGLOWZ_INSTALL_MODE')
    expect(installer).toContain('Mode d\'installation: $INSTALL_MODE')
    expect(installer).toContain('$SHIPGLOWZ_DIR/local/install.sh')
    expect(installer).toContain('$SHIPGLOWZ_DIR/cli/install.sh')
    expect(route).toContain("format === 'powershell'")
    expect(route).toContain("import windowsInstaller from '../generated/shipglowz-installer.ps1?raw'")
    expect(windowsInstaller).toContain('local/install_local.ps1')
    expect(windowsInstaller).toContain('ShipglowzDir')
    expect(windowsInstaller).toContain("Alias('Version', 'Tag', 'Ref')")
    expect(windowsInstaller).not.toContain('Expand-Archive')
    expect(windowsInstaller).toContain('Get-Command tar.exe')
    expect(windowsInstaller).toContain('Parser]::ParseFile')
    expect(windowsInstaller).toContain('Get-FileHash')
    expect(windowsInstaller).toContain('Source commit: $($source.Commit)')
    expect(windowsInstaller).toContain('must contain exactly one local/install_local.ps1')
    expect(windowsInstaller).not.toContain('5.75.134.202')
  })

  test('publishes one sudo-free interactive command in English and French', () => {
    const content = readProjectFile('src/data/scriptInstallPages.ts')
    const shipglowzSection = content.slice(content.indexOf('\tshipglowz: {'))
    const command = 'curl -fsSL https://www.winflowz.com/shipglowz-script | sh'

    expect(shipglowzSection.match(new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))).toHaveLength(2)
    expect(shipglowzSection).not.toContain('shipglowz-script | sudo sh')
    expect(shipglowzSection).toContain('SHIPGLOWZ_INSTALL_MODE=local sh')
    expect(shipglowzSection).toContain('SHIPGLOWZ_INSTALL_MODE=full sh')
    expect(shipglowzSection).toContain('public repository')
    expect(shipglowzSection).toContain('dépôt public')
  })

  test('publishes the native PowerShell command for Windows without WSL', () => {
    const content = readProjectFile('src/data/scriptInstallPages.ts')
    const shipglowzSection = content.slice(content.indexOf('\tshipglowz: {'))
    expect(shipglowzSection).toContain('shipglowz-script?format=powershell')
    expect(shipglowzSection).toContain('powershell.exe -NoProfile -ExecutionPolicy Bypass')
    expect(shipglowzSection).toContain('UAC')
    expect(shipglowzSection).toContain("platform: 'windows'")
    expect(shipglowzSection).toContain("mode: 'full'")
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
