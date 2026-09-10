import { query } from './_generated/server'
import { v, ConvexError } from 'convex/values'

// This query lives in the identity deployment, not the isolated email ledger.
export const authorize = query({
  args: { clerkId: v.string(), bridgeSecret: v.string() },
  handler: async (ctx, args) => {
    const secret = process.env.SUITE_BRIDGE_CONVEX_SECRET
    if (!secret || args.bridgeSecret !== secret)
      throw new ConvexError({ code: 'forbidden' })
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', args.clerkId))
      .unique()
    if (!user || user.role !== 'admin')
      throw new ConvexError({ code: 'forbidden' })
    return { actorId: args.clerkId }
  },
})
