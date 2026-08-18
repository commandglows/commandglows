import type { APIRoute } from 'astro'
import { ConvexHttpClient } from 'convex/browser'
import { getServerEnv } from '@/lib/serverEnv'

export const prerender = false

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const json = (payload: unknown, status: number) =>
  new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS })

function adminError(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  if (/admin_forbidden|bridge_secret_mismatch/.test(message)) {
    return json({ status: 'forbidden', error: 'admin_required' }, 403)
  }
  if (/search_|reason_|product_not_allowed|plan_not_allowed|global_user_not_found/.test(message)) {
    return json({ status: 'invalid', error: 'invalid_request' }, 400)
  }
  return json({ status: 'error', error: 'license_admin_unavailable' }, 500)
}

function getAuthority(locals: App.Locals) {
  const auth = locals.auth()
  if (!auth.userId) {
    return {
      ok: false as const,
      response: json({ status: 'unauthorized', error: 'auth_required' }, 401),
    }
  }

  const env = getServerEnv()
  if (
    !env.PUBLIC_CONVEX_URL ||
    env.PUBLIC_CONVEX_URL === 'https://PLACEHOLDER.convex.cloud' ||
    !env.SUITE_BRIDGE_CONVEX_SECRET
  ) {
    return {
      ok: false as const,
      response: json({ status: 'unavailable', error: 'license_admin_unavailable' }, 503),
    }
  }

  return {
    ok: true as const,
    clerkId: auth.userId,
    bridgeSecret: env.SUITE_BRIDGE_CONVEX_SECRET,
    environment: env.SUITE_BRIDGE_ENVIRONMENT || env.VERCEL_ENV || 'development',
    convex: new ConvexHttpClient(env.PUBLIC_CONVEX_URL),
  }
}

export const GET: APIRoute = async ({ request, locals }) => {
  const authority = getAuthority(locals)
  if (!authority.ok) return authority.response

  const url = new URL(request.url)
  const globalUserId = url.searchParams.get('globalUserId')?.trim()
  const search = url.searchParams.get('query')?.trim()
  if (!globalUserId && !search) {
    return json({ status: 'invalid', error: 'query_required' }, 400)
  }

  try {
    if (globalUserId) {
      const detail = await authority.convex.query(
        'licenseAdministration:getLicenseDetail' as never,
        {
          clerkId: authority.clerkId,
          bridgeSecret: authority.bridgeSecret,
          globalUserId,
        } as never,
      )
      return json(detail, 200)
    }

    const result = await authority.convex.query(
      'licenseAdministration:searchLicenses' as never,
      {
        clerkId: authority.clerkId,
        bridgeSecret: authority.bridgeSecret,
        search,
      } as never,
    )
    return json(result, 200)
  } catch (error) {
    return adminError(error)
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  const authority = getAuthority(locals)
  if (!authority.ok) return authority.response

  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return json({ status: 'invalid', error: 'invalid_json' }, 400)
  }

  const action = payload.action
  const globalUserId = typeof payload.globalUserId === 'string' ? payload.globalUserId.trim() : ''
  const productId = typeof payload.productId === 'string' ? payload.productId.trim() : ''
  const plan = typeof payload.plan === 'string' ? payload.plan.trim() : ''
  const reason = typeof payload.reason === 'string' ? payload.reason.trim() : ''
  if (
    (action !== 'grant' && action !== 'revoke') ||
    !globalUserId ||
    !productId ||
    !plan ||
    reason.length < 3
  ) {
    return json({ status: 'invalid', error: 'invalid_action' }, 400)
  }

  try {
    const result = await authority.convex.mutation(
      `licenseAdministration:${action === 'grant' ? 'manualGrant' : 'manualRevoke'}` as never,
      {
        clerkId: authority.clerkId,
        bridgeSecret: authority.bridgeSecret,
        globalUserId,
        productId,
        plan,
        reason,
        environment: authority.environment,
      } as never,
    )
    return json(result, 200)
  } catch (error) {
    return adminError(error)
  }
}
