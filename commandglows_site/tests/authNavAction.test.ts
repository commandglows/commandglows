import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

test('Astro auth navigation action renders a localized sign-in link', () => {
  const component = source('src/components/shared/site/AuthNavAction.astro')
  const navbar = source('src/components/shared/site/Navbar.astro')

  expect(component).toContain('<a href={signInUrl} class={className}>')
  expect(component).toContain('{signInLabel}')
  expect(navbar).toContain("import AuthNavAction from './AuthNavAction.astro'")
  expect(navbar).toContain('<AuthNavAction')
  expect(navbar).toContain('signInLabel={signInLabel}')
  expect(navbar).toContain('signInUrl={signInUrl}')
})
