import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

async function syncSuiteAccessMirror(globalUserId: string) {
  const syncUrl = process.env.SUITE_BRIDGE_SYNC_URL;
  const syncSecret = cleanString(process.env.SUITE_BRIDGE_SYNC_SECRET) ??
    cleanString(process.env.SUITE_BRIDGE_CONVEX_SECRET);

  if (!syncUrl) {
    throw new Error("suite_bridge_sync_url_not_configured");
  }
  if (!syncSecret) {
    throw new Error("suite_bridge_sync_secret_not_configured");
  }

  const response = await fetch(syncUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-suite-bridge-secret": syncSecret,
    },
    body: JSON.stringify({ globalUserId }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`suite_bridge_sync_failed:${response.status}:${body.slice(0, 240)}`);
  }
}

http.route({
  path: "/polar/events",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const body = await request.text();

    // Verify webhook signature using svix
    const webhookId = request.headers.get("webhook-id") ?? "";
    const webhookTimestamp = request.headers.get("webhook-timestamp") ?? "";
    const webhookSignature = request.headers.get("webhook-signature") ?? "";

    if (!webhookId || !webhookTimestamp || !webhookSignature) {
      return new Response("Missing webhook verification headers", { status: 403 });
    }

    // Verify timestamp is within tolerance (5 minutes)
    const timestampSeconds = parseInt(webhookTimestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (isNaN(timestampSeconds) || Math.abs(now - timestampSeconds) > 300) {
      return new Response("Webhook timestamp too old", { status: 403 });
    }

    // Verify HMAC signature
    const signedContent = `${webhookId}.${webhookTimestamp}.${body}`;
    const secretBytes = base64ToUint8Array(webhookSecret.replace(/^whsec_/, ""));

    const key = await crypto.subtle.importKey(
      "raw",
      toArrayBuffer(secretBytes),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedContent));
    const expectedSignature = uint8ArrayToBase64(new Uint8Array(signatureBytes));

    const signatures = webhookSignature.split(" ");
    const isValid = signatures.some((sig) => {
      const sigValue = sig.replace(/^v1,/, "");
      return sigValue === expectedSignature;
    });

    if (!isValid) {
      return new Response("Invalid webhook signature", { status: 403 });
    }

    try {
      const event = JSON.parse(body);
      const environment = process.env.POLAR_SERVER === "sandbox" ? "sandbox" : "production";

      if (event.type === "subscription.created" || event.type === "subscription.updated") {
        const subscription = event.data;
        const customerId = cleanString(subscription.customer_id);
        const status = cleanString(subscription.status);
        const tier = cleanString(subscription.product?.name) ?? "pro";

        if (customerId && status) {
          await ctx.runMutation(internal.polar.updateSubscription, {
            polarCustomerId: customerId,
            subscriptionStatus: status,
            subscriptionTier: tier,
            environment,
            sourceRef: cleanString(subscription.id) || undefined,
          });
        }
      }

      if (event.type === "subscription.revoked" || event.type === "subscription.updated") {
        const subscription = event.data;
        const shouldRevoke = event.type === "subscription.revoked" ||
          isEffectiveSubscriptionRevocation(subscription);

        if (shouldRevoke) {
          const eventId = cleanString(event.id);
          const subscriptionId = cleanString(subscription.id);
          const logicalProductId = firstNonEmptyString(
            getMetadataValue(subscription.metadata ?? {}, "productId"),
            getMetadataValue(subscription.metadata ?? {}, "entitlement"),
            getMetadataValue(subscription.product?.metadata ?? {}, "productId"),
            getMetadataValue(subscription.product?.metadata ?? {}, "entitlement"),
          );
          const idempotencyKey = eventId
            ? ["polar", event.type, eventId].join(":")
            : ["polar", event.type, webhookId, subscriptionId ?? "unknown"].join(":");

          const accessChangeResult = await ctx.runMutation(internal.polar.processFormationAccessChange, {
            eventType: event.type,
            eventId: eventId || undefined,
            webhookId,
            idempotencyKey,
            sourceRef: subscriptionId || cleanString(subscription.product_id) || undefined,
            environment,
            productId: logicalProductId || undefined,
            customerEmail: cleanString(subscription.customer?.email) || undefined,
            polarCustomerId: cleanString(subscription.customer_id) || undefined,
            metadata: compactObject({
              ...(subscription.metadata ?? {}),
              entitlement: firstNonEmptyString(
                getMetadataValue(subscription.metadata ?? {}, "entitlement"),
                getMetadataValue(subscription.product?.metadata ?? {}, "entitlement"),
              ),
              productId: logicalProductId,
              sourceProductId: cleanString(subscription.product_id),
              clerkId: firstNonEmptyString(
                getMetadataValue(subscription.metadata ?? {}, "clerkId"),
                cleanString(subscription.customer?.external_id),
              ),
              globalUserId: getMetadataValue(subscription.metadata ?? {}, "globalUserId"),
            }),
            externalCustomerId: cleanString(subscription.customer?.external_id) || undefined,
            status: "revoked",
            reason: event.type === "subscription.revoked" ? "subscription_revoked" : "subscription_updated_revoked",
          });
          const globalUserId = cleanString(
            (accessChangeResult as { globalUserId?: unknown }).globalUserId
          );
          if (globalUserId) {
            await syncSuiteAccessMirror(globalUserId);
          }
        }
      }

      if (event.type === "checkout.completed") {
        const checkout = event.data;
        const customerId = cleanString(checkout.customer_id);
        const metadata = checkout.metadata ?? {};
        const clerkId = firstNonEmptyString(
          getMetadataValue(metadata, "clerkId"),
          cleanString(checkout.external_customer_id),
          cleanString(checkout.customer?.external_id),
        );
        const globalUserId = getMetadataValue(metadata, "globalUserId");

        if (customerId) {
          await ctx.runMutation(internal.polar.linkCustomer, {
            polarCustomerId: customerId,
            clerkId: clerkId || undefined,
            globalUserId: globalUserId || undefined,
            sourceRef: cleanString(checkout.id) || undefined,
            environment,
          });
        }
      }

      if (event.type === "order.paid") {
        const order = event.data;
        const orderId = cleanString(order.id);
        const eventId = cleanString(event.id);
        const productId = firstNonEmptyString(
          getMetadataValue(order.metadata ?? {}, "productId"),
          getMetadataValue(order.metadata ?? {}, "entitlement"),
          getMetadataValue(order.subscription?.metadata ?? {}, "productId"),
          getMetadataValue(order.subscription?.metadata ?? {}, "entitlement"),
        );
        const entitlement = getMetadataValue(order.metadata ?? {}, "entitlement");
        const logicalProductId = productId ?? entitlement ?? undefined;
        const idempotencyKey = eventId
          ? ["polar", "order.paid", eventId].join(":")
          : ["polar", "order.paid", webhookId, orderId ?? "unknown"].join(":");

        const orderPaidResult = await ctx.runMutation(internal.polar.processOrderPaid, {
          eventId: eventId || undefined,
          webhookId,
          idempotencyKey,
          sourceRef: orderId || undefined,
          environment,
          productId: logicalProductId || undefined,
          plan: cleanString(order.product?.name) || undefined,
          customerEmail: cleanString(order.customer?.email) || undefined,
          polarCustomerId: cleanString(order.customer_id) || undefined,
          metadata: compactObject({
            ...(order.metadata ?? {}),
            entitlement: entitlement,
            productId: logicalProductId,
            sourceProductId: cleanString(order.product_id),
            clerkId: firstNonEmptyString(
              getMetadataValue(order.metadata ?? {}, "clerkId"),
              cleanString(order.customer?.external_id),
            ),
            globalUserId: getMetadataValue(order.metadata ?? {}, "globalUserId"),
          }),
          externalCustomerId: cleanString(order.customer?.external_id) || undefined,
        });
        const globalUserId = cleanString(
          (orderPaidResult as { globalUserId?: unknown }).globalUserId
        );
        if (globalUserId) {
          await syncSuiteAccessMirror(globalUserId);
        }
      }

      if (event.type === "order.refunded") {
        const order = event.data;
        const orderId = cleanString(order.id);
        const eventId = cleanString(event.id);
        const logicalProductId = firstNonEmptyString(
          getMetadataValue(order.metadata ?? {}, "productId"),
          getMetadataValue(order.metadata ?? {}, "entitlement"),
          getMetadataValue(order.subscription?.metadata ?? {}, "productId"),
          getMetadataValue(order.subscription?.metadata ?? {}, "entitlement"),
        );
        const idempotencyKey = eventId
          ? ["polar", "order.refunded", eventId].join(":")
          : ["polar", "order.refunded", webhookId, orderId ?? "unknown"].join(":");

        const refundResult = await ctx.runMutation(internal.polar.processFormationAccessChange, {
          eventType: "order.refunded",
          eventId: eventId || undefined,
          webhookId,
          idempotencyKey,
          sourceRef: orderId || cleanString(order.product_id) || undefined,
          environment,
          productId: logicalProductId || undefined,
          customerEmail: cleanString(order.customer?.email) || undefined,
          polarCustomerId: cleanString(order.customer_id) || undefined,
          metadata: compactObject({
            ...(order.metadata ?? {}),
            entitlement: firstNonEmptyString(
              getMetadataValue(order.metadata ?? {}, "entitlement"),
              getMetadataValue(order.subscription?.metadata ?? {}, "entitlement"),
            ),
            productId: logicalProductId,
            sourceProductId: cleanString(order.product_id),
            clerkId: firstNonEmptyString(
              getMetadataValue(order.metadata ?? {}, "clerkId"),
              cleanString(order.customer?.external_id),
            ),
            globalUserId: getMetadataValue(order.metadata ?? {}, "globalUserId"),
          }),
          externalCustomerId: cleanString(order.customer?.external_id) || undefined,
          status: "refunded",
          reason: "order_refunded",
        });
        const globalUserId = cleanString(
          (refundResult as { globalUserId?: unknown }).globalUserId
        );
        if (globalUserId) {
          await syncSuiteAccessMirror(globalUserId);
        }
      }

      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Polar webhook handling failed:", error);
      return new Response("Webhook handling failed", { status: 500 });
    }
  }),
});

