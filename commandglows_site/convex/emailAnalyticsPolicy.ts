import type { IncidentPolicy } from './emailIncidents'
import {
  evaluateIncident,
  type IncidentEvaluation,
  type IncidentIdentity,
  type IncidentRecord,
} from './emailIncidents'

/**
 * Local contract for R06/R07 configuration. Values are supplied by an
 * approved policy; this module deliberately provides no defaults.
 */
export type AnalyticsPolicyRecord = {
  status?: unknown
  revision?: unknown
  analytics?: {
    enabled?: unknown
    collectProviderEvents?: unknown
    collectClicks?: unknown
    collectReplies?: unknown
    maxEventAgeMs?: unknown
    observationDelayMs?: unknown
    retentionMs?: {
      events?: unknown
      incidents?: unknown
      notifications?: unknown
      quarantine?: unknown
    }
    rules?: Array<{
      id?: unknown
      version?: unknown
      metric?: unknown
      enabled?: unknown
      triggerThreshold?: unknown
      minimumSample?: unknown
      minimumCoverage?: unknown
      observationDelayMs?: unknown
      consecutiveTriggerWindows?: unknown
      resolutionThreshold?: unknown
      consecutiveRecoveryWindows?: unknown
      notificationCooldownMs?: unknown
    }>
  }
}

export type ExplicitAnalyticsPolicy = {
  revision: number
  collectProviderEvents: boolean
  collectClicks: boolean
  collectReplies: boolean
  maxEventAgeMs: number
  observationDelayMs: number
  retentionMs: {
    events: number
    incidents: number
    notifications: number
    quarantine: number
  }
  rules: Array<{
    id: string
    version: string
    metric: string
    policy: IncidentPolicy & { observationDelayMs: number }
  }>
}

const positive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0
const METRICS = new Set([
  'acceptance',
  'delivery',
  'temporary_bounce',
  'hard_bounce',
  'technical_failure',
  'complaint',
  'unsubscribe',
  'click',
  'reply',
])

/** Missing, unapproved, or partial analytics policy is unavailable (closed). */
export function explicitAnalyticsPolicy(
  record: AnalyticsPolicyRecord | null | undefined
): ExplicitAnalyticsPolicy | null {
  const config = record?.analytics
  if (
    record?.status !== 'approved' ||
    !positive(record.revision) ||
    config?.enabled !== true ||
    typeof config.collectProviderEvents !== 'boolean' ||
    typeof config.collectClicks !== 'boolean' ||
    typeof config.collectReplies !== 'boolean' ||
    !positive(config.maxEventAgeMs) ||
    !positive(config.observationDelayMs)
  )
    return null

  const retention = config.retentionMs
  if (
    !retention ||
    !positive(retention.events) ||
    !positive(retention.incidents) ||
    !positive(retention.notifications) ||
    !positive(retention.quarantine)
  )
    return null

  if (!Array.isArray(config.rules)) return null
  const rules: ExplicitAnalyticsPolicy['rules'] = []
  const ruleIds = new Set<string>()
  for (const rule of config.rules) {
    if (
      !rule ||
      rule.enabled !== true ||
      typeof rule.id !== 'string' ||
      !rule.id ||
      typeof rule.version !== 'string' ||
      !rule.version ||
      typeof rule.metric !== 'string' ||
      !METRICS.has(rule.metric) ||
      typeof rule.triggerThreshold !== 'number' ||
      !Number.isFinite(rule.triggerThreshold) ||
      !positive(rule.minimumSample) ||
      typeof rule.minimumCoverage !== 'number' ||
      !Number.isFinite(rule.minimumCoverage) ||
      rule.minimumCoverage <= 0 ||
      rule.minimumCoverage > 1 ||
      !positive(rule.observationDelayMs) ||
      !positive(rule.consecutiveTriggerWindows) ||
      typeof rule.resolutionThreshold !== 'number' ||
      !Number.isFinite(rule.resolutionThreshold) ||
      !positive(rule.consecutiveRecoveryWindows) ||
      !positive(rule.notificationCooldownMs)
    )
      return null
    if (ruleIds.has(rule.id)) return null
    ruleIds.add(rule.id)
    rules.push({
      id: rule.id,
      version: rule.version,
      metric: rule.metric,
      policy: {
        triggerThreshold: rule.triggerThreshold,
        minimumSample: rule.minimumSample,
        minimumCoverage: rule.minimumCoverage,
        observationDelayMs: rule.observationDelayMs,
        resolutionThreshold: rule.resolutionThreshold,
        consecutiveTriggerWindows: rule.consecutiveTriggerWindows,
        consecutiveRecoveryWindows: rule.consecutiveRecoveryWindows,
        notificationCooldownMs: rule.notificationCooldownMs,
      },
    })
  }

  return {
    revision: record.revision,
    collectProviderEvents: config.collectProviderEvents,
    collectClicks: config.collectClicks,
    collectReplies: config.collectReplies,
    maxEventAgeMs: config.maxEventAgeMs,
    observationDelayMs: config.observationDelayMs,
    retentionMs: {
      events: retention.events,
      incidents: retention.incidents,
      notifications: retention.notifications,
      quarantine: retention.quarantine,
    },
    rules,
  }
}

/** Gate used by local/hosted evaluators: absent policy means no evaluation. */
export function evaluateConfiguredIncident(input: {
  record: AnalyticsPolicyRecord | null | undefined
  ruleId: string
  current: IncidentRecord | null
  identity: IncidentIdentity
  evaluation: IncidentEvaluation
  now: number
  nextSequence?: number
}) {
  const configured = explicitAnalyticsPolicy(input.record)
  if (!configured) return null
  const rule = configured.rules.find(
    (candidate) => candidate.id === input.ruleId
  )
  if (!rule) return null
  const collectionEnabled =
    rule.metric === 'click'
      ? configured.collectClicks
      : rule.metric === 'reply'
        ? configured.collectReplies
        : configured.collectProviderEvents
  if (!collectionEnabled) return null
  return evaluateIncident(
    input.current,
    input.identity,
    rule.policy,
    input.evaluation,
    input.now,
    input.nextSequence
  )
}
