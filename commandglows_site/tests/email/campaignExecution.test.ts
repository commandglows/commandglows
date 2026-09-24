import { convexTest } from 'convex-test'
import schema from '../../convex/schema'
import {
  currentExecutionPolicy,
  executionPolicy,
  releaseCampaignReservation,
  reserveCampaignAttempt,
  validateAndAuthorizeCampaignDeparture,
} from '../../convex/emailCampaignExecution'

const modules = import.meta.glob('../../convex/**/*.ts')
const now = 1_800_000_000_000
const limits = {
  campaignUniqueRecipientLimit: 5000,
  campaignAttemptLimit: 5000,
  businessAttemptWindowLimit: 1101,
  identityAttemptWindowLimit: 1101,
  contactAttemptWindowLimit: 1101,
  businessAttemptWindowMs: 86_400_000,
  identityAttemptWindowMs: 86_400_000,
  contactAttemptWindowMs: 86_400_000,
}
const policyRecord = (revision: number, executionLimits = limits) => ({
  businessId: 'business',
  identityKey: 'identity',
  revision,
  status: 'approved',
  evidenceMaxAge: {},
  executionLimits,
  approvedAt: now,
})

async function fixture() {
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    const campaignId = await ctx.db.insert('emailCampaigns', {
      businessId: 'business',
      state: 'sending',
      revision: 1,
      planRevision: 1,
      dispatchEpoch: 1,
      campaignAttemptCount: 0,
      campaignUniqueRecipientCount: 0,
      nextAt: now,
      createdAt: now,
      updatedAt: now,
    })
    const ledgerIds = await Promise.all(
      ['one', 'two', 'three'].map((canonicalContactKey) =>
        ctx.db.insert('emailCampaignRecipientLedger', {
          businessId: 'business',
          campaignId,
          canonicalContactKey,
          state: 'eligible',
          planRevision: 1,
          updatedAt: now,
        })
      )
    )
    await ctx.db.insert('emailCampaignPolicies', policyRecord(1))
    return { campaignId, ledgerIds }
  })
  return { t, ...ids }
}

async function reserve(
  t: any,
  campaignId: any,
  ledgerId: any,
  contact: string,
  policy = limits,
  at = now
) {
  return t.run(async (ctx: any) => {
    const campaign = await ctx.db.get(campaignId)
    const ledger = await ctx.db.get(ledgerId)
    return reserveCampaignAttempt(ctx, {
      campaign,
      ledger,
      identityKey: 'identity',
      canonicalContactKey: contact,
      policy: executionPolicy({ executionLimits: policy }),
      now: at,
      production: true,
    })
  })
}

test('approved policy lookup is indexed and selects the highest revision across a deep history', async () => {
  const { t } = await fixture()
  await t.run(async (ctx) => {
    for (let revision = 2; revision <= 1400; revision++) {
      await ctx.db.insert('emailCampaignPolicies', policyRecord(revision))
    }
  })
  const result = await t.run((ctx) =>
    currentExecutionPolicy(ctx, 'business', 'identity')
  )
  expect(result.record?.revision).toBe(1400)
  expect(result.limits).toEqual(limits)
})

