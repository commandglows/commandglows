import { anyApi } from 'convex/server'
import { internalMutation, type MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'

const ALERT_BATCH_SIZE = 20
const CHILD_BATCH_SIZE = 100
const DAY_MS = 24 * 60 * 60 * 1000

function currentEnvironment() {
  const value =
    process.env.SUITE_BRIDGE_ENVIRONMENT ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    ''
  return value === 'production' || value === 'sandbox' ? value : null
}

async function clearMessageHistory(
  ctx: MutationCtx,
  messageId: Id<'emailMessages'>,
  businessId: string
) {
  const attempts = await ctx.db
    .query('emailAttempts')
    .withIndex('message', (q) => q.eq('messageId', messageId))
    .take(CHILD_BATCH_SIZE)
  for (const attempt of attempts) await ctx.db.delete(attempt._id)

  const events = await ctx.db
    .query('emailEvents')
    .withIndex('message', (q) =>
      q.eq('businessId', businessId).eq('messageId', messageId)
    )
    .take(CHILD_BATCH_SIZE)
  for (const event of events) await ctx.db.delete(event._id)

  const attemptsRemain = await ctx.db
    .query('emailAttempts')
    .withIndex('message', (q) => q.eq('messageId', messageId))
    .first()
  const eventsRemain = await ctx.db
    .query('emailEvents')
    .withIndex('message', (q) =>
      q.eq('businessId', businessId).eq('messageId', messageId)
    )
    .first()
  return !attemptsRemain && !eventsRemain
}

/** Deletes only old, terminal email-alert details; incidents and action evidence remain. */
export const purgeExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const environment = currentEnvironment()
    const retentionDays = Number(process.env.COMMERCE_ALERT_RETENTION_DAYS)
    if (!environment || !Number.isInteger(retentionDays) || retentionDays < 1)
      return true

    const cutoff = Date.now() - retentionDays * DAY_MS
    const expired = []
    for (const status of ['delivered', 'failed'] as const) {
      const rows = await ctx.db
        .query('commerceAlertOutbox')
        .withIndex('by_terminal_email_retention', (q) =>
          q
            .eq('environment', environment)
            .eq('transportChannel', 'email')
            .eq('status', status)
            .lt('updatedAt', cutoff)
        )
        .order('asc')
        .take(ALERT_BATCH_SIZE)
      expired.push(...rows)
    }

    let deleted = 0
    for (const alert of expired.slice(0, ALERT_BATCH_SIZE)) {
      if (alert.environment !== environment || !['delivered', 'failed'].includes(alert.status)) continue
      const message = alert.emailMessageId ? await ctx.db.get(alert.emailMessageId) : null
      if (message && !['delivered', 'permanent_failure', 'cancelled'].includes(message.state))
        continue

      if (message) {
        const historyCleared = await clearMessageHistory(ctx, message._id, message.businessId)
        if (!historyCleared) {
          await ctx.scheduler.runAfter(0, anyApi.commerceAlertRetention.purgeExpired, {})
          continue
        }
        await ctx.db.delete(message._id)
      }
      await ctx.db.delete(alert._id)
      deleted += 1
    }

    if (deleted === ALERT_BATCH_SIZE && expired.length > ALERT_BATCH_SIZE)
      await ctx.scheduler.runAfter(0, anyApi.commerceAlertRetention.purgeExpired, {})
    return deleted
  },
})
