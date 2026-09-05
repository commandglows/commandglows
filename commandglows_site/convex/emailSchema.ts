import { defineTable } from 'convex/server'
import { v } from 'convex/values'
const scope = { businessId: v.string(), email: v.string() }
export const emailTables = {
  emailAddresses: defineTable({
    email: v.string(),
    globalUserId: v.optional(v.id('globalUsers')),
    createdAt: v.number(),
  }).index('email', ['email']),
  emailAudiences: defineTable({
    businessId: v.string(),
    audienceId: v.string(),
    purpose: v.string(),
  }).index('scope', ['businessId', 'audienceId']),
  emailConsents: defineTable({
    ...scope,
    audienceId: v.string(),
    purpose: v.string(),
    action: v.string(),
    source: v.string(),
    noticeVersion: v.string(),
    locale: v.string(),
    occurredAt: v.optional(v.number()),
    at: v.number(),
  }).index('scope', ['businessId', 'email']),
  emailMemberships: defineTable({
    ...scope,
    audienceId: v.string(),
    purpose: v.string(),
    state: v.string(),
    generation: v.number(),
    updatedAt: v.number(),
  })
    .index('scope', ['businessId', 'email', 'audienceId'])
    .index('email', ['email']),
  emailSuppressions: defineTable({
    ...scope,
    email: v.optional(v.string()),
    emailDigest: v.optional(v.string()),
    streamId: v.optional(v.string()),
    reason: v.string(),
    at: v.number(),
  })
    .index('scope', ['businessId', 'email'])
    .index('digest', ['businessId', 'emailDigest']),
  emailRequests: defineTable({
    businessId: v.string(),
    clientId: v.string(),
    key: v.string(),
    fingerprint: v.string(),
    email: v.optional(v.string()),
    result: v.any(),
    at: v.number(),
  })
    .index('scope', ['businessId', 'clientId', 'key'])
    .index('contact', ['businessId', 'email']),
  emailTokens: defineTable({
    ...scope,
    audienceId: v.string(),
    purpose: v.string(),
    source: v.optional(v.string()),
    noticeVersion: v.optional(v.string()),
    locale: v.optional(v.string()),
    digest: v.string(),
    kind: v.string(),
    generation: v.number(),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
  })
    .index('digest', ['digest'])
    .index('scope', ['businessId', 'email']),
  emailMessages: defineTable({
    ...scope,
    audienceId: v.optional(v.string()),
    purpose: v.optional(v.string()),
    kind: v.string(),
    rendered: v.any(),
    state: v.string(),
    createdAt: v.number(),
    nextAt: v.number(),
    leaseUntil: v.optional(v.number()),
    providerMessageId: v.optional(v.string()),
  })
    .index('queue', ['businessId', 'state', 'nextAt'])
    .index('provider', ['providerMessageId'])
    .index('contact', ['businessId', 'email']),
  emailAttempts: defineTable({
    businessId: v.string(),
    messageId: v.id('emailMessages'),
    state: v.string(),
    at: v.number(),
    errorCode: v.optional(v.string()),
  }).index('message', ['messageId']),
  emailEvents: defineTable({
    businessId: v.string(),
    eventId: v.string(),
    type: v.string(),
    messageId: v.optional(v.id('emailMessages')),
    providerMessageId: v.optional(v.string()),
    occurredAt: v.optional(v.number()),
    at: v.number(),
  }).index('scope', ['businessId', 'eventId']),
  emailRateLimits: defineTable({
    businessId: v.string(),
    key: v.string(),
    window: v.number(),
    count: v.number(),
  }).index('scope', ['businessId', 'key', 'window']),
}
