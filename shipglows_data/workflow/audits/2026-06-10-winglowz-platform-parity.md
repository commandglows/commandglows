---
artifact: audit
metadata_schema_version: "1.0"
artifact_version: "0.1.0"
project: "WinGlows"
created: "2026-06-10"
updated: "2026-06-10"
status: "draft"
source_skill: "sf-platform-parity"
scope: "winglowz-platform-parity"
owner: "Diane"
confidence: "medium"
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
content_surfaces:
  - "winglowz_app"
  - "shipglows_data"
linked_systems:
  - "winglowz_app/lib/core/platform/platform_capabilities.dart"
  - "winglowz_app/lib/core/platform/desktop_overlay_bridge.dart"
  - "winglowz_app/lib/core/platform/windows_overlay_bridge.dart"
  - "winglowz_app/android/app/src/main/AndroidManifest.xml"
  - "winglowz_app/ios/Runner/Info.plist"
  - "winglowz_app/macos/Runner/Info.plist"
  - "winglowz_app/macos/Runner/MainFlutterWindow.swift"
  - "winglowz_app/linux/runner/my_application.cc"
  - "winglowz_app/windows/runner/flutter_window.cpp"
  - "winglowz_app/docs/PLATFORM_BEHAVIOR.md"
  - "winglowz_app/docs/VERIFICATION.md"
  - "winglowz_app/TEST_LOG.md"
depends_on:
  - artifact: "winglowz_app/docs/PLATFORM_BEHAVIOR.md"
    artifact_version: "1.0.1"
    required_status: "reviewed"
supersedes: []
evidence:
  - "User request 2026-06-10: /sf-platform-parity WinGlows platforms=android,ios,windows,macos,linux,web"
  - "Platform direction in winglowz_app/README.md targets near-complete parity across Android, iOS, macOS, Windows, Linux, and web."
  - "Desktop overlay specs and checklists exist for Windows, macOS, and Linux; native runner QA is still pending."
next_step: "/sf-spec WinGlows iOS app parity and quick actions"
---

# WinGlows Platform Parity Audit

## Verdict

WinGlows has a strong shared Flutter product base and the right native-host
direction, but platform parity is not yet complete enough for a broad public
"supported everywhere" claim.

The current state is:

- Android: strongest implementation, but still has physical-device proof gaps
  for IME, overlay, auth and recording edge cases.
- Windows: first desktop overlay/hotkeys implementation exists; Windows native
  QA is not run.
- macOS: first desktop overlay/quick-action implementation exists; macOS native
  QA is not run.
- Linux: first desktop overlay implementation exists with an accepted degraded
  hotkey/paste scope; Linux native QA is not run.
- iOS: scaffold and speech/microphone permissions exist, but no iOS parity
  chantier or native quick-action/share/shortcut host exists.
- Web: Flutter web and auth surfaces exist, but OS overlay/IME/local speech and
  secure storage are degraded; explicit web parity contract is missing.

## Capability Matrix

