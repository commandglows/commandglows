import type { APIRoute } from 'astro'
import { ConvexHttpClient } from 'convex/browser'
import Stripe from 'stripe'
import { getServerEnv } from '@/lib/serverEnv'
import { normalizeVerifiedStripeEvent } from '@/lib/commerce/providers/stripe'

export const prerender = false
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })
const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''
const sandbox = (value: string) => ['sandbox', 'test', 'development', 'preview', 'staging'].includes(value)

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  if (/admin_forbidden|bridge_secret_mismatch/.test(message)) return json({ error: 'admin_required' }, 403)
  if (/conflict|already_resolved/.test(message)) return json({ error: 'case_changed_refresh_required' }, 409)
  if (/not_found/.test(message)) return json({ error: 'case_not_found' }, 404)
  if (/invalid|mismatch|not_recoverable|required|not_configured|evidence_/.test(message)) return json({ error: 'verified_evidence_or_configuration_required' }, 400)
  return json({ error: 'commerce_operations_unavailable' }, 503)
}

async function authority(locals: App.Locals) {
  const actorGlobalUserId = locals.siteAuth().userId
  if (!actorGlobalUserId) return { ok: false as const, response: json({ error: 'auth_required' }, 401) }
  const env = getServerEnv()
  if (!env.PUBLIC_CONVEX_URL || env.PUBLIC_CONVEX_URL.includes('PLACEHOLDER') || !env.SUITE_BRIDGE_CONVEX_SECRET) {
    return { ok: false as const, response: json({ error: 'commerce_operations_unavailable' }, 503) }
  }
  const convex = new ConvexHttpClient(env.PUBLIC_CONVEX_URL)
  const auth = { actorGlobalUserId, bridgeSecret: env.SUITE_BRIDGE_CONVEX_SECRET }
  // Verify the canonical role before any Stripe network request, including read-only requests.
  const access = await convex.query('commerceOperations:authorize' as never, auth as never) as { environment: string }
  return { ok: true as const, convex, auth, env, environment: access.environment }
}

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const access = await authority(locals)
    if (!access.ok) return access.response
    const url = new URL(request.url)
    const incidentId = url.searchParams.get('incidentId')
    if (incidentId) return json(await access.convex.query('commerceOperations:getIncident' as never,
      { ...access.auth, incidentId } as never))
    const missing = url.searchParams.get('view') === 'missing'
    return json(await access.convex.query(`commerceOperations:${missing ? 'listMissingWebhooks' : 'listIncidents'}` as never,
      { ...access.auth, ...(!missing ? { active: url.searchParams.get('view') !== 'resolved' } : {}),
        paginationOpts: { numItems: 20, cursor: url.searchParams.get('cursor') || null } } as never))
  } catch (error) { return errorResponse(error) }
}

