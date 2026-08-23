import { describe, test, expect, beforeEach, vi } from 'vitest'

const mockMutation = vi.fn()

vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn().mockImplementation(function () {
    return {
      mutation: mockMutation,
    }
  }),
}))

describe('communityglows suite bridge', () => {
  beforeEach(() => {
    mockMutation.mockReset()
    delete process.env.SUITE_COMMERCE_CHECKOUT_SECRET
    process.env.SUITE_TRIAL_SIGNAL_SECRET = 'trial-signal-secret'
    process.env.COMMUNITYGLOWS_ACCOUNT_RETENTION_SECRET = 'retention-secret'
  })

  test('pseudonymizes account deletion identity before forwarding it', async () => {
    const { POST } = await import('@/pages/api/bridge/communityglows')
    process.env.COMMUNITYGLOWS_SUITE_BRIDGE_SECRET = 'community-secret'
    process.env.SUITE_BRIDGE_CONVEX_SECRET = 'convex-secret'
    process.env.PUBLIC_CONVEX_URL = 'https://convex.example.com'
    mockMutation.mockResolvedValueOnce({ status: 'prepared', retained: true })

    const response = await POST({ request: new Request(
      'https://commandglows.com/api/bridge/communityglows',
      {
        method: 'POST',
        headers: { 'x-communityglows-suite-secret': 'community-secret' },
        body: JSON.stringify({
          operation: 'prepare_account_deletion',
          providerAccountId: 'old-provider-id',
          email: 'Buyer@Example.com',
        }),
      }
    ) })

    expect(response.status).toBe(200)
    expect(mockMutation).toHaveBeenCalledWith(
      'bridge:prepareCommunityGlowsAccountDeletion',
      expect.objectContaining({
        providerAccountId: 'old-provider-id',
        email: 'Buyer@Example.com',
        emailDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
        providerAccountDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
      })
    )
    const forwarded = mockMutation.mock.calls[0]?.[1]
    expect(forwarded.emailDigest).not.toContain('buyer@example.com')
    expect(forwarded.providerAccountDigest).not.toContain('old-provider-id')
  })

  test('fails account deletion closed without the retention key', async () => {
    const { POST } = await import('@/pages/api/bridge/communityglows')
    process.env.COMMUNITYGLOWS_SUITE_BRIDGE_SECRET = 'community-secret'
    process.env.SUITE_BRIDGE_CONVEX_SECRET = 'convex-secret'
    process.env.PUBLIC_CONVEX_URL = 'https://convex.example.com'
    delete process.env.COMMUNITYGLOWS_ACCOUNT_RETENTION_SECRET

    const response = await POST({ request: new Request(
      'https://commandglows.com/api/bridge/communityglows',
      {
        method: 'POST',
        headers: { 'x-communityglows-suite-secret': 'community-secret' },
        body: JSON.stringify({
          operation: 'prepare_account_deletion',
          providerAccountId: 'old-provider-id',
          email: 'buyer@example.com',
        }),
      }
    ) })

    expect(response.status).toBe(503)
    expect(mockMutation).not.toHaveBeenCalled()
  })

  test('rejects retired product-local commerce forwarding', async () => {
    const { POST } = await import('@/pages/api/bridge/communityglows')

    process.env.COMMUNITYGLOWS_SUITE_BRIDGE_SECRET = 'social-secret'
    process.env.SUITE_BRIDGE_CONVEX_SECRET = 'convex-secret'
    process.env.SUITE_COMMERCE_CHECKOUT_SECRET = 'checkout-secret'
    process.env.PUBLIC_CONVEX_URL = 'https://convex.example.com'

    const request = new Request('https://communityglows.com/api/bridge/communityglows', {
      method: 'POST',
      headers: {
        'x-communityglows-suite-secret': 'social-secret',
      },
      body: JSON.stringify({
        operation: 'commerce',
        provider: 'stripe',
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
    expect(response.status).toBe(400)
    expect(mockMutation).not.toHaveBeenCalled()
  })

  test('accepts the CommunityGlows secret header for snapshot requests', async () => {
    const { POST } = await import('@/pages/api/bridge/communityglows')

    process.env.COMMUNITYGLOWS_SUITE_BRIDGE_SECRET = 'community-secret'
    process.env.SUITE_BRIDGE_CONVEX_SECRET = 'convex-secret'
    process.env.SUITE_COMMERCE_CHECKOUT_SECRET = 'checkout-secret'
    process.env.PUBLIC_CONVEX_URL = 'https://convex.example.com'

    mockMutation.mockResolvedValueOnce({
      hasAccess: true,
      accessState: 'trial_active',
      planId: 'trial',
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
        installationHash: 'client_hash_snapshot',
      }),
    })

    const response = await POST({ request })
    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.checkoutIdentityToken).toEqual(expect.any(String))
    expect(mockMutation).toHaveBeenCalledWith(
      'bridge:ensureCommunityGlowsEntitlementSnapshotByProviderAccount',
      expect.objectContaining({ providerAccountId: 'community_user_123' })
    )
  })

  test('forwards authenticated CommunityGlows trial restarts with anti-abuse signals', async () => {
    const { POST } = await import('@/pages/api/bridge/communityglows')

    process.env.COMMUNITYGLOWS_SUITE_BRIDGE_SECRET = 'community-secret'
    process.env.SUITE_BRIDGE_CONVEX_SECRET = 'convex-secret'
    process.env.PUBLIC_CONVEX_URL = 'https://convex.example.com'
    mockMutation.mockResolvedValueOnce({
      hasAccess: true,
      accessState: 'trial_active',
      trialAttempt: 2,
      trialRestartsRemaining: 1,
    })

    const request = new Request('https://communityglows.com/api/bridge/communityglows', {
      method: 'POST',
      headers: {
        'x-communityglows-suite-secret': 'community-secret',
      },
      body: JSON.stringify({
        operation: 'restart_trial',
        providerAccountId: 'community_user_123',
        installationHash: 'installation_hash',
        networkHash: 'network_hash',
      }),
    })

    const response = await POST({ request })
    expect(response.status).toBe(200)
    expect(mockMutation).toHaveBeenCalledWith(
      'bridge:ensureCommunityGlowsEntitlementSnapshotByProviderAccount',
      expect.objectContaining({
        providerAccountId: 'community_user_123',
        installationHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        networkHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        trialAction: 'restart',
      })
    )
    const forwarded = mockMutation.mock.calls[0]?.[1]
    expect(forwarded.installationHash).not.toBe('installation_hash')
    expect(forwarded.networkHash).not.toBe('network_hash')
  })

  test('fails closed when server-side signal pseudonymization is unavailable', async () => {
    const { POST } = await import('@/pages/api/bridge/communityglows')
    process.env.COMMUNITYGLOWS_SUITE_BRIDGE_SECRET = 'community-secret'
    process.env.SUITE_BRIDGE_CONVEX_SECRET = 'convex-secret'
    process.env.PUBLIC_CONVEX_URL = 'https://convex.example.com'
    delete process.env.SUITE_TRIAL_SIGNAL_SECRET

    const response = await POST({ request: new Request(
      'https://communityglows.com/api/bridge/communityglows',
      {
        method: 'POST',
        headers: { 'x-communityglows-suite-secret': 'community-secret' },
        body: JSON.stringify({
          operation: 'snapshot',
          providerAccountId: 'community_user_123',
          installationHash: 'client_hash',
        }),
      }
    ) })
    expect(response.status).toBe(503)
    expect(mockMutation).not.toHaveBeenCalled()
  })
})
