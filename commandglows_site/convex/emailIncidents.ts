export type IncidentState = 'open' | 'acknowledged' | 'resolved'
export type IncidentScope = 'campaign' | 'cohort'
export type NotificationKind = 'opening' | 'severity_increase' | 'resolution' | 'action_required'

export type IncidentIdentity = {
  businessId: string
  scopeType: IncidentScope
  scopeId: string
  ruleId: string
  ruleVersion: string
  canonicalDimensions: Record<string, string | number | boolean | null>
}

export type IncidentPolicy = {
  triggerThreshold: number
  minimumSample: number
  minimumCoverage: number
  resolutionThreshold: number
  consecutiveTriggerWindows: number
  consecutiveRecoveryWindows: number
  notificationCooldownMs: number
}

export type IncidentRecord = IncidentIdentity & {
  incidentKey: string
  episode: number
  state: IncidentState
  severity: number
  breachWindows: number
  recoveryWindows: number
  lastWindowId?: string
  evaluationUnavailable: boolean
  supersedesIncidentKey?: string
  updatedAt: number
}

export type IncidentEvaluation = {
  windowId: string
  sample: number
  coverage: number
  value?: number
  stale?: boolean
  /** A complete comparable window with a value below resolutionThreshold. */
  recovery?: boolean
  severity?: number
  late?: boolean
}

export type IncidentTransition = {
  incidentKey: string
  episode: number
  sequence: number
  fromState?: IncidentState
  toState: IncidentState
  kind: 'opened' | 'severity_increased' | 'acknowledged' | 'resolved' | 'reopened' | 'action_required'
  severity: number
  windowId?: string
  reason: string
  createdAt: number
}

export type IncidentNotification = {
  notificationId: string
  incidentKey: string
  episode: number
  transitionSequence: number
  notificationKind: NotificationKind
  payload: { state: IncidentState; severity: number; reason: string }
  createdAt: number
}

export type IncidentOutcome = {
  incident: IncidentRecord | null
  transition?: IncidentTransition
  notification?: IncidentNotification
  ignored: boolean
}

const canonical = (value: Record<string, unknown>) =>
  JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))))

export function incidentKey(identity: IncidentIdentity) {
  return [identity.businessId, identity.scopeType, identity.scopeId, identity.ruleId,
    identity.ruleVersion, canonical(identity.canonicalDimensions)].join('|')
}

export function notificationId(key: string, episode: number, sequence: number, kind: NotificationKind) {
  return JSON.stringify([key, episode, sequence, kind])
}

const transition = (incident: IncidentRecord, kind: IncidentTransition['kind'], toState: IncidentState,
  reason: string, now: number, windowId?: string): IncidentTransition => ({
  incidentKey: incident.incidentKey, episode: incident.episode, sequence: 1,
  fromState: incident.state, toState, kind, severity: incident.severity, windowId, reason, createdAt: now,
})

/** Deterministic state machine. Callers persist the returned transition and notification atomically. */
export function evaluateIncident(
  current: IncidentRecord | null,
  identity: IncidentIdentity,
  policy: IncidentPolicy,
  evaluation: IncidentEvaluation,
  now: number,
  nextSequence = 1,
): IncidentOutcome {
  const key = incidentKey(identity)
  const comparable = !evaluation.stale && evaluation.sample >= policy.minimumSample && evaluation.coverage >= policy.minimumCoverage
  if (!comparable) {
    if (!current) return { incident: null, ignored: true }
    return { incident: { ...current, evaluationUnavailable: true, updatedAt: now }, ignored: true }
  }
  if (current?.lastWindowId === evaluation.windowId) return { incident: current, ignored: true }
  const severity = evaluation.severity ?? (evaluation.value !== undefined ? evaluation.value : policy.triggerThreshold)
  const breached = evaluation.value !== undefined && evaluation.value >= policy.triggerThreshold
  const recovered = evaluation.recovery === true && evaluation.value !== undefined && evaluation.value <= policy.resolutionThreshold
  if (!current) {
    if (!breached) return { incident: null, ignored: true }
    const incident: IncidentRecord = { ...identity, incidentKey: key, episode: 1, state: 'open', severity,
      breachWindows: 1, recoveryWindows: 0, lastWindowId: evaluation.windowId, evaluationUnavailable: false, updatedAt: now }
    if (policy.consecutiveTriggerWindows > 1) return { incident, ignored: true }
    const t = transition(incident, 'opened', 'open', 'qualified_breach', now, evaluation.windowId)
    t.sequence = nextSequence
    return { incident, transition: t, notification: makeNotification(t, 'opening'), ignored: false }
  }
  const base = { ...current, evaluationUnavailable: false, lastWindowId: evaluation.windowId, updatedAt: now }
  if (breached) {
    base.breachWindows = current.breachWindows + 1
    base.recoveryWindows = 0
    if (current.state === 'open' && current.breachWindows < policy.consecutiveTriggerWindows &&
      base.breachWindows >= policy.consecutiveTriggerWindows) {
      base.severity = severity
      const t = transition(base, 'opened', 'open', 'qualified_breach', now, evaluation.windowId)
      t.sequence = nextSequence
      return { incident: base, transition: t, notification: makeNotification(t, 'opening'), ignored: false }
    }
    if (current.state === 'resolved' && base.breachWindows >= policy.consecutiveTriggerWindows) {
      base.episode = current.episode + 1; base.state = 'open'; base.severity = severity
      const t = transition(base, 'reopened', 'open', evaluation.late ? 'late_qualified_breach' : 'qualified_breach', now, evaluation.windowId)
      t.sequence = nextSequence
      return { incident: base, transition: t, notification: makeNotification(t, 'opening'), ignored: false }
    }
    if (current.state !== 'resolved' && severity > current.severity) {
      base.severity = severity
      const t = transition(base, 'severity_increased', current.state, 'severity_boundary_crossed', now, evaluation.windowId)
      t.sequence = nextSequence
      return { incident: base, transition: t, notification: makeNotification(t, 'severity_increase'), ignored: false }
    }
    return { incident: base, ignored: true }
  }
  if (recovered && current.state !== 'resolved') {
    base.recoveryWindows = current.recoveryWindows + 1; base.breachWindows = 0
    if (base.recoveryWindows >= policy.consecutiveRecoveryWindows) {
      base.state = 'resolved'
      const t = transition(base, 'resolved', 'resolved', 'qualified_recovery', now, evaluation.windowId)
      t.sequence = nextSequence
      return { incident: base, transition: t, notification: makeNotification(t, 'resolution'), ignored: false }
    }
  }
  return { incident: base, ignored: true }
}

export function acknowledgeIncident(current: IncidentRecord, now: number, operatorId: string, nextSequence = 1): IncidentOutcome {
  if (current.state !== 'open') return { incident: current, ignored: true }
  const incident = { ...current, state: 'acknowledged' as const, updatedAt: now }
  const t = transition(incident, 'acknowledged', 'acknowledged', `acknowledged_by:${operatorId}`, now)
  t.sequence = nextSequence
  return { incident, transition: t, ignored: false }
}

function makeNotification(t: IncidentTransition, kind: NotificationKind): IncidentNotification {
  return { notificationId: notificationId(t.incidentKey, t.episode, t.sequence, kind), incidentKey: t.incidentKey,
    episode: t.episode, transitionSequence: t.sequence, notificationKind: kind,
    payload: { state: t.toState, severity: t.severity, reason: t.reason }, createdAt: t.createdAt }
}