test('definitive release is replay-safe but never refunds campaign lifetime attempts', async () => {
  const { t, campaignId, ledgerIds } = await fixture()
  const oneAttempt = { ...limits, campaignAttemptLimit: 1 }
  expect(await reserve(t, campaignId, ledgerIds[0], 'one', oneAttempt)).toBe(
    true
  )
  const attemptId = await t.run(async (ctx) => {
    const id = await ctx.db.insert('emailAttempts', {
      businessId: 'business',
      messageId: await ctx.db.insert('emailMessages', {
        businessId: 'business',
        email: 'one@example.test',
        kind: 'broadcast',
        rendered: {},
        state: 'sending',
        createdAt: now,
        nextAt: now,
      }),
      state: 'departure_authorized',
      at: now,
      campaignId,
      campaignLedgerId: ledgerIds[0],
      canonicalContactKey: 'one',
      identityKey: 'identity',
      dispatchEpoch: 1,
      reservedAt: now,
      authorizedAt: now,
    })
    await ctx.db.patch(ledgerIds[0], {
      state: 'departure_authorized',
      reservationAttemptId: id,
    })
    return id
  })
  expect(
    await t.run(async (ctx) => {
      const attempt = await ctx.db.get(attemptId)
      return releaseCampaignReservation(
        ctx,
        attempt!,
        'provider_definitive_non_acceptance',
        now + 1
      )
    })
  ).toBe(true)
  expect(
    await t.run(async (ctx) => {
      const attempt = await ctx.db.get(attemptId)
      return releaseCampaignReservation(
        ctx,
        attempt!,
        'provider_definitive_non_acceptance',
        now + 2
      )
    })
  ).toBe(true)
  expect(await reserve(t, campaignId, ledgerIds[0], 'one', oneAttempt)).toBe(
    false
  )
  const ledger = await t.run((ctx) => ctx.db.get(ledgerIds[0]))
  expect(ledger).toMatchObject({
    state: 'rejected_before_acceptance',
    reservationAttemptId: attemptId,
  })
  const campaign = await t.run((ctx) => ctx.db.get(campaignId))
  expect(campaign?.campaignAttemptCount).toBe(1)
})

test('first-use bootstrap ignores service history and requires backfill for untracked Broadcast history', async () => {
  const { t, campaignId, ledgerIds } = await fixture()
  expect(await reserve(t, campaignId, ledgerIds[0], 'one')).toBe(true)
  const aggregates = await t.run((ctx) =>
    ctx.db.query('emailCampaignQuotaAggregates').collect()
  )
  expect(aggregates).toHaveLength(3)
  expect(
    aggregates.every((aggregate) => aggregate.activeReservations === 1)
  ).toBe(true)

  const legacy = await fixture()
  await legacy.t.run(async (ctx) => {
    const messageId = await ctx.db.insert('emailMessages', {
      businessId: 'business',
      email: 'legacy@example.test',
      kind: 'transactional',
      rendered: {},
      state: 'submitted',
      createdAt: now - 1,
      nextAt: now - 1,
    })
    await ctx.db.insert('emailAttempts', {
      businessId: 'business',
      messageId,
      state: 'submitted',
      at: now - 1,
    })
  })
  expect(
    await reserve(legacy.t, legacy.campaignId, legacy.ledgerIds[0], 'one')
  ).toBe(true)
  expect(
    await legacy.t.run((ctx) =>
      ctx.db.query('emailCampaignQuotaAggregates').collect()
    )
  ).toHaveLength(3)

  const campaignHistory = await fixture()
  await campaignHistory.t.run(async (ctx) => {
    const messageId = await ctx.db.insert('emailMessages', {
      businessId: 'business',
      email: 'prior-broadcast@example.test',
      kind: 'broadcast',
      campaignId: campaignHistory.campaignId,
      rendered: {},
      state: 'submitted',
      createdAt: now - 1,
      nextAt: now - 1,
    })
    await ctx.db.insert('emailAttempts', {
      businessId: 'business',
      messageId,
      campaignId: campaignHistory.campaignId,
      identityKey: 'identity',
      canonicalContactKey: 'prior-contact',
      state: 'submitted',
      at: now - 1,
    })
  })
  await expect(
    reserve(
      campaignHistory.t,
      campaignHistory.campaignId,
      campaignHistory.ledgerIds[0],
      'one'
    )
  ).rejects.toThrow('campaign_quota_backfill_required')
  expect(
    await campaignHistory.t.run((ctx) =>
      ctx.db.query('emailCampaignQuotaAggregates').collect()
    )
  ).toHaveLength(0)
})

