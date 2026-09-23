import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const cert = vi.fn((config) => ({ type: 'service-account', config }))
  const getApps = vi.fn(() => [])
  const initializeApp = vi.fn((options, name) => ({ options, name }))
  const getAuth = vi.fn(() => ({}))
  const getFirestore = vi.fn(() => ({}))
  const getVercelOidcToken = vi.fn(async () => 'vercel-oidc-token')
  const IdentityPoolClient = vi.fn(function (options: {
    subject_token_supplier: { getSubjectToken: () => Promise<string> }
  }) {
    return {
      credentials: { expiry_date: Date.now() + 3_600_000 },
      async getAccessToken() {
        await options.subject_token_supplier.getSubjectToken()
        return { token: 'short-lived-google-token' }
      },
    }
  })
  return {
    cert,
    getApps,
    initializeApp,
    getAuth,
    getFirestore,
    getVercelOidcToken,
    IdentityPoolClient,
  }
})

vi.mock('firebase-admin/app', () => ({
  cert: mocks.cert,
  getApps: mocks.getApps,
  initializeApp: mocks.initializeApp,
}))
vi.mock('firebase-admin/auth', () => ({ getAuth: mocks.getAuth }))
vi.mock('firebase-admin/firestore', () => ({ getFirestore: mocks.getFirestore }))
vi.mock('@vercel/oidc', () => ({ getVercelOidcToken: mocks.getVercelOidcToken }))
vi.mock('google-auth-library', () => ({ IdentityPoolClient: mocks.IdentityPoolClient }))

const wifEnv = {
  FIREBASE_ADMIN_CREDENTIAL_MODE: 'workload_identity_federation',
  FIREBASE_PROJECT_ID: 'commandglows-dev',
  GCP_PROJECT_NUMBER: '123456789',
  GCP_WORKLOAD_IDENTITY_POOL_ID: 'vercel-pool',
  GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: 'vercel-provider',
  GCP_SERVICE_ACCOUNT_EMAIL: 'firebase-admin@commandglows-dev.iam.gserviceaccount.com',
}

describe('Firebase Admin workload identity federation', () => {
  beforeEach(() => {
    vi.resetModules()
    for (const mock of Object.values(mocks)) mock.mockClear()
  })

  test('uses Vercel OIDC and service-account impersonation when WIF is explicit', async () => {
    const { getFirebaseAdminState } = await import('@/lib/firebaseAdmin')
    const state = getFirebaseAdminState({
      ...wifEnv,
      FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
        project_id: 'key-project',
        client_email: 'key@example.test',
        private_key: 'private-key',
      }),
    })

    expect(state?.projectId).toBe('commandglows-dev')
    expect(mocks.cert).not.toHaveBeenCalled()
    const appOptions = mocks.initializeApp.mock.calls[0]?.[0]
    expect(appOptions.credential).toBeDefined()
    await expect(appOptions.credential.getAccessToken()).resolves.toMatchObject({
      access_token: 'short-lived-google-token',
    })
    expect(mocks.IdentityPoolClient).toHaveBeenCalledWith(
      expect.objectContaining({
        audience:
          '//iam.googleapis.com/projects/123456789/locations/global/workloadIdentityPools/vercel-pool/providers/vercel-provider',
        subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
        service_account_impersonation_url:
          'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/firebase-admin%40commandglows-dev.iam.gserviceaccount.com:generateAccessToken',
      })
    )
    expect(mocks.getVercelOidcToken).toHaveBeenCalledOnce()
  })

  test('fails closed on incomplete WIF config without falling back to service keys', async () => {
    const { getFirebaseAdminState } = await import('@/lib/firebaseAdmin')
    const state = getFirebaseAdminState({
      ...wifEnv,
      GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: undefined,
      FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
        project_id: 'key-project',
        client_email: 'key@example.test',
        private_key: 'private-key',
      }),
    })

    expect(state).toBeNull()
    expect(mocks.cert).not.toHaveBeenCalled()
    expect(mocks.initializeApp).not.toHaveBeenCalled()
  })

  test('fails closed on an unknown explicit credential mode', async () => {
    const { getFirebaseAdminState } = await import('@/lib/firebaseAdmin')
    const state = getFirebaseAdminState({
      FIREBASE_ADMIN_CREDENTIAL_MODE: 'workload_identity_federation_typo',
      FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
        project_id: 'key-project',
        client_email: 'key@example.test',
        private_key: 'private-key',
      }),
    })

    expect(state).toBeNull()
    expect(mocks.cert).not.toHaveBeenCalled()
    expect(mocks.initializeApp).not.toHaveBeenCalled()
  })

  test('keeps the existing service-account credential path outside WIF mode', async () => {
    const { getFirebaseAdminState } = await import('@/lib/firebaseAdmin')
    const state = getFirebaseAdminState({
      FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
        project_id: 'legacy-project',
        client_email: 'legacy@example.test',
        private_key: 'legacy-private-key',
      }),
    })

    expect(state?.projectId).toBe('legacy-project')
    expect(mocks.cert).toHaveBeenCalledWith({
      projectId: 'legacy-project',
      clientEmail: 'legacy@example.test',
      privateKey: 'legacy-private-key',
    })
    expect(mocks.IdentityPoolClient).not.toHaveBeenCalled()
  })

  test('does not reuse a service-key Firebase app for an explicit WIF request', async () => {
    const { getFirebaseAdminState } = await import('@/lib/firebaseAdmin')
    const serviceAccount = getFirebaseAdminState({
      FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
        project_id: 'legacy-project',
        client_email: 'legacy@example.test',
        private_key: 'legacy-private-key',
      }),
    })
    const wif = getFirebaseAdminState(wifEnv)

    expect(serviceAccount?.projectId).toBe('legacy-project')
    expect(wif?.projectId).toBe('commandglows-dev')
    expect(mocks.initializeApp).toHaveBeenCalledTimes(2)
    expect(mocks.initializeApp.mock.calls[0]?.[1]).toBeUndefined()
    expect(mocks.initializeApp.mock.calls[1]?.[1]).toMatch(/^firebase-admin-wif-/)
    expect(mocks.cert).toHaveBeenCalledOnce()
  })

  test('does not fall back if the Vercel OIDC token supplier fails', async () => {
    mocks.getVercelOidcToken.mockRejectedValueOnce(new Error('token unavailable'))
    const { getFirebaseAdminState } = await import('@/lib/firebaseAdmin')
    const state = getFirebaseAdminState(wifEnv)
    const appOptions = mocks.initializeApp.mock.calls[0]?.[0]

    await expect(appOptions.credential.getAccessToken()).rejects.toThrow(
      'token unavailable'
    )
    expect(state?.projectId).toBe('commandglows-dev')
    expect(mocks.cert).not.toHaveBeenCalled()
  })
})
