## 2026-05-11 - Android real-device overlay + IME QA

- Scope: feature
- Environment: local Android real device
- Tester: user
- Source: sf-test
- Status: fail
- Confidence: high
- Result summary: Overlay does not appear; Settings overlay button does not trigger visible activation despite overlay and accessibility permissions granted.
- Bug pointer: BUG-2026-05-11-001 -> shipglows_data/workflow/bugs/BUG-2026-05-11-001.md
- Evidence pointer: user-provided redacted Settings diagnostic copied at 2026-05-11 10:23:41 UTC.
- Follow-up: /sf-fix BUG-2026-05-11-001

## 2026-05-16 - Keyboard crash recovery Android real-device QA

- Scope: spec keyboard-resilience-and-error-management
- Environment: Android real device
- Tester: user
- Source: sf-test
- Status: fail
- Confidence: high
- Result summary: Crash recovery passed for `#+=`, `Prefs`, long press `123`, compact functional behavior, Termux flows; failures remain for `123` long-press discoverability and compact mode overlapped by Android bottom bar.
- Bug pointer: BUG-2026-05-16-002 -> bugs/BUG-2026-05-16-002.md; BUG-2026-05-16-003 -> bugs/BUG-2026-05-16-003.md
- Evidence pointer: user report in sf-test reply at 2026-05-16 08:34:01 UTC; no private diagnostic pasted.
- Follow-up: /sf-fix BUG-2026-05-16-003 then /sf-fix BUG-2026-05-16-002

## 2026-05-16 - Backend Provider logs panel retest

- Scope: bug BUG-2026-05-16-004
- Environment: Android real device / web Settings
- Tester: user
- Source: sf-test manual confirmation
- Status: pass
- Confidence: high
- Result summary: Backend Provider Logs and Diagnostics opens without the red Flutter assertion panel; previous unbounded log panel crash is fixed.
- Bug pointer: BUG-2026-05-16-004 -> bugs/BUG-2026-05-16-004.md
- Evidence pointer: user confirmation in chat at 2026-05-16 09:27:41 UTC.
- Follow-up: closed

## 2026-05-16 - Android keyboard Termux/modifier regression retest

- Scope: keyboard Android IME regression checks
- Environment: Android real device, Termux and other apps
- Tester: user
- Source: sf-test manual confirmation
- Status: pass
- Confidence: high
- Result summary: `Del` works in Termux and no longer activates `MAJ`; `Ctrl+J` inserts a newline; long press `MAJ` keeps shift active after the first letter.
- Bug pointer: none dedicated; removes these cases from the remaining manual QA checklist.
- Evidence pointer: user confirmation in chat at 2026-05-16 13:23:53 UTC.
- Follow-up: continue remaining action-bar/page-swipe, compact-mode, theme/effects, private-field checks.

## 2026-05-16 - Keyboard Theme Studio Android/web retest confirmations

- Scope: Keyboard Theme Studio and native keyboard theme behavior
- Environment: Android real device and web preview where applicable
- Tester: user
- Source: sf-test manual confirmation
- Status: pass
- Confidence: high
- Result summary: Theme preview container is sticky; color picker works; key gap setting works; key press effects work.
- Bug pointer: none dedicated in this run; these items are removed from the remaining manual QA checklist.
- Evidence pointer: user confirmations in chat before and at 2026-05-16 13:23:53 UTC.
- Follow-up: continue remaining Android action-bar pagination, action-row behavior, private-field, and compact-mode bottom spacing checks.

## 2026-05-16 - Media brightness controls
- Added Android `WRITE_SETTINGS` brightness onboarding and `Bri-`/`Bri+` media action row buttons.
- `flutter analyze`: PASS.
- `git diff --check`: PASS.
- `cd android && ./gradlew :app:compileDebugKotlin -x :app:processDebugResources`: PASS.
- Manual Android APK verification: pending.

## 2026-05-16 - Android manual QA retest from user
Environment: Android APK on real phone.

