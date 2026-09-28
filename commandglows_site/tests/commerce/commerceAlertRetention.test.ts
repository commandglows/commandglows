import { convexTest } from 'convex-test'
import { anyApi } from 'convex/server'
import schema from '../../convex/schema'

const modules = import.meta.glob('../../convex/**/*.ts')
const DAY = 24 * 60 * 60 * 1000

beforeEach(() => {
  vi.stubEnv('SUITE_BRIDGE_ENVIRONMENT', 'production')
  vi.stubEnv('COMMERCE_ALERT_RETENTION_DAYS', '30')
})
afterEach(() => vi.unstubAllEnvs())

async function fixture() {
  const t = convexTest(schema, modules)
  const incidentId = await t.run((ctx) =>
    ctx.db.insert('commerceIncidents', {
      environment: 'production', providerEventId: 'provider-event', productId: 'commandglows',
      status: 'needs_review', attempts: 1, queueState: 'resolved', active: false,
      dueAt: 1, version: 1, createdAt: 1, updatedAt: 1,
    })
  )
  const actionId = await t.run((ctx) =>
    ctx.db.insert('commerceIncidentActions', {
      incidentId, operatorId: 'operator', action: 'resolved', reason: 'handled', version: 1, createdAt: 1,
    })
  )
  return { t, incidentId, actionId }
}

async function addAlert(
  t: Awaited<ReturnType<typeof fixture>>['t'],
  incidentId: Awaited<ReturnType<typeof fixture>>['incidentId'],
  options: { status?: 'delivered' | 'failed' | 'pending'; channel?: 'email' | 'webhook'; ageDays?: number; messageState?: string } = {}
) {
  const now = Date.now()
  return t.run(async (ctx) => {
    const messageId = options.messageState
      ? await ctx.db.insert('emailMessages', {
          businessId: 'operator', email: 'alert@example.test', kind: 'operator', rendered: { subject: 'alert' },
          state: options.messageState, createdAt: now - 40 * DAY, nextAt: now - 40 * DAY,
        })
      : undefined
    if (messageId) {
      await ctx.db.insert('emailAttempts', { businessId: 'operator', messageId, state: 'submitted', at: now - 40 * DAY })
      await ctx.db.insert('emailEvents', { businessId: 'operator', eventId: `event-${messageId}`, type: 'delivery', messageId, at: now - 40 * DAY })
    }
    const alertId = await ctx.db.insert('commerceAlertOutbox', {
      incidentId, environment: 'production', deduplicationKey: `alert-${now}-${Math.random()}`,
      phase: 'resolved', status: options.status ?? 'delivered', emailMessageId: messageId,
      emailState: options.messageState, transportChannel: options.channel ?? 'email', attempts: 1,
      nextAttemptAt: now, createdAt: now - 40 * DAY,
      updatedAt: now - (options.ageDays ?? 40) * DAY,
    })
    return { alertId, messageId }
  })
}

test('purges old terminal alert email detail and history while preserving incidents and unrelated mail', async () => {
  const { t, incidentId, actionId } = await fixture()
  const expired = await addAlert(t, incidentId, { messageState: 'delivered' })
  const recent = await addAlert(t, incidentId, { ageDays: 2, messageState: 'delivered' })
  const pending = await addAlert(t, incidentId, { status: 'pending', messageState: 'unknown' })
  const webhook = await addAlert(t, incidentId, { channel: 'webhook' })

  await t.mutation(anyApi.commerceAlertRetention.purgeExpired, {})

  await t.run(async (ctx) => {
    expect(await ctx.db.get(expired.alertId)).toBeNull()
    expect(await ctx.db.get(expired.messageId!)).toBeNull()
    expect(await ctx.db.query('emailAttempts').withIndex('message', (q) => q.eq('messageId', expired.messageId!)).collect()).toEqual([])
    expect(await ctx.db.query('emailEvents').withIndex('message', (q) => q.eq('businessId', 'operator').eq('messageId', expired.messageId!)).collect()).toEqual([])
    expect(await ctx.db.get(recent.alertId)).not.toBeNull()
    expect(await ctx.db.get(pending.alertId)).not.toBeNull()
    expect(await ctx.db.get(webhook.alertId)).not.toBeNull()
    expect(await ctx.db.get(incidentId)).not.toBeNull()
    expect(await ctx.db.get(actionId)).not.toBeNull()
    expect(await ctx.db.query('emailMessages').collect()).toHaveLength(2)
  })
})

test('does not remove terminal alert metadata while the linked email state is uncertain', async () => {
  const { t, incidentId } = await fixture()
  const uncertain = await addAlert(t, incidentId, { status: 'failed', messageState: 'unknown' })

  await t.mutation(anyApi.commerceAlertRetention.purgeExpired, {})

  await t.run(async (ctx) => {
    expect(await ctx.db.get(uncertain.alertId)).not.toBeNull()
    expect(await ctx.db.get(uncertain.messageId!)).not.toBeNull()
  })
})
