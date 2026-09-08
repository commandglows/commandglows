/** Shared outbox accounting. Every campaign message transition goes through this helper. */
export const emptyCampaignCounters = () => ({
  queued: 0,
  sending: 0,
  submitted: 0,
  delivered: 0,
  failed: 0,
  unknown: 0,
  cancelled: 0,
})
const bucket = (state: string) =>
  state === 'permanent_failure'
    ? 'failed'
    : state === 'erased'
      ? 'cancelled'
      : state
export async function patchEmailMessage(ctx: any, id: any, patch: any) {
  const message = await ctx.db.get(id)
  if (message?.campaignId && patch.state && patch.state !== message.state) {
    const campaign = await ctx.db.get(message.campaignId)
    if (campaign) {
      const counters = { ...campaign.counters }
      const previous = bucket(message.state),
        next = bucket(patch.state)
      if (previous in counters)
        counters[previous] = Math.max(0, counters[previous] - 1)
      if (next in counters) counters[next]++
      const state =
        campaign.state !== 'cancelled' &&
        campaign.expansionComplete &&
        counters.queued === 0 &&
        counters.sending === 0
          ? 'completed'
          : campaign.state
      await ctx.db.patch(campaign._id, {
        counters,
        state,
        updatedAt: Date.now(),
      })
    }
  }
  await ctx.db.patch(id, patch)
}
export async function campaignAllowsDispatch(ctx: any, message: any) {
  if (!message.campaignId) return true
  const campaign = await ctx.db.get(message.campaignId)
  const member = await ctx.db
    .query('emailMemberships')
    .withIndex('scope', (q: any) =>
      q
        .eq('businessId', message.businessId)
        .eq('email', message.email)
        .eq('audienceId', message.audienceId)
    )
    .unique()
  return Boolean(
    campaign &&
    campaign.businessId === message.businessId &&
    member?.state === 'subscribed' &&
    member.generation === message.campaignMembershipGeneration &&
    campaign.reviewCutoff !== undefined &&
    member.updatedAt <= campaign.reviewCutoff &&
    ['sending', 'completed'].includes(campaign.state)
  )
}
