import { convexTest } from 'convex-test'
import { makeFunctionReference } from 'convex/server'
import schema from '../../convex/schema'
import { handleCampaignApi } from '../../src/lib/email/central/campaignApi'
import { handleDispatch } from '../../src/lib/email/central/worker'
import {
  campaignContent,
  renderCampaign,
} from '../../src/lib/email/central/campaignContent'
import {
  evidenceScope,
  MANDATORY_EVIDENCE,
} from '../../convex/emailCampaignEvidence'
const modules = import.meta.glob('../../convex/**/*.ts')
const ref = (name: string) => makeFunctionReference<'mutation'>(name)
const credential = 'campaign-test-credential'.repeat(2)
const business = {
  id: 'studio',
  brand: 'Studio',
  legalFooter: 'Contact',
  from: 'sender@example.test',
  transactionalStream: 'service',
  broadcastStream: 'news',
  activated: true,
  campaignPreflightRequired: true,
  retentionDays: 30,
  allowedRecipients: ['reader@example.test'],
  audiences: [
    {
      id: 'news',
      purpose: 'marketing',
      sources: ['site'],
      noticeVersions: ['v1'],
    },
  ],
}
const content = {
  title: 'Une lettre',
  audienceId: 'news',
  locale: 'fr',
  subject: 'Nos nouvelles',
  preheader: 'Cette semaine',
  blocks: [
    { id: 'a', type: 'heading', text: 'Bonjour <ami>' },
    { id: 'b', type: 'button', text: 'Lire', url: 'https://example.test/read' },
    {
      id: 'c',
      type: 'source',
      text: 'Une source',
      url: 'https://example.test/source',
      source_id: 'source-1',
    },
  ],
}
let key = 0
function setup(recipients = ['reader@example.test']) {
  process.env.EMAIL_TEST_CAMPAIGNS = credential
  process.env.EMAIL_CONTROL_CONFIG = JSON.stringify({
    environment: 'sandbox',
    clients: [
      {
        id: 'operator',
        credentialEnv: 'EMAIL_TEST_CAMPAIGNS',
        businessIds: ['studio'],
        operations: [
          'campaign_read',
          'campaign_write',
          'campaign_dispatch',
          'dispatch',
          'webhook',
        ],
      },
    ],
    businesses: [{ ...business, allowedRecipients: recipients }],
  })
  return convexTest(schema, modules)
}
function command(
  t: any,
  operation: string,
  input: any,
  requestKey = `campaign-key-${String(++key).padStart(10, '0')}`,
  extra = {}
) {
  return t.mutation(ref('emailCampaigns:command'), {
    credential,
    actorId: 'user_admin',
    sessionRef: 'session-test',
    businessId: 'studio',
    operation,
    input,
    idempotencyKey: requestKey,
    ...extra,
  })
}
async function member(t: any, email = 'reader@example.test') {
  return t.run((ctx: any) =>
    ctx.db.insert('emailMemberships', {
      businessId: 'studio',
      email,
      audienceId: 'news',
      purpose: 'marketing',
      state: 'subscribed',
      generation: 1,
      updatedAt: Date.now() - 1000,
    })
  )
}
async function create(t: any) {
  return (await command(t, 'create', content)).campaign
}
async function review(t: any, c: any) {
  return command(t, 'review', { campaignId: c.id, expectedVersion: c.version })
}
async function seedPreflight(t: any, c: any) {
  const { version, planRevision } = await t.run(async (ctx: any) => {
    const campaign = await ctx.db.get(c.id)
    return {
      version: await ctx.db.get(campaign.versionId),
      planRevision: campaign.planRevision ?? 1,
    }
  })
  const scopeDigest = evidenceScope({
    businessId: 'studio',
    campaignId: c.id,
    versionId: version._id,
    audienceId: version.audienceId,
    purpose: version.purpose,
    route: version.route,
    planRevision,
  })
  await t.run(async (ctx: any) => {
    const policy = await ctx.db
      .query('emailCampaignPolicies')
      .withIndex('scope', (q: any) =>
        q
          .eq('businessId', 'studio')
          .eq('identityKey', version.route)
          .eq('revision', 1)
      )
      .unique()
    if (!policy)
      await ctx.db.insert('emailCampaignPolicies', {
        businessId: 'studio',
        identityKey: version.route,
        revision: 1,
        status: 'approved',
        evidenceMaxAge: Object.fromEntries(
          MANDATORY_EVIDENCE.map((kind) => [kind, 86_400_000])
        ),
        executionLimits: {
          campaignUniqueRecipientLimit: 500,
          campaignAttemptLimit: 500,
          businessAttemptWindowLimit: 500,
          identityAttemptWindowLimit: 500,
          contactAttemptWindowLimit: 1,
          businessAttemptWindowMs: 86_400_000,
          identityAttemptWindowMs: 86_400_000,
          contactAttemptWindowMs: 86_400_000,
        },
        approvedAt: Date.now(),
      })
    for (const kind of MANDATORY_EVIDENCE)
      if (
        !(await ctx.db
          .query('emailCampaignEvidence')
          .withIndex('campaign', (q: any) =>
            q
              .eq('campaignId', c.id)
              .eq('versionId', version._id)
              .eq('kind', kind)
          )
          .first())
      )
        await ctx.db.insert('emailCampaignEvidence', {
          businessId: 'studio',
          campaignId: c.id,
          versionId: version._id,
          kind,
          source: 'fixture:campaign-domain',
          owner: 'test-collector',
          scopeDigest,
          collectedAt: Date.now(),
          validUntil: Date.now() + 86_400_000,
          sourceRevision: 'fixture-1',
          status: 'valid',
          evidenceRef: `fixture-${kind}`,
        })
  })
  return { version, scopeDigest }
}
async function approve(t: any, c: any, scheduledAt?: string) {
  const { scopeDigest } = await seedPreflight(t, c)
  const r = await review(t, c)
  const challengeId = `challenge-${c.id}`
  await t.run((ctx: any) =>
    ctx.db.insert('emailOperatorChallenges', {
      challengeId,
      actorId: 'user_admin',
      sessionRef: 'session-test',
      businessId: 'studio',
      action: 'approve',
      scopeDigest,
      reportId: r.review.report_id,
      revision: c.version,
      expiresAt: Date.now() + 60_000,
    })
  )
  return command(t, 'approve', {
    campaignId: c.id,
    expectedVersion: c.version,
    reviewId: r.review.id,
    reportId: r.review.report_id,
    challengeId,
    ...(scheduledAt ? { scheduledAt } : {}),
  })
}
beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-09-08T12:00:00Z') })
  delete process.env.EMAIL_SUPPRESSION_HASH_KEY
})
afterEach(() => {
  vi.useRealTimers()
  delete process.env.EMAIL_TEST_CAMPAIGNS
  delete process.env.EMAIL_CONTROL_CONFIG
})

