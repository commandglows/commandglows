import { siteBackend } from '@/lib/auth/siteAuth'
import type { APIRoute } from 'astro'
import { beginAuth0Login, readAuth0Config, auth0CookieOptions, AUTH_TRANSACTION_COOKIE, AUTH_TRANSACTION_SECONDS } from '@/lib/auth/auth0Session'
import { getServerEnv } from '@/lib/serverEnv'
export const prerender = false
export const POST: APIRoute = async ({ request, url, locals, cookies, redirect }) => {
  if (request.headers.get('origin') !== url.origin) return new Response('Same origin required', { status: 403 })
  const clerkId = locals.auth?.().userId
  if (!clerkId) return new Response('Sign in to your existing account first', { status: 401 })
  // Locale changes only the fixed recovery destination, never authentication identity.
  const form = await request.formData().catch(() => null)
  const recoveryPath = form?.get('lang') === 'fr' ? '/fr/account/link-existing' : '/account/link-existing'
  try {
    const config = readAuth0Config(getServerEnv())
    if (url.origin !== config.origin) throw new Error('auth_origin_mismatch')
    const { client, authority } = siteBackend()
    const login = await beginAuth0Login(config, '/dashboard/parametres', clerkId)
    await client.mutation('siteSessions:register' as never, { ...authority, attemptId: login.loginAttemptId, expiresAt: Date.now() + AUTH_TRANSACTION_SECONDS * 1000 } as never)
    cookies.set(AUTH_TRANSACTION_COOKIE, login.transactionCookie, auth0CookieOptions(config, AUTH_TRANSACTION_SECONDS))
    return redirect(login.authorizationUrl, 303)
  } catch { return redirect(`${recoveryPath}?error=configuration_required`, 303) }
}
