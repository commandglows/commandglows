---
artifact: firebase_foundation
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "CommandGlows"
created: "2026-05-10"
updated: "2026-05-14"
status: "reviewed"
source_skill: "sf-docs"
scope: "firebase-cli-foundation"
owner: "Diane"
confidence: "high"
risk_level: "high"
security_impact: "high"
docs_impact: "high"
depends_on:
  - "shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md@0.1.0"
supersedes: []
evidence:
  - ".firebaserc"
  - "firebase.json"
  - "firestore.rules"
  - "firestore.indexes.json"
next_step: "/sf-docs technical audit"
---

# Firebase CLI Foundation

This doc captures Firebase CLI commands for the backend-agnostic migration slice.

- Active Firebase project ID: `commandglows-dev`
- Display name may remain `CommandGlows Dev`; project IDs cannot use underscores.
- Target: Auth + Firestore + Cloud Storage, single development environment (`dev`)
- Adapter scope: `users/{uid}` private subtree for settings/clipboard/transcriptions/snippets/dictionaryTerms/clientEvents

## CLI bootstrap commands

```bash
firebase login
firebase projects:list
firebase use commandglows-dev
```

The repo includes `.firebaserc` aliases for `default` and `dev`, both pointing to
`commandglows-dev`.

## Deploy commands

From repo root:

```bash
firebase deploy --only firestore
firebase deploy --only storage
```

To deploy rules or indexes separately:

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only storage
```

## Emulator workflow

Start local emulators:

```bash
firebase emulators:start --only firestore,auth
firebase emulators:start --only firestore,auth,storage
```

Start emulators with persistent emulator-state export:

```bash
firebase emulators:start --only firestore,auth --import=./.firebase/emulator-data --export-on-exit
firebase emulators:start --only firestore,auth,storage --import=./.firebase/emulator-data --export-on-exit
```

## Auth provider setup (required set)

- Anonymous
- Email/password
- Google

> Auth provider enablement is done in Firebase project settings. Re-run the local/prod command list above after provider and API key changes.

Android package name for Firebase app registration:

```text
com.commandglows.app
```

Google Sign-In on Android also needs the app signing SHA fingerprints in the
Firebase Android app settings before a real-device auth smoke can pass.

Google provider verification checklist:

- Enable Email/password and Google in Firebase Authentication providers.
- Confirm Android package name is exactly `com.commandglows.app`.
- Register the SHA-1 and SHA-256 fingerprints for every debug, CI, and release
  signing key used to install an APK.
- Download/regenerate `google-services.json` after provider, OAuth client, or
  fingerprint changes.
- Confirm the generated config includes the web OAuth client used by
  `google_sign_in` for ID-token authentication, or pass that OAuth 2.0 Web
  client ID explicitly as `FIREBASE_WEB_CLIENT_ID`.
- `FIREBASE_WEB_CLIENT_ID` is the Web OAuth client ID ending in
  `.apps.googleusercontent.com`; it is used as Android Google Sign-In
  `serverClientId`, not as a Firebase Android app id.
- Run one Android smoke after each provider/SHA/client change; a Google flow
  reported as `canceled` after account selection may still be configuration
  failure, not user intent.

## Flutter runtime defines

CommandGlows initializes Firebase conditionally. Missing values keep the app in
local mode instead of crashing.

```bash
flutter run \
  --dart-define=FIREBASE_PROJECT_ID=commandglows-dev \
  --dart-define=FIREBASE_API_KEY="$FIREBASE_API_KEY" \
  --dart-define=FIREBASE_APP_ID="$FIREBASE_APP_ID" \
  --dart-define=FIREBASE_MESSAGING_SENDER_ID="$FIREBASE_MESSAGING_SENDER_ID" \
  --dart-define=FIREBASE_AUTH_DOMAIN="$FIREBASE_AUTH_DOMAIN" \
  --dart-define=FIREBASE_STORAGE_BUCKET="$FIREBASE_STORAGE_BUCKET" \
  --dart-define=FIREBASE_WEB_CLIENT_ID="$FIREBASE_WEB_CLIENT_ID"
