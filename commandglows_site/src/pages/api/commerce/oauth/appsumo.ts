import type { APIRoute } from 'astro'
import { ConvexHttpClient } from 'convex/browser'
import { getServerEnv } from '@/lib/serverEnv'
import { parseAppSumoOAuthCallback } from '@/lib/commerce/providers/appsumo'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export const prerender = false

function jsonResponse(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS })
}

export const GET: APIRoute = async ({ request, redirect }) => {
  const env = getServerEnv()
  const parsed = await parseAppSumoOAuthCallback(new URL(request.url), env)

  if (parsed.ok && parsed.validationOnly) {
    return jsonResponse({ success: true, message: parsed.message }, 200)
  }
  if (!parsed.ok) {
    return jsonResponse({ success: false, message: parsed.message }, parsed.status)
  }

  const convexUrl = env.PUBLIC_CONVEX_URL
  if (!convexUrl || convexUrl === 'https://PLACEHOLDER.convex.cloud') {
    return jsonResponse({ success: false, message: 'Convex is not configured' }, 500)
  }
  if (!env.SUITE_BRIDGE_CONVEX_SECRET) {
    return jsonResponse({ success: false, message: 'Convex bridge secret is not configured' }, 500)
  }

  try {
    const event = parsed.normalizedEvent
    const convex = new ConvexHttpClient(convexUrl)
    await convex.mutation('bridge:processCommerceEvent' as never, {
      provider: event.provider,
      offerId: event.offerId,
      productId: event.productId,
      plan: event.plan,
      eventType: event.eventType,
      environment: event.environment,
      providerEventId: event.providerEventId,
      providerOrderId: event.providerOrderId,
      idempotencyKey: event.idempotencyKey,
      status: event.status,
      providerCustomerId: event.providerCustomerId,
      sourceRef: event.sourceRef,
      providerSourceRef: event.providerSourceRef,
      metadata: event.metadata,
      bridgeSecret: env.SUITE_BRIDGE_CONVEX_SECRET,
    } as never)
    return redirect(parsed.redirectPath, 302)
  } catch (error) {
    console.error('AppSumo OAuth callback handler failed:', error)
    return jsonResponse({ success: false, message: 'OAuth fulfillment failed' }, 500)
  }
}
