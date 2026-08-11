---
artifact: documentation
metadata_schema_version: "1.0"
artifact_version: "2.1.0"
project: "CommandGlows"
created: "2026-08-04"
updated: "2026-08-11"
status: active
source_skill: sg-docs
scope: "commandglows-identity-exceptions"
owner: "Diane"
confidence: high
risk_level: high
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "commandglows_site"
  - "commandglows_app"
  - "shipglows_data/workflow/specs/commandglows-clean-identity-reset.md"
depends_on:
  - "shipglows_data/workflow/specs/commandglows-clean-identity-reset.md"
supersedes:
  - "shipglows_data/workflow/legacy-name-allowlist.md@1.0.0"
evidence:
  - "2026-08-04 active/historical/provider scan and CommandGlows identity reset execution."
next_step: "/103-sg-verify commandglows-clean-identity-reset"
---

# CommandGlows legacy-name allowlist

This is a deny-by-default exception registry. A retained legacy match is valid
only when it belongs to one of the categories below and remains covered by a
focused test or dated evidence. New active product copy, emitted identifiers,
canonical routes, repository links, default paths, or public domains may not use
an old spelling.

## Immutable provider identifiers

- Firebase project ID `winglowz-dev` in `.firebaserc` and provider-console references: immutable external project identity until an authorized replacement project exists.
- Existing Vercel preview hostname `winglowz-app.vercel.app` in historical hosted-validation references: external deployment hostname retained until the CommandGlows preview/project cutover is provisioned and proved.
- CDN host `winflowz.b-cdn.net` in `commandglows_site/src/data/{recommendations,testimonialPeople}.ts`, landing/recommendation pages, CSP, and their tests: legacy object origin retained until each object is copied or aliased and returns HTTP 200 from a CommandGlows-controlled origin.
- Legacy CDN object keys `winglowz_app_*.jpg` used by the landing media set: retain until the corresponding CommandGlows object is copied/aliased and visually checked.
- Historical records may mention `LEMONSQUEEZY_WINGLOWZ_APP_*`, but active configuration and runtime code must not use those keys; CommandGlows now uses Stripe Price IDs and CommunityGlows uses its own Lemon Squeezy keys.
- `commandglows_app/.firebaserc` and its documented `firebase use winglowz-dev` command: private provider project ID, not a public brand; replace only after the new Firebase project is registered and proved.
- Existing external product/store/provider IDs that are not user-visible and cannot be renamed: retain only with redacted provider proof and an owner/retirement condition in the provider ledger.
- Applied migration filenames such as `supabase/migrations/*_init_winglowz_app.sql`: immutable database history; never rename an applied migration.

## Stable internal and historical evidence

- Dated specs, bugs, audits, research, test logs, changelogs, transcripts, commit hashes, observed URLs, and stable `wfz-*` task IDs: factual historical evidence, not active identity.
- Compatibility tests and exact legacy redirects: allowed only when the route/domain was genuinely public and the test proves a bounded redirect or rejection behavior.
- `commandglows_site/tests/deployment/seoDomain.test.ts`: negative-regex guard that must continue detecting old public domains.
- `commandglows_site/v0.md`: dated design/version identifier retained as historical evidence.
- Generated caches, build outputs, `.dart_tool`, `.astro`, `.vercel/output`, screenshots, and disposable archives: do not edit; delete/regenerate or exclude from scans.

## Dormant or transitional runtime surfaces

- A dormant module or migration reference may retain an old name only while it is disabled, explicitly classified, and covered by a removal/rename task. It may not expose an old package, channel, label, notification, accessibility string, or public URL at runtime.

## Enforcement

- The active-name scanner fails on every match outside this allowlist.
- Each exception must name its category, exact path/value, reason, evidence, and removal condition.
- Secrets, tokens, signing keys, private user data, and third-party dependencies are never added to this file.
