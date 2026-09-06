import type { APIContext } from 'astro'
import { SITE } from '@/constants'

export const COURSE_ENTITLEMENT = 'commandglows_formation'
const FORMATION_OFFER_ID = 'commandglows_formation/full_course'

export function isFormationSlug(slug: string) {
	return (
		slug === 'formations' ||
		slug === 'fr/formations' ||
		slug === 'en/formations' ||
		slug.includes('/formations/')
	)
}

export function isFreeFormationSlug(slug: string) {
	const normalized = slug.replace(/^\/+|\/+$/g, '')

	return (
		normalized === 'formations' ||
		normalized === 'fr/formations' ||
		normalized === 'en/formations' ||
		normalized.includes('/formations/module-1-productivite')
	)
}

export function isPremiumFormationSlug(slug: string) {
	return isFormationSlug(slug) && !isFreeFormationSlug(slug)
}

export function getPrivateCoursePath(slug: string) {
	return `/dashboard/docs/${slug.replace(/^\/+/, '')}`
}

export function getPublicCoursePath(slug: string) {
	return `/${slug.replace(/^\/+/, '')}`
}

export function getCourseCheckoutPath(slug: string, lang: 'en' | 'fr') {
	const params = new URLSearchParams({
		offerId: FORMATION_OFFER_ID,
		lesson: slug.replace(/^\/+/, ''),
		lang,
	})
	return `/api/checkout/start?${params.toString()}`
}

export function isSafePrivateCoursePath(pathname: string | null) {
	return Boolean(pathname && pathname.startsWith('/dashboard/docs/'))
}

export function isSafeAccountPath(pathname: string | null) {
	return pathname === '/dashboard/parametres'
}

export function isSafeCourseCheckoutPath(pathname: string | null) {
	if (!pathname) {
		return false
	}

	try {
		const url = new URL(pathname, SITE.url)
		const lesson = url.searchParams.get('lesson')
		return (
			url.pathname === '/api/checkout/start' &&
			Boolean(lesson && isFormationSlug(lesson))
		)
	} catch {
		return false
	}
}

export function getSafeAuthRedirectPath(pathname: string | null) {
	if (!pathname || !pathname.startsWith('/') || pathname.startsWith('//') || /[\\\u0000-\u0020]/.test(pathname)) return '/dashboard'
	try { if (new URL(pathname, SITE.url).origin !== new URL(SITE.url).origin) return '/dashboard' } catch { return '/dashboard' }
	if (
		isSafePrivateCoursePath(pathname) ||
		isSafeAccountPath(pathname) ||
		isSafeCourseCheckoutPath(pathname)
	) {
		return pathname
	}

	return '/dashboard'
}

export function extractCoursePreview(body: string, maxParagraphs = 4) {
	const normalized = body
		.replace(/```[\s\S]*?```/g, '')
		.replace(/!\[[^\]]*\]\([^)]+\)/g, '')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/^#{1,6}\s+/gm, '')
		.replace(/^\s*[-*+]\s+/gm, '')
		.replace(/^\s*\d+\.\s+/gm, '')
		.replace(/`([^`]+)`/g, '$1')

	return normalized
		.split(/\n{2,}/)
		.map((paragraph) => paragraph.replace(/\n+/g, ' ').trim())
		.filter((paragraph) => paragraph.length > 80)
		.slice(0, maxParagraphs)
}

export async function getCourseAccess(context: APIContext) {
  const auth = context.locals.siteAuth()
  return { isAuthenticated: Boolean(auth.userId), hasAccess: Boolean(auth.userId && auth.formationAccess), user: auth.userId ? { role: auth.role } : null }
}
