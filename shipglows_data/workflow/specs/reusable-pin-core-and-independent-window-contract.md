---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: CommandGlows
created: "2026-09-25"
created_at: "2026-09-25 14:32:00 UTC"
updated: "2026-09-25"
updated_at: "2026-09-25 15:06:00 UTC"
status: ready
source_skill: 100-sg-spec
source_model: "GPT-6 Codex"
scope: "reusable-pin-core-and-independent-window-contract"
owner: Diane
confidence: high
user_story: "As a CommandGlows user, I can pin a reference to reusable content through a generic core so a later platform integration can show it in a draggable window that acts independently from the main application window."
risk_level: medium
security_impact: yes
docs_impact: yes
linked_systems:
  - commandglows_app Flutter domain
  - desktop platform host contracts
  - clipboard items, snippets, images, and audio resources as future adapters
depends_on: []
supersedes: []
evidence:
  - "Operator decision 2026-09-25: prepare a reusable pin mechanism before integrating it into app surfaces."
  - "Operator requirement 2026-09-25: each future Windows post-it window is draggable and interaction with it must not change the main window state."
  - "Current clipboard records already have a source-specific pinned boolean; this work creates a separate generic reference contract."
  - "Current Windows overlay calls SetWindowPos on the primary FlutterWindow; it is not an independent post-it window."
next_step: "Implement the contract-only pin foundation; keep native windows and source integrations deferred."
---

# Title

Reusable Pin Core and Independent Window Contract

# Status

Ready. This spec covers a reusable domain/API foundation and records the independent-window contract for a later integration. It does not implement or claim a detached Windows post-it window.

# User Story

As a CommandGlows user, I want the app to pin references to different reusable resources through one common mechanism, so future integrations can display text, images, or audio in draggable windows without tying those windows to the main app window's state.

Actor: an authenticated or local-only CommandGlows app user, scoped by the selected store implementation.

Trigger: a future feature asks the shared pin service to pin a stable resource reference.

Observable result in this foundation: the reference and its pin identity are represented by provider-neutral domain types and operations that future adapters can consume. No user-facing pin surface is introduced in this scope.

# Minimal Behavior Contract

The shared pin domain accepts a typed, stable resource reference and represents a pin as its own record, separate from the source payload. The pin repository contract exposes create, list, lookup, and remove operations without depending on a specific source feature, backend, Flutter widget, or operating-system window. A future desktop host must create and move each pin window independently: drag, focus, close, or update events are scoped to that pin window and must not show, hide, minimize, restore, or otherwise mutate the main window. Invalid references are rejected; the stored pin contains no copied text, image, audio, credential, or other payload. The easiest missed edge case is that the same resource may be pinned more than once; each pin therefore has a distinct identity and window state.

# Success Behavior

- A non-empty resource type and stable resource ID can be represented by the shared pin domain without importing a source feature or provider SDK.
- Pin records refer to source resources and do not duplicate their content.
- The repository contract can be implemented by local or remote stores while deriving account scope from the selected authenticated store, never from a client-supplied owner ID.
- A future independent-window host receives a stable pin ID for every window and reports drag/focus/close events against that ID only.
- Pin-window movement reports signed logical desktop coordinates for that pin ID only; host-specific pixel/DPI conversion stays native.
- Closing a visual window does not remove the pinned resource; explicit unpin removes the pin record.
- Multiple pins may reference the same resource and remain independently addressable.

# Error Behavior

- Empty resource type or ID is rejected before a repository write.
- Unknown, deleted, or inaccessible source content is resolved by the future source adapter; the pin core never fabricates replacement content.
- Unsupported platform window behavior returns an explicit unsupported result from a future host adapter; it does not manipulate the main window as a fallback.
- Failure to open, move, or close one pin window reports an error for that pin and never retries by manipulating the main window.
- Repository failures propagate as typed or documented errors and leave unrelated pin records unchanged. `create` assigns a unique pin ID; resource duplicates are allowed as separate pin instances.

# Problem

Clipboard currently stores a source-specific `pinned` boolean and orders pinned history items first. Snippets, dictionary entries, images, and audio resources do not share that model. The existing Windows overlay host applies visibility and topmost behavior to the primary Flutter window, so it does not meet the requested independent draggable post-it behavior.