| Capability | User expectation | Platform | Verdict | Evidence | Gap | Owner route | QA route | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Shared Flutter app shell and feature UI | Same core product navigation and data surfaces everywhere | Android | `same` | `lib/features/**`, `test/widget_test.dart`, app README | `test-proof` | `sf-verify` | Mature shared UI, Android native proof remains separate. |
| Shared Flutter app shell and feature UI | Same core product navigation and data surfaces everywhere | iOS | `unknown` | `ios/Runner/*` scaffold, shared Flutter code | `manual-qa` | `sf-spec` | Needs iOS app parity spec and simulator/device smoke. |
| Shared Flutter app shell and feature UI | Same core product navigation and data surfaces everywhere | Windows | `unknown` | `windows/runner/**`, shared Flutter code | `manual-qa` | `sf-test` | Desktop native proof pending. |
| Shared Flutter app shell and feature UI | Same core product navigation and data surfaces everywhere | macOS | `unknown` | `macos/Runner/**`, shared Flutter code | `manual-qa` | `sf-test` | Desktop native proof pending. |
| Shared Flutter app shell and feature UI | Same core product navigation and data surfaces everywhere | Linux | `unknown` | `linux/runner/**`, shared Flutter code | `manual-qa` | `sf-test` | Desktop native proof pending. |
| Shared Flutter app shell and feature UI | Same core product navigation and data surfaces everywhere | Web | `degraded-accepted` | `web/**`, `google_sign_in_web`, web auth tests | `test-proof` | `sf-spec` | Browser limits require explicit degraded parity contract. |
| Voice capture and transcription | Record/dictate text, preserve recoverable text, and save/copy result | Android | `same` | `speech_to_text`, Android permissions, voice tests and manual Android notes | `manual-qa` | `sf-test` | Android keyboard dictation had previous device failures; retest remains required before broad claims. |
| Voice capture and transcription | Record/dictate text, preserve recoverable text, and save/copy result | iOS | `unknown` | `NSMicrophoneUsageDescription`, `NSSpeechRecognitionUsageDescription` | `implementation` | `sf-spec` | Permissions are not implementation proof. |
| Voice capture and transcription | Record/dictate text, preserve recoverable text, and save/copy result | Windows | `unknown` | Flutter voice dependencies, desktop scaffold | `manual-qa` | `sf-spec` | Need Windows voice runtime proof inside desktop flow. |
| Voice capture and transcription | Record/dictate text, preserve recoverable text, and save/copy result | macOS | `unknown` | macOS microphone/speech plist, Flutter plugins | `manual-qa` | `sf-test` | Needs runner permission and recording proof. |
| Voice capture and transcription | Record/dictate text, preserve recoverable text, and save/copy result | Linux | `adapted-required` | `PlatformCapabilities.localSpeechSupported == false` on Linux; advanced recording remains possible | `docs-claim` | `sf-spec` | Local speech unavailable; advanced recording/Whisper should be the parity path. |
| Voice capture and transcription | Record/dictate text, preserve recoverable text, and save/copy result | Web | `adapted-required` | `PlatformCapabilities.localSpeechSupported == false` on web | `implementation` | `sf-spec` | Browser path needs explicit safe recording/proxy/direct contract. |
| Overlay / quick action | Trigger WinGlows from outside the main app and return usable text | Android | `same` | `AndroidManifest.xml`, `OverlayForegroundService`, `OverlayAccessibilityService`, Android overlay docs | `manual-qa` | `sf-test` | Native implementation exists; physical-device QA still required. |
| Overlay / quick action | Trigger WinGlows from outside the main app and return usable text | iOS | `adapted-required` | Docs mark native host/recovery model still to spec; no iOS host code | `implementation` | `sf-spec` | Likely Share Sheet, Shortcuts/App Intents, clipboard, and main-app workflows rather than overlay. |
| Overlay / quick action | Trigger WinGlows from outside the main app and return usable text | Windows | `unknown` | `windows/runner/flutter_window.cpp`, `WindowsOverlayBridge`, Windows checklist | `manual-qa` | `sf-test` | First implementation exists; Windows machine proof not run. |
| Overlay / quick action | Trigger WinGlows from outside the main app and return usable text | macOS | `unknown` | `macos/Runner/MainFlutterWindow.swift`, `DesktopOverlayBridge`, macOS/Linux checklist | `manual-qa` | `sf-test` | First implementation exists; permissions/focus/Spaces proof pending. |
| Overlay / quick action | Trigger WinGlows from outside the main app and return usable text | Linux | `degraded-accepted` | `linux/runner/my_application.cc`, explicit GTK-scoped hotkey and clipboard-only delivery | `manual-qa` | `sf-test` | Degradation is honest and OS/compositor-driven, but still needs native proof and follow-up decision. |
| Overlay / quick action | Trigger WinGlows from outside the main app and return usable text | Web | `adapted-required` | Docs: no OS overlay/IME in browser | `implementation` | `sf-spec` | Browser alternatives need a contract, e.g. in-app quick actions/import/share. |
| Android IME keyboard | Type/dictate/copy/snippet/media from a system keyboard | Android | `same` | `InputMethodService`, keyboard bridge, large IME manual matrix, keyboard tests | `manual-qa` | `sf-test` | Android-only by OS role; still has device QA items. |
| Android IME keyboard | Type/dictate/copy/snippet/media from a system keyboard | iOS | `not-supported` | Platform docs: IME unavailable | `none` | `sf-docs` | Correct as OS/product adaptation; should offer iOS alternatives instead. |
| Android IME keyboard | Type/dictate/copy/snippet/media from a system keyboard | Windows | `not-supported` | Windows spec: no IME promise | `none` | `sf-docs` | Desktop overlay/quick actions are the equivalent. |
| Android IME keyboard | Type/dictate/copy/snippet/media from a system keyboard | macOS | `not-supported` | macOS/Linux spec: no IME promise | `none` | `sf-docs` | Desktop overlay/quick actions are the equivalent. |
| Android IME keyboard | Type/dictate/copy/snippet/media from a system keyboard | Linux | `not-supported` | macOS/Linux spec: no IME promise | `none` | `sf-docs` | Desktop overlay/quick actions are the equivalent where possible. |
| Android IME keyboard | Type/dictate/copy/snippet/media from a system keyboard | Web | `not-supported` | Browser cannot install system keyboard | `none` | `sf-docs` | Web must keep in-app workflows only. |
| Clipboard, snippets, dictionary, send-to | Reuse text across voice and clipboard as clipboard/snippet/dictionary assets | Android | `same` | `test/send_to_actions_test.dart`, stores/tests, Android keyboard clipboard importer | `manual-qa` | `sf-test` | Good shared evidence plus Android-native event paths. |
| Clipboard, snippets, dictionary, send-to | Reuse text across voice and clipboard as clipboard/snippet/dictionary assets | iOS | `unknown` | Shared Flutter stores only | `manual-qa` | `sf-spec` | Needs iOS app smoke and clipboard permission/privacy behavior. |
| Clipboard, snippets, dictionary, send-to | Reuse text across voice and clipboard as clipboard/snippet/dictionary assets | Windows | `unknown` | Shared stores + desktop delivery primitives | `manual-qa` | `sf-test` | Needs desktop flow proof. |
| Clipboard, snippets, dictionary, send-to | Reuse text across voice and clipboard as clipboard/snippet/dictionary assets | macOS | `unknown` | Shared stores + NSPasteboard delivery primitive | `manual-qa` | `sf-test` | Needs desktop flow proof. |
| Clipboard, snippets, dictionary, send-to | Reuse text across voice and clipboard as clipboard/snippet/dictionary assets | Linux | `degraded-accepted` | Shared stores + GTK clipboard-only delivery | `manual-qa` | `sf-test` | Clipboard fallback is the accepted Linux delivery mode for now. |
| Clipboard, snippets, dictionary, send-to | Reuse text across voice and clipboard as clipboard/snippet/dictionary assets | Web | `degraded-accepted` | Shared UI/tests; browser clipboard/security limits documented | `implementation` | `sf-spec` | Needs web clipboard UX contract and browser smoke. |
| Auth, sync, local-first and BYOK settings | Local-first use, optional account sync, no synced user secrets | Android | `same` | Firebase/local stores, secure storage, auth tests, security gate | `manual-qa` | `sf-test` | Android auth smoke remains required before production claim. |
| Auth, sync, local-first and BYOK settings | Local-first use, optional account sync, no synced user secrets | iOS | `unknown` | Keychain expected via plugin, no QA | `manual-qa` | `sf-spec` | Needs iOS secure storage/auth smoke. |
| Auth, sync, local-first and BYOK settings | Local-first use, optional account sync, no synced user secrets | Windows | `unknown` | Flutter secure storage dependency, shared stores | `manual-qa` | `sf-test` | Need desktop secure storage/auth smoke. |
| Auth, sync, local-first and BYOK settings | Local-first use, optional account sync, no synced user secrets | macOS | `unknown` | Keychain expected via plugin, shared stores | `manual-qa` | `sf-test` | Need macOS secure storage/auth smoke. |
| Auth, sync, local-first and BYOK settings | Local-first use, optional account sync, no synced user secrets | Linux | `degraded-accepted` | `PlatformCapabilities.secureStorageDegraded == true` on Linux | `docs-claim` | `sf-test` | Must visibly mark degraded secure storage before cloud AI/BYOK claims. |
| Auth, sync, local-first and BYOK settings | Local-first use, optional account sync, no synced user secrets | Web | `degraded-accepted` | web auth renderer and secure storage degraded rule | `test-proof` | `sf-spec` | Needs hosted web auth smoke and explicit BYOK/browser storage posture. |

