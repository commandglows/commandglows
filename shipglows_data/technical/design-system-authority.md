---
artifact: design_system_authority
metadata_schema_version: "1.0"
artifact_version: "2.2.0"
project: "CommandGlows"
created: "2026-06-11"
updated: "2026-08-14"
status: active
source_skill: 006-sg-design
scope: "design-system-authority"
owner: "Diane"
confidence: high
risk_level: high
security_impact: yes
docs_impact: yes
content_surfaces:
  - "commandglows_app"
  - "commandglows_app/android IME"
  - "commandglows_site"
  - "commandglows_site emails"
  - "ext"
linked_systems:
  - "design-system/tokens.json"
  - "design-system/tokens.schema.json"
  - "design-system/adaptations.json"
  - "design-system/exceptions.json"
  - "design-system/deprecations.json"
  - "tools/design_system/generate_tokens.py"
  - "tools/design_system/project_drift_guard.py"
  - "tools/design_system/project_drift_policy.json"
depends_on:
  - artifact: "shipglows_data/workflow/specs/commandglows-cross-surface-design-system-unification.md"
    artifact_version: "1.4.0"
    required_status: ready
supersedes: []
evidence:
  - "F0 froze 593 site properties, five surface inventories, source checksums, and six initially ambiguous historical role groups."
  - "Manifest 1.3.0 and registry 1.2.0 classify the active matrix: 33 roles resolve equally on all surfaces and the body-font role differs only through three reviewed delivery adaptations."
  - "All six registered adapters are active, generated atomically, and clean under --all --check."
  - "The project drift guard covers Dart, Kotlin, Android XML, CSS, Astro, TypeScript/JavaScript, HTML, email, and extension sources without path-name exemptions."
  - "Local I1 source enforcement passes at 445 files / 0 findings for the project guard and 313 files / 0 findings for the independent broad scanner."
next_step: "Collect the remaining site/browser accessibility, email-client, Flutter 3.41.7, Android CI, and physical IME proof before verification or closure."
---

# CommandGlows design-system authority

## Canonical ownership

`design-system/tokens.json` is the sole platform-neutral authority. Its schema
is `design-system/tokens.schema.json`. Reviewed cross-surface differences,
literal exceptions, and compatibility/deprecation lifecycles live in the three
adjacent registries named by the manifest.

The contract has one direction:

```text
primitive -> semantic -> component -> platform consumer
```

- `primitive` stores typed raw values and cannot reference another token.
- `semantic` assigns stable product meaning and may reference only a primitive.
- `component` composes semantic or acyclic component roles; it cannot become a
  second primitive authority.
- Only semantic roles form the cross-surface identity contract.

Existing CSS, Dart, Kotlin, email, and extension files remain migration inputs,
not peer authorities. Platform-native theme APIs continue to own native
behavior, accessibility semantics, adaptive layout, and interaction state.

## Active platform adapters

The platform-neutral resolved matrix and all five platform adapters are active,
checked-in, digest-bearing outputs of `tools/design_system/generate_tokens.py`.
Their bridge/theme consumers are native integration points, not peer token
authorities.

| Surface | Active mapping/consumer | Manifest-owned generated target | Native responsibility |
| --- | --- | --- | --- |
| Site | `commandglows_site/src/assets/styles/global.css`, `commandglows_site/tailwind.config.mjs` | `commandglows_site/src/assets/styles/generated/commandglows-tokens.css` | Astro/Tailwind composition, responsive layout, browser interaction |
| Flutter | `commandglows_app/lib/core/theme/commandglows_theme_tokens.dart`, `app_theme.dart` | `commandglows_app/lib/core/theme/generated/commandglows_tokens.g.dart` | `ThemeData`, dynamic type, high contrast, reduced motion, adaptive/safe-area behavior |
| Android IME | `KeyboardDesignSystemMapping.kt` and native theme consumers | `commandglows_app/android/app/src/main/kotlin/com/commandglows/app/ime/generated/CommandGlowsTokens.kt` | independent IME startup, touch geometry, press/focus feedback, stored-theme compatibility |
| Email | `commandglows_site/src/theme/newsletter-email-theme.ts` | `commandglows_site/src/theme/generated/email-tokens.ts` | resolved inline/client-safe styles, images-off readability, plain-text equivalence |
| Extension | `ext/src/design-system-mapping.js` | `ext/src/generated/commandglows-tokens.css` | CSP-safe local styles, popup document scope, closed-Shadow-Root host isolation |