it('stores incomplete drafts, rejects incomplete review and optimistic overwrite, replays exact keys', async () => {
  const t = setup()
  const created = await command(
    t,
    'create',
    { ...content, subject: '', blocks: [] },
    'stable-create-key-0001'
  )
  expect(
    await command(
      t,
      'create',
      { ...content, subject: '', blocks: [] },
      'stable-create-key-0001'
    )
  ).toEqual(created)
  await expect(review(t, created.campaign)).rejects.toThrow('invalid_input')
  await expect(
    command(t, 'create', content, 'stable-create-key-0001')
  ).rejects.toThrow('idempotency_conflict')
  const c = created.campaign
  const saved = await command(t, 'save', {
    ...content,
    campaignId: c.id,
    expectedVersion: 1,
  })
  expect(saved.campaign.version).toBe(2)
  await expect(
    command(t, 'save', { ...content, campaignId: c.id, expectedVersion: 1 })
  ).rejects.toThrow('version_conflict')
})
it('binds immutable approval and excludes withdrawal after approval', async () => {
  const t = setup()
  const m = await member(t)
  const c = await create(t)
  const result = await approve(t, c)
  expect(result.campaign.state).toBe('sending')
  await expect(
    command(t, 'save', { ...content, campaignId: c.id, expectedVersion: 1 })
  ).rejects.toThrow('invalid_state')
  await t.mutation(ref('emailCampaigns:expand'), {
    credential,
    businessId: 'studio',
    campaignId: c.id,
  })
  await t.run((ctx: any) => ctx.db.patch(m, { state: 'withdrawn' }))
  expect(
    await t.mutation(ref('email:claim'), { credential, businessId: 'studio' })
  ).toEqual([])
  const detail = await t.query(
    makeFunctionReference<'query'>('emailCampaigns:read'),
    {
      credential,
      actorId: 'user_admin',
      businessId: 'studio',
      operation: 'get',
      input: { campaignId: c.id },
    }
  )
  expect(detail.campaign.counters.cancelled).toBe(1)
})

