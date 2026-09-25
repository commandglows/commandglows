import Stripe from 'stripe'
import { describe, expect, test, vi } from 'vitest'
import {
  createStripeManagedPaymentsCheckout,
  parseStripeManagedPaymentsWebhook,
} from '@/lib/commerce/providers/stripe'

const webhookSecret = 'whsec_test_commandglows'

function client() {
  const stripe = new Stripe('sk_test_commandglows')
  vi.spyOn(stripe.accounts, 'retrieve').mockResolvedValue({ id: 'acct_commandglows123' } as Stripe.Account)
  return stripe
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
  business_id: 'commandglows',
  provider_account_id: 'acct_commandglows123',
}
const merchant = { business: 'commandglows' as const, accountId: 'acct_commandglows123' }

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
      { STRIPE_SECRET_KEY: 'sk_test', STRIPE_COMMANDGLOWS_ACCOUNT_ID: merchant.accountId, STRIPE_COMMANDGLOWS_APP_POWER_PRICE_ID: 'price_power' },
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

  test('refuses a key from a different merchant account before creating checkout', async () => {
    const stripe = client()
    const create = vi.spyOn(stripe.checkout.sessions, 'create')
    const result = await createStripeManagedPaymentsCheckout({ successUrl: 'https://example.test/success',
      cancelUrl: 'https://example.test/cancel' }, 'commandglows_app/power', {
      STRIPE_SECRET_KEY: 'sk_test', STRIPE_COMMANDGLOWS_ACCOUNT_ID: 'acct_other123',
      STRIPE_COMMANDGLOWS_APP_POWER_PRICE_ID: 'price_power',
    }, stripe)
    expect(result).toMatchObject({ ok: false, code: 'provider_not_configured' })
    expect(create).not.toHaveBeenCalled()
  })

  test('does not send the CommandGlows founder promotion to CommunityGlows', async () => {
    const stripe = new Stripe('sk_test_communityglows')
    vi.spyOn(stripe.accounts, 'retrieve').mockResolvedValue({ id: 'acct_communityglows123' } as Stripe.Account)
    const create = vi.spyOn(stripe.checkout.sessions, 'create').mockResolvedValue({
      id: 'cs_test_community', url: 'https://checkout.stripe.test/community',
    } as Stripe.Checkout.Session)
    const result = await createStripeManagedPaymentsCheckout({
      successUrl: 'https://communityglows.com/success', cancelUrl: 'https://communityglows.com/cancel',
      discountCode: 'FOUNDER',
    }, 'communityglows/lifetime_deal', {
      STRIPE_COMMUNITYGLOWS_SECRET_KEY: 'sk_test_communityglows',
      STRIPE_COMMUNITYGLOWS_ACCOUNT_ID: 'acct_communityglows123',
      STRIPE_COMMUNITYGLOWS_LIFETIME_DEAL_PRICE_ID: 'price_community',
      STRIPE_COMMANDGLOWS_FOUNDER_PROMOTION_CODE_ID: 'promo_commandglows',
    }, stripe)
    expect(result.ok).toBe(true)
    expect(create).toHaveBeenCalledWith(expect.not.objectContaining({ discounts: expect.anything() }))
  })

  test('refuses to map two businesses to the same Stripe account', async () => {
    const stripe = client()
    const create = vi.spyOn(stripe.checkout.sessions, 'create')
    const result = await createStripeManagedPaymentsCheckout({ successUrl: 'https://example.test/success',
      cancelUrl: 'https://example.test/cancel' }, 'commandglows_app/power', {
      STRIPE_SECRET_KEY: 'sk_test', STRIPE_COMMANDGLOWS_ACCOUNT_ID: merchant.accountId,
      STRIPE_COMMUNITYGLOWS_ACCOUNT_ID: merchant.accountId, STRIPE_COMMANDGLOWS_APP_POWER_PRICE_ID: 'price_power',
    }, stripe)
    expect(result).toMatchObject({ ok: false, code: 'provider_not_configured' })
    expect(create).not.toHaveBeenCalled()
  })

  test('keeps mismatched signed merchant metadata non-granting', async () => {
    const stripe = client()
    const parsed = await parseStripeManagedPaymentsWebhook(signedEvent(stripe, {
      id: 'evt_wrong_merchant', type: 'checkout.session.completed', livemode: false,
      data: { object: { id: 'cs_wrong', payment_status: 'paid', metadata: {
        ...metadata, business_id: 'communityglows', provider_account_id: 'acct_communityglows123',
      } } },
    }), 'sk_test', undefined, stripe, merchant)
    expect(parsed.ok && parsed.normalizedEvent).toMatchObject({ status: 'pending_review', eventType: 'pending_review' })
  })

  test('rejects a signed webhook when its Stripe key resolves to another account', async () => {
    const stripe = client()
    vi.mocked(stripe.accounts.retrieve).mockResolvedValue({ id: 'acct_other123' } as Stripe.Account)
    const parsed = await parseStripeManagedPaymentsWebhook(signedEvent(stripe, {
      id: 'evt_wrong_account', type: 'checkout.session.completed', livemode: false,
      data: { object: { id: 'cs_wrong', payment_status: 'paid', metadata } },
    }), 'sk_test', undefined, stripe, merchant)
    expect(parsed).toMatchObject({ ok: false, reason: 'invalid_provider', status: 500,
      verifiedEvent: { providerEventId: 'evt_wrong_account' } })
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
      data: { object: { id: 'cs_paid', object: 'checkout.session', payment_status: 'paid', payment_intent: 'pi_123', metadata, customer: 'cus_123', customer_details: { email: 'buyer@example.com' } } },
    }
    const parsed = await parseStripeManagedPaymentsWebhook(signedEvent(stripe, payload), 'sk_test', undefined, stripe, merchant)
    expect(parsed.ok && parsed.normalizedEvent).toMatchObject({
      provider: 'stripe', eventType: 'paid', offerId: 'commandglows_app/power',
      providerOrderId: 'cs_paid', providerPaymentIntentId: 'pi_123', globalUserId: 'user_123', environment: 'sandbox',
    })
  })

  test('does not invent a purchase reference when signed metadata is incomplete', async () => {
    const stripe = client()
    const { source_ref: _source, ...incomplete } = metadata
    const parsed = await parseStripeManagedPaymentsWebhook(signedEvent(stripe, {
      id: 'evt_missing_ref', type: 'checkout.session.completed', livemode: false,
      data: { object: { id: 'cs_missing_ref', payment_status: 'paid', payment_intent: 'pi_123', metadata: incomplete } },
    }), undefined, undefined, stripe, merchant)
    expect(parsed.ok && parsed.normalizedEvent.sourceRef).toBeUndefined()
  })

  test.each([
    ['refund.created', 'refund_updated'],
    ['charge.dispute.created', 'dispute_updated'],
  ])('normalizes %s to %s through charge metadata', async (type, expectedType) => {
    const stripe = client()
    vi.spyOn(stripe.charges, 'retrieve').mockResolvedValue({ id: 'ch_123', object: 'charge', metadata, customer: 'cus_123', amount: 4900, amount_refunded: 4900 } as Stripe.Charge)
    const object = type === 'refund.created'
      ? { id: 're_123', object: 'refund', status: 'succeeded', charge: 'ch_123', amount: 4900, currency: 'eur' }
      : { id: 'dp_123', object: 'dispute', charge: 'ch_123', status: 'needs_response' }
    const payload = { id: `evt_${expectedType}`, object: 'event', type, livemode: false, data: { object } }
    const parsed = await parseStripeManagedPaymentsWebhook(signedEvent(stripe, payload), 'sk_test', undefined, stripe, merchant)
    expect(parsed.ok && parsed.normalizedEvent).toMatchObject({ eventType: expectedType, providerOrderId: 'ch_123', globalUserId: 'user_123' })
  })
})