The site, app, IME, email, and extension share semantic role meaning. The active
resolved matrix contains 34 roles: 33 resolve identically across all five
surfaces. Only `semantic.typography.body.family` differs: site and Android IME
retain canonical Manrope resolution, Flutter uses bundled Inter, email uses a
client-safe `sans-serif` stack, and the extension uses a local system stack.
The three differences are reviewed adaptations with owner, proof, rationale,
and review condition in `adaptations.json`.

The five non-typographic legacy groups from F0 are no longer active unresolved
state; their relevant shared meanings are represented by equal resolved roles.
The immutable F0 files retain the original evidence for audit provenance only.
The former 63-finding native inventory is resolved: 63 app/native and 9
historical floating-overlay findings were remediated, and both enforcement
scans now report zero findings. User-authored keyboard palettes and imported
content themes remain data, not shared brand roles.

## Adaptations, exceptions, and deprecations

An intentional platform adaptation must name the active semantic role,
surface, resolved value, rationale, owner, proof, and review or removal
condition. Equal names with different values are otherwise a parity failure.

A literal exception must be platform/API/protocol- or user-data-required and
must name its scope, reason, proof, owner, and review/removal condition. The
initial exceptions preserve user-authored keyboard theme v1 data, email-safe
inline delivery, the temporary Theme Studio fixture perimeter, and generated
build-output exclusion.

`tools/design_system/project_drift_policy.json` is a scanner policy, not a
fourth registry. Its exact-path allowlist requires a reason, owner, and review
or removal condition. It may classify a transitional source mapping, source
artwork, or user/content data, but it cannot authorize a new token, adaptation,
or product exception. Substring-based exclusions such as “any path containing
theme/token/color” are forbidden because they hide drift in consumer files.

Compatibility aliases require a consumer count, target role, owner, and
removal condition. Empty registries are explicit; contributors must not infer
unrecorded aliases or adaptations.

## Generation and checked-in ownership

`tools/design_system/generate_tokens.py` validates references, types, layers,
cycles, registry fields, safe relative paths, and parity observations before it
renders any output. It uses stable ordering, UTF-8, LF endings, staged writes,
and rollback of already replaced files on an I/O failure.

`--platform <surface>` scopes a run to one target. `--all` selects all targets
and requires `--allow-platform-writes` for a write transaction. Only the final
integration batch may use that guard against checked-in platform outputs.
Generated adapters carry manifest 1.3.0 provenance and the canonical bundle
digest and must never be hand-edited.

The project drift guard derives generated output paths from `tokens.json` and
excludes only those exact files from literal scanning. Provenance and stale
content remain the existing generator's responsibility; a nearby file or a file
merely named `generated`, `theme`, or `tokens` is still scanned.

## Required commands

```powershell
uv run python tools/design_system/generate_tokens.py --validate-only
uv run python -m unittest discover -s tools/design_system/tests -v
uv run python tools/design_system/project_drift_guard.py --format markdown
uv run python tools/design_system/project_drift_guard.py --changed --format markdown
uv run python tools/design_system/generate_tokens.py --all --check
uv run python tools/design_system/generate_tokens.py --all --dry-run
```

The CI token gate runs manifest/generator validation. The project guard provides
the language/perimeter enforcement missing from the broader ShipGlows syntax
scanner; the broader scan remains additional independent evidence. Current
local baselines are 445 files / 0 findings for the project guard and 313 files /
0 findings for the broad scanner. A green syntax scan does not prove rendered
parity or accessibility.

## Change rule

Every new or changed color, opacity, typography, spacing, dimension, inset,
radius, border, shadow, elevation, overlay, motion, breakpoint, density, or
touch-target decision must trace to this manifest, an approved platform
adaptation, or a documented exception. Consumers use generated/platform-native
adapters and cannot introduce a parallel raw authority.

Every remaining raw-literal exception must be recorded in the canonical
exception registry when it changes product behavior, or in the exact scanner
policy when it is only an enforcement classification. Both require scope,
reason, owner, proof where applicable, and a review/removal condition. An
unexplained scanner finding blocks a zero-drift claim.

No cross-surface parity, accessibility, or visual non-regression claim is valid
until its scenario in the chantier checklist has passed with the required
platform or rendered proof.