# Solution

Add a provider-neutral pin domain contract with a resource reference (`resourceType`, `resourceId`), a distinct pin identity, and a repository interface for pin lifecycle operations. Keep resource resolution behind source adapters and operating-system window creation behind a platform host interface. Pin-window events carry the pin identity and have no API for mutating primary-window visibility, activation, minimization, or restoration.

The host contract uses signed logical desktop `x`/`y` coordinates for placement and movement; the native host converts them to platform coordinates. A host operation returns success, unsupported, or failure explicitly. Closing a pin window closes only that window; unpinning is a separate repository removal operation. Opening, moving, focusing, or closing one pin cannot call main-window lifecycle operations.

This stage supplies typed contracts only. It does not add a backend adapter, source adapter, Flutter screen, native detached window, drag implementation, or production persistence. The current clipboard favorite remains owned by the clipboard feature until a later integration explicitly migrates it.

# Scope In

- Provider-neutral Dart model for typed source references and distinct pin identities.
- A repository contract for creating, listing, looking up, and removing pins.
- A narrow future-host contract whose window operations and events are keyed by pin identity.
- An explicit invariant that each future post-it can be dragged independently and that its interaction never changes the main window state.
- Documentation linking the new contract to the CommandGlows architecture and code map.

# Scope Out

- Integration with clipboard, snippets, dictionary, voice, images, or audio stores.
- Change to the existing clipboard `pinned` field or UI.
- Firebase/Firestore, local-disk, or other concrete repository implementation.
- Creation, rendering, movement, focus, z-order, close behavior, or persistence of native Windows windows.
- App navigation, settings, user-facing copy, or public product claims.
- Automatic synchronization of desktop coordinates between devices.

# Constraints

- Flutter/Dart remains the shared product layer; platform window behavior stays behind native-host contracts.
- Domain types and APIs must not import Firebase, Supabase, a desktop runner, source-feature models, or widgets.
- A resource reference identifies a source record; it is not authorization to read that record.
- Stores enforce the active local/account ownership boundary using their own auth context.
- Pin metadata never includes source payloads, secrets, clipboard text, image bytes, or audio bytes.
- The current main-window overlay bridge remains unchanged in this foundation.
- No backend or platform fallback may route a pin-window interaction through the primary window controller.

# Test Contract

Surface: pure Dart domain/API contract and static integration boundaries only.

Planned proof for this foundation: `flutter analyze` on `commandglows_app`; source review confirms the domain has no source/provider/UI/native imports and that pin-window operations are keyed by pin ID. No app backend or managed app session is required.

Deferred proof for the later integration: repository adapter tests, source-adapter tests for each supported media kind, Windows runner build and manual interaction with two independent windows, drag/restore behavior, and explicit checks that pin interactions leave main-window visibility, activation, minimization, and route state unchanged. No such behavior is claimed by this foundation.

# Dependencies

- `shipglows_data/technical/commandglows_app/architecture.md` — Flutter domain and native host ownership.
- `shipglows_data/workflow/specs/windows-desktop-overlay-hotkeys-parity.md` — existing single-overlay Windows host context; this spec does not extend its implementation tranche.
- Stable source identifiers exposed by future resource adapters.

# Invariants

- Pin lifecycle state is separate from source-content lifecycle state.
- Pin identity is unique per pin instance, including duplicate references to one source resource.
- Pin APIs never own or mutate primary-window state.
- Native hosts own actual detached-window lifecycle, drag mechanics, focus, and desktop placement.
- The host reports any unsupported operation explicitly and never substitutes the primary window.
- Content payloads remain in their source stores; the pin record stores only a typed reference and pin metadata.

# Security Gate

This tranche adds no network endpoint, privileged OS operation, or remote data write, so OWASP Top 10:2025 and ASVS controls are not applicable to the contract-only implementation. The later repository adapter remains responsible for current-user scoping and authorization. A pin reference is not an access grant; source adapters must reauthorize reads against the selected source store. Pin records and diagnostics must not contain source payloads, owner-supplied identifiers, or secrets.