### PASS
- Media: Now with access shows current media when available.
- Media: App opens current media app.
- Media: Bri-/Bri+ with Write Settings permission changes brightness.
- Media: Prev, Play/Pause, Next still work.
- Media paged row: horizontal swipe is page-by-page.
- Media paged row: page 2 shows Bri-/Bri+.
- Onboarding: Android settings buttons redirect correctly.
- Onboarding: skip recommended steps still works.
- Navigation: DelW← works.
- Navigation: DelW→ works in Termux, SMS, browser, email.
- Navigation: Début/Fin work in non-Termux text apps.
- Termux: Del, Ctrl+J, long-press MAJ, Paste work.
- Action bars: main bar compact, contextual bars page-swipe, Nav pinning, pinned color all pass.
- Compact: ABC, preferences, bottom positioning, bottom bar overlap pass.
- Theme: sticky preview, color picker, gaps, effects, action-bar coloring, preview key widths pass.
- Layout: DEL/ENTER widths, letter alignment, symbols layout, Escape, 10-digit row pass.
- Logs: diagnostic panel opens and collapses.

### FAIL / unresolved
- DelW→ in Obsidian Android deletes one letter left instead of one word right.
- Début/Fin fail in Termux.
- Copy/Cut fail in Termux.
- Compact mode fails for navigation/media/clipboard/symbols/accents panels.
- Diagnostic text does not include mediaSessionAccessGranted/systemSettingsWriteGranted labels.
- Clear logs button not confirmed.

### Fixes applied after this QA
- Diagnostic now exposes media_session_access and system_settings_write.
- Compact panel mode suppresses typing rows for active panels, and navigation has a compact 2-row scrollable panel.
- Obsidian DelW→ now avoids the direct delete-after-cursor path and uses Ctrl+ForwardDelete fallback.
- Termux Début/Fin now use Ctrl+A/Ctrl+E fallback.

## 2026-05-16 - Compact panel height follow-up
- User confirmed keyboard status diagnostic is fixed.
- User reported compact Navigation, Media, Accents, Emoji use only 2 rows but should use the full 3-row compact surface.
- Updated compact Navigation to 3 rows.
- Updated compact Accents to 3 rows.
- Updated compact Emoji to category row + 2 emoji rows.
- Updated compact Media to 3 rows.
- `git diff --check`: PASS.
- `cd android && ./gradlew :app:compileDebugKotlin -x :app:processDebugResources`: PASS.
- Manual Android APK verification: pending.

## 2026-05-16 - Termux navigation retest follow-up
- User confirmed Obsidian delete left/right works.
- User confirmed Termux Début/Fin works.
- User confirmed Termux word-left movement and DelW→ work.
- User reported Termux DelW← fails again.
- Copy/Cut in Termux remain known target-app limitation.
- Fix applied: Termux DelW← now sends Ctrl+W instead of relying on extracted text or Ctrl+Backspace.
- Manual Android APK verification: pending.

## 2026-05-16 - Media extended controls
- Added media actions: Vol-, Vol+, Stop, Shuffle, Loop.
- Vol-/Vol+ use Android music stream volume.
- Stop uses active media session stop when supported, otherwise media stop key.
- Shuffle/Loop use active media session custom actions when the app exposes matching actions; otherwise they report unsupported.
- Added actions to contextual media row and compact media panel.
- `git diff --check`: PASS.
- `cd android && ./gradlew :app:compileDebugKotlin -x :app:processDebugResources`: PASS.
- Manual Android APK verification: pending.

## 2026-05-19 - Android ASR catalogue APK physical-device QA

- Scope: spec shipglows_data/workflow/specs/asr-language-pack-catalog.md
- Environment: android-physical-device, debug APK sha=37116dd run=26091472372 ref=master
- Tester: user
- Source: sf-test
- Status: fail
- Confidence: high
- Result summary: On-device Speech catalogue is visible with French, Hindi, and English entries and diagnostics confirm cloud fallback disabled; keyboard action-bar mic launches Android SpeechRecognizer successfully but without enough user-visible fallback/mode explanation, Hindi pack remove appears no-op, and overlay start still blocks the interface without visible recording result.
- Bug pointer: BUG-2026-05-19-001 -> shipglows_data/workflow/bugs/BUG-2026-05-19-001.md; BUG-2026-05-19-002 -> shipglows_data/workflow/bugs/BUG-2026-05-19-002.md; BUG-2026-05-11-001 -> shipglows_data/workflow/bugs/BUG-2026-05-11-001.md
- Evidence pointer: user report and redacted diagnostic copied in chat, generated_at_utc=2026-05-19T11:29:02.175437Z
- Follow-up: /sf-fix Android ASR catalogue physical-device QA failures

## 2026-05-19 - Android ASR catalogue QA fix attempt

