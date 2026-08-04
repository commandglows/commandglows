import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

type FirebaseAdminConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

type FirebaseAdminState = {
  projectId: string;
  auth: ReturnType<typeof getAuth>;
  firestore: ReturnType<typeof getFirestore>;
};

let cachedState: FirebaseAdminState | null = null;

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

export function getFirebaseAdminState(
  env: Record<string, string | undefined>
): FirebaseAdminState | null {
  if (cachedState) {
    return cachedState;
  }

  const config = getFirebaseAdminConfigFromEnv(env);
  if (!config) {
    return null;
  }

  const existingApp = getApps()[0];
  const app =
    existingApp ??
    initializeApp({
      credential: cert({
        projectId: config.projectId,
        clientEmail: config.clientEmail,
        privateKey: config.privateKey,
      }),
      projectId: config.projectId,
    });

  cachedState = {
    projectId: config.projectId,
    auth: getAuth(app),
    firestore: getFirestore(app),
  };

  return cachedState;
}