test('unlinked historical Broadcast test attempts fail closed until quota backfill', async () => {
  const { t, campaignId, ledgerIds } = await fixture()
  await t.run(async (ctx) => {
    const messageId = await ctx.db.insert('emailMessages', {
      businessId: 'business',
      email: 'test@example.test',
      kind: 'broadcast_test',
      rendered: {},
      state: 'submitted',
      createdAt: now - 1,
      nextAt: now - 1,
    })
    await ctx.db.insert('emailAttempts', {
      businessId: 'business',
      messageId,
      state: 'submitted',
      at: now - 1,
    })
  })

  await expect(reserve(t, campaignId, ledgerIds[0], 'one')).rejects.toThrow(
    'campaign_quota_backfill_required'
  )
})

test('unlinked Broadcast history on a shared identity route fails closed across businesses', async () => {
  const { t, campaignId, ledgerIds } = await fixture()
  await t.run(async (ctx) => {
    const messageId = await ctx.db.insert('emailMessages', {
      businessId: 'other-business',
      email: 'legacy@example.test',
      kind: 'broadcast',
      rendered: {},
      state: 'submitted',
      createdAt: now - 1,
      nextAt: now - 1,
    })
    await ctx.db.insert('emailAttempts', {
      businessId: 'other-business',
      messageId,
      route: 'identity',
      state: 'submitted',
      at: now - 1,
    })
  })

  await expect(reserve(t, campaignId, ledgerIds[0], 'one')).rejects.toThrow(
    'campaign_quota_backfill_required'
  )
})

test('a missing aggregate with existing quota slots cannot reset usage to zero', async () => {
  const { t, campaignId, ledgerIds } = await fixture()
  expect(await reserve(t, campaignId, ledgerIds[0], 'one')).toBe(true)
  await t.run(async (ctx) => {
    const aggregate = await ctx.db
      .query('emailCampaignQuotaAggregates')
      .withIndex('scope', (q: any) =>
        q
          .eq('dimension', 'business')
          .eq('scopeKey', JSON.stringify(['business']))
      )
      .unique()
    await ctx.db.delete(aggregate!._id)
  })

  await expect(reserve(t, campaignId, ledgerIds[1], 'two')).rejects.toThrow(
    'campaign_quota_backfill_required'
  )
})

test('pre-departure release frees rolling and campaign attempt capacity', async () => {
  const { t, campaignId, ledgerIds } = await fixture()
  expect(await reserve(t, campaignId, ledgerIds[0], 'one')).toBe(true)
  const attemptId = await t.run(async (ctx) => {
    const messageId = await ctx.db.insert('emailMessages', {
      businessId: 'business',
      email: 'one@example.test',
      kind: 'broadcast',
      rendered: {},
      state: 'sending',
      createdAt: now,
      nextAt: now,
    })
    const id = await ctx.db.insert('emailAttempts', {
      businessId: 'business',
      messageId,
      state: 'reserved',
      at: now,
      campaignId,
      campaignLedgerId: ledgerIds[0],
      canonicalContactKey: 'one',
      identityKey: 'identity',
      dispatchEpoch: 1,
      reservedAt: now,
    })
    await ctx.db.patch(ledgerIds[0], {
      state: 'reserved',
      reservationAttemptId: id,
    })
    return id
  })
  await t.run(async (ctx) => {
    const attempt = await ctx.db.get(attemptId)
    expect(
      await releaseCampaignReservation(
        ctx,
        attempt!,
        'pre_departure_fenced',
        now + 1
      )
    ).toBe(true)
  })
  expect(await t.run((ctx) => ctx.db.get(campaignId))).toMatchObject({
    campaignAttemptCount: 0,
    campaignUniqueRecipientCount: 0,
  })
  const aggregates = await t.run((ctx) =>
    ctx.db.query('emailCampaignQuotaAggregates').collect()
  )
  expect(
    aggregates.every((aggregate) => aggregate.activeReservations === 0)
  ).toBe(true)
})

