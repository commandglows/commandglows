import type { APIRoute } from "astro";
import { ConvexHttpClient } from "convex/browser";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminState } from "@/lib/firebaseAdmin";
import { getServerEnv } from "@/lib/serverEnv";
import {
  buildFirestoreSuiteAccessMirror,
  buildReplayGlowzProductToken,
  getBearerTokenFromAuthorizationHeader,
  getConvexBridgeSecret,
  getReplayGlowzProductJwtAudience,
  getReplayGlowzProductJwtIssuer,
  isTrustedFirebaseIdTokenClaims,
  resolveBridgeEnvironment,
  resolveReplayGlowzEntitlementSnapshot,
  type ReplayGlowzEntitlementReasonCode,
  type ReplayGlowzProductUserIdSource,
} from "@/lib/suiteBridge";

export const prerender = false;

const JSON_HEADERS = { "Content-Type": "application/json" };
const PRODUCT_TOKEN_NOT_CONFIGURED = "product_token_not_configured";

type BridgeAccount = {
  provider: string;
  providerAccountId?: string;
  providerAccountIdMasked?: string;
  email?: string;
};

type BridgeSnapshot = {
  status: string;
  globalUserId: string | null;
  accounts: BridgeAccount[];
  entitlements: Array<{
    productId: string;
    status: string;
    plan?: string | null;
  }>;
  replayGlowzProductUserId: string | null;
  replayGlowzProductUserIdSource: ReplayGlowzProductUserIdSource | null;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseNullableString(value: unknown): string | null {
  return isNonEmptyString(value) ? value.trim() : null;
}

function parseReplayGlowzJwtSource(
  value: unknown
): ReplayGlowzProductUserIdSource | null {
  if (value === "clerk") {
    return "clerk";
  }
  if (value === "globalUserId") {
    return "globalUserId";
  }
  return null;
}

function parseBridgeAccounts(value: unknown): BridgeAccount[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      const raw = entry as Record<string, unknown>;
      const provider = parseNullableString(raw.provider) ?? "unknown";
      return {
        provider,
        providerAccountId: parseNullableString(raw.providerAccountId) ?? undefined,
        providerAccountIdMasked:
          parseNullableString(raw.providerAccountIdMasked) ?? undefined,
        email: parseNullableString(raw.email) ?? undefined,
      };
    })
    .filter((entry) => isNonEmptyString(entry.provider));
}

function parseBridgeEntitlements(value: unknown): {
  productId: string;
  status: string;
  plan?: string | null;
}[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      const raw = entry as {
        productId?: unknown;
        status?: unknown;
        plan?: unknown;
      };
      return {
        productId: parseNullableString(raw.productId) ?? "",
        status: parseNullableString(raw.status) ?? "",
        plan: parseNullableString(raw.plan),
      };
    })
    .filter((entry) => entry.productId && entry.status);
}

function parseBridgeSnapshot(value: unknown): BridgeSnapshot {
  const raw = value as Record<string, unknown>;

  return {
    status: parseNullableString(raw.status) ?? "ok",
    globalUserId: parseNullableString(raw.globalUserId),
    accounts: parseBridgeAccounts(raw.accounts),
    entitlements: parseBridgeEntitlements(raw.entitlements),
    replayGlowzProductUserId: parseNullableString(
      raw.replayGlowzProductUserId
    ),
    replayGlowzProductUserIdSource: parseReplayGlowzJwtSource(
      raw.replayGlowzProductUserIdSource
    ),
  };
}

function buildReplayGlowzClientSnapshot(
  snapshot: BridgeSnapshot,
  replayGlowz: {
    hasAccess: boolean;
    globalUserId: string | null;
    matchedProductId: string | null;
    reasonCode: ReplayGlowzEntitlementReasonCode;
  }
) {
  const productUserId =
    replayGlowz.hasAccess && snapshot.replayGlowzProductUserId
      ? snapshot.replayGlowzProductUserId
      : snapshot.globalUserId;
  const productUserIdSource: ReplayGlowzProductUserIdSource =
    replayGlowz.hasAccess &&
    snapshot.replayGlowzProductUserId &&
    snapshot.replayGlowzProductUserIdSource === "clerk"
      ? "clerk"
      : "globalUserId";

  return {
    hasAccess: replayGlowz.hasAccess,
    globalUserId: replayGlowz.globalUserId,
    matchedProductId: replayGlowz.matchedProductId,
    reasonCode: replayGlowz.reasonCode,
    productUserId,
    productUserIdSource,
  };
}

