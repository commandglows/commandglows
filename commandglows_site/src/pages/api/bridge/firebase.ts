import type { APIRoute } from "astro";
import { createHmac, randomUUID } from "node:crypto";
import { ConvexHttpClient } from "convex/browser";
import { getFirebaseAdminState } from "@/lib/firebaseAdmin";
import { getServerEnv } from "@/lib/serverEnv";
import {
  buildFirestoreSuiteAccessMirror,
  buildReplayGlowsProductToken,
  getBearerTokenFromAuthorizationHeader,
  getConvexBridgeSecret,
  getReplayGlowsProductJwtAudience,
  getReplayGlowsProductJwtIssuer,
  isTrustedFirebaseIdTokenClaims,
  resolveBridgeEnvironment,
  resolveReplayGlowsEntitlementSnapshot,
  type ReplayGlowsEntitlementReasonCode,
  type ReplayGlowsProductUserIdSource,
} from "@/lib/suiteBridge";
import { createCommerceCheckoutIdentityToken } from "@/lib/commerce/checkoutIdentity";
import {
  parseFirebaseBridgeRequest,
  type FirebaseBridgeRequest,
} from "@/lib/firebaseBridgeRequest";

export const prerender = false;

const JSON_HEADERS = { "Content-Type": "application/json" };
const PRODUCT_TOKEN_NOT_CONFIGURED = "product_token_not_configured";
const INSTALLATION_ID_HEADER = 'x-commandglows-installation-id';
const REQUEST_ID_HEADER = 'x-commandglows-request-id';
const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TRIAL_REASON_CODES = new Set([
  'installation_not_eligible',
  'previous_trial_exists',
  'trial_cycles_exhausted',
  'temporary_rate_limit',
  'active_paid_access',
]);

function bridgeJsonResponse(
  body: Record<string, unknown>,
  status: number,
  requestId: string,
  includeBodyRequestId: boolean
): Response {
  return new Response(
    JSON.stringify(includeBodyRequestId ? { ...body, requestId } : body),
    { status, headers: { ...JSON_HEADERS, [REQUEST_ID_HEADER]: requestId } }
  );
}

function logTrialRequest(
  requestId: string,
  outcome: string,
  reasonCode: string | null,
  status: number
) {
  console.info(JSON.stringify({ requestId, action: 'start', outcome, reasonCode, status }));
}

function hashTrialSignal(value: string, secret: string, purpose: string): string {
  return createHmac('sha256', secret).update(`${purpose}:${value}`).digest('hex');
}

function firstForwardedAddress(value: string | null): string | null {
  const candidate = value?.split(',')[0]?.trim();
  return candidate || null;
}

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
    source?: string | null;
    sourceRef?: string | null;
    trialStartedAt?: number | null;
    trialExpiresAt?: number | null;
    trialAttempt?: number | null;
    trialRestartsRemaining?: number | null;
    trialRestartEligible?: boolean;
  }>;
  replayGlowsProductUserId: string | null;
  replayGlowsProductUserIdSource: ReplayGlowsProductUserIdSource | null;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseNullableString(value: unknown): string | null {
  return isNonEmptyString(value) ? value.trim() : null;
}

function parseEpochMs(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const text = parseNullableString(value);
  if (!text) {
    return null;
  }
  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseReplayGlowsJwtSource(
  value: unknown
): ReplayGlowsProductUserIdSource | null {
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
  source?: string | null;
  sourceRef?: string | null;
  trialStartedAt?: number | null;
  trialExpiresAt?: number | null;
  trialAttempt?: number | null;
  trialRestartsRemaining?: number | null;
  trialRestartEligible?: boolean;
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
        source?: unknown;
        sourceRef?: unknown;
        trialStartedAt?: unknown;
        trialExpiresAt?: unknown;
        trialAttempt?: unknown;
        trialRestartsRemaining?: unknown;
        trialRestartEligible?: unknown;
      };
      const trialStartedAt =
        parseEpochMs(raw.trialStartedAt)
      const trialExpiresAt =
        parseEpochMs(raw.trialExpiresAt)

      return {
        productId: parseNullableString(raw.productId) ?? "",
        status: parseNullableString(raw.status) ?? "",
        plan: parseNullableString(raw.plan),
        source: parseNullableString(raw.source),
        sourceRef: parseNullableString(raw.sourceRef),
        trialStartedAt:
          trialStartedAt,
        trialExpiresAt:
          trialExpiresAt,
        trialAttempt: parseEpochMs(raw.trialAttempt),
        trialRestartsRemaining: parseEpochMs(raw.trialRestartsRemaining),
        trialRestartEligible: raw.trialRestartEligible === true,
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
    replayGlowsProductUserId: parseNullableString(
      raw.replayGlowsProductUserId
    ),
    replayGlowsProductUserIdSource: parseReplayGlowsJwtSource(
      raw.replayGlowsProductUserIdSource
    ),
  };
}

