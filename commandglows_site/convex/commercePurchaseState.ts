import type { CommerceEventEnvelope } from './commerceEventContract'

type Decision = { status: 'granted' | 'revoked' | 'suspended' | 'awaiting_payment' | 'pending_review'; reason?: string }
const REFUND_TERMINAL = new Set(['succeeded', 'failed', 'canceled'])
const DISPUTE_CLOSED = new Set(['won', 'lost', 'warning_closed', 'prevented'])
const DISPUTE_OPEN = new Set(['needs_response', 'under_review', 'warning_needs_response', 'warning_under_review'])

// Stripe timestamps have second precision. A terminal state wins over an open
// state in that second; conflicting terminal snapshots need operator review.
function latestState(events: CommerceEventEnvelope[], status: (event: CommerceEventEnvelope) => string | undefined,
  terminal: ReadonlySet<string>) {
  const sorted = [...events].sort((a, b) => (b.providerCreatedAt ?? 0) - (a.providerCreatedAt ?? 0) ||
    Number(terminal.has(status(b) ?? '')) - Number(terminal.has(status(a) ?? '')))
  const latest = sorted[0]
  const ties = sorted.filter((event) => event.providerCreatedAt === latest.providerCreatedAt &&
    terminal.has(status(event) ?? '') === terminal.has(status(latest) ?? ''))
  return ties.some((event) => status(event) !== status(latest)) ? null : latest
}

function grouped(events: CommerceEventEnvelope[], key: (event: CommerceEventEnvelope) => string | undefined) {
  const groups = new Map<string, CommerceEventEnvelope[]>()
  for (const event of events) {
    const id = key(event)
    if (!id) return null
    groups.set(id, [...(groups.get(id) ?? []), event])
  }
  return groups
}

export function deriveCommercePurchaseState(events: CommerceEventEnvelope[], previouslyPaid: boolean): Decision {
  if (events.some((event) => event.eventType === 'refunded' || event.eventType === 'revoked')) {
    return { status: 'revoked', reason: 'purchase_already_revoked' }
  }
  const refunds = grouped(events.filter((event) => event.eventType === 'refund_updated'), (event) => event.providerRefundId)
  const disputes = grouped(events.filter((event) => event.eventType === 'dispute_updated'), (event) => event.providerDisputeId)
  if (!refunds || !disputes) return { status: 'pending_review', reason: 'invalid_financial_evidence' }
  let refunded = 0
  let amount: number | undefined
  let currency: string | undefined
  let refundAttention: string | undefined
  for (const versions of refunds.values()) {
    const latest = latestState(versions, (event) => event.refundStatus, REFUND_TERMINAL)
    if (!latest) return { status: 'pending_review', reason: 'conflicting_refund_evidence' }
    if (!Number.isSafeInteger(latest.chargeAmount) || latest.chargeAmount! <= 0 ||
      !Number.isSafeInteger(latest.refundAmount) || latest.refundAmount! <= 0 || latest.refundAmount! > latest.chargeAmount! ||
      !/^[a-z]{3}$/.test(latest.currency ?? '') ||
      (amount !== undefined && amount !== latest.chargeAmount) || (currency !== undefined && currency !== latest.currency)) {
      return { status: 'pending_review', reason: 'invalid_refund_amount' }
    }
    amount = latest.chargeAmount
    currency = latest.currency
    if (versions.some((event) => event.refundAmount !== latest.refundAmount || event.chargeAmount !== amount || event.currency !== currency)) {
      return { status: 'pending_review', reason: 'conflicting_refund_evidence' }
    }
    if (latest.refundStatus === 'succeeded') refunded += latest.refundAmount!
    else if (latest.refundStatus === 'failed') refundAttention = 'refund_failed'
    else if (latest.refundStatus === 'requires_action') refundAttention = 'refund_requires_action'
    else if (!['pending', 'canceled'].includes(latest.refundStatus ?? '')) {
      return { status: 'pending_review', reason: 'unknown_refund_status' }
    }
  }
  if (amount !== undefined && (refunded > amount || events.some((event) => event.eventType === 'paid' &&
    ((event.chargeAmount !== undefined && event.chargeAmount !== amount) || (event.currency !== undefined && event.currency !== currency))))) {
    return { status: 'pending_review', reason: 'conflicting_refund_evidence' }
  }
  if (amount !== undefined && refunded === amount) return { status: 'revoked', reason: 'commerce_full_refund' }
  let openDispute = false
  for (const versions of disputes.values()) {
    const closedStatuses = new Set(versions.map((event) => event.disputeStatus).filter((status) => DISPUTE_CLOSED.has(status ?? '')))
    if (closedStatuses.size > 1) return { status: 'pending_review', reason: 'conflicting_dispute_evidence' }
    const latest = latestState(versions, (event) => event.disputeStatus, DISPUTE_CLOSED)
    if (!latest) return { status: 'pending_review', reason: 'conflicting_dispute_evidence' }
    if (latest.disputeStatus === 'lost') return { status: 'revoked', reason: 'commerce_dispute_lost' }
    if (DISPUTE_OPEN.has(latest.disputeStatus ?? '')) openDispute = true
    else if (!DISPUTE_CLOSED.has(latest.disputeStatus ?? '')) {
      return { status: 'pending_review', reason: 'unknown_dispute_status' }
    }
  }
  if (openDispute) return { status: 'suspended', reason: 'commerce_dispute_open' }
  if (!previouslyPaid && !events.some((event) => event.eventType === 'paid')) {
    return { status: 'awaiting_payment', reason: 'verified_payment_pending' }
  }
  return { status: 'granted', reason: refundAttention ?? (refunded > 0 ? 'commerce_partial_refund' : undefined) }
}
