---
artifact: test_checklist
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-06-11"
updated: "2026-06-11"
status: "draft"
source_skill: "103-sf-verify"
scope: "cloud-save-all-settings-and-keyboard-themes"
owner: "Diane"
confidence: "medium"
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "winglowz_app"
  - "Firebase Auth"
  - "Cloud Firestore"
  - "Cloud Storage for Firebase"
  - "Android IME"
depends_on:
  - "shipglows_data/workflow/specs/cloud-save-all-settings-and-keyboard-themes.md@1.0.0"
supersedes: []
evidence:
  - "Ready spec cloud-save-all-settings-and-keyboard-themes.md"
  - "Local implementation 2026-06-11 added keyboard sync V2, Storage rules, and targeted tests."
  - "Verification 2026-06-11 reformatted this checklist into a status table so ShipGlows tooling can parse the remaining manual proof."
next_step: "/107-sf-test cloud-save-all-settings-and-keyboard-themes"
---

# Cloud Save All Settings And Keyboard Themes

## Scenario Status

| Scenario ID | Surface | Scenario | Required | Expected | Status | Observed | Evidence pointer | Notes | Bug Link |
|-------------|---------|----------|----------|----------|--------|----------|------------------|-------|----------|
| CSA-001 | Flutter local-cloud sync | Local settings and keyboard profile promote during account creation before cloud-ready messaging appears. | yes | Promotion runs before cloud-ready messaging and preserves local state. | PASS | Signup promotion and remembered-account paths are covered locally. | test/local_cloud_sync_controller_test.dart | Covered by signup promotion and remembered-account tests. | |
| CSA-002 | Flutter settings sync | Signed-in account saves a non-secret settings change locally and remotely with a measured state. | yes | Settings domain shows a measured synced state only when promotion/sync succeeds. | PASS | Local-cloud state now feeds measured settings status. | test/cloud_sync_overview_test.dart | Backed by overview and controller tests. | |
| CSA-003 | Keyboard JSON profile | Keyboard profile JSON keeps colors, gradients, effects, relief, status bar, and safe corner config. | yes | Keyboard JSON remains complete and valid without unsafe fields. | PASS | JSON profile contract is covered locally. | test/keyboard_sync_controller_test.dart | Model validation also covered in `test/keyboard_sync_models_test.dart`. | |
| CSA-004 | Firebase Storage + Firestore manifest | Keyboard theme image upload creates a Storage object plus a Firestore-safe manifest with no local path or image bytes in Firestore. | yes | Storage object and safe manifest both exist under owner rules. | BLOCKED | Local policy, queue, and textual rules proof passed, but real provider Storage object and cross-service rules proof are still missing. | test/storage_rules_entitlement_test.dart | Needs emulator or hosted/provider proof after ship. | |
| CSA-005 | Android restore | Clean install or clean device restores settings, keyboard profile JSON, and keyboard theme image for the same account. | yes | Reinstall on the same account hydrates settings, JSON profile, and theme image into the Android IME private store. | NOT_RUN | Not executed on device. | pending: Diane device QA | Requires hosted/provider proof plus Diane Android clean-install IME QA. | |
| CSA-006 | Missing asset fallback | Missing Storage asset yields partial restore plus a no-image fallback without crash. | yes | JSON restore succeeds and image restore falls back safely with partial status. | NOT_RUN | Not executed against a missing remote asset. | pending: provider/device verification | Needs higher-fidelity integration proof. | |
| CSA-007 | Account switch safety | Account switch blocks or purges pending queue work from the previous account. | yes | Previous-account queue entries are isolated or purged before new-account sync. | PASS | Settings and keyboard queue partitioning are covered locally. | test/keyboard_sync_queue_test.dart | Also covered in local-cloud and keyboard controller tests. | |
| CSA-008 | Entitlement gate | Missing entitlement or local fallback keeps all cloud domains `local-only`. | yes | Firestore and Storage stay disabled without active auth/entitlement. | PASS | Entitlement and local-fallback gates are covered locally. | test/cloud_sync_overview_test.dart | Also covered in `test/local_cloud_sync_controller_test.dart` and `test/keyboard_sync_controller_test.dart`. | |
| CSA-009 | Asset validation | Oversized or forbidden image type is rejected without deleting the local image. | yes | Invalid image upload is rejected and the local image remains usable. | NOT_RUN | No provider/integration proof executed for reject path. | pending: provider verification | Needs adapter/provider integration proof beyond unit validation. | |
| CSA-010 | Diagnostics redaction | Copied diagnostics stay redacted after upload, download, or apply failures. | yes | Diagnostics copy surface contains build header and redacted failure details only. | BLOCKED | Redaction policy is covered locally, but end-to-end failure copy output was not exercised manually. | test/keyboard_sync_security_test.dart | Needs hosted/manual verification of copied diagnostics after a real sync failure. | |

## Result States

- `synced`: local save plus confirmed remote manifest/profile write, and readable Storage asset when the theme uses an image.
- `partial`: profile JSON restored but image asset missing or not yet applicable.
- `pending`: retryable offline, upload, finalize, or download work remains.
- `conflict`: revision or account mismatch needs an explicit decision.
- `local-only`: auth, entitlement, Firebase configuration, or policy blocks cloud sync.

## Notes

- Android IME restore proof remains device QA, not local VM proof.
- Provider Storage rules proof may require emulator or hosted verification beyond the local textual rules checks.