function buildReplayGlowsClientSnapshot(
  snapshot: BridgeSnapshot,
  replayGlows: {
    hasAccess: boolean;
    globalUserId: string | null;
    matchedProductId: string | null;
    reasonCode: ReplayGlowsEntitlementReasonCode;
  }
) {
  const productUserId =
    replayGlows.hasAccess && snapshot.replayGlowsProductUserId
      ? snapshot.replayGlowsProductUserId
      : snapshot.globalUserId;
  const productUserIdSource: ReplayGlowsProductUserIdSource =
    replayGlows.hasAccess &&
    snapshot.replayGlowsProductUserId &&
    snapshot.replayGlowsProductUserIdSource === "clerk"
      ? "clerk"
      : "globalUserId";

  return {
    hasAccess: replayGlows.hasAccess,
    globalUserId: replayGlows.globalUserId,
    matchedProductId: replayGlows.matchedProductId,
    reasonCode: replayGlows.reasonCode,
    productUserId,
    productUserIdSource,
  };
}

export const POST: APIRoute = async ({ request }) => {
  let bridgeRequest: FirebaseBridgeRequest;
  try {
    bridgeRequest = parseFirebaseBridgeRequest(await request.json());
  } catch {
    return bridgeJsonResponse(
      { status: 'bad_request', error: 'invalid_json' }, 400, randomUUID(), false
    );
  }

  const isTrialStart = bridgeRequest.trialAction === 'start';
  const incomingRequestId = request.headers.get(REQUEST_ID_HEADER)?.trim();
  const validRequestId = !incomingRequestId || REQUEST_ID_PATTERN.test(incomingRequestId);
  const requestId = validRequestId && incomingRequestId ? incomingRequestId : randomUUID();
  let trialOutcome = 'unknown';
  let trialReasonCode: string | null = null;
  const respond = (body: Record<string, unknown>, status: number) => {
    if (isTrialStart) logTrialRequest(requestId, trialOutcome, trialReasonCode, status);
    return bridgeJsonResponse(body, status, requestId, isTrialStart);
  };
  if (!validRequestId) {
    return respond({ status: 'bad_request', error: 'invalid_request_id' }, 400);
  }

  const env = getServerEnv();
  const bridgeSecret = getConvexBridgeSecret(env);
  const trialSignalSecret = env.SUITE_TRIAL_SIGNAL_SECRET;

  if (!bridgeSecret) {
    return respond(
      {
        status: "unavailable",
        error: "bridge_secret_not_configured",
      }, 503
    );
  }

  const installationId = request.headers.get(INSTALLATION_ID_HEADER)?.trim();
  if (!trialSignalSecret || !installationId || installationId.length > 128) {
    return respond(
      {
        status: "unavailable",
        error: "trial_installation_signal_unavailable",
      }, 503
    );
  }

  const installationHash = hashTrialSignal(
    installationId,
    trialSignalSecret,
    'commandglows-installation'
  );
  const networkAddress = firstForwardedAddress(
    request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip')
  );
  const networkHash = networkAddress
    ? hashTrialSignal(networkAddress, trialSignalSecret, 'commandglows-network')
    : undefined;

  const firebaseAdmin = getFirebaseAdminState(env);
  if (!firebaseAdmin) {
    return respond(
      {
        status: "unavailable",
        error: "firebase_admin_not_configured",
      }, 503
    );
  }

  const bearerToken = getBearerTokenFromAuthorizationHeader(
    request.headers.get("authorization")
  );
  if (!bearerToken) {
    return respond({ status: "unauthorized", error: "missing_bearer_token" }, 401);
  }

  const convexUrl = env.PUBLIC_CONVEX_URL;
  if (!convexUrl || convexUrl === "https://PLACEHOLDER.convex.cloud") {
    return respond({ status: "unavailable", error: "convex_not_configured" }, 503);
  }

    let decodedToken;
    try {
      decodedToken = await firebaseAdmin.auth.verifyIdToken(bearerToken, true);
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error &&
        typeof error.code === "string" && /^[a-z0-9_/-]{1,80}$/i.test(error.code)
          ? error.code
          : "unknown";
      if (isTrialStart) {
        console.warn(JSON.stringify({ requestId, action: "start", diagnostic: "firebase_token_verification_failed", errorCode: code }));
      } else {
        console.error("Firebase bridge token verification failed.");
      }
      return respond({ status: "unauthorized", error: "invalid_firebase_token" }, 401);
    }

  if (!isTrustedFirebaseIdTokenClaims(decodedToken, firebaseAdmin.projectId)) {
    return respond(
      {
        status: "unauthorized",
        error: "invalid_token_audience_issuer_or_subject",
      }, 401
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
        // Correlation IDs are deliberately separate from entitlement provenance.
        installationHash,
        networkHash,
        trialAction: bridgeRequest.trialAction,
        bridgeSecret,
      } as never
    );

    if (!rawSnapshot || typeof rawSnapshot !== "object") {
      return respond({ status: "error", error: "invalid_bridge_snapshot" }, 502);
    }

    const snapshot = parseBridgeSnapshot(rawSnapshot);
    if (!snapshot.globalUserId || snapshot.globalUserId.trim() === "") {
      return respond({ status: "error", error: "invalid_bridge_snapshot" }, 502);
    }

    const rawTrialRequest =
      isTrialStart && "trialRequest" in rawSnapshot
        ? (rawSnapshot as { trialRequest?: Record<string, unknown> }).trialRequest
        : undefined;
    const validTrialOutcome =
      rawTrialRequest?.outcome === "granted" ||
      rawTrialRequest?.outcome === "already_active" ||
      rawTrialRequest?.outcome === "denied";
    const validTrialReason =
      typeof rawTrialRequest?.reasonCode === "string" &&
      TRIAL_REASON_CODES.has(rawTrialRequest.reasonCode);
    if (
      isTrialStart &&
      (!validTrialOutcome ||
        (rawTrialRequest?.outcome === "denied" && !validTrialReason))
    ) {
      return respond({ status: "error", error: "invalid_trial_request_outcome" }, 502);
    }
    const trialRequest = isTrialStart
      ? {
          outcome: rawTrialRequest!.outcome,
          reasonCode:
            rawTrialRequest!.outcome === "denied"
              ? rawTrialRequest!.reasonCode
              : null,
          requestId,
        }
      : undefined;
    if (trialRequest) {
      trialOutcome = trialRequest.outcome as string;
      trialReasonCode = trialRequest.reasonCode as string | null;
    }

    const replayGlowsSnapshot = resolveReplayGlowsEntitlementSnapshot({
      globalUserId: snapshot.globalUserId,
      entitlements: snapshot.entitlements,
    });

    const replayGlowsForClient = buildReplayGlowsClientSnapshot(
      snapshot,
      replayGlowsSnapshot
    );
    const replayGlowsGlobalUserId = snapshot.globalUserId;
    const replayGlowsProductUserId = replayGlowsForClient.productUserId
      ? replayGlowsForClient.productUserId
      : replayGlowsGlobalUserId;

    const productTokenPayload = replayGlowsSnapshot.hasAccess
      ? {
          globalUserId: replayGlowsGlobalUserId,
          productUserId: replayGlowsProductUserId,
          productUserIdSource: replayGlowsForClient.productUserIdSource,
          matchedProductId:
            replayGlowsSnapshot.matchedProductId ?? "replayglows",
          reasonCode: replayGlowsSnapshot.reasonCode,
          issuer: getReplayGlowsProductJwtIssuer(env),
          audience: getReplayGlowsProductJwtAudience(env),
        }
      : null;

    let productToken: string | null = null;
    let productTokenIssue: string | null = null;

    if (productTokenPayload && productTokenPayload.productUserId) {
      productToken = await buildReplayGlowsProductToken(
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
          updatedAt: firebaseAdmin.serverTimestamp(),
        },
        { merge: true }
      );

    const checkoutIdentityToken = env.SUITE_COMMERCE_CHECKOUT_SECRET
      ? createCommerceCheckoutIdentityToken(
          snapshot.globalUserId,
          "commandglows_app",
          resolveBridgeEnvironment(env.NODE_ENV),
          env.SUITE_COMMERCE_CHECKOUT_SECRET
        )
      : null;

    const response = {
      status: snapshot.status,
      globalUserId: snapshot.globalUserId,
      accounts: snapshot.accounts,
      entitlements: snapshot.entitlements,
      replayGlows: replayGlowsForClient,
      ...(checkoutIdentityToken ? { checkoutIdentityToken } : {}),
      ...(productToken ? { productToken, product_token: productToken } : {}),
      ...(productTokenIssue ? { productTokenIssue } : {}),
      ...(trialRequest ? { trialRequest } : {}),
    };

    return respond(response, 200);
  } catch (error) {
    if (isTrialStart) {
      trialOutcome = "unknown";
      trialReasonCode = null;
      return respond({ status: "error", error: "bridge_write_failed" }, 500);
    }
    console.error("Firebase bridge sync failed:", error);
    return respond({ status: "error", error: "bridge_write_failed" }, 500);
  }
};
