import Stripe from 'stripe'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const mockMutation = vi.fn()
const originalFetch = globalThis.fetch
vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn().mockImplementation(function () { return { mutation: mockMutation } }),
}))

describe('Stripe webhook route', () => {
  beforeEach(() => {
    mockMutation.mockReset()
    process.env.PUBLIC_CONVEX_URL = 'https://convex.example.com'
    process.env.STRIPE_SECRET_KEY = 'sk_test_route'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_route'
    process.env.STRIPE_COMMANDGLOWS_ACCOUNT_ID = 'acct_commandglows123'
    process.env.STRIPE_COMMUNITYGLOWS_ACCOUNT_ID = 'acct_communityglows123'
    process.env.STRIPE_COMMUNITYGLOWS_SECRET_KEY = 'sk_test_community'
    process.env.STRIPE_COMMUNITYGLOWS_WEBHOOK_SECRET = 'whsec_community'
    process.env.SUITE_BRIDGE_CONVEX_SECRET = 'convex-secret'
    globalThis.fetch = vi.fn().mockImplementation(async (_url, options) => {
      const auth = (options?.headers ?? []).find?.(([key]: [string]) => key === 'Authorization')?.[1] ?? ''
      const id = auth.includes('sk_test_community') ? 'acct_communityglows123' : 'acct_commandglows123'
      return new Response(JSON.stringify({ id, object: 'account' }), { status: 200, headers: { 'content-type': 'application/json' } })
    })
  })
  afterEach(() => { globalThis.fetch = originalFetch })

  test.each(['focus', 'power', 'control', 'command'])(
    'forwards signed CommandGlows %s payments to the suite ledger',
    async (plan) => {
      const stripe = new Stripe('sk_test_route')
      const body = JSON.stringify({
        id: `evt_${plan}`, object: 'event', type: 'checkout.session.completed', livemode: false,
        data: { object: {
          id: `cs_${plan}`, object: 'checkout.session', payment_status: 'paid', payment_intent: `pi_${plan}`, customer: `cus_${plan}`,
          metadata: { offer_id: `commandglows_app/${plan}`, product_id: 'commandglows_app', plan, source: 'direct', source_ref: `purchase:${plan}`, global_user_id: `user_${plan}`, business_id: 'commandglows', provider_account_id: 'acct_commandglows123' },
        } },
      })
      const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret: 'whsec_route' })
      mockMutation.mockResolvedValueOnce({ ok: true, status: 'granted', alreadyProcessed: false })
      const { POST } = await import('@/pages/api/commerce/webhooks/stripe')
      const response = await POST({ request: new Request('https://commandglows.test/api/commerce/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': signature }, body }) })

      expect(response.status).toBe(200)
      expect(mockMutation).toHaveBeenCalledWith('bridge:processCommerceEvent', expect.objectContaining({
        provider: 'stripe', offerId: `commandglows_app/${plan}`, productId: 'commandglows_app', plan,
        eventType: 'paid', businessId: 'commandglows', providerAccountId: 'acct_commandglows123', providerOrderId: `cs_${plan}`, providerPaymentIntentId: `pi_${plan}`, bridgeSecret: 'convex-secret',
      }))
    }
  )

  test.each([
    ['communityglows/lifetime_deal', 'communityglows', 'lifetime_deal'],
    ['commandglows_formation/full_course', 'commandglows_formation', 'formation'],
  ])('forwards signed %s payments to the same suite ledger', async (offerId, productId, plan) => {
    const community = productId === 'communityglows'
    const businessId = community ? 'communityglows' : 'commandglows'
    const accountId = community ? 'acct_communityglows123' : 'acct_commandglows123'
    const stripe = new Stripe('sk_test_route')
    const body = JSON.stringify({
      id: `evt_${productId}`, object: 'event', type: 'checkout.session.completed', livemode: false,
      data: { object: {
        id: `cs_${productId}`, object: 'checkout.session', payment_status: 'paid', customer: `cus_${productId}`,
        metadata: { offer_id: offerId, product_id: productId, plan, source: 'direct', source_ref: `purchase:${productId}`, global_user_id: `user_${productId}`, business_id: businessId, provider_account_id: accountId },
      } },
    })
    const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret: community ? 'whsec_community' : 'whsec_route' })
    mockMutation.mockResolvedValueOnce({ ok: true, status: 'granted', alreadyProcessed: false })
    const { POST } = community ? await import('@/pages/api/commerce/webhooks/communityglows') : await import('@/pages/api/commerce/webhooks/stripe')
    const response = await POST({ request: new Request('https://commandglows.test/api/commerce/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': signature }, body }) })

    expect(response.status).toBe(200)
    expect(mockMutation).toHaveBeenCalledWith('bridge:processCommerceEvent', expect.objectContaining({
      provider: 'stripe', offerId, productId, plan, eventType: 'paid', businessId, providerAccountId: accountId,
    }))
  })
})
