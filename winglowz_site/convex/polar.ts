import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

const FORMATION_PRODUCT_ID = "commandglows_formation";
const LEGACY_COURSE_ENTITLEMENT = "commandglows-training";
const COMPAT_ENTITLEMENTS = [LEGACY_COURSE_ENTITLEMENT, FORMATION_PRODUCT_ID];
const FREE_PLAN_ID = "free";

async function findUserByPolarCustomerId(ctx: { db: any }, polarCustomerId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_polarCustomerId", (q: any) =>
      q.eq("polarCustomerId", polarCustomerId)
    )
    .first();
}

async function findIdentityAccount(
  ctx: { db: any },
  provider: string,
  providerAccountId: string
) {
  return await ctx.db
    .query("identityAccounts")
    .withIndex("by_providerAccount", (q: any) =>
      q.eq("provider", provider).eq("providerAccountId", providerAccountId)
    )
    .first();
}

async function findGlobalUserByGlobalUserId(ctx: { db: any }, globalUserId: string) {
  return await ctx.db
    .query("globalUsers")
    .withIndex("by_globalUserId", (q: any) => q.eq("globalUserId", globalUserId))
    .first();
}

function mergeEntitlements(existing: string[] | undefined, entitlements: string[]) {
  const current = new Set(existing ?? []);
  for (const entitlement of entitlements) {
    current.add(entitlement);
  }
  return [...current];
}

function removeEntitlements(existing: string[] | undefined, entitlements: string[]) {
  const current = new Set(existing ?? []);
  for (const entitlement of entitlements) {
    current.delete(entitlement);
  }
  return [...current];
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getMetadataValue(metadata: unknown, key: string): string | undefined {
  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }
  return cleanString((metadata as Record<string, unknown>)[key]);
}

function withoutUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter((entry) => entry[1] !== undefined)
  ) as T;
}

function isFormationProductId(productId: string | undefined) {
  return productId === FORMATION_PRODUCT_ID || productId === LEGACY_COURSE_ENTITLEMENT;
}

function isFormationPurchase(productId: string | undefined, entitlement: string | undefined) {
  return isFormationProductId(productId) || isFormationProductId(entitlement);
}

function isProviderManagedPaidFormationEntitlement(entitlement: {
  productId: string;
  status: string;
  plan: string;
  source: string;
}) {
  return (
    isFormationProductId(entitlement.productId) &&
    entitlement.status === "active" &&
    entitlement.plan !== FREE_PLAN_ID &&
    entitlement.source === "polar"
  );
}

function getResolvedClerkId(metadata: unknown, externalCustomerId: string | undefined) {
  return getMetadataValue(metadata, "clerkId") ?? cleanString(externalCustomerId);
}

async function resolveGlobalUserIdFromEvent(args: {
  ctx: { db: any };
  polarCustomerId?: string;
  metadata?: unknown;
  externalCustomerId?: string;
}) {
  const metadataGlobalUserId = getMetadataValue(args.metadata, "globalUserId");
  const clerkId = getResolvedClerkId(args.metadata, args.externalCustomerId);

  if (args.polarCustomerId) {
    const polarIdentity = await findIdentityAccount(args.ctx, "polar", args.polarCustomerId);
    if (polarIdentity) {
      return polarIdentity.globalUserId;
    }
  }

  if (metadataGlobalUserId) {
    const globalUser = await findGlobalUserByGlobalUserId(args.ctx, metadataGlobalUserId);
    if (globalUser) {
      return globalUser._id;
    }
  }

  if (clerkId) {
    const clerkIdentity = await findIdentityAccount(args.ctx, "clerk", clerkId);
    if (clerkIdentity) {
      return clerkIdentity.globalUserId;
    }
  }

  return undefined;
}

async function ensurePolarIdentityAccount(
  ctx: { db: any },
  globalUserId: any,
  polarCustomerId: string,
  environment: string,
  sourceRef: string | undefined
) {
  const now = Date.now();
  const existing = await findIdentityAccount(ctx, "polar", polarCustomerId);
  if (existing) {
    if (existing.globalUserId !== globalUserId) {
      return { linked: false, reason: "polar_customer_already_linked" as const };
    }
    await ctx.db.patch(existing._id, withoutUndefined({
      environment,
      sourceRef,
      updatedAt: now,
    }));
    return { linked: true as const };
  }

  await ctx.db.insert("identityAccounts", withoutUndefined({
    globalUserId,
    provider: "polar",
    providerAccountId: polarCustomerId,
    source: "polar_webhook",
    sourceRef,
    environment,
    createdAt: now,
    updatedAt: now,
  }));
  return { linked: true as const };
}

