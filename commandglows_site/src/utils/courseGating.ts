import type { APIContext } from 'astro'
import { ConvexHttpClient } from 'convex/browser'
import { SITE } from '@/constants'

type CourseUser = { role?: string }

type FormationAccess = {
	hasAccess: boolean
	source?: string
	user?: CourseUser | null
}

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
	const auth = context.locals.auth()
	if (!auth.userId) {
		return { isAuthenticated: false, hasAccess: false }
	}

	const convexUrl = import.meta.env.PUBLIC_CONVEX_URL
	if (!convexUrl || convexUrl === 'https://PLACEHOLDER.convex.cloud') {
		return { isAuthenticated: true, hasAccess: false }
	}

	try {
		const convex = new ConvexHttpClient(convexUrl)
		const access = (await convex.query('users:getFormationAccessByClerkId' as never, {
			clerkId: auth.userId,
		} as never)) as FormationAccess | null

		return {
			isAuthenticated: true,
			hasAccess: access?.hasAccess === true,
			user: access?.user ?? null,
		}
	} catch {
		return { isAuthenticated: true, hasAccess: false }
	}
}
