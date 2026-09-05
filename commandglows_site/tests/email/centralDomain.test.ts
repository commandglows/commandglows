import { convexTest } from 'convex-test'
import { makeFunctionReference } from 'convex/server'
import schema from '../../convex/schema'
import { nonceDigest } from '../../convex/email'
import { normalizeEmail, parseEmailConfig } from '../../convex/emailConfig'
const modules = import.meta.glob('../../convex/**/*.ts')
const ref = (name: string) => makeFunctionReference<'mutation'>(`email:${name}`)
const credential = 'x'.repeat(40)
const business = {
  id: 'communityglows',
  brand: 'CommunityGlows',
  legalFooter: 'Local test notice',
  from: 'test@example.test',
  transactionalStream: 'test-service',
  broadcastStream: 'test-news',
  audiences: [
    {
      id: 'newsletter',
      purpose: 'news',
      sources: ['site'],
      noticeVersions: ['v1'],
    },
  ],
  activated: true,
  retentionDays: 30,
  allowedRecipients: ['person@example.test'],
}
const config = {
  environment: 'sandbox',
  clients: [
    {
      id: 'test',
      credentialEnv: 'EMAIL_TEST',
      businessIds: ['communityglows'],
      operations: [
        'subscribe',
        'confirm',
        'unsubscribe',
        'preferences',
        'transactional',
        'broadcast_preview',
        'broadcast_approve',
        'dispatch',
        'webhook',
        'erase',
      ],
    },
  ],
  businesses: [business],
}
const input = {
  businessId: business.id,
  email: 'person@example.test',
  audienceId: 'newsletter',
  purpose: 'news',
  source: 'site',
  noticeVersion: 'v1',
  locale: 'fr',
  consent: true,
  confirmationNonce: 'a'.repeat(64),
  unsubscribeNonce: 'b'.repeat(64),
}
const invoke = (
  t: any,
  operation: string,
  body: any = input,
  key = 'request-key-00001'
) =>
  t.mutation(ref('command'), {
    credential,
    operation,
    idempotencyKey: key,
    input: body,
  })
const rows = (t: any, table: string) =>
  t.run((ctx: any) => ctx.db.query(table).collect())
const confirm = async (t: any) =>
  invoke(
    t,
    'confirm',
    {
      businessId: business.id,
      tokenDigest: await nonceDigest(input.confirmationNonce),
    },
    'confirm-key-00001'
  )
const claim = (t: any) =>
  t.mutation(ref('claim'), { credential, businessId: business.id })
const draft = (t: any) =>
  invoke(
    t,
    'broadcast_preview',
    {
      businessId: business.id,
      email: input.email,
      audienceId: 'newsletter',
      purpose: 'news',
      locale: 'fr',
      subject: 'News <script>',
      paragraphs: ['Hello <img src=x>'],
    },
    'preview-key-00001'
  )
