---
artifact: review_report
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-04-27"
updated: "2026-05-11"
status: "reviewed"
source_skill: "sf-docs"
scope: "flutter_supabase_migration"
owner: "Diane"
confidence: "high"
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
period: "2026-04-27"
verified_outcomes:
  - "Security readiness blockers were integrated into the Flutter + Supabase migration spec."
assumptions:
  - "This review is retained as migration history after the Firebase/backend-agnostic decision."
reviewed_spec: "docs/SPEC_FLUTTER_SUPABASE_MIGRATION.md"
depends_on:
  - "docs/SPEC_FLUTTER_SUPABASE_MIGRATION.md@0.1.0"
supersedes:
  - "SECURITY_REVIEW_FLUTTER_SUPABASE.md"
evidence:
  - "docs/SPEC_FLUTTER_SUPABASE_MIGRATION.md"
next_step: "/sf-docs update"
---

# Security Readiness Review - Flutter + Supabase Migration

## Verdict

Integrated into `docs/SPEC_FLUTTER_SUPABASE_MIGRATION.md` on 2026-04-27.

The migration spec correctly identifies the major security areas: Supabase Auth/RLS, no client-provided user IDs, local-only OpenAI/Anthropic keys, Android-only overlay with clipboard fallback, no empty saves, no secret logging, and rollback-before-purge. That is a good baseline, but the current contract is still too high-level for a safe multi-agent rewrite.

The blockers below were used as the integration checklist for the ready spec and target docs before build work starts.

## Already Covered

- Supabase replaces Convex and must use real Auth plus RLS.
- `TEMP_USER_ID` / `local-user` must not be reproduced.
- User OpenAI and Anthropic keys must not be stored in Supabase.
- Client-side Whisper/Claude calls are recognized as a BYOK/power-user model, not a controlled SaaS model.
- Permission failures must be recoverable and must not lose generated text.
- Android overlay is explicitly Android-only and must fall back to clipboard.
- Empty transcriptions/clipboard items must not be saved.
- Final JS/TS purge is delayed until parity and replacement docs exist.
- Snapshot/rollback before destructive purge is required.

## Blockers

1. Dependency docs are not coherent with the migration target.
   `shipglows_data/business/business.md`, `shipglows_data/business/product.md`, `shipglows_data/technical/architecture.md`, `shipglows_data/technical/guidelines.md`, `docs/API.md`, `docs/DECISIONS.md`, and `docs/MIGRATION_FLUTTER.md` still describe draft/current-state Expo, Convex, Clerk, or "directional" Flutter decisions. `docs/MIGRATION_FLUTTER.md` also recommends Android first/iOS second, while the spec requires Android/iOS/macOS/Windows/Linux/web Day 1. A fresh agent could implement against contradictory source documents.

2. Supabase Auth/RLS is underspecified.
   The spec says `auth.uid() = user_id`, but does not require concrete SQL contracts: `user_id uuid not null default auth.uid()`, authenticated-only grants, RLS enabled on every user table, `using` and `with check` policies for insert/update/delete, unique constraints scoped by `user_id`, ownership checks for deletes by ID, realtime authorization behavior, and tests proving cross-user read/write/delete denial. This is a hard blocker because the current app's Convex functions accept client-provided `userId`.

3. Direct OpenAI/Anthropic client calls need a platform threat model.
   BYOK can be acceptable for native apps, but the spec must explicitly state that client-side keys are visible to a compromised device/app/browser environment, that WinGlows cannot enforce central spend limits for user-owned keys, and that web builds may need different behavior if direct browser calls are blocked or too exposing. If a proxy is introduced for web, the spec must define whether keys ever touch the proxy, how they are redacted, and what rate/cost controls exist.

4. Secure storage is not defined per platform.
   `flutter_secure_storage` is named, but the spec must define platform behavior for Android, iOS, macOS, Windows, Linux, and web, including unavailable/degraded secure storage, deletion/revocation of keys, biometric/keychain backup expectations if any, and whether cloud AI modes are disabled when secure storage is not acceptable. Web storage must be documented as materially weaker than mobile keychain/keystore storage.

5. Logging and error handling need a redaction contract.
   The current code has copyable debug logs and API error paths that can include raw exception text. The migration spec must require typed user-safe errors, redacted technical logs, no raw OpenAI/Anthropic/Supabase response bodies in UI or copyable logs, no transcript/audio/key material in crash reports, and a clear distinction between local debug logs and any future remote telemetry.

6. Clipboard privacy is not safe enough as specified.
   The current product polls clipboard content and syncs it. The migration spec only says polling should be configurable and respectful of platform restrictions. It must require explicit opt-in for clipboard capture/sync, visible on/off state, pause/disable controls, max length, no background capture where platform rules forbid it, sensitive-content safeguards, and clear UX that clipboard data may be stored in Supabase and synced across devices.

