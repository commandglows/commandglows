import { convexTest } from 'convex-test'
import { anyApi } from 'convex/server'
import schema from '../../convex/schema'
import type { CommerceEventEnvelope } from '../../convex/commerceEventContract'
import { syncCommerceIncident } from '../../convex/commerceIncidentLedger'

const modules = import.meta.glob('../../convex/**/*.ts')
const backend = () => convexTest(schema, modules)
type Backend = ReturnType<typeof backend>
const auth = { clerkId: 'admin_test', bridgeSecret: 'operations-synthetic-secret' }
const paginationOpts = { cursor: null, numItems: 20 }
const event = (overrides: Partial<CommerceEventEnvelope> = {}): CommerceEventEnvelope => ({
  provider: 'stripe', environment: 'sandbox', productId: 'communityglows', offerId: 'communityglows/lifetime_deal',
  plan: 'lifetime_deal', eventType: 'paid', status: 'applied', sourceRef: 'suite-checkout:ops',
  providerEventId: 'evt_ops', providerOrderId: 'cs_ops', providerPaymentIntentId: 'pi_ops',
  idempotencyKey: 'stripe:paid:evt_ops', globalUserId: 'gu_ops', providerPayloadHash: 'a'.repeat(64), ...overrides,
})
async function admin(t: Backend) {
  await t.run((ctx) => ctx.db.insert('users', { clerkId: auth.clerkId, email: 'operator@example.test', role: 'admin' }))
}
async function open(t: Backend, input = event()) {
  await t.mutation(anyApi.bridge.processCommerceEvent, { ...input, bridgeSecret: auth.bridgeSecret })
  return (await t.run((ctx) => ctx.db.query('commerceIncidents').collect())).find((row) => row.providerEventId === input.providerEventId)!
}
async function list(t: Backend, options: Record<string, unknown> = {}) {
  return t.query(anyApi.commerceOperations.listIncidents, { ...auth, active: true, paginationOpts, ...options })
}

