import { describe, test, expect, afterEach, vi } from 'vitest'
import { GET } from '@/pages/api/commerce/checkout'
import { createCommerceCheckoutIdentityToken } from '@/lib/commerce/checkoutIdentity'

const ORIGINAL_FETCH = globalThis.fetch
const ORIGINAL_ENV = { ...process.env }

function resetCommerceEnv() {
  delete process.env.LEMONSQUEEZY_API_KEY
  delete process.env.LEMONSQUEEZY_STORE_ID
  delete process.env.LEMONSQUEEZY_COMMUNITYGLOWS_LIFETIME_DEAL_VARIANT_ID
  delete process.env.LEMONSQUEEZY_COMMANDGLOWS_APP_POWER_VARIANT_ID
  delete process.env.LEMONSQUEEZY_API_URL
  delete process.env.STRIPE_SECRET_KEY
  delete process.env.STRIPE_COMMANDGLOWS_APP_POWER_PRICE_ID
  delete process.env.STRIPE_COMMANDGLOWS_FOUNDER_PROMOTION_CODE_ID
  delete process.env.SUITE_COMMERCE_CHECKOUT_SECRET
  delete process.env.POLAR_COMMANDGLOWS_PRODUCT_ID
  delete process.env.POLAR_PRODUCT_ID
  delete process.env.COMMERCE_PROVIDER_ORDER
}

function checkoutRequest(url: string) {
  return new Request(url)
}

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH
  process.env = { ...ORIGINAL_ENV }
  resetCommerceEnv()
})

describe('commerce checkout route', () => {
  test('rejects missing offerId instead of falling back to CommunityGlows', async () => {
    resetCommerceEnv()

    const response = await GET({
      request: checkoutRequest('https://commandglows.test/api/commerce/checkout'),
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      message: 'Missing offerId',
    })
  })

  test('returns unavailable when no checkout provider is configured', async () => {
    resetCommerceEnv()

    const response = await GET({
      request: checkoutRequest(
        'https://commandglows.test/api/commerce/checkout?offerId=communityglows/lifetime_deal&successUrl=https://communityglows.test/purchase/success&cancelUrl=https://communityglows.test/purchase/cancel'
      ),
    })

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      message: 'No configured checkout provider',
    })
  })

  test('rejects unknown offers before contacting a provider', async () => {
    resetCommerceEnv()
    const fetchSpy = vi.fn()
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    const response = await GET({
      request: checkoutRequest(
        'https://commandglows.test/api/commerce/checkout?offerId=unknown/offer'
      ),
    })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      message: 'Offer not found',
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  test('redirects to the hosted Lemon Squeezy checkout URL', async () => {
    resetCommerceEnv()
    process.env.LEMONSQUEEZY_API_KEY = 'api-key'
    process.env.LEMONSQUEEZY_STORE_ID = 'store-id'
    process.env.LEMONSQUEEZY_COMMUNITYGLOWS_LIFETIME_DEAL_VARIANT_ID = 'variant-id'

    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: 'co_route_123',
            attributes: { url: 'https://checkout.lemonsqueezy.test/route' },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    const response = await GET({
      request: checkoutRequest(
        'https://commandglows.test/api/commerce/checkout?offerId=communityglows/lifetime_deal&source=direct&successUrl=https://communityglows.test/purchase/success&cancelUrl=https://communityglows.test/purchase/cancel'
      ),
    })

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(
      'https://checkout.lemonsqueezy.test/route'
    )

    const body = String(fetchSpy.mock.calls[0]?.[1]?.body)
    expect(body).toContain(
      '"product_options":{"redirect_url":"https://communityglows.test/purchase/success"}'
    )
    expect(body).toContain('"offer_id":"communityglows/lifetime_deal"')
    expect(body).not.toContain('api-key')
  })

  test('redirects CommandGlows founder checkout to Stripe Managed Payments', async () => {
    resetCommerceEnv()
    process.env.STRIPE_SECRET_KEY = 'sk_test_route'
    process.env.STRIPE_COMMANDGLOWS_APP_POWER_PRICE_ID = 'price_commandglows_power'
    process.env.STRIPE_COMMANDGLOWS_FOUNDER_PROMOTION_CODE_ID = 'promo_founder'
    process.env.SUITE_COMMERCE_CHECKOUT_SECRET = 'checkout-identity-secret'
    const identityToken = createCommerceCheckoutIdentityToken(
      'gu_checkout_user',
      'checkout-identity-secret'
    )

    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ id: 'cs_test_commandglows', url: 'https://checkout.stripe.test/commandglows' }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    const response = await GET({
      request: checkoutRequest(
        `https://commandglows.test/api/commerce/checkout?offerId=commandglows_app/power&provider=stripe&source=direct&sourceRef=/commandglows-founder&discountCode=FOUNDER&identityToken=${encodeURIComponent(identityToken)}&successUrl=https://commandglows.test/purchase/success?offerId=commandglows_app%2Fpower&cancelUrl=https://commandglows.test/purchase/cancel?offerId=commandglows_app%2Fpower`
      ),
    })

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(
      'https://checkout.stripe.test/commandglows'
    )

    const body = String(fetchSpy.mock.calls[0]?.[1]?.body)
    expect(body).toContain('managed_payments[enabled]=true')
    expect(body).toContain('line_items[0][price]=price_commandglows_power')
    expect(body).toContain('metadata[offer_id]=commandglows_app%2Fpower')
    expect(body).toContain('metadata[provider]=stripe')
    expect(body).toContain('metadata[global_user_id]=gu_checkout_user')
    expect(body).not.toContain(identityToken)
    expect(body).toContain('payment_intent_data[metadata][plan]=power')
    expect(body).toContain('discounts[0][promotion_code]=promo_founder')
    expect(new Headers(fetchSpy.mock.calls[0]?.[1]?.headers).get('authorization')).toBe('Bearer sk_test_route')
  })

  test('rejects a CommandGlows checkout without a signed app identity handoff', async () => {
    resetCommerceEnv()
    process.env.STRIPE_SECRET_KEY = 'sk_test_route'
    process.env.STRIPE_COMMANDGLOWS_APP_POWER_PRICE_ID = 'price_commandglows_power'
    process.env.SUITE_COMMERCE_CHECKOUT_SECRET = 'checkout-identity-secret'
    const response = await GET({
      request: checkoutRequest('https://commandglows.test/api/commerce/checkout?offerId=commandglows_app/power&provider=stripe'),
    })
    expect(response.status).toBe(401)
  })
})
