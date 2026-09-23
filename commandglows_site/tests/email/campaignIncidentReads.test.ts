import { makeFunctionReference } from 'convex/server'
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import schema from '../../convex/schema'

const modules = import.meta.glob('../../convex/**/*.ts')
const read = makeFunctionReference<'query'>('emailIncidentQueries:read')
const credential = 'incident-read-test-credential-123456'
const business = {
  id: 'studio',
  brand: 'Studio',
  legalFooter: 'Contact',
  from: 'sender@example.test',
  transactionalStream: 'service',
  broadcastStream: 'news',
  audiences: [
    {
      id: 'news',
      purpose: 'marketing',
      sources: ['site'],
      noticeVersions: ['v1'],
    },
  ],
  activated: true,
  retentionDays: 30,
}

beforeEach(() => {
  vi.stubEnv('EMAIL_INCIDENT_READ_TEST', credential)
  vi.stubEnv(
    'EMAIL_CONTROL_CONFIG',
    JSON.stringify({
      environment: 'sandbox',
      clients: [
        {
          id: 'incident-reader',
          credentialEnv: 'EMAIL_INCIDENT_READ_TEST',
          businessIds: ['studio'],
          operations: ['campaign_read'],
        },
      ],
      businesses: [business],
    })
  )
})

afterEach(() => vi.unstubAllEnvs())

it('returns tenant-scoped durable incidents and marks unpersisted measures unknown', async () => {
  const t = convexTest(schema, modules)
  const campaignId = await t.run((ctx) =>
    ctx.db.insert('emailCampaigns', {
      businessId: 'studio',
      revision: 4,
      state: 'paused',
      nextAt: 100,
      createdAt: 10,
      updatedAt: 20,
    })
  )
  await t.run(async (ctx) => {
    await ctx.db.insert('emailIncidents', {
      businessId: 'studio',
      scopeType: 'campaign',
      scopeId: campaignId,
      ruleId: 'bounce-rate',
      ruleVersion: '2',
      canonicalDimensions: '{"route":"broadcast"}',
      incidentKey: 'studio|campaign|campaign-id|bounce-rate|2|{}',
      episode: 1,
      state: 'open',
      severity: 0.2,
      breachWindows: 2,
      recoveryWindows: 0,
      lastWindowId: 'window-2',
      evaluationUnavailable: false,
      createdAt: 10,
      updatedAt: 20,
    })
    await ctx.db.insert('emailIncidentTransitions', {
      incidentKey: 'studio|campaign|campaign-id|bounce-rate|2|{}',
      episode: 1,
      sequence: 1,
      toState: 'open',
      kind: 'opened',
      severity: 0.2,
      windowId: 'window-2',
      reason: 'qualified_breach',
      createdAt: 20,
    })
  })

  const result = await t.query(read, {
    credential,
    businessId: 'studio',
    campaignId,
    paginationOpts: { numItems: 10, cursor: null },
  })
  expect(result).toMatchObject({
    complete: true,
    incidents: [
      {
        business_id: 'studio',
        scope_id: campaignId,
        state: 'open',
        severity: 0.2,
        last_transition: {
          reason: 'qualified_breach',
          kind: 'opened',
        },
        measurement: null,
        threshold: null,
        sample: null,
        coverage: null,
        evaluated_at: null,
      },
    ],
  })
  expect(JSON.stringify(result)).not.toContain('canonicalDimensions')
  await expect(
    t.query(read, {
      credential,
      businessId: 'other',
      campaignId,
      paginationOpts: { numItems: 10, cursor: null },
    })
  ).rejects.toThrow('forbidden')
})
