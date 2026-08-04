import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  globalUsers: defineTable({
    globalUserId: v.string(),
    primaryEmail: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_globalUserId", ["globalUserId"]),

  identityAccounts: defineTable({
    globalUserId: v.id("globalUsers"),
    provider: v.string(),
    providerAccountId: v.string(),
    email: v.optional(v.string()),
    source: v.optional(v.string()),
    sourceRef: v.optional(v.string()),
    environment: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_providerAccount", ["provider", "providerAccountId"])
    .index("by_globalUserId", ["globalUserId"]),

  productEntitlements: defineTable({
    globalUserId: v.id("globalUsers"),
    productId: v.string(),
    plan: v.string(),
    status: v.string(),
    source: v.string(),
    sourceRef: v.optional(v.string()),
    environment: v.string(),
    idempotencyKey: v.string(),
    grantedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_globalUserId", ["globalUserId"])
    .index("by_productStatus", ["productId", "status"])
    .index("by_idempotencyKey", ["idempotencyKey"]),

  productActivationCodes: defineTable({
    codeNormalized: v.string(),
    productId: v.string(),
    plan: v.string(),
    source: v.string(),
    status: v.string(),
    sourceRef: v.optional(v.string()),
    environment: v.string(),
    idempotencyKey: v.string(),
    redeemedByGlobalUserId: v.optional(v.id("globalUsers")),
    redeemedEntitlementId: v.optional(v.id("productEntitlements")),
    redeemedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_codeNormalized", ["codeNormalized"])
    .index("by_productStatus", ["productId", "status"])
    .index("by_idempotencyKey", ["idempotencyKey"]),

  productAccessEvents: defineTable({
    source: v.string(),
    eventType: v.string(),
    eventId: v.optional(v.string()),
    webhookId: v.optional(v.string()),
    sourceRef: v.optional(v.string()),
    idempotencyKey: v.string(),
    environment: v.string(),
    productId: v.optional(v.string()),
    globalUserId: v.optional(v.id("globalUsers")),
    customerId: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    status: v.string(),
    reason: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_idempotencyKey", ["idempotencyKey"])
    .index("by_globalUserId", ["globalUserId"])
    .index("by_sourceRef", ["source", "sourceRef"]),

  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    globalUserId: v.optional(v.id("globalUsers")),
    role: v.optional(v.string()),
    polarCustomerId: v.optional(v.string()),
    subscriptionTier: v.optional(v.string()),
    subscriptionStatus: v.optional(v.string()),
    courseEntitlements: v.optional(v.array(v.string())),
  }).index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_polarCustomerId", ["polarCustomerId"])
    .index("by_globalUserId", ["globalUserId"]),

  apiKeys: defineTable({
    userId: v.id("users"),
    name: v.string(),
    key: v.string(),
    isRevoked: v.boolean(),
  }).index("by_userId", ["userId"]),

  features: defineTable({
    key: v.string(),
    title: v.string(),
    description: v.string(),
    status: v.string(),
    projectId: v.string(),
    votes: v.number(),
    source: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_projectId", ["projectId"])
    .index("by_status", ["status"])
    .index("by_key", ["key"]),

  featureVotes: defineTable({
    featureId: v.id("features"),
    globalUserId: v.id("globalUsers"),
    createdAt: v.number(),
  }).index("by_featureUser", ["featureId", "globalUserId"])
    .index("by_globalUserId", ["globalUserId"]),

  featureSuggestions: defineTable({
    globalUserId: v.id("globalUsers"),
    projectId: v.string(),
    title: v.string(),
    titleNormalized: v.string(),
    description: v.string(),
    status: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_globalUserId", ["globalUserId"])
    .index("by_status", ["status"])
    .index("by_globalUserTitle", ["globalUserId", "titleNormalized"]),
});