async function patchCompatibilityUserByGlobalUserId(
  ctx: { db: any },
  globalUserId: any,
  patch: Record<string, unknown>
) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_globalUserId", (q: any) => q.eq("globalUserId", globalUserId))
    .first();
  if (user) {
    await ctx.db.patch(user._id, withoutUndefined(patch));
  }
}

export const updateSubscription = internalMutation({
  args: {
    polarCustomerId: v.string(),
    subscriptionStatus: v.string(),
    subscriptionTier: v.string(),
    environment: v.optional(v.string()),
    sourceRef: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const environment = args.environment ?? "production";
    const sourceRef = args.sourceRef;

    const identity = await findIdentityAccount(ctx, "polar", args.polarCustomerId);
    if (identity) {
      await ensurePolarIdentityAccount(
        ctx,
        identity.globalUserId,
        args.polarCustomerId,
        environment,
        sourceRef
      );
      await patchCompatibilityUserByGlobalUserId(ctx, identity.globalUserId, {
        polarCustomerId: args.polarCustomerId,
        subscriptionStatus: args.subscriptionStatus,
        subscriptionTier: args.subscriptionTier,
      });
    }

    const user = await findUserByPolarCustomerId(ctx, args.polarCustomerId);

    if (user) {
      await ctx.db.patch(user._id, withoutUndefined({
        subscriptionStatus: args.subscriptionStatus,
        subscriptionTier: args.subscriptionTier,
      }));
    }
  },
});

export const linkCustomer = internalMutation({
  args: {
    polarCustomerId: v.string(),
    globalUserId: v.optional(v.string()),
    clerkId: v.optional(v.string()),
    sourceRef: v.optional(v.string()),
    environment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const environment = args.environment ?? "production";
    let globalUserDocId;

    const polarIdentity = await findIdentityAccount(ctx, "polar", args.polarCustomerId);
    if (polarIdentity) {
      globalUserDocId = polarIdentity.globalUserId;
    }

    if (!globalUserDocId && args.globalUserId) {
      const globalUser = await findGlobalUserByGlobalUserId(ctx, args.globalUserId);
      globalUserDocId = globalUser?._id;
    }

    if (!globalUserDocId && args.clerkId) {
      const clerkIdentity = await findIdentityAccount(ctx, "clerk", args.clerkId);
      globalUserDocId = clerkIdentity?.globalUserId;
    }

    if (!globalUserDocId) {
      return { linked: false };
    }

    const linkResult = await ensurePolarIdentityAccount(
      ctx,
      globalUserDocId,
      args.polarCustomerId,
      environment,
      args.sourceRef
    );
    if (!linkResult.linked) {
      return { linked: false, reason: linkResult.reason };
    }

    await patchCompatibilityUserByGlobalUserId(ctx, globalUserDocId, {
      polarCustomerId: args.polarCustomerId,
    });

    return { linked: true };
  },
});

