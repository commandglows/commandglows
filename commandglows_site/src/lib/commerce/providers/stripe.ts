import Stripe from 'stripe'
import { buildCommerceCheckoutHints, getCommerceOffer, getOfferProviderConfig } from '../offers'
import type {
  CommerceCheckoutRequest,
  CommerceCheckoutResponse,
  CommerceNormalizedEvent,
  CommerceWebhookContext,
  CommerceWebhookParseResult,
} from '../types'

const DEFAULT_STRIPE_API_VERSION: Stripe.LatestApiVersion = '2026-07-29.dahlia'

type ServerEnv = Record<string, string | undefined>

function nonEmpty(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function stripeClient(secretKey: string, apiVersion?: string) {
  return new Stripe(secretKey, {
    apiVersion: (nonEmpty(apiVersion) ?? DEFAULT_STRIPE_API_VERSION) as Stripe.LatestApiVersion,
    httpClient: Stripe.createFetchHttpClient(),
  })
}

function metadataFromRequest(offerId: string, request: CommerceCheckoutRequest) {
  const offer = getCommerceOffer(offerId)
  if (!offer) return null

  const hints = buildCommerceCheckoutHints(offer, request)
  return Object.fromEntries(
    Object.entries({
      ...hints,
      provider: 'stripe',
      managed_payments: 'true',
    }).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0)
  )
}

export async function createStripeManagedPaymentsCheckout(
  request: Omit<CommerceCheckoutRequest, 'offerId'>,
  offerId: string,
  env: ServerEnv,
  client?: Stripe
): Promise<CommerceCheckoutResponse> {
  const offer = getCommerceOffer(offerId)
  const config = getOfferProviderConfig(offerId, 'stripe', env)
  if (!offer) {
    return { ok: false, code: 'offer_not_found', message: 'Offer not found' }
  }
  if (!env.STRIPE_SECRET_KEY || !config?.priceId) {
    return { ok: false, code: 'provider_not_configured', message: 'Stripe Managed Payments is not configured' }
  }
  if (!request.successUrl || !request.cancelUrl) {
    return { ok: false, code: 'bad_request', message: 'Missing checkout redirect URLs' }
  }

  const metadata = metadataFromRequest(offerId, { ...request, offerId })
  if (!metadata) {
    return { ok: false, code: 'offer_not_found', message: 'Offer not found' }
  }

  const publicCode = env.STRIPE_COMMANDGLOWS_FOUNDER_DISCOUNT_CODE ?? 'FOUNDER'
  const promotionCodeId =
    request.discountCode === publicCode
      ? nonEmpty(env.STRIPE_COMMANDGLOWS_FOUNDER_PROMOTION_CODE_ID)
      : undefined

  try {
    const stripe = client ?? stripeClient(env.STRIPE_SECRET_KEY, env.STRIPE_API_VERSION)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      managed_payments: { enabled: true },
      line_items: [{ price: config.priceId, quantity: 1 }],
      success_url: request.successUrl,
      cancel_url: request.cancelUrl,
      customer_email: request.customerEmail,
      metadata,
      payment_intent_data: { metadata },
      ...(promotionCodeId ? { discounts: [{ promotion_code: promotionCodeId }] } : {}),
    })

    if (!session.url) {
      return { ok: false, code: 'provider_error', message: 'Stripe did not return a checkout URL' }
    }
    return {
      ok: true,
      provider: 'stripe',
      checkoutUrl: session.url,
      providerOrderId: session.id,
    }
  } catch (error) {
    console.error('Stripe Managed Payments checkout failed:', error)
    return { ok: false, code: 'provider_error', message: 'Stripe checkout creation failed' }
  }
}

function metadataRecord(value: Stripe.Metadata | null | undefined): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  )
}

function customerId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | undefined {
  return typeof value === 'string' ? value : value?.id
}

