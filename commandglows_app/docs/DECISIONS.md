---
artifact: decision_log
metadata_schema_version: "1.0"
artifact_version: "1.1.0"
project: "CommandGlows"
created: "2026-04-26"
updated: "2026-08-07"
status: "reviewed"
source_skill: "sf-docs"
scope: "product_and_platform"
owner: "Diane"
confidence: "high"
risk_level: "high"
security_impact: "yes"
docs_impact: "high"
depends_on:
  - "../shipglows_data/business/business.md@0.1.0"
  - "../shipglows_data/business/product.md@0.1.0"
evidence:
  - "SPEC_FLUTTER_SUPABASE_MIGRATION.md"
  - "../docs/MIGRATION_FLUTTER.md"
supersedes:
  - "2026-04-26 long-term platform direction"
next_step: "Review readiness for chrome-extension-platform-parity-and-windows-coexistence."
---

# Decisions — CommandGlows

## 2026-08-07 — Chrome extension becomes the next distribution priority (reviewed)

### Decision

CommandGlows will start its next platform tranche with a standalone Chrome
extension. The extension targets maximum technically safe parity with Android
and Windows outcomes, rather than a reduced companion or a launcher for the
desktop app. It must work for users who do not install CommandGlows on Windows.

The extension's single browser purpose is to capture, transform, reuse and
insert text where the user writes. Auth, synchronized snippets, dictionary,
history, dictation, text actions and recoverable delivery are parity targets.
Android IME behavior, continuous system clipboard capture, system media keys
and desktop-wide automation are adapted or unavailable where browser security
and store policy require it.

Chrome is the first extension target and discovery channel. Additional
Chromium browsers and Firefox are follow-up compatibility decisions after the
Chrome contract is proven.

### Coexistence contract

1. Users learn one preferred CommandGlows shortcut.
2. With only the extension installed, Chrome registers it. With only the
   desktop app installed, Windows registers it. With both installed, Windows is
   the single global registrar and delegates browser-context requests to the
   extension when a compatible Chrome tab is active.
3. The extension owns browser-tab selection and insertion after accepting a
   delegated request; Windows owns system-wide and non-browser actions.
4. Every trigger has one request owner and one insertion owner. Delegation
   transfers ownership and never causes both surfaces to execute the action.
5. Restricted pages and unsupported editors fail recoverably to preview/copy.
   Windows may resume only after an explicit extension rejection or bounded
   handoff timeout.
6. Native coordination is required for dual-install coexistence, but never for
   extension-only operation.

### Consequences

- The extension source root is `ext/`.
- Browser parity is a dedicated extension contract, not proof supplied by the
  existing Flutter web build.
- Host permissions must be minimal and preferably user-triggered.
- Page content, selected text, voice and generated text are sensitive user
  data and require explicit disclosure, safe handling and no background
  surveillance.
- The Windows registrar must not reserve the shortcut and also expect Chrome to
  receive it independently; dual-install mode requires an explicit handoff.
- The extension/Windows arbitration contract must be tested with extension
  only, Windows only, both installed, shortcut collision, restricted page and
  failed insertion scenarios.

## 2026-05-30 — Cross-platform parity becomes the product default (draft)

### Decision

Flutter remains the shared product/UI codebase for CommandGlows. CommandGlows should
target near-complete functional parity across Android, iOS, macOS, Windows,
Linux and web. Android-only, desktop-only, web-limited, or unavailable status
must be treated as an explicit exception caused by OS/browser/security/store
constraints, not as the default planning posture.

Platform split:

1. Android keeps the native Kotlin IME and Android foreground overlay host.
2. Windows becomes the next target for parity through a desktop overlay host:
   global hotkeys, always-on-top Flutter window, clipboard, focus, and
   best-effort text delivery.
3. The 2026-08-07 decision supersedes the next-surface order: Chrome extension
   is next, followed by the remaining native parity work according to current
   product priority and proof readiness.
4. Platform-adapted experiences are acceptable only when they produce a better
   user result. If the result is equivalent, keep the shared mental model and do
   not perturb the user.
5. Overlay/quick actions are a multi-platform product concept, not Android-only.
6. No platform may claim universal injection; clipboard fallback remains
   mandatory.

### Consequences

- Do not port Android overlay code directly to Windows; port the concept,
  interaction model, and shared Flutter UI.
- Do not promise a Windows IME.
- The first Windows wave should try to deliver the full workflow: hotkey,
  overlay, input, action, clipboard fallback, and automatic best-effort delivery.
