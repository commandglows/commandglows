import { ConvexHttpClient } from 'convex/browser'
import { getServerEnv } from '../serverEnv'
import { readAuth0Config, readAuth0Session, AUTH_SESSION_COOKIE } from './auth0Session'
import type { APIContext } from 'astro'

export interface SiteAuth {
  userId: string | null
  provider: 'clerk' | 'auth0'
  name?: string
  email?: string
  role?: 'admin' | 'user'
  formationAccess?: boolean
  unavailable?: boolean
}
type AccountProjection = {
  globalUserId: string; role: 'admin' | 'user'; formationAccess: boolean
  name?: string; email?: string
}
function checkedProjection(value: unknown): AccountProjection {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('site_identity_invalid')
  const account = value as Record<string, unknown>
  if (typeof account.globalUserId !== 'string' || !account.globalUserId.trim() || account.globalUserId !== account.globalUserId.trim() || account.globalUserId.length > 512
    || (account.role !== 'user' && account.role !== 'admin') || typeof account.formationAccess !== 'boolean'
    || (account.name !== undefined && typeof account.name !== 'string') || (account.email !== undefined && typeof account.email !== 'string')) throw new Error('site_identity_invalid')
  return { globalUserId: account.globalUserId, role: account.role, formationAccess: account.formationAccess,
    ...(typeof account.name === 'string' ? { name: account.name } : {}), ...(typeof account.email === 'string' ? { email: account.email } : {}) }
}
export function siteProvider() {
  const value = getServerEnv().SITE_AUTH_PROVIDER ?? 'clerk'
  if (value !== 'clerk' && value !== 'auth0') throw new Error('auth_provider_invalid')
  return value
}
export function siteBackend() {
  const env = getServerEnv()
  if (!env.PUBLIC_CONVEX_URL || !env.SUITE_BRIDGE_CONVEX_SECRET || !env.SUITE_BRIDGE_ENVIRONMENT) throw new Error('site_identity_not_configured')
  return { client: new ConvexHttpClient(env.PUBLIC_CONVEX_URL),
    authority: { bridgeSecret: env.SUITE_BRIDGE_CONVEX_SECRET, environment: env.SUITE_BRIDGE_ENVIRONMENT } }
}
export async function initializeSiteAuth(context: APIContext) {
  const provider = siteProvider()
  let auth: SiteAuth = { userId: null, provider }
  context.locals.siteAuth = () => auth
  try {
    let rawAccount: unknown
    if (provider === 'clerk') {
      const clerkId = context.locals.auth?.().userId
      if (!clerkId) return
      const { client, authority } = siteBackend()
      rawAccount = await client.query('siteIdentity:resolveClerk' as never, { ...authority, clerkId } as never)
    } else {
      const config = readAuth0Config(getServerEnv())
      if (context.url.origin !== config.origin) throw new Error('site_auth_origin_mismatch')
      const session = await readAuth0Session(config, context.cookies.get(AUTH_SESSION_COOKIE)?.value)
      if (!session) return
      const { client, authority } = siteBackend()
      const active = await client.query('siteSessions:isActive' as never, { ...authority, attemptId: session.loginAttemptId } as never)
      if (active !== true) return
      rawAccount = await client.query('siteIdentity:resolve' as never, {
        ...authority, provider, issuer: session.issuer, subject: session.subject,
      } as never)
    }
    const account = checkedProjection(rawAccount)
    auth = { userId: account.globalUserId, provider, name: account.name, email: account.email,
      role: account.role, formationAccess: account.formationAccess === true }
  } catch { auth = { ...auth, unavailable: true } }
}
