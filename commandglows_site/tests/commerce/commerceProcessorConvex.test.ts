import { convexTest } from 'convex-test'
import { api, internal } from '../../convex/_generated/api'
import schema from '../../convex/schema'
import type { Id } from '../../convex/_generated/dataModel'
import type { CommerceEventEnvelope } from '../../convex/commerceEventContract'
import Stripe from 'stripe'
import { parseStripeManagedPaymentsWebhook } from '../../src/lib/commerce/providers/stripe'

const modules = import.meta.glob('../../convex/**/*.ts')
const secret = 'synthetic-commerce-secret'
const backend = () => convexTest(schema, modules)
type Backend = ReturnType<typeof backend>

function event(overrides: Partial<CommerceEventEnvelope> = {}): CommerceEventEnvelope & { bridgeSecret: string } {
  return {
    provider: 'stripe', environment: 'sandbox', productId: 'communityglows',
    offerId: 'communityglows/lifetime_deal', plan: 'lifetime_deal', eventType: 'paid', status: 'applied',
    sourceRef: 'suite-checkout:synthetic-a', providerOrderId: 'cs_a', providerPaymentIntentId: 'pi_a',
    providerEventId: 'evt_a', idempotencyKey: 'stripe:paid:evt_a', globalUserId: 'gu_a',
    bridgeSecret: secret, ...overrides,
  }
}

async function seed(t: Backend, input = event(), options: { missingUser?: boolean; unboundPayment?: boolean; claimed?: boolean } = {}) {
  return t.run(async (ctx) => {
    const now = Date.now()
    const users = await ctx.db.query('globalUsers').collect()
    if (!options.missingUser && !users.some((row) => row.globalUserId === input.globalUserId)) {
      await ctx.db.insert('globalUsers', { globalUserId: input.globalUserId!, createdAt: now, updatedAt: now })
    }
    return ctx.db.insert('commerceCheckoutHandoffs', {
      jtiHash: input.sourceRef!, idempotencyKey: input.sourceRef!, globalUserId: input.globalUserId!,
      productId: input.productId, offerId: input.offerId, environment: input.environment,
      status: options.claimed ? 'claimed' : 'completed', providerOrderId: input.providerOrderId,
      providerPaymentIntentId: options.unboundPayment ? undefined : input.providerPaymentIntentId,
      expiresAt: now - 1000, createdAt: now, updatedAt: now,
    })
  })
}
const rows = (t: Backend) => t.run((ctx) => ctx.db.query('productEntitlements').collect())
const retry = (t: Backend, receiptId: Id<'commerceEventReceipts'>, expectedAttempts = 1, dryRun = false) =>
  t.mutation(internal.bridge.retryPendingCommerceEvent, { receiptId, expectedAttempts, dryRun,
    operatorId: 'synthetic-operator', reason: 'Verified local purchase reconciliation' })

beforeEach(() => {
  vi.stubEnv('SUITE_BRIDGE_CONVEX_SECRET', secret)
  vi.stubEnv('SUITE_BRIDGE_ENVIRONMENT', 'test')
})
afterEach(() => vi.unstubAllEnvs())

