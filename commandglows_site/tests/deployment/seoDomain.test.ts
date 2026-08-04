import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const canonicalOrigin = 'https://www.commandglows.com'
const publicTextExtensions = new Set([
  'astro',
  'html',
  'json',
  'md',
  'mdx',
  'mjs',
  'ts',
  'txt',
  'xml',
  'yaml',
  'yml',
])

function readProjectFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

function listFilesRecursively(path: string): string[] {
  return readdirSync(resolve(process.cwd(), path), { withFileTypes: true }).flatMap(
    (entry) => {
      const childPath = `${path}/${entry.name}`
      return entry.isDirectory() ? listFilesRecursively(childPath) : [childPath]
    },
  )
}

describe('SEO canonical domain', () => {
  test('keeps the Astro site, shared metadata, environment example, and AI summary aligned', () => {
    expect(readProjectFile('astro.config.mjs')).toContain(`site: "${canonicalOrigin}"`)
    expect(readProjectFile('src/constants.ts')).toContain(`url: '${canonicalOrigin}'`)
    expect(readProjectFile('src/constants.ts')).toContain("domain: 'www.commandglows.com'")
    expect(readProjectFile('.env.example')).toContain(`SITE=${canonicalOrigin}`)
    expect(readProjectFile('.env.example')).toContain(`PUBLIC_SITE_URL=${canonicalOrigin}`)
    expect(readProjectFile('.env.example')).toContain(
      `SUITE_BRIDGE_SYNC_URL=${canonicalOrigin}/api/bridge/sync`,
    )

    const llms = readProjectFile('public/llms.txt')
    expect(llms).toContain(`${canonicalOrigin}/windows-mastery`)
    expect(llms).not.toContain('https://commandglows.com/')

    const legacyTestimonialsRoute = readProjectFile(
      'src/pages/[...lang]/[testimonials].astro',
    )
    expect(legacyTestimonialsRoute).toContain(
      'const canonical = new URL(target, Astro.site).toString()',
    )
    expect(legacyTestimonialsRoute).toContain(
      '<link rel="canonical" href={canonical} />',
    )
  })

  test('does not retain former public domains in public or campaign surfaces', () => {
    const publicUrlFiles = [
      'README.md',
      'astro.config.mjs',
      ...listFilesRecursively('public'),
      ...listFilesRecursively('src/data'),
      ...listFilesRecursively('src/pages'),
      ...listFilesRecursively('idees/emails'),
      ...listFilesRecursively('CONTENU'),
    ].filter((path) => publicTextExtensions.has(path.split('.').at(-1) ?? ''))

    for (const path of publicUrlFiles) {
      expect(readProjectFile(path), path).not.toMatch(
        /https:\/\/(?:www\.)?(?:winglowz|winflowz)\.com(?:\/|\b)/,
      )
    }
  })

  test('keeps both localized 404 pages non-indexable and rendered', () => {
    const notFoundComponent = readProjectFile(
      'src/components/errors/NotFoundPage.astro',
    )

    expect(notFoundComponent).toContain('noindex={true}')
    expect(notFoundComponent).toContain('structuredData={null}')
    expect(readProjectFile('src/pages/404.astro')).toContain(
      '<NotFoundPage lang="en" />',
    )
    expect(readProjectFile('src/pages/fr/404.astro')).toContain(
      '<NotFoundPage lang="fr" />',
    )
  })
})
