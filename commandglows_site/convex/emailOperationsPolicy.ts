import type { QueryCtx, MutationCtx } from './_generated/server'

/** Both the claim and the final dispatch boundary consult the durable stop. */
export async function emailChannelPaused(
  ctx: QueryCtx | MutationCtx,
  businessId: string,
  kind: string
) {
  for (const value of ['all', kind]) {
    const control = await ctx.db
      .query('emailChannelControls')
      .withIndex('scope', (q) =>
        q.eq('businessId', businessId).eq('class', value)
      )
      .unique()
    if (control?.paused) return true
  }
  return false
}