test('bounded aggregate decides the exact threshold above one page', async () => {
  const { t, campaignId, ledgerIds } = await fixture()
  await t.run((ctx) =>
    ctx.db.insert('emailCampaignQuotaAggregates', {
      dimension: 'business',
      scopeKey: JSON.stringify(['business']),
      activeReservations: 1050,
    })
  )
  expect(await reserve(t, campaignId, ledgerIds[0], 'one')).toBe(true)
  expect(
    await reserve(t, campaignId, ledgerIds[1], 'two', {
      ...limits,
      businessAttemptWindowLimit: 1051,
    })
  ).toBe(false)
})

test('competing reservations share and atomically consume one remaining window slot', async () => {
  const { t, campaignId, ledgerIds } = await fixture()
  const oneSlot = { ...limits, businessAttemptWindowLimit: 1 }
  const outcomes = await Promise.all([
    reserve(t, campaignId, ledgerIds[0], 'one', oneSlot),
    reserve(t, campaignId, ledgerIds[1], 'two', oneSlot),
  ])
  expect(outcomes.filter(Boolean)).toHaveLength(1)
})

test('rolling quota excludes an attempt exactly at the open lower window boundary', async () => {
  const { t, campaignId, ledgerIds } = await fixture()
  const onePerWindow = {
    ...limits,
    businessAttemptWindowLimit: 1,
    businessAttemptWindowMs: 1000,
  }
  await t.run(async (ctx) => {
    const policy = await ctx.db
      .query('emailCampaignPolicies')
      .withIndex('scope', (q: any) =>
        q.eq('businessId', 'business').eq('identityKey', 'identity')
      )
      .unique()
    await ctx.db.patch(policy!._id, { executionLimits: onePerWindow })
  })
  expect(await reserve(t, campaignId, ledgerIds[0], 'one', onePerWindow)).toBe(
    true
  )
  const { versionId, attemptId } = await stageDeparture(
    t,
    campaignId,
    ledgerIds[0],
    now + 10_000
  )
  const departure = await t.run(async (ctx: any) =>
    validateAndAuthorizeCampaignDeparture(ctx, {
      attempt: await ctx.db.get(attemptId),
      campaign: await ctx.db.get(campaignId),
      ledger: await ctx.db.get(ledgerIds[0]),
      versionId,
      expectedScopeDigest: 'scope-1',
      identityKey: 'identity',
      now,
    })
  )
  expect(departure).toEqual({ authorized: true })
  expect(
    await reserve(t, campaignId, ledgerIds[1], 'two', onePerWindow, now + 1000)
  ).toBe(true)
})

async function stageDeparture(
  t: any,
  campaignId: any,
  ledgerId: any,
  reportExpiry: number
) {
  return t.run(async (ctx: any) => {
    const versionId = await ctx.db.insert('emailCampaignVersions', {
      businessId: 'business',
      campaignId,
      number: 1,
      audienceId: 'audience',
      purpose: 'marketing',
      locale: 'en',
      subject: 'Subject',
      paragraphs: ['Body'],
      scheduledAt: now - 1000,
      timezone: 'UTC',
      rendered: {},
      cutoff: now,
      route: 'identity',
      createdAt: now,
    })
    await ctx.db.patch(campaignId, {
      state: 'fanout_complete',
      approvedVersionId: versionId,
      versionId,
    })
    await ctx.db.insert('emailCampaignReports', {
      businessId: 'business',
      campaignId,
      versionId,
      revision: 1,
      scopeDigest: 'scope-1',
      policyRevision: 1,
      checkedAt: now - 100,
      expiresAt: reportExpiry,
      status: 'valid',
      blockingChecks: [],
      warningChecks: [],
      evidenceIds: [],
    })
    const messageId = await ctx.db.insert('emailMessages', {
      businessId: 'business',
      email: 'one@example.test',
      kind: 'broadcast',
      campaignId,
      campaignVersionId: versionId,
      campaignLedgerId: ledgerId,
      rendered: {},
      state: 'sending',
      createdAt: now,
      nextAt: now,
    })
    const attemptId = await ctx.db.insert('emailAttempts', {
      businessId: 'business',
      messageId,
      state: 'reserved',
      at: now,
      campaignId,
      campaignLedgerId: ledgerId,
      canonicalContactKey: 'one',
      identityKey: 'identity',
      dispatchEpoch: 1,
      reservedAt: now,
    })
    await ctx.db.patch(ledgerId, {
      state: 'reserved',
      reservationAttemptId: attemptId,
    })
    return { versionId, attemptId }
  })
}

