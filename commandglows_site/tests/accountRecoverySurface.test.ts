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
  expect(page).toContain('type="hidden" name="lang" value={lang}')
  expect(page).toContain("href={contactPath}")
  expect(page).toContain("href={dashboardPath}")
  expect(page).not.toContain("href={recoveryAvailable ? signInPath : french ? '/fr' : '/'}")
})
test('new sign-in and account settings keep legacy purchase recovery discoverable', () => {
  for (const path of ['src/pages/[...lang]/signin.astro', 'src/components/dashboard/AccountSettings.astro']) {
    expect(source(path)).toContain('/fr/account/link-existing')
  }
})
test('dashboard recovery entry points depend on the guarded recovery availability state', () => {
  for (const path of ['src/components/dashboard/AccountOverview.astro', 'src/components/dashboard/AccountSettings.astro']) {
    const page = source(path)
    expect(page).toContain('isAccountRecoveryAvailable(Astro.url.origin, auth.unavailable)')
    expect(page).toContain('{recoveryAvailable ?')
    expect(page).toContain("isFrench ? '/fr/contact' : '/contact'")
    expect(page).toContain("isFrench ? 'Contacter le support' : 'Contact support'")
  }
  const overview = source('src/components/dashboard/AccountOverview.astro')
  expect(overview).toContain('{recoveryAvailable && <p class="text-content-text-secondary mt-2">')
  expect(overview).toContain('If you have already purchased an offer, you can recover your purchases.')
  expect(source('src/components/dashboard/AccountOverview.astro')).not.toContain('Si vous avez déjà acheté une offre, gardez votre confirmation d’achat.')
})
test('recovery availability retains the route security checks', () => {
  const availability = source('src/lib/auth/accountRecoveryAvailability.ts')
  expect(availability).toContain('config.origin === origin && !authUnavailable')
  expect(availability).toContain('siteBackend()')
})
test('private navigation changes only the unavailable recovery destination to support', () => {
  const layout = source('src/layouts/DashboardLayout.astro')
  expect(layout).toContain('const recoveryAvailable = isAccountRecoveryAvailable(Astro.url.origin, auth.unavailable)')
  expect(layout).toContain('const customerNavigation = recoveryAvailable ? navigation.customer : navigation.customer.map')
  expect(layout).toContain("name: lang === 'fr' ? 'Aide pour mes achats' : 'Help with purchases'")
  expect(layout).toContain('href: recoveryContactUrl')
  expect(layout).toContain('{navigation.administration.map((item) =>')
})
test('recovery routes and stale-session feedback preserve the selected language', () => {
  expect(source('src/pages/account/link-existing.astro')).toContain('<AccountRecovery lang="en" />')
  expect(source('src/pages/fr/account/link-existing.astro')).toContain('<AccountRecovery lang="fr" />')
  expect(source('src/layouts/MainLayout.astro')).toContain("<SiteSessionGuard lang={lang === 'fr' ? 'fr' : 'en'} />")
  expect(source('src/components/shared/site/SiteSessionGuard.astro')).toContain('data-sign-in-path={signInPath}')
})
