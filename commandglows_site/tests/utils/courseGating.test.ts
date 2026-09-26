import { getCourseCheckoutPath, getSafeAuthRedirectPath } from '@/utils/courseGating'

describe('courseGating auth redirects', () => {
	test('allows the account settings path after sign-in', () => {
		for (const path of [
			'/dashboard/parametres',
			'/dashboard/settings',
			'/fr/dashboard/parametres',
			'/dashboard/licences',
			'/dashboard/newsletters',
			'/fr/dashboard/newsletters',
		]) expect(getSafeAuthRedirectPath(path)).toBe(path)
	})

	test('falls back to the dashboard for unsafe redirects', () => {
		expect(getSafeAuthRedirectPath('https://example.com/account')).toBe(
			'/dashboard'
		)
		expect(getSafeAuthRedirectPath('/account')).toBe('/dashboard')
		expect(getSafeAuthRedirectPath('//evil.example/dashboard/settings')).toBe('/dashboard')
		expect(getSafeAuthRedirectPath('/dashboard/settings\\evil.example')).toBe('/dashboard')
		expect(getSafeAuthRedirectPath('/dashboard/settings/other')).toBe('/dashboard')
		expect(getSafeAuthRedirectPath('/fr/dashboard/settings', '/fr/dashboard/')).toBe('/fr/dashboard/')
	})

	test('returns buyers to a known offer or formation page after sign-in', () => {
		for (const path of [
			'/commandglows-founder', '/fr/commandglows-founder',
			'/communityglows-founder', '/fr/communityglows-founder',
			'/en/formations/module-2-windows/terminal',
			'/fr/formations/module-2-windows/terminal',
		]) expect(getSafeAuthRedirectPath(path)).toBe(path)
		expect(getSafeAuthRedirectPath('/fr/commandglows-founder?next=https://evil.example')).toBe('/dashboard')
		expect(getSafeAuthRedirectPath('/fr/formations/../../admin')).toBe('/dashboard')
	})

	test('routes premium lessons through the authenticated Stripe start route', () => {
		const path = getCourseCheckoutPath('fr/formations/module-2-windows/', 'fr')
		expect(path).toContain('/api/checkout/start?')
		expect(path).toContain('offerId=commandglows_formation%2Ffull_course')
		expect(getSafeAuthRedirectPath(path)).toBe(path)
	})
})
