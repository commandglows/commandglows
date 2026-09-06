import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'
import { commerceEnvironment, type CommerceEventEnvelope } from './commerceEventContract'

type Dependencies = {
  supportsOffer: (offer: string, product: string, plan: string) => boolean
}
type Result = { ok: boolean; status: string; reason?: string; globalUserDocId?: Id<'globalUsers'> }
const pending = (reason: string): Result => ({ ok: false, status: 'pending_review', reason })

function runtimeEnvironment() {
  return commerceEnvironment(process.env.SUITE_BRIDGE_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV || '')
}

function sameEnvelope(left: CommerceEventEnvelope, right: CommerceEventEnvelope) {
  return (Object.keys({ ...left, ...right }) as (keyof CommerceEventEnvelope)[])
    .every((key) => left[key] === right[key])
}

function purchaseReferences(event: CommerceEventEnvelope) {
  // Raw references are read only for the historical CommunityGlows ledger.
  return event.productId === 'communityglows'
    ? [`${event.productId}:${event.sourceRef}`, event.sourceRef!]
    : [`${event.productId}:${event.sourceRef}`]
}

async function purchaseHistory(ctx: MutationCtx, event: CommerceEventEnvelope) {
  const history: Doc<'productAccessEvents'>[] = []
  const pairs = [['suite_commerce', `${event.productId}:${event.sourceRef}`]]
  if (event.productId === 'communityglows') pairs.push(['communityglows_commerce', event.sourceRef!])
  for (const [source, sourceRef] of pairs) {
    const rows = await ctx.db.query('productAccessEvents').withIndex('by_sourceRef',
      (q) => q.eq('source', source).eq('sourceRef', sourceRef)).collect()
    history.push(...rows.filter((row) => row.productId === event.productId &&
      commerceEnvironment(row.environment) === event.environment))
  }
  return history
}

