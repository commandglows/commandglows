import { defineTable } from 'convex/server'
import { v } from 'convex/values'

export const emailSupportTables = {
  emailSupportRecords: defineTable({
    actorId: v.string(),
    mailboxId: v.string(),
    kind: v.string(),
    key: v.string(),
    value: v.any(),
    updatedAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index('by_owner', ['actorId', 'mailboxId', 'kind', 'key'])
    .index('by_expiry', ['actorId', 'mailboxId', 'kind', 'expiresAt']),
}
