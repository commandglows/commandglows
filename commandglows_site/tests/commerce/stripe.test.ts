import Stripe from 'stripe'
import { describe, expect, test, vi } from 'vitest'
import {
  createStripeManagedPaymentsCheckout,
  parseStripeManagedPaymentsWebhook,
} from '@/lib/commerce/providers/stripe'

const webhookSecret = 'whsec_test_commandglows'

function client() {
  return new Stripe('sk_test_commandglows')
}

function signedEvent(stripe: Stripe, payload: Record<string, unknown>) {
  const rawBody = JSON.stringify(payload)
  return {
    rawBody,
    signature: stripe.webhooks.generateTestHeaderString({ payload: rawBody, secret: webhookSecret }),
    webhookSecret,
  }
}

const metadata = {
  offer_id: 'commandglows_app/power',
  product_id: 'commandglows_app',
  plan: 'power',
  source: 'direct',
  source_ref: 'purchase:user_123',
  global_user_id: 'user_123',
  provider: 'stripe',
  managed_payments: 'true',
}

describe('Stripe Managed Payments adapter', () => {
  test('creates a managed checkout with duplicated PaymentIntent metadata', async () => {
    const stripe = client()
    const create = vi.spyOn(stripe.checkout.sessions, 'create').mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.test/session',
    } as Stripe.Checkout.Session)

    const result = await createStripeManagedPaymentsCheckout(
      {
        successUrl: 'https://commandglows.com/purchase/success',
        cancelUrl: 'https://commandglows.com/purchase/cancel',
        metadata: { source: 'direct', source_ref: 'purchase:user_123', global_user_id: 'user_123' },
      },
      'commandglows_app/power',
      { STRIPE_SECRET_KEY: 'sk_test', STRIPE_COMMANDGLOWS_APP_POWER_PRICE_ID: 'price_power' },
      stripe
    )

    expect(result).toMatchObject({ ok: true, provider: 'stripe', providerOrderId: 'cs_test_123' })
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'payment',
      managed_payments: { enabled: true },
      line_items: [{ price: 'price_power', quantity: 1 }],
      metadata: expect.objectContaining(metadata),
      payment_intent_data: { metadata: expect.objectContaining(metadata) },
    }))
  })

  test('rejects an invalid signature', async () => {
    const parsed = await parseStripeManagedPaymentsWebhook(
      { rawBody: '{}', signature: 'invalid', webhookSecret },
      'sk_test'
    )
    expect(parsed).toMatchObject({ ok: false, reason: 'invalid_signature', status: 400 })
  })

  test('normalizes paid checkout completion', async () => {
    const stripe = client()
    const payload = {
      id: 'evt_paid', object: 'event', type: 'checkout.session.completed', livemode: false,
      data: { object: { id: 'cs_paid', object: 'checkout.session', payment_status: 'paid', metadata, customer: 'cus_123', customer_details: { email: 'buyer@example.com' } } },
    }
    const parsed = await parseStripeManagedPaymentsWebhook(signedEvent(stripe, payload), 'sk_test', undefined, stripe)
    expect(parsed.ok && parsed.normalizedEvent).toMatchObject({
      provider: 'stripe', eventType: 'paid', offerId: 'commandglows_app/power',
      providerOrderId: 'cs_paid', globalUserId: 'user_123', environment: 'sandbox',
    })
  })

  test.each([
    ['refund.created', 'refunded'],
    ['charge.dispute.created', 'revoked'],
  ])('normalizes %s to %s through charge metadata', async (type, expectedType) => {
    const stripe = client()
    vi.spyOn(stripe.charges, 'retrieve').mockResolvedValue({ id: 'ch_123', object: 'charge', metadata, customer: 'cus_123', amount: 4900, amount_refunded: 4900 } as Stripe.Charge)
    const object = type === 'refund.created'
      ? { id: 're_123', object: 'refund', status: 'succeeded', charge: 'ch_123' }
      : { id: 'dp_123', object: 'dispute', charge: 'ch_123' }
    const payload = { id: `evt_${expectedType}`, object: 'event', type, livemode: false, data: { object } }
    const parsed = await parseStripeManagedPaymentsWebhook(signedEvent(stripe, payload), 'sk_test', undefined, stripe)
    expect(parsed.ok && parsed.normalizedEvent).toMatchObject({ eventType: expectedType, providerOrderId: 'ch_123', globalUserId: 'user_123' })
  })
})
