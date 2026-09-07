import { convexTest } from 'convex-test'
import { anyApi } from 'convex/server'
import schema from '../../convex/schema'
import { deliveryRoute, type EmailConfig } from '../../convex/emailConfig'
const modules = import.meta.glob('../../convex/**/*.ts')
const credential = 't'.repeat(40)
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
