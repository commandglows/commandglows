import { beforeEach, expect, test, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ begin: vi.fn(), complete: vi.fn(), mutate: vi.fn(), revoke: vi.fn(), config: vi.fn(), provider: vi.fn() }))
vi.mock('@/lib/auth/auth0Session', () => ({
  AUTH_SESSION_COOKIE: 'session', AUTH_TRANSACTION_COOKIE: 'transaction', AUTH_TRANSACTION_SECONDS: 600,
  readAuth0Config: mocks.config, beginAuth0Login: mocks.begin, completeAuth0Login: mocks.complete,
  auth0CookieOptions: (_config: unknown, maxAge: number) => ({ path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge }),
  readAuth0Session: async () => ({ loginAttemptId: 'active-attempt' }), readAuth0TransactionId: async () => 'pending-attempt',
  auth0LogoutUrl: () => 'https://identity.example/v2/logout',
}))
vi.mock('@/lib/auth/siteAuth', () => ({ siteProvider: mocks.provider, siteBackend: () => ({ client: { mutation: mocks.mutate }, authority: { bridgeSecret: 'private', environment: 'development' } }) }))
vi.mock('@clerk/astro/server', () => ({ clerkClient: () => ({ sessions: { revokeSession: mocks.revoke } }) }))
import { GET as login } from '@/pages/api/auth/login'
import { GET as callback } from '@/pages/api/auth/callback'
import { POST as link } from '@/pages/api/auth/link'
import { POST as logout } from '@/pages/api/auth/logout'
import { GET as session } from '@/pages/api/auth/session'
const origin = 'https://app.example'
function context(path: string, method = 'GET', incomingOrigin: string | null = origin) {
  const url = new URL(path, origin)
  return { url, request: new Request(url, { method, headers: incomingOrigin ? { Origin: incomingOrigin } : {} }),
    cookies: { get: vi.fn(() => ({ value: 'sealed-transaction' })), set: vi.fn(), delete: vi.fn() },
    locals: { auth: () => ({ userId: 'verified-clerk', sessionId: 'verified-session' }), siteAuth: () => ({ userId: 'global-account', provider: 'auth0', name: 'Private name', email: 'private@example.test' }) },
    redirect: (url: string, status: number) => new Response(null, { status, headers: { Location: url } }),
  }
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.config.mockReturnValue({ origin })
  mocks.provider.mockReturnValue('auth0')
  mocks.begin.mockResolvedValue({ authorizationUrl: 'https://identity.example/authorize', transactionCookie: 'sealed', loginAttemptId: 'pending-attempt' })
  mocks.complete.mockResolvedValue({ session: { loginAttemptId: 'active-attempt', issuer: 'https://identity.example/', subject: 'auth0|verified', expiresAt: Math.floor(Date.now()/1000) + 3600, email: 'verified@example.test', emailVerified: true }, sessionCookie: 'new-session', returnTo: '/dashboard' })
  mocks.mutate.mockResolvedValue({ globalUserId: 'global-account' })
  mocks.revoke.mockResolvedValue(undefined)
})
test('login rejects an unconfigured request origin without setting a transaction', async () => {
  const ctx = context('/api/auth/login')
  mocks.config.mockReturnValue({ origin: 'https://different.example' })
  expect((await login(ctx as never)).status).toBe(503)
  expect(mocks.begin).not.toHaveBeenCalled()
  expect(ctx.cookies.set).not.toHaveBeenCalled()
})
test.each([null, 'https://evil.example'])('link and logout reject missing or foreign origins %s', async (incoming) => {
  for (const route of [link, logout]) {
    const ctx = context('/api/auth/link', 'POST', incoming)
    expect((await route(ctx as never)).status).toBe(403)
    expect(ctx.cookies.delete).not.toHaveBeenCalled()
  }
  expect(mocks.begin).not.toHaveBeenCalled()
  expect(mocks.revoke).not.toHaveBeenCalled()
})
test('link uses only verified legacy identity in the encrypted transaction', async () => {
  const ctx = context('/api/auth/link?clerkId=attacker', 'POST')
  expect((await link(ctx as never)).status).toBe(303)
  expect(mocks.begin).toHaveBeenCalledWith(expect.anything(), '/dashboard/parametres', 'verified-clerk')
})
test('callback consumes transaction then binds identity before setting session', async () => {
  const ctx = context('/api/auth/callback?code=trusted')
  const response = await callback(ctx as never)
  expect(response.headers.get('Location')).toBe('/dashboard')
  expect(ctx.cookies.delete).toHaveBeenCalledWith('transaction', { path: '/' })
  expect(mocks.mutate).toHaveBeenCalledWith('siteIdentity:upsert', expect.objectContaining({ subject: 'auth0|verified', email: 'verified@example.test' }))
  expect(ctx.cookies.delete.mock.invocationCallOrder[0]).toBeLessThan(mocks.complete.mock.invocationCallOrder[0])
  expect(mocks.mutate.mock.invocationCallOrder[0]).toBeLessThan(ctx.cookies.set.mock.invocationCallOrder[0])
})
test('callback failure clears stale authentication and hides provider details', async () => {
  mocks.complete.mockRejectedValueOnce(new Error('secret provider diagnostic'))
  const ctx = context('/api/auth/callback')
  const response = await callback(ctx as never)
  expect(response.headers.get('Location')).toBe('/signin?error=auth_failed')
  expect(ctx.cookies.delete).toHaveBeenCalledWith('session', { path: '/' })
  expect(ctx.cookies.set).not.toHaveBeenCalled()
  expect(mocks.mutate).not.toHaveBeenCalled()
})
test('link conflict never issues a session', async () => {
  mocks.complete.mockResolvedValueOnce({ session: { loginAttemptId: 'active-attempt', issuer: 'https://identity.example/', subject: 'auth0|verified' }, verifiedClerkId: 'clerk-existing' })
  mocks.mutate.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('identity_link_conflict'))
  const ctx = context('/api/auth/callback')
  expect((await callback(ctx as never)).headers.get('Location')).toBe('/signin?error=account_link_conflict')
  expect(mocks.mutate).toHaveBeenCalledWith('siteIdentity:linkVerifiedClerk', expect.objectContaining({ clerkId: 'clerk-existing' }))
  expect(ctx.cookies.set).not.toHaveBeenCalled()
})
test('logout reports revocation failure without claiming success when configuration fails', async () => {
  mocks.config.mockImplementationOnce(() => { throw new Error('missing configuration') })
  const ctx = context('/api/auth/logout', 'POST')
  expect((await logout(ctx as never)).status).toBe(503)
  expect(ctx.cookies.delete).not.toHaveBeenCalled()
})
test('legacy logout failure reports failure instead of claiming logout', async () => {
  mocks.provider.mockReturnValue('clerk')
  mocks.revoke.mockRejectedValueOnce(new Error('provider failed'))
  const ctx = context('/api/auth/logout', 'POST')
  expect((await logout(ctx as never)).status).toBe(503)
  expect(mocks.revoke).toHaveBeenCalledWith('verified-session')
})
test('session endpoint exposes no profile, role, token or backend authority', async () => {
  const response = await session(context('/api/auth/session') as never)
  expect(await response.json()).toEqual({ userId: 'global-account', provider: 'auth0' })
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(response.headers.get('Vary')).toBe('Cookie')
})

