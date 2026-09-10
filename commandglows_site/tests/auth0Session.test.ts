import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { exportJWK, generateKeyPair, SignJWT } from 'jose'
import { auth0CookieOptions, auth0LogoutUrl, beginAuth0Login, completeAuth0Login, readAuth0Config, readAuth0Session, readAuth0TransactionId, safeAuthReturnTo } from '../src/lib/auth/auth0Session'

const env = { AUTH0_ISSUER: 'https://tenant.auth0.com/', AUTH_SITE_ORIGIN: 'https://preview.example.com', AUTH0_CLIENT_ID: 'test-client', AUTH0_CLIENT_SECRET: 'synthetic-client-secret', AUTH_SESSION_SECRET: 'ab'.repeat(32) }
const config = readAuth0Config(env)
const keys = await generateKeyPair('RS256')
const jwk = { ...await exportJWK(keys.publicKey), kid: 'test-key', alg: 'RS256', use: 'sig' }
let nonce = '', tokenOverrides: Record<string, unknown>, signingKey = keys.privateKey
let tokenCalls = 0
beforeEach(() => {
  tokenOverrides = {}; signingKey = keys.privateKey; tokenCalls = 0
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('.well-known')) return Response.json({ issuer: config.issuer, authorization_endpoint: `${config.issuer}authorize`, token_endpoint: `${config.issuer}oauth/token`, jwks_uri: `${config.issuer}.well-known/jwks.json`, response_types_supported: ['code'], subject_types_supported: ['public'], id_token_signing_alg_values_supported: ['RS256'] })
    throw new Error(`Unexpected request ${url}`)
  }))
})
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

async function start(link?: string) {
  // Real OIDC library and real JOSE verification, with synthetic HTTPS provider responses.
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.endsWith('/.well-known/openid-configuration')) return Response.json({ issuer: config.issuer, authorization_endpoint: `${config.issuer}authorize`, token_endpoint: `${config.issuer}oauth/token`, jwks_uri: `${config.issuer}.well-known/jwks.json`, response_types_supported: ['code'], subject_types_supported: ['public'], id_token_signing_alg_values_supported: ['RS256'] })
    if (url.endsWith('/.well-known/jwks.json')) return Response.json({ keys: [jwk] })
    if (url.endsWith('/oauth/token')) {
      tokenCalls++
      const now = Math.floor(Date.now() / 1000)
      const token = await new SignJWT({ nonce, sub: 'auth0|alice', iss: config.issuer, aud: config.clientId, iat: now, exp: now + 1800, ...tokenOverrides }).setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).sign(signingKey)
      return Response.json({ access_token: 'unused-synthetic-access-token', token_type: 'Bearer', id_token: token })
    }
    throw new Error('Unexpected provider request')
  }))
  const login = await beginAuth0Login(config, '/dashboard/licenses?tab=all', link)
  const authorization = new URL(login.authorizationUrl)
  nonce = authorization.searchParams.get('nonce')!
  const callback = new URL(`${config.origin}/api/auth/callback?code=test-code&state=${authorization.searchParams.get('state')}`)
  return { ...login, authorization, callback }
}

