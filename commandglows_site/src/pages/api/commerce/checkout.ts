import type { APIRoute } from 'astro'
import { ConvexHttpClient } from 'convex/browser'
import type { CommerceCheckoutRequest } from '@/lib/commerce/types'
import { getServerEnv } from '@/lib/serverEnv'
import { createStripeManagedPaymentsCheckout } from '@/lib/commerce/providers/stripe'
import {
  hashCommerceCheckoutJti,
  verifyCommerceCheckoutIdentityToken,
} from '@/lib/commerce/checkoutIdentity'
import { getCommerceOffer, getOfferProviderConfig } from '@/lib/commerce/offers'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export type CheckoutRequestData = {
  offerId: string
  provider?: string
  source?: string
  sourceRef?: string
  discountCode?: string
  successUrl: string
  cancelUrl: string
  identityToken?: string
}

function nonEmpty(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function redirectUrl(value: string | undefined, request: Request, fallback: string) {
  try {
    return new URL(value ?? fallback, request.url).toString()
  } catch {
    return new URL(fallback, request.url).toString()
  }
}

function fromBody(body: unknown, request: Request): CheckoutRequestData | null {
  if (!body || typeof body !== 'object') return null
  const value = body as Record<string, unknown>
  return {
    offerId: nonEmpty(value.offerId) ?? '',
    provider: nonEmpty(value.provider)?.toLowerCase(),
    source: nonEmpty(value.source),
    sourceRef: nonEmpty(value.sourceRef),
    discountCode: nonEmpty(value.discountCode),
    successUrl: redirectUrl(nonEmpty(value.successUrl), request, '/purchase/success'),
    cancelUrl: redirectUrl(nonEmpty(value.cancelUrl), request, '/purchase/cancel'),
    identityToken: nonEmpty(value.identityToken),
  }
}

function json(payload: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS })
}

function runtimeEnvironment(env: Record<string, string | undefined>) {
  return env.VERCEL_ENV ?? env.NODE_ENV ?? 'production'
}

export async function createCommerceCheckout(data: CheckoutRequestData) {
  if (!data.offerId) return { ok: false as const, status: 400, message: 'Missing offerId' }
  const offer = getCommerceOffer(data.offerId)
  if (!offer) return { ok: false as const, status: 404, message: 'Offer not found' }
  if (data.provider && data.provider !== 'stripe') {
    return { ok: false as const, status: 400, message: `${data.provider}: provider_not_allowed_or_unknown` }
  }

  const env = getServerEnv()
  const secret = env.SUITE_COMMERCE_CHECKOUT_SECRET
  if (!secret || !data.identityToken) {
    return { ok: false as const, status: 401, message: 'Checkout must be started from an authenticated suite product' }
  }
  const verified = verifyCommerceCheckoutIdentityToken(data.identityToken, secret)
  if (
    !verified ||
    verified.productId !== offer.productId ||
    verified.environment !== runtimeEnvironment(env)
  ) {
    return { ok: false as const, status: 401, message: 'Checkout must be started from an authenticated suite product' }
  }

  const convexUrl = env.PUBLIC_CONVEX_URL
  const bridgeSecret = env.SUITE_BRIDGE_CONVEX_SECRET
  if (!convexUrl || !bridgeSecret) {
    return { ok: false as const, status: 503, message: 'Checkout authority is not configured' }
  }
  const jtiHash = hashCommerceCheckoutJti(verified.jti, secret)
  const convex = new ConvexHttpClient(convexUrl)
  let claim: {
    status: string
    idempotencyKey: string
    checkoutUrl?: string | null
  }
  try {
    claim = await convex.mutation(
      'bridge:claimCommerceCheckoutHandoff' as never,
      {
        jtiHash,
        globalUserId: verified.globalUserId,
        productId: verified.productId,
        offerId: offer.id,
        environment: verified.environment,
        expiresAt: verified.expiresAt * 1000,
        bridgeSecret,
      } as never
    ) as typeof claim
  } catch {
    return { ok: false as const, status: 409, message: 'Checkout handoff is expired or invalid' }
  }
  if (claim.status === 'completed' && claim.checkoutUrl) {
    return { ok: true as const, provider: 'stripe', checkoutUrl: claim.checkoutUrl }
  }

  if (!getOfferProviderConfig(data.offerId, 'stripe', env)) {
    return { ok: false as const, status: 503, message: 'Stripe checkout is not configured for this offer' }
  }

  const request: Omit<CommerceCheckoutRequest, 'offerId'> = {
    provider: 'stripe',
    successUrl: data.successUrl,
    cancelUrl: data.cancelUrl,
    discountCode: data.discountCode,
    metadata: {
      offer_id: offer.id,
      product_id: offer.productId,
      plan: offer.plan,
      global_user_id: verified.globalUserId,
      environment: verified.environment,
      source: data.source ?? 'direct',
      source_ref: data.sourceRef,
    },
    idempotencyHint: claim.idempotencyKey,
  }
  const result = await createStripeManagedPaymentsCheckout(request, data.offerId, env)
  if (!result.ok) {
    return {
      ok: false as const,
      status: result.code === 'bad_request' ? 400 : 502,
      message: result.message,
    }
  }
  try {
    await convex.mutation(
      'bridge:completeCommerceCheckoutHandoff' as never,
      {
        jtiHash,
        globalUserId: verified.globalUserId,
        productId: verified.productId,
        offerId: offer.id,
        environment: verified.environment,
        checkoutUrl: result.checkoutUrl,
        providerOrderId: result.providerOrderId,
        bridgeSecret,
      } as never
    )
  } catch {
    return { ok: false as const, status: 502, message: 'Checkout handoff could not be finalized' }
  }
  return { ok: true as const, provider: 'stripe', checkoutUrl: result.checkoutUrl }
}

export const GET: APIRoute = async () =>
  new Response(null, { status: 405, headers: { Allow: 'POST' } })

export const POST: APIRoute = async ({ request }) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ message: 'Invalid checkout payload' }, 400)
  }
  const data = fromBody(body, request)
  if (!data) return json({ message: 'Invalid checkout payload' }, 400)
  const result = await createCommerceCheckout(data)
  if (!result.ok) return json({ message: result.message }, result.status)
  return json({ ok: true, provider: result.provider, checkoutUrl: result.checkoutUrl }, 200)
}
