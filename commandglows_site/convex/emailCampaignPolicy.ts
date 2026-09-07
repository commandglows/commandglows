import type { EmailConfig } from './emailConfig'
import type { MutationCtx } from './_generated/server'
import type { Doc } from './_generated/dataModel'
/** Only unsent work is gated here; a provider submission cannot be recalled. */
export async function campaignDispatchState(
  ctx: MutationCtx,
  message: Doc<'emailMessages'>,
  business: EmailConfig['businesses'][number]
): Promise<'eligible' | 'paused' | 'cancelled'> {
  if (!message.campaignId) return 'eligible'
  const campaign = await ctx.db.get(message.campaignId)
  if (
    !campaign ||
    campaign.businessId !== message.businessId ||
    campaign.state === 'cancelled' ||
    campaign.approvedVersionId !== message.campaignVersionId ||
    campaign.versionId !== message.campaignVersionId
  )
    return 'cancelled'
  if (!message.campaignRecipientId) return 'cancelled'
  const snapshot = await ctx.db.get(message.campaignRecipientId)
  const version =
    message.campaignVersionId && (await ctx.db.get(message.campaignVersionId))
  const member = snapshot && (await ctx.db.get(snapshot.membershipId))
  if (
    !snapshot ||
    snapshot.messageId !== message._id ||
    !member ||
    member.businessId !== message.businessId ||
    member.generation !== snapshot.generation ||
    member.state !== 'subscribed' ||
    !version
  )
    return 'cancelled'
  if (
    !business.audiences.some(
      (a) => a.id === version.audienceId && a.purpose === version.purpose
    ) ||
    member.purpose !== version.purpose
  )
    return 'cancelled'
  if (campaign.state === 'paused' || version.scheduledAt > Date.now())
    return 'paused'
  return ['scheduled', 'running', 'fanout_complete'].includes(campaign.state)
    ? 'eligible'
    : 'cancelled'
}
