import { convexTest } from 'convex-test'
import { anyApi, makeFunctionReference } from 'convex/server'
import schema from '../../convex/schema'
import { deliveryRoute, type EmailConfig } from '../../convex/emailConfig'
import { handleCampaigns } from '../../src/lib/email/central/campaigns'
const modules = import.meta.glob('../../convex/**/*.ts')
const credential = 'x'.repeat(40)
const start = 1_800_000_000_000
const email = (n: number) => `person${n}@example.test`
async function fixture(count = 3) {
  vi.useFakeTimers()
  vi.setSystemTime(start)
  const config: EmailConfig = {
    environment: 'sandbox',
    clients: [
      {
        id: 'test',
        credentialEnv: 'EMAIL_TEST',
        businessIds: ['test'],
        operations: [
          'campaign_read',
          'campaign_write',
          'campaign_dispatch',
          'dispatch',
        ],
      },
    ],
    businesses: [
      {
        id: 'test',
        brand: 'Test',
        legalFooter: 'Test operator',
        from: 'sender@example.test',
        transactionalStream: 'outbound',
        broadcastStream: 'news',
        audiences: [
          {
            id: 'news',
            purpose: 'news',
            sources: ['test'],
            noticeVersions: ['v1'],
          },
        ],
        activated: true,
        retentionDays: 30,
        allowedRecipients: Array.from({ length: 100 }, (_, n) => email(n)),
      },
    ],
  }
  const env = {
    EMAIL_TEST: credential,
    EMAIL_CONTROL_CONFIG: JSON.stringify(config),
  }
  vi.stubEnv('EMAIL_TEST', credential)
  vi.stubEnv('EMAIL_CONTROL_CONFIG', env.EMAIL_CONTROL_CONFIG)
  const t = convexTest(schema, modules)
  const members = await t.run(async (ctx) => {
    const ids = []
    for (let n = 0; n < count; n++)
      ids.push(
        await ctx.db.insert('emailMemberships', {
          businessId: 'test',
          email: email(n),
          audienceId: 'news',
          purpose: 'news',
          state: 'subscribed',
          generation: 1,
          updatedAt: start,
        })
      )
    return ids
  })
  vi.setSystemTime(start + 1000)
  let keyNumber = 0
  const backend = {
    query: (name: string, args: any) =>
      t.query(makeFunctionReference<'query'>(name), args),
    mutation: (name: string, args: any) =>
      t.mutation(makeFunctionReference<'mutation'>(name), args),
  }
  const send = async (
    body: Record<string, any>,
    key = `campaign-request-${++keyNumber}`
  ) => {
    const request = new Request('https://example.test/api/v1/email/campaigns', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${credential}`,
        'content-type': 'application/json',
        'idempotency-key': key,
      },
      body: JSON.stringify({ business_id: 'test', ...body }),
    })
    const response = await handleCampaigns(request, env, backend)
    return { status: response.status, body: await response.json() }
  }
  const post = async (
    operation: string,
    campaign?: any,
    input: Record<string, any> = {},
    key?: string
  ) => {
    const result = await send(
      {
        operation,
        expected_version: campaign?.revision ?? 0,
        ...(campaign ? { campaign_id: campaign.campaign_id } : {}),
        ...input,
      },
      key
    )
    expect(result.status).toBe(200)
    return result.body
  }
  const draft = (input: Record<string, any> = {}) =>
    post('create', undefined, {
      audience_id: 'news',
      locale: 'fr',
      subject: 'Nouvelles',
      paragraphs: ['Bonjour.'],
      scheduled_at: start + 1000,
      timezone: 'Europe/Paris',
      ...input,
    })
  const snapshot = async (c: any) => {
    for (let n = 0; !c.snapshot.complete && n < 10; n++)
      c = await post('snapshot', c)
    expect(c.snapshot.complete).toBe(true)
    return c
  }
  const read = async (view: string, c: any, cursor?: string, limit = 25) => {
    const params = new URLSearchParams({
      business_id: 'test',
      view,
      campaign_id: c.campaign_id,
      limit: String(limit),
      ...(cursor ? { cursor } : {}),
    })
    const response = await handleCampaigns(
      new Request(`https://example.test/api/v1/email/campaigns?${params}`, {
        headers: { authorization: `Bearer ${credential}` },
      }),
      env,
      backend
    )
    expect(response.status).toBe(200)
    return response.json()
  }
  const pump = () =>
    t.mutation(anyApi.emailCampaigns.pump, { credential, businessId: 'test' })
  const claim = () =>
    t.mutation(anyApi.email.claim, {
      credential,
      businessId: 'test',
      expectedRoute: deliveryRoute(config, config.businesses[0]),
    })
  const recheck = (j: any) =>
    t.mutation(anyApi.email.recheckDispatch, {
      credential,
      businessId: 'test',
      messageId: j.messageId,
      attemptId: j.attemptId,
      expectedRoute: j.route,
    })
  return {
    t,
    config,
    env,
    members,
    draft,
    post,
    send,
    snapshot,
    read,
    pump,
    claim,
    recheck,
  }
}
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

