/** Server-only OIDC boundary. Tokens must never be exposed in page props or logs. */
import * as oidc from 'openid-client'
import { createRemoteJWKSet, EncryptJWT, jwtDecrypt, jwtVerify } from 'jose'

export const AUTH_SESSION_COOKIE = 'commandglows_session'
export const AUTH_TRANSACTION_COOKIE = 'commandglows_auth_transaction'
export const AUTH_TRANSACTION_SECONDS = 600
export const AUTH_SESSION_SECONDS = 3600
export interface Auth0Config {
  issuer: string; clientId: string; clientSecret: string; origin: string; sessionSecret: string
}
export interface Auth0Session {
  issuer: string; subject: string; expiresAt: number; loginAttemptId: string
  email?: string; emailVerified?: boolean; name?: string
}
export class Auth0SessionError extends Error {
  constructor() { super('Authentication could not be completed. Please sign in again.'); this.name = 'Auth0SessionError' }
}

/** Configuration comes only from server configuration, never Host/forwarded headers. */
export function readAuth0Config(env: Record<string, unknown>): Auth0Config {
  const read = (key: string) => typeof env[key] === 'string' ? (env[key] as string).trim() : ''
  try {
    const issuer = new URL(read('AUTH0_ISSUER'))
    const origin = new URL(read('AUTH_SITE_ORIGIN'))
    if (issuer.protocol !== 'https:' || issuer.username || issuer.password || issuer.search || issuer.hash || issuer.pathname !== '/') throw 0
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)
    if ((origin.protocol !== 'https:' && !(local && origin.protocol === 'http:')) || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') throw 0
    const clientId = read('AUTH0_CLIENT_ID'), clientSecret = read('AUTH0_CLIENT_SECRET'), sessionSecret = read('AUTH_SESSION_SECRET')
    // 32 random bytes encoded as exactly 64 hex characters; no human passwords.
    if (!clientId || !clientSecret || !/^[a-f\d]{64}$/i.test(sessionSecret)) throw 0
    return { issuer: issuer.href, origin: origin.origin, clientId, clientSecret, sessionSecret }
  } catch { throw new Auth0SessionError() }
}

export function auth0CookieOptions(config: Auth0Config, maxAge: number) {
  return { httpOnly: true, secure: config.origin.startsWith('https:'), sameSite: 'lax' as const, path: '/', maxAge }
}

export function safeAuthReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return '/dashboard'
  try {
    const url = new URL(value, 'https://return.invalid')
    if (url.origin !== 'https://return.invalid' || url.pathname.startsWith('/api/auth/') || /^\/(?:fr\/)?(?:signin|signup|sign-in|sign-up)\/?$/.test(url.pathname)) return '/dashboard'
    return url.pathname + url.search + url.hash
  } catch { return '/dashboard' }
}

const key = (config: Auth0Config) => Uint8Array.from(config.sessionSecret.match(/.{2}/g)!, byte => parseInt(byte, 16))
async function seal(config: Auth0Config, purpose: string, data: Record<string, unknown>, expires: number) {
  const cookie = await new EncryptJWT(data).setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuer(config.origin).setAudience(`${config.clientId}:${purpose}`).setIssuedAt().setExpirationTime(expires).encrypt(key(config))
  if (cookie.length > 3800) throw new Auth0SessionError()
  return cookie
}
async function unseal(config: Auth0Config, purpose: string, cookie: string) {
  if (!cookie || cookie.length > 3800) throw new Auth0SessionError()
  return (await jwtDecrypt(cookie, key(config), { issuer: config.origin, audience: `${config.clientId}:${purpose}`, keyManagementAlgorithms: ['dir'], contentEncryptionAlgorithms: ['A256GCM'] })).payload
}
async function discover(config: Auth0Config) {
  return oidc.discovery(new URL(config.issuer), config.clientId, config.clientSecret, undefined, { timeout: 10 })
}

export async function beginAuth0Login(config: Auth0Config, returnTo?: string, verifiedClerkId?: string) {
  try {
    const client = await discover(config)
    const verifier = oidc.randomPKCECodeVerifier(), state = oidc.randomState(), nonce = oidc.randomNonce()
    const authorizationUrl = oidc.buildAuthorizationUrl(client, {
      redirect_uri: `${config.origin}/api/auth/callback`, scope: 'openid profile email',
      code_challenge: await oidc.calculatePKCECodeChallenge(verifier), code_challenge_method: 'S256', state, nonce,
    }).href
    const transactionCookie = await seal(config, 'transaction', { verifier, state, nonce, returnTo: safeAuthReturnTo(returnTo), ...(verifiedClerkId ? { verifiedClerkId } : {}) }, Math.floor(Date.now() / 1000) + AUTH_TRANSACTION_SECONDS)
    return { authorizationUrl, transactionCookie, loginAttemptId: state }
  } catch { throw new Auth0SessionError() }
}

