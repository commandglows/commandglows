import { describe, expect, it } from 'vitest'
import {
  evaluateConfiguredIncident,
  explicitAnalyticsPolicy,
} from '../../convex/emailAnalyticsPolicy'

const approvedFixture = {
  status: 'approved',
  revision: 7,
  analytics: {
    enabled: true,
    collectProviderEvents: true,
    collectClicks: false,
    collectReplies: false,
    maxEventAgeMs: 1000,
    observationDelayMs: 2000,
    retentionMs: {
      events: 3000,
      incidents: 4000,
      notifications: 5000,
      quarantine: 6000,
    },
    rules: [
      {
        id: 'bounce-fixture',
        version: 'test-v1',
        metric: 'hard_bounce',
        enabled: true,
        triggerThreshold: 0.1,
        minimumSample: 10,
        minimumCoverage: 0.8,
        observationDelayMs: 2000,
        consecutiveTriggerWindows: 2,
        resolutionThreshold: 0.03,
        consecutiveRecoveryWindows: 2,
        notificationCooldownMs: 60_000,
      },
    ],
  },
}

describe('R06/R07 explicit analytics policy gate', () => {
  it('is unavailable when policy is absent or not approved', () => {
    expect(explicitAnalyticsPolicy(undefined)).toBeNull()
    expect(
      explicitAnalyticsPolicy({ ...approvedFixture, status: 'draft' })
    ).toBeNull()
    expect(
      evaluateConfiguredIncident({
        record: undefined,
        ruleId: 'bounce-fixture',
        current: null,
        identity: {
          businessId: 'fixture',
          scopeType: 'campaign',
          scopeId: 'c1',
          ruleId: 'bounce-fixture',
          ruleVersion: 'test-v1',
          canonicalDimensions: {},
        },
        evaluation: { windowId: 'w1', sample: 100, coverage: 1, value: 1 },
        now: 1,
      })
    ).toBeNull()
  })

  it('fails closed for incomplete collection, freshness, retention, or alert rules', () => {
    expect(
      explicitAnalyticsPolicy({
        ...approvedFixture,
        analytics: { ...approvedFixture.analytics, collectReplies: undefined },
      })
    ).toBeNull()
    expect(
      explicitAnalyticsPolicy({
        ...approvedFixture,
        analytics: { ...approvedFixture.analytics, maxEventAgeMs: undefined },
      })
    ).toBeNull()
    expect(
      explicitAnalyticsPolicy({
        ...approvedFixture,
        analytics: {
          ...approvedFixture.analytics,
          retentionMs: {
            ...approvedFixture.analytics.retentionMs,
            quarantine: undefined,
          },
        },
      })
    ).toBeNull()
    expect(
      explicitAnalyticsPolicy({
        ...approvedFixture,
        analytics: {
          ...approvedFixture.analytics,
          rules: [
            {
              ...approvedFixture.analytics.rules[0],
              minimumCoverage: undefined,
            },
          ],
        },
      })
    ).toBeNull()
  })

  it('fails closed when rule identifiers are duplicated', () => {
    const rule = approvedFixture.analytics.rules[0]
    expect(
      explicitAnalyticsPolicy({
        ...approvedFixture,
        analytics: { ...approvedFixture.analytics, rules: [rule, { ...rule }] },
      })
    ).toBeNull()
  })

  it('accepts explicit configurable fixture policy without supplying defaults', () => {
    const policy = explicitAnalyticsPolicy(approvedFixture)
    expect(policy).toMatchObject({
      revision: 7,
      collectClicks: false,
      collectReplies: false,
      maxEventAgeMs: 1000,
      observationDelayMs: 2000,
      retentionMs: approvedFixture.analytics.retentionMs,
      rules: [
        {
          id: 'bounce-fixture',
          version: 'test-v1',
          metric: 'hard_bounce',
          policy: { triggerThreshold: 0.1, minimumSample: 10 },
        },
      ],
    })
  })

  it('does not evaluate a rule when its analytics source is explicitly disabled', () => {
    const record = {
      ...approvedFixture,
      analytics: {
        ...approvedFixture.analytics,
        collectProviderEvents: false,
      },
    }
    expect(explicitAnalyticsPolicy(record)).not.toBeNull()
    expect(
      evaluateConfiguredIncident({
        record,
        ruleId: 'bounce-fixture',
        current: null,
        identity: {
          businessId: 'fixture',
          scopeType: 'campaign',
          scopeId: 'c1',
          ruleId: 'bounce-fixture',
          ruleVersion: 'test-v1',
          canonicalDimensions: {},
        },
        evaluation: { windowId: 'w1', sample: 100, coverage: 1, value: 1 },
        now: 1,
      })
    ).toBeNull()
  })
})
