import { anyApi } from 'convex/server'
import { v } from 'convex/values'
import { internalAction, internalMutation } from './_generated/server'
import { commerceEnvironment } from './commerceEventContract'
import { syncCommerceEmail } from './commerceEmail'
import { enqueueCommerceAlert } from './commerceIncidentLedger'

const MAX_ATTEMPTS = 5
const environment = () => commerceEnvironment(process.env.SUITE_BRIDGE_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV || '')

export const claim = internalMutation({
  args: { alertId: v.id('commerceAlertOutbox') },
  handler: async (ctx, { alertId }) => {
    const alert = await ctx.db.get(alertId)
    const now = Date.now()
    if (!alert || alert.emailMessageId || alert.transportChannel === 'email' || alert.environment !== environment() || alert.status === 'delivered' || alert.status === 'failed' ||
      alert.nextAttemptAt > now || (alert.status === 'delivering' && (alert.leaseUntil ?? 0) > now)) return null
    if (alert.attempts >= MAX_ATTEMPTS) {
      await ctx.db.patch(alertId, { status: 'failed', lastError: 'delivery_attempts_exhausted', updatedAt: now })
      return null
    }
    const incident = await ctx.db.get(alert.incidentId)
    if (!incident) return null
    const attempt = alert.attempts + 1
    await ctx.db.patch(alertId, { status: 'delivering', transportChannel: 'webhook', attempts: attempt, leaseUntil: now + 60_000, updatedAt: now })
    // This allowlist deliberately excludes customer data, notes, provider objects and secrets.
    return { attempt, payload: { event: 'commerce.incident', id: String(alert.incidentId),
      environment: alert.environment, phase: alert.phase, queueState: incident.queueState,
      attempts: incident.attempts, assigned: Boolean(incident.ownerId), dueAt: incident.dueAt,
      consolePath: '/dashboard/licences', deduplicationKey: alert.deduplicationKey } }
  },
})

export const finish = internalMutation({
  args: { alertId: v.id('commerceAlertOutbox'), attempt: v.number(), error: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const alert = await ctx.db.get(args.alertId)
    if (!alert || alert.environment !== environment() || alert.status !== 'delivering' || alert.attempts !== args.attempt) return
    const now = Date.now()
    if (!args.error) {
      await ctx.db.patch(alert._id, { status: 'delivered', deliveredAt: now, lastError: undefined, leaseUntil: undefined, updatedAt: now })
      return
    }
    const exhausted = args.attempt >= MAX_ATTEMPTS
    const delay = Math.min(60 * 60_000, 60_000 * 2 ** (args.attempt - 1))
    await ctx.db.patch(alert._id, { status: exhausted ? 'failed' : 'pending', lastError: args.error,
      leaseUntil: undefined, nextAttemptAt: now + delay, updatedAt: now })
    if (!exhausted) await ctx.scheduler.runAfter(delay, anyApi.commerceAlerts.deliver, { alertId: alert._id })
  },
})

/** HTTPS destination is configured by the operator, never supplied by a caller. */
export const deliver = internalAction({
  args: { alertId: v.id('commerceAlertOutbox') },
  handler: async (ctx, { alertId }) => {
    if (await ctx.runMutation(anyApi.commerceEmail.enqueue, { alertId })) return
    const claimed = await ctx.runMutation(anyApi.commerceAlerts.claim, { alertId })
    if (!claimed) return
    let error: string | undefined
    let destination: URL | undefined
    try {
      destination = new URL(process.env.COMMERCE_ALERT_WEBHOOK_URL || '')
      if (destination.protocol !== 'https:' || destination.username || destination.password) throw new Error('invalid')
    } catch { error = 'alert_channel_not_configured' }
    if (!error && destination) {
      try {
        const response = await fetch(destination, { method: 'POST', redirect: 'error',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': claimed.payload.deduplicationKey },
          body: JSON.stringify(claimed.payload), signal: AbortSignal.timeout(8000) })
        if (!response.ok) error = 'alert_delivery_rejected'
        // Never read/log a response body from an operator transport.
      } catch { error = 'alert_delivery_unavailable' }
    }
    await ctx.runMutation(anyApi.commerceAlerts.finish, { alertId, attempt: claimed.attempt, error })
  },
})