function normalized(
  event: Stripe.Event,
  eventType: CommerceNormalizedEvent['eventType'],
  providerOrderId: string,
  metadata: Record<string, string>,
  details: { email?: string; customer?: string; invoice?: string } = {},
  status: CommerceNormalizedEvent['status'] = 'applied'
): CommerceNormalizedEvent | null {
  const offerId = nonEmpty(metadata.offer_id)
  const productId = nonEmpty(metadata.product_id)
  const plan = nonEmpty(metadata.plan)
  if (!offerId || !productId || !plan) return null

  return {
    provider: 'stripe',
    offerId,
    productId,
    plan,
    eventType,
    environment: event.livemode ? 'production' : 'sandbox',
    providerEventId: event.id,
    providerOrderId,
    idempotencyKey: `stripe:${event.type}:${event.id}`,
    status,
    customerEmail: details.email,
    providerCustomerId: details.customer,
    globalUserId: nonEmpty(metadata.global_user_id),
    sourceRef: nonEmpty(metadata.source_ref) ?? providerOrderId,
    providerSourceRef: providerOrderId,
    providerInvoiceId: details.invoice,
    metadata,
  }
}

async function chargeFor(
  stripe: Stripe,
  charge: string | Stripe.Charge | null
): Promise<Stripe.Charge | null> {
  if (!charge) return null
  if (typeof charge !== 'string') return charge
  return stripe.charges.retrieve(charge)
}

export async function parseStripeManagedPaymentsWebhook(
  context: CommerceWebhookContext,
  secretKey?: string,
  apiVersion?: string,
  client?: Stripe
): Promise<CommerceWebhookParseResult> {
  if (!context.webhookSecret || !context.signature) {
    return { ok: false, ignored: false, reason: 'invalid_signature', message: 'Missing Stripe webhook signature configuration', status: 400 }
  }
  if (!secretKey && !client) {
    return { ok: false, ignored: false, reason: 'invalid_provider', message: 'Stripe is not configured', status: 500 }
  }

  const stripe = client ?? stripeClient(secretKey!, apiVersion)
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(context.rawBody, context.signature, context.webhookSecret)
  } catch {
    return { ok: false, ignored: false, reason: 'invalid_signature', message: 'Invalid Stripe webhook signature', status: 400 }
  }

  let result: CommerceNormalizedEvent | null = null
  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object
      if (session.payment_status === 'paid') {
        result = normalized(event, 'paid', session.id, metadataRecord(session.metadata), {
          email: nonEmpty(session.customer_details?.email) ?? nonEmpty(session.customer_email),
          customer: customerId(session.customer),
          invoice: typeof session.invoice === 'string' ? session.invoice : session.invoice?.id,
        })
      }
    } else if (event.type === 'refund.created' || event.type === 'refund.updated') {
      const refund = event.data.object
      const charge = await chargeFor(stripe, refund.charge)
      if (charge && refund.status !== 'failed' && refund.status !== 'canceled') {
        const isFullSuccessfulRefund =
          refund.status === 'succeeded' && charge.amount_refunded >= charge.amount
        result = normalized(
          event,
          isFullSuccessfulRefund ? 'refunded' : 'pending_review',
          charge.id,
          metadataRecord(charge.metadata),
          { customer: customerId(charge.customer) },
          isFullSuccessfulRefund ? 'applied' : 'pending_review'
        )
      }
    } else if (event.type === 'charge.dispute.created') {
      const dispute = event.data.object
      const charge = await chargeFor(stripe, dispute.charge)
      if (charge) {
        result = normalized(event, 'revoked', charge.id, metadataRecord(charge.metadata), {
          customer: customerId(charge.customer),
        })
      }
    } else {
      return { ok: false, ignored: true, reason: 'ignored_event', message: 'Stripe event is not part of the entitlement lifecycle', eventType: event.type, status: 200 }
    }
  } catch {
    return { ok: false, ignored: false, reason: 'invalid_event', message: 'Stripe event dependency could not be resolved', eventType: event.type, status: 500 }
  }

  if (!result) {
    return { ok: false, ignored: false, reason: 'invalid_event', message: 'Stripe event is unpaid or missing commerce metadata', eventType: event.type, status: 422 }
  }
  return { ok: true, parsed: true, ignored: false, normalizedEvent: result }
}
