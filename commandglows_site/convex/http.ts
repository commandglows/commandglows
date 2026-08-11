import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/clerk/events",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return new Response("Clerk webhook secret not configured", { status: 500 });
    }

    const body = await request.text();
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
    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(signedContent)
    );
    const expectedSignature = uint8ArrayToBase64(new Uint8Array(signatureBytes));
    const isValid = svixSignature.split(" ").some(
      (value) => value.replace(/^v1,/, "") === expectedSignature
    );
    if (!isValid) {
      return new Response("Invalid webhook signature", { status: 403 });
    }

    try {
      const event = JSON.parse(body);
      switch (event.type) {
        case "user.created":
        case "user.updated":
          await ctx.runMutation(internal.users.upsertFromClerk, {
            clerkId: event.data.id,
            email: event.data.email_addresses?.[0]?.email_address ?? "",
            name: [event.data.first_name, event.data.last_name].filter(Boolean).join(" ") || undefined,
            imageUrl: event.data.image_url || undefined,
            environment: "production",
            sourceRef: svixId,
          });
          break;
        case "user.deleted":
          if (event.data.id) {
            await ctx.runMutation(internal.users.deleteByClerkId, {
              clerkId: event.data.id,
            });
          }
          break;
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
  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

export default http;
