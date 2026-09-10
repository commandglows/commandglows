import { convexTest } from 'convex-test'
import { anyApi } from 'convex/server'
import schema from '../../convex/schema'
import { deliveryRoute, type EmailConfig } from '../../convex/emailConfig'
const modules = import.meta.glob('../../convex/**/*.ts')
const credential = 'x'.repeat(40)
async function fixture() {
  vi.stubEnv('SUITE_BRIDGE_ENVIRONMENT', 'sandbox')
  vi.stubEnv('COMMERCE_ALERT_CHANNEL', 'email')
  vi.stubEnv('EMAIL_TEST', credential)
  vi.stubEnv(
    'COMMERCE_ALERT_EMAIL_CONFIG',
    JSON.stringify({
      businessId: 'test',
      recipient: 'operator@example.test',
      locale: 'fr',
    })
  )
  const config: EmailConfig = {
    environment: 'sandbox',
    clients: [
      {
        id: 'test',
        credentialEnv: 'EMAIL_TEST',
        businessIds: ['test'],
        operations: ['dispatch', 'webhook'],
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
        allowedRecipients: ['operator@example.test'],
      },
    ],
  }
  vi.stubEnv('EMAIL_CONTROL_CONFIG', JSON.stringify(config))
  const t = convexTest(schema, modules)
  const incidentId = await t.run((ctx) =>
    ctx.db.insert('commerceIncidents', {
      environment: 'sandbox',
      providerEventId: 'test-event',
      productId: 'test',
      status: 'pending_review',
      attempts: 1,
      queueState: 'open',
      active: true,
      dueAt: Date.now() + 60_000,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  )
  const alertId = await t.run((ctx) =>
    ctx.db.insert('commerceAlertOutbox', {
      incidentId,
      environment: 'sandbox',
      deduplicationKey: `${incidentId}:open:1`,
      phase: 'open',
      status: 'pending',
      attempts: 0,
      nextAttemptAt: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  )
  const alert = () => t.run((ctx) => ctx.db.get(alertId))
  const enqueue = () => t.mutation(anyApi.commerceEmail.enqueue, { alertId })
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
  return { t, incidentId, alertId, alert, enqueue, claim, recheck }
}
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})
test('a prior delivered cycle does not block retrying a later definitive failure', async () => {
  const f = await fixture()
  await f.enqueue()
  const old = await f.alert()
  vi.stubEnv('SUITE_BRIDGE_CONVEX_SECRET', 'synthetic')
  await f.t.run(async ctx => {
    await ctx.db.patch(old!.emailMessageId!, { state: 'delivered' })
    await ctx.db.patch(f.alertId, { status: 'delivered' })
    await ctx.db.patch(f.incidentId, { version: 2 })
    const user = await ctx.db.insert('globalUsers', { globalUserId: 'gu_retry', createdAt: 1, updatedAt: 1 })
    await ctx.db.insert('users', { clerkId: 'retry', globalUserId: user, email: 'admin@example.test', role: 'admin' })
    const failed = await ctx.db.insert('emailMessages', { businessId: 'test', email: 'operator@example.test', kind: 'operator',
      rendered: {}, state: 'permanent_failure', createdAt: 2, nextAt: 2 })
    await ctx.db.insert('commerceAlertOutbox', { incidentId: f.incidentId, environment: 'sandbox',
      deduplicationKey: `${f.incidentId}:overdue:2`, phase: 'overdue', incidentVersion: 2, emailMessageId: failed,
      transportChannel: 'email', status: 'failed', attempts: 0, nextAttemptAt: 2, createdAt: 2, updatedAt: 2 })
  })
  expect(await f.t.mutation(anyApi.commerceOperations.retryAlert, { actorGlobalUserId: 'gu_retry', bridgeSecret: 'synthetic',
    incidentId: f.incidentId, expectedVersion: 2, reason: 'Retry current failed cycle' })).toMatchObject({ status: 'queued', version: 3 })
})
test('concurrent enqueue links one immutable operator message; enqueue and submission are not delivery', async () => {
  const f = await fixture()
  await Promise.all([f.enqueue(), f.enqueue()])
  expect(
    await f.t.run((ctx) => ctx.db.query('emailMessages').collect())
  ).toHaveLength(1)
  expect(await f.alert()).toMatchObject({
    status: 'pending',
    emailState: 'queued',
    transportChannel: 'email',
    attempts: 0,
  })
  const [j] = await f.claim()
  expect(await f.recheck(j)).toEqual({ eligible: true })
  await f.t.mutation(anyApi.email.settle, {
    credential,
    businessId: 'test',
    messageId: j.messageId,
    attemptId: j.attemptId,
    outcome: 'submitted',
    providerMessageId: 'provider-test',
  })
  expect(await f.alert()).toMatchObject({
    status: 'pending',
    emailState: 'submitted',
  })
  const base = {
    credential,
    businessId: 'test',
    providerMessageId: 'provider-test',
    email: 'operator@example.test',
    streamId: 'outbound',
  }
  await f.t.mutation(anyApi.email.webhook, {
    ...base,
    eventId: 'delivered',
    type: 'delivery',
  })
  expect(await f.alert()).toMatchObject({
    status: 'delivered',
    emailState: 'delivered',
  })
  await f.t.mutation(anyApi.email.webhook, {
    ...base,
    eventId: 'late-bounce',
    type: 'hard_bounce',
  })
  expect(await f.alert()).toMatchObject({
    status: 'failed',
    emailState: 'hard_bounce',
  })
  await f.t.mutation(anyApi.email.webhook, {
    ...base,
    eventId: 'delivered-again',
    type: 'delivery',
  })
  expect(await f.alert()).toMatchObject({
    status: 'failed',
    emailState: 'hard_bounce',
  })
})
test('unknown linked transport never creates another email or switches to webhook', async () => {
  const f = await fixture()
  await f.enqueue()
  const a = await f.alert()
  await f.t.run((ctx) => ctx.db.patch(a!.emailMessageId!, { state: 'unknown' }))
  vi.stubEnv('COMMERCE_ALERT_CHANNEL', 'webhook')
  const fetcher = vi.fn()
  vi.stubGlobal('fetch', fetcher)
  await f.t.action(anyApi.commerceAlerts.deliver, { alertId: f.alertId })
  await f.enqueue()
  expect(await f.alert()).toMatchObject({
    status: 'pending',
    emailState: 'unknown',
  })
  expect(
    await f.t.run((ctx) => ctx.db.query('emailMessages').collect())
  ).toHaveLength(1)
  expect(fetcher).not.toHaveBeenCalled()
  vi.stubEnv('SUITE_BRIDGE_CONVEX_SECRET', 'synthetic')
  await f.t.run(async (ctx) => {
    const id = await ctx.db.insert('globalUsers', {
      globalUserId: 'gu_admin',
      createdAt: 1,
      updatedAt: 1,
    })
    await ctx.db.insert('users', {
      clerkId: 'admin',
      globalUserId: id,
      email: 'admin@example.test',
      role: 'admin',
    })
    await ctx.db.insert('identityAccounts', {
      globalUserId: id,
      provider: 'clerk',
      providerAccountId: 'admin',
      environment: 'sandbox',
      createdAt: 1,
      updatedAt: 1,
    })
  })
  await expect(
    f.t.mutation(anyApi.commerceOperations.retryAlert, {
      clerkId: 'admin',
      bridgeSecret: 'synthetic',
      incidentId: f.incidentId,
      expectedVersion: 1,
      reason: 'Inspect unknown',
    })
  ).rejects.toThrow('email_alert_retry_requires_resolution')
  expect((await f.t.run((ctx) => ctx.db.get(f.incidentId)))!.version).toBe(1)
})
test.each(['suppression', 'stale'] as const)(
  '%s blocks an operator send and synchronizes failure',
  async (mode) => {
    const f = await fixture()
    await f.enqueue()
    const [j] = await f.claim()
    if (mode === 'suppression')
      await f.t.run((ctx) =>
        ctx.db.insert('emailSuppressions', {
          businessId: 'test',
          email: 'operator@example.test',
          reason: 'test',
          at: Date.now(),
        })
      )
    else
      await f.t.run((ctx) =>
        ctx.db.patch(f.incidentId, {
          version: 2,
          queueState: 'resolved',
          active: false,
        })
      )
    expect(await f.recheck(j)).toEqual({ eligible: false })
    await f.enqueue()
    expect(await f.alert()).toMatchObject({
      status: 'failed',
      emailState: 'cancelled',
    })
  }
)
test('HTTP webhook remains default and a claimed webhook never switches to email', async () => {
  const f = await fixture()
  vi.stubEnv('COMMERCE_ALERT_CHANNEL', '')
  vi.stubEnv('COMMERCE_ALERT_WEBHOOK_URL', 'https://example.test/hook')
  const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
  vi.stubGlobal('fetch', fetcher)
  await f.t.action(anyApi.commerceAlerts.deliver, { alertId: f.alertId })
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(await f.alert()).toMatchObject({
    status: 'delivered',
    transportChannel: 'webhook',
  })
  vi.stubEnv('COMMERCE_ALERT_CHANNEL', 'email')
  await f.t.action(anyApi.commerceAlerts.deliver, { alertId: f.alertId })
  expect(
    await f.t.run((ctx) => ctx.db.query('emailMessages').collect())
  ).toHaveLength(0)
  expect(fetcher).toHaveBeenCalledTimes(1)
})

test('a current closure notification remains eligible and an invalid email environment never falls back', async () => {
  const f = await fixture()
  await f.t.run(async (ctx) => {
    await ctx.db.patch(f.incidentId, {
      active: false,
      queueState: 'resolved',
      version: 2,
    })
    await ctx.db.patch(f.alertId, {
      phase: 'resolved',
      deduplicationKey: `${f.incidentId}:resolved:2`,
    })
  })
  await f.enqueue()
  const [job] = await f.claim()
  expect(await f.recheck(job)).toEqual({ eligible: true })
  const g = await fixture()
  vi.stubEnv(
    'EMAIL_CONTROL_CONFIG',
    JSON.stringify({ environment: 'production', clients: [], businesses: [] })
  )
  vi.stubEnv(
    'COMMERCE_ALERT_WEBHOOK_URL',
    'https://example.test/never-fallback'
  )
  const fetcher = vi.fn()
  vi.stubGlobal('fetch', fetcher)
  await g.t.action(anyApi.commerceAlerts.deliver, { alertId: g.alertId })
  expect(await g.alert()).toMatchObject({
    status: 'pending',
    transportChannel: 'email',
    lastError: 'email_channel_not_configured',
  })
  expect(
    await g.t.run((ctx) => ctx.db.query('emailMessages').collect())
  ).toHaveLength(0)
  expect(fetcher).not.toHaveBeenCalled()
})