```

Runtime adapters currently use:

- Firebase Auth behind `AuthSessionStore`
- Firestore settings behind `SettingsStore`
- Firestore clipboard, transcriptions, snippets and dictionary stores behind
  feature store interfaces
- Firebase Storage behind keyboard theme image backup and restore
- Local fallback when Firebase config or user session is missing
- Supabase only as legacy compatibility fallback when Firebase is not configured

Auth diagnostics must stay redacted. Support copy, local diagnostics, and Sentry
events may include category/code context, but not API keys, OAuth/JWT tokens,
password-like fields, raw provider payloads, clipboard text, transcripts, or
other user content.

Keyboard theme image backup specifics:

- Cloud Storage bucket must be configured through `FIREBASE_STORAGE_BUCKET`.
- The app stores keyboard theme images under owner-scoped paths `users/{uid}/keyboard_theme_assets/{assetId}`.
- Firestore remains the manifest source of truth; image bytes and local device paths must never be written to Firestore.
- Storage rules rely on the default Firestore database and the server-owned `suiteAccess/{uid}` mirror for `commandglows_app`.
- Storage adds quota and billing impact; do not promise reinstall recovery until provider/device proof confirms upload + hydrate.

## GitHub Secrets / Blacksmith list

Use repository secrets with explicit environment prefixes. The workflow maps
them to neutral runtime names based on branch:

- branch `dev` => `DEV_*`
- branch `main` => `PROD_*`

Required secret families:

- `DEV_FIREBASE_PROJECT_ID` / `PROD_FIREBASE_PROJECT_ID`
- `DEV_GCP_WIF_PROVIDER` / `PROD_GCP_WIF_PROVIDER`
- `DEV_GCP_WIF_SERVICE_ACCOUNT` / `PROD_GCP_WIF_SERVICE_ACCOUNT`
- `DEV_FIREBASE_API_KEY` / `PROD_FIREBASE_API_KEY`
- `DEV_FIREBASE_APP_ID` / `PROD_FIREBASE_APP_ID`
- `DEV_FIREBASE_MESSAGING_SENDER_ID` / `PROD_FIREBASE_MESSAGING_SENDER_ID`
- `DEV_FIREBASE_AUTH_DOMAIN` / `PROD_FIREBASE_AUTH_DOMAIN`
- `DEV_FIREBASE_STORAGE_BUCKET` / `PROD_FIREBASE_STORAGE_BUCKET`
- `DEV_FIREBASE_WEB_CLIENT_ID` / `PROD_FIREBASE_WEB_CLIENT_ID`

The app itself only reads neutral runtime names such as `FIREBASE_PROJECT_ID`,
`FIREBASE_API_KEY`, and `FIREBASE_WEB_CLIENT_ID`.

The APK workflow validates the target Firebase Auth config before building. The
project in `FIREBASE_PROJECT_ID` must have `identitytoolkit.googleapis.com` and
`securetoken.googleapis.com` enabled, and the Identity Toolkit project config
must be readable.

## CI deploy setup

Use Workload Identity Federation (OIDC) for GitHub Actions instead of a static
service-account JSON key.

Create a dedicated service account in Google Cloud IAM for `commandglows-dev` and
grant the least broad role that can deploy Firestore rules and indexes. Then
create a Workload Identity Pool + Provider for GitHub and allow that provider
to impersonate the deploy service account.

Typical setup commands (replace placeholders):

```bash
gcloud iam workload-identity-pools create github \
  --project="$PROJECT_ID" \
  --location="global" \
  --display-name="GitHub Actions"

gcloud iam workload-identity-pools providers create-oidc github-repo \
  --project="$PROJECT_ID" \
  --location="global" \
  --workload-identity-pool="github" \
  --display-name="GitHub repo provider" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
  --attribute-condition="assertion.repository=='OWNER/REPO'"

gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT_EMAIL" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/OWNER/REPO"
```

Store in GitHub secrets:

- `GCP_WIF_PROVIDER`
- `GCP_WIF_SERVICE_ACCOUNT`

The workflow `.github/workflows/android-build.yml` authenticates with
`google-github-actions/auth@v3`, then runs:

```bash
firebase deploy --only firestore --project "$FIREBASE_PROJECT_ID"
```

The deploy job runs on `dev`, `main`, or manual `workflow_dispatch`.
Pull requests still run analyze/tests, but do not deploy Firestore.
