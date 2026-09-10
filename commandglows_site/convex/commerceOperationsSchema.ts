import { defineTable } from 'convex/server'
import { v } from 'convex/values'

export const commerceOperationsTables = {
  commerceIncidents: defineTable({
    receiptId: v.optional(v.id('commerceEventReceipts')), environment: v.string(),
    kind: v.optional(v.string()), checkoutHandoffId: v.optional(v.id('commerceCheckoutHandoffs')),
    providerPayloadHash: v.optional(v.string()), providerEventType: v.optional(v.string()), ingressAttempts: v.optional(v.number()),
    providerEventId: v.string(), productId: v.string(), sourceRef: v.optional(v.string()),
    status: v.string(), reason: v.optional(v.string()), attempts: v.number(),
    queueState: v.union(v.literal('open'), v.literal('escalated'), v.literal('resolved')),
    active: v.boolean(), ownerId: v.optional(v.string()), dueAt: v.number(), version: v.number(),
    resolution: v.optional(v.string()), evidenceReference: v.optional(v.string()),
    createdAt: v.number(), updatedAt: v.number(),
  }).index('by_receipt', ['receiptId']).index('by_provider_event', ['environment', 'providerEventId'])
    .index('by_queue', ['environment', 'active', 'createdAt']).index('by_deadline', ['environment', 'queueState', 'dueAt'])
    .index('by_checkout_reference', ['environment', 'sourceRef', 'kind']),
  commerceIncidentActions: defineTable({
    incidentId: v.id('commerceIncidents'), operatorId: v.string(), action: v.string(),
    reason: v.string(), evidenceReference: v.optional(v.string()), version: v.number(), createdAt: v.number(),
  }).index('by_incident', ['incidentId']),
  commerceAlertOutbox: defineTable({
    incidentId: v.id('commerceIncidents'), environment: v.string(), deduplicationKey: v.string(),
    phase: v.string(), status: v.union(v.literal('pending'), v.literal('delivering'), v.literal('delivered'), v.literal('failed')),
    emailMessageId: v.optional(v.id('emailMessages')), emailState: v.optional(v.string()),
    transportChannel: v.optional(v.union(v.literal('webhook'), v.literal('email'))),
    incidentVersion: v.optional(v.number()),
    attempts: v.number(), nextAttemptAt: v.number(), leaseUntil: v.optional(v.number()),
    lastError: v.optional(v.string()), deliveredAt: v.optional(v.number()), createdAt: v.number(), updatedAt: v.number(),
  }).index('by_deduplication', ['deduplicationKey']).index('by_incident', ['incidentId'])
    .index('by_due', ['environment', 'status', 'nextAttemptAt']).index('by_email_message', ['emailMessageId']),
  commerceOperationsCheckpoints: defineTable({
    environment: v.string(), cursor: v.optional(v.string()), scanBefore: v.number(), updatedAt: v.number(),
  }).index('by_environment', ['environment']),
}