async function resolvePurchase(ctx: MutationCtx, event: CommerceEventEnvelope) {
  if (!event.sourceRef?.trim()) return { error: 'missing_purchase_reference' } as const
  const history = await purchaseHistory(ctx, event)
  const handoffs = await ctx.db.query('commerceCheckoutHandoffs')
    .withIndex('by_idempotencyKey', (q) => q.eq('idempotencyKey', event.sourceRef!)).collect()
  const scoped = handoffs.filter((row) => commerceEnvironment(row.environment) === event.environment)
  if (scoped.length > 1) return { error: 'ambiguous_purchase' } as const
  const handoff = scoped[0]
  let owner: Doc<'globalUsers'> | null = null
  if (handoff) {
    if (handoff.productId !== event.productId || handoff.offerId !== event.offerId ||
      (event.globalUserId && handoff.globalUserId !== event.globalUserId)) {
      return { error: 'purchase_context_mismatch' } as const
    }
    if (event.eventType === 'paid' && (handoff.status !== 'completed' ||
      handoff.providerOrderId !== event.providerOrderId)) {
      return { error: 'checkout_not_completed_or_mismatched' } as const
    }
    if (!event.providerPaymentIntentId?.startsWith('pi_')) return { error: 'missing_payment_reference' } as const
    if (handoff.providerPaymentIntentId && handoff.providerPaymentIntentId !== event.providerPaymentIntentId) {
      return { error: 'purchase_payment_reference_mismatch' } as const
    }
    if (!handoff.providerPaymentIntentId) {
      if (event.eventType !== 'paid') return { error: 'purchase_payment_reference_missing' } as const
      const payments = await ctx.db.query('commerceCheckoutHandoffs').withIndex('by_paymentIntent',
        (q) => q.eq('providerPaymentIntentId', event.providerPaymentIntentId)).collect()
      if (payments.some((row) => row._id !== handoff._id && commerceEnvironment(row.environment) === event.environment)) {
        return { error: 'payment_already_bound' } as const
      }
    }
    owner = await ctx.db.query('globalUsers').withIndex('by_globalUserId',
      (q) => q.eq('globalUserId', handoff.globalUserId)).unique()
  } else {
    // Historical rows lack a verified session-to-payment binding. Preserve them for
    // explicit reconciliation rather than guessing from provider metadata.
    if (event.eventType === 'paid') return { error: 'purchase_not_found' } as const
    return { error: history.length ? 'historical_purchase_reference_unverified' : 'purchase_not_found' } as const
  }
  if (!owner) return { error: 'missing_global_user' } as const
  if (event.globalUserId && event.globalUserId !== owner.globalUserId) return { error: 'purchase_identity_mismatch' } as const
  if (history.some((row) => row.globalUserId && row.globalUserId !== owner._id)) return { error: 'ambiguous_purchase' } as const

  if (event.providerCustomerId) {
    const identities = await ctx.db.query('identityAccounts').withIndex('by_providerAccount',
      (q) => q.eq('provider', event.provider).eq('providerAccountId', event.providerCustomerId!)).collect()
    // An unscoped historical identity cannot be silently reassigned to an environment.
    if (identities.some((row) => !row.environment ||
      (commerceEnvironment(row.environment) === event.environment && row.globalUserId !== owner._id))) {
      return { error: 'provider_identity_mismatch' } as const
    }
    if (history.some((row) => ['granted', 'revoked'].includes(row.status) && row.customerId && row.customerId !== event.providerCustomerId)) {
      return { error: 'purchase_customer_mismatch' } as const
    }
  }
  const refs = purchaseReferences(event)
  const rows = (await Promise.all(refs.map((sourceRef) => ctx.db.query('productEntitlements')
    .withIndex('by_sourceRef', (q) => q.eq('sourceRef', sourceRef)).collect()))).flat()
  const entitlements = rows.filter((row) => row.productId === event.productId &&
    commerceEnvironment(row.environment) === event.environment && refs.includes(row.sourceRef ?? '') &&
    ((row.idempotencyKey.startsWith('suite:commerce:') && row.sourceRef === refs[0]) ||
      (event.productId === 'communityglows' && row.idempotencyKey.startsWith('communityglows:commerce:') && row.sourceRef === event.sourceRef)))
  if (entitlements.some((row) => row.plan !== event.plan)) return { error: 'purchase_plan_mismatch' } as const
  if (entitlements.some((row) => row.globalUserId !== owner._id)) return { error: 'purchase_identity_mismatch' } as const
  if (handoff && !handoff.providerPaymentIntentId) {
    // Only the signed paid session matching the completed handoff can bind its payment.
    await ctx.db.patch(handoff._id, { providerPaymentIntentId: event.providerPaymentIntentId, updatedAt: Date.now() })
  }
  return { owner, history, entitlements } as const
}

async function applyEvent(ctx: MutationCtx, event: CommerceEventEnvelope, dependencies: Dependencies): Promise<Result> {
  if (event.provider !== 'stripe') return pending('provider_not_allowed')
  if (!commerceEnvironment(event.environment) || event.environment !== runtimeEnvironment()) return pending('environment_mismatch')
  if (!dependencies.supportsOffer(event.offerId, event.productId, event.plan)) return pending('unsupported_offer')
  if (event.status === 'ignored') return { ok: true, status: 'ignored', reason: 'ignored_webhook_event' }
  if (event.eventType === 'pending_review' || event.status === 'pending_review') return pending('commerce_pending_review')
  const purchase = await resolvePurchase(ctx, event)
  if ('error' in purchase) return pending(purchase.error ?? 'purchase_not_found')
  const { owner, history, entitlements } = purchase
  const terminal = history.some((row) => row.status === 'revoked' ||
    (row.status === 'pending_review' && row.reason === 'missing_global_user_for_revoke')) || entitlements.some((row) => row.status === 'revoked')
  const now = Date.now()
  if (event.eventType === 'paid') {
    if (terminal) return { ok: true, status: 'revoked', reason: 'purchase_already_revoked', globalUserDocId: owner._id }
    // Refunds arriving before identity/checkout completion still block delayed payment.
    const reviews = await ctx.db.query('commerceEventReceipts').withIndex('by_purchase', (q) =>
      q.eq('envelope.provider', event.provider).eq('envelope.environment', event.environment)
        .eq('envelope.productId', event.productId).eq('envelope.sourceRef', event.sourceRef)).collect()
    if (reviews.some((row) => row.status === 'pending_review' && row.envelope.provider === 'stripe' && row.envelope.environment === event.environment &&
      row.envelope.productId === event.productId && row.envelope.offerId === event.offerId && row.envelope.plan === event.plan &&
      row.envelope.sourceRef === event.sourceRef && row.envelope.status === 'applied' &&
      row.envelope.providerPaymentIntentId === event.providerPaymentIntentId &&
      (!row.envelope.globalUserId || row.envelope.globalUserId === owner.globalUserId) &&
      ['missing_global_user', 'checkout_not_completed_or_mismatched', 'purchase_not_found', 'purchase_payment_reference_missing'].includes(row.reason ?? '') &&
      (row.envelope.eventType === 'refunded' || row.envelope.eventType === 'revoked'))) {
      return pending('negative_transition_pending_review')
    }
    if (!entitlements.some((row) => row.status === 'active')) {
      await ctx.db.insert('productEntitlements', {
        globalUserId: owner._id, productId: event.productId, plan: event.plan,
        status: 'active', source: 'suite_commerce', sourceRef: `${event.productId}:${event.sourceRef}`,
        environment: event.environment,
        idempotencyKey: `suite:commerce:grant:${JSON.stringify([event.provider, event.environment, event.productId, event.sourceRef])}`,
        grantedAt: now, createdAt: now, updatedAt: now,
      })
    }
    return { ok: true, status: 'granted', globalUserDocId: owner._id }
  }
  // Revoke all historical duplicate grants for this exact purchase, never another purchase/trial/manual grant.
  for (const row of entitlements.filter((entry) => entry.status === 'active')) {
    await ctx.db.patch(row._id, { status: 'revoked', updatedAt: now })
  }
  return { ok: true, status: 'revoked', reason: event.eventType === 'refunded' ? 'commerce_refunded' : 'commerce_revoked', globalUserDocId: owner._id }
}

