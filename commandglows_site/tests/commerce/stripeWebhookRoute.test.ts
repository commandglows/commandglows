import Stripe from 'stripe'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const mockMutation = vi.fn()
vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn().mockImplementation(function () { return { mutation: mockMutation } }),
}))

describe('Stripe webhook route', () => {
  beforeEach(() => {
    mockMutation.mockReset()
    process.env.PUBLIC_CONVEX_URL = 'https://convex.example.com'
    process.env.STRIPE_SECRET_KEY = 'sk_test_route'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_route'
    process.env.SUITE_BRIDGE_CONVEX_SECRET = 'convex-secret'
  })

  test.each(['focus', 'power', 'control', 'command'])(
    'forwards signed CommandGlows %s payments to the suite ledger',
    async (plan) => {
      const stripe = new Stripe('sk_test_route')
      const body = JSON.stringify({
        id: `evt_${plan}`, object: 'event', type: 'checkout.session.completed', livemode: false,
        data: { object: {
          id: `cs_${plan}`, object: 'checkout.session', payment_status: 'paid', customer: `cus_${plan}`,
          metadata: { offer_id: `commandglows_app/${plan}`, product_id: 'commandglows_app', plan, source: 'direct', source_ref: `purchase:${plan}`, global_user_id: `user_${plan}` },
        } },
      })
      const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret: 'whsec_route' })
      mockMutation.mockResolvedValueOnce({ ok: true, status: 'granted', alreadyProcessed: false })
      const { POST } = await import('@/pages/api/commerce/webhooks/stripe')
      const response = await POST({ request: new Request('https://commandglows.test/api/commerce/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': signature }, body }) })

      expect(response.status).toBe(200)
      expect(mockMutation).toHaveBeenCalledWith('bridge:processCommerceEvent', expect.objectContaining({
        provider: 'stripe', offerId: `commandglows_app/${plan}`, productId: 'commandglows_app', plan,
        eventType: 'paid', providerOrderId: `cs_${plan}`, bridgeSecret: 'convex-secret',
      }))
    }
  )

  test.each([
    ['communityglows/lifetime_deal', 'communityglows', 'lifetime_deal'],
    ['commandglows_formation/full_course', 'commandglows_formation', 'formation'],
  ])('forwards signed %s payments to the same suite ledger', async (offerId, productId, plan) => {
    const stripe = new Stripe('sk_test_route')
    const body = JSON.stringify({
      id: `evt_${productId}`, object: 'event', type: 'checkout.session.completed', livemode: false,
      data: { object: {
        id: `cs_${productId}`, object: 'checkout.session', payment_status: 'paid', customer: `cus_${productId}`,
        metadata: { offer_id: offerId, product_id: productId, plan, source: 'direct', source_ref: `purchase:${productId}`, global_user_id: `user_${productId}` },
      } },
    })
    const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret: 'whsec_route' })
    mockMutation.mockResolvedValueOnce({ ok: true, status: 'granted', alreadyProcessed: false })
    const { POST } = await import('@/pages/api/commerce/webhooks/stripe')
    const response = await POST({ request: new Request('https://commandglows.test/api/commerce/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': signature }, body }) })

    expect(response.status).toBe(200)
    expect(mockMutation).toHaveBeenCalledWith('bridge:processCommerceEvent', expect.objectContaining({
      provider: 'stripe', offerId, productId, plan, eventType: 'paid',
    }))
  })
})
