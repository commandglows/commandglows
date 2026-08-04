---
artifact: technical_module_context
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "CommandGlows"
created: "2026-05-31"
created_at: "2026-05-31 01:48:26 UTC"
updated: "2026-05-31"
updated_at: "2026-05-31 01:48:26 UTC"
status: reviewed
source_skill: sf-docs
scope: "flutter-local-cloud-sync"
owner: "Diane"
confidence: high
risk_level: high
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "commandglows_app/lib/features/sync"
  - "commandglows_app/lib/features/*/application/*store_provider.dart"
  - "commandglows_app/lib/features/settings"
  - "Firebase Auth"
  - "Cloud Firestore"
  - "Riverpod"
depends_on:
  - artifact: "shipglows_data/technical/commandglows_app/local-cloud-sync-playbook.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/commandglows_app/architecture.md"
    artifact_version: "1.0.1"
    required_status: "reviewed"
supersedes: []
evidence:
  - "2026-05-30 implementation created commandglows_app/lib/features/sync and test/local_cloud_sync_controller_test.dart."
  - "Implementation needed a Flutter-specific guide because the generic playbook does not explain Riverpod providers, local/Firebase store adapters, or validation commands."
next_review: "2026-06-30"
next_step: "/sf-docs technical audit"
---

# Flutter Local-Cloud Sync

## Purpose

This document explains how the local-cloud sync doctrine is implemented in the Flutter app.

The playbook defines the product and security rules. This document defines the Flutter/Riverpod code shape, integration points and validation surface.

## Owned Files

| Path | Role |
| --- | --- |
| `commandglows_app/lib/features/sync/domain/local_cloud_sync_models.dart` | Pure Dart sync decision models, domain statuses, snapshots, metadata and queue entry types. |
| `commandglows_app/lib/features/sync/application/local_cloud_sync_controller.dart` | Pure Dart controller that chooses seed, hydrate, merge, conflict, block or local-only decisions. |
| `commandglows_app/lib/features/sync/application/local_cloud_sync_adapters.dart` | Concrete bridges from feature stores to controller snapshots and writes. |
| `commandglows_app/lib/features/sync/application/local_cloud_sync_provider.dart` | Riverpod composition for auth context, metadata store and sync controller. |
| `commandglows_app/lib/features/sync/data/local_cloud_sync_metadata_store.dart` | Secure local metadata persistence for remembered account and domain checksums. |
| `commandglows_app/lib/features/sync/data/local_cloud_sync_queue_store.dart` | Secure local queue persistence for future retryable operations. |
| `commandglows_app/test/local_cloud_sync_controller_test.dart` | Doctrine-level tests for account safety and merge decisions. |

## Entrypoints

- Provider entrypoint: `localCloudSyncControllerProvider`
- Auth context provider: `localCloudSyncAuthContextProvider`
- Metadata provider: `localCloudSyncMetadataStoreProvider`
- UI integration target: Settings / Compte & cloud and shared sync/save action
- Verification checklist: `shipglows_data/workflow/verification/app-local-to-cloud-data-promotion-merge-checklist.md`

## Layer Contract

```text
Settings / shell / sync action
  -> localCloudSyncControllerProvider
  -> LocalCloudSyncController
  -> LocalCloudSyncControllerAdapterBridge
  -> domain-specific adapter
  -> local store + Firebase store
```

Rules:

- Widgets do not compare local/cloud data directly.
- Feature providers still choose the active runtime store for normal app use.
- Sync orchestration must read both local stores and Firebase stores explicitly.
- Auth/entitlement gating lives in `LocalCloudSyncAuthContext`.
- Secret stores are not adapters.
- The controller is pure enough to test without Firebase.

## Store Requirements

Before a domain can be promoted, confirm:

- local data survives app restart;
- local snapshot can include deleted/tombstoned records if delete sync is in scope;
- cloud snapshot is user-scoped by Firebase Auth and Firestore rules;
- adapter can upsert without duplicating records;
- adapter can mark local/cloud state truthfully after writes;
- sensitive content is filtered before leaving the device.

Current V1 posture:

- Clipboard: persistent local store exists and can expose a tombstone-aware snapshot.
- Snippets: in-memory local store exists; durable local storage is required before promising reinstall recovery.
- Dictionary: in-memory local store exists; durable local storage is required before promising reinstall recovery.
- Settings: local secure storage exists; secret values remain excluded.
- Voice: in-memory local store exists; voice remains local-only for promotion until durable local voice storage and safe field allowlist exist.

## Adapter Checklist

For each adapter:

- define `domain`;
- implement local snapshot;
- implement cloud snapshot;
- set `supportsPromotion` honestly;
- include `key` or `syncKey` for every record;
- exclude secrets and sensitive payloads;
- cap promotion volume where required;
- upsert local records idempotently;
- upsert cloud records idempotently;
- apply tombstones or deletes only when in scope;
- avoid direct UI state changes;
- return enough metadata for conflict diagnostics.

## Controller Checklist

The controller must preserve these decisions:

- inactive auth/entitlement: no cloud reads or writes;
- sign-up flow + empty cloud + eligible local: seed cloud;
- existing empty cloud + unassociated local: confirmation/block;
- same remembered account: seed or flush safely;
- different remembered account: block replay;
- clean local + cloud data: hydrate local;
- same checksum: mark aligned;
- non-conflicting records: merge;
- same business key with different payload: conflict;
- latest-wins: only with reliable updated-at and device metadata;
- local-only domain: never claim remote sync.

## Provider Checklist

When adding a provider or changing `localCloudSyncControllerProvider`:

- keep provider construction side-effect free;
- do not instantiate Firebase adapters unless Firebase is configured;
- do not infer entitlement from Firebase Auth alone;
- do not use client-sent user IDs for authorization;
- keep sync controller tests independent from Firebase SDK;
- keep Settings UI resilient when Firebase is absent or auth is loading.

## UI Checklist

When wiring UI:

- show post-auth stages before claiming readiness;
- route conflicts to Settings > Compte & cloud;
- let Accueil/feed show state indicators and deep links only;
- connect shared sync/save action to retry/refresh, not to a blind store reload;
- never label a local-only save as cloud synchronized;
- explain that secrets are local-only in V1.

## Validation

Run:

```bash
dart analyze lib/features/sync test/local_cloud_sync_controller_test.dart
flutter test test/local_cloud_sync_controller_test.dart
flutter analyze
flutter test
```

Do not run Android builds, Gradle, package installs or `flutter run -d android` on this VM.

## Reader Checklist

- `lib/features/sync/**` changed -> run sync targeted tests and full Flutter checks.
- `*_store_provider.dart` changed -> verify local fallback, remote session, entitlement and Firebase UID gates.
- local store persistence changed -> add restart/round-trip tests.
- Firebase adapter changed -> verify user-scoped paths and Firestore rules evidence.
- Settings sync UI changed -> verify status truth: local-only, pending, synced, conflict, failed.
- Any secret-handling field changed -> verify secret values stay local and are not logged.

## Maintenance Rule

Update this document when `lib/features/sync/**` changes, when a new sync domain becomes promotable, when store providers change their local/remote gating, or when validation commands change.
