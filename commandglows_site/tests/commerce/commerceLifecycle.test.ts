import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest'
import Stripe from 'stripe'
import { convexTest } from 'convex-test'
import schema from '../../convex/schema'
import { api, internal } from '../../convex/_generated/api'
import { normalizeVerifiedStripeEvent, parseStripeManagedPaymentsWebhook, stripeEventPayloadHash } from '../../src/lib/commerce/providers/stripe'

const modules = import.meta.glob('../../convex/**/*.ts')
const secret = 'synthetic-commerce-secret'
const metadata = { offer_id: 'communityglows/lifetime_deal', product_id: 'communityglows', plan: 'lifetime_deal',
  global_user_id: 'gu_buyer', source_ref: 'suite-checkout:lifecycle' }
const session = { id: 'cs_lifecycle', payment_intent: 'pi_lifecycle', payment_status: 'paid',
  amount_total: 100, currency: 'eur', metadata }

async function fixture() {
  const t = convexTest(schema, modules)
  const stripe = new Stripe('sk_test_synthetic')
  const charge = { id: 'ch_lifecycle', payment_intent: 'pi_lifecycle', amount: 100, amount_refunded: 0,
    currency: 'eur', metadata }
  const retrieve = vi.spyOn(stripe.charges, 'retrieve').mockImplementation(async () => charge as unknown as Stripe.Charge)
  await t.run(async (ctx) => {
    await ctx.db.insert('globalUsers', { globalUserId: 'gu_buyer', createdAt: 1, updatedAt: 1 })
    await ctx.db.insert('commerceCheckoutHandoffs', { jtiHash: 'hash', idempotencyKey: metadata.source_ref,
      globalUserId: metadata.global_user_id, productId: metadata.product_id, offerId: metadata.offer_id,
      environment: 'sandbox', status: 'completed', providerOrderId: session.id,
      expiresAt: 9999999999999, createdAt: 1, updatedAt: 1 })
  })
  const rawEvent = (id: string, type: string, object: unknown, created: number) =>
    ({ id, object: 'event', type, livemode: false, created, data: { object } }) as Stripe.Event
  const deliver = async (id: string, type: string, object: unknown, created = 100) => {
    const event = rawEvent(id, type, object, created)
    const rawBody = JSON.stringify(event)
    const parsed = await parseStripeManagedPaymentsWebhook({ rawBody, webhookSecret: 'whsec_lifecycle',
      signature: stripe.webhooks.generateTestHeaderString({ payload: rawBody, secret: 'whsec_lifecycle' }) }, undefined, undefined, stripe)
    if (!parsed.ok) throw new Error(parsed.reason)
    return t.mutation(api.bridge.processCommerceEvent, { ...parsed.normalizedEvent, bridgeSecret: secret })
  }
  const pay = () => deliver('evt_paid', 'checkout.session.completed', session)
  const refund = (id: string, amount: number, status = 'succeeded', created = 200, eventId = `evt_${id}_${status}`) =>
    deliver(eventId, 'refund.updated', { id, charge: charge.id, amount, currency: 'eur', status }, created)
  const dispute = (id: string, status: string, created = 200, eventId = `evt_${id}_${status}`) =>
    deliver(eventId, ['won', 'lost', 'warning_closed', 'prevented'].includes(status) ? 'charge.dispute.closed' : 'charge.dispute.created',
      { id, charge: charge.id, status }, created)
  const rows = () => t.run((ctx) => ctx.db.query('productEntitlements').collect())
  return { t, stripe, charge, retrieve, deliver, pay, refund, dispute, rows, rawEvent }
}

beforeEach(() => { vi.stubEnv('SUITE_BRIDGE_CONVEX_SECRET', secret); vi.stubEnv('SUITE_BRIDGE_ENVIRONMENT', 'sandbox') })
afterEach(() => vi.unstubAllEnvs())

