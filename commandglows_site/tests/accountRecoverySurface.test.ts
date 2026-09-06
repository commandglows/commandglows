import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
test('recovery uses verified legacy authentication then an explicit POST account link', () => {
  const page = source('src/pages/account/link-existing.astro')
  expect(page).toContain('Astro.locals.auth?.().userId')
  expect(page).toContain('legacyAccount ?')
  expect(page).toContain('method="post" action="/api/auth/link"')
  expect(page).toContain('<LegacySignIn routing="hash" fallbackRedirectUrl="/account/link-existing"')
  expect(page).not.toContain('searchParams.get(')
  expect(page).not.toContain('type="hidden"')
})
test('new sign-in and account settings keep legacy purchase recovery discoverable', () => {
  for (const path of ['src/pages/[...lang]/signin.astro', 'src/pages/dashboard/parametres.astro']) {
    expect(source(path)).toContain('href="/account/link-existing"')
  }
})
