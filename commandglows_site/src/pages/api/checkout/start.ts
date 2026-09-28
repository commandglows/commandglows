import type { APIRoute } from 'astro'
import { ConvexHttpClient } from 'convex/browser'
import { createCommerceCheckoutIdentityToken } from '@/lib/commerce/checkoutIdentity'
import { createCommerceCheckout } from '@/pages/api/commerce/checkout'
import { getCommerceOffer } from '@/lib/commerce/offers'
import { getServerEnv } from '@/lib/serverEnv'
import {
  getPrivateCoursePath,
  getPublicCoursePath,
  isFormationSalesEnabled,
  isPremiumFormationSlug,
} from '@/utils/courseGating'

export const prerender = false

function runtimeEnvironment(env: Record<string, string | undefined>) {
  return env.VERCEL_ENV ?? env.NODE_ENV ?? 'production'
}

function transitionPage(checkoutUrl: string, lang: 'en' | 'fr') {
  return new Response(`<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex" />
    <meta http-equiv="refresh" content="0; url=${checkoutUrl}" />
    <title>${lang === 'fr' ? 'Redirection vers le paiement' : 'Opening checkout'}</title>
    <style>
      body { font-family: system-ui, sans-serif; display: grid; min-height: 100vh; place-items: center; margin: 0; }
      main { max-width: 32rem; padding: 2rem; text-align: center; }
      .spinner { width: 2rem; height: 2rem; margin: 0 auto 1rem; border: 3px solid #ddd; border-top-color: #111; border-radius: 50%; animation: spin 800ms linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  </head>
  <body>
    <main>
      <div class="spinner" aria-hidden="true"></div>
      <p>${lang === 'fr' ? 'Stripe va s’ouvrir dans un instant.' : 'Stripe will open in a moment.'}</p>
      <a href="${checkoutUrl}">${lang === 'fr' ? 'Continuer vers Stripe' : 'Continue to Stripe'}</a>
      <script>location.replace(${JSON.stringify(checkoutUrl)})</script>
    </main>
  </body>
</html>`, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

export const GET: APIRoute = async () =>
  new Response(null, { status: 405, headers: { Allow: 'POST' } })

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const url = new URL(request.url)
  const offerId = url.searchParams.get('offerId')?.trim() ?? ''
  const offer = getCommerceOffer(offerId)
  if (!offer) return new Response('Offer not found', { status: 404 })
  const lesson = url.searchParams.get('lesson')?.replace(/^\/+/, '')
  const sourceRef = url.searchParams.get('sourceRef')?.trim() ?? ''
  const lang: 'en' | 'fr' = url.searchParams.get('lang') === 'fr' || sourceRef.startsWith('/fr/') || lesson?.startsWith('fr/') ? 'fr' : 'en'

  const siteAuthSource = (locals as { siteAuth?: unknown }).siteAuth
  const siteAuth = typeof siteAuthSource === 'function'
    ? siteAuthSource()
    : siteAuthSource && typeof siteAuthSource === 'object'
      ? siteAuthSource as { userId?: string | null; unavailable?: boolean }
      : undefined
  if (siteAuth?.unavailable) {
    return new Response('Checkout identity is temporarily unavailable', {
      status: 503,
      headers: { 'Retry-After': '30' },
    })
  }
  const env = getServerEnv()
  if (offer.productId === 'commandglows_formation' && !isFormationSalesEnabled(env)) {
    return new Response('Formation checkout is not open yet', {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
  if (offer.productId === 'commandglows_formation' && (!lesson || !isPremiumFormationSlug(lesson))) {
    return new Response('Invalid lesson', { status: 400 })
  }

  const authSource = (locals as { auth?: unknown }).auth
  const auth = typeof authSource === 'function'
    ? authSource()
    : authSource && typeof authSource === 'object'
      ? authSource as { userId?: string; sessionClaims?: Record<string, unknown> }
      : { userId: undefined }
  const userId = siteAuth?.userId ?? auth.userId
  if (!userId) {
    const signInPath = lang === 'fr' ? '/fr/signin' : '/signin'
    const fallbackPage = offer.productId === 'communityglows'
      ? (lang === 'fr' ? '/fr/communityglows-founder' : '/communityglows-founder')
      : (lang === 'fr' ? '/fr/commandglows-founder' : '/commandglows-founder')
    const returnPath = lesson ? getPublicCoursePath(lesson) : fallbackPage
    return redirect(`${signInPath}?next=${encodeURIComponent(returnPath)}`)
  }

  const convexUrl = env.PUBLIC_CONVEX_URL
  const bridgeSecret = env.SUITE_BRIDGE_CONVEX_SECRET
  const checkoutSecret = env.SUITE_COMMERCE_CHECKOUT_SECRET
  if (!convexUrl || !bridgeSecret || !checkoutSecret) {
    return new Response('Checkout identity is not configured', { status: 503 })
  }

  let identity = siteAuth?.userId
    ? { globalUserId: siteAuth.userId }
    : null as { globalUserId?: string } | null
  if (!identity?.globalUserId && auth.userId) {
    const convex = new ConvexHttpClient(convexUrl)
    identity = await convex.query(
      'bridge:getCheckoutIdentityByClerkAccount' as never,
      { clerkId: auth.userId, bridgeSecret } as never
    ) as { globalUserId?: string } | null
    const claims = (auth as { sessionClaims?: Record<string, unknown> }).sessionClaims
    const email = typeof claims?.email === 'string'
      ? claims.email
      : typeof claims?.primary_email_address === 'string'
        ? claims.primary_email_address
        : undefined
    if (!identity?.globalUserId) {
      identity = await convex.mutation(
        'bridge:upsertClerkIdentityForCheckout' as never,
        {
          clerkId: auth.userId,
          email,
          environment: runtimeEnvironment(env),
          sourceRef: sourceRef || url.pathname,
          bridgeSecret,
        } as never
      ) as { globalUserId?: string } | null
    }
  }
  if (!identity?.globalUserId) {
    return new Response('Suite identity is not available', { status: 409 })
  }

  const checkoutToken = createCommerceCheckoutIdentityToken(
    identity.globalUserId,
    offer.productId,
    runtimeEnvironment(env),
    checkoutSecret
  )
  const success = new URL(offer.successPath, url)
  const cancel = new URL(offer.cancelPath, url)
  success.searchParams.set('lang', lang)
  cancel.searchParams.set('lang', lang)
  let successUrl = success.toString()
  let cancelUrl = cancel.toString()

  if (offer.productId === 'commandglows_formation') {
    const formationSuccess = new URL('/purchase/success', url)
    formationSuccess.searchParams.set('next', getPrivateCoursePath(lesson!))
    formationSuccess.searchParams.set('lang', lang)
    successUrl = formationSuccess.toString()
    cancelUrl = new URL(getPublicCoursePath(lesson!), url).toString()
  }

  const result = await createCommerceCheckout({
    offerId: offer.id,
    provider: 'stripe',
    source: url.searchParams.get('source')?.trim() || 'direct',
    sourceRef: sourceRef || url.pathname,
    discountCode: url.searchParams.get('discountCode')?.trim() || undefined,
    successUrl,
    cancelUrl,
    identityToken: checkoutToken,
  })
  if (!result.ok) {
    return new Response(result.message, { status: result.status })
  }
  return transitionPage(result.checkoutUrl, lang)
}