export const processOrderPaid = internalMutation({
  args: {
    eventId: v.optional(v.string()),
    webhookId: v.string(),
    idempotencyKey: v.string(),
    sourceRef: v.optional(v.string()),
    environment: v.string(),
    productId: v.optional(v.string()),
    plan: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    polarCustomerId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    externalCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const alreadyProcessed = await ctx.db
      .query("productAccessEvents")
      .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .first();

    if (alreadyProcessed) {
      return {
        granted: alreadyProcessed.status === "granted",
        alreadyProcessed: true,
        globalUserId: alreadyProcessed.globalUserId,
      };
    }

    const metadataEntitlement = getMetadataValue(args.metadata, "entitlement");
    const matchesFormation = isFormationPurchase(args.productId, metadataEntitlement);
    if (!matchesFormation) {
      await ctx.db.insert("productAccessEvents", withoutUndefined({
        source: "polar",
        eventType: "order.paid",
        eventId: args.eventId,
        webhookId: args.webhookId,
        sourceRef: args.sourceRef,
        idempotencyKey: args.idempotencyKey,
        environment: args.environment,
        productId: args.productId,
        customerId: args.polarCustomerId,
        customerEmail: args.customerEmail,
        status: "ignored",
        reason: "wrong_product",
        createdAt: now,
      }));
      return { granted: false, reason: "wrong_product" };
    }

    const globalUserId = await resolveGlobalUserIdFromEvent({
      ctx,
      polarCustomerId: args.polarCustomerId,
      metadata: args.metadata,
      externalCustomerId: args.externalCustomerId,
    });

    if (!globalUserId) {
      await ctx.db.insert("productAccessEvents", withoutUndefined({
        source: "polar",
        eventType: "order.paid",
        eventId: args.eventId,
        webhookId: args.webhookId,
        sourceRef: args.sourceRef,
        idempotencyKey: args.idempotencyKey,
        environment: args.environment,
        productId: args.productId ?? FORMATION_PRODUCT_ID,
        customerId: args.polarCustomerId,
        customerEmail: args.customerEmail,
        status: "pending_review",
        reason: args.customerEmail ? "email_only_unresolved" : "identity_unresolved",
        createdAt: now,
      }));
      return { granted: false, reason: "identity_unresolved" };
    }

    if (args.polarCustomerId) {
      const linkResult = await ensurePolarIdentityAccount(
        ctx,
        globalUserId,
        args.polarCustomerId,
        args.environment,
        args.sourceRef
      );
      if (!linkResult.linked) {
        await ctx.db.insert("productAccessEvents", withoutUndefined({
          source: "polar",
          eventType: "order.paid",
          eventId: args.eventId,
          webhookId: args.webhookId,
          sourceRef: args.sourceRef,
          idempotencyKey: args.idempotencyKey,
          environment: args.environment,
          productId: args.productId ?? FORMATION_PRODUCT_ID,
          globalUserId,
          customerId: args.polarCustomerId,
          customerEmail: args.customerEmail,
          status: "pending_review",
          reason: linkResult.reason,
          createdAt: now,
        }));
        return { granted: false, reason: linkResult.reason };
      }
    }

    await ctx.db.insert("productEntitlements", withoutUndefined({
      globalUserId,
      productId: FORMATION_PRODUCT_ID,
      plan: args.plan ?? "formation",
      status: "active",
      source: "polar",
      sourceRef: args.sourceRef,
      environment: args.environment,
      idempotencyKey: args.idempotencyKey,
      grantedAt: now,
      createdAt: now,
      updatedAt: now,
    }));

    const user = await ctx.db
      .query("users")
      .withIndex("by_globalUserId", (q: any) => q.eq("globalUserId", globalUserId))
      .first();
    if (user) {
      await ctx.db.patch(user._id, withoutUndefined({
        polarCustomerId: args.polarCustomerId ?? user.polarCustomerId,
        courseEntitlements: mergeEntitlements(user.courseEntitlements, COMPAT_ENTITLEMENTS),
        subscriptionStatus: "active",
        subscriptionTier: args.plan ?? FORMATION_PRODUCT_ID,
      }));
    }

    await ctx.db.insert("productAccessEvents", withoutUndefined({
      source: "polar",
      eventType: "order.paid",
      eventId: args.eventId,
      webhookId: args.webhookId,
      sourceRef: args.sourceRef,
      idempotencyKey: args.idempotencyKey,
      environment: args.environment,
      productId: FORMATION_PRODUCT_ID,
      globalUserId,
      customerId: args.polarCustomerId,
      customerEmail: args.customerEmail,
      status: "granted",
      createdAt: now,
    }));

    return { granted: true, globalUserId };
  },
});

