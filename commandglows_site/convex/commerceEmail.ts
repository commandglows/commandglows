import { v } from 'convex/values'
import { internalMutation, type MutationCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { commerceEnvironment } from './commerceEventContract'
import { commerceOperatorConfig } from './emailConfig'
import { renderEmail } from '../src/lib/email/central/templates'
const currentEnvironment = () =>
  commerceEnvironment(
    process.env.SUITE_BRIDGE_ENVIRONMENT ||
      process.env.VERCEL_ENV ||
      process.env.NODE_ENV ||
      ''
  )

export async function commerceEmailCurrent(
  ctx: MutationCtx,
  messageId: Id<'emailMessages'>
) {
  const alert = await ctx.db
    .query('commerceAlertOutbox')
    .withIndex('by_email_message', (q) => q.eq('emailMessageId', messageId))
    .unique()
  if (!alert) return true
  const incident = await ctx.db.get(alert.incidentId)
  return Boolean(
    incident &&
    alert.environment === currentEnvironment() &&
    incident.environment === alert.environment &&
    incident.version === alert.incidentVersion &&
    (incident.active ||
      (alert.phase === 'resolved' && incident.queueState === 'resolved'))
  )
}

/** Linked messages are observed, never recreated, even after transport configuration changes. */
export async function syncCommerceEmail(
  ctx: MutationCtx,
  alert: Doc<'commerceAlertOutbox'>
) {
  if (!alert.emailMessageId) return
  const message = await ctx.db.get(alert.emailMessageId)
  const now = Date.now()
  const failedEvent = message
    ? await ctx.db
        .query('emailEvents')
        .withIndex('message', (q) =>
          q.eq('businessId', message.businessId).eq('messageId', message._id)
        )
        .filter((q) =>
          q.or(
            q.eq(q.field('type'), 'hard_bounce'),
            q.eq(q.field('type'), 'complaint')
          )
        )
        .first()
    : null
  const failed =
    !message ||
    Boolean(failedEvent) ||
    ['permanent_failure', 'cancelled'].includes(message.state)
  const delivered = !failed && message?.state === 'delivered'
  await ctx.db.patch(alert._id, {
    status: delivered ? 'delivered' : failed ? 'failed' : 'pending',
    emailState: failedEvent?.type ?? message?.state ?? 'missing',
    lastError: failed
      ? (failedEvent?.type ?? message?.state ?? 'email_message_missing')
      : undefined,
    ...(delivered ? { deliveredAt: alert.deliveredAt ?? now } : {}),
    nextAttemptAt: now + 60_000,
    leaseUntil: undefined,
    updatedAt: now,
  })
}

export const enqueue = internalMutation({
  args: { alertId: v.id('commerceAlertOutbox') },
  handler: async (ctx, { alertId }) => {
    const alert = await ctx.db.get(alertId)
    if (!alert || alert.environment !== currentEnvironment()) return true
    if (alert.emailMessageId) {
      await syncCommerceEmail(ctx, alert)
      return true
    }
    if (alert.transportChannel === 'webhook') return false
    if (
      process.env.COMMERCE_ALERT_CHANNEL !== 'email' &&
      alert.transportChannel !== 'email'
    )
      return false
    if (['delivered', 'failed'].includes(alert.status)) return true
    // Legacy webhook attempts are not silently converted into a second transport.
    if (alert.attempts > 0 && !alert.transportChannel) return false
    const now = Date.now()
    await ctx.db.patch(alertId, { transportChannel: 'email' })
    let routing: ReturnType<typeof commerceOperatorConfig>
    try {
      routing = commerceOperatorConfig(alert.environment)
    } catch {
      await ctx.db.patch(alertId, {
        lastError: 'email_channel_not_configured',
        nextAttemptAt: now + 60_000,
        updatedAt: now,
      })
      return true
    }
    const incident = await ctx.db.get(alert.incidentId)
    const version = Number(alert.deduplicationKey.split(':').at(-1))
    if (
      !incident ||
      incident.environment !== alert.environment ||
      incident.version !== version ||
      (!incident.active &&
        !(alert.phase === 'resolved' && incident.queueState === 'resolved'))
    ) {
      await ctx.db.patch(alertId, {
        status: 'failed',
        lastError: 'obsolete_incident_alert',
        emailState: 'cancelled',
        updatedAt: now,
      })
      return true
    }
    const { business, recipient, locale } = routing
    // Only these operational facts enter the immutable email. No buyer or provider payload.
    const rendered = renderEmail({
      templateKey: 'commerce_incident',
      locale,
      brand: business.brand,
      legalFooter: business.legalFooter,
      subject:
        locale === 'fr'
          ? 'Alerte de suivi commerce'
          : 'Commerce follow-up alert',
      paragraphs: [
        `Incident: ${incident._id}`,
        `Environment: ${alert.environment}`,
        `Phase: ${alert.phase}`,
        `State: ${incident.queueState}`,
        `Attempts: ${incident.attempts}`,
        `Assigned: ${Boolean(incident.ownerId)}`,
        `Due: ${new Date(incident.dueAt).toISOString()}`,
      ],
    })
    const emailMessageId = await ctx.db.insert('emailMessages', {
      businessId: business.id,
      email: recipient,
      kind: 'operator',
      rendered,
      state: 'queued',
      createdAt: now,
      nextAt: now,
    })
    await ctx.db.patch(alertId, {
      emailMessageId,
      incidentVersion: version,
      emailState: 'queued',
      status: 'pending',
      lastError: undefined,
      leaseUntil: undefined,
      nextAttemptAt: now + 60_000,
      updatedAt: now,
    })
    return true
  },
})
