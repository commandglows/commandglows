import { defineTable } from 'convex/server'
import { v } from 'convex/values'

export const emailOperationsTables = {
  emailChannelControls: defineTable({
    businessId: v.string(),
    class: v.string(),
    paused: v.boolean(),
    version: v.number(),
    updatedAt: v.number(),
  }).index('scope', ['businessId', 'class']),
  emailOperatorCases: defineTable({
    businessId: v.string(),
    messageId: v.id('emailMessages'),
    owner: v.string(),
    version: v.number(),
    updatedAt: v.number(),
  }).index('message', ['businessId', 'messageId']),
  emailOperatorActions: defineTable({
    businessId: v.string(),
    clientId: v.string(),
    key: v.string(),
    fingerprint: v.string(),
    action: v.string(),
    reasonCode: v.string(),
    messageId: v.optional(v.id('emailMessages')),
    evidenceReference: v.optional(v.string()),
    result: v.any(),
    at: v.number(),
  })
    .index('request', ['businessId', 'clientId', 'key'])
    .index('message', ['businessId', 'messageId']),
}
