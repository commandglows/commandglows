import type { APIRoute } from 'astro'
import { completeAuth0Login, readAuth0Config, auth0CookieOptions, AUTH_TRANSACTION_COOKIE, AUTH_SESSION_COOKIE } from '@/lib/auth/auth0Session'
import { siteBackend } from '@/lib/auth/siteAuth'
import { getServerEnv } from '@/lib/serverEnv'
export const prerender = false
export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const transaction = cookies.get(AUTH_TRANSACTION_COOKIE)?.value
  cookies.delete(AUTH_TRANSACTION_COOKIE, { path: '/' })
  try {
    if (!transaction) throw new Error('transaction_missing')
    const config = readAuth0Config(getServerEnv())
    const result = await completeAuth0Login(config, url, transaction)
    const { client, authority } = siteBackend()
    const identity = { ...authority, provider: 'auth0', issuer: result.session.issuer, subject: result.session.subject }
    await client.mutation('siteSessions:activate' as never, { ...authority, attemptId: result.session.loginAttemptId, expiresAt: result.session.expiresAt * 1000 } as never)
    if (result.verifiedClerkId) {
      await client.mutation('siteIdentity:linkVerifiedClerk' as never, { ...identity, clerkId: result.verifiedClerkId } as never)
    } else {
      await client.mutation('siteIdentity:upsert' as never, {
        ...identity, ...(result.session.emailVerified && result.session.email ? { email: result.session.email } : {}),
        ...(result.session.name ? { name: result.session.name } : {}),
      } as never)
    }
    cookies.set(AUTH_SESSION_COOKIE, result.sessionCookie, auth0CookieOptions(config, Math.max(0, result.session.expiresAt - Math.floor(Date.now() / 1000))))
    return redirect(result.returnTo, 303)
  } catch (error) {
    cookies.delete(AUTH_SESSION_COOKIE, { path: '/' })
    const conflict = error instanceof Error && error.message.includes('identity_link_conflict')
    return redirect(`/signin?error=${conflict ? 'account_link_conflict' : 'auth_failed'}`, 303)
  }
}
