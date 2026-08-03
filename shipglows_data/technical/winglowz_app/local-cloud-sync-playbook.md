---
artifact: technical_guidelines
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-05-31"
created_at: "2026-05-31 01:48:26 UTC"
updated: "2026-05-31"
updated_at: "2026-05-31 01:48:26 UTC"
status: reviewed
source_skill: sf-docs
scope: "local-cloud-sync-playbook"
owner: "Diane"
confidence: high
risk_level: high
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "winglowz_app"
  - "Local mode stores"
  - "Firebase Auth"
  - "Cloud Firestore"
  - "Suite identity / entitlements"
  - "Settings > Compte & cloud"
  - "Shared sync/save status"
depends_on:
  - artifact: "shipglows_data/workflow/specs/app-local-to-cloud-data-promotion-merge.md"
    artifact_version: "1.0.0"
    required_status: "ready"
  - artifact: "shipglows_data/technical/winglowz_app/architecture.md"
    artifact_version: "1.0.1"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/winglowz_app/guidelines.md"
    artifact_version: "1.0.1"
    required_status: "reviewed"
supersedes: []
evidence:
  - "2026-05-30 local-to-cloud promotion chantier exposed recurring mistakes: spec questions left open, secrets almost included for convenience, no proof contract at first readiness, no Flutter-specific wiring doc, and subagent handoff unavailable."
  - "SocialGlowz reference doctrine: seed empty cloud only when safe, keep local queue durable, clear stale queues on user change, and show post-auth stages before claiming readiness."
  - "WinGlows keyboard sync controller already implements account-safe seed, hydrate, conflict, queue and account-switch patterns."
next_review: "2026-06-30"
next_step: "/sf-docs technical audit"
---

# Local-Cloud Sync Playbook

## Purpose

This playbook is the reusable doctrine for any WinGlows chantier that turns local-first data into account-backed cloud data.

Use it before implementing sync for a new domain, extending an existing domain, changing post-auth behavior, or making a public claim that data is recoverable after reinstall.

## Owned Files

- `shipglows_data/technical/winglowz_app/local-cloud-sync-playbook.md`
- `shipglows_data/technical/winglowz_app/flutter-local-cloud-sync.md`
- `shipglows_data/workflow/specs/*sync*.md`
- `shipglows_data/workflow/verification/*sync*.md`

## Entrypoints

- Spec first: `shipglows_data/workflow/specs/app-local-to-cloud-data-promotion-merge.md`
- Flutter implementation guide: `shipglows_data/technical/winglowz_app/flutter-local-cloud-sync.md`
- Existing code pattern: `winglowz_app/lib/features/keyboard/application/keyboard_sync_controller.dart`
- Product sync UI surface: `Settings > Compte & cloud`

## Doctrine

Local mode is a real product mode. It is not a disposable pre-account sandbox.

When an account becomes available, the app must compare local data and cloud data before switching the user experience to cloud-backed stores. A valid sign-in is only an identity event; it is not proof that product data has been synchronized.

Core rules:

- Seed local data into an empty cloud automatically only when the account was created in the same flow or the local metadata proves it is the same remembered account.
- Require explicit confirmation before uploading unassociated local data into an existing cloud account, even if that cloud account is empty.
- Hydrate local state from cloud when local is clean and cloud has data.
- Merge non-conflicting records using deterministic business keys.
- Surface conflicts when the same business key has different semantic content.
- Never delete local data before cloud persistence is proven or the user made an explicit decision.
- Never replay a local queue into a different account.
- Never mark a domain `synchronisé` without a cloud write proof or existing cloud presence proof.
- Keep secrets local unless a separate encrypted vault / secret backup spec exists and passes security readiness.

## Decision Matrix

| Local state | Cloud state | Account context | Decision |
| --- | --- | --- | --- |
| empty | empty | any active account | Synced, nothing to move |
| non-empty eligible | empty | account created in same flow | Seed cloud from local |
| non-empty eligible | empty | same remembered account | Seed cloud from local |
| non-empty eligible | empty | existing unassociated account | Block and ask confirmation |
| empty | non-empty | active account | Hydrate local from cloud |
| non-empty | non-empty same checksum | active account | Mark aligned |
| non-empty | non-empty non-conflicting | active account | Merge |
| non-empty | non-empty conflicting | active account | Conflict in Settings > Compte & cloud |
| any | any | no entitlement / local fallback | Local-only, no remote write |
| any pending queue | any | different remembered account | Block, partition or purge old queue |

## Account Association

Before the first account connection, local data is unassociated. The app cannot infer its owner.

After a successful remote sync context exists, local metadata may bind cache and queue state to:

