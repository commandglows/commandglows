---
artifact: technical_guidelines
metadata_schema_version: "1.0"
artifact_version: "1.0.1"
project: "CommandGlows"
created: "2026-03-18"
updated: "2026-05-19"
status: "reviewed"
source_skill: "sf-docs"
scope: "guidelines"
owner: "Diane"
confidence: "high"
risk_level: "high"
docs_impact: "yes"
security_impact: "yes"
evidence:
  - "docs/DECISIONS.md"
  - "docs/MIGRATION_FLUTTER.md"
  - "docs/API.md"
  - "modules/floating-overlay/android/src/main/java/expo/modules/floatingoverlay/FloatingOverlayModule.kt"
linked_systems:
  - "Flutter"
  - "Backend-agnostic stores"
  - "Firebase first adapter"
  - "Clerk suite identity"
  - "Android native overlay"
depends_on:
  - "shipglows_data/technical/architecture.md@0.1.0"
supersedes: []
next_review: "2026-05-27"
next_step: "$sf-docs update"
---

# Guidelines — CommandGlows

## Rule zero: target architecture precedence

For implementation and documentation decisions, use:

- Flutter client + backend-agnostic data/settings contracts as target baseline.
- Firebase Auth + Firestore is the first remote adapter for the Android MVP.
- Clerk is the suite identity provider for web/account surfaces, bridged to the app through server-owned `global_user_id` mapping and entitlements.

Do not present the old Convex/Clerk/Expo/React Native app stack or Supabase-coupled product code as the Android app target implementation.
Those app-stack references are legacy for migration parity only. This does not forbid Clerk as the suite-level identity provider.

## Legacy handling during migration

Allowed:

- reading legacy code/contracts to preserve behavior,
- patching legacy code only when needed to unblock migration safety or parity verification,
- referencing legacy APIs as "reference only" in docs.

Not allowed:

- introducing new Android app target features on Convex/Expo/Supabase-coupled paths or direct Clerk Flutter/native paths before a dedicated proof,
- adding new long-term contracts that depend on `TEMP_USER_ID`.

## Data and security guidelines

1. All user-scoped remote product data must be guarded by the selected backend security model.
2. Firebase adapter ownership checks must rely on Firebase Auth uid and Firestore Security Rules.
3. Do not trust client-sent user identifiers for authorization.
4. OpenAI and Anthropic keys stay in local secure storage only.
5. Never write API keys to remote data stores, logs, or analytics payloads.
6. Never persist empty/whitespace transcriptions.
7. Suite access must use server-owned entitlements; a Clerk account alone does not grant product access.

## API and schema change guidelines

- Update backend API/docs in the same change when adapter contracts, rules, indexes or schemas change.
- Keep data and security contracts explicit.
- For realtime behavior, document scope and ordering assumptions.
- Mark any Convex or Supabase references as legacy-only compatibility notes unless they describe the current adapter under active migration.
- When documenting auth, distinguish "Clerk as suite identity" from "Clerk Flutter/native as direct Android app auth", which remains unproven.

## Flutter implementation guidelines

- Use Dart-first feature modules (`voice`, `clipboard`, `settings`, `snippets`, `dictionary`, `auth`, `overlay`).
- Keep business logic out of widgets; use provider/controller + repository boundaries.
- Prefer typed domain models and explicit error states.
- Surface platform limitations directly in UI copy (for example overlay availability).

## Platform behavior guidelines

- Android overlay is native and Android-only.
- If injection fails, clipboard fallback must still deliver final text.
- Linux local speech mode is documented unavailable; advanced recording + Whisper path remains available.
- Permission failures must produce explicit recovery paths, never silent no-op behavior.

## Documentation guidelines

- Every owned doc must keep a `Legacy` vs `Target` split where relevant.
- `status: reviewed` is valid only when the doc does not contradict Flutter + backend-agnostic/Firebase-first target.
- Keep `artifact_version: 0.1.0` unless schema-level metadata changes require a version bump.
