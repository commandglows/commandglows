import type { APIRoute } from 'astro'
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

function escapeHtmlAttribute(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function stripeCheckoutPage(checkoutUrl: string, lang: 'en' | 'fr') {
  let target: URL
  try {
    target = new URL(checkoutUrl)
  } catch {
    return new Response('Invalid Stripe checkout URL', { status: 502 })
  }
  if (target.protocol !== 'https:' || !target.hostname.startsWith('checkout.stripe.')) {
    return new Response('Invalid Stripe checkout URL', { status: 502 })
  }

  const safeTarget = escapeHtmlAttribute(target.toString())
  const title = lang === 'fr' ? 'Ouverture du paiement sécurisé' : 'Opening secure checkout'
  const eyebrow = lang === 'fr' ? 'Paiement sécurisé' : 'Secure payment'
  const message = lang === 'fr'
    ? 'Stripe va s’ouvrir dans un instant. Si la redirection tarde, utilisez le bouton ci-dessous.'
    : 'Stripe will open in a moment. If the redirect takes longer, use the button below.'
  const action = lang === 'fr' ? 'Continuer vers Stripe' : 'Continue to Stripe'
  return new Response(`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="refresh" content="0;url=${safeTarget}"><title>${title}</title><style>:root{color-scheme:dark;--bg:#08080b;--panel:#1f1f24;--line:#37373f;--text:#f7f7fb;--muted:#b6b6c0;--hot:#ff2bd6;--warm:#ffe85f}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 18% 12%,rgba(255,43,214,.24),transparent 34rem),linear-gradient(135deg,#08080b,#17171d 54%,#08080b);color:var(--text);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{display:grid;min-height:100vh;place-items:center;padding:2rem}.panel{width:min(34rem,100%);border:1px solid var(--line);border-radius:1.5rem;background:rgba(31,31,36,.88);padding:2rem;box-shadow:0 2rem 5rem rgba(0,0,0,.45);text-align:center}.mark{margin:0 auto 1.25rem;display:grid;height:4rem;width:4rem;place-items:center;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(255,255,255,.08)}.spinner{height:1.65rem;width:1.65rem;border:3px solid var(--warm);border-right-color:transparent;border-radius:999px;animation:spin .8s linear infinite}.eyebrow{margin:0 0 .5rem;color:var(--hot);font-size:.78rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase}h1{margin:0;font-size:clamp(2rem,7vw,3rem);line-height:1.02}p{margin:1rem auto 0;max-width:26rem;color:var(--muted);font-size:1.05rem;line-height:1.6}a{display:inline-flex;align-items:center;justify-content:center;margin-top:1.5rem;min-height:3rem;border-radius:999px;background:#fff;color:#101014;padding:0 1.25rem;font-weight:800;text-decoration:none}@keyframes spin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.spinner{animation:none}}</style></head><body><main><section class="panel" aria-live="polite"><div class="mark"><div class="spinner"></div></div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${message}</p><a href="${safeTarget}" rel="noreferrer">${action}</a></section></main></body></html>`, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; style-src 'unsafe-inline'",
    },
  })
}

export const GET: APIRoute = async () =>
  new Response(null, { status: 405, headers: { Allow: 'POST' } })

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const url = new URL(request.url)
  if (request.headers.get('origin') !== url.origin) {
    return new Response('Same origin required', { status: 403 })
  }
  const offerId = url.searchParams.get('offerId')?.trim() ?? ''
  const offer = getCommerceOffer(offerId)
  if (!offer) return new Response('Offer not found', { status: 404 })

  const auth = locals.siteAuth()
  if (auth.unavailable) {
    return new Response('Account verification is temporarily unavailable. Please retry.', {
      status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '30' },
    })
  }
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

  const checkoutToken = createCommerceCheckoutIdentityToken(
    auth.userId,
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
  return stripeCheckoutPage(result.checkoutUrl, url.searchParams.get('lang') === 'fr' ? 'fr' : 'en')
}