test('an audience rename to a different purpose cannot reuse an earlier consent', async () => {
  const f = await fixture(2)
  await f.t.run(ctx => ctx.db.patch(f.members[0], { purpose: 'old-purpose' }))
  let c = await f.snapshot(await f.draft())
  expect(c.snapshot.eligible).toBe(1)
  expect(c.snapshot.excluded).toBe(1)
  c = await f.post('approve', c)
  await f.t.run(ctx => ctx.db.patch(f.members[1], { purpose: 'other-purpose' }))
  await f.pump()
  expect(await f.t.run(ctx => ctx.db.query('emailMessages').collect())).toHaveLength(0)
  expect((await f.read('status', c)).fanout.excluded).toBe(1)
})

test('HTTP campaign snapshot/fanout spans pages, freezes cutoff, and returns recipient-free status', async () => {
  const f = await fixture(60)
  let c = await f.draft()
  vi.setSystemTime(start + 2000)
  await f.t.run((ctx) =>
    ctx.db.insert('emailMemberships', {
      businessId: 'test',
      email: email(61),
      audienceId: 'news',
      purpose: 'news',
      state: 'subscribed',
      generation: 1,
      updatedAt: Date.now(),
    })
  )
  c = await f.snapshot(c)
  expect(c.snapshot).toMatchObject({ scanned: 60, eligible: 60, excluded: 0 })
  c = await f.post('approve', c)
  for (let i = 0; i < 3; i++) {
    await f.pump()
    vi.setSystemTime(Date.now() + 2000)
  }
  const messages = await f.t.run((ctx) =>
    ctx.db.query('emailMessages').collect()
  )
  expect(messages).toHaveLength(60)
  expect(messages.some((m) => m.email === email(61))).toBe(false)
  const status = await f.read('status', c)
  expect(status).toMatchObject({
    state: 'fanout_complete',
    fanout: { queued: 60, excluded: 0, complete: true },
  })
  let cursor: string | undefined
  let total = 0
  do {
    const page = await f.read('recipients', c, cursor, 19)
    expect(page.page.length).toBeLessThanOrEqual(19)
    expect(JSON.stringify(page)).not.toContain('@')
    total += page.page.length
    cursor = page.cursor ?? undefined
  } while (cursor)
  expect(total).toBe(60)
})

test('concurrent idempotent writes replay one receipt and concurrent pumps never duplicate messages', async () => {
  const f = await fixture(3)
  const input = {
    audience_id: 'news',
    locale: 'en',
    subject: 'News',
    paragraphs: ['Hello.'],
    scheduled_at: start + 1000,
    timezone: 'UTC',
  }
  const [a, b] = await Promise.all([
    f.post('create', undefined, input, 'same-create-key-0001'),
    f.post('create', undefined, input, 'same-create-key-0001'),
  ])
  expect(a).toEqual(b)
  let c = await f.snapshot(a)
  const [approved, replay] = await Promise.all([
    f.post('approve', c, {}, 'same-approve-key-001'),
    f.post('approve', c, {}, 'same-approve-key-001'),
  ])
  expect(approved).toEqual(replay)
  c = approved
  await Promise.all([f.pump(), f.pump()])
  expect(
    await f.t.run((ctx) => ctx.db.query('emailMessages').collect())
  ).toHaveLength(3)
  expect(
    (
      await f.send({
        operation: 'cancel',
        campaign_id: c.campaign_id,
        expected_version: a.revision,
      })
    ).status
  ).toBe(409)
  expect(
    (
      await f.send(
        {
          operation: 'create',
          expected_version: 0,
          ...input,
          subject: 'Changed',
        },
        'same-create-key-0001'
      )
    ).status
  ).toBe(409)
})