# Links & Consequences

- Product decision: `pin-resource-independent-window`, state `confirmed`. Before → after: clipboard-only favourite flag → a separate reusable typed-resource pin contract and per-pin detached-window host boundary. Upstream: operator decision in this task. Downstream: this spec; future source and Windows-host integrations. Preserved: current clipboard pin behavior and store.
- Clipboard's source-specific pin flag is preserved and remains unchanged in this chantier.
- Future adapters for snippets, clipboard resources, images, and audio can implement the shared reference contract.
- Future desktop-window integration must extend or create a native host that owns independent per-pin windows; the current Windows primary-window overlay cannot be represented as satisfying that requirement.
- Future storage selection must define device-local placement separately from account-scoped pin references before enabling cross-device sync.
- Product user story anchor: `shipglows_data/business/commandglows_app/product.md` (reusable clipboard/snippet/voice content and platform-native overlays).

# Documentation Coherence

Update `shipglows_data/technical/commandglows_app/architecture.md` and `shipglows_data/technical/commandglows_app/code-docs-map.md` to expose the new provider-neutral pin contracts and their later integration boundary. No public site copy, onboarding, settings, or product claim changes are in scope.

# Edge Cases

- Same source resource pinned multiple times; each instance has a unique pin ID.
- Empty or whitespace-only resource type or ID.
- Source record is deleted or becomes inaccessible after pin creation.
- User changes account while pins are open; store ownership remains tied to the active store context.
- Host receives a drag or close event for a stale or unknown pin ID.
- Main app is minimized or closed while detached windows are active; actual lifecycle policy is deferred to the host integration, but pin interactions must not alter main-window state.
- Unsupported platform or window host; no primary-window fallback.
- Source payload contains sensitive text or media; payload is never copied into pin metadata or logs.

# Implementation Tasks

1. Add `lib/features/pinning/domain/pin_resource_reference.dart` and `pinned_resource.dart` with validated stable identities and no payload fields. This serves the user story's reusable resource identity. Dependency: none. Validate with `flutter analyze` and direct source review of validation and fields.
2. Add `lib/features/pinning/domain/pin_repository.dart` with provider-neutral create, list, lookup, and remove operations; `create` receives a resource reference and returns a record with a store-assigned pin ID. Do not add a concrete provider or change feature stores. This serves the user story's common pin lifecycle. Dependency: task 1. Validate with `flutter analyze` and confirm the contract accepts no caller-supplied owner ID.
3. Add `lib/features/pinning/domain/pin_window_contract.dart` with pin-window request/result, signed logical position, and event values keyed by pin ID, plus a host interface for open, move, and close. Closing the window preserves the pin record; unpin remains repository removal. This serves the independent draggable-window requirement. Dependency: task 1. Validate with `flutter analyze` and direct review that every state event is pin-scoped, unsupported/failure outcomes are explicit, and the interface has no primary-window mutation operation.
4. Update `shipglows_data/technical/commandglows_app/architecture.md` and `code-docs-map.md` with the new contracts and the deferred native integration boundary. This serves maintainable discovery of the new owner. Dependency: tasks 1–3. Validate metadata and inspect the rendered text for consistency with the current Windows host limitation.

# Acceptance Criteria

- AC 1: Given valid type and resource ID, when represented by the pin domain, then the resulting reference and pin instance contain stable identities and no source payload.
- AC 2: Given any future source feature, when it uses the pin repository contract, then the domain contract has no import dependency on that feature or a backend SDK.
- AC 3: Given two pins referencing one resource, when both are represented, then each has a distinct pin identity assigned by the repository; the caller cannot choose an owner ID.
- AC 4: Given a future host event for a pin window, when it reports drag/focus/close, then it is keyed to that pin, movement is reported in logical desktop coordinates, and it exposes no operation that changes primary-window state.
- AC 5: Given a future host cannot create an independent window, when pin display is requested, then it returns an explicit unsupported/error result rather than reusing the main window.
- AC 6: Given the user closes one pin window, when the host closes it, then its pin record remains available; only an explicit unpin removes that record.
- AC 7: Given malformed type or ID, when a pin is constructed or created, then it is rejected before persistence.
- AC 8: ZOMBIES: zero/empty values rejected; a valid reference preserves its identity through the domain/repository contract; misuse cannot supply owner identity or payload; boundary allows multiple pins per source; closing a window preserves its pin record; error paths preserve unrelated pins; sensitive text/media never enter pin records or logs; unsupported hosts fail explicitly.
- AC 9: Existing clipboard pin fields, ordering, actions, and persistence remain unchanged.

