import { internalMutation } from './_generated/server'

/** Reset network trial throttles in this explicitly selected development deployment. */
export const resetAllDevelopmentNetworkTrialLimits = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (process.env.SUITE_BRIDGE_ENVIRONMENT !== 'development') {
      throw new Error('trial_reset_requires_development_environment')
    }
    const windows = (await ctx.db.query('productTrialRiskWindows').collect())
      .filter((window) => window.environment === 'development')

    for (const window of windows) {
      await ctx.db.delete(window._id)
    }

    return { deletedNetworkLimitWindows: windows.length }
  },
})