describe('purchase lifecycle through signed Stripe events and Convex', () => {
  test('successive refunds reach full exactly once; replay survives changed enrichment', async () => {
    const f = await fixture()
    await f.pay()
    expect(await f.refund('re_first', 40)).toMatchObject({ status: 'granted', reason: 'commerce_partial_refund' })
    const receipt = (await f.t.run((ctx) => ctx.db.query('commerceEventReceipts').collect()))[1]
    f.charge.amount_refunded = 100
    expect(await f.refund('re_second', 60)).toMatchObject({ status: 'revoked', reason: 'commerce_full_refund' })
    f.charge.metadata = { ...metadata, global_user_id: 'gu_changed_after_delivery' }
    expect(await f.refund('re_first', 40)).toMatchObject({ alreadyProcessed: true, status: 'granted' })
    expect(await f.t.run((ctx) => ctx.db.get(receipt._id))).toEqual(receipt)
    expect((await f.rows()).map((row) => row.status)).toEqual(['revoked'])
  })

  test('two event types for one refund never double count', async () => {
    const f = await fixture(); await f.pay()
    await f.refund('re_one', 60)
    expect(await f.deliver('evt_created', 'refund.created', { id: 're_one', charge: f.charge.id,
      amount: 60, currency: 'eur', status: 'succeeded' }, 199)).toMatchObject({ status: 'granted' })
    expect((await f.rows())[0].status).toBe('active')
  })

  test.each(['pending', 'failed', 'canceled', 'requires_action'])('%s refunds preserve paid access', async (status) => {
    const f = await fixture(); await f.pay()
    expect(await f.refund('re_one', 100, status)).toMatchObject({ status: 'granted' })
    expect((await f.rows())[0].status).toBe('active')
  })

  test('newer failed refund reverses only its own prior successful refund', async () => {
    const f = await fixture(); await f.pay()
    await f.refund('re_one', 100)
    expect(await f.refund('re_one', 100, 'failed', 201)).toMatchObject({ status: 'granted', reason: 'refund_failed' })
    expect((await f.rows())[0].status).toBe('active')
  })

  test.each(['won', 'warning_closed', 'prevented'])('a %s dispute restores the same entitlement', async (status) => {
    const f = await fixture(); await f.pay()
    const original = (await f.rows())[0]
    expect(await f.dispute('dp_one', 'needs_response')).toMatchObject({ status: 'suspended' })
    expect((await f.rows())[0].status).toBe('suspended')
    expect(await f.dispute('dp_one', status, 201)).toMatchObject({ status: 'granted' })
    expect(await f.rows()).toEqual([expect.objectContaining({ _id: original._id, status: 'active', grantedAt: original.grantedAt })])
  })

  test.each(['lost', 'under_review'])('another %s dispute blocks restoration', async (status) => {
    const f = await fixture(); await f.pay()
    await f.dispute('dp_one', 'needs_response')
    await f.dispute('dp_two', status)
    expect(await f.dispute('dp_one', 'won', 201)).toMatchObject({ status: status === 'lost' ? 'revoked' : 'suspended' })
    expect((await f.rows())[0].status).not.toBe('active')
  })

  test('a full refund still blocks a won dispute and a delayed paid event', async () => {
    const f = await fixture(); await f.pay()
    await f.dispute('dp_one', 'needs_response'); await f.refund('re_one', 100)
    expect(await f.dispute('dp_one', 'won', 201)).toMatchObject({ status: 'revoked' })
    expect(await f.deliver('evt_paid_async', 'checkout.session.async_payment_succeeded', session, 99)).toMatchObject({ status: 'revoked' })
  })

  test('closed dispute delivered before stale creation remains closed', async () => {
    const f = await fixture(); await f.pay()
    await f.dispute('dp_one', 'won', 201)
    expect(await f.dispute('dp_one', 'needs_response', 200)).toMatchObject({ status: 'granted' })
  })

  test('terminal status wins within one second but conflicting terminals require review', async () => {
    const f = await fixture(); await f.pay()
    await f.dispute('dp_one', 'won')
    expect(await f.dispute('dp_one', 'needs_response')).toMatchObject({ status: 'granted' })
    expect(await f.dispute('dp_one', 'lost')).toMatchObject({ status: 'pending_review', reason: 'conflicting_dispute_evidence' })
    expect((await f.rows())[0].status).toBe('suspended')
  })

  test('out-of-order negative and paid events recover safely without granting refunded access', async () => {
    const f = await fixture()
    const refund = await f.refund('re_one', 100)
    expect(refund).toMatchObject({ status: 'pending_review', reason: 'purchase_payment_reference_missing' })
    const paid = await f.pay()
    expect(paid.status).toBe('pending_review')
    expect(await f.t.mutation(internal.bridge.retryPendingCommerceEvent, { receiptId: refund.receiptId,
      expectedAttempts: 1, operatorId: 'operator', reason: 'Binding verified', dryRun: false })).toMatchObject({ status: 'revoked' })
    expect(await f.rows()).toHaveLength(0)
  })

  test.each([['lost', 'won'], ['won', 'lost']])('contradictory closed outcomes %s then %s require review across timestamps', async (first, second) => {
    const f = await fixture(); await f.pay()
    await f.dispute('dp_one', first, 200)
    expect(await f.dispute('dp_one', second, 201)).toMatchObject({ status: 'pending_review', reason: 'conflicting_dispute_evidence' })
    expect((await f.rows())[0].status).toBe('suspended')
  })

  test('a qualified receipt cannot mask a legacy terminal audit with the same provider event ID', async () => {
    const f = await fixture()
    await f.t.run(async (ctx) => {
      const handoff = (await ctx.db.query('commerceCheckoutHandoffs').collect())[0]
      await ctx.db.patch(handoff._id, { providerPaymentIntentId: 'pi_lifecycle' })
      await ctx.db.insert('productAccessEvents', { source: 'suite_commerce', eventType: 'suite_commerce.revoked',
        eventId: 'evt_old', sourceRef: `communityglows:${metadata.source_ref}`, environment: 'sandbox', productId: 'communityglows',
        status: 'pending_review', reason: 'missing_global_user_for_revoke', idempotencyKey: 'stripe:legacy:evt_old', createdAt: 1 })
    })
    expect(await f.dispute('dp_one', 'won', 200, 'evt_old')).toMatchObject({ status: 'revoked' })
    expect(await f.pay()).toMatchObject({ status: 'revoked', reason: 'purchase_already_revoked' })
    expect(await f.rows()).toHaveLength(0)
  })

  test('won dispute cannot undo an external revocation', async () => {
    const f = await fixture(); await f.pay()
    await f.dispute('dp_one', 'needs_response')
    await f.t.run(async (ctx) => {
      const entitlement = (await ctx.db.query('productEntitlements').collect())[0]
      await ctx.db.patch(entitlement._id, { status: 'revoked' })
    })
    expect(await f.dispute('dp_one', 'won', 201)).toMatchObject({ status: 'revoked', reason: 'purchase_already_revoked' })
  })

  test('a dispute on another payment never suspends this purchase', async () => {
    const f = await fixture(); await f.pay()
    f.charge.payment_intent = 'pi_other'
    expect(await f.dispute('dp_other', 'needs_response')).toMatchObject({ status: 'pending_review', reason: 'purchase_payment_reference_mismatch' })
    expect((await f.rows())[0].status).toBe('active')
  })

  test('delayed checkout remains non-granting until signed payment succeeds', async () => {
    const f = await fixture()
    expect(await f.deliver('evt_pending', 'checkout.session.completed', { ...session, payment_status: 'unpaid' })).toMatchObject({ status: 'awaiting_payment' })
    expect(await f.rows()).toHaveLength(0)
    expect(await f.deliver('evt_async', 'checkout.session.async_payment_succeeded', session)).toMatchObject({ status: 'granted' })
    expect(await f.deliver('evt_expired', 'checkout.session.expired', session)).toMatchObject({ status: 'ignored' })
  })

  test.each(['checkout.session.async_payment_failed', 'checkout.session.expired'])('%s is recorded without granting', async (type) => {
    const f = await fixture()
    expect(await f.deliver('evt_checkout', type, session)).toMatchObject({ status: type.endsWith('expired') ? 'checkout_expired' : 'payment_failed' })
    expect(await f.rows()).toHaveLength(0)
  })

  test('missing metadata becomes a durable review incident instead of a grant', async () => {
    const f = await fixture()
    const result = await f.deliver('evt_missing', 'checkout.session.completed', { ...session, metadata: {} })
    expect(result.status).toBe('pending_review')
    expect(await f.t.run((ctx) => ctx.db.query('commerceIncidents').collect())).toHaveLength(1)
    expect(await f.rows()).toHaveLength(0)
  })

  test('provider retrieval failure reports only verified incident identifiers', async () => {
    const f = await fixture()
    f.retrieve.mockRejectedValueOnce(new Error('provider unavailable'))
    const event = f.rawEvent('evt_failure', 'refund.updated', { id: 're_one', charge: f.charge.id }, 200)
    const result = await normalizeVerifiedStripeEvent(event, f.stripe)
    expect(result).toMatchObject({ ok: false, status: 500, verifiedEvent: {
      providerEventId: 'evt_failure', environment: 'sandbox', providerPayloadHash: stripeEventPayloadHash(event) } })
    expect(JSON.stringify(result)).not.toContain(metadata.global_user_id)
  })

  test('event digest ignores delivery counters, JSON order and enrichment but protects evidence', async () => {
    const f = await fixture()
    const event = f.rawEvent('evt_digest', 'checkout.session.completed', session, 100)
    expect(stripeEventPayloadHash({ ...event, pending_webhooks: 0 })).toBe(stripeEventPayloadHash({ ...event, pending_webhooks: 2 }))
    expect(stripeEventPayloadHash({ ...event, data: { object: { ...session, payment_status: 'unpaid' } } } as Stripe.Event)).not.toBe(stripeEventPayloadHash(event))
  })
})
