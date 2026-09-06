import { beforeEach, describe, expect, test, vi } from 'vitest'

const mockQuery = vi.fn()
const mockCheckout = vi.fn()
vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn().mockImplementation(function () {
    return { query: mockQuery }
  }),
}))
vi.mock('@/pages/api/commerce/checkout', () => ({
  createCommerceCheckout: mockCheckout,
}))

describe('authenticated checkout start route', () => {
  test.each([
    ['missing account', 409],
    ['backend failure', 503],
  ])('does not start checkout on %s', async (scenario, status) => {
    if (scenario === 'backend failure') mockQuery.mockRejectedValueOnce(new Error('private backend error'))
    else mockQuery.mockResolvedValueOnce(null)
    const { POST } = await import('@/pages/api/checkout/start')
    const response = await POST({
      request: new Request('https://commandglows.test/api/checkout/start?offerId=commandglows_formation/full_course', { method: 'POST' }),
      locals: { auth: () => ({ userId: 'verified-buyer' }) },
      redirect: vi.fn(),
    })
    expect(response.status).toBe(status)
    expect(mockCheckout).not.toHaveBeenCalled()
    expect(await response.text()).not.toContain('private backend error')
    if (status === 503) expect(response.headers.get('Retry-After')).toBe('30')
  })

  beforeEach(() => {
    mockQuery.mockReset()
    mockCheckout.mockReset()
    process.env.PUBLIC_CONVEX_URL = 'https://convex.example.com'
    process.env.SUITE_BRIDGE_CONVEX_SECRET = 'bridge-secret'
    process.env.SUITE_COMMERCE_CHECKOUT_SECRET = 'checkout-secret'
  })

  test('rejects GET so checkout creation requires POST', async () => {
    const { GET } = await import('@/pages/api/checkout/start')
    expect((await GET({})).status).toBe(405)
  })

  test('redirects anonymous Formation buyers to sign-in without a token URL', async () => {
    const { POST } = await import('@/pages/api/checkout/start')
    const redirect = vi.fn((location: string) => new Response(null, {
      status: 302, headers: { location },
    }))
    const response = await POST({
      request: new Request('https://commandglows.test/api/checkout/start?offerId=commandglows_formation/full_course&lesson=fr/formations/module-2-windows/&lang=fr', { method: 'POST' }),
      locals: { auth: () => ({ userId: null }) },
      redirect,
    })
    expect(response.headers.get('location')).toContain('/fr/signin?next=')
    expect(response.headers.get('location')).not.toContain('identityToken')
  })

  test('keeps the handoff server-side and redirects directly to Stripe', async () => {
    mockQuery.mockResolvedValueOnce({ globalUserId: 'gu_formation' })
    mockCheckout.mockResolvedValueOnce({
      ok: true,
      provider: 'stripe',
      checkoutUrl: 'https://checkout.stripe.test/formation',
    })
    const { POST } = await import('@/pages/api/checkout/start')
    const redirect = vi.fn((location: string) => new Response(null, {
      status: 302, headers: { location },
    }))
    const response = await POST({
      request: new Request('https://commandglows.test/api/checkout/start?offerId=commandglows_formation/full_course&lesson=fr/formations/module-2-windows/&lang=fr', { method: 'POST' }),
      locals: { auth: () => ({ userId: 'clerk_formation' }) },
      redirect,
    })
    expect(response.headers.get('location')).toBe('https://checkout.stripe.test/formation')
    const checkoutArgs = mockCheckout.mock.calls[0]?.[0]
    expect(checkoutArgs.identityToken).toEqual(expect.any(String))
    expect(response.headers.get('location')).not.toContain(checkoutArgs.identityToken)
  })
})