- Scope: spec shipglows_data/workflow/specs/asr-language-pack-catalog.md
- Source: sf-fix
- Status: fix-attempted; Android APK retest pending
- Fixes applied:
  - Keyboard mic fallback status now stays explicit during Android SpeechRecognizer start/listen/record/result states.
  - Removed/not-installed language packs no longer expose an active misleading Remove action; provider no-ops repeated removal.
  - Overlay window keeps non-focusable/non-touch-modal flags across states and Settings no longer claims started when returned status is running=false.
- Local validation:
  - flutter analyze: PASS
  - flutter test test/language_pack_catalog_test.dart test/settings_platform_controllers_test.dart test/widget_test.dart: PASS
  - git diff --check: PASS
  - ./gradlew :app:testDebugUnitTest --tests '*KeyboardVoiceRuntimeStatusTest': BLOCKED locally by AAPT2 runner incompatibility before unit test execution; CI/Blacksmith required for Android proof.
- Follow-up: /sf-ship Android ASR catalogue physical-device QA fixes, then /sf-test Android ASR catalogue APK physical-device retest

## 2026-05-20 - Android ASR fallback push-to-stop follow-up

- Scope: spec shipglows_data/workflow/specs/asr-language-pack-catalog.md
- Source: sf-fix
- Status: fix-attempted; Android APK retest pending
- Bug pointer: BUG-2026-05-20-001 -> shipglows_data/workflow/bugs/BUG-2026-05-20-001.md
- User report: action-bar Mic starts recording animation and shows `Android speech fallback: listening (missing_pack)`, but stops after a few seconds instead of waiting for the user to press Mic again.
- Fix applied:
  - Removed app-side 10s Android fallback timeout.
  - Increased Android SpeechRecognizer segment window hints.
  - Treats Android no-match/speech-timeout and non-manual final results as internal segments, restarts fallback while the WinGlows session remains active, and inserts accumulated text only on explicit stop.
- Follow-up: /sf-ship BUG-2026-05-20-001, then /sf-test --retest BUG-2026-05-20-001 on Android real device
- Local validation after fix:
  - flutter analyze: PASS
  - flutter test test/language_pack_catalog_test.dart test/settings_platform_controllers_test.dart test/widget_test.dart: PASS
  - git diff --check: PASS
  - cd android && ./gradlew :app:compileDebugKotlin -x :app:processDebugResources: PASS

## 2026-05-22 - Android ASR fallback and speech-pack action retest

- Scope: spec shipglows_data/workflow/specs/asr-language-pack-catalog.md
- Source: sf-test -> sf-fix
- Status: failed retest, fix-attempted again; Android APK retest pending
- Bug pointers:
  - BUG-2026-05-20-001 -> keyboard mic Android fallback still auto-stops with `failed (runtime_load_failed)`
  - BUG-2026-05-19-002 -> speech-pack rows/actions still appear grayed or silent on real device
- User report:
  - Action-bar Mic shows `Android speech fallback: failed (runtime_load_failed)` and still stops without explicit user stop.
  - Pressing again before the auto-stop can stop it manually.
  - Package details/actions appear grayed; install appears to do nothing; logs mention `Runtime Unavailable`.
- Fix applied:
  - Android fallback now retries `ERROR_CLIENT` / `ERROR_RECOGNIZER_BUSY` as bounded delayed restarts instead of immediately failing the user-facing session.
  - Second mic tap now stops the active fallback session even while a restart is pending.
  - Settings install/retry now gives visible success/blocked feedback, syncs successful installs to the keyboard runtime config, probes native runtime status, and reloads keyboard diagnostics.
  - Non-installable fallback/unavailable catalogue rows now state that they are status-only rows with no downloadable local pack.
- Local validation:
  - flutter analyze: PASS
  - flutter test test/language_pack_catalog_test.dart test/settings_platform_controllers_test.dart test/widget_test.dart: PASS
  - git diff --check: PASS
  - cd android && ./gradlew :app:compileDebugKotlin -x :app:processDebugResources: PASS
- Follow-up: /sf-ship BUG-2026-05-20-001 BUG-2026-05-19-002, then /sf-test Android ASR catalogue APK physical-device retest

## 2026-05-21 - Task 10 - WinGlows suite authentication smoke readiness

