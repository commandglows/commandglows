import { commerceOperatorConfig } from './emailConfig'
import { siteAuthorityArgs, requireSiteAdmin, type SiteAuthority } from './siteAuthority'
import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { MutationCtx, QueryCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { commerceEnvironment, commerceEventFields } from './commerceEventContract'
import { receiveCommerceEvent, reviewCommerceEvent, recoverCommerceEvent } from './commerceProcessor'
import { isSupportedSuiteCommerceOffer } from './bridge'
import { enqueueCommerceAlert, syncCommerceIngressFailure } from './commerceIncidentLedger'

const authorityArgs = siteAuthorityArgs
type Authority = SiteAuthority
async function requireAdmin(ctx: QueryCtx | MutationCtx, args: Authority) {
  if (!process.env.SUITE_BRIDGE_CONVEX_SECRET || args.bridgeSecret !== process.env.SUITE_BRIDGE_CONVEX_SECRET) throw new Error('admin_forbidden')
  const admin = await requireSiteAdmin(ctx, args)
  if (!admin || admin.role !== 'admin') throw new Error('admin_forbidden')
  const environment = commerceEnvironment(process.env.SUITE_BRIDGE_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV || '')
  if (!environment) throw new Error('environment_not_configured')
  return { operatorId: admin.actorGlobalUserId, environment }
}
function note(value: string, name = 'reason') {
  const normalized = value.trim()
  if (normalized.length < 3 || normalized.length > 500) throw new Error(`${name}_invalid`)
  return normalized
}
async function incidentFor(ctx: QueryCtx | MutationCtx, id: Id<'commerceIncidents'>, environment: string, expectedVersion?: number) {
  const incident = await ctx.db.get(id)
  if (!incident || incident.environment !== environment) throw new Error('incident_not_found')
  if (expectedVersion !== undefined && incident.version !== expectedVersion) throw new Error('incident_version_conflict')
  return incident
}

export const authorize = query({ args: authorityArgs, handler: requireAdmin })

export const recordCommerceIngressFailure = mutation({
  args: { bridgeSecret: v.string(), environment: v.string(), providerEventId: v.string(),
    providerPayloadHash: v.string(), providerEventType: v.string(), reason: v.string() },
  handler: async (ctx, args) => {
    if (!process.env.SUITE_BRIDGE_CONVEX_SECRET || args.bridgeSecret !== process.env.SUITE_BRIDGE_CONVEX_SECRET) throw new Error('admin_forbidden')
    const environment = commerceEnvironment(args.environment)
    const runtime = commerceEnvironment(process.env.SUITE_BRIDGE_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV || '')
    if (!environment || environment !== runtime || !/^evt_[A-Za-z0-9_]{1,250}$/.test(args.providerEventId) ||
      !/^[a-f0-9]{64}$/.test(args.providerPayloadHash) || args.providerEventType.length > 200 || args.reason.length > 200) throw new Error('ingress_evidence_invalid')
    const { bridgeSecret: _secret, ...input } = args
    await syncCommerceIngressFailure(ctx, { ...input, environment })
    return { status: 'recorded' }
  },
})

export const reconcileEvent = mutation({
  args: { ...authorityArgs, ...commerceEventFields, reason: v.string() },
  handler: async (ctx, args) => {
    const authority = await requireAdmin(ctx, args)
    const reason = note(args.reason)
    if (commerceEnvironment(args.environment) !== authority.environment) throw new Error('evidence_mismatch')
    const { actorGlobalUserId: _actorId, clerkId: _clerkId, bridgeSecret: _secret, reason: _reason, ...envelope } = args
    const result = await receiveCommerceEvent(ctx, envelope, { supportsOffer: isSupportedSuiteCommerceOffer })
    await ctx.db.insert('productAccessEvents', { source: 'commerce_operations', eventType: 'provider_event_reconciled',
      eventId: envelope.providerEventId, sourceRef: envelope.sourceRef, environment: authority.environment,
      productId: envelope.productId, idempotencyKey: `commerce-reconcile:${result.receiptId}:${Date.now()}`,
      status: result.status, reason: `${authority.operatorId}: ${reason}`, createdAt: Date.now() })
    return result
  },
})

export const listIncidents = query({
  args: { ...authorityArgs, active: v.boolean(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const { environment } = await requireAdmin(ctx, args)
    const result = await ctx.db.query('commerceIncidents').withIndex('by_queue',
      (q) => q.eq('environment', environment).eq('active', args.active)).order('asc')
      .paginate({ ...args.paginationOpts, numItems: Math.min(50, args.paginationOpts.numItems) })
    const page = await Promise.all(result.page.map(async (incident) => {
      const alerts = await ctx.db.query('commerceAlertOutbox').withIndex('by_incident', (q) => q.eq('incidentId', incident._id)).order('desc').take(10)
      return { ...incident, overdue: incident.active && incident.dueAt < Date.now(),
        alerts: alerts.map((alert) => ({ id: alert._id, status: alert.status, attempts: alert.attempts, error: alert.lastError ?? null, phase: alert.phase, transportChannel: alert.transportChannel ?? 'webhook', emailState: alert.emailState ?? null })) }
    }))
    const checkpoint = await ctx.db.query('commerceOperationsCheckpoints').withIndex('by_environment',
      (q) => q.eq('environment', environment)).unique()
    let alertChannelConfigured = Boolean(process.env.COMMERCE_ALERT_WEBHOOK_URL)
    if (process.env.COMMERCE_ALERT_CHANNEL === 'email') {
      try { commerceOperatorConfig(environment); alertChannelConfigured = true } catch { alertChannelConfigured = false }
    }
    return { ...result, page, environment, alertChannelConfigured,
      watchdog: { lastScanAt: checkpoint?.updatedAt ?? null, stale: !checkpoint || checkpoint.updatedAt < Date.now() - 15 * 60_000,
        scanInProgress: Boolean(checkpoint?.cursor) } }
  },
})

export const getIncident = query({
  args: { ...authorityArgs, incidentId: v.id('commerceIncidents') },
  handler: async (ctx, args) => {
    const { environment } = await requireAdmin(ctx, args)
    const incident = await incidentFor(ctx, args.incidentId, environment)
    const actions = await ctx.db.query('commerceIncidentActions').withIndex('by_incident', (q) => q.eq('incidentId', incident._id)).order('desc').take(50)
    const receipt = incident.receiptId ? await ctx.db.get(incident.receiptId) : null
    return { incident, actions, historyTruncated: actions.length === 50,
      receipt: receipt ? { providerEventId: receipt.envelope.providerEventId, status: receipt.status,
        reason: receipt.reason, attempts: receipt.attempts, productId: receipt.envelope.productId,
        sourceRef: receipt.envelope.sourceRef, offerId: receipt.envelope.offerId,
        providerOrderId: receipt.envelope.providerOrderId, createdAt: receipt.createdAt } : null }
  },
})

export const updateIncident = mutation({
  args: { ...authorityArgs, incidentId: v.id('commerceIncidents'), expectedVersion: v.number(),
    action: v.union(v.literal('claim'), v.literal('escalate'), v.literal('resolve')),
    reason: v.string(), dueAt: v.optional(v.number()), evidenceReference: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const authority = await requireAdmin(ctx, args)
    const incident = await incidentFor(ctx, args.incidentId, authority.environment, args.expectedVersion)
    const reason = note(args.reason)
    if (!incident.active) throw new Error('incident_already_resolved')
    const now = Date.now()
    const dueAt = args.dueAt ?? now + 4 * 60 * 60_000
    if (!Number.isFinite(dueAt) || dueAt < now || dueAt > now + 7 * 24 * 60 * 60_000) throw new Error('due_date_invalid')
    const evidenceReference = args.evidenceReference ? note(args.evidenceReference, 'evidence') : undefined
    if (args.action === 'resolve' && !evidenceReference) throw new Error('evidence_required')
    const queueState = args.action === 'resolve' ? 'resolved' : args.action === 'escalate' ? 'escalated' : incident.queueState
    const version = incident.version + 1
    await ctx.db.patch(incident._id, { ownerId: authority.operatorId, dueAt, queueState,
      active: queueState !== 'resolved', version, updatedAt: now,
      ...(args.action === 'resolve' ? { resolution: reason, evidenceReference } : {}) })
    await ctx.db.insert('commerceIncidentActions', { incidentId: incident._id, operatorId: authority.operatorId,
      action: args.action, reason, evidenceReference, version, createdAt: now })
    if (queueState !== incident.queueState) await enqueueCommerceAlert(ctx, incident._id, authority.environment, queueState, version)
    return { status: queueState, version, receiptUnchanged: true }
  },
})

export const retryIncident = mutation({
  args: { ...authorityArgs, incidentId: v.id('commerceIncidents'), expectedVersion: v.number(),
    expectedAttempts: v.number(), reason: v.string(), dryRun: v.boolean() },
  handler: async (ctx, args) => {
    const authority = await requireAdmin(ctx, args)
    const incident = await incidentFor(ctx, args.incidentId, authority.environment, args.expectedVersion)
    if (!incident.active) throw new Error('incident_already_resolved')
    if (!incident.receiptId) throw new Error('verified_receipt_required')
    return reviewCommerceEvent(ctx, { receiptId: incident.receiptId, expectedAttempts: args.expectedAttempts,
      operatorId: authority.operatorId, reason: note(args.reason), dryRun: args.dryRun }, { supportsOffer: isSupportedSuiteCommerceOffer })
  },
})

/** Server secret is mandatory; the Astro route obtains this hash from Stripe.events.retrieve. */
export const recoverIncident = mutation({
  args: { ...authorityArgs, incidentId: v.id('commerceIncidents'), expectedVersion: v.number(),
    expectedAttempts: v.number(), reason: v.string(), providerEventId: v.string(), providerPayloadHash: v.string() },
  handler: async (ctx, args) => {
    const authority = await requireAdmin(ctx, args)
    const incident = await incidentFor(ctx, args.incidentId, authority.environment, args.expectedVersion)
    if (!incident.active || !incident.receiptId || incident.providerEventId !== args.providerEventId) throw new Error('evidence_mismatch')
    return recoverCommerceEvent(ctx, { receiptId: incident.receiptId, expectedAttempts: args.expectedAttempts,
      operatorId: authority.operatorId, reason: note(args.reason), providerPayloadHash: args.providerPayloadHash },
    { supportsOffer: isSupportedSuiteCommerceOffer })
  },
})

export const retryAlert = mutation({
  args: { ...authorityArgs, incidentId: v.id('commerceIncidents'), expectedVersion: v.number(), reason: v.string() },
  handler: async (ctx, args) => {
    const authority = await requireAdmin(ctx, args)
    const incident = await incidentFor(ctx, args.incidentId, authority.environment, args.expectedVersion)
    const reason = note(args.reason)
    const version = incident.version + 1
    await ctx.db.patch(incident._id, { version, updatedAt: Date.now() })
    await ctx.db.insert('commerceIncidentActions', { incidentId: incident._id, action: 'retry_alert',
      operatorId: authority.operatorId, reason, version, createdAt: Date.now() })
    const linkedAlerts = await ctx.db.query('commerceAlertOutbox').withIndex('by_incident', q => q.eq('incidentId', incident._id)).collect()
    for (const alert of linkedAlerts) {
      if (!alert.emailMessageId) continue
      const message = await ctx.db.get(alert.emailMessageId)
      if (!message || ['queued', 'sending', 'submitted', 'unknown'].includes(message.state) ||
        (message.state === 'delivered' && alert.incidentVersion === incident.version)) throw new Error('email_alert_retry_requires_resolution')
    }
    // New audited delivery cycle; old failure and its counter are preserved.
    await enqueueCommerceAlert(ctx, incident._id, authority.environment, 'operator_retry', version)
    return { status: 'queued', version }
  },
})

export const listMissingWebhooks = query({
  args: { ...authorityArgs, paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const { environment } = await requireAdmin(ctx, args)
    // Expired handoff tokens are detection candidates, never proof of a paid Checkout Session.
    const result = await ctx.db.query('commerceCheckoutHandoffs').withIndex('by_expiresAt',
      (q) => q.lt('expiresAt', Date.now() - 30 * 60_000)).order('asc')
      .paginate({ ...args.paginationOpts, numItems: Math.min(50, args.paginationOpts.numItems) })
    const candidates = await Promise.all(result.page.filter((row) => commerceEnvironment(row.environment) === environment).map(async (row) => {
      const receipts = await ctx.db.query('commerceEventReceipts').withIndex('by_purchase', (q) =>
        q.eq('envelope.provider', 'stripe').eq('envelope.environment', environment)
          .eq('envelope.productId', row.productId).eq('envelope.sourceRef', row.idempotencyKey)).collect()
      if (receipts.some((receipt) => receipt.envelope.eventType === 'paid' || ['payment_failed', 'checkout_expired'].includes(receipt.status))) return null
      return { handoffId: row._id, productId: row.productId, sourceRef: row.idempotencyKey,
        providerOrderId: row.providerOrderId ?? null, checkoutState: row.status, createdAt: row.createdAt,
        paymentState: 'unverified' as const }
    }))
    return { ...result, page: candidates.filter((row) => row !== null), environment }
  },
})

/** Only the server route may supply a Checkout Session retrieved from Stripe. No user-editable binding. */
export const repairCheckout = mutation({
  args: { ...authorityArgs, sourceRef: v.string(), environment: v.string(), globalUserId: v.string(),
    productId: v.string(), offerId: v.string(), providerOrderId: v.string(), checkoutUrl: v.optional(v.string()), reason: v.string() },
  handler: async (ctx, args) => {
    const authority = await requireAdmin(ctx, args)
    note(args.reason)
    if (commerceEnvironment(args.environment) !== authority.environment || !args.providerOrderId.startsWith('cs_')) throw new Error('evidence_mismatch')
    const rows = await ctx.db.query('commerceCheckoutHandoffs').withIndex('by_idempotencyKey', (q) => q.eq('idempotencyKey', args.sourceRef)).collect()
    const scoped = rows.filter((row) => commerceEnvironment(row.environment) === authority.environment)
    if (scoped.length !== 1) throw new Error('checkout_not_found_or_ambiguous')
    const handoff = scoped[0]
    if (handoff.globalUserId !== args.globalUserId || handoff.productId !== args.productId || handoff.offerId !== args.offerId ||
      (handoff.providerOrderId && handoff.providerOrderId !== args.providerOrderId)) throw new Error('evidence_mismatch')
    if (handoff.status === 'completed') return { status: 'already_completed' }
    if (handoff.status !== 'claimed') throw new Error('checkout_state_invalid')
    const duplicates = await ctx.db.query('commerceCheckoutHandoffs').withIndex('by_providerOrderId', (q) => q.eq('providerOrderId', args.providerOrderId)).collect()
    if (duplicates.some((row) => row._id !== handoff._id && commerceEnvironment(row.environment) === authority.environment)) throw new Error('evidence_mismatch')
    if (args.checkoutUrl) {
      const url = new URL(args.checkoutUrl)
      if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com' || url.username || url.password) throw new Error('evidence_mismatch')
    }
    await ctx.db.patch(handoff._id, { status: 'completed', providerOrderId: args.providerOrderId,
      ...(args.checkoutUrl ? { checkoutUrl: args.checkoutUrl } : {}), updatedAt: Date.now() })
    await ctx.db.insert('productAccessEvents', { source: 'commerce_operations', eventType: 'checkout_binding_repaired',
      sourceRef: args.sourceRef, eventId: args.providerOrderId, environment: authority.environment, productId: args.productId,
      idempotencyKey: `checkout-repair:${handoff._id}`, status: 'verified', reason: `${authority.operatorId}: ${args.reason}`, createdAt: Date.now() })
    return { status: 'completed', paymentBindingUnchanged: true }
  },
})
