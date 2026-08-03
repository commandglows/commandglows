---
artifact: implementation_spec
metadata_schema_version: "1.0"
source_skill: sf-spec
artifact_version: "1.0.0"
project: "winglowz_app"
created: "2026-05-14"
updated: "2026-05-14"
status: draft
scope: "feature"
owner: "codex"
confidence: medium
user_story: "En tant qu'utilisatrice WinGlowz, je veux dicter depuis la barre d'actions du clavier Android afin de saisir du texte sans quitter l'application active."
title: "Keyboard action-bar voice recording"
risk_level: high
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Android IME keyboard"
  - "Local-first ASR runtime"
depends_on: []
supersedes: []
evidence:
  - "Product intent and keyboard-first voice workflow are defined in this document."
next_step: "/102-sg-start shipglows_data/workflow/specs/keyboard-action-bar-voice-recording.md"
---

# Keyboard Action-Bar Voice Recording

## Summary

WinGlows should make the Android keyboard the primary day-to-day interface for voice capture. The floating overlay remains available for users who want it, but it is no longer required for the core voice workflow.

Add a voice recording button to the native keyboard action bar. The button starts, stops, and cancels voice capture from inside the IME, then delivers the resulting text into the active input field using the existing keyboard/privacy delivery rules.

The target architecture is local-first: run speech recognition on the user's device by default, use free/open-source model runtimes, and reserve paid/cloud worker transcription for explicit high-quality fallback modes.

## Product Intent

- Primary interface: WinGlows keyboard.
- Optional interface: floating overlay.
- The keyboard voice button should feel like a built-in keyboard tool, not a shortcut back to the Flutter app.
- Users should be able to dictate without leaving the target app or opening the overlay.
- The default path should consume device CPU/NPU/RAM, not WinGlows server spend.
- Server/worker transcription is a fallback, not the baseline product loop.

## Engine Strategy

- Default: local WinGlows ASR engine when a supported model is installed and the device passes a lightweight capability check.
- Fallback 1: Android platform speech recognition when no local model is installed or the device is too constrained.
- Fallback 2: WinGlows cloud/worker quality mode only when explicitly selected or when local/offline paths fail.
- Model downloads should be optional, resumable, and cached on-device.
- Language packs should be presented as a free downloadable catalog, not as a paid marketplace.
- Default packaging recommendation: ship the APK with no heavyweight ASR model bundled.
- The app should support multiple local engines behind one internal interface so we can benchmark `sherpa-onnx`, `whisper.cpp`, Vosk, SenseVoice/FunASR exports, and future free models without changing keyboard UX.

## Language Pack Strategy

- Do not bundle every ASR model in the APK.
- Prefer bundling no ASR model in the APK unless a future tiny bootstrap model proves clearly worth the install-size cost.
- Offer a free downloadable language-pack catalog.
- Install language packs after app install: first-run suggestion, first microphone use, or explicit Settings action.
- Suggest packs from Android system locale, active keyboard language, and explicit user choice.
- The microphone button must not look broken when no pack is installed; it should offer "Install local voice pack" and a configured fallback.
- Each pack record must include language tag, display name, engine, model id, download size, installed size, license, quality tier, offline support status, and fallback behavior.
- Quality tiers: `recommended`, `standard`, `experimental`, `fallbackOnly`.
- WinGlows public copy must say "local voice packs for supported languages", not "offline voice in every language".
- AppSumo/LTD buyers should be able to install only the languages they need.
- If no local pack exists for a language, the keyboard should offer Android SpeechRecognizer or explicit cloud/BYO fallback without hiding the tradeoff.

## User Flow

1. User enables and selects the WinGlows keyboard.
2. User taps the microphone/record button in the keyboard action bar.
3. Keyboard enters recording state and shows an obvious active state.
4. User taps again to stop, or uses cancel if available.
5. Speech is transcribed by the selected local/on-device engine when available.
6. Result text is inserted into the active field when allowed.
7. If direct insertion is blocked by privacy/sensitive field rules, fallback delivery uses clipboard-only behavior with clear status.

## Overlay Relationship

