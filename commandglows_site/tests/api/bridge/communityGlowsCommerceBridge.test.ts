import { describe, test, expect, beforeEach, vi } from 'vitest'

const mockMutation = vi.fn()

vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn().mockImplementation(function () {
    return {
      mutation: mockMutation,
    }
  }),
}))

describe('communityglows bridge commerce forwarding', () => {
  beforeEach(() => {
    mockMutation.mockReset()
  })

  test('forwards normalized commerce operation to convex commerce processor', async () => {
    const { POST } = await import('@/pages/api/bridge/communityglows')

    process.env.COMMUNITYGLOWS_SUITE_BRIDGE_SECRET = 'social-secret'
    process.env.SUITE_BRIDGE_CONVEX_SECRET = 'convex-secret'
    process.env.PUBLIC_CONVEX_URL = 'https://convex.example.com'

    mockMutation.mockResolvedValueOnce({
      ok: true,
      status: 'granted',
      alreadyProcessed: false,
    })

    const request = new Request('https://communityglows.com/api/bridge/communityglows', {
      method: 'POST',
      headers: {
        'x-communityglows-suite-secret': 'social-secret',
      },
      body: JSON.stringify({
        operation: 'commerce',
        provider: 'lemonsqueezy',
        offerId: 'communityglows/lifetime_deal',
        productId: 'communityglows',
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
        metadata: { source: 'direct', offer_id: 'communityglows/lifetime_deal' },
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
      'bridge:processCommunityGlowsCommerceEvent',
      expect.objectContaining({
        provider: 'lemonsqueezy',
        offerId: 'communityglows/lifetime_deal',
        eventType: 'paid',
        environment: 'production',
        providerOrderId: 'ord_456',
      })
    )
  })

  test('accepts the CommunityGlows secret header for snapshot requests', async () => {
    const { POST } = await import('@/pages/api/bridge/communityglows')

    process.env.COMMUNITYGLOWS_SUITE_BRIDGE_SECRET = 'community-secret'
    process.env.SUITE_BRIDGE_CONVEX_SECRET = 'convex-secret'
    process.env.PUBLIC_CONVEX_URL = 'https://convex.example.com'

    mockMutation.mockResolvedValueOnce({
      hasAccess: true,
      accessState: 'trial_active',
      planId: 'free',
      source: 'product_trial',
      globalUserId: 'gu_community',
      trialStartedAt: 1000,
      trialEndsAt: 2000,
      trialExpiresAt: 2000,
      reasonCode: 'active_entitlement',
    })

    const request = new Request('https://communityglows.com/api/bridge/communityglows', {
      method: 'POST',
      headers: {
        'x-communityglows-suite-secret': 'community-secret',
      },
      body: JSON.stringify({
        operation: 'snapshot',
        providerAccountId: 'community_user_123',
      }),
    })

    const response = await POST({ request })
    expect(response.status).toBe(200)
    expect(mockMutation).toHaveBeenCalledWith(
      'bridge:ensureCommunityGlowsEntitlementSnapshotByProviderAccount',
      expect.objectContaining({ providerAccountId: 'community_user_123' })
    )
  })
})