describe.each([
  ['central', api.bridge.processCommerceEvent],
  ['CommunityGlows compatibility', api.bridge.processCommunityGlowsCommerceEvent],
] as const)('%s processor', (_name, processor) => {
  test('uses one ledger across entrypoints and ignores marketing channel for grant uniqueness', async () => {
    const t = backend()
    await seed(t)
    const first = await t.mutation(processor, event())
    expect(first).toMatchObject({ status: 'granted', snapshot: { hasAccess: true } })
    expect(await t.mutation(api.bridge.processCommerceEvent, event())).toMatchObject({ alreadyProcessed: true })
    await t.mutation(processor, { ...event({ providerEventId: 'evt_second', idempotencyKey: 'second' }), metadata: { source: 'partner' } })
    expect(await rows(t)).toHaveLength(1)
  })

  test('revokes only the bound purchase and retains a second purchase and trial', async () => {
    const t = backend()
    await seed(t)
    const second = event({ sourceRef: 'suite-checkout:b', providerOrderId: 'cs_b', providerPaymentIntentId: 'pi_b', providerEventId: 'evt_b', idempotencyKey: 'b' })
    await seed(t, second)
    await t.mutation(processor, event())
    await t.mutation(processor, second)
    await t.run(async (ctx) => {
      const owner = (await ctx.db.query('globalUsers').collect())[0]
      await ctx.db.insert('productEntitlements', { globalUserId: owner._id, productId: 'communityglows',
        plan: 'trial', source: 'product_trial', sourceRef: event().sourceRef, environment: 'sandbox',
        status: 'active', idempotencyKey: 'trial', createdAt: 1, updatedAt: 1 })
    })
    const refund = event({ eventType: 'refunded', providerOrderId: 'ch_a', providerEventId: 'evt_refund', idempotencyKey: 'refund' })
    expect(await t.mutation(processor, refund)).toMatchObject({ status: 'revoked', snapshot: { hasAccess: true } })
    expect(await t.mutation(processor, refund)).toMatchObject({ alreadyProcessed: true })
    expect((await rows(t)).map((row) => row.status).sort()).toEqual(['active', 'active', 'revoked'])
  })

  test.each([
    [{ globalUserId: 'gu_other' }, 'purchase_context_mismatch'],
    [{ sourceRef: undefined }, 'missing_purchase_reference'],
    [{ sourceRef: 'unknown' }, 'purchase_not_found'],
    [{ providerOrderId: 'cs_other' }, 'checkout_not_completed_or_mismatched'],
    [{ providerPaymentIntentId: 'pi_other' }, 'purchase_payment_reference_mismatch'],
    [{ providerPaymentIntentId: undefined }, 'missing_payment_reference'],
    [{ offerId: 'communityglows/unknown' }, 'unsupported_offer'],
    [{ environment: 'production' }, 'environment_mismatch'],
    [{ environment: 'typo' }, 'environment_mismatch'],
    [{ provider: 'polar' }, 'provider_not_allowed'],
  ] as const)('fails closed for %j', async (change, reason) => {
    const t = backend()
    await seed(t)
    expect(await t.mutation(processor, event(change))).toMatchObject({ ok: false, status: 'pending_review', reason })
    expect(await rows(t)).toHaveLength(0)
  })

  test('pending or foreign payment refunds cannot alter active access', async () => {
    const t = backend()
    await seed(t)
    await t.mutation(processor, event())
    for (const change of [
      { eventType: 'pending_review' as const, status: 'pending_review' as const },
      { eventType: 'refunded' as const, providerPaymentIntentId: 'pi_foreign' },
    ]) {
      await t.mutation(processor, event({ ...change, providerOrderId: 'ch_a', providerEventId: `evt_${change.eventType}`, idempotencyKey: change.eventType }))
    }
    expect((await rows(t))[0].status).toBe('active')
  })

  test('requires the bridge secret before writing anything', async () => {
    const t = backend()
    await expect(t.mutation(processor, { ...event(), bridgeSecret: 'wrong' })).rejects.toThrow('bridge_secret_mismatch')
    expect(await t.run((ctx) => ctx.db.query('commerceEventReceipts').collect())).toHaveLength(0)
  })
})