http.route({
  path: "/clerk/events",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return new Response("Clerk webhook secret not configured", { status: 500 });
    }

    const body = await request.text();

    // Verify svix signature
    const svixId = request.headers.get("svix-id") ?? "";
    const svixTimestamp = request.headers.get("svix-timestamp") ?? "";
    const svixSignature = request.headers.get("svix-signature") ?? "";

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing svix verification headers", { status: 403 });
    }

    const timestampSeconds = parseInt(svixTimestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (isNaN(timestampSeconds) || Math.abs(now - timestampSeconds) > 300) {
      return new Response("Webhook timestamp too old", { status: 403 });
    }

    const signedContent = `${svixId}.${svixTimestamp}.${body}`;
    const secretBytes = base64ToUint8Array(webhookSecret.replace(/^whsec_/, ""));

    const key = await crypto.subtle.importKey(
      "raw",
      toArrayBuffer(secretBytes),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedContent));
    const expectedSignature = uint8ArrayToBase64(new Uint8Array(signatureBytes));

    const signatures = svixSignature.split(" ");
    const isValid = signatures.some((sig) => {
      const sigValue = sig.replace(/^v1,/, "");
      return sigValue === expectedSignature;
    });

    if (!isValid) {
      return new Response("Invalid webhook signature", { status: 403 });
    }

    try {
      const event = JSON.parse(body);

      switch (event.type) {
        case "user.created":
        case "user.updated": {
          await ctx.runMutation(internal.users.upsertFromClerk, {
            clerkId: event.data.id,
            email: event.data.email_addresses?.[0]?.email_address ?? "",
            name: [event.data.first_name, event.data.last_name].filter(Boolean).join(" ") || undefined,
            imageUrl: event.data.image_url || undefined,
            environment: "production",
            sourceRef: svixId,
          });
          break;
        }
        case "user.deleted": {
          if (event.data.id) {
            await ctx.runMutation(internal.users.deleteByClerkId, {
              clerkId: event.data.id,
            });
          }
          break;
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Clerk webhook handling failed:", error);
      return new Response("Webhook handling failed", { status: 400 });
    }
  }),
});

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export default http;

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function firstNonEmptyString(...values: Array<string | null>): string | null {
  for (const value of values) {
    if (value) {
      return value;
    }
  }
  return null;
}