7. Android overlay/accessibility service needs stricter abuse boundaries.
   The spec covers permissions and fallback but not enough adversarial constraints. It must require user-visible foreground notification, service lifecycle cleanup, no injection into password/sensitive fields where detectable, no silent/background transcription start, explicit accessibility permission wording, bounded overlay state transitions, and tests for no focused field, non-editable field, locked screen/background, and rapid tap/stop/cancel races.

8. Offline, concurrency, and deletion semantics are not contractually defined.
   The spec names concurrency/offline edge cases but does not choose behavior. It must define conflict resolution for transcript edits, snippets, dictionary terms, clipboard pin/delete, duplicate clipboard items, deletion while another device edits, Supabase timeout/retry idempotency, realtime out-of-order events, and whether "delete wins" uses tombstones or direct deletes.

9. Abuse/rate/cost protection is missing.
   Billing is out of scope, but security readiness still needs local guardrails: max audio duration/file size, max transcript/clipboard/snippet/dictionary length, bounded retries, no automatic retry loops against OpenAI/Anthropic/Supabase, upload timeout behavior, and user-facing cost warnings for BYOK usage. Without this, a bug or overlay race can burn user API credits.

10. Final purge safety needs an exact deletion gate.
    The spec requires a snapshot and parity before purge, but the purge task should explicitly list keep/delete rules, generated-file exceptions, who owns the destructive step, a dry-run command, and post-purge checks. Do not allow agents to remove Kotlin overlay references, docs, assets, Supabase migrations, or platform files until the replacement artifacts are verified.

## Non-Blocking Recommendations

- Keep BYOK as an explicit beta/power-user posture in product copy; do not imply enterprise privacy, centralized quota protection, or E2E encryption.
- Add a small security section to Settings explaining where audio/text goes in local, Whisper, Claude, clipboard sync, and overlay flows.
- Add Supabase local test fixtures for two users and a malicious client attempting cross-user CRUD by ID.
- Prefer explicit sync status per item over a global "synced" label, especially for offline/error recovery.
- Add a security review checklist to `docs/VERIFICATION.md` so final ship cannot pass with auth/RLS, key storage, logs, overlay, or clipboard unchecked.

## Exact Spec/Doc Changes Needed

Update `docs/SPEC_FLUTTER_SUPABASE_MIGRATION.md`:

- Keep implementation blocked until the items below are added.
- Add a "Security Contract" section covering Auth/RLS, client-side BYOK keys, direct AI calls, secure storage, logging redaction, clipboard privacy, Android overlay/accessibility, abuse limits, offline/concurrency, and purge safety.
- Add concrete Supabase RLS requirements: all user tables require `user_id uuid not null default auth.uid()`, RLS enabled, authenticated-only policies, `using` and `with check`, scoped unique constraints, cross-user deny tests, and no service role key in any client.
- Add platform-specific secure storage behavior and cloud-AI disable/fallback rules when secure storage is unavailable or degraded.
- Add direct OpenAI/Anthropic platform matrix: native mobile, desktop, web; include CORS/proxy decision for web before implementation.
- Add clipboard opt-in/privacy acceptance criteria.
- Add overlay/accessibility abuse-case acceptance criteria.
- Add offline/concurrency/deletion acceptance criteria.
- Add abuse/cost acceptance criteria for max duration, max payload sizes, retry limits, and timeout behavior.
- Expand Task 19 with dry-run purge, exact keep/delete rules, and post-purge verification.

Update `docs/API_SUPABASE.md` before implementation:

- Define tables, columns, constraints, indexes, and RLS policies for `profiles`, `transcriptions`, `clipboard_items`, `snippets`, `dictionary_terms`, `user_settings`, and any debug/event metadata.
- Include SQL test cases for allowed own-user CRUD and denied cross-user CRUD.
- Define realtime subscriptions and authorization expectations.
- Define deletion semantics and conflict resolution.

Update source-of-truth docs before implementation:

- `docs/DECISIONS.md`: replace the directional Flutter note with the actual Flutter + Supabase migration decision or explicitly keep the spec blocked.
- `docs/MIGRATION_FLUTTER.md`: resolve the platform-scope conflict between Android-first recommendation and Day 1 all-platform spec.
- `shipglows_data/business/business.md`, `shipglows_data/business/product.md`, `shipglows_data/technical/architecture.md`, `shipglows_data/technical/guidelines.md`, `docs/API.md`: mark current Expo/Convex/Clerk material as legacy/current-state only, or replace it with Flutter/Supabase target docs so agents do not implement stale contracts.
- `docs/PLATFORM_BEHAVIOR.md`: document per-platform audio, clipboard, secure storage, AI call, and overlay limitations.
- `docs/OVERLAY_ANDROID.md`: document accessibility permission wording, foreground service behavior, injection rules, fallback behavior, and abuse/race tests.
- `docs/VERIFICATION.md`: include a security gate for RLS, secrets, logs, clipboard privacy, overlay/accessibility, offline/concurrency, cost limits, and final purge.
