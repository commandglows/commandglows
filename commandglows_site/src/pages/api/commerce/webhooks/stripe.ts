import type { APIRoute } from 'astro'
import { ConvexHttpClient } from 'convex/browser'
import { getServerEnv } from '@/lib/serverEnv'
import { parseStripeManagedPaymentsWebhook } from '@/lib/commerce/providers/stripe'
import { stripeMerchant, type StripeBusiness } from '@/lib/commerce/stripeMerchants'

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }

export const prerender = false

function jsonResponse(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS })
}

export async function handleStripeWebhook(request: Request, business: StripeBusiness) {
  const env = getServerEnv()
  const merchant = stripeMerchant(business, env)
  if (!merchant?.webhookSecret) return jsonResponse({ message: 'Stripe merchant is not configured' }, 503)
  const convexUrl = env.PUBLIC_CONVEX_URL
  if (!convexUrl || convexUrl === 'https://PLACEHOLDER.convex.cloud') {
    return jsonResponse({ message: 'Convex is not configured' }, 500)
  }
  if (!env.SUITE_BRIDGE_CONVEX_SECRET) {
    return jsonResponse({ message: 'Convex bridge secret is not configured' }, 500)
  }
  const convex = new ConvexHttpClient(convexUrl)
  const recordFailure = async (event: { providerEventId: string; providerPayloadHash?: string; providerEventType?: string; environment: string }, reason: string) => {
    try {
      await convex.mutation('commerceOperations:recordCommerceIngressFailure' as never, {
        ...event, providerAccountId: merchant.accountId, reason, bridgeSecret: env.SUITE_BRIDGE_CONVEX_SECRET,
      } as never)
    } catch {
      // No payload or provider error details: this is the last-resort hosting alarm.
      console.error('commerce_incident_persistence_failed', { eventId: event.providerEventId, environment: event.environment })
    }
  }

  const parsed = await parseStripeManagedPaymentsWebhook(
    {
      rawBody: await request.text(),
      signature: request.headers.get('stripe-signature') ?? '',
      webhookSecret: merchant.webhookSecret,
    },
    merchant.secretKey,
    merchant.apiVersion,
    undefined,
    merchant
  )

  if (!parsed.ok) {
    if (!parsed.ignored && parsed.verifiedEvent) await recordFailure(parsed.verifiedEvent, 'stripe_dependency_unavailable')
    return jsonResponse({ message: parsed.message }, parsed.status)
  }

  try {
    const event = parsed.normalizedEvent
    const result = await convex.mutation(
      'bridge:processCommerceEvent' as never,
      {
        ...event,
        bridgeSecret: env.SUITE_BRIDGE_CONVEX_SECRET,
      } as never
    )
    return jsonResponse(result, 200)
  } catch {
    const event = parsed.normalizedEvent
    await recordFailure({ providerEventId: event.providerEventId, providerPayloadHash: event.providerPayloadHash,
      providerEventType: event.providerEventType, environment: event.environment }, 'commerce_fulfillment_failed')
    return jsonResponse({ message: 'Webhook fulfillment failed' }, 500)
  }
}

export const POST: APIRoute = async ({ request }) => handleStripeWebhook(request, 'commandglows')