it('blocks approval when evidence is unavailable and requires a human challenge', async () => {
  const t = setup()
  await member(t)
  const c = await create(t)
  const r = await review(t, c)
  expect(r.review.blocking_checks.map((check: any) => check.kind)).toEqual(
    expect.arrayContaining(['identity', 'route', 'suppression_sync'])
  )
  await expect(
    command(t, 'approve', {
      campaignId: c.id,
      expectedVersion: c.version,
      reviewId: r.review.id,
      reportId: r.review.report_id,
      challengeId: 'forged-challenge',
    })
  ).rejects.toThrow('preflight_blocked')

  await seedPreflight(t, c)
  const fresh = await review(t, c)
  await expect(
    command(t, 'approve', {
      campaignId: c.id,
      expectedVersion: c.version,
      reviewId: fresh.review.id,
      reportId: fresh.review.report_id,
    })
  ).rejects.toThrow('human_authority_required')
})
it('expands a large audience in bounded pages, resumes review, never duplicates recipients', async () => {
  const recipients = Array.from(
    { length: 121 },
    (_, i) => `person${i}@example.test`
  )
  const t = setup(recipients)
  for (const email of recipients) await member(t, email)
  vi.setSystemTime(Date.now() + 1000)
  const c = await create(t)
  await seedPreflight(t, c)
  const r1 = await review(t, c)
  expect(r1.review.complete).toBe(false)
  expect(r1.review.eligible_count).toBe(50)
  await expect(
    command(t, 'approve', {
      campaignId: c.id,
      expectedVersion: 1,
      reviewId: r1.review.id,
    })
  ).rejects.toThrow('review_required')
  const r2 = await review(t, c)
  const r3 = await review(t, c)
  expect(r2.review.id).toBe(r1.review.id)
  expect(r3.review.complete).toBe(true)
  expect(r3.review.eligible_count).toBe(121)
  await approve(t, c)
  await t.mutation(ref('emailCampaigns:expand'), {
    credential,
    businessId: 'studio',
    campaignId: c.id,
  })
  expect(
    (await t.run((ctx: any) => ctx.db.query('emailMessages').collect())).length
  ).toBe(50)
  await t.finishAllScheduledFunctions(() => vi.runAllTimers())
  await t.mutation(ref('emailCampaigns:expand'), {
    credential,
    businessId: 'studio',
    campaignId: c.id,
  })
  await t.mutation(ref('emailCampaigns:expand'), {
    credential,
    businessId: 'studio',
    campaignId: c.id,
  })
  const rows = await t.run((ctx: any) =>
    ctx.db.query('emailMessages').collect()
  )
  expect(rows).toHaveLength(121)
  expect(new Set(rows.map((x: any) => x.email)).size).toBe(121)
})
it('cancels future expansion and dispatch, preserving in-flight unknown outcomes', async () => {
  const t = setup()
  await member(t)
  const c = await create(t)
  await approve(t, c)
  await t.mutation(ref('emailCampaigns:expand'), {
    credential,
    businessId: 'studio',
    campaignId: c.id,
  })
  const [job] = await t.mutation(ref('email:claim'), {
    credential,
    businessId: 'studio',
  })
  await command(t, 'cancel', { campaignId: c.id, expectedVersion: 1 })
  const check = await t.mutation(ref('email:recheckDispatch'), {
    credential,
    businessId: 'studio',
    messageId: job.messageId,
    attemptId: job.attemptId,
  })
  expect(check.eligible).toBe(false)
  await t.mutation(ref('emailCampaigns:expand'), {
    credential,
    businessId: 'studio',
    campaignId: c.id,
  })
  expect((await t.run((ctx: any) => ctx.db.get(job.messageId))).state).toBe(
    'cancelled'
  )
})

