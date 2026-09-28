import type { APIContext } from 'astro'
import { SITE } from '@/constants'

export const COURSE_ENTITLEMENT = 'commandglows_formation'
const FORMATION_OFFER_ID = 'commandglows_formation/full_course'

export function isFormationSalesEnabled(env: Record<string, string | undefined>) {
	return env.COMMANDGLOWS_FORMATION_SALES_ENABLED === 'true'
}

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
	return pathname === '/dashboard/parametres' ||
		pathname === '/dashboard/settings' ||
		pathname === '/fr/dashboard/parametres' ||
		pathname === '/dashboard/licences' ||
		pathname === '/dashboard/newsletters' ||
		pathname === '/fr/dashboard/newsletters'
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

export function getSafeAuthRedirectPath(pathname: string | null, fallback: '/dashboard' | '/fr/dashboard/' = '/dashboard') {
	if (!pathname || !pathname.startsWith('/') || pathname.startsWith('//') || /[\\\u0000-\u0020]/.test(pathname)) return fallback
	let url: URL
	try {
		url = new URL(pathname, SITE.url)
		if (url.origin !== new URL(SITE.url).origin) return fallback
	} catch { return fallback }
	const purchaseLanding = [
		'/commandglows-founder', '/fr/commandglows-founder',
		'/communityglows-founder', '/fr/communityglows-founder',
	].includes(url.pathname)
	const formationLesson = /^\/(?:fr|en)\/formations\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\/?$/.test(url.pathname)
	if (
		isSafePrivateCoursePath(pathname) ||
		isSafeAccountPath(pathname) ||
		isSafeCourseCheckoutPath(pathname) ||
		((purchaseLanding || formationLesson) && !url.search && !url.hash)
	) {
		return pathname
	}

	return fallback
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
