import { createHmac } from 'node:crypto'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const mockMutation = vi.fn()
vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn().mockImplementation(function () { return { mutation: mockMutation } }),
}))

describe('AppSumo commerce routes', () => {
  beforeEach(() => {
    mockMutation.mockReset()
    vi.restoreAllMocks()
    process.env.PUBLIC_CONVEX_URL = 'https://convex.example.com'
    process.env.SUITE_BRIDGE_CONVEX_SECRET = 'convex-secret'
    process.env.APPSUMO_API_KEY = 'appsumo-api-key'
    process.env.APPSUMO_CLIENT_ID = 'appsumo-client'
    process.env.APPSUMO_CLIENT_SECRET = 'appsumo-secret'
    process.env.APPSUMO_PRODUCT_ID = 'commandglows_formation'
    process.env.APPSUMO_PLAN = 'pending_review'
    process.env.APPSUMO_OFFER_ID = 'commandglows_formation/appsumo_pending_review'
  })

  test('accepts AppSumo webhook validation requests without touching Convex', async () => {
    const body = JSON.stringify({
      test: true,
      event: 'purchase',
      license_key: '00000000-aaaa-1111-bbbb-abcdef012345',
    })
    const { POST } = await import('@/pages/api/commerce/webhooks/appsumo')
    const response = await POST({
      request: new Request('https://commandglows.test/api/commerce/webhooks/appsumo', { method: 'POST', body }),
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true, event: 'purchase' })
    expect(mockMutation).not.toHaveBeenCalled()
  })

  test('forwards signed AppSumo license events to the suite ledger as pending review provider work', async () => {
    const body = JSON.stringify({
      license_key: 'lic_appsumo_1',
      event: 'purchase',
      license_status: 'inactive',
      event_timestamp: 1650488393814,
      tier: 2,
    })
    const timestamp = '1650488393814'
    const signature = createHmac('sha256', 'appsumo-api-key').update(`${timestamp}${body}`).digest('hex')
    mockMutation.mockResolvedValueOnce({ ok: false, status: 'pending_review', reason: 'provider_not_allowed' })
    const { POST } = await import('@/pages/api/commerce/webhooks/appsumo')
    const response = await POST({
      request: new Request('https://commandglows.test/api/commerce/webhooks/appsumo', {
        method: 'POST',
        headers: {
          'x-appsumo-signature': signature,
          'x-appsumo-timestamp': timestamp,
        },
        body,
      }),
    })

    expect(response.status).toBe(200)
    expect(mockMutation).toHaveBeenCalledWith('bridge:processCommerceEvent', expect.objectContaining({
      provider: 'appsumo',
      offerId: 'commandglows_formation/appsumo_pending_review',
      productId: 'commandglows_formation',
      plan: 'pending_review',
      eventType: 'pending_review',
      status: 'pending_review',
      providerCustomerId: 'lic_appsumo_1',
      bridgeSecret: 'convex-secret',
    }))
  })

  test('keeps the OAuth validation callback publicly reachable', async () => {
    const { GET } = await import('@/pages/api/commerce/oauth/appsumo')
    const response = await GET({
      request: new Request('https://commandglows.test/api/commerce/oauth/appsumo'),
      redirect: vi.fn(),
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: 'AppSumo OAuth callback is reachable',
    })
    expect(mockMutation).not.toHaveBeenCalled()
  })

  test('exchanges OAuth codes, fetches the license key, and records a pending AppSumo transition', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'access-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ license_key: 'lic_oauth_1', status: 'active', tier: 1 }), { status: 200 }))
    mockMutation.mockResolvedValueOnce({ ok: false, status: 'pending_review', reason: 'provider_not_allowed' })
    const redirect = vi.fn((path: string, status: number) => new Response(null, {
      status,
      headers: { Location: path },
    }))
    const { GET } = await import('@/pages/api/commerce/oauth/appsumo')
    const response = await GET({
      request: new Request('https://commandglows.test/api/commerce/oauth/appsumo?code=oauth_code_1'),
      redirect,
    })

    expect(fetchMock).toHaveBeenCalledWith('https://appsumo.com/openid/token/', expect.objectContaining({
      method: 'POST',
    }))
    expect(fetchMock).toHaveBeenCalledWith('https://appsumo.com/openid/license_key/?access_token=access-token')
    expect(mockMutation).toHaveBeenCalledWith('bridge:processCommerceEvent', expect.objectContaining({
      provider: 'appsumo',
      eventType: 'pending_review',
      status: 'pending_review',
      providerCustomerId: 'lic_oauth_1',
    }))
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe('/purchase/success?provider=appsumo')
  })
})
