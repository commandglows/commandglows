import { defineTable } from 'convex/server'
import { v } from 'convex/values'

/** Durable R07 read model. Keep transitions append-only; current state lives on the incident. */
export const emailIncidentTables = {
  emailIncidents: defineTable({
    businessId: v.string(),
    scopeType: v.union(v.literal('campaign'), v.literal('cohort')),
    scopeId: v.string(),
    ruleId: v.string(),
    ruleVersion: v.string(),
    canonicalDimensions: v.string(),
    incidentKey: v.string(),
    episode: v.number(),
    state: v.union(
      v.literal('open'),
      v.literal('acknowledged'),
      v.literal('resolved')
    ),
    severity: v.number(),
    breachWindows: v.number(),
    recoveryWindows: v.number(),
    lastWindowId: v.optional(v.string()),
    evaluationUnavailable: v.boolean(),
    supersedesIncidentKey: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_incidentKey', ['incidentKey'])
    .index('by_business', ['businessId'])
    .index('by_scope', ['businessId', 'scopeType', 'scopeId']),
  emailIncidentTransitions: defineTable({
    incidentKey: v.string(),
    episode: v.number(),
    sequence: v.number(),
    fromState: v.optional(v.string()),
    toState: v.string(),
    kind: v.union(
      v.literal('opened'),
      v.literal('severity_increased'),
      v.literal('acknowledged'),
      v.literal('resolved'),
      v.literal('reopened'),
      v.literal('action_required')
    ),
    severity: v.number(),
    windowId: v.optional(v.string()),
    reason: v.string(),
    operatorId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_incident', ['incidentKey', 'episode'])
    .index('by_incident_sequence', ['incidentKey', 'episode', 'sequence']),
  emailIncidentNotifications: defineTable({
    notificationId: v.string(),
    incidentKey: v.string(),
    episode: v.number(),
    transitionSequence: v.number(),
    notificationKind: v.union(
      v.literal('opening'),
      v.literal('severity_increase'),
      v.literal('resolution'),
      v.literal('action_required')
    ),
    payload: v.any(),
    createdAt: v.number(),
  })
    .index('by_notificationId', ['notificationId'])
    .index('by_incident', ['incidentKey', 'episode']),
  emailIncidentNotificationReads: defineTable({
    notificationId: v.string(),
    operatorId: v.string(),
    readAt: v.optional(v.number()),
    acknowledgedAt: v.optional(v.number()),
    updatedAt: v.number(),
  }).index('by_notificationOperator', ['notificationId', 'operatorId']),
}
