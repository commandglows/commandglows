import { action } from './_generated/server'
import { v } from 'convex/values'

export const addBuyerToNewsletter = action({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    // A purchase is not marketing consent. Retain the legacy action shape so
    // stale callers cannot break checkout, but never create a subscription.
    void args
    return { status: 'skipped', reason: 'explicit_marketing_consent_required' }
  },
})
