import type { APIRoute } from 'astro'
import { clerkClient } from '@clerk/astro/server'
import { AUTH_SESSION_COOKIE, AUTH_TRANSACTION_COOKIE, auth0LogoutUrl, readAuth0Config, readAuth0Session, readAuth0TransactionId } from '@/lib/auth/auth0Session'
import { getServerEnv } from '@/lib/serverEnv'
import { siteProvider, siteBackend } from '@/lib/auth/siteAuth'
export const prerender = false
export const POST: APIRoute = async (context) => {
  const { request, url, cookies, redirect, locals } = context
  if (request.headers.get('origin') !== url.origin) return new Response('Same origin required', { status: 403 })
  const sessionCookie = cookies.get(AUTH_SESSION_COOKIE)?.value
  const transactionCookie = cookies.get(AUTH_TRANSACTION_COOKIE)?.value
  // Revoke pending and active attempts before clearing the browser session.
  if (sessionCookie || transactionCookie) {
    try {
      const config = readAuth0Config(getServerEnv())
      const session = await readAuth0Session(config, sessionCookie)
      const transactionId = await readAuth0TransactionId(config, transactionCookie)
      const ids = [...new Set([session?.loginAttemptId, transactionId].filter((id): id is string => Boolean(id)))]
      if (ids.length) {
        const { client, authority } = siteBackend()
        for (const attemptId of ids) await client.mutation('siteSessions:revoke' as never, { ...authority, attemptId } as never)
      }
    } catch { return new Response('Sign out could not be completed. Please retry.', { status: 503, headers: { 'Cache-Control': 'no-store' } }) }
  }
  cookies.delete(AUTH_SESSION_COOKIE, { path: '/' })
  cookies.delete(AUTH_TRANSACTION_COOKIE, { path: '/' })
  if (siteProvider() === 'clerk') {
    const sessionId = locals.auth?.().sessionId
    if (sessionId) {
      try { await clerkClient(context).sessions.revokeSession(sessionId) }
      catch { return new Response('Sign out could not be completed. Please retry.', { status: 503, headers: { 'Cache-Control': 'no-store' } }) }
    }
    cookies.delete('__session', { path: '/' })
    return redirect('/', 303)
  }
  try { return redirect(auth0LogoutUrl(readAuth0Config(getServerEnv())), 303) }
  catch { return redirect('/signin?error=configuration_required', 303) }
}
