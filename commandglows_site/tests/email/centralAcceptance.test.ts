import { convexTest } from 'convex-test'
import { anyApi } from 'convex/server'
import schema from '../../convex/schema'
import { deliveryRoute, type EmailConfig } from '../../convex/emailConfig'
const modules = import.meta.glob('../../convex/**/*.ts')
const credential = 't'.repeat(40)
const productionDispatchCredential = 'd'.repeat(40)
function fixture() {
  const config = {
    environment: 'sandbox',
    clients: [
      {
        id: 'test',
        credentialEnv: 'EMAIL_TEST',
        businessIds: ['test'],
        operations: ['operator_test'],
      },
    ],
    businesses: [
      {
        id: 'test',
        brand: 'Test',
        from: 'sender@example.test',
        legalFooter: 'Technical test',
        transactionalStream: 'outbound',
        broadcastStream: 'broadcast',
        audiences: [],
        activated: true,
        retentionDays: 7,
        providerMode: 'Live',
        allowedRecipients: ['recipient@example.test'],
        liveTest: {
          id: 'acceptance-test',
          expiresAt: Date.now() + 60000,
          maxAttempts: 1,
          recipients: ['recipient@example.test'],
        },
      },
    ],
  }
  const apply = () => {
    vi.stubEnv('EMAIL_TEST', credential)
    vi.stubEnv('EMAIL_CONTROL_CONFIG', JSON.stringify(config))
  }
  apply()
  const t = convexTest(schema, modules)
  const enqueue = (businessId = 'test') =>
    t.mutation(anyApi.emailAcceptance.enqueue, { credential, businessId })
  return { t, config, apply, enqueue }
}
afterEach(() => vi.unstubAllEnvs())
test('acceptance route cannot change before its first claim or on a retried command', async () => {
  const f = fixture()
  await f.enqueue()
  f.config.businesses[0].from = 'changed@example.test'
  f.config.clients[0].operations.push('dispatch')
  f.apply()
  await expect(f.enqueue()).rejects.toThrow('idempotency_conflict')
  const config = f.config as EmailConfig
  expect(
    await f.t.mutation(anyApi.email.claim, {
      credential,
      businessId: 'test',
      expectedRoute: deliveryRoute(config, config.businesses[0]),
    })
  ).toEqual([])
})
test('acceptance retries return one operator job without commerce or consent effects', async () => {
  const f = fixture()
  const first = await f.enqueue()
  expect(await f.enqueue()).toEqual(first)
  const jobs = await f.t.run((ctx) => ctx.db.query('emailMessages').collect())
  expect(jobs).toHaveLength(1)
  expect(jobs[0]).toMatchObject({
    kind: 'operator',
    email: 'recipient@example.test',
    state: 'queued',
  })
  for (const table of [
    'commerceIncidents',
    'emailMemberships',
    'emailConsents',
  ] as const)
    expect(await f.t.run((ctx) => ctx.db.query(table).collect())).toEqual([])
})
test('acceptance rejects cross-business access and absent permission', async () => {
  const f = fixture()
  await expect(f.enqueue('other')).rejects.toThrow('forbidden')
  f.config.clients[0].operations = ['dispatch']
  f.apply()
  await expect(f.enqueue()).rejects.toThrow('forbidden')
})
test('acceptance requires exactly one authorized unexpired recipient and attempt', async () => {
  const f = fixture(),
    business = f.config.businesses[0]
  business.liveTest.maxAttempts = 2
  f.apply()
  await expect(f.enqueue()).rejects.toThrow('acceptance_profile_required')
  business.liveTest.maxAttempts = 1
  business.liveTest.expiresAt = 1
  f.apply()
  await expect(f.enqueue()).rejects.toThrow('acceptance_profile_required')
  business.liveTest.expiresAt = Date.now() + 60000
  business.allowedRecipients = []
  f.apply()
  await expect(f.enqueue()).rejects.toThrow('acceptance_profile_required')
})

test('production acceptance is operator-only and reserves exactly one provider attempt', async () => {
  const config: EmailConfig = {
    environment: 'production',
    clients: [
      { id: 'operator-test', credentialEnv: 'EMAIL_TEST', businessIds: ['commandglows'], operations: ['operator_test'] },
      { id: 'worker', credentialEnv: 'EMAIL_TEST_DISPATCH', businessIds: ['commandglows'], operations: ['dispatch'] },
    ],
    businesses: [
      {
        id: 'commandglows', brand: 'CommandGlows', from: 'dev@commandglows.com',
        legalFooter: 'Operational notification', publicBaseUrl: 'https://commandglows.com',
        delivery: { provider: 'postmark', mode: 'live', channels: { transactional: 'outbound', broadcast: 'broadcast' }, options: { serverId: 20723143, serverTokenEnv: 'EMAIL_COMMANDGLOWS_POSTMARK' } },
        audiences: [], activated: true, retentionDays: 30,
        allowedRecipients: ['alerte@commandglows.com'],
        liveTest: { id: 'prod-alert-acceptance-20260928', expiresAt: Date.now() + 60_000, maxAttempts: 1, recipients: ['alerte@commandglows.com'] },
      },
    ],
  }
  vi.stubEnv('SUITE_BRIDGE_ENVIRONMENT', 'production')
  vi.stubEnv('EMAIL_ALLOW_PRODUCTION_SEND', 'true')
  vi.stubEnv('EMAIL_TEST', credential)
  vi.stubEnv('EMAIL_TEST_DISPATCH', productionDispatchCredential)
  vi.stubEnv('EMAIL_CONTROL_CONFIG', JSON.stringify(config))
  const t = convexTest(schema, modules)
  const first = await t.mutation(anyApi.emailAcceptance.enqueue, { credential, businessId: 'commandglows' })
  expect(await t.mutation(anyApi.emailAcceptance.enqueue, { credential, businessId: 'commandglows' })).toEqual(first)
  const message = (await t.run((ctx) => ctx.db.query('emailMessages').collect()))[0]
  expect(message).toMatchObject({ email: 'alerte@commandglows.com', kind: 'operator', operatorTestProfileId: 'prod-alert-acceptance-20260928' })
  const dispatch = {
    credential: productionDispatchCredential,
    businessId: 'commandglows',
    expectedRoute: deliveryRoute(config, config.businesses[0]),
  }
  const claimed = await t.mutation(anyApi.email.claim, dispatch)
  expect(claimed).toHaveLength(1)
  const job = claimed[0] as { messageId: any; attemptId: any; route: string }
  const recheck = {
    credential: productionDispatchCredential,
    businessId: 'commandglows',
    messageId: job.messageId,
    attemptId: job.attemptId,
    expectedRoute: job.route,
  }
  expect(await t.mutation(anyApi.email.recheckDispatch, recheck)).toEqual({ eligible: true })
  expect(await t.mutation(anyApi.email.recheckDispatch, recheck)).toEqual({ eligible: false })
  expect(await t.mutation(anyApi.email.claim, dispatch)).toHaveLength(0)
  const quotas = await t.run((ctx) => ctx.db.query('emailTestQuotas').collect())
  expect(quotas).toMatchObject([
    { businessId: 'commandglows', profileId: 'prod-alert-acceptance-20260928', attempts: 1, maxAttempts: 1 },
  ])
})
