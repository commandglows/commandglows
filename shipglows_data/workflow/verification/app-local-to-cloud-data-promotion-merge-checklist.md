---
artifact: verification_checklist
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-05-30"
updated: "2026-05-30"
status: draft
source_skill: sf-build
scope: "app-local-to-cloud-data-promotion-merge"
owner: "Diane"
confidence: high
risk_level: high
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "winglowz_app"
  - "Firebase Auth"
  - "Cloud Firestore"
  - "Local mode stores"
depends_on:
  - artifact: "shipglows_data/workflow/specs/app-local-to-cloud-data-promotion-merge.md"
    artifact_version: "1.0.0"
    required_status: "ready"
supersedes: []
evidence:
  - "flutter analyze passed on 2026-05-30"
  - "flutter test passed on 2026-05-30"
next_step: "Diane physical-device QA"
---

# App Local-to-Cloud Data Promotion and Merge Checklist

## Automated Proof

- [x] `dart analyze lib/features/sync test/local_cloud_sync_controller_test.dart`
- [x] `flutter analyze`
- [x] `flutter test test/local_cloud_sync_controller_test.dart`
- [x] `flutter test`

## Required Scenarios

- [x] `L2C-001` Account creation flow can seed empty cloud from eligible local data at controller level.
- [x] `L2C-002` Existing empty cloud requires confirmation for unassociated local data at controller level.
- [x] `L2C-003` Existing cloud with clean local hydrates local state at controller level.
- [x] `L2C-004` Divergent local/cloud with same business key enters conflict at controller level.
- [ ] `L2C-005` Offline/pending queue end-to-end UI proof.
- [x] `L2C-006` Different remembered account blocks replay into new account at controller level.
- [x] `L2C-007` Inactive auth/entitlement avoids cloud access at controller level.
- [ ] `L2C-008` Firebase unavailable end-to-end proof.
- [x] `L2C-009` Secrets remain excluded from V1 by spec and settings tests.
- [x] `L2C-010` Clipboard tombstone support exists in adapter path.
- [ ] `L2C-011` Reinstall/relogin physical-device proof.
- [x] `L2C-012` Retry/sync entry point exists through `localCloudSyncControllerProvider`.

## Manual QA

Diane must validate on a physical device:

1. Create local clipboard/snippet/dictionary/settings data.
2. Create or connect an account.
3. Confirm the app does not hide local data when cloud starts empty.
4. Synchronize.
5. Reinstall or use a clean app context.
6. Sign in with the same account.
7. Confirm promoted eligible data reappears.
8. Confirm secrets/API keys did not sync in V1.

## Known Limits

- Voice transcriptions remain local-only for promotion until durable local voice storage is implemented.
- Full UI conflict-resolution surfaces still need end-to-end verification in Settings > Compte & cloud.
- This checklist does not authorize Android build or Gradle validation on this VM.