async function recordResult(ctx: MutationCtx, receipt: Doc<'commerceEventReceipts'>, result: Result, attempt: number) {
  const event = receipt.envelope
  await ctx.db.patch(receipt._id, { status: result.status, reason: result.reason, attempts: attempt, updatedAt: Date.now() })
  await ctx.db.insert('productAccessEvents', {
    source: 'suite_commerce', eventType: `suite_commerce.${event.eventType}`,
    eventId: event.providerEventId, sourceRef: `${event.productId}:${event.sourceRef ?? ''}`,
    idempotencyKey: `suite:commerce:event:${receipt._id}:${attempt}`, environment: event.environment,
    productId: event.productId, globalUserId: result.globalUserDocId,
    customerId: event.providerCustomerId, customerEmail: event.customerEmail,
    status: result.status, reason: result.reason, createdAt: Date.now(),
  })
}

export async function receiveCommerceEvent(ctx: MutationCtx, input: CommerceEventEnvelope, dependencies: Dependencies) {
  for (const value of [input.provider, input.providerEventId, input.providerOrderId, input.idempotencyKey, input.offerId, input.productId, input.plan]) {
    if (!value.trim() || value !== value.trim() || value.length > 512) throw new Error('invalid_commerce_identifier')
  }
  if (input.sourceRef !== undefined && (!input.sourceRef.trim() || input.sourceRef !== input.sourceRef.trim() || input.sourceRef.length > 512)) {
    throw new Error('invalid_purchase_reference')
  }
  if (input.provider === 'stripe' && input.status === 'applied' && input.eventType !== 'pending_review' &&
    (!input.providerOrderId.startsWith(input.eventType === 'paid' ? 'cs_' : 'ch_') ||
      (input.providerSourceRef !== undefined && input.providerSourceRef !== input.providerOrderId))) {
    throw new Error('invalid_provider_purchase_reference')
  }
  const envelope = { ...input, environment: commerceEnvironment(input.environment) ?? input.environment }
  const eventKey = JSON.stringify([envelope.provider, envelope.environment, envelope.providerEventId])
  const existing = await ctx.db.query('commerceEventReceipts').withIndex('by_eventKey', (q) => q.eq('eventKey', eventKey)).unique()
  if (existing) {
    if (!sameEnvelope(existing.envelope, envelope)) throw new Error('commerce_event_binding_conflict')
    if (envelope.environment !== runtimeEnvironment()) {
      return { ...pending('environment_mismatch'), alreadyProcessed: true, receiptId: existing._id }
    }
    return { ok: existing.status !== 'pending_review', status: existing.status, reason: existing.reason,
      alreadyProcessed: true, receiptId: existing._id }
  }
  const reusedKeys = await ctx.db.query('commerceEventReceipts').withIndex('by_environmentIdempotency',
    (q) => q.eq('envelope.environment', envelope.environment).eq('envelope.idempotencyKey', envelope.idempotencyKey)).collect()
  if (reusedKeys.some((row) => row.envelope.provider === envelope.provider)) throw new Error('commerce_event_binding_conflict')
  // Bind pre-receipt events too, without backfilling or overwriting their audit rows.
  const historical = (await Promise.all([
    ctx.db.query('productAccessEvents').withIndex('by_eventId', (q) => q.eq('eventId', envelope.providerEventId)).collect(),
    ctx.db.query('productAccessEvents').withIndex('by_idempotencyKey', (q) => q.eq('idempotencyKey', envelope.idempotencyKey)).collect(),
  ])).flat().filter((row) => commerceEnvironment(row.environment) === envelope.environment &&
    (row.source === 'suite_commerce' || row.source === 'communityglows_commerce'))
  for (const row of historical) {
    const expectedRef = row.source === 'suite_commerce' ? `${envelope.productId}:${envelope.sourceRef}` : envelope.sourceRef
    const owner = row.globalUserId ? await ctx.db.get(row.globalUserId) : null
    if (row.productId !== envelope.productId || row.sourceRef !== expectedRef ||
      (row.eventId && row.eventId !== envelope.providerEventId) ||
      (owner && envelope.globalUserId && owner.globalUserId !== envelope.globalUserId) ||
      (row.customerId && envelope.providerCustomerId && row.customerId !== envelope.providerCustomerId)) {
      throw new Error('commerce_event_binding_conflict')
    }
  }
  const receiptId = await ctx.db.insert('commerceEventReceipts', {
    eventKey, envelope, status: 'pending_review', attempts: 0, createdAt: Date.now(), updatedAt: Date.now(),
  })
  const receipt = (await ctx.db.get(receiptId))!
  const result = await applyEvent(ctx, envelope, dependencies)
  await recordResult(ctx, receipt, result, 1)
  return { ...result, alreadyProcessed: false, receiptId }
}