it('fences a legacy-shaped reserved attempt after pause before departure authorization', async () => {
  const t = setup()
  await member(t)
  const c = await create(t)
  await approve(t, c)
  await t.mutation(ref('emailCampaigns:expand'), {
    credential,
    businessId: 'studio',
    campaignId: c.id,
  })
  const [job] = await t.mutation(ref('email:claim'), {
    credential,
    businessId: 'studio',
  })

  // Model a queued attempt restored from the old schema while its lease is held.
  await t.run(async (ctx: any) => {
    await ctx.db.patch(job.attemptId, { dispatchEpoch: undefined })
  })
  await command(t, 'pause', { campaignId: c.id, expectedVersion: 1 })

  expect(
    await t.mutation(ref('email:recheckDispatch'), {
      credential,
      businessId: 'studio',
      messageId: job.messageId,
      attemptId: job.attemptId,
    })
  ).toEqual({ eligible: false })
  expect(await t.run((ctx: any) => ctx.db.get(job.messageId))).toMatchObject({
    state: 'queued',
  })
  expect(await t.run((ctx: any) => ctx.db.get(job.attemptId))).toMatchObject({
    state: 'released',
    releasedAt: expect.any(Number),
  })
  const ledger = await t.run((ctx: any) =>
    ctx.db.query('emailCampaignRecipientLedger').collect()
  )
  expect(ledger).toMatchObject([{ state: 'eligible' }])
  expect(ledger[0].reservationAttemptId).toBeUndefined()
})

it('counts submitted and late delivered exactly once, keeps unknown distinct', async () => {
  const t = setup()
  await member(t)
  const c = await create(t)
  await approve(t, c)
  await t.mutation(ref('emailCampaigns:expand'), {
    credential,
    businessId: 'studio',
    campaignId: c.id,
  })
  const [job] = await t.mutation(ref('email:claim'), {
    credential,
    businessId: 'studio',
  })
  await t.mutation(ref('email:settle'), {
    credential,
    businessId: 'studio',
    messageId: job.messageId,
    attemptId: job.attemptId,
    outcome: 'unknown',
  })
  let stored = await t.run((ctx: any) => ctx.db.get(c.id))
  expect(stored.counters.unknown).toBe(1)
  const event = {
    credential,
    businessId: 'studio',
    eventId: 'delivery-proof-1',
    internalMessageId: job.messageId,
    providerMessageId: 'provider-1',
    email: 'reader@example.test',
    type: 'delivery',
    streamId: 'news',
  }
  await t.mutation(ref('email:webhook'), event)
  await t.mutation(ref('email:webhook'), event)
  stored = await t.run((ctx: any) => ctx.db.get(c.id))
  expect(stored.counters.delivered).toBe(1)
  expect(stored.counters.unknown).toBe(0)
})

it('keeps a durable recipient ledger across a reduced remaining plan', async () => {
  const t = setup(['first@example.test', 'second@example.test'])
  await member(t, 'first@example.test')
  await member(t, 'second@example.test')
  const c = await create(t)
  await approve(t, c)
  await t.mutation(ref('emailCampaigns:expand'), {
    credential,
    businessId: 'studio',
    campaignId: c.id,
  })
  const [first] = await t.mutation(ref('email:claim'), {
    credential,
    businessId: 'studio',
  })
  await t.mutation(ref('email:recheckDispatch'), {
    credential,
    businessId: 'studio',
    messageId: first.messageId,
    attemptId: first.attemptId,
  })
  await t.mutation(ref('email:settle'), {
    credential,
    businessId: 'studio',
    messageId: first.messageId,
    attemptId: first.attemptId,
    outcome: 'unknown',
  })
  const snapshot = await t.run((ctx: any) =>
    ctx.db
      .query('emailCampaignRecipients')
      .withIndex('campaign', (q: any) => q.eq('campaignId', c.id))
      .collect()
  )
  await command(t, 'reduce', {
    campaignId: c.id,
    expectedVersion: 1,
    membershipIds: [
      snapshot.find((row: any) => row.messageId === first.messageId)!
        .membershipId,
    ],
  })
  const ledger = await t.run((ctx: any) =>
    ctx.db.query('emailCampaignRecipientLedger').collect()
  )
  expect(
    ledger.find((row: any) => row.canonicalContactKey === first.to)
  ).toMatchObject({ state: 'unknown' })
  expect((await t.run((ctx: any) => ctx.db.get(c.id))).state).toBe('paused')
  expect(
    await t.mutation(ref('email:claim'), { credential, businessId: 'studio' })
  ).toEqual([])
})

