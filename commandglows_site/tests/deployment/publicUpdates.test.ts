import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getLatestPublishedUpdate, getUpdateUrl } from '@/lib/publicUpdates'

function readProjectFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('Public updates surface', () => {
  test('exposes a bilingual public updates route linked from the footer status', () => {
    expect(
      existsSync(resolve(process.cwd(), 'src/pages/[...lang]/[updates].astro'))
    ).toBe(true)

    const footer = readProjectFile('src/components/shared/site/Footer.astro')
    const badge = readProjectFile(
      'src/components/shared/site/LatestUpdateBadge.astro'
    )

    expect(footer).toContain('LatestUpdateBadge')
    expect(badge).toContain('getLatestPublishedUpdate')
    expect(getUpdateUrl('en')).toBe('/updates')
    expect(getUpdateUrl('fr')).toBe('/fr/nouveautes')
  })

  test('keeps the latest public update explicit and product-bound', () => {
    const latest = getLatestPublishedUpdate()

    expect(latest).toMatchObject({
      slug: 'roadmap-feedback-changelog',
      productId: 'commandglows',
      status: 'shipped',
    })
    expect(latest?.date).toBe('2026-09-09')
  })

  test('keeps product roadmap links routable', () => {
    expect(
      existsSync(
        resolve(process.cwd(), 'src/pages/[...lang]/roadmap/[project].astro')
      )
    ).toBe(true)

    const projectNav = readProjectFile(
      'src/components/roadmap/ProjectNav.astro'
    )
    const productRoadmap = readProjectFile(
      'src/pages/[...lang]/roadmap/[project].astro'
    )
    const roadmap = readProjectFile('src/pages/[...lang]/roadmap.astro')

    expect(projectNav).toContain('`/roadmap/${project.id}`')
    expect(productRoadmap).toContain('Astro.params.project')
    expect(roadmap).toContain(
      'const queryArgs = projectId ? { projectId } : {}'
    )
  })
})
