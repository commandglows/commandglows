import { defineTable } from 'convex/server'
import { v } from 'convex/values'
const scope = { businessId: v.string(), email: v.string() }
export const emailTables = {
  emailCampaignAudience: defineTable({
    campaignId: v.id('emailCampaigns'),
    version: v.number(),
    membershipId: v.id('emailMemberships'),
    generation: v.number(),
  })
    .index('campaign', ['campaignId', 'version'])
    .index('membership', ['campaignId', 'version', 'membershipId']),
  emailCampaignRecovery: defineTable({
    state: v.string(),
    cursor: v.union(v.string(), v.null()),
  }).index('state', ['state']),
  emailCampaigns: defineTable({
    businessId: v.string(),
    title: v.string(),
    audienceId: v.string(),
    locale: v.string(),
    subject: v.string(),
    preheader: v.string(),
    blocks: v.any(),
    version: v.number(),
    state: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.string(),
    updatedBy: v.string(),
    scheduledAt: v.optional(v.number()),
    reviewId: v.optional(v.string()),
    reviewCutoff: v.optional(v.number()),
    reviewCursor: v.optional(v.string()),
    reviewCount: v.optional(v.number()),
    reviewComplete: v.optional(v.boolean()),
    rendered: v.optional(v.any()),
    expansionCursor: v.optional(v.string()),
    expansionComplete: v.boolean(),
    counters: v.any(),
  })
    .index('business', ['businessId'])
    .index('state', ['businessId', 'state'])
    .index('pending', ['expansionComplete', 'state', 'scheduledAt']),
  emailCampaignRecipients: defineTable({
    campaignId: v.id('emailCampaigns'),
    membershipId: v.id('emailMemberships'),
    messageId: v.id('emailMessages'),
  }).index('recipient', ['campaignId', 'membershipId']),
  emailCampaignCommands: defineTable({
    businessId: v.string(),
    actorId: v.string(),
    key: v.string(),
    fingerprint: v.string(),
    result: v.any(),
    at: v.number(),
  }).index('request', ['businessId', 'actorId', 'key']),
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
    .index('audience', ['businessId', 'audienceId', 'state'])
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
    campaignId: v.optional(v.id('emailCampaigns')),
    campaignMembershipGeneration: v.optional(v.number()),
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
    .index('queue_kind', ['businessId', 'state', 'kind', 'nextAt'])
    .index('campaign', ['campaignId', 'state'])
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