/** Caller must delete the transaction cookie before attempting this, including errors.
 * Code redemption is one-time at the provider. No refresh tokens are requested/stored.
 */
export async function completeAuth0Login(config: Auth0Config, callbackUrl: URL, transactionCookie: string) {
  try {
    if (callbackUrl.origin !== config.origin || callbackUrl.pathname !== '/api/auth/callback' || callbackUrl.hash) throw 0
    const tx = await unseal(config, 'transaction', transactionCookie)
    if (![tx.verifier, tx.state, tx.nonce].every(value => typeof value === 'string' && value.length > 20)) throw 0
    const client = await discover(config)
    const tokens = await oidc.authorizationCodeGrant(client, callbackUrl, {
      pkceCodeVerifier: tx.verifier as string, expectedState: tx.state as string, expectedNonce: tx.nonce as string, idTokenExpected: true,
    })
    const jwksUri = client.serverMetadata().jwks_uri
    if (!tokens.id_token || !jwksUri || new URL(jwksUri).protocol !== 'https:') throw 0
    // Explicit signature verification in addition to OIDC nonce/state/claim checks.
    const { payload } = await jwtVerify(tokens.id_token, createRemoteJWKSet(new URL(jwksUri), { timeoutDuration: 10000 }), {
      issuer: config.issuer, audience: config.clientId, algorithms: ['RS256'], requiredClaims: ['sub', 'iat', 'exp', 'nonce'],
    })
    if (!payload.sub || payload.nonce !== tx.nonce || (payload.azp !== undefined && payload.azp !== config.clientId) || (Array.isArray(payload.aud) && payload.aud.length > 1 && payload.azp !== config.clientId)) throw 0
    const expiresAt = Math.min(payload.exp!, Math.floor(Date.now() / 1000) + AUTH_SESSION_SECONDS)
    const session: Auth0Session = { issuer: config.issuer, subject: payload.sub, expiresAt, loginAttemptId: tx.state as string }
    if (typeof payload.email === 'string') session.email = payload.email
    if (typeof payload.email_verified === 'boolean') session.emailVerified = payload.email_verified
    if (typeof payload.name === 'string') session.name = payload.name
    return { session, sessionCookie: await seal(config, 'session', { ...session }, expiresAt), returnTo: safeAuthReturnTo(tx.returnTo), ...(typeof tx.verifiedClerkId === 'string' ? { verifiedClerkId: tx.verifiedClerkId } : {}) }
  } catch { throw new Auth0SessionError() }
}

export async function readAuth0Session(config: Auth0Config, cookie?: string): Promise<Auth0Session | null> {
  try {
    const payload = await unseal(config, 'session', cookie || '')
    if (payload.issuer !== config.issuer || typeof payload.subject !== 'string' || !payload.subject || typeof payload.expiresAt !== 'number' || payload.expiresAt <= Date.now() / 1000 || payload.expiresAt !== payload.exp || typeof payload.loginAttemptId !== 'string' || payload.loginAttemptId.length < 20) return null
    return { issuer: payload.issuer, subject: payload.subject, expiresAt: payload.expiresAt, loginAttemptId: payload.loginAttemptId,
      ...(typeof payload.email === 'string' ? { email: payload.email } : {}),
      ...(typeof payload.emailVerified === 'boolean' ? { emailVerified: payload.emailVerified } : {}),
      ...(typeof payload.name === 'string' ? { name: payload.name } : {}) }
  } catch { return null }
}

/** Only an authenticated transaction cookie can identify a pending attempt to revoke.
 * The server registry must authorize active attempts on every protected request.
 */
export async function readAuth0TransactionId(config: Auth0Config, cookie?: string): Promise<string | null> {
  try {
    const payload = await unseal(config, 'transaction', cookie || '')
    return typeof payload.state === 'string' && payload.state.length >= 20 ? payload.state : null
  } catch { return null }
}

/** Clear local cookies first. This logs out Auth0 SSO, not necessarily upstream SSO. */
export function auth0LogoutUrl(config: Auth0Config) {
  const url = new URL('v2/logout', config.issuer)
  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('returnTo', `${config.origin}/`)
  return url.href
}
