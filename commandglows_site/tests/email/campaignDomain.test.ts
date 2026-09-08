import { convexTest } from 'convex-test'
import { makeFunctionReference } from 'convex/server'
import schema from '../../convex/schema'
import { handleCampaignApi } from '../../src/lib/email/central/campaignApi'
import { handleDispatch } from '../../src/lib/email/central/worker'
import {
  campaignContent,
  renderCampaign,
} from '../../src/lib/email/central/campaignContent'
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
        operations: ['campaign_read', 'campaign_write', 'dispatch', 'webhook'],
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
async function approve(t: any, c: any) {
  const r = await review(t, c)
  return command(t, 'approve', {
    campaignId: c.id,
    expectedVersion: c.version,
    reviewId: r.review.id,
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
  await t.mutation(ref('emailCampaigns:expand'), { campaignId: c.id })
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
it('expands a large audience in bounded pages, resumes review, never duplicates recipients', async () => {
  const recipients = Array.from(
    { length: 121 },
    (_, i) => `person${i}@example.test`
  )
  const t = setup(recipients)
  for (const email of recipients) await member(t, email)
  vi.setSystemTime(Date.now() + 1000)
  const c = await create(t)
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
  await command(t, 'approve', {
    campaignId: c.id,
    expectedVersion: 1,
    reviewId: r3.review.id,
  })
  await t.mutation(ref('emailCampaigns:expand'), { campaignId: c.id })
  expect(
    (await t.run((ctx: any) => ctx.db.query('emailMessages').collect())).length
  ).toBe(50)
  await t.finishAllScheduledFunctions(() => vi.runAllTimers())
  await t.mutation(ref('emailCampaigns:expand'), { campaignId: c.id })
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
  await t.mutation(ref('emailCampaigns:expand'), { campaignId: c.id })
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
  await t.mutation(ref('emailCampaigns:expand'), { campaignId: c.id })
  expect((await t.run((ctx: any) => ctx.db.get(job.messageId))).state).toBe(
    'cancelled'
  )
})
it('counts submitted and late delivered exactly once, keeps unknown distinct', async () => {
  const t = setup()
  await member(t)
  const c = await create(t)
  await approve(t, c)
  await t.mutation(ref('emailCampaigns:expand'), { campaignId: c.id })
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
  const r = await review(t, c)
  await command(t, 'approve', {
    campaignId: c.id,
    expectedVersion: 1,
    reviewId: r.review.id,
    scheduledAt: '2026-09-09T12:00:00Z',
  })
  await t.mutation(ref('emailCampaigns:expand'), { campaignId: c.id })
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
        locals: { auth: () => ({ userId: 'user_admin' }) },
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
  const base = { business_id: 'studio', expected_version: 1 }
  const r = await send(`campaigns/${created.campaign.id}/review`, base)
  expect(r.review.html).toContain('https://example.test/source')
  const approved = await send(`campaigns/${created.campaign.id}/approve`, {
    ...base,
    review_id: r.review.id,
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
  await t.mutation(ref('emailCampaigns:expand'), { campaignId: c.id })
  expect(
    await t.mutation(ref('email:claim'), { credential, businessId: 'studio' })
  ).toEqual([])
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
    await t.mutation(ref('emailCampaigns:expand'), { campaignId: c.id })
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
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ business_id: 'studio' }),
      }),
      {
        EMAIL_CONTROL_CONFIG: process.env.EMAIL_CONTROL_CONFIG,
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
    expect(stored.counters.sending).toBe(0)
    if (mode === 'success') {
      expect(stored.counters.submitted).toBe(10)
      expect(stored.counters.queued).toBe(2)
    }
    if (mode === 'unknown') {
      expect(stored.counters.unknown).toBe(1)
      expect(stored.counters.queued).toBe(11)
    }
    if (mode === 'rate_limit') expect(stored.counters.queued).toBe(12)
  }
)