/** Recovers interrupted action leases and overdue cases; bounded on every tick. */
export const sweep = internalMutation({
  args: {}, handler: async (ctx) => {
    const now = Date.now()
    const currentEnvironment = environment()
    if (!currentEnvironment) return
    for (const status of ['pending', 'delivering'] as const) {
      const alerts = await ctx.db.query('commerceAlertOutbox').withIndex('by_due',
        (q) => q.eq('environment', currentEnvironment).eq('status', status).lte('nextAttemptAt', now)).take(100)
      for (const alert of alerts) if ((alert.leaseUntil ?? 0) <= now) {
        if (alert.emailMessageId) { await syncCommerceEmail(ctx, alert); continue }
        await ctx.scheduler.runAfter(0, anyApi.commerceAlerts.deliver, { alertId: alert._id })
      }
    }
    const overdue = await ctx.db.query('commerceIncidents').withIndex('by_deadline',
      (q) => q.eq('environment', currentEnvironment).eq('queueState', 'open').lt('dueAt', now)).take(100)
    for (const incident of overdue) {
      const version = incident.version + 1
      await ctx.db.patch(incident._id, { queueState: 'escalated', version, updatedAt: now })
      await ctx.db.insert('commerceIncidentActions', { incidentId: incident._id, operatorId: 'commerce_watchdog',
        action: 'deadline_escalated', reason: 'operator_deadline_exceeded', version, createdAt: now })
      await enqueueCommerceAlert(ctx, incident._id, currentEnvironment, 'overdue', version)
    }
    // Stable paginated query bounds are checkpointed: every handoff is eventually inspected.
    const checkpoint = await ctx.db.query('commerceOperationsCheckpoints').withIndex('by_environment',
      (q) => q.eq('environment', currentEnvironment)).unique()
    const scanBefore = checkpoint?.cursor ? checkpoint.scanBefore : now - 30 * 60_000
    const batch = await ctx.db.query('commerceCheckoutHandoffs').withIndex('by_expiresAt',
      (q) => q.lt('expiresAt', scanBefore)).order('asc').paginate({ numItems: 50, cursor: checkpoint?.cursor ?? null })
    for (const handoff of batch.page) {
      if (commerceEnvironment(handoff.environment) !== currentEnvironment) continue
      const existing = await ctx.db.query('commerceIncidents').withIndex('by_provider_event',
        (q) => q.eq('environment', currentEnvironment).eq('providerEventId', `checkout:${handoff._id}`)).unique()
      if (existing) continue
      const receipts = await ctx.db.query('commerceEventReceipts').withIndex('by_purchase', (q) =>
        q.eq('envelope.provider', 'stripe').eq('envelope.environment', currentEnvironment)
          .eq('envelope.productId', handoff.productId).eq('envelope.sourceRef', handoff.idempotencyKey)).collect()
      if (receipts.some((row) => row.envelope.eventType === 'paid' || ['payment_failed', 'checkout_expired'].includes(row.status))) continue
      const incidentId = await ctx.db.insert('commerceIncidents', {
        environment: currentEnvironment, kind: 'checkout_verification', checkoutHandoffId: handoff._id,
        providerEventId: `checkout:${handoff._id}`, productId: handoff.productId, sourceRef: handoff.idempotencyKey,
        status: 'checkout_unverified', reason: 'missing_definitive_checkout_event', attempts: 0,
        queueState: 'open', active: true, dueAt: now + 4 * 60 * 60_000, version: 1, createdAt: now, updatedAt: now,
      })
      await ctx.db.insert('commerceIncidentActions', { incidentId, operatorId: 'commerce_watchdog', action: 'opened',
        reason: 'payment_not_verified_check_provider', version: 1, createdAt: now })
      await enqueueCommerceAlert(ctx, incidentId, currentEnvironment, 'checkout_verification', 1)
    }
    const progress = { environment: currentEnvironment, cursor: batch.isDone ? undefined : batch.continueCursor, scanBefore, updatedAt: now }
    if (checkpoint) await ctx.db.patch(checkpoint._id, progress)
    else await ctx.db.insert('commerceOperationsCheckpoints', progress)
  },
})
