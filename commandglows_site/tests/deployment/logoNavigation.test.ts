import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function readProjectFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('Layered logo navigation', () => {
  test('uses full-page navigation when returning to the landing layout', () => {
    for (const path of [
      'src/components/shared/site/Navbar.astro',
      'src/components/shared/site/Footer.astro',
    ]) {
      const source = readProjectFile(path)
      const homeLink = source.match(/<a[\s\S]*?href=\{homeUrl\}[\s\S]*?<TextLogo\b/)

      expect(homeLink, path).not.toBeNull()
      expect(homeLink?.[0], path).toContain('data-astro-reload')
    }
  })
})