- Scope: spec shipglows_data/workflow/specs/unified-suite-authentication.md, Task 10
- Environment: docs / proof planning only; no deployed Firebase / Convex / Firestore smoke evidence yet
- Tester: Codex
- Source: sf-start / docs tranche
- Status: partial-blocked
- Confidence: medium
- Result summary: Redacted smoke-readiness note for the first inter-product proof pair. "Smoke" in this chantier means the minimum end-to-end proof that the suite wiring works in a real deployed environment, not exhaustive QA: a real account is recognized, product entitlement allow/deny behaves correctly, session restore and sign-out behave correctly, grant/revoke flips access, and backend data stays denied when entitlement is absent.
- Plain French smoke definition: preuve minimale de bout en bout sur WinGlows Formation + WinGlows app; on vérifie le chemin critique et les refus attendus, pas toutes les combinaisons ni toute la QA produit.
- Checklist - can be verified locally now:
  - Redaction review: no tokens, secrets, raw payment payloads, or raw OAuth payloads in this log entry.
  - Markdown structure: task, status, scope, summary, checklist, and manual-action sections are present.
  - Docs alignment: this entry stays consistent with the canonical suite auth decision and the support runbook.
- Checklist - requires deployed environment:
  - WinGlows Formation deployed with the current suite-auth bridge path enabled.
  - WinGlows app deployed against the intended Firebase project and Firestore rules.
  - Deployed proof that `suiteAccess/{uid}` or the equivalent server-owned mirror flips allow/deny in the target environment.
  - Deployed proof that backend reads stay denied when the entitlement is missing.
  - Deployed proof that session restore and sign-out behave correctly on the real pair.
- Checklist - requires Diane/manual action:
  - Confirm the target deployment environment for the proof pair and keep local, preview, staging, and production separate.
  - Set and verify the environment names only, not values, for `SUITE_BRIDGE_SYNC_URL`, `SUITE_BRIDGE_CONVEX_SECRET`, and `SUITE_IDENTITY_BRIDGE_URL`.
  - Verify the Formation bridge runtime has the Firebase Admin service-account / project credentials it needs to validate Firebase ID tokens.
  - Use a real test account flow in Formation / Clerk, then apply the entitlement grant and revoke in the source of truth for `winglowz_formation`.
  - Re-run the sync path after the grant and after the revoke so the Firestore mirror is recomputed from Convex.
  - Perform the real-device WinGlows app smoke against the deployed environment and confirm the app stays local-only when `winglowz_app` entitlement is absent.
  - Capture redacted evidence for the deployed smoke only after the environment proves grant, deny, restore, sign-out, and backend deny.
- Manual actions needed from Diane:
  - Deploy the Formation backend with the current bridge and sync configuration.
  - Deploy the WinGlows app to the proof environment with the matching Firebase / Firestore configuration.
  - Run the grant/revoke path for a test user and confirm the server-owned entitlement ledger changes first.
  - Confirm the Firestore mirror updates through the server path rather than any client-side edit.
  - Record the final deployed proof once the real Firebase / Convex / Firestore evidence exists.
- Current status: partial and blocked until deployed Firebase / Convex / Firestore smoke proof exists.
- Follow-up: keep Task 10 open until the deployed proof pair is captured and redacted.

## 2026-05-22 - WinGlows suite auth deployed endpoint preflight

- Scope: spec shipglows_data/workflow/specs/unified-suite-authentication.md, Task 10
- Environment: production URLs, non-secret HTTP preflight only
- Tester: Codex
- Source: sf-test + sf-auth-debug
- Status: blocked
- Confidence: high
- Result summary: `https://winglowz-app.vercel.app/` returned 200 and `https://www.winglowz.com/` returned 200, but `POST https://www.winglowz.com/api/bridge/firebase` and `POST https://www.winglowz.com/api/bridge/sync` returned 404. The deployed Formation site does not expose the bridge endpoints required for the real suite-auth smoke yet.
- Bug pointer: none; current code changes appear not deployed, so this is a deployment/proof blocker rather than a confirmed runtime bug.
- Evidence pointer: redacted command evidence from 2026-05-22 sf-test/sf-auth-debug run; no tokens, cookies, or secrets sent.
- Follow-up: ship/deploy the bounded suite-auth bridge scope, run `/sf-prod winglowz`, then rerun `/sf-test unified-suite-authentication --prod`.

## 2026-05-22 - WinGlows suite auth production env verification

