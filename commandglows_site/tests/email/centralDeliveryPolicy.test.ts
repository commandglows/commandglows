import { convexTest } from 'convex-test'
import { makeFunctionReference } from 'convex/server'
import schema from '../../convex/schema'
import { deliveryRoute, type EmailConfig } from '../../convex/emailConfig'
import { handleDispatch } from '../../src/lib/email/central/worker'
import {
  createCaptureTransport,
  sendPostmark,
} from '../../src/lib/email/central/transport'
const modules = import.meta.glob('../../convex/**/*.ts')
const credential = 'x'.repeat(40)
const recipient = 'test@example.test'
const ref = (name: string) => makeFunctionReference<'mutation'>(`email:${name}`)
function fixture() {
  const config: EmailConfig = {
    environment: 'sandbox',
    clients: [
      {
        id: 'worker',
        credentialEnv: 'EMAIL_TEST',
        businessIds: ['test'],
        operations: ['dispatch'],
      },
    ],
    businesses: [
      {
        id: 'test',
        brand: 'Test',
        legalFooter: 'Test',
        from: 'sender@example.test',
        transactionalStream: 'outbound',
        broadcastStream: 'news',
        audiences: [],
        activated: true,
        retentionDays: 30,
        allowedRecipients: [recipient],
        providerMode: 'Live',
        serverId: 42,
        serverTokenEnv: 'EMAIL_PROVIDER',
        publicBaseUrl: 'https://example.test',
        liveTest: {
          id: 'bounded-test',
          expiresAt: Date.now() + 60_000,
          maxAttempts: 1,
          recipients: [recipient],
        },
      },
    ],
  }
  const apply = () => {
    vi.stubEnv('EMAIL_CONTROL_CONFIG', JSON.stringify(config))
    vi.stubEnv('EMAIL_TEST', credential)
  }
  apply()
  const t = convexTest(schema, modules)
  const route = () => deliveryRoute(config, config.businesses[0])
  const claim = () =>
    t.mutation(ref('claim'), {
      credential,
      businessId: 'test',
      expectedRoute: route(),
    })
  const seed = (kind = 'operator') =>
    t.run((ctx) =>
      ctx.db.insert('emailMessages', {
        businessId: 'test',
        email: recipient,
        kind,
        rendered: { subject: 'Test', html: '<p>Test</p>', text: 'Test' },
        state: 'queued',
        createdAt: Date.now(),
        nextAt: Date.now(),
      })
    )
  const recheck = (job: any) =>
    t.mutation(ref('recheckDispatch'), {
      credential,
      businessId: 'test',
      messageId: job.messageId,
      attemptId: job.attemptId,
      expectedRoute: job.route,
    })
  return { config, apply, t, route, claim, seed, recheck }
}
afterEach(() => vi.unstubAllEnvs())
test('durable total attempt quota is atomic across concurrent dispatches and cannot be replenished', async () => {
  const f = fixture()
  await f.seed()
  await f.seed()
  const [a] = await f.claim()
  const [b] = await f.claim()
  const result = await Promise.all([f.recheck(a), f.recheck(b)])
  expect(result.filter((x) => x.eligible)).toHaveLength(1)
  expect((await f.recheck(a)).eligible).toBe(false)
  f.config.businesses[0].liveTest!.maxAttempts = 5
  f.apply()
  await f.seed()
  const [c] = await f.claim()
  expect((await f.recheck(c)).eligible).toBe(false)
  const quotas = await f.t.run((ctx) =>
    ctx.db.query('emailTestQuotas').collect()
  )
  expect(quotas).toMatchObject([{ attempts: 1, maxAttempts: 1 }])
})
test.each(['expiration', 'recipient', 'route', 'suppression'] as const)(
  'rechecks %s before reserving any live attempt',
  async (change) => {
    const f = fixture()
    await f.seed()
    const [job] = await f.claim()
    if (change === 'expiration')
      f.config.businesses[0].liveTest!.expiresAt = Date.now() - 1
    if (change === 'recipient') f.config.businesses[0].allowedRecipients = []
    if (change === 'route') f.config.businesses[0].serverId = 43
    if (change === 'suppression')
      await f.t.run((ctx) =>
        ctx.db.insert('emailSuppressions', {
          businessId: 'test',
          email: recipient,
          reason: 'test',
          at: Date.now(),
        })
      )
    f.apply()
    expect(await f.recheck(job)).toEqual({ eligible: false })
    expect(
      await f.t.run((ctx) => ctx.db.query('emailTestQuotas').collect())
    ).toEqual([])
  }
)
test('live test rejects non-operator messages and route mismatches', async () => {
  const f = fixture()
  await f.seed('broadcast')
  await f.seed('confirmation')
  await f.seed('transactional')
  expect(await f.claim()).toEqual([])
  await expect(
    f.t.mutation(ref('claim'), {
      credential,
      businessId: 'test',
      expectedRoute: 'stale',
    })
  ).rejects.toThrow('delivery_route_changed')
})
test('failed live profile makes no provider call; explicit Sandbox cannot use Live server', async () => {
  const f = fixture()
  const fetcher = vi.fn()
  const mutation = vi.fn()
  f.config.businesses[0].liveTest = undefined
  f.apply()
  const request = () =>
    new Request('https://example.test/dispatch', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${credential}`,
      },
      body: JSON.stringify({ business_id: 'test' }),
    })
  const env = () => ({
    EMAIL_CONTROL_CONFIG: JSON.stringify(f.config),
    EMAIL_TEST: credential,
    EMAIL_PROVIDER: 'synthetic',
    EMAIL_TOKEN_SIGNING_KEY: 's'.repeat(40),
  })
  expect(
    (await handleDispatch(request(), env(), mutation, fetcher)).status
  ).toBe(503)
  expect(fetcher).not.toHaveBeenCalled()
  expect(mutation).not.toHaveBeenCalled()
  f.config.businesses[0].providerMode = 'Sandbox'
  fetcher.mockResolvedValue(
    new Response(JSON.stringify({ ID: 42, DeliveryType: 'Live' }))
  )
  expect(
    (await handleDispatch(request(), env(), mutation, fetcher)).status
  ).toBe(503)
  expect(mutation).not.toHaveBeenCalled()
})
test('capture capabilities and live transport guard distinguish acceptance from delivery', async () => {
  const message = {
    messageId: 'm',
    businessId: 'test',
    to: recipient,
    from: 'sender@example.test',
    streamId: 'outbound',
    streamClass: 'transactional' as const,
    subject: 'Test',
    html: '<p>Test</p>',
    text: 'Test',
  }
  const capture = vi.fn()
  const adapter = createCaptureTransport(capture)
  expect(adapter.capabilities.deliversToInbox).toBe(false)
  expect(await adapter.send(message)).toMatchObject({
    reasonCode: 'captured_locally',
  })
  expect(capture).toHaveBeenCalledWith(message)
  const fetcher = vi.fn()
  expect(
    await sendPostmark(
      message,
      {
        serverToken: 'synthetic',
        environment: 'sandbox',
        providerMode: 'Live',
        allowProduction: false,
      },
      fetcher
    )
  ).toMatchObject({ status: 'permanent_failure' })
  expect(fetcher).not.toHaveBeenCalled()
})

test('Preview Live dispatch reserves durable quota before one POST and rejects the next send', async () => {
  const f = fixture()
  await f.seed()
  await f.seed()
  const env = {
    EMAIL_CONTROL_CONFIG: JSON.stringify(f.config),
    EMAIL_TEST: credential,
    EMAIL_PROVIDER: 'synthetic',
    EMAIL_TOKEN_SIGNING_KEY: 's'.repeat(40),
    VERCEL_ENV: 'preview',
  }
  const fetcher = vi.fn(async (_url: any, init?: any) => {
    if (init?.method === 'POST') {
      const quotas = await f.t.run((ctx) =>
        ctx.db.query('emailTestQuotas').collect()
      )
      expect(quotas).toMatchObject([{ attempts: 1 }])
      return new Response(
        JSON.stringify({ ErrorCode: 0, MessageID: 'live-test-accepted' })
      )
    }
    if (String(_url).endsWith('/server'))
      return new Response(JSON.stringify({ ID: 42, DeliveryType: 'Live' }))
    return new Response(
      JSON.stringify({
        MessageStreams: [
          { ID: 'outbound', ServerID: 42, MessageStreamType: 'Transactional' },
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
  })
  const mutate = (name: string, args: any) =>
    f.t.mutation(makeFunctionReference<'mutation'>(name), args)
  const request = () =>
    new Request('https://example.test/dispatch', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${credential}`,
      },
      body: JSON.stringify({ business_id: 'test' }),
    })
  expect((await handleDispatch(request(), env, mutate, fetcher)).status).toBe(
    200
  )
  expect((await handleDispatch(request(), env, mutate, fetcher)).status).toBe(
    200
  )
  expect(
    fetcher.mock.calls.filter(([, init]) => init?.method === 'POST')
  ).toHaveLength(1)
})