describe('Auth0 server session boundary', () => {
  it('uses exact configuration and secure host-only browser cookies', () => {
    expect(auth0CookieOptions(config, 600)).toEqual({ httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600 })
    expect(() => readAuth0Config({ ...env, AUTH_SITE_ORIGIN: 'https://preview.example.com/path' })).toThrow()
    expect(() => readAuth0Config({ ...env, AUTH0_ISSUER: 'http://tenant.auth0.com' })).toThrow()
    expect(() => readAuth0Config({ ...env, AUTH_SESSION_SECRET: 'password' })).toThrow()
  })
  it.each(['//evil.example', '/\\evil.example', 'https://evil.example', '/api/auth/login', '/sign-in', '/signin', '/fr/signin/', '/\n/evil.example'])('rejects unsafe return location %s', value => {
    expect(safeAuthReturnTo(value)).toBe('/dashboard')
  })
  it('completes verified state nonce PKCE flow and encrypts minimal session without tokens', async () => {
    const login = await start('clerk-proved-user')
    expect(login.authorization.searchParams.get('code_challenge_method')).toBe('S256')
    expect(login.authorization.searchParams.get('redirect_uri')).toBe(`${config.origin}/api/auth/callback`)
    const result = await completeAuth0Login(config, login.callback, login.transactionCookie)
    expect(result.session.loginAttemptId).toBe(login.loginAttemptId)
    expect(await readAuth0TransactionId(config, login.transactionCookie)).toBe(login.loginAttemptId)
    expect(await readAuth0TransactionId(config, result.sessionCookie)).toBeNull()
    expect(result.verifiedClerkId).toBe('clerk-proved-user')
    expect(result.returnTo).toBe('/dashboard/licenses?tab=all')
    expect(result.sessionCookie).not.toContain('alice')
    expect(await readAuth0Session(config, result.sessionCookie)).toEqual(result.session)
    expect(result.session).not.toHaveProperty('idToken')
    expect(await readAuth0Session({ ...config, origin: 'https://other.example' }, result.sessionCookie)).toBeNull()
    expect(await readAuth0Session({ ...config, sessionSecret: 'cd'.repeat(32) }, result.sessionCookie)).toBeNull()
    vi.useFakeTimers(); vi.setSystemTime(Date.now() + 3600001)
    expect(await readAuth0Session(config, result.sessionCookie)).toBeNull()
  })
  it('rejects wrong callback origin before token exchange', async () => {
    const login = await start()
    login.callback.hostname = 'attacker.example'
    await expect(completeAuth0Login(config, login.callback, login.transactionCookie)).rejects.toThrow()
    expect(tokenCalls).toBe(0)
  })
  it('rejects wrong state before token exchange', async () => {
    const login = await start()
    login.callback.searchParams.set('state', 'wrong')
    await expect(completeAuth0Login(config, login.callback, login.transactionCookie)).rejects.toThrow()
    expect(tokenCalls).toBe(0)
  })
  it('rejects nonce mismatch and invalid signatures', async () => {
    const login = await start(); tokenOverrides = { nonce: 'wrong' }
    await expect(completeAuth0Login(config, login.callback, login.transactionCookie)).rejects.toThrow()
    tokenOverrides = {}; signingKey = (await generateKeyPair('RS256')).privateKey
    await expect(completeAuth0Login(config, login.callback, login.transactionCookie)).rejects.toThrow()
  })
  it.each([{ iss: 'https://wrong.auth0.com/' }, { aud: 'other-client' }, { exp: 1 }, { azp: 'other-client' }, { aud: [config.clientId, 'other-client'] }])('rejects invalid token claims %j', async claims => {
    const login = await start(); tokenOverrides = claims
    await expect(completeAuth0Login(config, login.callback, login.transactionCookie)).rejects.toThrow()
  })
  it('rejects tampered or expired transactions without exchanging code', async () => {
    const login = await start()
    expect(await readAuth0TransactionId(config, 'tampered')).toBeNull()
    await expect(completeAuth0Login(config, login.callback, login.transactionCookie.slice(0, -8) + 'tampered')).rejects.toThrow()
    vi.useFakeTimers(); vi.setSystemTime(Date.now() + 601000)
    expect(await readAuth0TransactionId(config, login.transactionCookie)).toBeNull()
    await expect(completeAuth0Login(config, login.callback, login.transactionCookie)).rejects.toThrow()
    expect(tokenCalls).toBe(0)
  })
  it('does not leak provider errors and limits logout to configured origin', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('secret-token-value')))
    await expect(beginAuth0Login(config)).rejects.toThrow('Authentication could not be completed. Please sign in again.')
    const logout = new URL(auth0LogoutUrl(config))
    expect(logout.origin).toBe('https://tenant.auth0.com')
    expect(logout.searchParams.get('returnTo')).toBe(`${config.origin}/`)
  })
})
