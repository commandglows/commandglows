import { describe, expect, it } from 'vitest'
import {
  acknowledgeIncident,
  evaluateIncident,
  incidentKey,
  notificationId,
  type IncidentIdentity,
  type IncidentPolicy,
} from '../../convex/emailIncidents'

const identity: IncidentIdentity = {
  businessId: 'studio',
  scopeType: 'campaign',
  scopeId: 'camp-1',
  ruleId: 'bounce-rate',
  ruleVersion: '3',
  canonicalDimensions: { provider: 'resend', segment: 'new' },
}
const policy: IncidentPolicy = {
  triggerThreshold: 0.1,
  minimumSample: 10,
  minimumCoverage: 0.8,
  resolutionThreshold: 0.03,
  consecutiveTriggerWindows: 2,
  consecutiveRecoveryWindows: 2,
  notificationCooldownMs: 60_000,
}
const ev = (
  windowId: string,
  value: number,
  extra: Record<string, unknown> = {}
) => ({ windowId, sample: 20, coverage: 1, value, ...extra })

describe('R07 diffusion incident lifecycle', () => {
  it('builds a stable key and notification id', () => {
    expect(incidentKey(identity)).toBe(
      incidentKey({
        ...identity,
        canonicalDimensions: { segment: 'new', provider: 'resend' },
      })
    )
    expect(notificationId('key', 1, 2, 'opening')).toBe(
      notificationId('key', 1, 2, 'opening')
    )
    expect(notificationId('key', 1, 2, 'opening')).not.toBe(
      notificationId('key', 1, 2, 'resolution')
    )
  })

  it('requires consecutive breach windows and emits one opening notification', () => {
    const first = evaluateIncident(null, identity, policy, ev('w1', 0.2), 1)
    expect(first.transition).toBeUndefined()
    const second = evaluateIncident(
      first.incident,
      identity,
      policy,
      ev('w2', 0.2),
      2
    )
    expect(second.transition?.kind).toBe('opened')
    expect(second.notification?.notificationId).toBe(
      notificationId(second.incident!.incidentKey, 1, 1, 'opening')
    )
    expect(
      evaluateIncident(second.incident, identity, policy, ev('w2', 0.2), 3)
        .ignored
    ).toBe(true)
  })

  it('does not resolve on stale or insufficient data', () => {
    const open = evaluateIncident(
      null,
      identity,
      { ...policy, consecutiveTriggerWindows: 1 },
      ev('w1', 0.2),
      1
    ).incident!
    const unavailable = evaluateIncident(
      open,
      identity,
      policy,
      { ...ev('w2', 0.01), stale: true, recovery: true },
      2
    )
    expect(unavailable.incident?.state).toBe('open')
    expect(unavailable.incident?.evaluationUnavailable).toBe(true)
    expect(unavailable.notification).toBeUndefined()
  })

  it('acknowledges without resolving, resolves after recovery, and reopens a new episode', () => {
    const open = evaluateIncident(
      null,
      identity,
      { ...policy, consecutiveTriggerWindows: 1 },
      ev('w1', 0.2),
      1
    ).incident!
    const ack = acknowledgeIncident(open, 2, 'operator-1', 2)
    expect(ack.incident?.state).toBe('acknowledged')
    const r1 = evaluateIncident(
      ack.incident,
      identity,
      policy,
      ev('r1', 0.01, { recovery: true }),
      3,
      3
    )
    expect(r1.incident?.state).toBe('acknowledged')
    const r2 = evaluateIncident(
      r1.incident,
      identity,
      policy,
      ev('r2', 0.01, { recovery: true }),
      4,
      3
    )
    expect(r2.incident?.state).toBe('resolved')
    expect(r2.notification?.notificationKind).toBe('resolution')
    const late1 = evaluateIncident(
      r2.incident,
      identity,
      policy,
      ev('late-1', 0.3, { late: true }),
      5,
      4
    )
    expect(late1.transition).toBeUndefined()
    const reopened = evaluateIncident(
      late1.incident,
      identity,
      policy,
      ev('late-2', 0.3, { late: true }),
      6,
      4
    )
    expect(reopened.incident?.episode).toBe(2)
    expect(reopened.transition?.kind).toBe('reopened')
    expect(reopened.notification?.notificationId).toBe(
      notificationId(reopened.incident!.incidentKey, 2, 4, 'opening')
    )
  })

  it('emits escalation only when crossing severity, not on repeated same severity', () => {
    const first = evaluateIncident(
      null,
      identity,
      { ...policy, consecutiveTriggerWindows: 1 },
      ev('w1', 0.2, { severity: 2 }),
      1
    )
    const same = evaluateIncident(
      first.incident,
      identity,
      { ...policy, consecutiveTriggerWindows: 1 },
      ev('w2', 0.2, { severity: 2 }),
      2
    )
    expect(same.transition).toBeUndefined()
    const worse = evaluateIncident(
      same.incident,
      identity,
      { ...policy, consecutiveTriggerWindows: 1 },
      ev('w3', 0.2, { severity: 3 }),
      3
    )
    expect(worse.transition?.kind).toBe('severity_increased')
    expect(worse.notification?.notificationKind).toBe('severity_increase')
  })
})
