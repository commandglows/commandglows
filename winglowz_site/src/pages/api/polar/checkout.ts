import type { APIRoute } from 'astro'
import { Polar } from '@polar-sh/sdk'
import { ConvexHttpClient } from 'convex/browser'
import {
	COURSE_ENTITLEMENT,
	getCourseCheckoutPath,
	getPrivateCoursePath,
	getPublicCoursePath,
	isPremiumFormationSlug,
} from '@/utils/courseGating'

type CheckoutUser = {
	email?: string
	name?: string
	polarCustomerId?: string
}

const FORMATION_PRODUCT_ID = 'commandglows_formation'

export const prerender = false

export const GET: APIRoute = async ({ url, locals, redirect }) => {
	const lesson = url.searchParams.get('lesson')
	const lang = url.searchParams.get('lang') === 'fr' ? 'fr' : 'en'

	if (!lesson || !isPremiumFormationSlug(lesson)) {
		return new Response('Invalid lesson', { status: 400 })
	}

	const auth = locals.auth()
	if (!auth.userId) {
		const signInPath = lang === 'fr' ? '/fr/signin' : '/signin'
		const next = getCourseCheckoutPath(lesson, lang)
		return redirect(`${signInPath}?next=${encodeURIComponent(next)}`)
	}

	const polarAccessToken = import.meta.env.POLAR_ACCESS_TOKEN
	const polarProductId =
		import.meta.env.POLAR_COMMANDGLOWS_PRODUCT_ID || import.meta.env.POLAR_PRODUCT_ID
	const convexUrl = import.meta.env.PUBLIC_CONVEX_URL

	if (!polarAccessToken || !polarProductId) {
		return new Response('Polar is not configured', { status: 500 })
	}

	if (!convexUrl || convexUrl === 'https://PLACEHOLDER.convex.cloud') {
		return new Response('Convex is not configured', { status: 500 })
	}

	const privatePath = getPrivateCoursePath(lesson)
	const publicPath = getPublicCoursePath(lesson)
	const convex = new ConvexHttpClient(convexUrl)
	const user = (await convex.query('users:getByClerkId' as never, {
		clerkId: auth.userId,
	} as never)) as CheckoutUser | null

	if (!user?.email) {
		return new Response('User email missing', { status: 400 })
	}

	const polar = new Polar({
		accessToken: polarAccessToken,
		server: import.meta.env.POLAR_SERVER === 'sandbox' ? 'sandbox' : 'production',
	})

	try {
		const successUrl = new URL('/purchase/success', url)
		successUrl.searchParams.set('next', privatePath)

		const returnUrl = new URL(publicPath, url)
		const checkout = await polar.checkouts.create({
			products: [polarProductId],
			successUrl: successUrl.toString(),
			returnUrl: returnUrl.toString(),
			customerEmail: user.email,
			customerName: user.name,
			customerId: user.polarCustomerId,
			externalCustomerId: auth.userId,
			metadata: {
				productId: FORMATION_PRODUCT_ID,
				entitlement: COURSE_ENTITLEMENT,
				clerkId: auth.userId,
				lessonSlug: lesson,
				privatePath,
			},
		})

		return redirect(checkout.url)
	} catch (error) {
		console.error('Polar checkout creation failed', error)
		return new Response('Unable to create checkout', { status: 500 })
	}
}
