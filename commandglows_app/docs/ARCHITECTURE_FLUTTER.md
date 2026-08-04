---
artifact: documentation
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "CommandGlows"
created: "2026-04-27"
updated: "2026-05-04"
status: "reviewed"
source_skill: "sf-start"
scope: "flutter_architecture"
owner: "Diane"
confidence: "medium"
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
depends_on:
  - "docs/SPEC_FLUTTER_SUPABASE_MIGRATION.md@0.1.0"
  - "docs/API_SUPABASE.md@0.1.0"
supersedes: []
evidence:
  - "docs/SPEC_FLUTTER_SUPABASE_MIGRATION.md"
  - "lib/core/bootstrap/supabase_bootstrap.dart"
next_step: "$sf-docs update"
---

# Architecture Flutter — CommandGlows

## Runtime Layout

- `lib/main.dart` bootstraps Supabase from `--dart-define` and starts Riverpod.
- `lib/app/commandglows_app.dart` configures MaterialApp + router + theme.
- `lib/core/*` holds shared bootstrap, routing, theme and platform capability checks.
- `lib/features/*` holds product domains (auth, voice, clipboard, settings, shell).
- `lib/data/supabase/*` holds Supabase client wiring and repositories.
- `supabase/migrations/*` is the source of truth for schema + RLS + constraints.

## Security Rules in Code

- No service role key in client code.
- Supabase starts only with publishable key + project URL from runtime defines.
- BYOK keys are written to local secure storage facade and never synced.
- Linux and web are treated as secure-storage degraded contexts.
- Platform behavior and overlay availability are shown in UI as explicit capability state.

## Migration Status

- Flutter multi-platform project scaffold is created for Android, iOS, macOS, Windows, Linux and web.
- Supabase baseline migration is created with user-scoped tables, constraints and RLS policies.
- Legacy Expo/Convex application code has been removed from source; legacy references remain in docs only for parity and migration context.

## Next Execution Slice

1. Validate Supabase repositories against a real Auth/RLS environment.
2. Implement real voice pipeline services (local speech, recording, Whisper, Claude fallback).
3. Port Android native overlay to Flutter platform channel.
4. Execute verification matrix from `docs/VERIFICATION.md`.
5. Run purge gate only after parity checks pass.