beforeEach(() => {
  vi.stubEnv('SUITE_BRIDGE_CONVEX_SECRET', auth.bridgeSecret)
  vi.stubEnv('SUITE_BRIDGE_ENVIRONMENT', 'test')
  vi.stubEnv('COMMERCE_ALERT_WEBHOOK_URL', '')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('commerce operations', () => {
  test('requires secret and canonical admin before reading incidents', async () => {
    const t = backend(); await admin(t)
    await expect(list(t, { bridgeSecret: 'wrong' })).rejects.toThrow('admin_forbidden')
    await expect(list(t, { clerkId: 'member' })).rejects.toThrow('admin_forbidden')
  })
  test('lists an incident without a resolved buyer, without email and with durable alert', async () => {
    const t = backend(); await admin(t); const incident = await open(t)
    const result = await list(t)
    expect(result.page).toHaveLength(1)
    expect(result.page[0]).toMatchObject({ _id: incident._id, attempts: 1, active: true, queueState: 'open' })
    expect(result.page[0].alerts).toHaveLength(1)
    expect(result.alertChannelConfigured).toBe(false)
    expect(JSON.stringify(result)).not.toContain('@')
    expect(await t.run((ctx) => ctx.db.query('globalUsers').collect())).toHaveLength(0)
  })
  test('paginates independently of identity and isolates environments', async () => {
    const t = backend(); await admin(t)
    await open(t)
    await open(t, event({ providerEventId: 'evt_second', idempotencyKey: 'second' }))
    await t.run((ctx) => ctx.db.insert('commerceIncidents', { environment: 'production', providerEventId: 'evt_foreign',
      productId: 'communityglows', status: 'pending_review', attempts: 1, queueState: 'open', active: true,
      dueAt: 1, version: 1, createdAt: 1, updatedAt: 1 }))
    const first = await list(t, { paginationOpts: { cursor: null, numItems: 1 } })
    const second = await list(t, { paginationOpts: { cursor: first.continueCursor, numItems: 1 } })
    expect(first.isDone).toBe(false)
    expect(first.page[0]._id).not.toBe(second.page[0]._id)
    expect([...first.page, ...second.page].every((row: { environment: string }) => row.environment === 'sandbox')).toBe(true)
  })
  test('deduplicates webhook incidents and their notifications', async () => {
    const t = backend(); await admin(t); await open(t); await open(t)
    expect(await t.run((ctx) => ctx.db.query('commerceIncidents').collect())).toHaveLength(1)
    expect(await t.run((ctx) => ctx.db.query('commerceAlertOutbox').collect())).toHaveLength(1)
  })
  test('claims with trusted operator, records a deadline and rejects stale changes', async () => {
    const t = backend(); await admin(t); const incident = await open(t)
    const input = { ...auth, incidentId: incident._id, expectedVersion: 1, action: 'claim', reason: 'Customer receipt verified' }
    expect(await t.mutation(anyApi.commerceOperations.updateIncident, input)).toMatchObject({ version: 2 })
    await expect(t.mutation(anyApi.commerceOperations.updateIncident, input)).rejects.toThrow('incident_version_conflict')
    const detail = await t.query(anyApi.commerceOperations.getIncident, { ...auth, incidentId: incident._id })
    expect(detail.incident.ownerId).toBe(auth.clerkId)
    expect(detail.actions[0]).toMatchObject({ operatorId: auth.clerkId, action: 'claim' })
  })
  test('dry run is read only; five failed attempts escalate and retain counter', async () => {
    const t = backend(); await admin(t); let incident = await open(t)
    const dry = { ...auth, incidentId: incident._id, expectedVersion: incident.version, expectedAttempts: 1,
      reason: 'Checked purchase prerequisite', dryRun: true }
    expect(await t.mutation(anyApi.commerceOperations.retryIncident, dry)).toMatchObject({ eligible: true })
    expect((await list(t)).page[0].version).toBe(1)
    for (let attempt = 1; attempt < 5; attempt++) {
      await t.mutation(anyApi.commerceOperations.retryIncident, { ...dry, dryRun: false,
        expectedAttempts: attempt, expectedVersion: incident.version })
      incident = (await list(t)).page[0]
    }
    expect(incident).toMatchObject({ attempts: 5, queueState: 'escalated', active: true })
    await expect(t.mutation(anyApi.commerceOperations.retryIncident, { ...dry, dryRun: false,
      expectedAttempts: 5, expectedVersion: incident.version })).rejects.toThrow('commerce_review_not_recoverable')
    expect((await t.run((ctx) => ctx.db.query('commerceAlertOutbox').collect())).map((row) => row.phase)).toEqual(['open', 'escalated'])
  })
  test('external resolution requires evidence and does not grant access or alter receipt', async () => {
    const t = backend(); await admin(t); const incident = await open(t)
    const before = await t.run((ctx) => ctx.db.get(incident.receiptId!))
    const input = { ...auth, incidentId: incident._id, expectedVersion: 1, action: 'resolve', reason: 'Verified external refund resolved buyer case' }
    await expect(t.mutation(anyApi.commerceOperations.updateIncident, input)).rejects.toThrow('evidence_required')
    await t.mutation(anyApi.commerceOperations.updateIncident, { ...input, evidenceReference: 'support-case-123' })
    expect((await list(t)).page).toHaveLength(0)
    expect(await t.run((ctx) => ctx.db.get(incident.receiptId!))).toEqual(before)
    expect(await t.run((ctx) => ctx.db.query('productEntitlements').collect())).toHaveLength(0)
  })
  test.each([
    ['suspended', 'commerce_dispute_open'], ['awaiting_payment', 'verified_payment_pending'],
    ['granted', 'refund_failed'], ['granted', 'refund_requires_action'],
  ])('retains an actionable %s/%s case even outside pending_review', async (status, reason) => {
    const t = backend(); await admin(t); const incident = await open(t)
    await t.run((ctx) => syncCommerceIncident(ctx, { receiptId: incident.receiptId!, environment: 'sandbox',
      providerEventId: 'evt_ops', productId: 'communityglows', status, reason, attempts: 2 }))
    expect((await list(t)).page[0]).toMatchObject({ active: true, status, reason })
  })
  test('ingress error creates no poisoned receipt; verified receipt later joins the case', async () => {
    const t = backend(); await admin(t)
    const failure = { bridgeSecret: auth.bridgeSecret, environment: 'sandbox', providerEventId: 'evt_ops',
      providerPayloadHash: 'a'.repeat(64), providerEventType: 'checkout.session.completed', reason: 'stripe_dependency_unavailable' }
    await t.mutation(anyApi.commerceOperations.recordCommerceIngressFailure, failure)
    await t.mutation(anyApi.commerceOperations.recordCommerceIngressFailure, failure)
    let incident = (await list(t)).page[0]
    expect(incident).toMatchObject({ attempts: 0, ingressAttempts: 2 })
    expect(incident.receiptId).toBeUndefined()
    expect(await t.run((ctx) => ctx.db.query('commerceEventReceipts').collect())).toHaveLength(0)
    await expect(t.mutation(anyApi.commerceOperations.retryIncident, { ...auth, incidentId: incident._id,
      expectedVersion: incident.version, expectedAttempts: 0, reason: 'Verified retry', dryRun: false })).rejects.toThrow('verified_receipt_required')
    await open(t)
    incident = (await list(t)).page[0]
    expect(incident.receiptId).toBeDefined()
    expect((await list(t)).page).toHaveLength(1)
  })
  test('ingress descriptors reject foreign environment, hash drift and absent authority', async () => {
    const t = backend(); await admin(t)
    const input = { bridgeSecret: auth.bridgeSecret, environment: 'sandbox', providerEventId: 'evt_ops',
      providerPayloadHash: 'a'.repeat(64), providerEventType: 'refund.updated', reason: 'stripe_dependency_unavailable' }
    await expect(t.mutation(anyApi.commerceOperations.recordCommerceIngressFailure, { ...input, bridgeSecret: '' })).rejects.toThrow('admin_forbidden')
    await expect(t.mutation(anyApi.commerceOperations.recordCommerceIngressFailure, { ...input, environment: 'production' })).rejects.toThrow('ingress_evidence_invalid')
    await t.mutation(anyApi.commerceOperations.recordCommerceIngressFailure, input)
    await expect(t.mutation(anyApi.commerceOperations.recordCommerceIngressFailure, { ...input, providerPayloadHash: 'b'.repeat(64) })).rejects.toThrow('commerce_event_binding_conflict')
  })
  test('missing-webhook candidates remain unverified and disappear once a paid receipt exists', async () => {
    const t = backend(); await admin(t)
    await t.run((ctx) => ctx.db.insert('commerceCheckoutHandoffs', { jtiHash: 'ops', idempotencyKey: 'suite-checkout:ops',
      globalUserId: 'gu_ops', productId: 'communityglows', offerId: 'communityglows/lifetime_deal', environment: 'test',
      status: 'claimed', expiresAt: 1, createdAt: 1, updatedAt: 1 }))
    const args = { ...auth, paginationOpts }
    expect((await t.query(anyApi.commerceOperations.listMissingWebhooks, args)).page[0]).toMatchObject({ paymentState: 'unverified' })
    await open(t)
    expect((await t.query(anyApi.commerceOperations.listMissingWebhooks, args)).page).toHaveLength(0)
  })
  test('repairs only an exact existing handoff without payment binding or granting rights', async () => {
    const t = backend(); await admin(t)
    const id = await t.run((ctx) => ctx.db.insert('commerceCheckoutHandoffs', { jtiHash: 'ops', idempotencyKey: 'suite-checkout:ops',
      globalUserId: 'gu_ops', productId: 'communityglows', offerId: 'communityglows/lifetime_deal', environment: 'test',
      status: 'claimed', expiresAt: 1, createdAt: 1, updatedAt: 1 }))
    const input = { ...auth, sourceRef: 'suite-checkout:ops', environment: 'sandbox', globalUserId: 'gu_ops',
      productId: 'communityglows', offerId: 'communityglows/lifetime_deal', providerOrderId: 'cs_ops', reason: 'Verified completed Stripe session' }
    await expect(t.mutation(anyApi.commerceOperations.repairCheckout, { ...input, globalUserId: 'gu_attacker' })).rejects.toThrow('evidence_mismatch')
    await t.mutation(anyApi.commerceOperations.repairCheckout, input)
    expect(await t.run((ctx) => ctx.db.get(id))).toMatchObject({ status: 'completed', providerOrderId: 'cs_ops' })
    expect((await t.run((ctx) => ctx.db.get(id)))?.providerPaymentIntentId).toBeUndefined()
    expect(await t.run((ctx) => ctx.db.query('productEntitlements').collect())).toHaveLength(0)
  })
})

describe('durable operator alert delivery', () => {
  test('watchdog materializes aged missing-webhook cases, deduplicates and closes when a receipt takes over', async () => {
    const t = backend(); await admin(t)
    await t.run((ctx) => ctx.db.insert('commerceCheckoutHandoffs', { jtiHash: 'ops', idempotencyKey: 'suite-checkout:ops',
      globalUserId: 'gu_ops', productId: 'communityglows', offerId: 'communityglows/lifetime_deal', environment: 'test',
      status: 'completed', providerOrderId: 'cs_ops', expiresAt: 1, createdAt: 1, updatedAt: 1 }))
    await t.mutation(anyApi.commerceAlerts.sweep, {})
    await t.mutation(anyApi.commerceAlerts.sweep, {})
    const first = (await list(t)).page
    expect(first).toHaveLength(1)
    expect(first[0]).toMatchObject({ kind: 'checkout_verification', status: 'checkout_unverified', attempts: 0 })
    expect(first[0].providerEventId).toMatch(/^checkout:/)
    await open(t)
    const active = (await list(t)).page
    expect(active).toHaveLength(1)
    expect(active[0].providerEventId).toBe('evt_ops')
    const previous = await t.run((ctx) => ctx.db.get(first[0]._id))
    expect(previous).toMatchObject({ active: false, resolution: 'linked_to_verified_receipt' })
  })
  test('watchdog checkpoint advances beyond a full page and skips verified terminal checkout failures', async () => {
    const t = backend(); await admin(t)
    await t.run(async (ctx) => {
      for (let n = 0; n < 54; n++) await ctx.db.insert('commerceCheckoutHandoffs', { jtiHash: `scan_${n}`,
        idempotencyKey: `suite-checkout:scan_${n}`, globalUserId: 'gu_ops', productId: 'communityglows',
        offerId: 'communityglows/lifetime_deal', environment: 'sandbox', status: 'completed', providerOrderId: `cs_${n}`,
        expiresAt: n + 1, createdAt: 1, updatedAt: 1 })
      await ctx.db.insert('commerceEventReceipts', { eventKey: 'terminal', envelope: event({ eventType: 'checkout_failed',
        sourceRef: 'suite-checkout:scan_0', providerEventId: 'evt_terminal', idempotencyKey: 'terminal' }),
      status: 'payment_failed', attempts: 1, createdAt: 1, updatedAt: 1 })
    })
    await t.mutation(anyApi.commerceAlerts.sweep, {})
    expect(await t.run((ctx) => ctx.db.query('commerceIncidents').collect())).toHaveLength(49)
    expect((await t.run((ctx) => ctx.db.query('commerceOperationsCheckpoints').collect()))[0].cursor).toBeDefined()
    await t.mutation(anyApi.commerceAlerts.sweep, {})
    expect(await t.run((ctx) => ctx.db.query('commerceIncidents').collect())).toHaveLength(53)
    expect((await t.run((ctx) => ctx.db.query('commerceOperationsCheckpoints').collect()))[0].cursor).toBeUndefined()
  })
  test('overdue cases escalate once and foreign alerts cannot starve the current environment', async () => {
    const t = backend(); await admin(t); const incident = await open(t)
    await t.run(async (ctx) => {
      await ctx.db.patch(incident._id, { dueAt: 1 })
      for (let n = 0; n < 110; n++) await ctx.db.insert('commerceAlertOutbox', { incidentId: incident._id,
        environment: 'production', phase: 'test', deduplicationKey: `foreign_${n}`, status: 'pending',
        attempts: 0, nextAttemptAt: 0, createdAt: 0, updatedAt: 0 })
    })
    await t.mutation(anyApi.commerceAlerts.sweep, {})
    await t.mutation(anyApi.commerceAlerts.sweep, {})
    expect((await list(t)).page[0]).toMatchObject({ queueState: 'escalated' })
    const outbox = await t.run((ctx) => ctx.db.query('commerceAlertOutbox').collect())
    expect(outbox.filter((row) => row.phase === 'overdue')).toHaveLength(1)
    const scheduled = await t.run((ctx) => ctx.db.system.query('_scheduled_functions').collect())
    expect(scheduled.filter((row) => row.name.includes('commerceAlerts:deliver')).length).toBeGreaterThanOrEqual(3)
  })
  test('a won dispute resolves the suspension incident while retaining the receipt audit', async () => {
    const t = backend(); await admin(t)
    await t.run(async (ctx) => {
      await ctx.db.insert('globalUsers', { globalUserId: 'gu_ops', createdAt: 1, updatedAt: 1 })
      await ctx.db.insert('commerceCheckoutHandoffs', { jtiHash: 'ops', idempotencyKey: 'suite-checkout:ops',
        globalUserId: 'gu_ops', productId: 'communityglows', offerId: 'communityglows/lifetime_deal', environment: 'sandbox',
        status: 'completed', providerOrderId: 'cs_ops', providerPaymentIntentId: 'pi_ops', expiresAt: 1, createdAt: 1, updatedAt: 1 })
    })
    await t.mutation(anyApi.bridge.processCommerceEvent, { ...event(), bridgeSecret: auth.bridgeSecret })
    const dispute = event({ eventType: 'dispute_updated', providerEventId: 'evt_dispute', idempotencyKey: 'dispute',
      providerOrderId: 'ch_ops', providerDisputeId: 'dp_ops', disputeStatus: 'needs_response', providerCreatedAt: 100 })
    await t.mutation(anyApi.bridge.processCommerceEvent, { ...dispute, bridgeSecret: auth.bridgeSecret })
    expect((await list(t)).page[0]).toMatchObject({ status: 'suspended' })
    await t.mutation(anyApi.bridge.processCommerceEvent, { ...dispute, providerEventId: 'evt_won',
      idempotencyKey: 'won', disputeStatus: 'won', providerCreatedAt: 200, bridgeSecret: auth.bridgeSecret })
    expect((await list(t)).page).toHaveLength(0)
    const receipts = await t.run((ctx) => ctx.db.query('commerceEventReceipts').collect())
    expect(receipts.find((row) => row.envelope.providerEventId === 'evt_dispute')?.status).toBe('suspended')
  })
  test('configuration failure is visible and retained for bounded retry', async () => {
    const t = backend(); await admin(t); await open(t)
    const alert = (await t.run((ctx) => ctx.db.query('commerceAlertOutbox').collect()))[0]
    await t.action(anyApi.commerceAlerts.deliver, { alertId: alert._id })
    expect(await t.run((ctx) => ctx.db.get(alert._id))).toMatchObject({ status: 'pending', attempts: 1, lastError: 'alert_channel_not_configured' })
    expect(fetch).not.toHaveBeenCalled()
  })
  test('accepts HTTPS transport once with a redacted allowlist payload', async () => {
    vi.stubEnv('COMMERCE_ALERT_WEBHOOK_URL', 'https://alerts.example.test/commerce')
    const t = backend(); await admin(t); await open(t, event({ customerEmail: 'private-buyer@example.test' }))
    const alert = (await t.run((ctx) => ctx.db.query('commerceAlertOutbox').collect()))[0]
    await t.action(anyApi.commerceAlerts.deliver, { alertId: alert._id })
    await t.action(anyApi.commerceAlerts.deliver, { alertId: alert._id })
    expect(fetch).toHaveBeenCalledTimes(1)
    const options = vi.mocked(fetch).mock.calls[0][1]!
    expect(String(options.body)).not.toContain('@')
    expect(String(options.body)).not.toContain('evt_ops')
    expect(String(options.body)).not.toContain(auth.bridgeSecret)
    expect(options.redirect).toBe('error')
    expect(await t.run((ctx) => ctx.db.get(alert._id))).toMatchObject({ status: 'delivered', attempts: 1 })
  })
  test('stops after five failures and manual re-alert preserves the failed cycle', async () => {
    const t = backend(); await admin(t); const incident = await open(t)
    const alert = (await t.run((ctx) => ctx.db.query('commerceAlertOutbox').collect()))[0]
    for (let count = 0; count < 5; count++) {
      await t.run((ctx) => ctx.db.patch(alert._id, { nextAttemptAt: 0 }))
      await t.action(anyApi.commerceAlerts.deliver, { alertId: alert._id })
    }
    expect(await t.run((ctx) => ctx.db.get(alert._id))).toMatchObject({ status: 'failed', attempts: 5 })
    await t.mutation(anyApi.commerceOperations.retryAlert, { ...auth, incidentId: incident._id, expectedVersion: 1, reason: 'Repaired and verified transport configuration' })
    const outbox = await t.run((ctx) => ctx.db.query('commerceAlertOutbox').collect())
    expect(outbox).toHaveLength(2)
    expect(outbox.find((row) => row._id === alert._id)).toMatchObject({ status: 'failed', attempts: 5 })
  })
  test('leases prevent concurrent sends and stale completion cannot change the result', async () => {
    const t = backend(); await admin(t); await open(t)
    const alert = (await t.run((ctx) => ctx.db.query('commerceAlertOutbox').collect()))[0]
    expect(await t.mutation(anyApi.commerceAlerts.claim, { alertId: alert._id })).toMatchObject({ attempt: 1 })
    expect(await t.mutation(anyApi.commerceAlerts.claim, { alertId: alert._id })).toBeNull()
    await t.mutation(anyApi.commerceAlerts.finish, { alertId: alert._id, attempt: 2 })
    expect((await t.run((ctx) => ctx.db.get(alert._id)))?.status).toBe('delivering')
  })
})