- Scope: spec shipglows_data/workflow/specs/unified-suite-authentication.md, Task 10
- Environment: Vercel production projects `winglowz` and `winglowz-app`
- Tester: Codex
- Source: sf-prod
- Status: blocked
- Confidence: high
- Result summary: Both Vercel deployments are `Ready`, but runtime/env verification fails. `winglowz` has no Clerk publishable key configured and the bridge endpoints return 500 with Clerk middleware error `Publishable key is missing`; Vercel env listing for `winglowz` shows only old plugin/YouTube/Supabase variables, not the suite-auth Clerk/Convex/Firebase/Polar variables. `winglowz-app` has no production env variables, including no `SUITE_IDENTITY_BRIDGE_URL` or Firebase web config variables.
- Bug pointer: none; this is the existing suite-auth deployment blocker, not a separate code bug yet.
- Evidence pointer: Vercel deployment IDs `dpl_pUXyznYzN11EVBnmoQNNKUvg5s9Z` for `winglowz` and `dpl_8SYHy8d8xNR16Qj17vfYSkwUwWYJ` for `winglowz-app`; Vercel env names and redacted runtime logs only, no secret values captured.
- Follow-up: configure required Vercel env vars for both projects, redeploy, then rerun `/sf-prod winglowz` and `/sf-test unified-suite-authentication --prod`.

## 2026-05-22 - WinGlows suite auth endpoint middleware fix

- Scope: spec shipglows_data/workflow/specs/unified-suite-authentication.md, Task 10
- Environment: local Formation repo `/home/claude/winglowz`; production still requires push/redeploy
- Tester: Codex
- Source: sf-auth-debug
- Status: partial-fixed-local
- Confidence: high
- Result summary: Formation middleware now bypasses Clerk for server-owned endpoints that authenticate themselves (`/api/bridge/*`, webhook proxies, and newsletter APIs). `/api/polar/checkout` still goes through Clerk because it needs `locals.auth()`. CORS is now allowlist-based through `SUITE_API_ALLOWED_ORIGINS` instead of relying on a single site origin.
- Local proof:
  - `pnpm vitest run tests/middleware/authRouting.test.ts`: PASS
  - `pnpm build:check`: PASS
  - `pnpm test:unit`: PASS
  - Local `POST http://127.0.0.1:3011/api/bridge/firebase` without Clerk secrets returned JSON `503 bridge_secret_not_configured`, proving the route now fails inside the bridge controller instead of crashing in Clerk middleware.
  - Local `POST` with allowed origin `http://localhost:4321` reflected that origin; disallowed origin did not receive `Access-Control-Allow-Origin`.
- Manual action needed from Diane: configure the real production env names/values, including Clerk keys, suite bridge/Firebase/Convex vars, and `SUITE_API_ALLOWED_ORIGINS` with the WinGlows app web origin.
- Follow-up: push/redeploy the Formation patch, then rerun `/sf-prod winglowz` and `/sf-test unified-suite-authentication --prod`.

## 2026-05-24 - Clipboard manual CRUD and edit-dialog crash retest

- Scope: BUG-2026-05-24-002 clipboard edit dialog cancel/save retest, manual clipboard CRUD, persistence, search/copy/pin, and Android IME clipboard import
- Environment: Android APK physical-device QA, operator-reported
- Tester: Diane
- Source: sf-test
- Status: pass
- Confidence: high
- Result summary: Manual clipboard tests requested by Codex pass, including the previously crashing edit dialog close paths and the clipboard keyboard/IME check.
- Bug pointer: BUG-2026-05-24-002 -> shipglows_data/workflow/bugs/BUG-2026-05-24-002.md
- Evidence pointer: operator report in chat, 2026-05-24 17:57:08 UTC.
- Follow-up: closed

## 2026-07-17 - Layered logo return-to-home transition

- Scope: BUG-2026-07-17-001
- Environment: hosted site report; local structural proof
- Tester: Diane / Codex
- Source: 107-sg-test
- Status: not run
- Confidence: high
- Result summary: Operator reported color/white logo-layer separation on `/fr/produits` -> `/fr`; the bounded fix passes `build:check` (0 erreur, 2 hints) and 71 unit tests, awaiting visual retest.
- Bug pointer: BUG-2026-07-17-001 -> shipglows_data/workflow/bugs/BUG-2026-07-17-001.md
- Evidence pointer: winglowz_site/tests/deployment/logoNavigation.test.ts
- Follow-up: /107-sg-test --retest BUG-2026-07-17-001
