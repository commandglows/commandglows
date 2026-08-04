---
artifact: migration_plan
metadata_schema_version: "1.0"
artifact_version: "0.1.0"
project: "CommandGlows"
created: "2026-04-26"
updated: "2026-05-09"
status: "superseded"
source_skill: "sf-docs"
scope: "full_rewrite_flutter_supabase"
owner: "Diane"
confidence: "high"
risk_level: "high"
security_impact: "yes"
docs_impact: "high"
depends_on:
  - "docs/DECISIONS.md@0.1.0"
  - "docs/SPEC_FLUTTER_SUPABASE_MIGRATION.md@0.1.0"
evidence:
  - "../docs/SPEC_FLUTTER_SUPABASE_MIGRATION.md"
  - "../modules/floating-overlay/android/src/main/java/expo/modules/floatingoverlay/FloatingOverlayModule.kt"
  - "../docs/API.md"
supersedes: []
superseded_by: "shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md"
next_step: "execute domain workstreams with explicit write-sets"
---

# Migration Contract — Flutter + Supabase

> Legacy reference: this migration contract was superseded by
> `shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md`. Flutter remains the app
> foundation, but Supabase is no longer the active backend target.
>
> Archived migration contract: do not use this document as an execution plan
> for new backend changes.

## Review outcome

This document is a reviewed migration contract, not an exploratory draft.

Locked target:

- Flutter client is the implementation target.
- Supabase (Auth + Postgres + RLS + Realtime) is the backend target.
- Android, iOS, macOS, Windows, Linux, and web are Day 1 platforms.
- Android overlay remains native Kotlin, bridged to Flutter.

Legacy stack status:

- Expo / React Native, Convex, and Clerk are legacy references only.

## Scope of execution

### In scope

- Rebuild all user-facing workflows in Flutter.
- Replace Convex contracts with Supabase schema + RLS + realtime.
- Implement real auth isolation with Supabase Auth (`auth.uid()`).
- Preserve Android overlay behavior with Flutter bridge contract.
- Maintain parity for Voice, Clipboard, Settings, Snippets, Dictionary.
- Keep OpenAI/Anthropic keys local to device storage.

### Out of scope

- Billing and premium entitlement logic.
- iOS/macOS/Windows/Linux/web system-wide overlay equivalent.
- Automatic migration of production Convex user data.

## Non-negotiable constraints

1. No app-level JS/TS implementation in final repository state.
2. No `TEMP_USER_ID` / `local-user` equivalent in target architecture.
3. RLS enabled on all user tables before multi-user readiness.
4. Empty/whitespace transcriptions are never persisted.
5. Overlay failures must always fall back to clipboard-safe result flow.
6. Secrets (OpenAI/Anthropic keys) are never stored in Supabase.

## Legacy to target mapping

| Domain | Legacy reference | Target contract |
|---|---|---|
| App shell | Expo Router tabs | Flutter navigation (`go_router`) |
| State | React hooks | Riverpod providers/controllers |
| Backend | Convex TS schema/functions | Supabase SQL schema + RLS + realtime |
| Auth | Clerk planned, not integrated | Supabase Auth mandatory |
| Secure storage | `expo-secure-store` | `flutter_secure_storage` (platform-aware) |
| Speech local | `expo-speech-recognition` | `speech_to_text` where supported |
| Audio recording | `expo-audio` | `record` |
| Overlay bridge | Expo native module bridge | Flutter plugin/platform channel to Kotlin |

## Workstream sequence (reviewed)

1. Documentation alignment and decision lock (this document + dependent docs).
2. Supabase schema and RLS contract implementation.
3. Flutter app shell, routing, state, and auth session lifecycle.
4. Voice pipeline (free/local + advanced/Whisper + optional Claude cleanup).
5. Clipboard, snippets, dictionary, settings feature parity.
6. Android overlay bridge and native parity verification.
7. Multi-platform behavior verification (Android/iOS/macOS/Windows/Linux/web).
8. Final legacy code removal and repository-level JS/TS absence check.

## Readiness gates

### Gate A — Documentation coherence

- `docs/DECISIONS.md` explicitly locks Flutter + Supabase target.
- `shipglows_data/technical/architecture.md`, `shipglows_data/technical/guidelines.md`, `docs/API.md`, `docs/COMPONENTS.md` split legacy vs target.
- No owned doc presents Convex/Clerk/Expo as target implementation.

### Gate B — Backend security baseline

- Supabase tables for `profiles`, `transcriptions`, `clipboard_items`, `snippets`, `dictionary_terms`, `user_settings`.
- RLS + per-table policy set based on `auth.uid()`.
- Realtime subscription contract documented and verified for user-scoped updates.

### Gate C — Product parity baseline

- Voice, Clipboard, Settings, Snippets, Dictionary workflows usable in Flutter.
- Android overlay supports show/hide/start/stop/cancel/injection fallback behaviors.
- Platform limitations are explicit in UI and docs.

### Gate D — Final migration completion

- Legacy app-level JS/TS implementation removed.
- Flutter + Supabase contracts validated through tests and manual matrix.
- Documentation reflects only target architecture as implementation truth.

## Risk controls

### Highest risk: Android overlay parity

- Keep Kotlin overlay code as migration source of truth.
- Preserve event semantics (`tap`, `stop`, `cancel`, `long-press`) and fallback behavior.

### Highest risk: Auth/RLS mistakes

- Enforce `auth.uid()` ownership checks at SQL policy layer.
- Reject any client-provided user identity patterns in target implementation.

### Highest risk: platform capability gaps

- Linux local speech mode documented as unavailable; advanced recording + Whisper path remains available.
- Overlay capability remains Android-only by contract.

## Current readiness snapshot (2026-04-27)

- Decision lock: reviewed.
- Migration contract: reviewed.
- Dependent docs: must stay coherent with this target in every update.
- Code implementation: pending (this document does not claim runtime parity yet).
