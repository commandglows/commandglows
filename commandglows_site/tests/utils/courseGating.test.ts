import { getSafeAuthRedirectPath } from '@/utils/courseGating'

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
})
