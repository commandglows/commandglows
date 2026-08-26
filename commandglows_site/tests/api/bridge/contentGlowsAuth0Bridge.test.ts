import { beforeEach, describe, expect, test, vi } from 'vitest'

const mockMutation = vi.fn()
const mockVerifyAuth0AccessToken = vi.fn()

vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn().mockImplementation(function () {
    return { mutation: mockMutation }
  }),
}))
vi.mock('@/lib/auth0AccessToken', () => ({
  verifyAuth0AccessToken: mockVerifyAuth0AccessToken,
}))

const configuredEnvironment = {
  CONTENTGLOWS_AUTH0_ENTITLEMENT_BRIDGE_SECRET: 'endpoint-secret',
  CONTENTGLOWS_AUTH0_DOMAIN: 'tenant.example',
  CONTENTGLOWS_AUTH0_AUDIENCE: 'https://api.contentglows.test',
  SUITE_BRIDGE_CONVEX_SECRET: 'convex-secret',
  PUBLIC_CONVEX_URL: 'https://convex.example.com',
  SUITE_BRIDGE_ENVIRONMENT: 'development',
}

describe('ContentGlows Auth0 bridge route', () => {
  beforeEach(() => {
    mockMutation.mockReset()
    mockVerifyAuth0AccessToken.mockReset()
    for (const key of Object.keys(configuredEnvironment))
      delete process.env[key]
  })

  test('returns 503 when bridge configuration is incomplete', async () => {
    const { POST } = await import('@/pages/api/bridge/contentglows')
    const response = await POST({
      request: new Request(
        'https://commandglows.test/api/bridge/contentglows',
        {
          method: 'POST',
        }
      ),
    })
    expect(response.status).toBe(503)
    expect(mockMutation).not.toHaveBeenCalled()
  })

  test.each([
    ['invalid secret', { authorization: 'Bearer token' }],
    ['missing bearer', { 'x-contentglows-bridge-secret': 'endpoint-secret' }],
  ])('returns 401 for %s', async (_label, headers) => {
    Object.assign(process.env, configuredEnvironment)
    const { POST } = await import('@/pages/api/bridge/contentglows')
    const response = await POST({
      request: new Request(
        'https://commandglows.test/api/bridge/contentglows',
        {
          method: 'POST',
          headers,
        }
      ),
    })
    expect(response.status).toBe(401)
    expect(mockMutation).not.toHaveBeenCalled()
  })

  test('forwards verified identity using the configured bridge environment', async () => {
    Object.assign(process.env, configuredEnvironment)
    mockVerifyAuth0AccessToken.mockResolvedValueOnce({
      sub: 'auth0|valid-subject',
      email: 'verified@example.test',
    })
    mockMutation.mockResolvedValueOnce({
      status: 'ok',
      entitlement: { productId: 'contentglowz', hasAccess: true },
    })
    const { POST } = await import('@/pages/api/bridge/contentglows')
    const response = await POST({
      request: new Request(
        'https://commandglows.test/api/bridge/contentglows',
        {
          method: 'POST',
          headers: {
            authorization: 'Bearer valid-token',
            'x-contentglows-bridge-secret': 'endpoint-secret',
          },
        }
      ),
    })

    expect(response.status).toBe(200)
    expect(mockVerifyAuth0AccessToken).toHaveBeenCalledWith('valid-token', {
      domainOrIssuer: 'tenant.example',
      audience: 'https://api.contentglows.test',
    })
    expect(mockMutation).toHaveBeenCalledWith(
      'bridge:upsertContentGlowsAuth0Identity',
      expect.objectContaining({
        auth0Subject: 'auth0|valid-subject',
        auth0Email: 'verified@example.test',
        environment: 'development',
        bridgeSecret: 'convex-secret',
      })
    )
  })
})
