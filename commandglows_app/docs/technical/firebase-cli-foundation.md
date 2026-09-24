---
artifact: firebase_foundation
metadata_schema_version: "1.0"
artifact_version: "1.1.0"
project: "CommandGlows"
created: "2026-05-10"
updated: "2026-09-17"
status: "reviewed"
source_skill: "sg-docs"
scope: "firebase-cli-foundation"
owner: "Diane"
confidence: "high"
risk_level: "high"
security_impact: "high"
docs_impact: "high"
depends_on:
  - "shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md@1.0.1"
supersedes: []
evidence:
  - ".firebaserc"
  - ".shipglows.flutter.json"
  - "scripts/flutter_config.py"
  - "firebase.json"
  - "firestore.rules"
  - "firestore.indexes.json"
next_step: "Prove authenticated access before treating either environment as production-ready."
---

# Firebase CLI Foundation

## Active environments

| Alias | Firebase project | Current foundation |
|---|---|---|
| `dev` | `commandglows-dev` | Email/password and default Firestore (`nam5`); rules and indexes deployed. |
| `prod` | `commandglows` | Email/password and default Firestore (`nam5`); rules and indexes deployed. |

No users or application data were migrated into these new projects. Retired
Firebase projects are not aliases and must never be used for a deployment.

## CLI use

From `commandglows_app`:

```bash
firebase use dev
firebase deploy --only firestore --project commandglows-dev
```

For the production target, use the explicit alias or project only after the
corresponding release work is authorized:

```bash
firebase use prod
firebase deploy --only firestore --project commandglows
```

`firebase.json` deploys Auth provider configuration and Firestore rules/indexes.
Do not deploy `storage`: Cloud Storage and storage rules are not provisioned in
the current foundation.

## Local Windows launch and Doppler

Local builds and runs use Doppler project `commandglows`. The managed Windows
recipe reads `dev`; it maps these public Firebase client fields to Flutter
defines through `scripts/flutter_config.py`:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_API_KEY`
- `FIREBASE_APP_ID`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_STORAGE_BUCKET`
- `SUITE_IDENTITY_BRIDGE_URL`

The resolver accepts `--environment dev` and `--environment prd` and rejects a
value set belonging to the other project. `prd` is synchronized and resolver
validated, but the managed interactive Windows recipe remains a development
recipe; it is not a production release command.

```powershell
s.cmd start commandglows-commandglows_app -FlutterDevice windows
```

The values above are client identifiers, not Firebase Admin or service-account
credentials. Never put an admin key, OAuth token, password, or server secret in
Doppler values that become Flutter defines.

## Auth and remote-data gates

Email/password is enabled in both Firebase projects. Google is enabled only in
`commandglows-dev`; its generated Web OAuth client ID is configured in Doppler
`commandglows/dev`. The Firebase Android app `1:9805404731:android:dfbca893b4205de88a1a1e`
is registered for `com.commandglows.app`, with this machine's debug SHA-1
attached. Google remains disabled in production. Do not claim Android Google
authentication until device smoke is complete.

Provider configuration is split by environment. Deploy Authentication only
with the matching explicit file and project: `firebase deploy --config
firebase.auth.dev.json --only auth --project commandglows-dev` for development,
or `firebase deploy --config firebase.auth.prd.json --only auth --project
commandglows` for production. The shared `firebase.json` intentionally has no
Authentication provider list, so an ordinary deploy cannot silently disable
Google in dev or enable it in production.

An invalid-credential response was observed for development, but no real user
sign-in, entitlement bridge, or authenticated Firestore operation has yet been
proved. Doppler dev currently points to
`https://dev.commandglows.com/api/bridge/firebase`; the Windows recipe now
forwards and validates this URL alongside the Firebase client configuration.
Vercel currently maps the `dev.commandglows.com` alias to a Production-target
deployment, so it is not an isolated Dev bridge. Vercel Development and Doppler
Dev do not contain the bridge-side Firebase Admin, Convex URL, bridge secret,
and trial-signal configuration needed for a standalone Dev deployment. An
unauthenticated probe without an installation signal returned
`503 trial_installation_signal_unavailable`; with a synthetic installation ID
it returned `401 missing_bearer_token`. These probes prove route reachability
and pre-auth checks only; no Firebase project, Convex environment, or trial
behavior was authenticated. Do not send a Dev Firebase token to this alias until
an isolated Dev bridge and its server configuration are established. The
available Vercel Preview bridge remains SSO-protected and is not an app-usable
endpoint.

Cloud Storage is not configured. Keyboard-theme backup and restore must remain
unproven until a bucket, storage rules, and upload/hydrate proof exist.

## CI and production boundary

Existing GitHub Actions/Blacksmith and Workload Identity Federation references
are historical CI work. They have not been rewired to the new `commandglows`
production project or to Doppler `prd` in this change. Local build/run policy
is Doppler-based; any CI migration or production deployment needs its own
review, least-privilege identity setup, and hosted proof.
