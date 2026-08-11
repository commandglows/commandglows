import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createCommerceCheckoutIdentityToken } from '@/lib/commerce/checkoutIdentity'

const mockMutation = vi.fn()
vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn().mockImplementation(function () {
    return { mutation: mockMutation }
  }),
}))

const ORIGINAL_FETCH = globalThis.fetch
const ORIGINAL_ENV = { ...process.env }
const SECRET = 'checkout-identity-secret'

function runtimeEnvironment() {
  return process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'production'
}

function token(productId: string, jti = `jti_${productId}_123456789012345678901234`) {
  return createCommerceCheckoutIdentityToken(
    'gu_checkout_user', productId, runtimeEnvironment(), SECRET,
    Math.floor(Date.now() / 1000), jti
  )
}

function request(body: Record<string, unknown>) {
  return new Request('https://commandglows.test/api/commerce/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  mockMutation.mockReset()
  process.env.SUITE_COMMERCE_CHECKOUT_SECRET = SECRET
  process.env.SUITE_BRIDGE_CONVEX_SECRET = 'bridge-secret'
  process.env.PUBLIC_CONVEX_URL = 'https://convex.example.com'
})

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH
  process.env = { ...ORIGINAL_ENV }
})

describe('Stripe-only commerce checkout route', () => {
  test('rejects browser-visible GET handoffs', async () => {
    const { GET } = await import('@/pages/api/commerce/checkout')
    const response = await GET({ request: new Request(
      `https://commandglows.test/api/commerce/checkout?identityToken=${encodeURIComponent(token('communityglows'))}`
    ) })
    expect(response.status).toBe(405)
  })

  test('requires a signed identity handoff and a known offer', async () => {
    const { POST } = await import('@/pages/api/commerce/checkout')
    expect((await POST({ request: request({}) })).status).toBe(400)
    expect((await POST({ request: request({ offerId: 'unknown/offer' }) })).status).toBe(404)
    expect((await POST({ request: request({ offerId: 'communityglows/lifetime_deal' }) })).status).toBe(401)
  })

  test('rejects non-Stripe providers and cross-product handoffs', async () => {
    const { POST } = await import('@/pages/api/commerce/checkout')
    expect((await POST({ request: request({
      offerId: 'communityglows/lifetime_deal', provider: 'lemonsqueezy',
      identityToken: token('communityglows'),
    }) })).status).toBe(400)
    expect((await POST({ request: request({
      offerId: 'communityglows/lifetime_deal', identityToken: token('commandglows_app'),
    }) })).status).toBe(401)
  })

  test.each([
    ['communityglows/lifetime_deal', 'communityglows', 'STRIPE_COMMUNITYGLOWS_LIFETIME_DEAL_PRICE_ID', 'price_community'],
    ['commandglows_app/power', 'commandglows_app', 'STRIPE_COMMANDGLOWS_APP_POWER_PRICE_ID', 'price_power'],
    ['commandglows_formation/full_course', 'commandglows_formation', 'STRIPE_COMMANDGLOWS_FORMATION_PRICE_ID', 'price_formation'],
  ])('creates one managed Stripe checkout for %s', async (offerId, productId, priceKey, priceId) => {
    const { POST } = await import('@/pages/api/commerce/checkout')
    process.env.STRIPE_SECRET_KEY = 'sk_test_route'
    process.env[priceKey] = priceId
    mockMutation
      .mockResolvedValueOnce({ status: 'claimed', idempotencyKey: `suite-checkout:${productId}` })
      .mockResolvedValueOnce({ status: 'completed' })
    const fetchSpy = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ id: `cs_${productId}`, url: `https://checkout.stripe.test/${productId}` }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    ))
    globalThis.fetch = fetchSpy as unknown as typeof fetch
    const identityToken = token(productId)
    const response = await POST({ request: request({
      offerId, provider: 'stripe', source: 'direct', sourceRef: 'test',
      identityToken,
    }) })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      checkoutUrl: `https://checkout.stripe.test/${productId}`,
    })
    const stripeOptions = fetchSpy.mock.calls[0]?.[1]
    const body = String(stripeOptions?.body)
    expect(body).toContain('managed_payments[enabled]=true')
    expect(body).toContain(`line_items[0][price]=${priceId}`)
    expect(body).toContain(`metadata[product_id]=${productId}`)
    expect(body).not.toContain(identityToken)
    expect(stripeOptions?.headers).toContainEqual([
      'Idempotency-Key',
      `suite-checkout:${productId}`,
    ])
  })

  test('returns the completed session on replay without calling Stripe again', async () => {
    const { POST } = await import('@/pages/api/commerce/checkout')
    process.env.STRIPE_SECRET_KEY = 'sk_test_route'
    process.env.STRIPE_COMMUNITYGLOWS_LIFETIME_DEAL_PRICE_ID = 'price_community'
    mockMutation.mockResolvedValueOnce({
      status: 'completed',
      idempotencyKey: 'suite-checkout:existing',
      checkoutUrl: 'https://checkout.stripe.test/existing',
    })
    const fetchSpy = vi.fn()
    globalThis.fetch = fetchSpy as unknown as typeof fetch
    const response = await POST({ request: request({
      offerId: 'communityglows/lifetime_deal',
      identityToken: token('communityglows', 'jti_replay_123456789012345678901234'),
    }) })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      checkoutUrl: 'https://checkout.stripe.test/existing',
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
