import { defineTable } from 'convex/server'
import { v } from 'convex/values'
const scope = { businessId: v.string(), email: v.string() }
export const emailTables = {
  emailCampaigns: defineTable({
    businessId: v.string(),
    revision: v.number(),
    state: v.string(),
    versionId: v.optional(v.id('emailCampaignVersions')),
    approvedVersionId: v.optional(v.id('emailCampaignVersions')),
    approvedRoute: v.optional(v.string()),
    resumeState: v.optional(v.string()),
    blockReason: v.optional(v.string()),
    operationId: v.optional(v.id('emailCampaignRequests')),
    snapshotCursor: v.optional(v.string()),
    snapshotComplete: v.boolean(),
    scanned: v.number(),
    eligible: v.number(),
    excluded: v.number(),
    fanoutCursor: v.optional(v.string()),
    fanoutQueued: v.number(),
    fanoutExcluded: v.number(),
    nextAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('business', ['businessId'])
    .index('due', ['businessId', 'state', 'nextAt']),
  emailCampaignVersions: defineTable({
    businessId: v.string(),
    campaignId: v.id('emailCampaigns'),
    number: v.number(),
    audienceId: v.string(),
    purpose: v.string(),
    locale: v.string(),
    subject: v.string(),
    paragraphs: v.array(v.string()),
    scheduledAt: v.number(),
    timezone: v.string(),
    rendered: v.any(),
    cutoff: v.number(),
    route: v.string(),
    createdAt: v.number(),
  }).index('campaign', ['campaignId', 'number']),
  emailCampaignRecipients: defineTable({
    businessId: v.string(),
    campaignId: v.id('emailCampaigns'),
    versionId: v.id('emailCampaignVersions'),
    membershipId: v.id('emailMemberships'),
    generation: v.number(),
    state: v.string(),
    messageId: v.optional(v.id('emailMessages')),
    reason: v.optional(v.string()),
  })
    .index('member', ['versionId', 'membershipId'])
    .index('version', ['versionId']),
  emailCampaignRequests: defineTable({
    businessId: v.string(),
    clientId: v.string(),
    key: v.string(),
    fingerprint: v.string(),
    result: v.any(),
    at: v.number(),
  }).index('scope', ['businessId', 'clientId', 'key']),
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
    .index('email', ['email'])
    .index('audience', ['businessId', 'audienceId']),
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
    campaignId: v.optional(v.id('emailCampaigns')),
    campaignVersionId: v.optional(v.id('emailCampaignVersions')),
    campaignRecipientId: v.optional(v.id('emailCampaignRecipients')),
    rendered: v.any(),
    state: v.string(),
    createdAt: v.number(),
    nextAt: v.number(),
    leaseUntil: v.optional(v.number()),
    providerMessageId: v.optional(v.string()),
    route: v.optional(v.string()),
  })
    .index('queue', ['businessId', 'state', 'nextAt'])
    .index('queue_kind', ['businessId', 'state', 'kind', 'nextAt'])
    .index('provider', ['providerMessageId'])
    .index('contact', ['businessId', 'email']),
  emailAttempts: defineTable({
    businessId: v.string(),
    messageId: v.id('emailMessages'),
    state: v.string(),
    at: v.number(),
    errorCode: v.optional(v.string()),
    route: v.optional(v.string()),
    dispatchReservedAt: v.optional(v.number()),
  }).index('message', ['messageId']),
  emailEvents: defineTable({
    businessId: v.string(),
    eventId: v.string(),
    type: v.string(),
    messageId: v.optional(v.id('emailMessages')),
    providerMessageId: v.optional(v.string()),
    occurredAt: v.optional(v.number()),
    at: v.number(),
  })
    .index('scope', ['businessId', 'eventId'])
    .index('message', ['businessId', 'messageId']),
  emailTestQuotas: defineTable({
    businessId: v.string(),
    profileId: v.string(),
    maxAttempts: v.number(),
    attempts: v.number(),
  }).index('scope', ['businessId', 'profileId']),
  emailRateLimits: defineTable({
    businessId: v.string(),
    key: v.string(),
    window: v.number(),
    count: v.number(),
  }).index('scope', ['businessId', 'key', 'window']),
}
