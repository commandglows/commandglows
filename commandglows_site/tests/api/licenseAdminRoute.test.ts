import { beforeEach, describe, expect, test, vi } from 'vitest'

const mockQuery = vi.fn()
const mockMutation = vi.fn()

vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn().mockImplementation(function () {
    return { query: mockQuery, mutation: mockMutation }
  }),
}))

const locals = (userId: string | null) => ({
  auth: () => ({ userId }),
})

describe('licence administration API', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    mockMutation.mockReset()
    process.env.PUBLIC_CONVEX_URL = 'https://convex.example.com'
    process.env.SUITE_BRIDGE_CONVEX_SECRET = 'bridge-secret'
    process.env.SUITE_BRIDGE_ENVIRONMENT = 'development'
  })

  test('denies signed-out callers before Convex', async () => {
    const { GET } = await import('@/pages/api/admin/licenses')
    const response = await GET({
      request: new Request('https://commandglows.com/api/admin/licenses?query=a@example.com'),
      locals: locals(null),
    } as never)
    expect(response.status).toBe(401)
    expect(mockQuery).not.toHaveBeenCalled()
  })

  test('forwards the trusted Clerk identity and server secret for search', async () => {
    const { GET } = await import('@/pages/api/admin/licenses')
    mockQuery.mockResolvedValueOnce({ results: [] })
    const response = await GET({
      request: new Request('https://commandglows.com/api/admin/licenses?query=a@example.com'),
      locals: locals('clerk_admin'),
    } as never)
    expect(response.status).toBe(200)
    expect(mockQuery).toHaveBeenCalledWith(
      'licenseAdministration:searchLicenses',
      expect.objectContaining({
        clerkId: 'clerk_admin',
        bridgeSecret: 'bridge-secret',
        search: 'a@example.com',
      }),
    )
  })

  test('maps canonical admin denial to 403 without leaking detail', async () => {
    const { GET } = await import('@/pages/api/admin/licenses')
    mockQuery.mockRejectedValueOnce(new Error('admin_forbidden'))
    const response = await GET({
      request: new Request('https://commandglows.com/api/admin/licenses?query=a@example.com'),
      locals: locals('clerk_member'),
    } as never)
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      status: 'forbidden',
      error: 'admin_required',
    })
  })

  test('requires a support reason before mutations', async () => {
    const { POST } = await import('@/pages/api/admin/licenses')
    const response = await POST({
      request: new Request('https://commandglows.com/api/admin/licenses', {
        method: 'POST',
        body: JSON.stringify({
          action: 'revoke',
          globalUserId: 'gu_customer',
          productId: 'communityglows',
          plan: 'lifetime_deal',
          reason: '',
        }),
      }),
      locals: locals('clerk_admin'),
    } as never)
    expect(response.status).toBe(400)
    expect(mockMutation).not.toHaveBeenCalled()
  })
})