beforeEach(() => {
  process.env.EMAIL_CONTROL_CONFIG = JSON.stringify(config)
  process.env.EMAIL_TEST = credential
  process.env.EMAIL_SUPPRESSION_HASH_KEY = 's'.repeat(40)
})
afterEach(() => {
  delete process.env.EMAIL_CONTROL_CONFIG
  delete process.env.EMAIL_TEST
  delete process.env.EMAIL_SUPPRESSION_HASH_KEY
  vi.useRealTimers()
})
describe('central domain', () => {
  test('normalizes and rejects headers', () => {
    expect(normalizeEmail(' A@Example.test ')).toBe('a@example.test')
    expect(() => normalizeEmail('a@b.test\r\nBcc:x')).toThrow()
  })
  test('configuration activation requires retention and separate streams', () => {
    expect(() =>
      parseEmailConfig(
        JSON.stringify({
          ...config,
          businesses: [{ ...business, retentionDays: undefined }],
        })
      )
    ).toThrow()
    expect(() =>
      parseEmailConfig(
        JSON.stringify({
          ...config,
          businesses: [
            { ...business, broadcastStream: business.transactionalStream },
          ],
        })
      )
    ).toThrow()
  })
  test('atomic replay writes one pending membership and conflict rolls back', async () => {
    const t = convexTest(schema, modules)
    const first = await invoke(t, 'subscribe')
    expect(await invoke(t, 'subscribe')).toEqual(first)
    expect(await rows(t, 'emailMemberships')).toHaveLength(1)
    expect(await rows(t, 'emailMessages')).toHaveLength(1)
    expect((await rows(t, 'emailRequests'))[0].fingerprint).not.toContain(
      'person'
    )
    await expect(
      invoke(t, 'subscribe', { ...input, locale: 'en' })
    ).rejects.toThrow('idempotency_conflict')
  })
  test('cross-business and unregistered notices fail without contacts', async () => {
    const t = convexTest(schema, modules)
    await expect(
      invoke(t, 'subscribe', { ...input, businessId: 'other' })
    ).rejects.toThrow('forbidden')
    await expect(
      invoke(t, 'subscribe', { ...input, noticeVersion: 'unapproved' })
    ).rejects.toThrow('invalid_input')
    expect(await rows(t, 'emailAddresses')).toHaveLength(0)
  })
  test('confirmation grants only explicit original evidence and replay fails', async () => {
    const t = convexTest(schema, modules)
    await invoke(t, 'subscribe')
    await confirm(t)
    const granted = (await rows(t, 'emailConsents')).find(
      (r: any) => r.action === 'granted'
    )
    expect(granted).toMatchObject({
      noticeVersion: 'v1',
      source: 'site',
      locale: 'fr',
    })
    await expect(
      invoke(
        t,
        'confirm',
        {
          businessId: business.id,
          tokenDigest: await nonceDigest(input.confirmationNonce),
        },
        'confirm-key-00002'
      )
    ).rejects.toThrow('invalid_token')
  })
  test('expired confirmation does not grant', async () => {
    const t = convexTest(schema, modules)
    await invoke(t, 'subscribe')
    await t.run(async (ctx) => {
      const token = await ctx.db.query('emailTokens').first()
      await ctx.db.patch(token!._id, { expiresAt: 0 })
    })
    await expect(confirm(t)).rejects.toThrow('invalid_token')
  })
  test('repeat subscribed request preserves consent and does not send confirmation', async () => {
    const t = convexTest(schema, modules)
    await invoke(t, 'subscribe')
    await confirm(t)
    await invoke(
      t,
      'subscribe',
      {
        ...input,
        confirmationNonce: 'c'.repeat(64),
        unsubscribeNonce: 'd'.repeat(64),
      },
      'request-key-00002'
    )
    expect((await rows(t, 'emailMemberships'))[0].state).toBe('subscribed')
    expect(await rows(t, 'emailMessages')).toHaveLength(1)
  })
  test('unconfirmed or withdrawn cannot dispatch broadcast', async () => {
    const t = convexTest(schema, modules)
    await invoke(t, 'subscribe')
    const d = await draft(t)
    await invoke(
      t,
      'broadcast_approve',
      { businessId: business.id, draftId: d.draftId },
      'approval-key-001'
    )
    const jobs = await claim(t)
    expect(jobs.every((j: any) => j.streamClass === 'transactional')).toBe(true)
    expect(await claim(t)).toHaveLength(0)
    expect(
      (await rows(t, 'emailMessages')).find((m: any) => m.kind === 'broadcast')
        .state
    ).toBe('cancelled')
  })
  test('preview escapes HTML and approval precedes durable exclusive claim', async () => {
    const t = convexTest(schema, modules)
    await invoke(t, 'subscribe')
    await confirm(t)
    const d = await draft(t)
    expect(await claim(t)).toHaveLength(0)
    await invoke(
      t,
      'broadcast_approve',
      { businessId: business.id, draftId: d.draftId },
      'approval-key-001'
    )
    const jobs = await claim(t)
    expect(jobs).toHaveLength(1)
    expect(jobs[0].html).toContain('&lt;img')
    expect(await claim(t)).toHaveLength(0)
  })
  test('withdraw before claim cancels queued broadcast', async () => {
    const t = convexTest(schema, modules)
    await invoke(t, 'subscribe')
    await confirm(t)
    const d = await draft(t)
    await invoke(
      t,
      'broadcast_approve',
      { businessId: business.id, draftId: d.draftId },
      'approval-key-001'
    )
    await invoke(
      t,
      'unsubscribe',
      {
        businessId: business.id,
        tokenDigest: await nonceDigest(input.unsubscribeNonce),
      },
      'withdraw-key-001'
    )
    expect(await claim(t)).toHaveLength(0)
  })
  test('crash after claim becomes unknown and never automatically retries', async () => {
    const t = convexTest(schema, modules)
    await invoke(t, 'subscribe')
    const jobs = await claim(t)
    await t.run((ctx) => ctx.db.patch(jobs[0].messageId, { leaseUntil: 0 }))
    expect(await claim(t)).toHaveLength(0)
    expect((await rows(t, 'emailMessages'))[0].state).toBe('unknown')
  })
  test('provider complaint dedup and reactivation cannot grant', async () => {
    const t = convexTest(schema, modules)
    await invoke(t, 'subscribe')
    const event = {
      credential,
      businessId: business.id,
      eventId: 'provider-event-1',
      email: input.email,
      type: 'complaint',
      streamId: business.broadcastStream,
    }
    await t.mutation(ref('webhook'), event)
    await t.mutation(ref('webhook'), event)
    await t.mutation(ref('webhook'), {
      ...event,
      eventId: 'provider-event-2',
      type: 'reactivate',
    })
    expect(await rows(t, 'emailSuppressions')).toHaveLength(1)
    expect((await rows(t, 'emailMemberships'))[0].state).toBe('pending')
    await confirm(t)
    const d = await draft(t)
    await invoke(
      t,
      'broadcast_approve',
      { businessId: business.id, draftId: d.draftId },
      'approval-key-001'
    )
    expect(await claim(t)).toHaveLength(0)
  })
  test('erasure removes contact evidence tokens and message content, retains suppressions', async () => {
    const t = convexTest(schema, modules)
    await invoke(t, 'subscribe')
    await invoke(
      t,
      'erase',
      { businessId: business.id, email: input.email },
      'erase-key-000001'
    )
    for (const table of [
      'emailAddresses',
      'emailMemberships',
      'emailConsents',
      'emailTokens',
    ])
      expect(await rows(t, table)).toHaveLength(0)
    expect((await rows(t, 'emailMessages'))[0]).toMatchObject({
      email: 'erased',
      rendered: {},
      state: 'erased',
    })
    expect(await rows(t, 'emailSuppressions')).toHaveLength(1)
    expect(await rows(t, 'productEntitlements')).toHaveLength(0)
  })
})