it('shares identity quota atomically and never releases an authorized crash', async () => {
  const t = setup(['one@example.test', 'two@example.test'])
  await member(t, 'one@example.test')
  await member(t, 'two@example.test')
  const first = await create(t)
  await seedPreflight(t, first)
  await t.run(async (ctx: any) => {
    const policy = await ctx.db
      .query('emailCampaignPolicies')
      .collect()
      .then((rows: any[]) => rows[0])
    await ctx.db.patch(policy._id, {
      executionLimits: {
        ...policy.executionLimits,
        identityAttemptWindowLimit: 1,
      },
    })
  })
  await approve(t, first)
  await t.mutation(ref('emailCampaigns:expand'), {
    credential,
    businessId: 'studio',
    campaignId: first.id,
  })
  const [job] = await t.mutation(ref('email:claim'), {
    credential,
    businessId: 'studio',
  })
  expect(
    await t.mutation(ref('email:recheckDispatch'), {
      credential,
      businessId: 'studio',
      messageId: job.messageId,
      attemptId: job.attemptId,
    })
  ).toEqual({ eligible: true })
  vi.setSystemTime(Date.now() + 61_000)
  expect(
    await t.mutation(ref('email:claim'), { credential, businessId: 'studio' })
  ).toEqual([])
  const attempts = await t.run((ctx: any) =>
    ctx.db.query('emailAttempts').collect()
  )
  expect(attempts).toMatchObject([{ state: 'unknown' }])
  expect(
    await t.run((ctx: any) =>
      ctx.db.query('emailCampaignRecipientLedger').collect()
    )
  ).toMatchObject([{ state: 'unknown' }])
})

it('allows a stale safety pause and requires a fresh report plus human-bound challenge to resume', async () => {
  const t = setup()
  await member(t)
  const created = await create(t)
  await approve(t, created)
  const oldReport = await t.run((ctx: any) =>
    ctx.db
      .query('emailCampaignReports')
      .withIndex('campaign', (q: any) =>
        q.eq('campaignId', created.id).eq('revision', created.version)
      )
      .first()
  )
  const paused = await command(t, 'pause', {
    campaignId: created.id,
    expectedVersion: 0,
  })
  expect(paused.campaign.state).toBe('paused')
  expect(
    (await t.run((ctx: any) => ctx.db.get(created.id))).dispatchEpoch
  ).toBe(1)
  expect(
    await t.mutation(ref('email:claim'), { credential, businessId: 'studio' })
  ).toEqual([])

  await expect(
    command(t, 'resume', {
      campaignId: created.id,
      expectedVersion: created.version,
      reportId: oldReport._id,
      challengeId: 'not-issued',
    })
  ).rejects.toThrow('preflight_blocked')

  vi.advanceTimersByTime(1)
  const fresh = await review(t, paused.campaign)
  expect(fresh.review.report_id).not.toBe(oldReport._id)
  const issued = await command(t, 'challenge', {
    campaignId: created.id,
    expectedVersion: created.version,
    action: 'resume',
    reportId: fresh.review.report_id,
  })
  const resumed = await command(t, 'resume', {
    campaignId: created.id,
    expectedVersion: created.version,
    reportId: fresh.review.report_id,
    challengeId: issued.challenge.id,
  })
  expect(resumed.campaign.state).toBe('sending')
  expect(
    (await t.run((ctx: any) => ctx.db.get(created.id))).pausedAt
  ).toBeUndefined()
})

