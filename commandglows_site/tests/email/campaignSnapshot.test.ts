import { convexTest } from 'convex-test'
import { makeFunctionReference } from 'convex/server'
import schema from '../../convex/schema'
import { emptyCampaignCounters } from '../../convex/emailCampaignState'
import { campaignAllowsDispatch } from '../../convex/emailCampaignState'

it('denies dispatch after unsubscribe and resubscribe following expansion', async () => {
  const t = convexTest(schema, modules)
  const membershipId = await t.run((ctx) =>
    ctx.db.insert('emailMemberships', {
      businessId: 'studio',
      audienceId: 'news',
      purpose: 'marketing',
      email: 'first@example.test',
      state: 'subscribed',
      generation: 1,
      updatedAt: Date.now() - 1000,
    })
  )
  const c = (await command(t, 'create', content)).campaign
  const review = await command(t, 'review', {
    campaignId: c.id,
    expectedVersion: 1,
  })
  await command(t, 'approve', {
    campaignId: c.id,
    expectedVersion: 1,
    reviewId: review.review.id,
  })
  await t.mutation(ref('emailCampaigns:expand'), { campaignId: c.id })
  const message = await t.run((ctx) => ctx.db.query('emailMessages').first())
  expect(await t.run((ctx) => campaignAllowsDispatch(ctx, message))).toBe(true)
  // Even churn within the review millisecond must invalidate the generation.
  await t.run((ctx) =>
    ctx.db.patch(membershipId, { state: 'withdrawn', updatedAt: Date.now() })
  )
  await t.run((ctx) =>
    ctx.db.patch(membershipId, {
      state: 'subscribed',
      generation: 2,
      updatedAt: Date.now(),
    })
  )
  expect(await t.run((ctx) => campaignAllowsDispatch(ctx, message))).toBe(false)
})
const modules = import.meta.glob('../../convex/**/*.ts')
const ref = (name: string) => makeFunctionReference<'mutation'>(name)
const credential = 'snapshot-credential'.repeat(3)
const content = {
  title: 'Snapshot',
  audienceId: 'news',
  locale: 'fr',
  subject: 'Bonjour',
  preheader: '',
  blocks: [{ id: 'one', type: 'text', text: 'Bonjour' }],
}
const business = {
  id: 'studio',
  brand: 'Studio',
  legalFooter: 'Contact',
  from: 'sender@example.test',
  transactionalStream: 'service',
  broadcastStream: 'news',
  activated: true,
  retentionDays: 30,
  allowedRecipients: ['first@example.test'],
  audiences: [
    {
      id: 'news',
      purpose: 'marketing',
      sources: ['site'],
      noticeVersions: ['v1'],
    },
  ],
}
let key = 0
function config(recipients = business.allowedRecipients) {
  process.env.EMAIL_SNAPSHOT_CREDENTIAL = credential
  process.env.EMAIL_CONTROL_CONFIG = JSON.stringify({
    environment: 'sandbox',
    clients: [
      {
        id: 'operator',
        credentialEnv: 'EMAIL_SNAPSHOT_CREDENTIAL',
        businessIds: ['studio'],
        operations: ['campaign_read', 'campaign_write'],
      },
    ],
    businesses: [{ ...business, allowedRecipients: recipients }],
  })
}
const command = (t: any, operation: string, input: any) =>
  t.mutation(ref('emailCampaigns:command'), {
    credential,
    actorId: 'admin',
    businessId: 'studio',
    operation,
    input,
    idempotencyKey: `snapshot-key-${String(++key).padStart(10, '0')}`,
  })
beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-09-08T12:00:00Z') })
  config()
})
afterEach(() => {
  vi.useRealTimers()
  delete process.env.EMAIL_SNAPSHOT_CREDENTIAL
  delete process.env.EMAIL_CONTROL_CONFIG
})
it('freezes reviewed audience against allowlist growth and lifting suppression', async () => {
  const t = convexTest(schema, modules)
  config(['first@example.test', 'suppressed@example.test'])
  const suppression = await t.run(async (ctx) => {
    for (const email of [
      'first@example.test',
      'later@example.test',
      'suppressed@example.test',
    ])
      await ctx.db.insert('emailMemberships', {
        businessId: 'studio',
        audienceId: 'news',
        purpose: 'marketing',
        email,
        state: 'subscribed',
        generation: 1,
        updatedAt: Date.now() - 1000,
      })
    return ctx.db.insert('emailSuppressions', {
      businessId: 'studio',
      email: 'suppressed@example.test',
      reason: 'unsubscribe',
      at: Date.now(),
    })
  })
  vi.setSystemTime(Date.now() + 1000)
  const c = (await command(t, 'create', content)).campaign
  const review = await command(t, 'review', {
    campaignId: c.id,
    expectedVersion: 1,
  })
  expect(review.review.eligible_count).toBe(1)
  config([
    'first@example.test',
    'later@example.test',
    'suppressed@example.test',
  ])
  await t.run((ctx) => ctx.db.delete(suppression))
  await command(t, 'approve', {
    campaignId: c.id,
    expectedVersion: 1,
    reviewId: review.review.id,
  })
  await t.mutation(ref('emailCampaigns:expand'), { campaignId: c.id })
  expect(
    await t.run(async (ctx) =>
      (await ctx.db.query('emailMessages').collect()).map((m) => m.email)
    )
  ).toEqual(['first@example.test'])
  const detail = await t.query(
    makeFunctionReference<'query'>('emailCampaigns:read'),
    {
      credential,
      actorId: 'admin',
      businessId: 'studio',
      operation: 'get',
      input: { campaignId: c.id },
    }
  )
  expect(detail.campaign.eligible_count).toBe(1)
})
it('advances recovery past more than twenty disabled campaigns', async () => {
  const t = convexTest(schema, modules)
  const activeId = await t.run(async (ctx) => {
    const base = {
      ...content,
      version: 1,
      state: 'scheduled',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'admin',
      updatedBy: 'admin',
      scheduledAt: Date.now() - 1000,
      expansionComplete: false,
      counters: emptyCampaignCounters(),
    }
    for (let i = 0; i < 25; i++)
      await ctx.db.insert('emailCampaigns', { ...base, businessId: 'disabled' })
    return ctx.db.insert('emailCampaigns', { ...base, businessId: 'studio' })
  })
  await t.mutation(ref('emailCampaigns:recover'), {})
  await t.finishAllScheduledFunctions(() => vi.runAllTimers())
  expect((await t.run((ctx) => ctx.db.get(activeId)))?.state).toBe('scheduled')
  await t.mutation(ref('emailCampaigns:recover'), {})
  await t.finishAllScheduledFunctions(() => vi.runAllTimers())
  expect((await t.run((ctx) => ctx.db.get(activeId)))?.state).toBe('completed')
  expect(
    await t.run(async (ctx) =>
      (await ctx.db.query('emailCampaignRecovery').collect()).every(
        (row) => row.cursor === null
      )
    )
  ).toBe(true)
})
