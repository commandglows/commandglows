import { siteBackend } from '@/lib/auth/siteAuth'
import type { APIRoute } from 'astro'
import { beginAuth0Login, readAuth0Config, auth0CookieOptions, AUTH_TRANSACTION_COOKIE, AUTH_TRANSACTION_SECONDS } from '@/lib/auth/auth0Session'
import { getServerEnv } from '@/lib/serverEnv'
export const prerender = false
export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  try {
    const config = readAuth0Config(getServerEnv())
    if (url.origin !== config.origin) return new Response('Authentication origin is not configured', { status: 503 })
    const login = await beginAuth0Login(config, url.searchParams.get('next') ?? undefined)
    const { client, authority } = siteBackend()
    await client.mutation('siteSessions:register' as never, { ...authority, attemptId: login.loginAttemptId, expiresAt: Date.now() + AUTH_TRANSACTION_SECONDS * 1000 } as never)
    cookies.set(AUTH_TRANSACTION_COOKIE, login.transactionCookie, auth0CookieOptions(config, AUTH_TRANSACTION_SECONDS))
    return redirect(login.authorizationUrl, 302)
  } catch { return redirect('/signin?error=configuration_required', 303) }
}