export const POST: APIRoute = async ({ request }) => {
  const env = getServerEnv();
  const bridgeSecret = getConvexBridgeSecret(env);

  if (!bridgeSecret) {
    return new Response(
      JSON.stringify({
        status: "unavailable",
        error: "bridge_secret_not_configured",
      }),
      { status: 503, headers: JSON_HEADERS }
    );
  }

  const firebaseAdmin = getFirebaseAdminState(env);
  if (!firebaseAdmin) {
    return new Response(
      JSON.stringify({
        status: "unavailable",
        error: "firebase_admin_not_configured",
      }),
      { status: 503, headers: JSON_HEADERS }
    );
  }

  const bearerToken = getBearerTokenFromAuthorizationHeader(
    request.headers.get("authorization")
  );
  if (!bearerToken) {
    return new Response(
      JSON.stringify({ status: "unauthorized", error: "missing_bearer_token" }),
      { status: 401, headers: JSON_HEADERS }
    );
  }

  const convexUrl = env.PUBLIC_CONVEX_URL;
  if (!convexUrl || convexUrl === "https://PLACEHOLDER.convex.cloud") {
    return new Response(
      JSON.stringify({ status: "unavailable", error: "convex_not_configured" }),
      { status: 503, headers: JSON_HEADERS }
    );
  }

  let decodedToken;
  try {
    decodedToken = await firebaseAdmin.auth.verifyIdToken(bearerToken, true);
  } catch {
    console.error("Firebase bridge token verification failed.");
    return new Response(
      JSON.stringify({ status: "unauthorized", error: "invalid_firebase_token" }),
      { status: 401, headers: JSON_HEADERS }
    );
  }

  if (!isTrustedFirebaseIdTokenClaims(decodedToken, firebaseAdmin.projectId)) {
    return new Response(
      JSON.stringify({
        status: "unauthorized",
        error: "invalid_token_audience_issuer_or_subject",
      }),
      { status: 401, headers: JSON_HEADERS }
    );
  }

  const convex = new ConvexHttpClient(convexUrl);

  try {
    const rawSnapshot = await convex.mutation(
      "bridge:upsertFirebaseIdentity" as never,
      {
        firebaseUid: decodedToken.uid,
        firebaseEmail: decodedToken.email,
        environment: resolveBridgeEnvironment(env.NODE_ENV),
        sourceRef: request.headers.get("x-request-id") ?? undefined,
        bridgeSecret,
      } as never
    );

    if (!rawSnapshot || typeof rawSnapshot !== "object") {
      return new Response(
        JSON.stringify({ status: "error", error: "invalid_bridge_snapshot" }),
        { status: 502, headers: JSON_HEADERS }
      );
    }

    const snapshot = parseBridgeSnapshot(rawSnapshot);
    if (!snapshot.globalUserId || snapshot.globalUserId.trim() === "") {
      return new Response(
        JSON.stringify({ status: "error", error: "invalid_bridge_snapshot" }),
        { status: 502, headers: JSON_HEADERS }
      );
    }

    const replayGlowzSnapshot = resolveReplayGlowzEntitlementSnapshot({
      globalUserId: snapshot.globalUserId,
      entitlements: snapshot.entitlements,
    });

    const replayGlowzForClient = buildReplayGlowzClientSnapshot(
      snapshot,
      replayGlowzSnapshot
    );
    const replayGlowzGlobalUserId = snapshot.globalUserId;
    const replayGlowzProductUserId = replayGlowzForClient.productUserId
      ? replayGlowzForClient.productUserId
      : replayGlowzGlobalUserId;

    const productTokenPayload = replayGlowzSnapshot.hasAccess
      ? {
          globalUserId: replayGlowzGlobalUserId,
          productUserId: replayGlowzProductUserId,
          productUserIdSource: replayGlowzForClient.productUserIdSource,
          matchedProductId:
            replayGlowzSnapshot.matchedProductId ?? "replayglowz",
          reasonCode: replayGlowzSnapshot.reasonCode,
          issuer: getReplayGlowzProductJwtIssuer(env),
          audience: getReplayGlowzProductJwtAudience(env),
        }
      : null;

    let productToken: string | null = null;
    let productTokenIssue: string | null = null;

    if (productTokenPayload && productTokenPayload.productUserId) {
      productToken = await buildReplayGlowzProductToken(
        productTokenPayload,
        env
      );
      if (!productToken) {
        productTokenIssue = PRODUCT_TOKEN_NOT_CONFIGURED;
      }
    }

    const mirror = buildFirestoreSuiteAccessMirror({
      globalUserId: snapshot.globalUserId,
      entitlements: snapshot.entitlements,
    });

    await firebaseAdmin.firestore
      .collection("suiteAccess")
      .doc(decodedToken.uid)
      .set(
        {
          ...mirror,
          source: "suite_bridge_api",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    const response = {
      status: snapshot.status,
      globalUserId: snapshot.globalUserId,
      accounts: snapshot.accounts,
      entitlements: snapshot.entitlements,
      replayGlowz: replayGlowzForClient,
      ...(productToken ? { productToken, product_token: productToken } : {}),
      ...(productTokenIssue ? { productTokenIssue } : {}),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    console.error("Firebase bridge sync failed:", error);
    return new Response(
      JSON.stringify({ status: "error", error: "bridge_write_failed" }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
};
