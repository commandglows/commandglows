import type { APIRoute } from 'astro'
import { ConvexHttpClient } from 'convex/browser'
import { getServerEnv } from '@/lib/serverEnv'
import { parseStripeManagedPaymentsWebhook } from '@/lib/commerce/providers/stripe'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export const prerender = false

function jsonResponse(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS })
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

  const parsed = await parseStripeManagedPaymentsWebhook(
    {
      rawBody: await request.text(),
      signature: request.headers.get('stripe-signature') ?? '',
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    },
    env.STRIPE_SECRET_KEY,
    env.STRIPE_API_VERSION
  )

  if (!parsed.ok) {
    return jsonResponse({ message: parsed.message }, parsed.status)
  }

  try {
    const convex = new ConvexHttpClient(convexUrl)
    const event = parsed.normalizedEvent
    const result = await convex.mutation(
      'bridge:processCommerceEvent' as never,
      {
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
        customerEmail: event.customerEmail,
        providerCustomerId: event.providerCustomerId,
        globalUserId: event.globalUserId,
        sourceRef: event.sourceRef,
        providerSourceRef: event.providerSourceRef,
        providerInvoiceId: event.providerInvoiceId,
        metadata: event.metadata,
        bridgeSecret: env.SUITE_BRIDGE_CONVEX_SECRET,
      } as never
    )
    return jsonResponse(result, 200)
  } catch (error) {
    console.error('Stripe webhook handler failed:', error)
    return jsonResponse({ message: 'Webhook fulfillment failed' }, 500)
  }
}
