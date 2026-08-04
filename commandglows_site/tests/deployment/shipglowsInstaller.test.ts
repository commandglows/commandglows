import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

function readProjectFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

function writeExecutable(path: string, source: string) {
  writeFileSync(path, source)
  chmodSync(path, 0o755)
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

  test('preflights every local dependency before touching the repository', () => {
    const installer = readProjectFile('src/generated/shipglows-installer.sh')
    const dependencyCall = installer.indexOf('\ninstall_bootstrap_deps\n')
    const repositoryBranch = installer.indexOf('\nif [ -d "$SHIPGLOWS_DIR/.git" ]; then')

    expect(installer).toContain('for dependency in git curl bash ssh autossh; do')
    expect(dependencyCall).toBeGreaterThan(-1)
    expect(repositoryBranch).toBeGreaterThan(dependencyCall)
    expect(installer).toContain('pkg install -y git curl bash ca-certificates openssh autossh')
    expect(installer).toContain('apt-get install -y -qq git curl bash ca-certificates openssh-client autossh')
  })

  test('guards the local sudo package path behind explicit terminal consent', () => {
    const installer = readProjectFile('src/generated/shipglows-installer.sh')
    const consentGuard = installer.indexOf('if ! confirm_local_dependency_install; then')
    const sudoUpdate = installer.indexOf('sudo apt-get update -qq')
    const sudoInstall = installer.indexOf('sudo apt-get install -y -qq git curl bash ca-certificates openssh-client autossh')

    expect(installer).toContain('if ! tty_available; then')
    expect(consentGuard).toBeGreaterThan(-1)
    expect(sudoUpdate).toBeGreaterThan(consentGuard)
    expect(sudoInstall).toBeGreaterThan(sudoUpdate)
    expect(installer).toContain('apt-get install -y -qq git curl bash ca-certificates openssh-client autossh')
    expect(installer).not.toContain('sudo pkg install')
  })

  test('fails without sudo or clone when missing local dependencies cannot be confirmed interactively', () => {
    const root = mkdtempSync(join(tmpdir(), 'shipglows-installer-'))
    const bin = join(root, 'bin')
    const home = join(root, 'home')
    const marker = join(root, 'unexpected-command.log')
    mkdirSync(bin)
    mkdirSync(home)

    try {
      writeExecutable(join(bin, 'id'), `#!/bin/sh\ncase "$1" in\n  -u) printf '1000\\n' ;;\n  -un) printf 'tester\\n' ;;\nesac\n`)
      writeExecutable(join(bin, 'git'), `#!/bin/sh\nprintf 'git %s\\n' "$*" >>"$SHIPGLOWS_TEST_MARKER"\nexit 97\n`)
      writeExecutable(join(bin, 'sudo'), `#!/bin/sh\nprintf 'sudo %s\\n' "$*" >>"$SHIPGLOWS_TEST_MARKER"\nexit 98\n`)
      for (const command of ['curl', 'bash', 'ssh', 'apt-get']) {
        writeExecutable(join(bin, command), '#!/bin/sh\nexit 0\n')
      }
      for (const command of ['dirname', 'mkdir', 'tr']) {
        symlinkSync(`/usr/bin/${command}`, join(bin, command))
      }

      const result = spawnSync('/bin/sh', [resolve(process.cwd(), 'src/generated/shipglows-installer.sh')], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          HOME: home,
          LC_ALL: 'C.UTF-8',
          PATH: bin,
          PREFIX: '',
          SHIPGLOWS_BOOTSTRAP_LOG: join(home, 'bootstrap.log'),
          SHIPGLOWS_DISABLE_TTY: '1',
          SHIPGLOWS_INSTALL_MODE: 'local',
          SHIPGLOWS_TEST_MARKER: marker,
          TERMUX_VERSION: '',
          USER: 'tester',
        },
      })

      expect(result.status).toBe(1)
      expect(result.stdout).toContain('Dépendances locales manquantes: autossh')
      expect(result.stdout).toContain('sudo apt-get update -qq')
      expect(result.stdout).toContain('sudo apt-get install -y -qq git curl bash ca-certificates openssh-client autossh')
      expect(result.stdout).toContain('puis relancez exactement la commande ShipGlows copiée')
      expect(existsSync(marker)).toBe(false)
      expect(existsSync(join(home, 'shipglows'))).toBe(false)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('publishes one sudo-free interactive command in English and French', () => {
    const content = readProjectFile('src/data/scriptInstallPages.ts')
    const shipglowsSection = content.slice(content.indexOf('\tshipglows: {'))
    const command = 'curl -fsSL https://www.commandglows.com/shipglows-script | sh'

    expect(shipglowsSection.match(new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))).toHaveLength(2)
    expect(shipglowsSection).not.toContain('shipglows-script | sudo sh')
    expect(shipglowsSection).toContain('SHIPGLOWS_INSTALL_MODE=local sh')
    expect(shipglowsSection).toContain('SHIPGLOWS_INSTALL_MODE=full sh')
    expect(shipglowsSection).toContain('public repository')
    expect(shipglowsSection).toContain('dépôt public')
    expect(shipglowsSection).toContain('one-time sudo confirmation may be requested only when Linux system prerequisites are missing')
    expect(shipglowsSection).toContain('une confirmation sudo unique peut être demandée uniquement si des prérequis système Linux manquent')
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
