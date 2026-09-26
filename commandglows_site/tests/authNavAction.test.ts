import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

test('Astro auth navigation action renders a static account entry', () => {
  const component = source('src/components/shared/site/AuthNavAction.astro')
  const navbar = source('src/components/shared/site/Navbar.astro')

  expect(component).toContain('<a href={accountUrl} class={className} data-astro-reload>')
  expect(component).toContain('{accountLabel}')
  expect(navbar).toContain("import AuthNavAction from './AuthNavAction.astro'")
  expect(navbar).toContain('<AuthNavAction')
  expect(navbar).toContain('accountLabel={accountLabel}')
  expect(navbar).toContain('accountUrl={accountUrl}')
  expect(navbar).toContain("const accountUrl = lang === 'fr' ? '/fr/dashboard/' : '/dashboard'")
})