function getMetadataValue(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }
  return cleanString((metadata as Record<string, unknown>)[key]);
}

function compactObject(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).filter((entry) => entry[1] !== null && entry[1] !== undefined)
  );
}

function isEffectiveSubscriptionRevocation(subscription: Record<string, unknown>) {
  const status = cleanString(subscription.status)?.toLowerCase();
  const cancelAtPeriodEnd = subscription.cancel_at_period_end === true;
  const hasEndedAt = Boolean(cleanString(subscription.ended_at));
  const hasEndsAt = Boolean(cleanString(subscription.ends_at));
  const hasCanceledAt = Boolean(cleanString(subscription.canceled_at));

  if (status === "active" || status === "trialing") {
    return hasEndedAt;
  }

  if (cancelAtPeriodEnd && !hasEndedAt && !hasEndsAt) {
    return false;
  }

  if (!status) {
    return hasEndedAt || hasEndsAt;
  }

  const immediateRevokeStatuses = new Set([
    "revoked",
    "unpaid",
    "canceled",
    "cancelled",
    "expired",
    "incomplete_expired",
  ]);

  if (immediateRevokeStatuses.has(status)) {
    return true;
  }

  if (hasEndedAt || hasEndsAt) {
    return true;
  }

  if (hasCanceledAt && status !== "active" && status !== "trialing") {
    return true;
  }

  return false;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}