test('login records its pending attempt before setting the transaction cookie', async () => {
  const ctx = context('/api/auth/login')
  expect((await login(ctx as never)).status).toBe(302)
  expect(mocks.mutate).toHaveBeenCalledWith('siteSessions:register', expect.objectContaining({ attemptId: 'pending-attempt' }))
  expect(mocks.mutate.mock.invocationCallOrder[0]).toBeLessThan(ctx.cookies.set.mock.invocationCallOrder[0])
})
test('a revoked login attempt cannot reach identity mutation or issue a cookie', async () => {
  mocks.mutate.mockRejectedValueOnce(new Error('login_attempt_revoked'))
  const ctx = context('/api/auth/callback')
  expect((await callback(ctx as never)).headers.get('Location')).toBe('/signin?error=auth_failed')
  expect(mocks.mutate).toHaveBeenCalledTimes(1)
  expect(mocks.mutate).toHaveBeenCalledWith('siteSessions:activate', expect.anything())
  expect(ctx.cookies.set).not.toHaveBeenCalled()
})
test('logout revokes pending and active attempts before deleting cookies', async () => {
  const ctx = context('/api/auth/logout', 'POST')
  const response = await logout(ctx as never)
  expect(response.status).toBe(303)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(response.headers.get('Clear-Site-Data')).toBe('"storage"')
  expect(mocks.mutate).toHaveBeenCalledWith('siteSessions:revoke', expect.objectContaining({ attemptId: 'active-attempt' }))
  expect(mocks.mutate).toHaveBeenCalledWith('siteSessions:revoke', expect.objectContaining({ attemptId: 'pending-attempt' }))
  expect(mocks.mutate.mock.invocationCallOrder[1]).toBeLessThan(ctx.cookies.delete.mock.invocationCallOrder[0])
})
