import { readFileSync, readdirSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const siteRoot = fileURLToPath(new URL('../../', import.meta.url))
const sourceRoot = join(siteRoot, 'src')
const textExtensions = new Set(['.astro', '.css', '.js', '.jsx', '.ts', '.tsx'])

function readSourceTree(directory: string): string {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) return [readSourceTree(path)]
      if (!textExtensions.has(extname(entry.name))) return []
      return [readFileSync(path, 'utf8')]
    })
    .join('\n')
}

describe('site design-system adapter contract', () => {
  it('keeps the legacy Tailwind config thin and mapped to canonical roles', () => {
    const config = readFileSync(join(siteRoot, 'tailwind.config.mjs'), 'utf8')

    expect(config).not.toContain('tailwindcss/colors')
    expect(config).not.toMatch(/\btest\s*:/)
    expect(config.match(/\bborderRadius\s*:/g)).toHaveLength(1)
    expect(config).toContain('--cg-semantic-color-brand-logo-')
    expect(config).not.toMatch(
      /(?:red|magenta|yellow|green|cyan):\s*["']#[0-9a-f]{6}/i
    )
  })

  it('maps site compatibility aliases directly to generated semantics', () => {
    const css = readFileSync(
      join(sourceRoot, 'assets/styles/global.css'),
      'utf8'
    )

    for (const color of [
      'red',
      'magenta',
      'yellow',
      'violet',
      'green',
      'cyan',
    ]) {
      expect(css).toMatch(
        new RegExp(
          `--brand-${color}:\\s*var\\(--cg-semantic-color-brand-logo-${color}\\);`
        )
      )
      expect(css).not.toMatch(
        new RegExp(
          `--brand-${color}:\\s*var\\(--cg-semantic-color-brand-logo-${color}\\s*,`
        )
      )
    }
    expect(css).toMatch(
      /--font-body:\s*var\(--cg-semantic-typography-site-body-family\);/
    )
  })

  it('rejects the production visual literals migrated in Batch B', () => {
    const source = readSourceTree(sourceRoot)

    expect(source).not.toMatch(
      /tracking-\[(?:0\.14|0\.16|0\.18|0\.24|0\.28)em\]/
    )
    expect(source).not.toContain('leading-[0.98]')
    expect(source).not.toMatch(/duration-\[(?:0\.1|150|600)m?s\]/)
    expect(source).not.toContain('ease-[cubic-bezier(0.45,0,0.55,1)]')
    expect(source).not.toContain('font-[var(--font-display)]')
    expect(source).not.toContain('outline-[var(--navbar-ring)]')
    expect(source).not.toContain('rounded-tr-[10px]')
  })

  it('preserves the rendered accessibility invariants proven in browser', () => {
    const globalCss = readFileSync(
      join(sourceRoot, 'assets/styles/global.css'),
      'utf8'
    )
    const landingCss = readFileSync(
      join(sourceRoot, 'assets/styles/landing.css'),
      'utf8'
    )
    const button = readFileSync(
      join(sourceRoot, 'components/Button.astro'),
      'utf8'
    )
    const leadMagnet = readFileSync(
      join(sourceRoot, 'components/astro/landing/LeadMagnet.astro'),
      'utf8'
    )
    const navLink = readFileSync(
      join(sourceRoot, 'components/ui/links/NavLink.astro'),
      'utf8'
    )
    const navbar = readFileSync(
      join(sourceRoot, 'components/shared/site/Navbar.astro'),
      'utf8'
    )
    const authNavAction = readFileSync(
      join(sourceRoot, 'components/shared/site/AuthNavAction.tsx'),
      'utf8'
    )
    const dashboard = readFileSync(
      join(sourceRoot, 'pages/dashboard/index.astro'),
      'utf8'
    )
    const dashboardDocs = readFileSync(
      join(sourceRoot, 'pages/dashboard/docs/[...slug].astro'),
      'utf8'
    )
    const dashboardLayout = readFileSync(
      join(sourceRoot, 'layouts/DashboardLayout.astro'),
      'utf8'
    )
    const pricing = readFileSync(
      join(sourceRoot, 'components/astro/landing/Pricing.astro'),
      'utf8'
    )
    const finalCta = readFileSync(
      join(sourceRoot, 'components/astro/landing/FinalCTA.astro'),
      'utf8'
    )

    expect(button).toContain(
      'min-height: calc(var(--cg-semantic-space-unit) * 11)'
    )
    expect(globalCss).toContain('.landing-carousel-dots__button::before')
    expect(globalCss).toContain('.brand-text-green')
    expect(globalCss).toContain('.brand-text-red')
    expect(globalCss).toContain('.brand-text-magenta')
    expect(globalCss).toMatch(
      /\.dashboard-action-link\s*\{[\s\S]*min-height:\s*calc\(var\(--cg-semantic-space-unit\) \* 11\)/
    )
    expect(globalCss).toMatch(
      /\.dashboard-action-link\s*\{[\s\S]*min-width:\s*calc\(var\(--cg-semantic-space-unit\) \* 11\)/
    )
    expect(globalCss).not.toContain(
      '--brand-magenta-text: var(--brand-magenta);'
    )
    expect(globalCss).toMatch(
      /\.dark,[\s\S]*--brand-magenta-text:\s*color-mix\([\s\S]*var\(--brand-magenta\) 62%,[\s\S]*var\(--cg-primitive-color-neutral-white\)/
    )
    expect(landingCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.animate-marquee[\s\S]*\.reveal/
    )
    expect(leadMagnet).toContain('for="lead-magnet-email"')
    expect(leadMagnet).toContain('autocomplete="email"')
    expect(navLink).not.toMatch(/\sid=/)
    expect(navbar).toContain("import AuthNavAction from './AuthNavAction'")
    expect(
      navbar.match(/<AuthNavAction[\s\S]*?client:only="react"/g)
    ).toHaveLength(1)
    expect(authNavAction).toContain("from '@clerk/astro/react'")
    expect(authNavAction).toContain('when="signed-in"')
    expect(authNavAction).toContain('<UserButton')
    expect(authNavAction).toContain("href: '/dashboard'")
    expect(authNavAction).toContain("href: '/dashboard/taches'")
    expect(authNavAction).toContain("href: '/dashboard/parametres'")
    expect(authNavAction).not.toContain('/api/auth/signout')
    expect(dashboardLayout).toContain('aria-label={navigationLabel}')
    expect(dashboardLayout).toContain("aria-current={isActive ? 'page'")
    expect(dashboard).not.toMatch(/class="[^"]*(?<![\w-])text-magenta(?![\w-])/)
    expect(dashboardDocs).not.toMatch(
      /class="[^"]*(?<![\w-])text-magenta(?![\w-])/
    )
    expect(dashboard).toContain('brand-text-magenta')
    expect(dashboardDocs).toContain('brand-text-magenta')
    expect(dashboard.match(/dashboard-action-link/g)).toHaveLength(7)
    expect(
      dashboardDocs.match(/dashboard-action-link/g)?.length
    ).toBeGreaterThan(1)
    expect(pricing).not.toMatch(/<a[^>]*>[\s\S]*?<button/)
    expect(finalCta).not.toMatch(/<a[^>]*>[\s\S]*?<button/)
  })
})