test('withdrawal/resubscription after snapshot is excluded and later withdrawal cancels queued marketing', async () => {
  const f = await fixture(3)
  let c = await f.snapshot(await f.draft())
  await f.t.run((ctx) =>
    ctx.db.patch(f.members[0], {
      generation: 3,
      state: 'subscribed',
      updatedAt: Date.now() + 1,
    })
  )
  c = await f.post('approve', c)
  await f.pump()
  expect((await f.read('status', c)).fanout).toMatchObject({
    queued: 2,
    excluded: 1,
  })
  const [job] = await f.claim()
  const target = await f.t.run((ctx) => ctx.db.get(job.messageId))
  const member = await f.t.run((ctx) =>
    ctx.db
      .query('emailMemberships')
      .withIndex('scope', (q) =>
        q
          .eq('businessId', 'test')
          .eq('email', target!.email)
          .eq('audienceId', 'news')
      )
      .unique()
  )
  await f.t.run((ctx) =>
    ctx.db.patch(member!._id, { state: 'withdrawn', generation: 2 })
  )
  expect(await f.recheck(job)).toEqual({ eligible: false })
  expect(await f.t.run((ctx) => ctx.db.get(job.messageId))).toMatchObject({
    state: 'cancelled',
  })
})

test('schedule is approved as saved, edits invalidate approval, and dispatch requires a fresh snapshot', async () => {
  const f = await fixture()
  let c = await f.snapshot(await f.draft({ scheduled_at: start + 60_000 }))
  c = await f.post('approve', c)
  expect(await f.pump()).toEqual({ processed: 0 })
  c = await f.post('revise', c, {
    audience_id: 'news',
    locale: 'fr',
    subject: 'Révision',
    paragraphs: ['Texte révisé.'],
    scheduled_at: start + 90_000,
    timezone: 'Europe/Paris',
  })
  expect(c).toMatchObject({
    state: 'draft',
    content_version: 2,
    snapshot: { complete: false },
  })
  expect(
    (
      await f.send({
        operation: 'approve',
        campaign_id: c.campaign_id,
        expected_version: c.revision,
      })
    ).status
  ).toBe(409)
  c = await f.post('approve', await f.snapshot(c))
  vi.setSystemTime(start + 89_000)
  expect(await f.pump()).toEqual({ processed: 0 })
  vi.setSystemTime(start + 90_000)
  expect(await f.pump()).toEqual({ processed: 3 })
  const preview = await f.read('preview', c)
  expect(preview.rendered.text).toContain('Texte révisé.')
  expect(
    await f.t.run((ctx) => ctx.db.query('emailCampaignVersions').collect())
  ).toHaveLength(2)
})

test('campaign pause after claim releases the unsent lease; resume reuses it; cancel never recalls unknown', async () => {
  const f = await fixture(1)
  let c = await f.post('approve', await f.snapshot(await f.draft()))
  await f.pump()
  const [job] = await f.claim()
  c = await f.post('pause', c)
  expect(await f.recheck(job)).toEqual({ eligible: false })
  expect(await f.t.run((ctx) => ctx.db.get(job.messageId))).toMatchObject({
    state: 'queued',
  })
  expect(await f.claim()).toEqual([])
  c = await f.post('resume', c)
  vi.setSystemTime(Date.now() + 61_000)
  const [resumed] = await f.claim()
  expect(resumed.messageId).toBe(job.messageId)
  expect(await f.recheck(resumed)).toEqual({ eligible: true })
  await f.t.mutation(anyApi.email.settle, {
    credential,
    businessId: 'test',
    messageId: resumed.messageId,
    attemptId: resumed.attemptId,
    outcome: 'unknown',
  })
  await f.post('cancel', c)
  expect(await f.claim()).toEqual([])
  expect(await f.t.run((ctx) => ctx.db.get(job.messageId))).toMatchObject({
    state: 'unknown',
  })
})

test('global channel pause after claim is resumable, while cancellation blocks queued campaign work', async () => {
  const f = await fixture(2)
  let c = await f.post('approve', await f.snapshot(await f.draft()))
  await f.pump()
  const [job] = await f.claim()
  const control = await f.t.run((ctx) =>
    ctx.db.insert('emailChannelControls', {
      businessId: 'test',
      class: 'all',
      paused: true,
      version: 1,
      updatedAt: Date.now(),
    })
  )
  expect(await f.recheck(job)).toEqual({ eligible: false })
  expect(await f.t.run((ctx) => ctx.db.get(job.messageId))).toMatchObject({
    state: 'queued',
  })
  await f.t.run((ctx) => ctx.db.patch(control, { paused: false }))
  vi.setSystemTime(Date.now() + 61_000)
  expect((await f.claim()).length).toBe(1)
  c = await f.post('cancel', c)
  const second = await f.claim()
  expect(second).toEqual([])
})

