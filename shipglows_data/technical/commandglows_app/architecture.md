---
artifact: architecture_context
metadata_schema_version: "1.0"
artifact_version: "1.1.0"
project: "CommandGlows"
created: "2026-04-26"
updated: "2026-06-10"
status: "reviewed"
source_skill: "sf-docs"
scope: "architecture"
owner: "Diane"
confidence: "high"
risk_level: "high"
docs_impact: "yes"
security_impact: "yes"
evidence:
  - "docs/SPEC_FLUTTER_SUPABASE_MIGRATION.md"
  - "docs/DECISIONS.md"
  - "docs/API.md"
  - "modules/floating-overlay/android/src/main/java/expo/modules/floatingoverlay/FloatingOverlayModule.kt"
  - "shipglows_data/workflow/audits/2026-06-10-commandglows-platform-parity.md"
linked_systems:
  - "Flutter"
  - "Backend-agnostic stores"
  - "Firebase first adapter"
  - "Clerk suite identity"
  - "Android overlay services"
  - "Desktop overlay hosts"
external_dependencies:
  - "flutter_riverpod"
  - "go_router"
  - "record"
  - "speech_to_text"
invariants:
  - "Target implementation is Flutter with backend-agnostic data contracts, not Expo/Convex/Supabase-coupled product code or direct Clerk Flutter/native app auth before proof."
  - "Clerk is valid as suite identity through a server-owned bridge; Firebase Auth remains the Android app adapter for now."
  - "All remote user data access is authorized by the selected adapter's auth and security rules."
  - "System-level entrypoints stay native and expose stable Flutter bridges: Android overlay/IME, Windows/macOS/Linux desktop overlay hosts, and future iOS/web adaptations."
depends_on:
  - "docs/DECISIONS.md@0.1.0"
  - "docs/MIGRATION_FLUTTER.md@0.1.0"
supersedes: []
next_review: "2026-05-27"
next_step: "$sf-docs update"
---

# Architecture — CommandGlows

## Purpose

This document separates:

- legacy implementation reference (current Expo/Convex app),
- target implementation contract (Flutter + backend-agnostic stores with Firebase as first adapter).

Only the target section defines implementation direction.

## Legacy implementation (reference only)

Current codebase reference:

- Expo / React Native app shell with `expo-router`.
- Convex schema/functions for transcriptions, clipboard, snippets, dictionary.
- Clerk dependency present but not integrated in the legacy app runtime auth flow.
- Android overlay implemented as native Kotlin Expo module bridge.
- `TEMP_USER_ID`/`local-user` pattern used in legacy data flow.

This stack is migration input only. It is not a target architecture.

## Target implementation contract

### Platform scope

Current platform direction: shared Flutter product/UI and backend-neutral stores
with near-complete functional parity as the default target across:

- Android
- iOS
- macOS
- Windows
- Linux
- web

Android remains the first advanced native surface because it owns the system
keyboard IME and Android overlay service. Windows, macOS and Linux use desktop
native hosts for overlay/quick actions. iOS and web require explicit adaptation
chantiers before public parity claims. Equivalent user outcomes should keep the
shared interaction model; adaptations are accepted only when they are better or
required by OS, browser, store, hardware, permission or security constraints.

### Runtime architecture

```text
Flutter App (Dart)
  -> app shell + routing + state
  -> feature modules (voice, clipboard, settings, snippets, dictionary, auth, overlay)
  -> data repositories
  -> platform services
  -> backend-neutral stores
  -> selected backend adapter

Firebase first adapter
  -> Firebase Auth
  -> Cloud Firestore
  -> Security Rules
  -> optional realtime listeners

Suite identity bridge
  -> Clerk owns suite/web identity
  -> Firebase uid maps to global_user_id through server-owned bridge
  -> product_entitlements decide access

Android native
  -> overlay foreground service
  -> input method service
  -> accessibility-based text injection
  -> Flutter bridge (plugin/platform channel)

Desktop native
  -> Windows MethodChannel for global hotkey, topmost window, clipboard and best-effort paste
  -> macOS MethodChannel for floating window, Control+Option+Space, NSPasteboard and best-effort Command+V
  -> Linux MethodChannel for GTK keep-above, scoped accelerator where available, clipboard-only fallback
```

### Layer contracts

1. Presentation layer (Flutter widgets):
   UI workflow only; no direct SQL/policy logic.
2. State layer (Riverpod providers/controllers):
   owns async state transitions and error surfaces.
3. Store/repository layer:
   owns provider-neutral data contracts. UI and domain code must not depend on Firebase, Supabase or another vendor directly.
4. Platform service layer:
   owns speech/audio/clipboard/secure-storage/overlay/quick-action bridges.

### Data and auth contract

- A remote auth session is required for user-scoped remote sync.
- User ownership comes from the selected backend auth context, not client-provided ids.
- Firebase Security Rules are the first adapter guardrail for multi-user readiness.
- Realtime updates are consumed only for the current authenticated user scope.

### Voice pipeline contract

Free/local path:

- local speech recognition where supported by platform.

Advanced path:

- audio recording + Whisper transcription.
- optional Claude cleanup.
- local cleanup fallback when Claude is unavailable.

In all cases:

- empty/whitespace results are never persisted.
- final text remains copyable even if auto-injection fails.

### Platform entrypoint contract

Flutter owns product logic, state, Settings patterns, actions, errors, and data
stores. Native hosts own OS-specific entrypoints and delivery mechanics.

The Android Kotlin overlay module remains native and authoritative for:

- overlay permission flow,
- foreground service lifecycle,
- bubble events (`tap`, `stop`, `cancel`, `long-press`),
- accessibility text injection and fallback behavior.

The Android Kotlin IME remains native and authoritative for system keyboard
activation, `InputConnection`, private-field policy, media keys, clipboard
events, and Android speech entry from the keyboard.

Windows, macOS and Linux desktop hosts remain native and authoritative for
global or scoped hotkeys, floating/keep-above windows, focus recovery, clipboard,
and best-effort text delivery. Linux must keep hotkey and paste limitations
explicit until a compositor/portal integration is selected.

iOS and web do not inherit the Android overlay or IME. They need explicit
adaptation contracts such as app main flows, Share Sheet, Shortcuts/App Intents,
browser-safe clipboard/recording flows, and documented degraded states.

Flutter integrates each host through narrow bridge interfaces; feature logic
stays in Dart.

## Cross-cutting invariants

- No Android app target design decision may depend on Convex/Expo or Supabase-specific coupling.
- Do not use direct Clerk Flutter/native app auth as production target until a dedicated proof passes; Clerk remains the suite identity provider through the bridge.
- API keys (OpenAI/Anthropic) remain local device secrets.
- Remote adapters store product data, not user API keys.
- Platform limitations are explicit in UI and docs.
