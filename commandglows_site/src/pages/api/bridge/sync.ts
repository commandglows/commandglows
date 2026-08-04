import type { APIRoute } from "astro";
import { ConvexHttpClient } from "convex/browser";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminState } from "@/lib/firebaseAdmin";
import { getServerEnv } from "@/lib/serverEnv";
import {
  buildFirestoreSuiteAccessMirror,
  getBridgeEndpointSecret,
  getConvexBridgeSecret,
  parseSyncRequestBody,
} from "@/lib/suiteBridge";

export const prerender = false;

const JSON_HEADERS = { "Content-Type": "application/json" };

function unauthorized(error: string) {
  return new Response(JSON.stringify({ status: "unauthorized", error }), {
    status: 401,
    headers: JSON_HEADERS,
  });
}

export const POST: APIRoute = async ({ request }) => {
  const env = getServerEnv();
  const endpointSecret = getBridgeEndpointSecret(env);
  const convexBridgeSecret = getConvexBridgeSecret(env);
  if (!endpointSecret || !convexBridgeSecret) {
    return new Response(
      JSON.stringify({ status: "unavailable", error: "bridge_secret_not_configured" }),
      { status: 503, headers: JSON_HEADERS }
    );
  }

  const incomingSecret = request.headers.get("x-suite-bridge-secret");
  if (!incomingSecret || incomingSecret !== endpointSecret) {
    return unauthorized("invalid_bridge_secret");
  }

  const firebaseAdmin = getFirebaseAdminState(env);
  if (!firebaseAdmin) {
    return new Response(
      JSON.stringify({ status: "unavailable", error: "firebase_admin_not_configured" }),
      { status: 503, headers: JSON_HEADERS }
    );
  }

  const convexUrl = env.PUBLIC_CONVEX_URL;
  if (!convexUrl || convexUrl === "https://PLACEHOLDER.convex.cloud") {
    return new Response(
      JSON.stringify({ status: "unavailable", error: "convex_not_configured" }),
      { status: 503, headers: JSON_HEADERS }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ status: "bad_request", error: "invalid_json" }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const parsed = parseSyncRequestBody(payload);
  if (!parsed) {
    return new Response(
      JSON.stringify({ status: "bad_request", error: "invalid_global_user_id" }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  const convex = new ConvexHttpClient(convexUrl);

  try {
    const snapshot = await convex.query(
      "bridge:getEntitlementSnapshotByGlobalUser" as never,
      {
        globalUserId: parsed.globalUserId,
        bridgeSecret: convexBridgeSecret,
      } as never
    );

    const firebaseUids = (snapshot as { firebaseUids: string[] }).firebaseUids;
    const entitlements = (snapshot as {
      entitlements: { productId: string; status: string; plan?: string | null }[];
    }).entitlements;

    for (const firebaseUid of firebaseUids) {
      const mirror = buildFirestoreSuiteAccessMirror({
        globalUserId: parsed.globalUserId,
        entitlements,
      });
      await firebaseAdmin.firestore
        .collection("suiteAccess")
        .doc(firebaseUid)
        .set(
          {
            ...mirror,
            source: "suite_bridge_sync_api",
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    }

    return new Response(
      JSON.stringify({
        status: "ok",
        globalUserId: parsed.globalUserId,
        syncedFirebaseUids: firebaseUids.length,
      }),
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (error) {
    console.error("Bridge snapshot sync failed:", error);
    return new Response(JSON.stringify({ status: "error", error: "sync_failed" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};