## Claim Drift

The app-level README and `docs/PLATFORM_BEHAVIOR.md` now express the desired
parity doctrine. Older business and architecture contracts still contain
Android-first wording such as non-Android overlay being out of current scope.
That wording is now partly stale. It should be updated to say:

- IME remains Android-only.
- Overlay/quick-action is a cross-platform product concept with OS-specific
  hosts or documented adaptations.
- iOS and web need explicit parity contracts before public support claims.

## Recommended Routes

1. `/sf-spec WinGlows iOS app parity and quick actions`
   - Covers app shell smoke, voice permissions, share sheet, Shortcuts/App
     Intents, clipboard behavior, auth/secure storage, snippets, and no-IME
     alternatives.
2. `/sf-spec WinGlows web degraded parity contract`
   - Covers browser clipboard, recording/AI proxy posture, auth smoke, no OS
     overlay/IME, and honest Settings states.
3. `/sf-test --local shipglows_data/workflow/verification/windows-desktop-overlay-hotkeys-parity-checklist.md`
   - Required before Windows parity claim.
4. `/sf-test --local shipglows_data/workflow/verification/macos-linux-desktop-overlay-hotkeys-parity-checklist.md`
   - Required before macOS/Linux parity claim.
5. `/sf-docs align WinGlows business and architecture platform wording`
   - Removes stale Android-only overlay language while preserving Android-only
     IME truth.

## Chantier Potential

Chantier potentiel: oui

Titre proposé: WinGlows iOS app parity and quick actions

Raison: iOS is in the declared target platform list and has only scaffold plus
microphone/speech permission evidence. It needs product decisions and native
adaptation work across app shell, voice, clipboard, share/shortcut entrypoints,
secure storage, auth, and no-IME UX.

Sévérité: P2

Scope: `winglowz_app/ios`, shared Flutter features, platform capabilities,
Settings copy, verification docs, public platform claims.

Spec recommandée: `/sf-spec WinGlows iOS app parity and quick actions`
