import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const mockMutation = vi.fn()
const mockVerifyIdToken = vi.fn()
const mockGetUser = vi.fn()
const mockInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined)
const mockError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn().mockImplementation(function () {
    return { mutation: mockMutation }
  }),
}))

vi.mock('@/lib/firebaseAdmin', () => ({
  getFirebaseAdminState: vi.fn(() => ({
    projectId: 'commandglows-test',
    auth: { verifyIdToken: mockVerifyIdToken, getUser: mockGetUser },
    firestore: {
      collection: () => ({ doc: () => ({ set: vi.fn() }) }),
    },
    serverTimestamp: () => 'server-timestamp',
  })),
}))

function makeRequest(
  options: {
    trialAction?: 'start' | 'restart'
    requestId?: string
  } = {}
) {
  return new Request('https://commandglows.com/api/bridge/firebase', {
    method: 'POST',
    headers: {
      authorization: 'Bearer sensitive-token',
      'x-commandglows-installation-id': 'sensitive-installation',
      ...(options.requestId
        ? { 'x-commandglows-request-id': options.requestId }
        : {}),
    },
    body: JSON.stringify({
      ...(options.trialAction ? { trialAction: options.trialAction } : {}),
    }),
  })
}

async function callBridge(request: Request) {
  const { POST } = await import('@/pages/api/bridge/firebase')
  return POST({ request })
}