const RECOVERABLE_REASONS = new Set(['missing_global_user', 'purchase_not_found', 'checkout_not_completed_or_mismatched', 'negative_transition_pending_review', 'purchase_payment_reference_missing'])

export async function reviewCommerceEvent(ctx: MutationCtx, args: {
  receiptId: Id<'commerceEventReceipts'>; expectedAttempts: number; operatorId: string; reason: string; dryRun: boolean
}, dependencies: Dependencies) {
  if (!args.operatorId.trim() || !args.reason.trim() || args.operatorId.length > 200 || args.reason.length > 500) throw new Error('review_audit_required')
  const receipt = await ctx.db.get(args.receiptId)
  if (!receipt) throw new Error('commerce_receipt_not_found')
  if (receipt.envelope.environment !== runtimeEnvironment()) throw new Error('environment_mismatch')
  if (receipt.attempts !== args.expectedAttempts) throw new Error('review_attempt_conflict')
  if (receipt.status !== 'pending_review') return { eligible: false, alreadyProcessed: true, status: receipt.status }
  const eligible = receipt.attempts < 5 && RECOVERABLE_REASONS.has(receipt.reason ?? '')
  if (args.dryRun) return { eligible, alreadyProcessed: false, status: receipt.status, reason: receipt.reason, attempts: receipt.attempts }
  if (!eligible) throw new Error('commerce_review_not_recoverable')
  const result = await applyEvent(ctx, receipt.envelope, dependencies)
  const attempt = receipt.attempts + 1
  await recordResult(ctx, receipt, result, attempt)
  await ctx.db.insert('commerceEventReviewAttempts', {
    receiptId: receipt._id, attempt, operatorId: args.operatorId, reason: args.reason,
    previousStatus: receipt.status, previousReason: receipt.reason,
    resultingStatus: result.status, resultingReason: result.reason, createdAt: Date.now(),
  })
  return { ...result, eligible: true, alreadyProcessed: false, attempts: attempt }
}