- Documentation that marks a concept Android-only must justify the OS constraint
  or be updated to a parity target with an implementation/proof status.
- Documentation that says overlay is unavailable on Windows is stale once
  touched and must be replaced with "Windows target chantier, not implemented
  until Windows proof exists."
- The active chantier is
  `shipglows_data/workflow/specs/windows-desktop-overlay-hotkeys-parity.md`.

## 2026-05-19 — Suite identity exception for Clerk (reviewed)

### Decision

The "Clerk is legacy" rule applies only to direct target implementation inside the CommandGlows Android app repo. It does not forbid Clerk as the suite identity provider.

Current identity split:

1. Clerk is the long-term central identity provider for the CommandGlows suite and the CommandGlows Formation web/account surface.
2. Firebase Auth remains the CommandGlows Android app auth adapter for now.
3. A server-owned bridge maps Firebase `uid` and Clerk user id to `global_user_id`.
4. Product access is controlled by server-owned entitlements, not by account existence.

### Consequences

- Do not migrate the Android app directly to Clerk Flutter/native until Android device QA proves that path.
- Do not treat the old Expo/Convex/Clerk app stack as the Android target.
- Do treat Clerk as active suite identity context when working on `unified-suite-authentication`.
- Keep `commandglows_app` product data behind backend-neutral stores and Firebase/Firestore adapter boundaries until a later spec changes that.

## 2026-05-09 — Backend abstraction and Android-first execution (reviewed)

### Decision

CommandGlows no longer treats Supabase as the active backend target. The app must move to backend-agnostic data/settings contracts with Firebase as the first hosted adapter for the Android MVP.

1. Backend-facing Flutter code must use provider-neutral contracts such as settings, clipboard, transcription, snippets, dictionary and auth stores.
2. Firebase Auth + Firestore is the first remote adapter candidate for the Android MVP because it has a free Spark plan, does not use Supabase-style project pausing, supports Flutter/Android well, and is deployable through CLI-managed rules/indexes.
3. Supabase remains a migration artifact and reference only until removed or replaced. Do not add new Supabase-coupled product code.
4. GitHub Secrets remain the CI secret source for Android builds on Blacksmith.
5. Historical implementation focus was Android. This remains relevant for
   existing Android proof gates, but the 2026-05-30 parity decision supersedes
   any assumption that web or non-Android behavior can be ignored as product
   scope.
6. The proprietary Android keyboard implementation proceeds progressively: base typing and safety first, advanced gestures/modularity after the first usable keyboard slice.

### Consequences

- Existing Supabase SQL, docs and repositories are legacy/current-state material, not the future coupling point.
- New sync/settings work should introduce backend-neutral interfaces before adding Firebase implementation.
- Documentation that says "Flutter + Supabase target" is stale after this decision and must be updated as touched.
- Live backend validation waits until Firebase project/rules/indexes are created through CLI workflow.

## 2026-04-27 — Implementation target lock (reviewed)

Superseded in part by the 2026-05-09 backend decision above. Flutter remains valid. Supabase is no longer the active backend target and is now a migration/reference artifact.

### Decision

CommandGlows implementation target is now explicit and binding:

1. Client application target: **Flutter** (single Dart codebase).
2. Backend target: **Supabase** (Auth + Postgres + RLS + Realtime).
3. Day 1 platform target: **Android, iOS, macOS, Windows, Linux, web**.
4. Android overlay remains native Kotlin, exposed to Flutter through plugin/platform-channel contracts.
5. Convex, Clerk, Expo/React Native are **legacy references only** for the old app implementation during migration and are not valid direct Android app target architecture choices.

### Current stance

- This replaces the prior directional (non-committal) platform note.
- This decision is reviewed and ready for execution workstreams.
- Any implementation or doc that presents the old Convex/Clerk/Expo app stack as the Android app target is out of date. Clerk remains valid as the suite identity provider under the 2026-05-19 decision.

### Rationale

- The migration spec (`docs/SPEC_FLUTTER_SUPABASE_MIGRATION.md`) requires a repo end-state without app-level JS/TS implementation.
- Supabase provides first-class Flutter support and a clear contract for auth isolation with `auth.uid()` + RLS.
- Product scope requires synchronized multi-platform state, but only Android needs system overlay behavior.

### Consequences

- Architecture, API, component, and guideline docs must split legacy reference from target contracts.
- Backend contracts move from Convex function signatures to Supabase schema/policies/realtime contracts.
- Legacy stack can still be read for parity and migration verification, but not for target design decisions.
