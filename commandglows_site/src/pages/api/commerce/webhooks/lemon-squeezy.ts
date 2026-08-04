import type { APIRoute } from 'astro'
import { ConvexHttpClient } from 'convex/browser'
import { getServerEnv } from '@/lib/serverEnv'
import { parseLemonSqueezyWebhook } from '@/lib/commerce/providers/lemonsqueezy'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export const prerender = false

function jsonResponse(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS,
  })
}

export const POST: APIRoute = async ({ request }) => {
  const env = getServerEnv()
  const convexUrl = env.PUBLIC_CONVEX_URL
  if (!convexUrl || convexUrl === 'https://PLACEHOLDER.convex.cloud') {
    return jsonResponse({ message: 'Convex is not configured' }, 500)
  }
  if (!env.SUITE_BRIDGE_CONVEX_SECRET) {
    return jsonResponse({ message: 'Convex bridge secret is not configured' }, 500)
  }

  const webhookSecret = env.LEMONSQUEEZY_WEBHOOK_SECRET
  const body = await request.text()
  const parsed = await parseLemonSqueezyWebhook({
    rawBody: body,
    signature: request.headers.get('x-signature') ?? '',
    eventName: request.headers.get('x-event-name') ?? undefined,
    eventId: request.headers.get('x-event-id') ?? undefined,
    webhookSecret,
  })

  if (!parsed.ok) {
    return new Response(JSON.stringify({ message: parsed.message }), {
      status: parsed.status,
      headers: JSON_HEADERS,
    })
  }

  try {
    const convex = new ConvexHttpClient(convexUrl)
    const result = await convex.mutation(
      'bridge:processCommerceEvent' as never,
      {
        provider: parsed.normalizedEvent.provider,
        offerId: parsed.normalizedEvent.offerId,
        productId: parsed.normalizedEvent.productId,
        plan: parsed.normalizedEvent.plan,
        eventType: parsed.normalizedEvent.eventType,
        environment: parsed.normalizedEvent.environment,
        providerEventId: parsed.normalizedEvent.providerEventId,
        providerOrderId: parsed.normalizedEvent.providerOrderId,
        idempotencyKey: parsed.normalizedEvent.idempotencyKey,
        status: parsed.normalizedEvent.status,
        customerEmail: parsed.normalizedEvent.customerEmail,
        providerCustomerId: parsed.normalizedEvent.providerCustomerId,
        globalUserId: parsed.normalizedEvent.globalUserId,
        sourceRef: parsed.normalizedEvent.sourceRef,
        providerSourceRef: parsed.normalizedEvent.providerSourceRef,
        providerInvoiceId: parsed.normalizedEvent.providerInvoiceId,
        metadata: parsed.normalizedEvent.metadata,
        bridgeSecret: env.SUITE_BRIDGE_CONVEX_SECRET,
      } as never
    )

    return jsonResponse(result, 200)
  } catch (error) {
    console.error('Lemon Squeezy webhook handler failed:', error)
    return jsonResponse({ message: 'Webhook fulfillment failed' }, 500)
  }
}
