import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getVercelOidcToken } from "@vercel/oidc";
import { IdentityPoolClient } from "google-auth-library";
import type { Credential } from "firebase-admin/app";
import { createHash } from "node:crypto";

type FirebaseAdminConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

type FirebaseAdminWifConfig = {
  projectId: string;
  audience: string;
  serviceAccountEmail: string;
};

type FirebaseAdminState = {
  projectId: string;
  auth: ReturnType<typeof getAuth>;
  firestore: ReturnType<typeof getFirestore>;
};

const cachedStates = new Map<string, FirebaseAdminState>();

function normalizePrivateKey(value: string): string {
  return value.replace(/\\n/g, "\n");
}

function parseJsonServiceAccount(raw: string): FirebaseAdminConfig | null {
  try {
    const parsed = JSON.parse(raw) as {
      project_id?: unknown;
      client_email?: unknown;
      private_key?: unknown;
    };

    const projectId = typeof parsed.project_id === "string" ? parsed.project_id.trim() : "";
    const clientEmail =
      typeof parsed.client_email === "string" ? parsed.client_email.trim() : "";
    const privateKey =
      typeof parsed.private_key === "string" ? normalizePrivateKey(parsed.private_key) : "";

    if (!projectId || !clientEmail || !privateKey) {
      return null;
    }

    return { projectId, clientEmail, privateKey };
  } catch {
    return null;
  }
}

export function getFirebaseAdminConfigFromEnv(
  env: Record<string, string | undefined>
): FirebaseAdminConfig | null {
  const serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (serviceAccountJson) {
    const parsed = parseJsonServiceAccount(serviceAccountJson);
    if (parsed) {
      return parsed;
    }
  }

  const projectId = env.FIREBASE_PROJECT_ID?.trim() ?? "";
  const clientEmail = env.FIREBASE_CLIENT_EMAIL?.trim() ?? "";
  const privateKey = normalizePrivateKey(env.FIREBASE_PRIVATE_KEY?.trim() ?? "");

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return { projectId, clientEmail, privateKey };
}

export function getFirebaseAdminWifConfigFromEnv(
  env: Record<string, string | undefined>
): FirebaseAdminWifConfig | null {
  if (env.FIREBASE_ADMIN_CREDENTIAL_MODE !== "workload_identity_federation") {
    return null;
  }

  const projectId = env.FIREBASE_PROJECT_ID?.trim() || env.GCP_PROJECT_ID?.trim() || "";
  const projectNumber = env.GCP_PROJECT_NUMBER?.trim() ?? "";
  const poolId = env.GCP_WORKLOAD_IDENTITY_POOL_ID?.trim() ?? "";
  const providerId = env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID?.trim() ?? "";
  const serviceAccountEmail = env.GCP_SERVICE_ACCOUNT_EMAIL?.trim() ?? "";

  if (!projectId || !projectNumber || !poolId || !providerId || !serviceAccountEmail) {
    return null;
  }

  return {
    projectId,
    audience: `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`,
    serviceAccountEmail,
  };
}

function createFirebaseWifCredential(config: FirebaseAdminWifConfig): Credential {
  const externalAccountClient = new IdentityPoolClient({
    audience: config.audience,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    service_account_impersonation_url:
      `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(config.serviceAccountEmail)}:generateAccessToken`,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    subject_token_supplier: {
      getSubjectToken: async () => getVercelOidcToken(),
    },
  });

  return {
    getAccessToken: async () => {
      const { token } = await externalAccountClient.getAccessToken();
      if (!token) throw new Error("firebase_wif_access_token_unavailable");
      const expiryDate = externalAccountClient.credentials.expiry_date;
      return {
        access_token: token,
        expires_in: expiryDate
          ? Math.max(1, Math.floor((expiryDate - Date.now()) / 1000))
          : 3600,
      };
    },
  };
}

export function getFirebaseAdminState(
  env: Record<string, string | undefined>
): FirebaseAdminState | null {
  const credentialMode = env.FIREBASE_ADMIN_CREDENTIAL_MODE?.trim();
  if (
    credentialMode &&
    credentialMode !== "workload_identity_federation" &&
    credentialMode !== "service_account"
  ) {
    return null;
  }
  const wifConfig = getFirebaseAdminWifConfigFromEnv(env);
  const wifRequested = credentialMode === "workload_identity_federation";
  const config = wifRequested ? null : getFirebaseAdminConfigFromEnv(env);
  if ((wifRequested && !wifConfig) || (!wifRequested && !config)) return null;

  const cacheKey = wifConfig
    ? `wif:${wifConfig.projectId}:${wifConfig.audience}:${wifConfig.serviceAccountEmail}`
    : `service-account:${config!.projectId}:${config!.clientEmail}`;
  const cachedState = cachedStates.get(cacheKey);
  if (cachedState) return cachedState;

  const wifAppName = wifConfig
    ? `firebase-admin-wif-${createHash("sha256")
        .update(`${wifConfig.projectId}:${wifConfig.audience}:${wifConfig.serviceAccountEmail}`)
        .digest("hex")}`
    : undefined;
  const existingApp = wifConfig
    ? getApps().find((app) => app.name === wifAppName)
    : getApps()[0];
  const app =
    existingApp ??
    initializeApp({
      credential: wifConfig
        ? createFirebaseWifCredential(wifConfig)
        : cert({
            projectId: config!.projectId,
            clientEmail: config!.clientEmail,
            privateKey: config!.privateKey,
          }),
      projectId: wifConfig?.projectId ?? config!.projectId,
    }, wifAppName);

  const state = {
    projectId: wifConfig?.projectId ?? config!.projectId,
    auth: getAuth(app),
    firestore: getFirestore(app),
  };
  cachedStates.set(cacheKey, state);
  return state;
}