test('tenant reads/writes denied; a route change invalidates approval and Live test never approves marketing', async () => {
  const f = await fixture()
  const c = await f.snapshot(await f.draft())
  expect(
    (
      await f.send({
        business_id: 'foreign',
        operation: 'cancel',
        campaign_id: c.campaign_id,
        expected_version: c.revision,
      })
    ).status
  ).toBe(403)
  f.config.businesses[0].providerMode = 'Live'
  f.config.businesses[0].liveTest = {
    id: 'test-only',
    recipients: [email(0)],
    expiresAt: Date.now() + 60_000,
    maxAttempts: 1,
  }
  vi.stubEnv('EMAIL_CONTROL_CONFIG', JSON.stringify(f.config))
  expect(
    (
      await f.send({
        operation: 'approve',
        campaign_id: c.campaign_id,
        expected_version: c.revision,
      })
    ).status
  ).toBe(409)
  expect(await f.pump()).toEqual({ processed: 0 })
})

test('operator lane precedes a large marketing queue, and each pump handles at most one campaign page', async () => {
  const f = await fixture(30)
  const a = await f.post('approve', await f.snapshot(await f.draft()))
  const b = await f.post('approve', await f.snapshot(await f.draft()))
  expect(await f.pump()).toEqual({ processed: 25 })
  expect(await f.pump()).toEqual({ processed: 25 })
  const op = await f.t.run((ctx) =>
    ctx.db.insert('emailMessages', {
      businessId: 'test',
      email: email(0),
      kind: 'operator',
      rendered: { subject: 'Alert', html: '<p>Alert</p>', text: 'Alert' },
      state: 'queued',
      nextAt: Date.now(),
      createdAt: Date.now(),
    })
  )
  const [job] = await f.claim()
  expect(job.messageId).toBe(op)
  vi.setSystemTime(Date.now() + 2000)
  await f.pump()
  await f.pump()
  expect((await f.read('status', a)).fanout.queued).toBe(30)
  expect((await f.read('status', b)).fanout.queued).toBe(30)
})

test('four pre-send pauses do not exhaust the first provider retry budget', async () => {
  const f = await fixture(1)
  const c = await f.post('approve', await f.snapshot(await f.draft()))
  await f.pump()
  const control = await f.t.run((ctx) =>
    ctx.db.insert('emailChannelControls', {
      businessId: 'test',
      class: 'all',
      paused: false,
      version: 1,
      updatedAt: Date.now(),
    })
  )
  for (let n = 0; n < 4; n++) {
    const [job] = await f.claim()
    await f.t.run((ctx) => ctx.db.patch(control, { paused: true }))
    expect(await f.recheck(job)).toEqual({ eligible: false })
    await f.t.run((ctx) => ctx.db.patch(control, { paused: false }))
    vi.setSystemTime(Date.now() + 61_000)
  }
  const [job] = await f.claim()
  expect(await f.recheck(job)).toEqual({ eligible: true })
  await f.t.mutation(anyApi.email.settle, {
    credential,
    businessId: 'test',
    messageId: job.messageId,
    attemptId: job.attemptId,
    outcome: 'retryable_failure',
    retryAfterMs: 1000,
  })
  const message = await f.t.run((ctx) => ctx.db.get(job.messageId))
  expect(message).toMatchObject({
    state: 'queued',
    nextAt: Date.now() + 60_000,
  })
  expect((await f.read('status', c)).fanout.queued).toBe(1)
})

test('scheduled poll pumps configured campaigns and a pump permission failure does not skip email dispatch', async () => {
  const f = await fixture(1)
  const c = await f.post('approve', await f.snapshot(await f.draft()))
  f.config.businesses[0].publicBaseUrl = 'https://example.test'
  vi.stubEnv('EMAIL_CONTROL_CONFIG', JSON.stringify(f.config))
  vi.stubEnv('EMAIL_DISPATCH_CREDENTIAL', credential)
  const fetcher = vi.fn().mockResolvedValue(new Response('{}'))
  vi.stubGlobal('fetch', fetcher)
  expect(await f.t.action(anyApi.emailDelivery.poll, {})).toMatchObject({
    status: 'polled',
  })
  expect((await f.read('status', c)).fanout.queued).toBe(1)
  expect(fetcher).toHaveBeenCalledTimes(1)
  f.config.clients[0].operations = ['campaign_dispatch']
  vi.stubEnv('EMAIL_CONTROL_CONFIG', JSON.stringify(f.config))
  await expect(f.t.action(anyApi.emailDelivery.poll, {})).rejects.toThrow(
    'email_worker_unavailable'
  )
  expect(fetcher).toHaveBeenCalledTimes(2)
})