export const POST: APIRoute = async ({ request, locals }) => {
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin) return json({ error: 'same_origin_required' }, 403)
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json({ error: 'json_required' }, 415)
  try {
    const access = await authority(locals)
    if (!access.ok) return access.response
    let payload: Record<string, unknown>
    try {
      const raw = await request.text()
      if (raw.length > 4000) return json({ error: 'request_too_large' }, 413)
      payload = JSON.parse(raw)
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('invalid')
    } catch { return json({ error: 'invalid_json' }, 400) }
    const action = text(payload.action)
    const reason = text(payload.reason)
    if (reason.length < 3 || reason.length > 500) return json({ error: 'reason_required' }, 400)
    const incidentId = text(payload.incidentId)
    const expectedVersion = payload.expectedVersion
    if (!['reconcile', 'repair_checkout'].includes(action) && (!incidentId || !Number.isSafeInteger(expectedVersion))) return json({ error: 'case_version_required' }, 400)
    const common = { ...access.auth, incidentId, expectedVersion, reason }
    if (['claim', 'escalate', 'resolve'].includes(action)) {
      return json(await access.convex.mutation('commerceOperations:updateIncident' as never,
        { ...common, action, evidenceReference: text(payload.evidenceReference) || undefined,
          ...(typeof payload.dueAt === 'number' ? { dueAt: payload.dueAt } : {}) } as never))
    }
    if (action === 'retry_alert') return json(await access.convex.mutation('commerceOperations:retryAlert' as never, common as never))
    if (action === 'retry' || action === 'dry_run') {
      if (!Number.isSafeInteger(payload.expectedAttempts)) return json({ error: 'attempt_required' }, 400)
      return json(await access.convex.mutation('commerceOperations:retryIncident' as never,
        { ...common, expectedAttempts: payload.expectedAttempts, dryRun: action === 'dry_run' } as never))
    }
    if (!['reconcile', 'recover', 'repair_checkout'].includes(action)) return json({ error: 'invalid_action' }, 400)
    if (!access.env.STRIPE_SECRET_KEY) return json({ error: 'stripe_not_configured' }, 503)
    const stripe = new Stripe(access.env.STRIPE_SECRET_KEY, {
      ...(access.env.STRIPE_API_VERSION ? { apiVersion: access.env.STRIPE_API_VERSION as Stripe.LatestApiVersion } : {}),
      timeout: 10_000, maxNetworkRetries: 1,
    })
    if (action === 'repair_checkout') {
      const sessionId = text(payload.sessionId)
      if (!/^cs_[A-Za-z0-9_]{1,250}$/.test(sessionId)) return json({ error: 'invalid_session_reference' }, 400)
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      if (session.id !== sessionId || session.status !== 'complete' || session.livemode !== (access.environment === 'production')) return json({ error: 'session_evidence_mismatch' }, 400)
      const metadata = session.metadata ?? {}
      return json(await access.convex.mutation('commerceOperations:repairCheckout' as never, {
        ...access.auth, reason, sourceRef: metadata.source_ref, environment: metadata.environment,
        globalUserId: metadata.global_user_id, productId: metadata.product_id, offerId: metadata.offer_id,
        providerOrderId: session.id, checkoutUrl: session.url ?? undefined,
      } as never))
    }
    let eventId = text(payload.eventId)
    if (action === 'recover') {
      if (!Number.isSafeInteger(payload.expectedAttempts)) return json({ error: 'attempt_required' }, 400)
      const detail = await access.convex.query('commerceOperations:getIncident' as never, { ...access.auth, incidentId } as never) as { receipt: { providerEventId: string } | null }
      if (!detail.receipt) return json({ error: 'case_not_found' }, 404)
      eventId = detail.receipt.providerEventId
    }
    if (!/^evt_[A-Za-z0-9_]{1,250}$/.test(eventId)) return json({ error: 'invalid_event_reference' }, 400)
    const event = await stripe.events.retrieve(eventId)
    if (event.id !== eventId || event.livemode !== (access.environment === 'production')) return json({ error: 'event_environment_mismatch' }, 400)
    const parsed = await normalizeVerifiedStripeEvent(event, stripe)
    if (!parsed.ok) return json({ error: 'event_not_supported_or_invalid' }, 400)
    const normalized = parsed.normalizedEvent
    if ((access.environment === 'production' && normalized.environment !== 'production') ||
      (access.environment !== 'production' && !sandbox(normalized.environment))) return json({ error: 'event_environment_mismatch' }, 400)
    if (action === 'recover') return json(await access.convex.mutation('commerceOperations:recoverIncident' as never,
      { ...common, expectedAttempts: payload.expectedAttempts, providerEventId: eventId, providerPayloadHash: normalized.providerPayloadHash } as never))
    // All provider fields come from authenticated Stripe retrieval, never from the browser payload.
    const { metadata: _metadata, ...envelope } = normalized
    const result = await access.convex.mutation('commerceOperations:reconcileEvent' as never,
      { ...envelope, ...access.auth, reason } as never)
    return json({ result, providerEventId: eventId })
  } catch (error) { return errorResponse(error) }
}