describe('dispatch and privacy boundaries', () => {
  test('fresh signup invalidates old confirmation generation', async () => {
    const t = convexTest(schema, modules)
    await invoke(t, 'subscribe')
    await invoke(
      t,
      'subscribe',
      {
        ...input,
        confirmationNonce: 'c'.repeat(64),
        unsubscribeNonce: 'd'.repeat(64),
      },
      'request-key-00002'
    )
    await expect(confirm(t)).rejects.toThrow('invalid_token')
    const jobs = await claim(t)
    expect(jobs).toHaveLength(1)
    expect(jobs[0].content.confirmationNonce).toBe('c'.repeat(64))
  })
  test('product subscribe authority cannot confirm using direct backend', async () => {
    process.env.EMAIL_CONTROL_CONFIG = JSON.stringify({
      ...config,
      clients: [{ ...config.clients[0], operations: ['subscribe'] }],
    })
    const t = convexTest(schema, modules)
    await invoke(t, 'subscribe')
    await expect(confirm(t)).rejects.toThrow('forbidden')
  })
  test('withdrawal after claim is rejected by final dispatch check', async () => {
    const t = convexTest(schema, modules)
    await invoke(t, 'subscribe')
    await confirm(t)
    const d = await draft(t)
    await invoke(
      t,
      'broadcast_approve',
      { businessId: business.id, draftId: d.draftId },
      'approval-key-001'
    )
    const [job] = await claim(t)
    await invoke(
      t,
      'unsubscribe',
      {
        businessId: business.id,
        tokenDigest: await nonceDigest(input.unsubscribeNonce),
      },
      'withdraw-key-001'
    )
    expect(
      await t.mutation(ref('recheckDispatch'), {
        credential,
        businessId: business.id,
        messageId: job.messageId,
        attemptId: job.attemptId,
      })
    ).toEqual({ eligible: false })
  })
  test('explicit retryable response schedules a retry but ambiguous never does', async () => {
    const t = convexTest(schema, modules)
    await invoke(t, 'subscribe')
    const [job] = await claim(t)
    await t.mutation(ref('settle'), {
      credential,
      businessId: business.id,
      messageId: job.messageId,
      attemptId: job.attemptId,
      outcome: 'retryable_failure',
      errorCode: 'rate_limited',
    })
    expect(await claim(t)).toHaveLength(0)
    await t.run((ctx) => ctx.db.patch(job.messageId, { nextAt: 0 }))
    const [retry] = await claim(t)
    expect(retry.attemptId).not.toBe(job.attemptId)
    await t.mutation(ref('settle'), {
      credential,
      businessId: business.id,
      messageId: retry.messageId,
      attemptId: retry.attemptId,
      outcome: 'unknown',
    })
    expect(await claim(t)).toHaveLength(0)
  })
  test('recipient abuse threshold is atomic and does not add fourth confirmation', async () => {
    const t = convexTest(schema, modules)
    await invoke(t, 'subscribe')
    await invoke(
      t,
      'subscribe',
      {
        ...input,
        confirmationNonce: 'c'.repeat(64),
        unsubscribeNonce: 'd'.repeat(64),
      },
      'request-key-00002'
    )
    await invoke(
      t,
      'subscribe',
      {
        ...input,
        confirmationNonce: 'e'.repeat(64),
        unsubscribeNonce: 'f'.repeat(64),
      },
      'request-key-00003'
    )
    await expect(
      invoke(
        t,
        'subscribe',
        {
          ...input,
          confirmationNonce: '1'.repeat(64),
          unsubscribeNonce: '2'.repeat(64),
        },
        'request-key-00004'
      )
    ).rejects.toThrow('rate_limited')
    expect(await rows(t, 'emailMessages')).toHaveLength(3)
  })
  test('erase removes raw recipient from all email tables and blocks future send', async () => {
    const t = convexTest(schema, modules)
    await invoke(t, 'subscribe')
    await invoke(
      t,
      'erase',
      { businessId: business.id, email: input.email },
      'erase-key-000001'
    )
    for (const table of [
      'emailAddresses',
      'emailMemberships',
      'emailConsents',
      'emailTokens',
      'emailMessages',
      'emailRequests',
      'emailSuppressions',
      'emailEvents',
      'emailAttempts',
      'emailRateLimits',
    ])
      expect(JSON.stringify(await rows(t, table))).not.toContain(input.email)
    await invoke(
      t,
      'subscribe',
      {
        ...input,
        confirmationNonce: 'c'.repeat(64),
        unsubscribeNonce: 'd'.repeat(64),
      },
      'request-key-00002'
    )
    expect(await claim(t)).toHaveLength(0)
  })
  test('same global address has isolated memberships and erasure preserves other brand', async () => {
    const other = {
      ...business,
      id: 'other',
      broadcastStream: 'other-news',
      transactionalStream: 'other-service',
    }
    process.env.EMAIL_CONTROL_CONFIG = JSON.stringify({
      ...config,
      businesses: [business, other],
      clients: [{ ...config.clients[0], businessIds: [business.id, 'other'] }],
    })
    const t = convexTest(schema, modules)
    await invoke(t, 'subscribe')
    await invoke(
      t,
      'subscribe',
      {
        ...input,
        businessId: 'other',
        confirmationNonce: 'c'.repeat(64),
        unsubscribeNonce: 'd'.repeat(64),
      },
      'request-key-00002'
    )
    expect(await rows(t, 'emailAddresses')).toHaveLength(1)
    expect(await rows(t, 'emailMemberships')).toHaveLength(2)
    await invoke(
      t,
      'erase',
      { businessId: business.id, email: input.email },
      'erase-key-000001'
    )
    expect(await rows(t, 'emailAddresses')).toHaveLength(1)
    expect((await rows(t, 'emailMemberships'))[0].businessId).toBe('other')
  })
  test('transactional template cannot accept marketing HTML or subject', async () => {
    const t = convexTest(schema, modules)
    await expect(
      invoke(t, 'transactional', {
        businessId: business.id,
        email: input.email,
        templateKey: 'service_notification',
        reason: 'service',
        locale: 'en',
        subject: 'Buy now',
      })
    ).rejects.toThrow('invalid_input')
    const result = await invoke(t, 'transactional', {
      businessId: business.id,
      email: input.email,
      templateKey: 'service_notification',
      reason: 'service',
      locale: 'en',
    })
    expect(result.status).toBe('queued')
    expect(await rows(t, 'emailConsents')).toHaveLength(0)
  })
})

