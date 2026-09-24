import { internalMutation } from './_generated/server'

/** Reset network trial throttles in this explicitly selected development deployment. */
export const resetAllDevelopmentNetworkTrialLimits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const windows = await ctx.db.query('productTrialRiskWindows').collect()

    for (const window of windows) {
      await ctx.db.delete(window._id)
    }

    return { deletedNetworkLimitWindows: windows.length }
  },
})