# Test Strategy

For this domain/API-only tranche, run `flutter analyze` and perform a source-boundary review. The later integration owns automated behavior tests and Windows runner/manual evidence for independent windows, dragging, focus, close, persistence, and main-window non-interference.

# Risks

- A generic type/ID pair may not match every source's stable identity; source adapters must prove their reference semantics before integration.
- The current Windows overlay owns the primary Flutter window. The detached-window contract cannot be claimed as implemented until the native host creates independent windows and proves non-interference.
- User-scoped persistence and device-local placement have different scope; combining them could sync meaningless coordinates or leak references across accounts.
- No backend adapter in this tranche means the pin repository interface alone does not provide cross-session persistence.

# Execution Notes

- Preserve all unrelated working-tree changes.
- Do not modify `commandglows_app/windows/runner/**`, `lib/core/platform/windows_overlay_bridge.dart`, clipboard stores, screens, routes, or providers.
- Local static validation is limited to the app's documented `flutter analyze` lane. Do not launch an app or consume Doppler runtime configuration.
- Do not add or run tests in this tranche; the accepted proof is static analysis plus boundary review. Later interaction validation must be a separately authorized integration.
- Do not stage or commit unrelated files.
- First-read sources: `commandglows_app/lib/features/clipboard/domain/clipboard_store.dart`, `commandglows_app/lib/core/platform/windows_overlay_bridge.dart`, `commandglows_app/windows/runner/flutter_window.cpp`, `shipglows_data/technical/commandglows_app/architecture.md`, and `shipglows_data/workflow/specs/windows-desktop-overlay-hotkeys-parity.md`.
- Stops: do not claim detached-window behavior or choose persistence, cross-device placement, close-versus-unpin, or topmost policy in this foundation. Route those decisions to the later integration request.

# Open Questions

None for the accepted contract-only foundation. Concrete persistence provider, device-local saved placement, always-on-top policy, source adapters, and native window lifecycle are intentionally deferred to the later integration decision. Closing a window preserves its pin; unpinning is a distinct remove operation.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-09-25 14:56:00 UTC | 100-sg-spec | GPT-6 Codex | Authored and adversarially reviewed the reusable pin and independent-window contract after explicit operator scope approval. | Reviewed; source identity, duplicate pins, account scoping, detached-window event isolation, error handling, and integration deferrals are explicit. | Run 101-sg-ready. |
| 2026-09-25 14:59:00 UTC | 101-sg-ready | GPT-6 Codex | Reviewed the spec for actor/outcome fit, source/store ownership, window isolation, proof, risk, and linked documentation. | Ready for the contract-only foundation; native detached windows, persistence adapter, source adapters, and UI are explicitly deferred. | Implement via 102-sg-start. |
| 2026-09-25 15:01:00 UTC | 102-sg-start | GPT-6 Codex | Started the approved contract-only pin foundation after classifying the write set and loading implementation guardrails. | In progress; provider-neutral domain and independent-window host interfaces only. | Complete implementation, docs, and static proof. |
| 2026-09-25 15:06:00 UTC | 102-sg-start | GPT-6 Codex | Implemented the provider-neutral pin domain, repository and independent-window host contracts; updated app architecture and code map. | Implemented; `flutter analyze`, source-boundary review, metadata lint, and diff whitespace check passed. No tests were added/run. | Independently verify the contract implementation; native-window/source integration remains deferred. |

## Current Chantier Flow

- 100-sg-spec: reviewed.
- 101-sg-ready: ready; spec status transitioned to `ready`.
- 102-sg-start: implemented; static proof passed, native windows and source integrations deferred.
- 103-sg-verify: not run.
- 104-sg-end: not run.
- 005-sg-ship: not run; no commit, push, or deployment requested.