- Overlay remains available from Settings.
- Overlay onboarding should not block keyboard-first voice usage once keyboard and microphone prerequisites are satisfied.
- Overlay controls and keyboard voice controls may share backend/native recording events, but the UI states must remain independent.
- Starting recording from keyboard must not require the overlay service to be running.

## Functional Requirements

- Add a keyboard action-bar voice button.
- Support idle, recording, processing, success, and error states.
- Respect microphone permission state.
- Respect keyboard privacy mode and sensitive field detection.
- Use existing clipboard/direct-injection policies where possible.
- Record diagnostic breadcrumbs for keyboard voice start/stop/cancel/result/error.
- Avoid losing focus from the current input field.
- Keep the overlay optional and separately configurable.
- Expose the selected ASR engine in diagnostics.
- Provide a Settings surface for installing/removing local speech models.
- Provide a Settings surface for language packs, installed packs, available updates, storage use, and fallback policy.

## Native Android Requirements

- Extend `WinGlowzInputMethodService` action bar UI with a voice control.
- Do not launch Flutter UI for normal recording.
- Do not depend on `OverlayForegroundService` for keyboard voice capture.
- Keep IME lifecycle safe: recording must stop or cancel when the IME is destroyed, hidden, or loses the active input connection.
- Route final text through the keyboard insertion path so private-field behavior stays consistent.
- Add a native ASR engine boundary so the IME can call local inference without routing audio through a remote worker.
- Run model loading off the UI thread and keep the keyboard responsive while models warm up.
- Persist model availability and last engine failure in a native-readable state store.

## Flutter/App Requirements

- Settings should describe overlay as optional.
- Onboarding should prioritize:
  1. keyboard enabled
  2. keyboard selected
  3. microphone permission for dictation
  4. local speech model installed or accepted fallback selected
  5. overlay as optional/recommended
- Diagnostics should show whether voice was started from `keyboard`, `overlay`, or `voice_screen`.
- Settings should include an "On-device speech" section with installed model, storage size, engine, language coverage, and fallback behavior.
- Settings should avoid "marketplace" language unless paid pack distribution is intentionally introduced later; the current product concept is a free pack catalog.

## Diagnostics

Add or preserve recent event names:

- `keyboard_voice_start`
- `keyboard_voice_stop`
- `keyboard_voice_cancel`
- `keyboard_voice_result`
- `keyboard_voice_error`
- `voice_source=keyboard`
- `keyboard_voice_engine=<engine>`
- `keyboard_voice_local_model=<model_id>`

Diagnostic output should make these cases distinguishable:

- microphone permission missing
- recorder start failure
- transcription failure
- active input connection unavailable
- sensitive field fallback
- clipboard fallback
- direct insertion success
- local model missing
- local model load failure
- device capability fallback

## Open Design Decisions

- Which local runtime should ship first: `sherpa-onnx`, `whisper.cpp`, Vosk, or another free runtime.
- Which default French-capable model gives the best size/quality/latency tradeoff on mid-range Android devices.
- Whether the keyboard action bar shows a compact waveform/meter or only a stateful microphone button.
- Whether long-press on the keyboard mic should cancel, show options, or remain unused.
- Whether overlay onboarding should move from mandatory to recommended.
- Whether a future tiny bootstrap model is worth bundling; current recommendation is no bundled ASR model.

## Acceptance Criteria

- A user can dictate into a normal text field from the WinGlows keyboard without enabling the overlay.
- A user can dictate without using a WinGlows worker when a supported local model is installed.
- The overlay can still be enabled and dragged independently.
- Keyboard voice capture does not dismiss the keyboard.
- The copied backend diagnostic identifies keyboard-originated voice actions.
- Sensitive/private fields do not receive direct injected text when policy forbids it.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-05-17 08:33:46 UTC | sf-test | unknown | Manual Android QA for keyboard voice dictation insertion and history separation. | Failed: Enter finalization returned `no speech detected`, inserted no text, and did not add Voice history; Clipboard exclusion passed. | /sf-fix BUG-2026-05-17-001 |
| 2026-05-17 08:40:17 UTC | sf-fix | Codex | Fixed keyboard voice Enter finalization. | Removed artificial 10-minute minimum speech input and added latest-partial fallback for manual stop; local Flutter checks passed. | /sf-test --retest BUG-2026-05-17-001 |
