import { defineTable } from 'convex/server'
import { v } from 'convex/values'
export const emailCampaignTables = {
  emailCampaigns: defineTable({
    businessId: v.string(),
    revision: v.number(),
    versionId: v.optional(v.id('emailCampaignVersions')),
    state: v.string(),
    resumeState: v.optional(v.string()),
    blockReason: v.optional(v.string()),
    approvedVersionId: v.optional(v.id('emailCampaignVersions')),
    approvedRoute: v.optional(v.string()),
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
    operationId: v.optional(v.string()),
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
    rendered: v.object({
      templateVersion: v.optional(v.string()),
      subject: v.string(),
      html: v.string(),
      text: v.string(),
    }),
    scheduledAt: v.number(),
    timezone: v.string(),
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
    .index('version', ['versionId'])
    .index('member', ['versionId', 'membershipId']),
  emailCampaignRequests: defineTable({
    businessId: v.string(),
    clientId: v.string(),
    key: v.string(),
    fingerprint: v.string(),
    result: v.any(),
    at: v.number(),
  }).index('scope', ['businessId', 'clientId', 'key']),
}
