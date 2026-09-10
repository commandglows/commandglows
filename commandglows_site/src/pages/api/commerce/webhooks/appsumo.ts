import type { APIRoute } from 'astro'
import { ConvexHttpClient } from 'convex/browser'
import { getServerEnv } from '@/lib/serverEnv'
import { parseAppSumoWebhook } from '@/lib/commerce/providers/appsumo'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export const prerender = false

function jsonResponse(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS })
}

export const POST: APIRoute = async ({ request }) => {
  const env = getServerEnv()
  const parsed = parseAppSumoWebhook(
    {
      rawBody: await request.text(),
      signature: request.headers.get('x-appsumo-signature') ?? '',
      eventName: request.headers.get('x-appsumo-timestamp') ?? '',
    },
    env
  )

  if (!parsed.ok && parsed.ignored) {
    return jsonResponse({ success: true, event: parsed.eventType ?? 'test' }, parsed.status)
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
    const result = await convex.mutation('bridge:processCommerceEvent' as never, {
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
    return jsonResponse({ success: true, event: event.metadata.event, result }, 200)
  } catch (error) {
    console.error('AppSumo webhook handler failed:', error)
    return jsonResponse({ success: false, message: 'Webhook fulfillment failed' }, 500)
  }
}