it('rejects another business, malformed blocks, missing review and ineligible test recipients', async () => {
  const t = setup()
  const c = await create(t)
  await expect(
    command(t, 'review', { campaignId: c.id, expectedVersion: 1 }, undefined, {
      businessId: 'other',
    })
  ).rejects.toThrow('forbidden')
  await expect(
    command(t, 'approve', {
      campaignId: c.id,
      expectedVersion: 1,
      reviewId: 'invented',
    })
  ).rejects.toThrow('review_required')
  await expect(
    command(t, 'test', {
      campaignId: c.id,
      expectedVersion: 1,
      recipient: 'outsider@example.test',
    })
  ).rejects.toThrow('recipient_not_eligible')
  await expect(
    command(t, 'save', {
      ...content,
      blocks: [
        { id: 'x', type: 'button', text: 'Go', url: 'javascript:alert(1)' },
      ],
      campaignId: c.id,
      expectedVersion: 1,
    })
  ).rejects.toThrow('invalid_input')
  const html = renderCampaign(campaignContent(content), business).html
  expect(html).toContain('Bonjour &lt;ami&gt;')
  expect(html).toContain('<h2 style=')
  expect(html).toContain('https://example.test/source')
  expect(html).toContain('Cette semaine')
  expect(html).toContain('{{{ pm:unsubscribe }}}')
})
it('scheduled campaigns cannot expand early and deleted drafts leave no readable record', async () => {
  const t = setup()
  await member(t)
  const c = await create(t)
  await approve(t, c, '2026-09-09T12:00:00Z')
  await t.mutation(ref('emailCampaigns:expand'), {
    credential,
    businessId: 'studio',
    campaignId: c.id,
  })
  expect(
    await t.run((ctx: any) => ctx.db.query('emailMessages').collect())
  ).toHaveLength(0)
  const draft = await create(t)
  expect(
    await command(t, 'delete', { campaignId: draft.id, expectedVersion: 1 })
  ).toEqual({ deleted: true })
})

it('round trips the public HTTP wire into real Convex commands with blocks and approval', async () => {
  const t = setup()
  await member(t)
  const dependencies = {
    authority: async () => ({ actorId: 'user_admin' }),
    command: (name: string, args: any) => t.mutation(ref(name), args),
    read: (name: string, args: any) =>
      t.query(makeFunctionReference<'query'>(name), args),
  }
  const env = {
    EMAIL_OPERATOR_CREDENTIAL: credential,
    SUITE_BRIDGE_CONVEX_SECRET: 'test-bridge',
  }
  const send = async (path: string, body: any) => {
    const response = await handleCampaignApi(
      {
        request: new Request(`https://studio.test/api/admin/email/${path}`, {
          method: 'POST',
          headers: {
            Origin: 'https://studio.test',
            'Content-Type': 'application/json',
            'Idempotency-Key': `wire-contract-${++key}-00000000`,
          },
          body: JSON.stringify(body),
        }),
        locals: {
          auth: () => ({ userId: 'user_admin', sessionId: 'session-test' }),
        },
      },
      path,
      env,
      dependencies
    )
    const data = await response.json()
    expect(response.status, JSON.stringify(data)).toBe(200)
    return data
  }
  const { audienceId, ...rest } = content
  const created = await send('campaigns', {
    ...rest,
    audience_id: audienceId,
    business_id: 'studio',
  })
  expect(created.campaign.blocks[2].source_id).toBe('source-1')
  await seedPreflight(t, created.campaign)
  const base = { business_id: 'studio', expected_version: 1 }
  const r = await send(`campaigns/${created.campaign.id}/review`, base)
  expect(r.review.html).toContain('https://example.test/source')
  const issued = await send(`campaigns/${created.campaign.id}/challenge`, {
    ...base,
    action: 'approve',
    report_id: r.review.report_id,
  })
  const approved = await send(`campaigns/${created.campaign.id}/approve`, {
    ...base,
    review_id: r.review.id,
    report_id: r.review.report_id,
    challenge_id: issued.challenge.id,
  })
  expect(approved.campaign.state).toBe('sending')
})

it('defers a bounded page of blocked legacy jobs so a later eligible campaign progresses', async () => {
  const t = setup()
  await t.run(async (ctx: any) => {
    for (let n = 0; n < 10; n++)
      await ctx.db.insert('emailMessages', {
        businessId: 'studio',
        email: `not-allowed${n}@example.test`,
        kind: 'transactional',
        rendered: { subject: 'Legacy', html: '<p>Legacy</p>', text: 'Legacy' },
        state: 'queued',
        createdAt: Date.now() - 1000,
        nextAt: Date.now() - 1000,
      })
  })
  await member(t)
  vi.setSystemTime(Date.now() + 1000)
  const c = await create(t)
  await approve(t, c)
  await t.mutation(ref('emailCampaigns:expand'), {
    credential,
    businessId: 'studio',
    campaignId: c.id,
  })
  const [job] = await t.mutation(ref('email:claim'), {
    credential,
    businessId: 'studio',
  })
  expect(job.to).toBe('reader@example.test')
  const deferred = await t.run((ctx: any) =>
    ctx.db
      .query('emailMessages')
      .filter((q: any) => q.eq(q.field('kind'), 'transactional'))
      .collect()
  )
  expect(
    deferred.every((m: any) => m.state === 'queued' && m.nextAt > Date.now())
  ).toBe(true)
})

