import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
test('recovery uses verified legacy authentication then an explicit POST account link', () => {
  const page = source('src/components/shared/site/AccountRecovery.astro')
  expect(page).toContain('Astro.locals.auth?.().userId')
  expect(page).toContain('legacyAccount ?')
  expect(page).toContain('method="post" action="/api/auth/link"')
  expect(page).toContain('<LegacySignIn routing="hash" fallbackRedirectUrl={recoveryPath}')
  expect(page).not.toContain('searchParams.get(')
  expect(page).not.toContain('type="hidden"')
})
test('new sign-in and account settings keep legacy purchase recovery discoverable', () => {
  for (const path of ['src/pages/[...lang]/signin.astro', 'src/pages/dashboard/parametres.astro']) {
    expect(source(path)).toContain('/fr/account/link-existing')
  }
})
test('recovery routes and stale-session feedback preserve the selected language', () => {
  expect(source('src/pages/account/link-existing.astro')).toContain('<AccountRecovery lang="en" />')
  expect(source('src/pages/fr/account/link-existing.astro')).toContain('<AccountRecovery lang="fr" />')
  expect(source('src/layouts/MainLayout.astro')).toContain('<SiteSessionGuard lang={lang} />')
  expect(source('src/components/shared/site/SiteSessionGuard.astro')).toContain('data-sign-in-path={signInPath}')
})