- Firebase UID
- suite `global_user_id`
- local device ID
- domain checksums
- last promoted timestamp

This metadata is a safety guard, not authorization. Authorization still comes from Firebase Auth, suite entitlement and Firestore Security Rules.

## Domain Contract

Every sync domain must define:

- local snapshot loader;
- cloud snapshot loader;
- deterministic business key;
- sanitization and size bounds;
- merge rule;
- conflict rule;
- delete/tombstone rule, if deletes are in scope;
- local-only exclusions;
- proof required before `synced`;
- tests for no cross-account replay.

Recommended business keys:

- Clipboard: normalized hash + source + time/device metadata, with cloud ID when known.
- Snippets: normalized trigger per account.
- Dictionary: normalized term + case-sensitive flag.
- Settings: one profile document with field-level allowlist.
- Voice: stable local UUID or normalized text hash + created-at metadata; do not promote until local storage is durable.

## Secrets Policy

Secrets are excluded from ordinary product sync.

Do not sync:

- OpenAI keys;
- Anthropic keys;
- OAuth/JWT tokens;
- private keys;
- password-like fields;
- raw diagnostics;
- raw private clipboard or transcription payloads flagged as sensitive.

If the product needs secret portability, create a separate high-risk spec for encrypted vault or explicit export/import. Do not add secret values to Firestore through a convenience field.

## UI Contract

The user must see the truth:

- `local uniquement` when cloud is unavailable or intentionally excluded;
- `préparation` / `lecture cloud` / `fusion` / `envoi` while work is active;
- `en attente` for offline or retryable queue work;
- `synchronisé` only after proof;
- `conflit` when user action is required;
- `erreur` for failed or unavailable sync.

`Settings > Compte & cloud` is the primary conflict-resolution surface. Accueil/feed can show indicators and deep links, but it should not become a second conflict-resolution system.

## Required Spec Questions

Every local-cloud sync spec must answer these before readiness:

- Which local data is durable today?
- Which local data is eligible for cloud sync?
- Which data remains local-only?
- Is the path a sign-up seed, existing-account connection, or same-account retry?
- What confirmation is required before uploading unassociated local data?
- What are the business keys and conflict rules?
- How are deletes represented?
- What is the maximum promotion volume?
- What exact proof is required after reinstall/relogin?
- Which secrets or sensitive payloads are excluded?
- Which UI surface owns conflicts?
- Which manual QA is required?

## Required Tests

Minimum automated tests:

- inactive entitlement/session does not touch cloud;
- sign-up flow with empty cloud seeds eligible local data;
- existing empty cloud with unassociated local data requires confirmation;
- same remembered account can flush/seed;
- different remembered account blocks replay;
- cloud non-empty and local clean hydrates local;
- non-conflicting data merges;
- same business key with different content conflicts;
- latest-wins is allowed only with reliable updated-at and device metadata;
- local-only domains do not claim sync;
- secrets and sensitive payloads are excluded;
- metadata/queue survives app restart.

Minimum manual proof:

- create local data;
- create/connect account;
- sync;
- reinstall or use a clean context;
- reconnect same account;
- verify eligible data is restored;
- verify excluded data is not uploaded.

## Common Failure Patterns

Do not repeat these mistakes:

- Treating account creation as a store switch instead of a data migration.
- Passing readiness with open product/security questions.
- Writing a Test Contract without proof profile, proof order and required scenario IDs.
- Forgetting local package/provider versions in the spec when Firebase or SDK behavior matters.
- Letting a worker create partial files without a handoff or validation path.
- Creating a controller but no provider entrypoint.
- Creating provider adapters that cannot be imported with the controller because of interface name collisions.
- Persisting metadata in one JSON shape and reading it back in another.
- Assuming `latest wins` is safe without device and timestamp metadata.
- Marking a domain synced when only local save succeeded.
- Letting docs claim cross-device recovery before reinstall/relogin proof exists.

## Validation

```bash
flutter analyze
flutter test
python3 /home/claude/shipglows/tools/shipglows_metadata_lint.py shipglows_data/technical/winglowz_app/local-cloud-sync-playbook.md
```

## Reader Checklist

- Read this playbook before any account-backed data sync implementation.
- Check whether the target domain has durable local storage.
- Confirm secrets are excluded unless a separate encrypted-vault spec exists.
- Confirm the spec has no open questions before `/sf-start`.
- Confirm the verification checklist includes reinstall/relogin proof.
- Confirm docs do not promise more than tested behavior.

## Maintenance Rule

Update this playbook whenever WinGlows adds a new sync domain, changes account-seeding policy, changes conflict-resolution surfaces, changes secret policy, or changes the proof required for reinstall/relogin recovery.
