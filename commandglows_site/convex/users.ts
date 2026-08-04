import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import {
  DEFAULT_FREE_PRODUCT_IDS,
  ensureMissingDefaultFreeEntitlements,
} from "./defaultFreeEntitlements";

const FORMATION_PRODUCT_ID = "commandglows_formation";
const LEGACY_FORMATION_PRODUCT_ID = "commandglows-training";
const FREE_PLAN_ID = "free";
const PREMIUM_FORMATION_PLANS = new Set([
  "formation",
  "lifetime_deal",
  "pro",
  "premium",
  "paid",
]);

function grantsPremiumFormationAccess(entitlement: {
  productId: string;
  status: string;
  plan: string;
}) {
  if (
    entitlement.productId !== FORMATION_PRODUCT_ID &&
    entitlement.productId !== LEGACY_FORMATION_PRODUCT_ID
  ) {
    return false;
  }

  if (entitlement.status !== "active" && entitlement.status !== "trialing") {
    return false;
  }

  return entitlement.plan !== FREE_PLAN_ID && PREMIUM_FORMATION_PLANS.has(entitlement.plan);
}

function createGlobalUserId() {
  return `gu_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function withoutUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter((entry) => entry[1] !== undefined)
  ) as T;
}

export const upsertFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    environment: v.optional(v.string()),
    sourceRef: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const environment = args.environment ?? "production";
    let globalUserDocId;

    const existingIdentity = await ctx.db
      .query("identityAccounts")
      .withIndex("by_providerAccount", (q) =>
        q.eq("provider", "clerk").eq("providerAccountId", args.clerkId)
      )
      .first();

    if (existingIdentity) {
      globalUserDocId = existingIdentity.globalUserId;
      await ctx.db.patch(existingIdentity._id, withoutUndefined({
        email: args.email,
        environment,
        sourceRef: args.sourceRef,
        updatedAt: now,
      }));
      await ctx.db.patch(globalUserDocId, withoutUndefined({
        primaryEmail: args.email,
        name: args.name,
        imageUrl: args.imageUrl,
        updatedAt: now,
      }));
    } else {
      globalUserDocId = await ctx.db.insert("globalUsers", withoutUndefined({
        globalUserId: createGlobalUserId(),
        primaryEmail: args.email,
        name: args.name,
        imageUrl: args.imageUrl,
        createdAt: now,
        updatedAt: now,
      }));
      await ctx.db.insert("identityAccounts", withoutUndefined({
        globalUserId: globalUserDocId,
        provider: "clerk",
        providerAccountId: args.clerkId,
        email: args.email,
        source: "clerk_webhook",
        sourceRef: args.sourceRef,
        environment,
        createdAt: now,
        updatedAt: now,
      }));
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    let userDocId;
    if (existing) {
      await ctx.db.patch(existing._id, withoutUndefined({
        email: args.email,
        name: args.name,
        imageUrl: args.imageUrl,
        globalUserId: globalUserDocId,
      }));
      userDocId = existing._id;
    } else {
      userDocId = await ctx.db.insert("users", withoutUndefined({
        clerkId: args.clerkId,
        email: args.email,
        name: args.name,
        imageUrl: args.imageUrl,
        globalUserId: globalUserDocId,
      }));
    }

    const globalUser = await ctx.db.get(globalUserDocId);
    if (!globalUser) {
      throw new Error("global_user_not_found");
    }

    const rawEntitlements = await ctx.db
      .query("productEntitlements")
      .withIndex("by_globalUserId", (q) => q.eq("globalUserId", globalUserDocId))
      .collect();

    await ensureMissingDefaultFreeEntitlements(ctx, {
      rawEntitlements,
      productIds: DEFAULT_FREE_PRODUCT_IDS,
      globalUserDocId,
      globalUserPublicId: globalUser.globalUserId,
      sourceRef: args.sourceRef ?? args.clerkId,
      environment,
      now,
    });

    return userDocId;
  },
});

export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

export const getFormationAccessByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      return {
        hasAccess: false,
        source: "none",
        user: null,
      };
    }

    if (user.role === "admin") {
      return {
        hasAccess: true,
        source: "admin",
        user,
      };
    }

    const globalUserId = user.globalUserId;
    if (globalUserId) {
      const entitlements = await ctx.db
        .query("productEntitlements")
        .withIndex("by_globalUserId", (q) => q.eq("globalUserId", globalUserId))
        .collect();

      const hasActiveFormationEntitlement = entitlements.some(
        grantsPremiumFormationAccess
      );

      if (hasActiveFormationEntitlement) {
        return {
          hasAccess: true,
          source: "entitlement",
          user,
        };
      }
    }

    const subscriptionStatus = user.subscriptionStatus;
    const hasActiveLegacySubscription =
      subscriptionStatus === "active" || subscriptionStatus === "trialing";
    const hasLegacyEntitlement = Boolean(
      user.courseEntitlements?.includes(LEGACY_FORMATION_PRODUCT_ID) ||
      user.courseEntitlements?.includes(FORMATION_PRODUCT_ID)
    );
    const hasLegacyAccess = hasLegacyEntitlement ||
      (Boolean(user.subscriptionTier) && hasActiveLegacySubscription);

    return {
      hasAccess: hasLegacyAccess,
      source: hasLegacyAccess ? "legacy" : "none",
      user,
    };
  },
});

export const deleteByClerkId = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.db
      .query("identityAccounts")
      .withIndex("by_providerAccount", (q) =>
        q.eq("provider", "clerk").eq("providerAccountId", args.clerkId)
      )
      .first();

    if (identity) {
      await ctx.db.delete(identity._id);
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (user) {
      await ctx.db.delete(user._id);
    }
  },
});