test('withdrawn pending membership cannot be revived by old confirmation', async () => {
  const t = convexTest(schema, modules)
  await invoke(t, 'subscribe')
  await invoke(
    t,
    'unsubscribe',
    {
      businessId: business.id,
      tokenDigest: await nonceDigest(input.unsubscribeNonce),
    },
    'withdraw-key-001'
  )
  await expect(confirm(t)).rejects.toThrow('invalid_token')
})

test('authenticated matching callback reconciles an ambiguous send durably', async () => {
  const t = convexTest(schema, modules)
  await invoke(t, 'subscribe')
  const [job] = await claim(t)
  await t.mutation(ref('settle'), {
    credential,
    businessId: business.id,
    messageId: job.messageId,
    attemptId: job.attemptId,
    outcome: 'unknown',
  })
  await t.mutation(ref('webhook'), {
    credential,
    businessId: business.id,
    eventId: 'event-delivery-reconcile',
    email: input.email,
    type: 'delivery',
    streamId: business.transactionalStream,
    providerMessageId: 'provider-id-one',
    internalMessageId: job.messageId,
    occurredAt: Date.now(),
  })
  expect((await rows(t, 'emailMessages'))[0]).toMatchObject({
    state: 'delivered',
    providerMessageId: 'provider-id-one',
  })
  expect((await rows(t, 'emailEvents'))[0].messageId).toBe(job.messageId)
  expect(await claim(t)).toHaveLength(0)
})

test('semantic email normalization preserves request replay and supports Unicode domains', async () => {
  expect(normalizeEmail('Person@b\u00fccher.test')).toBe(
    'person@xn--bcher-kva.test'
  )
  const t = convexTest(schema, modules)
  const first = await invoke(t, 'subscribe')
  expect(
    await invoke(t, 'subscribe', { ...input, email: ' PERSON@EXAMPLE.TEST ' })
  ).toEqual(first)
})