export const processFormationAccessChange = internalMutation({
  args: {
    eventType: v.string(),
    eventId: v.optional(v.string()),
    webhookId: v.string(),
    idempotencyKey: v.string(),
    sourceRef: v.optional(v.string()),
    environment: v.string(),
    productId: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    polarCustomerId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    externalCustomerId: v.optional(v.string()),
    status: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const alreadyProcessed = await ctx.db
      .query("productAccessEvents")
      .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .first();

    if (alreadyProcessed) {
      return {
        status: alreadyProcessed.status,
        alreadyProcessed: true,
        globalUserId: alreadyProcessed.globalUserId,
      };
    }

    const metadataEntitlement = getMetadataValue(args.metadata, "entitlement");
    const matchesFormation = isFormationPurchase(args.productId, metadataEntitlement);
    if (!matchesFormation) {
      await ctx.db.insert("productAccessEvents", withoutUndefined({
        source: "polar",
        eventType: args.eventType,
        eventId: args.eventId,
        webhookId: args.webhookId,
        sourceRef: args.sourceRef,
        idempotencyKey: args.idempotencyKey,
        environment: args.environment,
        productId: args.productId,
        customerId: args.polarCustomerId,
        customerEmail: args.customerEmail,
        status: "ignored",
        reason: "wrong_product",
        createdAt: now,
      }));
      return { status: "ignored", reason: "wrong_product" };
    }

    const globalUserId = await resolveGlobalUserIdFromEvent({
      ctx,
      polarCustomerId: args.polarCustomerId,
      metadata: args.metadata,
      externalCustomerId: args.externalCustomerId,
    });

    if (!globalUserId) {
      await ctx.db.insert("productAccessEvents", withoutUndefined({
        source: "polar",
        eventType: args.eventType,
        eventId: args.eventId,
        webhookId: args.webhookId,
        sourceRef: args.sourceRef,
        idempotencyKey: args.idempotencyKey,
        environment: args.environment,
        productId: args.productId ?? FORMATION_PRODUCT_ID,
        customerId: args.polarCustomerId,
        customerEmail: args.customerEmail,
        status: "pending_review",
        reason: args.customerEmail ? "email_only_unresolved" : "identity_unresolved",
        createdAt: now,
      }));
      return { status: "pending_review", reason: "identity_unresolved" };
    }

    if (args.polarCustomerId) {
      const linkResult = await ensurePolarIdentityAccount(
        ctx,
        globalUserId,
        args.polarCustomerId,
        args.environment,
        args.sourceRef
      );
      if (!linkResult.linked) {
        await ctx.db.insert("productAccessEvents", withoutUndefined({
          source: "polar",
          eventType: args.eventType,
          eventId: args.eventId,
          webhookId: args.webhookId,
          sourceRef: args.sourceRef,
          idempotencyKey: args.idempotencyKey,
          environment: args.environment,
          productId: args.productId ?? FORMATION_PRODUCT_ID,
          globalUserId,
          customerId: args.polarCustomerId,
          customerEmail: args.customerEmail,
          status: "pending_review",
          reason: linkResult.reason,
          createdAt: now,
        }));
        return { status: "pending_review", reason: linkResult.reason };
      }
    }

    const entitlements = await ctx.db
      .query("productEntitlements")
      .withIndex("by_globalUserId", (q: any) => q.eq("globalUserId", globalUserId))
      .collect();

    for (const entitlement of entitlements) {
      if (isProviderManagedPaidFormationEntitlement(entitlement)) {
        await ctx.db.patch(entitlement._id, withoutUndefined({
          status: args.status,
          sourceRef: args.sourceRef,
          updatedAt: now,
        }));
      }
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_globalUserId", (q: any) => q.eq("globalUserId", globalUserId))
      .first();

    if (user) {
      await ctx.db.patch(user._id, withoutUndefined({
        polarCustomerId: args.polarCustomerId ?? user.polarCustomerId,
        courseEntitlements: removeEntitlements(user.courseEntitlements, COMPAT_ENTITLEMENTS),
        subscriptionStatus: args.status === "refunded" ? "refunded" : "canceled",
      }));
    }

    await ctx.db.insert("productAccessEvents", withoutUndefined({
      source: "polar",
      eventType: args.eventType,
      eventId: args.eventId,
      webhookId: args.webhookId,
      sourceRef: args.sourceRef,
      idempotencyKey: args.idempotencyKey,
      environment: args.environment,
      productId: args.productId ?? FORMATION_PRODUCT_ID,
      globalUserId,
      customerId: args.polarCustomerId,
      customerEmail: args.customerEmail,
      status: args.status,
      reason: args.reason,
      createdAt: now,
    }));

    return { status: args.status, globalUserId };
  },
});
