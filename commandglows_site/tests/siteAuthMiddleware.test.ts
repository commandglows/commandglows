import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { APIContext } from 'astro'

const mock = vi.hoisted(() => ({ query: vi.fn(), session: vi.fn(), config: vi.fn(), env: {} as Record<string, string> }))
vi.mock('convex/browser', () => ({ ConvexHttpClient: class { query = mock.query } }))
vi.mock('../src/lib/serverEnv', () => ({ getServerEnv: () => mock.env }))
vi.mock('../src/lib/auth/auth0Session', () => ({ AUTH_SESSION_COOKIE: 'commandglows_session', readAuth0Config: mock.config, readAuth0Session: mock.session }))
import { initializeSiteAuth } from '../src/lib/auth/siteAuth'

function context(clerkId?: string) {
  return { url: new URL('https://preview.example/dashboard'), locals: { auth: () => ({ userId: clerkId }) }, cookies: { get: () => ({ value: 'encrypted-cookie' }) } } as unknown as APIContext
}
const projection = { globalUserId: 'gu_canonical', role: 'user', formationAccess: false }
beforeEach(() => {
  vi.clearAllMocks()
  mock.env = { SITE_AUTH_PROVIDER: 'auth0', PUBLIC_CONVEX_URL: 'https://example.convex.cloud', SUITE_BRIDGE_CONVEX_SECRET: 'synthetic', SUITE_BRIDGE_ENVIRONMENT: 'preview' }
  mock.config.mockReturnValue({ origin: 'https://preview.example' })
  mock.session.mockResolvedValue({ issuer: 'https://tenant.auth0.com/', subject: 'auth0|alice', loginAttemptId: 'random-attempt', role: 'admin', formationAccess: true, globalUserId: 'gu_attacker' })
  mock.query.mockImplementation(async (name: string) => name === 'siteSessions:isActive' ? true : projection)
})

describe('server identity middleware', () => {
  it('uses canonical identity and access only; ignores provider session roles and IDs', async () => {
    const ctx = context(); await initializeSiteAuth(ctx)
    expect(ctx.locals.siteAuth()).toMatchObject({ userId: 'gu_canonical', role: 'user', formationAccess: false, provider: 'auth0' })
    expect(mock.query).toHaveBeenNthCalledWith(2, 'siteIdentity:resolve', expect.objectContaining({ issuer: 'https://tenant.auth0.com/', subject: 'auth0|alice' }))
  })
  it.each([false, null, 'true', {}, 1])('denies inactive or malformed active status %j before identity lookup', async active => {
    mock.query.mockResolvedValue(active)
    const ctx = context(); await initializeSiteAuth(ctx)
    expect(ctx.locals.siteAuth().userId).toBeNull()
    expect(mock.query).toHaveBeenCalledTimes(1)
  })
  it('denies backend outages with a recoverable unavailable state', async () => {
    mock.query.mockRejectedValue(new Error('backend unavailable'))
    const ctx = context(); await initializeSiteAuth(ctx)
    expect(ctx.locals.siteAuth()).toMatchObject({ userId: null, unavailable: true })
  })
  it.each([null, {}, { ...projection, globalUserId: 42 }, { ...projection, globalUserId: ' ' }, { ...projection, role: 'owner' }, { ...projection, formationAccess: 'true' }, { ...projection, email: {} }])('denies malformed canonical account %j', async account => {
    mock.query.mockImplementation(async (name: string) => name === 'siteSessions:isActive' ? true : account)
    const ctx = context(); await initializeSiteAuth(ctx)
    expect(ctx.locals.siteAuth()).toMatchObject({ userId: null, unavailable: true })
  })
  it('resolves verified legacy Clerk without using Auth0 session', async () => {
    mock.env.SITE_AUTH_PROVIDER = 'clerk'
    const ctx = context('user_legacy'); await initializeSiteAuth(ctx)
    expect(ctx.locals.siteAuth().userId).toBe('gu_canonical')
    expect(mock.session).not.toHaveBeenCalled()
    expect(mock.query).toHaveBeenCalledWith('siteIdentity:resolveClerk', expect.objectContaining({ clerkId: 'user_legacy' }))
  })
  it('makes no backend call for signed-out users', async () => {
    mock.session.mockResolvedValue(null)
    const ctx = context(); await initializeSiteAuth(ctx)
    expect(ctx.locals.siteAuth().userId).toBeNull()
    expect(mock.query).not.toHaveBeenCalled()
  })
  it('fails closed on missing auth or backend configuration', async () => {
    mock.config.mockImplementationOnce(() => { throw new Error('missing auth configuration') })
    const ctx = context(); await initializeSiteAuth(ctx)
    expect(ctx.locals.siteAuth()).toMatchObject({ userId: null, unavailable: true })
    delete mock.env.SUITE_BRIDGE_CONVEX_SECRET
    await initializeSiteAuth(ctx)
    expect(ctx.locals.siteAuth()).toMatchObject({ userId: null, unavailable: true })
    expect(mock.query).not.toHaveBeenCalled()
  })
  it('rejects an unexpected hosted origin', async () => {
    const ctx = context(); ctx.url.hostname = 'other.example'
    await initializeSiteAuth(ctx)
    expect(ctx.locals.siteAuth()).toMatchObject({ userId: null, unavailable: true })
    expect(mock.session).not.toHaveBeenCalled()
  })
})
