---
artifact: technical_module_context
metadata_schema_version: "1.0"
artifact_version: "0.1.0"
project: "WinGlowz"
created: "2026-05-04"
updated: "2026-05-08"
status: draft
source_skill: sf-docs
scope: "code-docs-map"
owner: "Diane"
confidence: medium
risk_level: medium
security_impact: yes
docs_impact: yes
linked_systems:
  - "Flutter"
  - "Android native"
  - "Windows native"
  - "Supabase"
depends_on:
  - "docs/technical/README.md@0.1.0"
supersedes: []
evidence:
  - "Bootstrapped before Android IME implementation."
next_review: "2026-06-04"
next_step: "/sf-docs technical audit"
---

# Code Docs Map — WinGlowz

| Code path / pattern | Subsystem | Primary technical doc | Validation | Docs update trigger |
| --- | --- | --- | --- | --- |
| `lib/**` | Flutter app | `docs/technical/flutter-app.md` | `flutter analyze`; `flutter test` | Platform bridge contract, Settings UI, repository, domain model, or feature behavior changes |
| `lib/features/clipboard/application/**`, `lib/features/clipboard/domain/**`, `lib/features/clipboard/data/**` | Clipboard product API and stores | `docs/technical/flutter-app.md` | `flutter analyze`; `flutter test test/clipboard_domain_test.dart test/clipboard_history_api_test.dart test/in_memory_clipboard_history_store_test.dart test/persistent_clipboard_history_store_test.dart` | Clipboard product contract, persistent local store, sensitivity, dedupe, source, sync state, or backend-agnostic API changes |
| `lib/data/supabase/**` | Supabase provider adapters | `docs/technical/supabase-data.md` | `flutter test test/supabase_clipboard_store_test.dart`; Supabase smoke tests when DB is available | Provider payloads, table mapping, RLS-sensitive metadata, or adapter contract changes |
| `.github/workflows/**`, `firebase.json`, `firestore.rules`, `firestore.indexes.json` | Firebase CI deploy and Firestore config | `docs/technical/firebase-cli-foundation.md`; `docs/technical/firebase-oidc-ci-playbook.md` | Trigger GitHub workflow; verify `Deploy Firestore Rules and Indexes` job; optional local `firebase deploy --only firestore --project <id>` | OIDC/WIF auth, Firebase deploy command, CI secrets, IAM assumptions, rules/indexes, or Firestore API enablement changes |
| `android/app/src/main/**` | Android native | `docs/technical/android-native.md` | `./gradlew :app:compileDebugKotlin` or `flutter build apk --debug` on supported host | Manifest/service/permission, MethodChannel, overlay, IME, media, clipboard, accessibility, or lifecycle changes |
| `windows/**` | Windows native desktop host | `docs/technical/flutter-app.md`; `docs/PLATFORM_BEHAVIOR.md`; `docs/VERIFICATION.md` | Windows runner/manual QA; future `flutter build windows` on supported host | Global hotkeys, overlay window, focus, clipboard, text delivery, Windows plugin/channel, or desktop launch behavior changes |
| `macos/**` | macOS native desktop host | `docs/technical/flutter-app.md`; `docs/PLATFORM_BEHAVIOR.md`; `docs/VERIFICATION.md` | macOS runner/manual QA; future `flutter build macos` on supported host | Quick action monitoring, floating window, focus, clipboard, text delivery, macOS channel, permissions, or desktop launch behavior changes |
| `linux/**` | Linux native desktop host | `docs/technical/flutter-app.md`; `docs/PLATFORM_BEHAVIOR.md`; `docs/VERIFICATION.md` | Linux runner/manual QA; future `flutter build linux` on supported host | GTK keep-above window, accelerator scope, clipboard fallback, Wayland/X11 limits, Linux channel, or desktop launch behavior changes |
| `supabase/migrations/**`, `supabase/tests/**` | Supabase data | `docs/technical/supabase-data.md` | Supabase migration apply and `supabase/tests/rls_smoke.sql` against a linked project | Table, policy, constraint, RLS, realtime, repository metadata, or smoke-test changes |
| `docs/**`, `README.md`, `shipglows_data/business/product.md`, `shipglows_data/business/business.md` | Documentation | `docs/technical/code-docs-map.md` plus target doc | Markdown review and relevant code checks | User-visible platform capability, setup, verification, API, or security promise changes |

## Documentation Update Plan Format

- Code changed: `path/or/pattern`
- Subsystem: `name`
- Primary technical doc: `docs/technical/example.md`
- Secondary docs: `...`
- Required action: `none | review | update | create`
- Priority: `low | medium | high`
- Reason: `why this doc is impacted`
- Owner role: `executor | integrator`
- Parallel-safe: `yes | no`
- Notes: `constraints or blockers`

## Maintenance Rule

Update this map when new code areas become first-class or when validation
commands, subsystem ownership, or documentation triggers change.
