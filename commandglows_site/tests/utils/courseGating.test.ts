import { getCourseCheckoutPath, getSafeAuthRedirectPath } from '@/utils/courseGating'

describe('courseGating auth redirects', () => {
	test('allows the account settings path after sign-in', () => {
		expect(getSafeAuthRedirectPath('/dashboard/parametres')).toBe(
			'/dashboard/parametres'
		)
	})

	test('falls back to the dashboard for unsafe redirects', () => {
		expect(getSafeAuthRedirectPath('https://example.com/account')).toBe(
			'/dashboard'
		)
		expect(getSafeAuthRedirectPath('/account')).toBe('/dashboard')
	})

	test('routes premium lessons through the authenticated Stripe start route', () => {
		const path = getCourseCheckoutPath('fr/formations/module-2-windows/', 'fr')
		expect(path).toContain('/api/checkout/start?')
		expect(path).toContain('offerId=commandglows_formation%2Ffull_course')
		expect(getSafeAuthRedirectPath(path)).toBe(path)
	})
})
