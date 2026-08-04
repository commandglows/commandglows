import { describe, test, expect, beforeEach, vi } from 'vitest'

const mockMutation = vi.fn()

vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn().mockImplementation(function () {
    return {
      mutation: mockMutation,
    }
  }),
}))

function toHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

async function signWebhook(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)))
}

describe('lemon squeezy webhook route', () => {
  beforeEach(() => {
    mockMutation.mockReset()
    process.env.PUBLIC_CONVEX_URL = 'https://convex.example.com'
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'webhook-secret'
    process.env.SUITE_BRIDGE_CONVEX_SECRET = 'convex-secret'
  })

  test.each([
    ['focus', 'commandglows_app/focus'],
    ['power', 'commandglows_app/power'],
    ['control', 'commandglows_app/control'],
    ['command', 'commandglows_app/command'],
  ])(
    'forwards signed CommandGlows %s events to the generic suite commerce processor',
    async (plan, offerId) => {
      const { POST } = await import('@/pages/api/commerce/webhooks/lemon-squeezy')
      mockMutation.mockResolvedValueOnce({
        ok: true,
        status: 'pending_review',
        alreadyProcessed: false,
      })

      const body = JSON.stringify({
        data: {
          id: `ord_wfz_${plan}`,
          attributes: {
            customer_id: 'cus_wfz',
            user_email: 'buyer@example.com',
            first_order_item: { test_mode: true },
          },
        },
        event_id: `evt_wfz_${plan}`,
        event_name: 'order_created',
        meta: {
          custom_data: {
            offer_id: offerId,
            product_id: 'commandglows_app',
            plan,
            source: 'direct',
            source_ref: '/commandglows-founder',
          },
        },
      })
      const signature = await signWebhook(body, 'webhook-secret')

      const response = await POST({
        request: new Request('https://commandglows.test/api/commerce/webhooks/lemon-squeezy', {
          method: 'POST',
          headers: {
            'x-signature': signature,
            'x-event-name': 'order_created',
            'x-event-id': `evt_wfz_${plan}`,
          },
          body,
        }),
      })

      expect(response.status).toBe(200)
      expect(mockMutation).toHaveBeenCalledWith(
        'bridge:processCommerceEvent',
        expect.objectContaining({
          provider: 'lemonsqueezy',
          offerId,
          productId: 'commandglows_app',
          plan,
          eventType: 'paid',
          providerOrderId: `ord_wfz_${plan}`,
          bridgeSecret: 'convex-secret',
        })
      )
    }
  )
})