it.each(['success', 'unknown', 'rate_limit'] as const)(
  'drains a bounded real outbox and stops on %s safely',
  async (mode) => {
    const recipients = Array.from(
      { length: 12 },
      (_, i) => `reader${i}@example.test`
    )
    const t = setup(recipients)
    const config = JSON.parse(process.env.EMAIL_CONTROL_CONFIG!)
    Object.assign(config.businesses[0], {
      serverId: 42,
      serverTokenEnv: 'EMAIL_PROVIDER_TEST',
      publicBaseUrl: 'https://studio.test',
    })
    process.env.EMAIL_CONTROL_CONFIG = JSON.stringify(config)
    for (const recipient of recipients) await member(t, recipient)
    vi.setSystemTime(Date.now() + 1000)
    const c = await create(t)
    await approve(t, c)
    await t.mutation(ref('emailCampaigns:expand'), {
      credential,
      businessId: 'studio',
      campaignId: c.id,
    })
    let sends = 0
    const fetcher = vi.fn(async (url: any) => {
      if (String(url).endsWith('/server'))
        return new Response(JSON.stringify({ ID: 42, DeliveryType: 'Sandbox' }))
      if (String(url).endsWith('/message-streams'))
        return new Response(
          JSON.stringify({
            MessageStreams: [
              {
                ID: 'service',
                ServerID: 42,
                MessageStreamType: 'Transactional',
              },
              {
                ID: 'news',
                ServerID: 42,
                MessageStreamType: 'Broadcasts',
                SubscriptionManagementConfiguration: {
                  UnsubscribeHandlingType: 'Postmark',
                },
              },
            ],
          })
        )
      sends++
      if (mode === 'unknown')
        throw new Error('timeout after uncertain acceptance')
      if (mode === 'rate_limit')
        return new Response('{}', {
          status: 429,
          headers: { 'Retry-After': '60' },
        })
      return new Response(
        JSON.stringify({ ErrorCode: 0, MessageID: `provider-${sends}` })
      )
    })
    const response = await handleDispatch(
      new Request('https://studio.test/api/v1/email/dispatch', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credential}`,
          'X-Email-Worker-Gate': 'fake-worker-gate-secret-at-least-32-chars',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ business_id: 'studio' }),
      }),
      {
        EMAIL_CONTROL_CONFIG: process.env.EMAIL_CONTROL_CONFIG,
        EMAIL_WORKER_GATE_SECRET: 'fake-worker-gate-secret-at-least-32-chars',
        EMAIL_TEST_CAMPAIGNS: credential,
        EMAIL_PROVIDER_TEST: 'fake-server-token',
        EMAIL_TOKEN_SIGNING_KEY: 'fake-signing-key'.repeat(3),
      },
      (name, args) => t.mutation(ref(name), args),
      fetcher
    )
    expect(response.status).toBe(200)
    expect(sends).toBe(mode === 'success' ? 10 : 1)
    expect(
      fetcher.mock.calls.filter(([url]) => String(url).endsWith('/server'))
    ).toHaveLength(1)
    const stored = await t.run((ctx: any) => ctx.db.get(c.id))
    expect(stored.counters.sending).toBe(mode === 'success' ? 0 : 9)
    if (mode === 'success') {
      expect(stored.counters.submitted).toBe(10)
      expect(stored.counters.queued).toBe(2)
    }
    if (mode === 'unknown') {
      expect(stored.counters.unknown).toBe(1)
      expect(stored.counters.queued).toBe(2)
    }
    if (mode === 'rate_limit') expect(stored.counters.queued).toBe(3)
  }
)
