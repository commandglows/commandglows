import { v } from 'convex/values'
import type { Infer } from 'convex/values'

// The verified adapter envelope is retained without credentials or arbitrary metadata.
export const commerceEventFields = {
  provider: v.string(),
  offerId: v.string(),
  productId: v.string(),
  plan: v.string(),
  eventType: v.union(v.literal('paid'), v.literal('refunded'), v.literal('revoked'), v.literal('pending_review'),
    v.literal('refund_updated'), v.literal('dispute_updated'), v.literal('checkout_pending'),
    v.literal('checkout_failed'), v.literal('checkout_expired')),
  environment: v.string(),
  providerEventId: v.string(),
  providerOrderId: v.string(),
  idempotencyKey: v.string(),
  status: v.union(v.literal('applied'), v.literal('pending_review'), v.literal('ignored')),
  customerEmail: v.optional(v.string()),
  providerCustomerId: v.optional(v.string()),
  globalUserId: v.optional(v.string()),
  sourceRef: v.optional(v.string()),
  providerSourceRef: v.optional(v.string()),
  providerInvoiceId: v.optional(v.string()),
  providerPaymentIntentId: v.optional(v.string()),
  // Additive provider evidence; legacy envelopes remain readable and immutable.
  providerPayloadHash: v.optional(v.string()),
  providerCreatedAt: v.optional(v.number()),
  providerEventType: v.optional(v.string()),
  providerRefundId: v.optional(v.string()),
  refundStatus: v.optional(v.string()),
  refundAmount: v.optional(v.number()),
  chargeAmount: v.optional(v.number()),
  currency: v.optional(v.string()),
  providerDisputeId: v.optional(v.string()),
  disputeStatus: v.optional(v.string()),
}

export const commerceEventEnvelope = v.object(commerceEventFields)
export type CommerceEventEnvelope = Infer<typeof commerceEventEnvelope>

export function commerceEnvironment(value: string): string | null {
  if (value === 'production') return value
  if (['sandbox', 'test', 'development', 'preview', 'staging'].includes(value)) return 'sandbox'
  return null
}
