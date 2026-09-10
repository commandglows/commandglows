import { anyApi } from 'convex/server'
import type { Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'

export async function enqueueCommerceAlert(ctx: MutationCtx, incidentId: Id<'commerceIncidents'>,
  environment: string, phase: string, version: number) {
  const key = `${incidentId}:${phase}:${version}`
  if (await ctx.db.query('commerceAlertOutbox').withIndex('by_deduplication', (q) => q.eq('deduplicationKey', key)).unique()) return
  const now = Date.now()
  const alertId = await ctx.db.insert('commerceAlertOutbox', {
    incidentId, environment, phase, deduplicationKey: key, status: 'pending', attempts: 0,
    nextAttemptAt: now, createdAt: now, updatedAt: now,
  })
  await ctx.scheduler.runAfter(0, anyApi.commerceAlerts.deliver, { alertId })
}

/** Called in the same transaction as the receipt. Never requires a resolved buyer. */
export async function syncCommerceIncident(ctx: MutationCtx, input: {
  receiptId: Id<'commerceEventReceipts'>; environment: string; providerEventId: string;
  productId: string; sourceRef?: string; status: string; reason?: string; attempts: number;
}) {
  if (input.sourceRef) {
    const receipt = await ctx.db.get(input.receiptId)
    // A normalized paid receipt has its own operator case when fulfillment is pending.
    // It replaces the uncertainty case; verified expiration/failure closes that uncertainty too.
    if (receipt?.envelope.eventType === 'paid' || ['payment_failed', 'checkout_expired'].includes(input.status)) {
      const checkoutCases = await ctx.db.query('commerceIncidents').withIndex('by_checkout_reference',
        (q) => q.eq('environment', input.environment).eq('sourceRef', input.sourceRef).eq('kind', 'checkout_verification')).collect()
      for (const checkout of checkoutCases.filter((row) => row.active)) {
        const version = checkout.version + 1
        await ctx.db.patch(checkout._id, { active: false, queueState: 'resolved', status: 'verification_replaced', version,
          resolution: 'linked_to_verified_receipt', evidenceReference: `receipt:${input.receiptId}`, updatedAt: Date.now() })
        await ctx.db.insert('commerceIncidentActions', { incidentId: checkout._id, operatorId: 'commerce_processor',
          action: 'resolved', reason: `linked_to_receipt:${input.receiptId}`, version, createdAt: Date.now() })
        await enqueueCommerceAlert(ctx, checkout._id, input.environment, 'resolved', version)
      }
    }
  }
  const existing = await ctx.db.query('commerceIncidents').withIndex('by_provider_event',
    (q) => q.eq('environment', input.environment).eq('providerEventId', input.providerEventId)).unique()
  if (existing?.providerPayloadHash && !existing.receiptId) {
    const receipt = await ctx.db.get(input.receiptId)
    if (receipt?.envelope.providerPayloadHash !== existing.providerPayloadHash) throw new Error('commerce_event_binding_conflict')
  }
  const needsAttention = input.status === 'pending_review' || input.status === 'suspended' ||
    input.reason === 'verified_payment_pending' || ['refund_failed', 'refund_requires_action'].includes(input.reason ?? '')
  if (!existing && !needsAttention) return
  const now = Date.now()
  const queueState = !needsAttention ? 'resolved' : input.attempts >= 5 ? 'escalated' : 'open'
  if (!existing) {
    const incidentId = await ctx.db.insert('commerceIncidents', {
      ...input, queueState, active: true, dueAt: now + 4 * 60 * 60 * 1000, version: 1, createdAt: now, updatedAt: now,
    })
    await ctx.db.insert('commerceIncidentActions', { incidentId, operatorId: 'commerce_processor', action: 'opened',
      reason: input.reason ?? 'pending_review', version: 1, createdAt: now })
    await enqueueCommerceAlert(ctx, incidentId, input.environment, queueState, 1)
    return
  }
  const version = existing.version + 1
  // Preserve a deliberate escalation while a normal retry still requires review.
  const nextState = queueState === 'open' && existing.queueState === 'escalated' ? 'escalated' : queueState
  await ctx.db.patch(existing._id, { ...input, queueState: nextState, active: nextState !== 'resolved',
    version, updatedAt: now, ...(nextState === 'resolved' ? { resolution: 'processor_verified' } : {}) })
  await ctx.db.insert('commerceIncidentActions', { incidentId: existing._id, operatorId: 'commerce_processor', action: nextState,
    reason: input.reason ?? input.status, version, createdAt: now })
  if (nextState !== existing.queueState) await enqueueCommerceAlert(ctx, existing._id, input.environment, nextState, version)
}

/** A verified ingress failure is diagnostic evidence, not an immutable normalized receipt. */
export async function syncCommerceIngressFailure(ctx: MutationCtx, input: {
  environment: string; providerEventId: string; providerPayloadHash: string; providerEventType: string; reason: string;
}) {
  const existing = await ctx.db.query('commerceIncidents').withIndex('by_provider_event',
    (q) => q.eq('environment', input.environment).eq('providerEventId', input.providerEventId)).unique()
  const now = Date.now()
  if (existing) {
    if (existing.providerPayloadHash && existing.providerPayloadHash !== input.providerPayloadHash) throw new Error('commerce_event_binding_conflict')
    if (existing.receiptId) return // A later ingress error cannot undo already-retained processing evidence.
    const attempts = (existing.ingressAttempts ?? 0) + 1
    const queueState = attempts >= 5 || existing.queueState === 'escalated' ? 'escalated' : 'open'
    const version = existing.version + 1
    await ctx.db.patch(existing._id, { ...input, ingressAttempts: attempts, queueState,
      active: true, version, updatedAt: now })
    await ctx.db.insert('commerceIncidentActions', { incidentId: existing._id, operatorId: 'stripe_ingress',
      action: 'ingress_failed', reason: input.reason, version, createdAt: now })
    if (queueState !== existing.queueState) await enqueueCommerceAlert(ctx, existing._id, input.environment, queueState, version)
    return
  }
  const incidentId = await ctx.db.insert('commerceIncidents', { ...input, productId: 'unresolved',
    status: 'ingress_failed', attempts: 0, ingressAttempts: 1, queueState: 'open', active: true,
    dueAt: now + 4 * 60 * 60_000, version: 1, createdAt: now, updatedAt: now })
  await ctx.db.insert('commerceIncidentActions', { incidentId, operatorId: 'stripe_ingress',
    action: 'opened', reason: input.reason, version: 1, createdAt: now })
  await enqueueCommerceAlert(ctx, incidentId, input.environment, 'ingress_failed', 1)
}