test('final guard permits fanout_complete only with the current report, policy, and its reserved quota slot', async () => {
  const { t, campaignId, ledgerIds } = await fixture()
  expect(await reserve(t, campaignId, ledgerIds[0], 'one')).toBe(true)
  const { versionId, attemptId } = await stageDeparture(
    t,
    campaignId,
    ledgerIds[0],
    now + 10_000
  )
  const result = await t.run(async (ctx: any) => {
    const attempt = await ctx.db.get(attemptId)
    const campaign = await ctx.db.get(campaignId)
    const ledger = await ctx.db.get(ledgerIds[0])
    return validateAndAuthorizeCampaignDeparture(ctx, {
      attempt,
      campaign,
      ledger,
      versionId,
      expectedScopeDigest: 'scope-1',
      identityKey: 'identity',
      now,
    })
  })
  expect(result).toEqual({ authorized: true })
  expect((await t.run((ctx) => ctx.db.get(campaignId)))?.state).toBe(
    'fanout_complete'
  )
})

test('expired report suspends and fences an active campaign instead of only denying this recipient', async () => {
  const { t, campaignId, ledgerIds } = await fixture()
  expect(await reserve(t, campaignId, ledgerIds[0], 'one')).toBe(true)
  const { versionId, attemptId } = await stageDeparture(
    t,
    campaignId,
    ledgerIds[0],
    now - 1
  )
  const result = await t.run(async (ctx: any) => {
    const attempt = await ctx.db.get(attemptId)
    const campaign = await ctx.db.get(campaignId)
    const ledger = await ctx.db.get(ledgerIds[0])
    return validateAndAuthorizeCampaignDeparture(ctx, {
      attempt,
      campaign,
      ledger,
      versionId,
      expectedScopeDigest: 'scope-1',
      identityKey: 'identity',
      now,
    })
  })
  expect(result).toMatchObject({
    authorized: false,
    reason: 'approved_report_expired',
    suspendCampaign: true,
    dispatchEpoch: 2,
  })
  expect(await t.run((ctx) => ctx.db.get(campaignId))).toMatchObject({
    state: 'suspended',
    dispatchEpoch: 2,
    blockReason: 'approved_report_expired',
  })
})

test('new lower approved policy revision is re-read at departure and fences the campaign', async () => {
  const { t, campaignId, ledgerIds } = await fixture()
  expect(await reserve(t, campaignId, ledgerIds[0], 'one')).toBe(true)
  const { versionId, attemptId } = await stageDeparture(
    t,
    campaignId,
    ledgerIds[0],
    now + 10_000
  )
  await t.run((ctx) =>
    ctx.db.insert(
      'emailCampaignPolicies',
      policyRecord(2, { ...limits, campaignAttemptLimit: 1 })
    )
  )
  const result = await t.run(async (ctx: any) => {
    const attempt = await ctx.db.get(attemptId)
    const campaign = await ctx.db.get(campaignId)
    const ledger = await ctx.db.get(ledgerIds[0])
    return validateAndAuthorizeCampaignDeparture(ctx, {
      attempt,
      campaign,
      ledger,
      versionId,
      expectedScopeDigest: 'scope-1',
      identityKey: 'identity',
      now,
    })
  })
  expect(result).toMatchObject({
    authorized: false,
    reason: 'approved_report_scope_or_policy_changed',
    suspendCampaign: true,
    dispatchEpoch: 2,
  })
  expect(await t.run((ctx) => ctx.db.get(campaignId))).toMatchObject({
    state: 'suspended',
    dispatchEpoch: 2,
    blockReason: 'approved_report_scope_or_policy_changed',
  })
})
