import { describe, test, expect, beforeEach, vi } from 'vitest'

const mockMutation = vi.fn()

vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn().mockImplementation(function () {
    return {
      mutation: mockMutation,
    }
  }),
}))

describe('socialglowz bridge commerce forwarding', () => {
  beforeEach(() => {
    mockMutation.mockReset()
  })

  test('forwards normalized commerce operation to convex commerce processor', async () => {
    const { POST } = await import('@/pages/api/bridge/socialglowz')

    process.env.SOCIALGLOWZ_SUITE_BRIDGE_SECRET = 'social-secret'
    process.env.SUITE_BRIDGE_CONVEX_SECRET = 'convex-secret'
    process.env.PUBLIC_CONVEX_URL = 'https://convex.example.com'

    mockMutation.mockResolvedValueOnce({
      ok: true,
      status: 'granted',
      alreadyProcessed: false,
    })

    const request = new Request('https://socialglowz.com/api/bridge/socialglowz', {
      method: 'POST',
      headers: {
        'x-socialglowz-suite-secret': 'social-secret',
      },
      body: JSON.stringify({
        operation: 'commerce',
        provider: 'lemonsqueezy',
        offerId: 'socialglowz/lifetime_deal',
        productId: 'socialglowz',
        plan: 'lifetime_deal',
        eventType: 'paid',
        environment: 'production',
        providerEventId: 'evt_abc',
        providerOrderId: 'ord_456',
        idempotencyKey: 'idem_123',
        status: 'applied',
        customerEmail: 'buyer@example.com',
        providerCustomerId: 'cus_123',
        sourceRef: 'src_ref',
        metadata: { source: 'direct', offer_id: 'socialglowz/lifetime_deal' },
      }),
    })

    const response = await POST({ request })
    expect(response.status).toBe(200)

    const payload = await response.json()
    expect(payload).toEqual({
      status: 'ok',
      result: { ok: true, status: 'granted', alreadyProcessed: false },
    })

    expect(mockMutation).toHaveBeenCalledWith(
      'bridge:processSocialGlowzCommerceEvent',
      expect.objectContaining({
        provider: 'lemonsqueezy',
        offerId: 'socialglowz/lifetime_deal',
        eventType: 'paid',
        environment: 'production',
        providerOrderId: 'ord_456',
      })
    )
  })
})
