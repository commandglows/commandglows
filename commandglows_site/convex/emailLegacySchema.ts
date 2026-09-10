import { defineTable } from 'convex/server'
import { v } from 'convex/values'

// Exact index definitions recovered from the September 6 deployment receipt.
// Historical document validators are unknown. Preserve the existing unvalidated
// legacy records rather than inventing field types or migrating their contents.
export const emailLegacyTables = {
  emailConsentEvents: defineTable(v.any())
    .index('by_idempotencyKey', ['idempotencyKey'])
    .index('by_emailTopic', ['emailNormalized', 'topic']),
  emailSubscriptions: defineTable(v.any())
    .index('by_emailTopic', ['emailNormalized', 'topic'])
    .index('by_syncStatus', ['providerSyncStatus']),
}
