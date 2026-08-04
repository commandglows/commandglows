import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('ShipGlows canonical and legacy routes', () => {
  test.each([
    ['src/pages/shipglowz.astro', '/shipglows'],
    ['src/pages/fr/shipglowz.astro', '/fr/shipglows'],
    ['src/pages/shipglowz-script.ts', '/shipglows-script'],
  ])('%s permanently redirects and preserves the query string', (path, target) => {
    const source = read(path)
    expect(source).toContain(`new URL('${target}'`)
    expect(source).toContain('target.search =')
    expect(source).toContain(', 301)')
  })

  test('canonical route source files exist under ShipGlows names', () => {
    expect(read('src/pages/[...lang]/shipglows.astro')).toContain("getScriptInstallPage('shipglows'")
    expect(read('src/pages/shipglows-script.ts')).toContain("../generated/shipglows-installer.sh?raw")
  })
})
