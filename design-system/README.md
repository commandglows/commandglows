# CommandGlows design-system foundation

`tokens.json` is the versioned, platform-neutral authority. Its layers have one
allowed direction:

```text
primitive -> semantic -> component -> consumer
```

The reviewed registries are `adaptations.json`, `exceptions.json`, and
`deprecations.json`. The immutable F0 inventory remains historical evidence;
its six initially ambiguous groups are now classified by the active bundle.
The resolved matrix contains 34 roles: 33 are equal on every surface, and
`semantic.typography.body.family` uses the reviewed Flutter, email, and
extension delivery adaptations recorded in `adaptations.json`. No active
legacy or native-migration inventory remains.

All six manifest targets are active and checked in: the resolved-value matrix,
site CSS, Flutter Dart, Android IME Kotlin, email TypeScript, and isolated
extension CSS. Consumers import them through their native bridge or theme
layer. Generated files must never be edited by hand.

## Commands

```powershell
uv run python tools/design_system/generate_tokens.py --validate-only
uv run python tools/design_system/generate_tokens.py --all --check
uv run python tools/design_system/generate_tokens.py --all --dry-run
uv run python -m unittest discover -s tools/design_system/tests -v
uv run python tools/design_system/project_drift_guard.py --format markdown
uv run python tools/design_system/project_drift_guard.py --changed --format markdown
```

Generation is deterministic UTF-8 with LF endings and stable key ordering.
Writes are staged and validated before replacement. `--platform` scopes a run
to one target. Inspection of every target uses `--all --check` or `--all
--dry-run`; a full regeneration uses `--all --allow-platform-writes` and is
reserved for the integration owner.

## Source-drift policy

`tools/design_system/project_drift_guard.py` scans the owned source perimeters
for Dart, Kotlin, Android XML, CSS, Astro, TypeScript/JavaScript, HTML, email,
and extension literals. It does not infer exemptions from directory or file
names containing `theme`, `token`, `palette`, or similar words.

The reviewed `project_drift_policy.json` allowlist is exact-path and requires a
reason, owner, and review or removal condition. It classifies enforcement only;
it cannot create a canonical token, adaptation, or product exception. Exact
generated outputs come from `tokens.json` and are checked for provenance and
staleness by `generate_tokens.py --all --check`.

The current local enforcement baseline is zero unexplained drift: the project
guard scans 445 files with 0 findings, and the independent broad ShipGlows
scanner scans 313 files with 0 findings. Static source proof does not replace
the remaining browser, accessibility, email-client, Flutter-toolchain, Android
CI, or physical-device proof required for rendered no-regression claims.
