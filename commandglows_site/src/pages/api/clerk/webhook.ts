import type { APIRoute } from "astro";

export const prerender = false;

/**
 * Clerk webhook proxy — forwards to Convex HTTP endpoint
 * which handles signature verification and calls internal mutations.
 *
 * This proxy exists so existing webhook URLs continue to work.
 * For new setups, point Clerk webhooks directly at:
 *   https://<deployment>.convex.site/clerk/events
 */
export const POST: APIRoute = async ({ request }) => {
  const convexUrl = import.meta.env.PUBLIC_CONVEX_URL;
  if (!convexUrl || convexUrl === "https://PLACEHOLDER.convex.cloud") {
    return new Response(JSON.stringify({ success: true, message: "Convex not configured" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const convexSiteUrl = convexUrl.replace(".convex.cloud", ".convex.site");
  const body = await request.text();

  try {
    const response = await fetch(`${convexSiteUrl}/clerk/events`, {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/json",
        "svix-id": request.headers.get("svix-id") ?? "",
        "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
        "svix-signature": request.headers.get("svix-signature") ?? "",
      },
    });

    const responseBody = await response.text();
    return new Response(responseBody, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to forward Clerk webhook to Convex:", error);
    return new Response(JSON.stringify({ error: "Webhook forwarding failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
