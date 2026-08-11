import type { APIRoute } from 'astro'
import { ConvexHttpClient } from 'convex/browser'
import { createCommerceCheckoutIdentityToken } from '@/lib/commerce/checkoutIdentity'
import { createCommerceCheckout } from '@/pages/api/commerce/checkout'
import { getCommerceOffer } from '@/lib/commerce/offers'
import { getServerEnv } from '@/lib/serverEnv'
import {
  getPrivateCoursePath,
  getPublicCoursePath,
  isPremiumFormationSlug,
} from '@/utils/courseGating'

export const prerender = false

function runtimeEnvironment(env: Record<string, string | undefined>) {
  return env.VERCEL_ENV ?? env.NODE_ENV ?? 'production'
}

export const GET: APIRoute = async () =>
  new Response(null, { status: 405, headers: { Allow: 'POST' } })

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const url = new URL(request.url)
  const offerId = url.searchParams.get('offerId')?.trim() ?? ''
  const offer = getCommerceOffer(offerId)
  if (!offer) return new Response('Offer not found', { status: 404 })

  const auth = locals.auth()
  if (!auth.userId) {
    const lang = url.searchParams.get('lang') === 'fr' ? 'fr' : 'en'
    const signInPath = lang === 'fr' ? '/fr/signin' : '/signin'
    const lesson = url.searchParams.get('lesson')?.replace(/^\/+/, '')
    const sourceRef = url.searchParams.get('sourceRef')?.trim()
    const fallbackPage = offer.productId === 'communityglows'
      ? (lang === 'fr' ? '/fr/communityglows-founder' : '/communityglows-founder')
      : (lang === 'fr' ? '/fr/commandglows-founder' : '/commandglows-founder')
    const returnPath = lesson && isPremiumFormationSlug(lesson)
      ? getPublicCoursePath(lesson)
      : sourceRef?.startsWith('/') && !sourceRef.startsWith('//')
        ? sourceRef
        : fallbackPage
    return redirect(`${signInPath}?next=${encodeURIComponent(returnPath)}`)
  }

  const env = getServerEnv()
  const convexUrl = env.PUBLIC_CONVEX_URL
  const bridgeSecret = env.SUITE_BRIDGE_CONVEX_SECRET
  const checkoutSecret = env.SUITE_COMMERCE_CHECKOUT_SECRET
  if (!convexUrl || !bridgeSecret || !checkoutSecret) {
    return new Response('Checkout identity is not configured', { status: 503 })
  }

  const convex = new ConvexHttpClient(convexUrl)
  const identity = await convex.query(
    'bridge:getCheckoutIdentityByClerkAccount' as never,
    { clerkId: auth.userId, bridgeSecret } as never
  ) as { globalUserId?: string } | null
  if (!identity?.globalUserId) {
    return new Response('Suite identity is not available', { status: 409 })
  }

  const checkoutToken = createCommerceCheckoutIdentityToken(
    identity.globalUserId,
    offer.productId,
    runtimeEnvironment(env),
    checkoutSecret
  )
  let successUrl = new URL(offer.successPath, url).toString()
  let cancelUrl = new URL(offer.cancelPath, url).toString()

  const lesson = url.searchParams.get('lesson')?.replace(/^\/+/, '')
  if (offer.productId === 'commandglows_formation') {
    if (!lesson || !isPremiumFormationSlug(lesson)) {
      return new Response('Invalid lesson', { status: 400 })
    }
    const success = new URL('/purchase/success', url)
    success.searchParams.set('next', getPrivateCoursePath(lesson))
    successUrl = success.toString()
    cancelUrl = new URL(getPublicCoursePath(lesson), url).toString()
  }

  const result = await createCommerceCheckout({
    offerId: offer.id,
    provider: 'stripe',
    source: url.searchParams.get('source')?.trim() || 'direct',
    sourceRef: url.searchParams.get('sourceRef')?.trim() || url.pathname,
    discountCode: url.searchParams.get('discountCode')?.trim() || undefined,
    successUrl,
    cancelUrl,
    identityToken: checkoutToken,
  })
  if (!result.ok) {
    return new Response(result.message, { status: result.status })
  }
  return redirect(result.checkoutUrl)
}