describe('immutable receipt recovery and historical isolation', () => {
  test('staging aliases sandbox for completion uniqueness and access snapshots', async () => {
    const t = backend()
    await seed(t)
    const staged = event({ environment: 'staging', sourceRef: 'suite-checkout:staging', providerOrderId: 'cs_stage',
      providerPaymentIntentId: 'pi_stage', providerEventId: 'evt_stage', idempotencyKey: 'stage' })
    await seed(t, staged, { claimed: true })
    await expect(t.mutation(api.bridge.completeCommerceCheckoutHandoff, {
      jtiHash: staged.sourceRef!, globalUserId: staged.globalUserId!, productId: staged.productId,
      offerId: staged.offerId, environment: staged.environment, providerOrderId: 'cs_a',
      checkoutUrl: 'https://checkout.stripe.test/a', bridgeSecret: secret,
    })).rejects.toThrow('checkout_session_already_bound')
    await t.mutation(api.bridge.completeCommerceCheckoutHandoff, {
      jtiHash: staged.sourceRef!, globalUserId: staged.globalUserId!, productId: staged.productId,
      offerId: staged.offerId, environment: staged.environment, providerOrderId: 'cs_stage',
      checkoutUrl: 'https://checkout.stripe.test/stage', bridgeSecret: secret,
    })
    expect(await t.mutation(api.bridge.processCommerceEvent, staged)).toMatchObject({ snapshot: { hasAccess: true } })
  })

  test('historical provider event IDs cannot be rebound to another purchase', async () => {
    const t = backend()
    await seed(t)
    await t.run((ctx) => ctx.db.insert('productAccessEvents', {
      source: 'suite_commerce', eventType: 'commandglows_app_access.granted', eventId: 'evt_a',
      sourceRef: 'commandglows_app:old', idempotencyKey: 'stripe:old', environment: 'sandbox',
      productId: 'commandglows_app', status: 'granted', createdAt: 1,
    }))
    await expect(t.mutation(api.bridge.processCommerceEvent, event())).rejects.toThrow('commerce_event_binding_conflict')
    expect(await rows(t)).toHaveLength(0)
  })
  test.each(['refund.created', 'charge.dispute.created'])('signed %s follows the same PaymentIntent from parser to ledger', async (type) => {
    const t = backend()
    await seed(t, event(), { unboundPayment: true })
    const stripe = new Stripe('sk_test_synthetic')
    const metadata = { offer_id: event().offerId, product_id: event().productId, plan: event().plan,
      global_user_id: 'gu_a', source_ref: event().sourceRef! }
    const deliver = async (eventType: string, object: unknown) => {
      const rawBody = JSON.stringify({ id: `evt_${eventType}`, type: eventType, object: 'event', livemode: false, data: { object } })
      const parsed = await parseStripeManagedPaymentsWebhook({ rawBody, webhookSecret: 'whsec_synthetic',
        signature: stripe.webhooks.generateTestHeaderString({ payload: rawBody, secret: 'whsec_synthetic' }) },
      undefined, undefined, stripe)
      if (!parsed.ok) throw new Error(parsed.reason)
      expect(parsed.normalizedEvent.providerPaymentIntentId).toBe('pi_a')
      return t.mutation(api.bridge.processCommerceEvent, { ...parsed.normalizedEvent, bridgeSecret: secret })
    }
    expect(await deliver('checkout.session.completed', { id: 'cs_a', payment_status: 'paid', payment_intent: 'pi_a', metadata }))
      .toMatchObject({ status: 'granted' })
    const retrieve = vi.spyOn(stripe.charges, 'retrieve').mockResolvedValue({ id: 'ch_a', payment_intent: 'pi_a', metadata,
      amount: 100, amount_refunded: 100 } as Stripe.Charge)
    const status = type === 'refund.created' ? 'revoked' : 'suspended'
    expect(await deliver(type, { id: 'negative_a', status: type === 'refund.created' ? 'succeeded' : 'needs_response',
      charge: 'ch_a', amount: 100, currency: 'eur' })).toMatchObject({ status })
    expect(retrieve).toHaveBeenCalledOnce()
    expect((await rows(t))[0].status).toBe(status)
  })

  test('serializes simultaneous grants and rejects a stale review attempt', async () => {
    const t = backend()
    await seed(t)
    await Promise.all([t.mutation(api.bridge.processCommerceEvent, event()),
      t.mutation(api.bridge.processCommunityGlowsCommerceEvent, event({ providerEventId: 'evt_second', idempotencyKey: 'second' }))])
    expect(await rows(t)).toHaveLength(1)
    const pendingEvent = event({ sourceRef: 'missing', providerOrderId: 'cs_missing', providerEventId: 'evt_missing', idempotencyKey: 'missing' })
    const pendingReceipt = await t.mutation(api.bridge.processCommerceEvent, pendingEvent)
    const outcomes = await Promise.allSettled([retry(t, pendingReceipt.receiptId), retry(t, pendingReceipt.receiptId)])
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1)
    expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1)
  })

  test('retains historical negative tombstones and never revives a paid purchase', async () => {
    const t = backend()
    await seed(t)
    await t.run((ctx) => ctx.db.insert('productAccessEvents', { source: 'suite_commerce', eventType: 'suite_commerce.pending_review',
      sourceRef: `communityglows:${event().sourceRef}`, productId: 'communityglows', environment: 'sandbox',
      status: 'pending_review', reason: 'missing_global_user_for_revoke', idempotencyKey: 'stripe:refund:old', createdAt: 1 }))
    expect(await t.mutation(api.bridge.processCommerceEvent, event())).toMatchObject({ status: 'revoked', reason: 'purchase_already_revoked' })
    expect(await rows(t)).toHaveLength(0)
  })

  test('never conflates raw and product-prefixed historical purchases', async () => {
    const t = backend()
    await seed(t)
    await t.mutation(api.bridge.processCommerceEvent, event())
    const legacyId = await t.run(async (ctx) => {
      const owner = (await ctx.db.query('globalUsers').collect())[0]
      return ctx.db.insert('productEntitlements', { globalUserId: owner._id, productId: 'communityglows', plan: 'lifetime_deal',
        source: 'communityglows_commerce', sourceRef: `communityglows:${event().sourceRef}`, environment: 'sandbox',
        status: 'active', idempotencyKey: 'communityglows:commerce:distinct-purchase', createdAt: 1, updatedAt: 1 })
    })
    const before = await t.run((ctx) => ctx.db.get(legacyId))
    await t.mutation(api.bridge.processCommerceEvent, event({ eventType: 'refunded', providerOrderId: 'ch_a', providerEventId: 'evt_refund', idempotencyKey: 'refund' }))
    expect(await t.run((ctx) => ctx.db.get(legacyId))).toEqual(before)
  })

  test('rejects ambiguous handoffs and reusing a payment for a second checkout', async () => {
    const t = backend()
    await seed(t)
    const second = event({ sourceRef: 'suite-checkout:b', providerOrderId: 'cs_b', providerEventId: 'evt_b', idempotencyKey: 'b' })
    await seed(t, second, { unboundPayment: true })
    expect(await t.mutation(api.bridge.processCommerceEvent, second)).toMatchObject({ reason: 'payment_already_bound' })
    await seed(t)
    expect(await t.mutation(api.bridge.processCommerceEvent, event())).toMatchObject({ reason: 'ambiguous_purchase' })
    expect(await rows(t)).toHaveLength(0)
  })
  test('replays the retained envelope only after explicit audited recovery; dry run is read-only', async () => {
    const t = backend()
    await seed(t, event(), { missingUser: true })
    const initial = await t.mutation(api.bridge.processCommerceEvent, event())
    expect(initial).toMatchObject({ status: 'pending_review', reason: 'missing_global_user' })
    const before = await t.run((ctx) => ctx.db.query('commerceEventReceipts').collect())
    expect(await retry(t, initial.receiptId, 1, true)).toMatchObject({ eligible: true })
    expect(await t.run((ctx) => ctx.db.query('commerceEventReceipts').collect())).toEqual(before)
    await t.run((ctx) => ctx.db.insert('globalUsers', { globalUserId: 'gu_a', createdAt: 1, updatedAt: 1 }))
    expect(await t.mutation(api.bridge.processCommerceEvent, event())).toMatchObject({ status: 'pending_review', alreadyProcessed: true })
    expect(await retry(t, initial.receiptId)).toMatchObject({ status: 'granted', attempts: 2 })
    await expect(retry(t, initial.receiptId)).rejects.toThrow('review_attempt_conflict')
    expect(await retry(t, initial.receiptId, 2)).toMatchObject({ alreadyProcessed: true })
    const audits = await t.run((ctx) => ctx.db.query('commerceEventReviewAttempts').collect())
    expect(audits).toEqual([expect.objectContaining({ attempt: 2, previousReason: 'missing_global_user', resultingStatus: 'granted' })])
    expect((await t.run((ctx) => ctx.db.query('productAccessEvents').collect())).map((row) => row.status)).toEqual(['pending_review', 'granted'])
  })

  test.each([
    { globalUserId: 'gu_other' }, { plan: 'ltd' }, { eventType: 'revoked' as const, providerOrderId: 'ch_a' },
    { providerEventId: 'evt_changed' }, { providerCustomerId: 'cus_changed' }, { sourceRef: 'changed' },
  ])('rejects rebound receipt %j', async (change) => {
    const t = backend()
    await t.mutation(api.bridge.processCommerceEvent, event())
    await expect(t.mutation(api.bridge.processCommerceEvent, event(change))).rejects.toThrow('commerce_event_binding_conflict')
    expect(await rows(t)).toHaveLength(0)
  })

  test('bounds retries and refuses classification changes of partial refunds', async () => {
    const t = backend()
    const initial = await t.mutation(api.bridge.processCommerceEvent, event())
    for (let attempt = 1; attempt < 5; attempt++) await retry(t, initial.receiptId, attempt)
    await expect(retry(t, initial.receiptId, 5)).rejects.toThrow('commerce_review_not_recoverable')
    const partial = await t.mutation(api.bridge.processCommerceEvent,
      event({ eventType: 'pending_review', status: 'pending_review', providerEventId: 'evt_partial', idempotencyKey: 'partial' }))
    await expect(retry(t, partial.receiptId)).rejects.toThrow('commerce_review_not_recoverable')
    expect(await rows(t)).toHaveLength(0)
  })

  test('records refund before paid, binds the signed session, then recovers both in order without a grant', async () => {
    const t = backend()
    await seed(t, event(), { unboundPayment: true })
    const refund = await t.mutation(api.bridge.processCommerceEvent,
      event({ eventType: 'refunded', providerOrderId: 'ch_a', providerEventId: 'evt_refund', idempotencyKey: 'refund' }))
    expect(refund.reason).toBe('purchase_payment_reference_missing')
    const paid = await t.mutation(api.bridge.processCommerceEvent, event())
    expect(paid.reason).toBe('negative_transition_pending_review')
    expect(await retry(t, refund.receiptId)).toMatchObject({ status: 'revoked' })
    expect(await retry(t, paid.receiptId)).toMatchObject({ status: 'revoked', reason: 'purchase_already_revoked' })
    expect(await rows(t)).toHaveLength(0)
  })

  test('keeps environment identities, keys and snapshots separate in both directions', async () => {
    const t = backend()
    const sandbox = event()
    const production = event({ environment: 'production', globalUserId: 'gu_prod' })
    await seed(t, sandbox)
    await seed(t, production)
    await t.mutation(api.bridge.processCommerceEvent, sandbox)
    vi.stubEnv('SUITE_BRIDGE_ENVIRONMENT', 'production')
    await t.mutation(api.bridge.processCommerceEvent, production)
    const rejected = await t.mutation(api.bridge.processCommerceEvent,
      event({ providerEventId: 'evt_foreign', idempotencyKey: 'foreign' }))
    expect(rejected.reason).toBe('environment_mismatch')
    await expect(retry(t, rejected.receiptId)).rejects.toThrow('environment_mismatch')
    await t.mutation(api.bridge.processCommerceEvent,
      { ...production, eventType: 'refunded', providerOrderId: 'ch_a', providerEventId: 'evt_refund', idempotencyKey: 'refund' })
    expect((await rows(t)).map((row) => [row.environment, row.status]).sort()).toEqual([['production', 'revoked'], ['sandbox', 'active']])
  })

  test('provider customer lookup never reassigns an existing identity or its environment', async () => {
    const t = backend()
    await seed(t)
    const identityId = await t.run(async (ctx) => {
      const other = await ctx.db.insert('globalUsers', { globalUserId: 'gu_other', createdAt: 1, updatedAt: 1 })
      return ctx.db.insert('identityAccounts', { globalUserId: other, provider: 'stripe', providerAccountId: 'cus_a',
        environment: 'sandbox', createdAt: 1, updatedAt: 1 })
    })
    const before = await t.run((ctx) => ctx.db.get(identityId))
    expect(await t.mutation(api.bridge.processCommerceEvent, event({ providerCustomerId: 'cus_a' }))).toMatchObject({ reason: 'provider_identity_mismatch' })
    expect(await t.run((ctx) => ctx.db.get(identityId))).toEqual(before)
  })

  test('preserves unbound historical data and refuses to guess its purchase linkage', async () => {
    const t = backend()
    await t.run(async (ctx) => {
      const owner = await ctx.db.insert('globalUsers', { globalUserId: 'gu_a', createdAt: 1, updatedAt: 1 })
      await ctx.db.insert('productEntitlements', { globalUserId: owner, productId: 'communityglows', plan: 'lifetime_deal',
        source: 'communityglows_commerce', sourceRef: event().sourceRef, environment: 'sandbox', status: 'active',
        idempotencyKey: 'communityglows:commerce:old', createdAt: 1, updatedAt: 1 })
      await ctx.db.insert('productAccessEvents', { source: 'communityglows_commerce', eventType: 'communityglows_access.granted',
        sourceRef: event().sourceRef, idempotencyKey: 'old', environment: 'sandbox', productId: 'communityglows',
        globalUserId: owner, status: 'granted', createdAt: 1 })
    })
    const before = await rows(t)
    const historicalEvents = await t.run((ctx) => ctx.db.query('productAccessEvents').collect())
    expect(await t.mutation(api.bridge.processCommerceEvent,
      event({ eventType: 'refunded', providerOrderId: 'ch_a' }))).toMatchObject({ reason: 'historical_purchase_reference_unverified' })
    expect(await rows(t)).toEqual(before)
    expect((await t.run((ctx) => ctx.db.query('productAccessEvents').collect()))[0]).toEqual(historicalEvents[0])
  })
})