describe('Firebase bridge trial outcome contract', () => {
  beforeEach(() => {
    vi.resetModules()
    mockMutation.mockReset()
    mockVerifyIdToken.mockReset().mockResolvedValue({
      uid: 'sensitive-uid',
      email: 'sensitive@example.test',
      aud: 'commandglows-test',
      iss: 'https://securetoken.google.com/commandglows-test',
      sub: 'sensitive-uid',
    })
    mockGetUser.mockReset().mockResolvedValue({ emailVerified: true })
    mockInfo.mockClear()
    mockError.mockClear()
    process.env.SUITE_BRIDGE_CONVEX_SECRET = 'test-bridge-secret'
    process.env.SUITE_TRIAL_SIGNAL_SECRET = 'test-trial-secret'
    process.env.PUBLIC_CONVEX_URL = 'https://convex.example.test'
  })

  afterEach(() => {
    delete process.env.SUITE_BRIDGE_CONVEX_SECRET
    delete process.env.SUITE_TRIAL_SIGNAL_SECRET
    delete process.env.PUBLIC_CONVEX_URL
  })

  test('echoes the supplied UUID in body and header and logs only safe fields', async () => {
    const requestId = '93c21844-cafa-4c96-9fc3-a7ab24f81a02'
    mockMutation.mockResolvedValueOnce({
      status: 'ok',
      globalUserId: 'public-user',
      accounts: [],
      entitlements: [],
      replayGlows: {
        hasAccess: false,
        globalUserId: null,
        matchedProductId: null,
        reasonCode: 'missing_product_entitlement',
        productUserId: 'public-user',
        productUserIdSource: 'globalUserId',
      },
      trialRequest: {
        outcome: 'denied',
        reasonCode: 'installation_not_eligible',
      },
    })

    const response = await callBridge(
      makeRequest({ trialAction: 'start', requestId })
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('x-commandglows-request-id')).toBe(requestId)
    expect(body.requestId).toBe(requestId)
    expect(body.trialRequest).toEqual({
      outcome: 'denied',
      reasonCode: 'installation_not_eligible',
      requestId,
    })
    expect(mockMutation.mock.calls[0]?.[1]).not.toHaveProperty('sourceRef')
    expect(mockInfo).toHaveBeenCalledTimes(1)
    const log = JSON.parse(String(mockInfo.mock.calls[0]?.[0]))
    expect(log).toEqual({
      requestId,
      action: 'start',
      outcome: 'denied',
      reasonCode: 'installation_not_eligible',
      status: 200,
    })
    expect(JSON.stringify(log)).not.toContain('sensitive-uid')
    expect(JSON.stringify(log)).not.toContain('sensitive@example.test')
    expect(JSON.stringify(log)).not.toContain('sensitive-token')
    expect(JSON.stringify(log)).not.toContain('sensitive-installation')
    expect(mockError).not.toHaveBeenCalled()
  })

  test('generates a request ID when absent and keeps non-start response body compatible', async () => {
    mockMutation.mockResolvedValueOnce({
      status: 'ok',
      globalUserId: 'public-user',
      accounts: [],
      entitlements: [],
      replayGlows: {
        hasAccess: false,
        globalUserId: null,
        matchedProductId: null,
        reasonCode: 'missing_product_entitlement',
        productUserId: 'public-user',
        productUserIdSource: 'globalUserId',
      },
    })

    const response = await callBridge(makeRequest())
    const body = await response.json()
    expect(response.headers.get('x-commandglows-request-id')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
    expect(body).not.toHaveProperty('requestId')
    expect(body).not.toHaveProperty('trialRequest')
    expect(mockInfo).not.toHaveBeenCalled()
  })

  test('rejects a malformed request ID before authentication or Convex', async () => {
    const response = await callBridge(
      makeRequest({
        trialAction: 'start',
        requestId: 'uid-or-other-data',
      })
    )
    expect(response.status).toBe(400)
    const body = await response.json()
    const responseId = response.headers.get('x-commandglows-request-id')
    expect(body).toEqual({
      status: 'bad_request',
      error: 'invalid_request_id',
      requestId: responseId,
    })
    expect(responseId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
    expect(mockVerifyIdToken).not.toHaveBeenCalled()
    expect(mockMutation).not.toHaveBeenCalled()
  })

  test.each(['start', 'restart'] as const)(
    'denies a %s request when Firebase reports an unverified email',
    async (trialAction) => {
      mockGetUser.mockResolvedValueOnce({ emailVerified: false })

      const response = await callBridge(makeRequest({ trialAction }))
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body).toMatchObject({
        status: 'denied',
        error: 'email_not_verified',
      })
      expect(mockGetUser).toHaveBeenCalledWith('sensitive-uid')
      expect(mockMutation).not.toHaveBeenCalled()
    }
  )

  test('fails closed when Firebase email verification lookup is unavailable', async () => {
    mockGetUser.mockRejectedValueOnce(new Error('private provider detail'))

    const response = await callBridge(makeRequest({ trialAction: 'start' }))
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.error).toBe('firebase_email_verification_check_unavailable')
    expect(JSON.stringify(body)).not.toContain('private provider detail')
    expect(mockMutation).not.toHaveBeenCalled()
  })

  test('passes server-confirmed email verification to Convex before a trial decision', async () => {
    mockMutation.mockResolvedValueOnce({
      status: 'ok',
      globalUserId: 'public-user',
      accounts: [],
      entitlements: [],
      trialRequest: { outcome: 'denied', reasonCode: 'previous_trial_exists' },
    })

    const response = await callBridge(makeRequest({ trialAction: 'start' }))

    expect(response.status).toBe(200)
    expect(mockGetUser).toHaveBeenCalledWith('sensitive-uid')
    expect(mockMutation.mock.calls[0]?.[1]).toMatchObject({
      firebaseEmailVerified: true,
      trialAction: 'start',
    })
  })

  test('returns a correlated service error for an absent Convex outcome', async () => {
    mockMutation.mockResolvedValueOnce({
      status: 'ok',
      globalUserId: 'public-user',
      accounts: [],
      entitlements: [],
    })
    const requestId = '93c21844-cafa-4c96-9fc3-a7ab24f81a02'
    const response = await callBridge(
      makeRequest({ trialAction: 'start', requestId })
    )
    const body = await response.json()
    expect(response.status).toBe(502)
    expect(response.headers.get('x-commandglows-request-id')).toBe(requestId)
    expect(body).toEqual({
      status: 'error',
      error: 'invalid_trial_request_outcome',
      requestId,
    })
    expect(mockInfo).toHaveBeenCalledWith(
      JSON.stringify({
        requestId,
        action: 'start',
        outcome: 'unknown',
        reasonCode: null,
        status: 502,
      })
    )
  })
})
