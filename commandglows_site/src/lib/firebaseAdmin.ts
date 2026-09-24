import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
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
  firestore: FirebaseAdminFirestoreWriter;
  serverTimestamp: () => unknown;
};

type FirebaseAdminFirestoreWriter = {
  collection: (name: string) => {
    doc: (id: string) => {
      set: (
        data: Record<string, unknown>,
        options: { merge: true }
      ) => Promise<unknown>;
    };
  };
};

type FirestoreRestValue = Record<string, unknown>;
type AccessTokenSupplier = () => Promise<string>;
const REST_SERVER_TIMESTAMP = Symbol("firestore-rest-server-timestamp");

function encodeFirestoreValue(value: unknown): FirestoreRestValue {
  if (value === null) return { nullValue: null };
  if (value === REST_SERVER_TIMESTAMP) {
    throw new Error("firestore_server_timestamp_requires_transform");
  }
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) throw new Error("invalid_firestore_date");
    return { timestampValue: value.toISOString() };
  }
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("invalid_firestore_number");
    return Number.isSafeInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encodeFirestoreValue) } };
  }
  if (value instanceof Map) {
    return {
      mapValue: {
        fields: Object.fromEntries(
          [...value.entries()]
            .filter(([, entry]) => entry !== REST_SERVER_TIMESTAMP)
            .map(([key, entry]) => [key, encodeFirestoreValue(entry)])
        ),
      },
    };
  }
  if (typeof value === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value)
            .filter(([, entry]) => entry !== REST_SERVER_TIMESTAMP)
            .map(([key, entry]) => [key, encodeFirestoreValue(entry)])
        ),
      },
    };
  }
  throw new Error("unsupported_firestore_value");
}

function encodeFieldPathSegment(segment: string): string {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(segment)) return segment;
  return `\`${segment.replace(/\\/g, "\\\\").replace(/`/g, "\\`")}\``;
}

function collectMergeFieldPaths(
  value: unknown,
  prefix = ""
): { paths: string[]; transforms: string[] } {
  if (value === REST_SERVER_TIMESTAMP) {
    return { paths: [], transforms: [prefix] };
  }
  if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
    const entries = value instanceof Map ? [...value.entries()] : Object.entries(value);
    if (entries.length === 0 && prefix) return { paths: [prefix], transforms: [] };
    return entries.reduce(
      (result, [key, entry]) => {
        const path = prefix
          ? `${prefix}.${encodeFieldPathSegment(String(key))}`
          : encodeFieldPathSegment(String(key));
        const child = collectMergeFieldPaths(entry, path);
        result.paths.push(...child.paths);
        result.transforms.push(...child.transforms);
        return result;
      },
      { paths: [] as string[], transforms: [] as string[] }
    );
  }
  return prefix ? { paths: [prefix], transforms: [] } : { paths: [], transforms: [] };
}

function getFirestoreRestFields(data: Record<string, unknown>): Record<string, FirestoreRestValue> {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== REST_SERVER_TIMESTAMP)
      .map(([key, value]) => [key, encodeFirestoreValue(value)])
  );
}

export function getFirestoreRestServerTimestamp(): unknown {
  return REST_SERVER_TIMESTAMP;
}

export function createFirestoreRestWriter(
  projectId: string,
  getAccessToken: AccessTokenSupplier,
  fetchImpl: typeof fetch = fetch
): FirebaseAdminFirestoreWriter {
  return {
    collection: (collectionName) => ({
      doc: (documentId) => ({
        set: async (data, options) => {
          if (options?.merge !== true) {
            throw new Error("firestore_rest_writer_requires_merge");
          }

          const { paths, transforms } = collectMergeFieldPaths(data);
          const query = new URLSearchParams();
          for (const path of paths) query.append("updateMask.fieldPaths", path);
          for (const fieldPath of transforms) {
            query.append("updateTransforms.fieldPath", fieldPath);
            query.append("updateTransforms.setToServerValue", "REQUEST_TIME");
          }
          const documentPath = [
            "projects", projectId, "databases", "(default)", "documents",
            collectionName, documentId,
          ].map(encodeURIComponent).join("/");
          const accessToken = await getAccessToken();
          const response = await fetchImpl(
            `https://firestore.googleapis.com/v1/${documentPath}?${query.toString()}`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ fields: getFirestoreRestFields(data) }),
            }
          );
          if (!response.ok) {
            throw new Error(`firestore_rest_write_failed:${response.status}`);
          }
        },
      }),
    }),
  };
}

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

function createFirebaseWifCredential(config: FirebaseAdminWifConfig): {
  credential: Credential;
  getAccessToken: AccessTokenSupplier;
} {
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

  const getAccessToken = async (): Promise<string> => {
    const { token } = await externalAccountClient.getAccessToken();
    if (!token) throw new Error("firebase_wif_access_token_unavailable");
    return token;
  };
  return {
    getAccessToken,
    credential: {
      getAccessToken: async () => {
        const accessToken = await getAccessToken();
        const expiryDate = externalAccountClient.credentials.expiry_date;
        return {
          access_token: accessToken,
          expires_in: expiryDate
            ? Math.max(1, Math.floor((expiryDate - Date.now()) / 1000))
            : 3600,
        };
      },
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
  const wifAuth = wifConfig ? createFirebaseWifCredential(wifConfig) : null;
  const existingApp = wifConfig
    ? getApps().find((app) => app.name === wifAppName)
    : getApps()[0];
  const app =
    existingApp ??
    initializeApp({
      credential: wifConfig
        ? wifAuth!.credential
        : cert({
            projectId: config!.projectId,
            clientEmail: config!.clientEmail,
            privateKey: config!.privateKey,
          }),
      projectId: wifConfig?.projectId ?? config!.projectId,
    }, wifAppName);

  const state: FirebaseAdminState = {
    projectId: wifConfig?.projectId ?? config!.projectId,
    auth: getAuth(app),
    firestore: wifConfig
      ? createFirestoreRestWriter(wifConfig.projectId, wifAuth!.getAccessToken)
      : (getFirestore(app) as unknown as FirebaseAdminFirestoreWriter),
    serverTimestamp: wifConfig
      ? getFirestoreRestServerTimestamp
      : () => FieldValue.serverTimestamp(),
  };
  cachedStates.set(cacheKey, state);
  return state;
}
