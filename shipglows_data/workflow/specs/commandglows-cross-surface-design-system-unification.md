---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.7.0"
project: "CommandGlows"
created: "2026-08-13"
created_at: "2026-08-13 22:19:20 UTC"
updated: "2026-08-15"
updated_at: "2026-08-15 09:42:26 UTC"
status: ready
source_skill: 100-sg-spec
source_model: "GPT-5.6 Codex"
scope: "cross-surface-design-system-unification"
owner: "Diane"
confidence: high
user_story: "En tant qu'opératrice CommandGlows, je veux que le site, l'application Flutter, l'IME Android, les e-mails et l'extension résolvent leurs décisions visuelles depuis une même autorité sémantique versionnée, afin de préserver une identité cohérente et accessible sans empêcher les adaptations propres à chaque plateforme."
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
  - "design-system/"
  - "tools/design_system/"
  - "commandglows_site/src/assets/styles/global.css"
  - "commandglows_site/tailwind.config.mjs"
  - "commandglows_site/src/theme/newsletter-email-theme.ts"
  - "commandglows_app/lib/core/theme/commandglows_theme_tokens.dart"
  - "commandglows_app/lib/core/theme/app_theme.dart"
  - "commandglows_app/android/app/src/main/kotlin/com/commandglows/app/ime"
  - "ext/src"
  - "shipglows_data/technical/design-system-authority.md"
depends_on:
  - artifact: "shipglows_data/technical/design-system-authority.md"
    artifact_version: "1.0.0"
    required_status: draft
  - artifact: "shipglows_data/workflow/specs/winglowz-token-hardening-and-visual-standardization.md"
    artifact_version: "1.0.0"
    required_status: ready
supersedes: []
evidence:
  - "The 006-sg-design audit found separate Dart and CSS authorities without a canonical cross-surface manifest, generated adapters, versioned mappings, or resolved-value parity proof."
  - "The site token layer contains approximately 594 distinct CSS custom properties that mix primitives, semantic roles, component/page concerns, prototypes, and legacy aliases; classification is required before any deletion or rename."
  - "The audit identified competing Tailwind literals/aliases, Flutter alias and font inconsistencies, duplicated visual values between Dart and Kotlin IME code, an incomplete Kotlin/XML scanner perimeter, a separate email theme, and an unstyled extension popup without an isolation contract."
  - "The official broad drift scan executed through uv inspected 484 files and returned seven secondary candidates: three typographic dimensions in global.css and four values in two email prototypes; Flutter and extension returned no official finding under the current scanner coverage."
  - "shipglows_data/workflow/specs/winglowz-token-hardening-and-visual-standardization.md is retained unchanged as historical input whose relevant objectives are absorbed by this broader CommandGlows contract."
  - "Authenticated Playwright proof confirms the protected dashboard in light/dark desktop/mobile modes, a single Sign Out action, 44px dashboard targets, visible keyboard focus, no horizontal overflow, and magenta text contrast from 5.73:1 to 5.91:1."
next_step: "Obtain an entitled test user for protected course docs, Android CI and physical IME proof, received email-client evidence, Flutter visual evidence, and an unpacked-Chrome extension run before verification or closure."
---

# CommandGlows Cross-Surface Design-System Unification

## Title

CommandGlows Cross-Surface Design-System Unification

## Status

Ready. Local integration completes the structural authority, generated adapters, activation, parity classification, native/module drift remediation, documentation reconciliation, I1 source checks, and public-site Playwright remediation. Manifest 1.3.0 produces six clean active outputs; 33 of 34 resolved roles are equal across surfaces and the body-font differences are reviewed adaptations. The app now targets Flutter 3.44.9: static analysis passes with no issue and the full 322-test suite passes. The project guard passes at 446 files / 0 findings and the independent broad scanner at 314 files / 0 findings. Public rendering passes representative mobile/tablet/desktop, light/dark, reduced-motion, target, focus, contrast, semantic, and overflow assertions. The chantier remains partial because entitled course-doc, received email-client, Flutter visual, Android CI, physical IME, and unpacked-extension proof is still unavailable.

## User Story

En tant qu'opératrice CommandGlows, lorsque je fais évoluer une décision visuelle partagée, je veux la définir une fois par rôle sémantique et obtenir des adaptateurs vérifiables pour le site, Flutter, l'IME Android, les e-mails et l'extension, afin que chaque surface reste cohérente, accessible et maintenable tout en conservant ses contraintes natives.

Trigger: an approved visual-token change, a platform adapter regeneration, or migration of an existing consumer. Observable success: every affected surface resolves the same semantic role from the versioned manifest or a documented platform adaptation, with no unintended rendered change during the initial migration. Observable failure: generation, parity, build, accessibility, email, browser, or IME proof fails and blocks the affected batch. Primary edge case: two adapters use the same semantic name but resolve to different values without an explicit, reviewed adaptation.

## Minimal Behavior Contract

CommandGlows establishes one versioned platform-neutral token package with three non-interchangeable layers: raw `primitive` values; product-meaning `semantic` aliases that are the only cross-surface contract; and `component` tokens that may compose semantic roles without becoming a second primitive authority. Page/prototype values stay classified consumers or scoped exceptions, never shared semantics by coincidence. Deterministic adapters map semantic roles and registered platform adaptations into CSS/Tailwind, Dart/Flutter, Kotlin/Android IME, email-safe TypeScript values, and isolated extension CSS. Existing resolved values, serialized keyboard themes/preset identifiers, and rendered appearance remain the default baseline: migration classifies and maps current sources before changing values, retains compatibility aliases only with owner/removal criteria, and blocks any unexplained cross-surface difference. If generation or an adapter fails, the complete generation transaction leaves checked-in last-known-good outputs untouched, CI fails closed, and no surface silently falls back to ad-hoc literals.

## Success Behavior

- One committed package schema declares distinct primitive, semantic, component, platform-adaptation, exception, deprecation, and provenance records; only semantic roles define cross-surface identity, and component tokens may reference only semantic roles or other acyclic component tokens.
- CSS/Tailwind, Dart/Flutter, Kotlin/IME, email, and extension outputs are generated deterministically or validated against the manifest; running generation twice produces no diff.
- The migration inventory classifies the approximately 594 site custom properties as `primitive`, `semantic`, `component`, `page`, `prototype`, `compatibility-alias`, or `unused-candidate`; it does not mechanically rename or delete them.
- App and IME roles that currently duplicate color, typography, spacing, geometry, focus, press, and motion values resolve from a shared manifest mapping while native behavior, theme customization, touch geometry, safe areas, and IME responsiveness remain unchanged.
- Site consumers use generated semantic variables and a narrow Tailwind adapter; generic Tailwind palettes, duplicate configuration keys, test-only tokens, and arbitrary utilities are removed, mapped, or explicitly documented.
- Production emails and prototypes consume email-safe semantic values without depending on CSS custom properties at delivery time; production sends include equivalent HTML and plain-text alternatives, and rendered content remains client-safe, readable with images disabled, and correctly encoded.
- The extension popup and existing injected palette have branded, accessible, CSP-safe token adapters. Injected UI mounts in a closed Shadow Root with an explicitly hardened namespaced host; extension styles neither leak into the page nor inherit host-page visual rules.
- Contradictory design documentation is reconciled with the implemented authority and clearly separates shared identity from intentional platform adaptation.
- The official scanner reports zero unexplained finding, including the seven current secondary candidates, and its coverage includes Kotlin/XML plus generated adapter integrity.

## Error Behavior

- Schema-invalid, cyclic, cross-layer-invalid, missing, duplicate, or unknown token references stop generation with the token path and adapter name. All outputs are staged and validated before replacement; a failed all-surface run replaces none, and a failed targeted run replaces no file for that target.
- A resolved-value mismatch not present in the adaptation registry fails parity validation and identifies both surfaces and values.
- A requested visual value change discovered during migration is separated from the no-redesign migration, documented as a product/design decision, and requires a replacement approved plan before implementation.
- If a current literal is mandated by a platform, email client, protocol, or user-authored keyboard theme, it is retained only as a named, scoped exception with rationale, proof, owner, and removal condition.
- If browser, accessibility, email-client, Flutter, Android CI, or physical IME proof is unavailable, the affected batch remains partial; source-level checks cannot support a no-regression claim.
- Generated checked-in outputs are never hand-edited. CI reports how to regenerate them and rejects stale or manually divergent output.
- Invalid or unsafe email content remains escaped by the existing renderer; token migration must not introduce raw HTML interpolation or remote styling dependencies.

## Problem

CommandGlows has mature local token systems but not a monorepo design system. Flutter and Astro are separate authorities; Kotlin IME code duplicates visual decisions outside Dart; email owns another theme; the extension has no shared styling; and documentation does not describe the real perimeter. The site's approximately 594 variables are centralized but mix layers and lifecycles, while Tailwind reintroduces competing values. The current scanner found only seven candidates across 484 files, but that small number reflects its present syntax/perimeter and does not prove cross-surface parity, especially for Kotlin/XML, generated adapters, fonts, semantic aliases, or resolved rendered roles.

## Solution

Create a repository-owned `design-system/` package containing a versioned JSON semantic manifest, a schema, an explicit platform-adaptation registry, and generated resolved-value evidence. Add a dependency-light deterministic Python generator/checker executed through `uv` under `tools/design_system/`. Generate or validate thin platform adapters while retaining platform-native theming APIs. Migrate in dependency order: establish the foundation and baseline first; then run non-overlapping app/native, site, email, and extension/documentation batches; finally integrate and prove cross-surface parity. The first release is a structural unification, not a rebrand or visual refresh.

## Scope In

- Canonical manifest, schema, semantic taxonomy, adaptation/exception registry, generated-file ownership markers, and resolved-value parity matrix under `design-system/`.
- Deterministic generator/check commands under `tools/design_system/`, plus CI enforcement for schema, generation cleanliness, stale outputs, source coverage, and parity.
- CSS custom-property inventory and classification; generated site semantic tokens; constrained Tailwind mapping; migration of production consumers and justified compatibility aliases.
- Flutter token aliases, typography/font role mapping, `ThemeData`/`ColorScheme`/`TextTheme`/`ThemeExtension` consumption, light/dark/high-contrast/reduced-motion behavior, and Keyboard Theme Studio exception treatment.
- Kotlin/Android IME token generation or validation for visual roles duplicated from Dart, without coupling runtime IME availability to Flutter startup.
- Production newsletter email theme and `idees/emails` prototypes, including the four current prototype candidates, equivalent production plain-text output, and email-client-safe HTML.
- Extension popup styling plus migration of the existing injected palette in `ext/src/content-script.js` to closed-Shadow-DOM ownership and a hardened namespaced host.
- Scanner coverage for Kotlin, Android XML, email adapters, extension CSS, generated-file provenance, and resolved-value comparison.
- Reconciliation of design-system authority, brand/design specification, contributor guidance, exception policy, and migration runbook.
- Cleanup or documented classification of the seven official findings.

## Scope Out

- New brand identity, palette, typography direction, marketing art direction, or visual redesign.
- Mechanical renaming/deletion of all existing CSS variables or forced identical raw values where a platform adaptation is required.
- Replacement of Material, browser-native, email-client-safe, or maintained accessible component behavior with bespoke controls.
- Business logic, auth, commerce, data model, content strategy, feature behavior, or unrelated application architecture.
- User-authored keyboard theme data as global brand tokens; only its editor, validation boundaries, defaults, and preview roles are in scope.
- Generated build/dependency outputs such as `.vercel/output`, Flutter build folders, or third-party library internals.
- External deployment, store publication, provider mutation, or production release.

## Constraints

- Preserve current resolved values and rendered appearance by default. Any intentional visual change requires explicit before/after evidence and separate approval if material.
- Enforce the layer direction `primitive -> semantic -> component -> consumer`; semantic names express stable product meaning, component/page tokens cannot become raw-value aliases, and platform adaptations attach to a semantic role rather than fork its name.
- One canonical semantic role may have an intentional platform adaptation only when the registry names the surface, value/behavior difference, rationale, owner, proof, and review/removal condition.
- Generated adapters are checked in for consumers that cannot run Python at build/runtime, but generator output is reproducible and CI-enforced.
- The generator exposes target-scoped writes (`--platform <surface>`) that cannot rewrite another batch's adapter; only `--all` may reconcile every adapter, and only the integration batch may run it in write mode. Both modes stage, validate, and replace atomically with canonical UTF-8/LF serialization and stable ordering.
- Token names encode semantic purpose, not raw value or one page's implementation. Component/page tokens may remain local when they compose canonical semantic roles and are classified.
- Fonts must be mapped by role and fallback behavior. A shared design system does not require the site and app to use the same physical font when licensing, loading, readability, or platform constraints justify an adaptation.
- Flutter retains native adaptive layout, dynamic type, safe-area, high-contrast, reduced-motion, and Material interaction semantics. Android IME must remain independently launchable and responsive when Flutter is absent.
- Email output uses inline/client-safe resolved values; it must not rely on CSS variables, JavaScript, external stylesheets, or remote fonts to remain readable.
- Extension assets/styles remain local and CSP-compatible. Popup styles are extension-document scoped. Injected UI uses a closed Shadow Root, a `data-commandglows-*` host, and an inline-important or equivalently dominant host reset limited to geometry/visibility needed to resist hostile author CSS; there is no light-DOM fallback, broad host selector, generic custom-property namespace, remote asset, or permission expansion.
- Existing keyboard theme JSON v1, preset IDs, SharedPreferences keys, cloud-sync payloads, user colors/images, and profile revisions are data invariants. The structural token migration may add readers/adapters but must not bulk-rewrite stored data, silently remap a custom theme, or bump a data schema; any required persistent-schema migration is a material scope change and stops for a replacement plan.
- Existing unrelated dirty files, including the untracked root `ENVIRONMENT.md`, remain outside every implementation batch.
- The old `winglowz-token-hardening-and-visual-standardization.md` spec remains unchanged and is not marked superseded; it is historical input absorbed by this broader contract.

## Test Contract

- `surface`: canonical manifest/generator, Astro/Tailwind site, Flutter app, native Android IME, production/prototype emails, extension popup/injected UI contract, governance documentation, and CI.
- `proof_profile`: cross-surface design migration with deterministic generation, resolved-value parity, rendered visual no-regression, accessibility, and platform-specific validation.
- `proof_order`: schema/inventory baseline → deterministic generation/parity → per-batch static/unit/build checks → browser/a11y/email rendering → Flutter widget/theme proof → Android CI/physical IME proof → integrated drift scan and documentation review.
- `checklist_path`: `shipglows_data/workflow/test-checklists/commandglows-cross-surface-design-system-unification.md` must be created during implementation and contain every scenario below.
- `required_scenario_ids`: `DS-FOUNDATION-001`, `DS-PARITY-001`, `DS-SITE-001`, `DS-SITE-A11Y-001`, `DS-FLUTTER-001`, `DS-IME-001`, `DS-PRESET-001`, `DS-EMAIL-001`, `DS-EXT-001`, `DS-DRIFT-001`, `DS-DOCS-001`, `DS-FAIL-001`.
- `required_results`: every scenario is `pass`; missing browser/device/email-client proof is `exception_with_proof` and leaves the dependent batch and chantier partial.

| Scenario | Trigger | Required observable result | Evidence |
| --- | --- | --- | --- |
| `DS-FOUNDATION-001` | Validate and generate the unchanged manifest twice | Both runs succeed, outputs are byte-identical, and the second run produces no diff | generator tests, `--check`, git diff |
| `DS-PARITY-001` | Compare shared roles across all adapters | Equal roles resolve equally; every difference matches an adaptation registry entry | machine-readable resolved matrix and parity report |
| `DS-SITE-001` | Render representative public/docs/account surfaces at mobile, tablet, and desktop in light/dark modes | No unintended layout, typography, color, motion, or component-state drift | browser screenshots and baseline comparison |
| `DS-SITE-A11Y-001` | Navigate representative interactive components by keyboard and automated a11y scan | Focus is visible, order/semantics remain correct, contrast and target rules pass, reduced motion is honored | browser keyboard trace, axe-equivalent report, contrast results |
| `DS-FLUTTER-001` | Run app theme/widget tests in light/dark, text scaling, high contrast, and reduced motion | Themes resolve generated roles and screens remain readable/stable | `flutter analyze`, targeted tests, full Flutter tests, visual evidence |
| `DS-IME-001` | Launch and type with the Android keyboard under default/custom themes and rapid input | Keys, focus/press states, touch geometry, action row, safe area, theme preview, and input behavior remain correct without Flutter runtime dependency | Android CI tests, physical-device checklist, rapid-typing/IME evidence |
| `DS-PRESET-001` | Load frozen v1 SharedPreferences/theme JSON, catalog presets, custom image/color themes, and v1/v2 cloud-sync fixtures, then save/round-trip without a schema migration | Preset IDs, user-selected values, checksums/profile revisions, fallback behavior, and IME/app interpretation remain compatible; no background rewrite occurs | Dart/Kotlin fixture tests, bridge parity test, before/after serialized snapshots |
| `DS-EMAIL-001` | Render production and prototype emails with representative escaped EN/FR and long content, images disabled, and plain-text delivery enabled | Resolved inline styles are stable, HTML is contextually encoded, plain text carries equivalent content and links, and hierarchy/readability survive the supported client matrix | HTML/plain-text snapshots, HTML/style lint, escaped-content negative test, images-off and supported-client screenshots |
| `DS-EXT-001` | Open the popup and injected palette on a fixture with hostile global selectors/custom properties and keyboard interaction | Popup is branded and accessible; the palette lives in a closed Shadow Root with a visible hardened host; neither surface leaks styles, inherits hostile computed values, or requires remote code/styles | extension tests, browser screenshots, closed-root/host-reset assertion, computed-style isolation check, CSP review |
| `DS-DRIFT-001` | Run broad and changed-file scans | Zero unexplained findings; Kotlin/XML/email/extension/generated coverage is present; seven baseline candidates are removed or justified | official uv scanner reports and coverage fixtures |
| `DS-DOCS-001` | Follow authority and contribution docs from a clean checkout | Paths, commands, role taxonomy, exceptions, generated ownership, and platform adaptations match implementation | link/path/metadata checks and reviewer walkthrough |
| `DS-FAIL-001` | Introduce an invalid token, stale adapter, cyclic alias, and unexplained parity mismatch in fixtures | Each fails closed with actionable diagnostics and no partially rewritten output | negative generator/parity tests |

## Dependencies

- Project truth: `AGENT.md`, `shipglows_data/technical/architecture.md`, `shipglows_data/technical/guidelines.md`, `shipglows_data/technical/design-system-authority.md`, and the nearest app/site guidance.
- Historical input: `shipglows_data/workflow/specs/winglowz-token-hardening-and-visual-standardization.md` and its audit/checklist; useful goals are absorbed, but historical status and evidence remain untouched.
- Existing authorities/consumers: `commandglows_app/lib/core/theme/commandglows_theme_tokens.dart`, `commandglows_app/lib/core/theme/app_theme.dart`, Kotlin IME sources/resources, `commandglows_site/src/assets/styles/global.css`, `commandglows_site/tailwind.config.mjs`, `commandglows_site/src/theme/newsletter-email-theme.ts`, `commandglows_site/idees/emails/`, and `ext/src/`.
- Tooling: the installed `uv` Python surface, existing pnpm/Flutter commands, repository CI, browser proof tooling, and approved Android CI/device proof path.
- Documentation freshness: `fresh-docs not needed` for the draft architecture because it preserves local behavior and adds no external dependency. Implementation must run the freshness gate before relying on current Tailwind/Astro/Flutter/Android/email-client/extension behavior or introducing a new package.
- Design authority: ShipGlows `design-system-token-contract.md`; the implementation must update the project authority before migrating consumers.

## Invariants

- CommandGlows brand meaning, approved logo assets, public copy, business behavior, auth/commerce/data behavior, and platform feature behavior do not change.
- A cross-surface role traces from manifest → generated/validated adapter → platform-native theme/component → rendered proof.
- Parallel hand-maintained files are not treated as equal authorities merely because their names match.
- Accessible behavior remains owned by platform/native or maintained primitives; token migration owns visual composition, not replacement interaction semantics.
- Light/dark/high-contrast/reduced-motion modes, focus visibility, text scaling, touch targets, safe areas, IME geometry, and email readability cannot be weakened to achieve token uniformity.
- A user-authored custom keyboard theme remains user data, validated and mapped through supported roles; it is not overwritten by brand regeneration.
- No generated output contains secrets, personal data, external credentials, or machine-specific absolute paths.

## Links & Consequences

- Upstream: brand/identity decisions and the project design-system authority define semantics; changes to either require manifest and adapter revalidation.
- Downstream: Astro pages/components, Tailwind utilities, Flutter themes/widgets, Kotlin IME rendering, email templates, extension UI, screenshots, tests, CI, and contributor docs consume or police the contract.
- Before → after: separate CSS/Dart/email authorities plus an unstyled extension → one semantic manifest with platform-native generated/validated adapters and explicit adaptations.
- Before → after: approximately 594 unclassified CSS variables → a reviewed inventory whose retained variables have an owned layer and migration status; no mechanical deletion target is imposed.
- Before → after: Dart/Kotlin duplication and scanner blind spots → generated or parity-validated native tokens plus scanner coverage fixtures.
- Any future change to a shared role requires regeneration, resolved parity, impacted-surface proof, and documentation review. A platform-only role must still be classified and namespaced.
- The seven current official findings are acceptance debt, not the measure of architectural completion.

## Documentation Coherence

- Rewrite `shipglows_data/technical/design-system-authority.md` as the canonical ownership map, including manifest/schema, generated outputs, adapters, platform adaptations, exception policy, and validation commands.
- Reconcile `commandglows_site/docs/DESIGN_SPECIFICATION.md` with current brand, semantic-role, arbitrary-value, and component rules; remove advice that contradicts the authority.
- Add contributor/generated-file guidance near `design-system/` and in affected app/site/extension guidance where necessary.
- Document email-specific constraints and extension isolation/CSP rules without representing them as visual divergence.
- Retain `winglowz-token-hardening-and-visual-standardization.md` unchanged as historical evidence; reference this spec as the current CommandGlows continuation without altering or superseding the old record.
- Documentation cannot claim parity, accessibility, or no regression until the corresponding required scenario passes.

## Edge Cases

- A CSS variable is page-specific but reused coincidentally; classification must not promote it to a semantic role without matching meaning.
- Two values are numerically equal today but serve different roles; they remain separate semantic tokens so future changes do not couple them accidentally.
- A shared role needs different Flutter density, IME touch geometry, email line height, or extension focus treatment; the adaptation must be explicit and proven rather than hidden in a local literal.
- A font is unavailable offline, blocked by CSP, unsupported in email, or licensed only for one surface; adapters use documented fallbacks without changing the role's hierarchy.
- A custom keyboard palette intentionally differs from brand colors; validation preserves user choice while native chrome/focus/error roles remain safe and accessible.
- Old CSS compatibility aliases form a cycle or hide an unused token; generator/parity validation fails rather than resolving unpredictably.
- Generated output is changed manually, a contributor runs an old generator, or line endings/order differ across Windows and CI; `--check` and deterministic serialization reject the drift.
- Host-page CSS uses aggressive selectors or custom properties matching common names; extension namespace/isolation prevents collision.
- Email clients strip styles, invert colors, block images, or wrap long localized strings; content remains readable and hierarchy survives.
- The current scanner stays green while rendered values diverge; resolved-value and visual scenarios remain blocking because scanner output alone is insufficient.

### ZOMBIES coverage

- **Z — Zero:** empty manifest, surface with no adapter, zero remaining consumers of a compatibility alias, email with images disabled, extension with no host-page styles available.
- **O — One:** one semantic token, one theme, one consumer, and one intentional adaptation generate and resolve correctly.
- **M — Many:** approximately 594 CSS variables, repeated aliases, multiple themes/surfaces, concurrent non-overlapping migration batches, long email content, and multiple keyboard theme states preserve deterministic ordering and ownership.
- **B — Boundaries:** text scaling, contrast/target minimums, smallest extension popup, mobile/tablet/desktop breakpoints, IME safe-area/touch geometry, token numeric limits, font fallback, and email-client CSS limits.
- **I — Interfaces:** manifest/schema ↔ generator ↔ generated adapters ↔ platform themes/components ↔ scanner/CI; each boundary has an owner and machine-readable proof.
- **E — Exceptional:** invalid/cyclic reference, missing adapter, stale output, partial generation, unavailable browser/device/client proof, CSP collision, manual edit, and unexplained parity mismatch fail closed and retain last-known-good outputs.
- **S — Simple:** migrate unchanged resolved values through the smallest role set first, then expand by classified layer; do not combine structural unification with a redesign.

## Implementation Tasks

- [x] **Task 1 — Freeze the baseline and classification ledger**
  - Targets: new `design-system/inventory/`; existing token/theme sources read-only during inventory.
  - Action: capture resolved roles/values, variable ownership, fonts, modes, adapters, literals, scanner perimeter, exceptions, and representative visual baselines. Classify every site custom property and all app/native/email/extension sources without renaming them.
  - User-story link: prevents a structural migration from changing appearance or losing platform meaning.
  - Dependencies: none.
  - Validate with: inventory schema check, duplicate/unclassified report, official broad uv drift scan, reviewed baseline screenshots/checksums.
  - Constraints: no consumer/token value changes; generated/dependency outputs excluded and documented.

- [x] **Task 2 — Establish the canonical semantic foundation**
  - Targets: new `design-system/`, new `tools/design_system/`, project CI, `shipglows_data/technical/design-system-authority.md`.
  - Action: define the versioned JSON manifest/schema, semantic taxonomy, adaptation/exception registry, provenance headers, deterministic generator/checker, resolved-value matrix, negative fixtures, and CI commands. Seed values from Task 1 without redesign.
  - User-story link: creates the single authority and enforceable interface used by every surface.
  - Dependencies: Task 1.
  - Validate with: schema/negative tests; generate twice; `uv run python tools/design_system/generate_tokens.py --check`; parity report; clean diff on second run; CI workflow syntax/path checks.
  - Constraints: dependency-light Python via uv; no runtime Python requirement for shipped apps; atomic writes only.

- [x] **Task 3 — Prepare Flutter and native Android IME source mappings**
  - Targets: `commandglows_app/lib/core/theme/`, affected Flutter consumers/tests, Dart/Kotlin adapter source mappings and compatibility fixtures, affected IME sources/tests; generated Dart/Kotlin outputs remain integration-owned by Batch I.
  - Action: normalize semantic aliases and font roles, consume adapter values through Flutter theme APIs, map duplicate Kotlin roles, classify Keyboard Theme Studio fixtures/user themes, and add scanner fixtures for Dart/Kotlin/XML. Freeze and round-trip existing theme JSON v1, preset IDs, SharedPreferences keys, custom colors/images, cloud-sync v1/v2 payloads, checksums, and profile revisions; do not bulk-rewrite persisted data or introduce a destructive schema migration.
  - User-story link: gives app and keyboard one traceable semantic identity without weakening native behavior.
  - Dependencies: Task 2.
  - Validate with: target fixture/parity check; mandatory `DS-PRESET-001`; `flutter analyze`; targeted theme/widget/keyboard tests; full `flutter test`; approved Android CI unit/build checks; physical-device IME checklist including rapid typing, press/focus, action row, custom theme, safe area, high contrast, text scaling, and reduced motion.
  - Result: source work is complete and fixture-backed; Flutter 3.44.9 analysis and all 322 tests pass, while rendered visual and Android CI/device proof remain missing.
  - Activation ownership: `A-act` may edit only `commandglows_app/lib/core/theme/commandglows_theme_tokens.dart` and `commandglows_app/android/app/src/main/kotlin/com/commandglows/app/ime/KeyboardDesignSystemMapping.kt`. Generated Dart/Kotlin outputs belong to `I0`; other native literals belong to `E-native`.
  - Constraints: no app/IME behavior change; no Flutter-runtime dependency for IME; no stored-theme/preset/schema rewrite; no generated-output edit in `A-act`.

- [x] **Task 4 — Prepare the Astro/Tailwind site migration**
  - Targets: generated site CSS adapter, `commandglows_site/src/assets/styles/global.css`, `commandglows_site/tailwind.config.mjs`, affected production components/pages/tests.
  - Action: import generated semantic roles, reduce Tailwind to intentional aliases, remove duplicate/test/generic competing authorities, migrate consumers by classification, retain time-bounded compatibility aliases, and resolve the three current `global.css` candidates.
  - User-story link: makes site consumption traceable without flattening component/page composition or changing visual direction.
  - Dependencies: Task 2.
  - Validate with: inventory delta and zero unexplained site drift; `pnpm build:check`; `pnpm test:unit`; deterministic generation; representative browser screenshots at registered local URL; keyboard/focus/contrast/reduced-motion/a11y checks.
  - Result: source work is complete; 154 unit tests, `pnpm build:check`, and the project drift scan passed locally. Proof remains `partial` because browser/a11y evidence is missing.
  - Activation ownership: `B-act` may edit only `commandglows_site/src/assets/styles/global.css` and `commandglows_site/tailwind.config.mjs`. Generated CSS belongs to `I0`; rendered evidence belongs to `I1`.
  - Constraints: no mechanical 593-variable rename; no framework-default port; no generated-output edit in `B-act`; preserve current appearance and accessible behavior.

- [x] **Task 5 — Prepare production email and prototype migration**
  - Targets: email adapter source mapping and fixtures, `commandglows_site/src/theme/newsletter-email-theme.ts`, production email consumers/tests, `commandglows_site/idees/emails/` prototypes; generated email output remains integration-owned by Batch I.
  - Action: map client-safe semantic roles to resolved inline values, remove local authorities where possible, classify unavoidable email literals, fix or justify the four prototype candidates, and make every production email send provide equivalent HTML and plain-text bodies with the same essential content and links. Add contextual escaping, plain-text, images-off, dark-client, and long-content proof.
  - User-story link: extends the same identity to delivered communication without assuming browser CSS capabilities.
  - Dependencies: Task 2.
  - Validate with: target fixture/parity check; production/prototype HTML snapshots plus production plain-text snapshots; HTML/style lint; escaped-content negative test for both representations; images-off and representative client/render screenshots; broad drift scan.
  - Result: source work is complete; 7 email tests, 154 site unit tests, and `pnpm build:check` passed locally. Proof remains `partial` because the images-off/supported-client matrix is missing.
  - Activation ownership: `C-act` may edit only `commandglows_site/src/theme/newsletter-email-theme.ts`, `commandglows_site/src/lib/email/newsletter.ts`, `commandglows_site/src/pages/api/newsletter/subscribe.ts`, and `commandglows_site/src/pages/api/newsletter/unsubscribe.ts`. Generated TypeScript belongs to `I0`.
  - Constraints: no remote font/stylesheet/JavaScript dependency; no raw untrusted markup; no generated-output edit in `C-act`; current content/delivery behavior unchanged.

- [x] **Task 6 — Prepare and isolate the extension**
  - Targets: extension adapter source mapping and fixtures, `ext/src/popup.html`, `ext/src/popup.js`, `ext/src/content-script.js`, extension tests/config, extension-owned UI styles; generated extension CSS remains integration-owned by Batch I.
  - Action: add semantic popup styling and states, namespace all selectors/custom properties, enforce local assets/CSP, and migrate the existing host-page-injected palette into a closed Shadow Root on a hardened namespaced host. Preserve native dialog semantics, initial focus, keyboard traversal, Escape dismissal, close cleanup, and restoration of focus to the originating editable field; do not provide a light-DOM fallback.
  - User-story link: brings the unstyled surface into the shared identity without contaminating host pages.
  - Dependencies: Task 2.
  - Validate with: extension load/test; popup and injected-palette keyboard/focus/contrast/target checks; closed-root/host-reset assertion; hostile host-page computed-style isolation fixture; dialog open/close/Escape/focus-restoration trace; CSP/no-remote-resource inspection; browser screenshots; scanner coverage.
  - Result: source work is complete; 31 extension tests, extension check, and project drift scan passed locally. Proof remains `partial` because real Chrome interaction/isolation screenshots are missing.
  - Activation ownership: `D-act` may edit only `ext/src/design-system-mapping.js`, `ext/src/popup.html`, `ext/src/content-script.js`, and `ext/src/service-worker.js`. Generated extension CSS belongs to `I0`.
  - Constraints: closed Shadow Root required; no light-DOM fallback, broad host selectors, remote code/fonts, permission expansion, or generated-output edit in `D-act`.

- [x] **Task 7 — Reconcile documentation and enforcement coverage**
  - Targets: `shipglows_data/technical/design-system-authority.md`, `commandglows_site/docs/DESIGN_SPECIFICATION.md`, affected contributor docs, official scanner and its tests, migration checklist.
  - Action: document the real authority and platform adaptations, remove contradictory brand/token guidance, expand scanner coverage for Kotlin/XML/email/extension/generated provenance, and record every remaining exception with owner/removal condition.
  - User-story link: makes the unified system usable and prevents reintroduction of competing authorities.
  - Dependencies: Tasks 3–6 for final paths and exceptions; documentation drafting may begin after Task 2 but finalization waits for all adapters.
  - Validate with: metadata/link/path checks; scanner coverage fixtures; broad and changed scans through uv; reviewer walkthrough from clean checkout; no unresolved placeholder or contradictory canonical path.
  - Result: authority/foundation docs and scanner coverage reflect six active adapters, resolved parity, zero active migration inventory, and the exact remaining proof limits. The 63 app/native and 9 historical module findings are remediated; 19 Python tests, the 445-file project guard, and the 313-file broad scanner pass with zero findings.
  - Remaining ownership: I1 specialist owners retain only rendered/browser/client/toolchain/CI/device proof; local authority, parity, drift, and documentation evidence is complete.
  - Constraints: do not modify/supersede historical evidence or claim parity before integrated proof.

- [ ] **Task 8 — Execute the repaired integration plan**
  - Targets: generated outputs, CI, test checklist/evidence, this spec lifecycle fields during the appropriate owner skill.
  - Action: integrate all adapters, run every required scenario, compare resolved values and rendered roles, prove failure paths, and record residual time-bounded exceptions.
  - User-story link: establishes that unification is real in source, resolved values, and rendered behavior.
  - Dependencies: Tasks 3–7.
  - Validate with: all `DS-*` scenarios; full project checks; official uv drift scan with zero unexplained finding; `git diff --check`; visual/a11y/email/Flutter/IME proof.
  - Executable order: `F1.1 -> I0 -> (A-act, B-act, C-act, D-act, E-native) -> I1`.
  - `F1.1` reconciles manifest/adaptations/deprecations/exceptions/provenance, typed Dart and packaged Kotlin renderer APIs, the email interface, extension `:host`, adapter `active` statuses, CI `--all` paths, and protects the F0 baseline. It writes no outputs or consumers.
  - `I0` generates only the registered outputs; activation batches edit only their exact bridges/consumers and never manifest/generator/output files; `E-native` edits only non-generated Kotlin/native findings; `I1` records parity, integrated proof, evidence, and serialized spec/checklist traces without source edits.
  - Result: local I1 checks remain clean after the protected-dashboard remediation: 19/19 foundation tests, six generated outputs current, project guard 446/0 broad and 51/0 changed, independent scanner 314/0 broad and 60/0 changed, site 155/155 with Astro check clean, and extension 31/31 with package check clean. Authenticated Playwright verifies the dashboard at 1280x720 and 390x844 in light/dark modes, including a single Sign Out action, keyboard focus, no horizontal overflow, 44x44px dashboard actions, and magenta contrast of 5.73:1 to 5.91:1.
  - Remaining ownership: protected course documentation requires an entitled test user; Flutter rendered visual proof, Android CI/device IME, received email-client, and unpacked-Chrome extension proof remain unavailable locally.
  - Constraints: missing specialist proof keeps the chantier partial; no deployment, release, redesign, or product-scope expansion.

## Execution Batches

Parallel writes are permitted only after `101-sg-ready` marks this spec ready and the integration owner verifies clean, non-overlapping ownership.

| Batch | Dependency | Exclusive write ownership | Forbidden overlap | Per-batch validation | Integration owner |
| --- | --- | --- | --- | --- | --- |
| `F0 — Baseline` | none | `design-system/inventory/` and the new checklist baseline only | all existing token sources/consumers | Task 1 baseline and scanner | `006-sg-design` |
| `F1.1 — Foundation reconciliation` | completed `F1` | `design-system/tokens.json`, `tokens.schema.json`, `adaptations.json`, `deprecations.json`, `exceptions.json`, `tools/design_system/generate_tokens.py`, its tests, and `.github/workflows/design-system-token-gate.yml` | all generated outputs and every consumer/bridge | manifest/API/status/provenance tests; CI path assertion; F0 checksum unchanged | `006-sg-design` |
| `I0 — Generate outputs` | `F1.1` | `commandglows_site/src/assets/styles/generated/commandglows-tokens.css`; `commandglows_app/lib/core/theme/generated/commandglows_tokens.g.dart`; `commandglows_app/android/app/src/main/kotlin/com/commandglows/app/ime/generated/CommandGlowsTokens.kt`; `commandglows_site/src/theme/generated/email-tokens.ts`; `ext/src/generated/commandglows-tokens.css`; `design-system/resolved-values.json` | manifest/generator/policy, every bridge/consumer, evidence/spec/checklist | atomic `--all` generation then `--check` | `006-sg-design` |
| `A-act — App/native activation` | `I0` | `commandglows_app/lib/core/theme/commandglows_theme_tokens.dart`; `commandglows_app/android/app/src/main/kotlin/com/commandglows/app/ime/KeyboardDesignSystemMapping.kt` | generator/manifest/outputs, other native files, site/email/extension | source/import checks; Flutter proof where available | app/native owner |
| `B-act — Site activation` | `I0` | `commandglows_site/src/assets/styles/global.css`; `commandglows_site/tailwind.config.mjs` | generator/manifest/outputs, app/email/extension | 154 tests, build, site scan; browser proof if URL exists | site owner |
| `C-act — Email activation` | `I0` | `commandglows_site/src/theme/newsletter-email-theme.ts`; `commandglows_site/src/lib/email/newsletter.ts`; newsletter subscribe/unsubscribe routes | generator/manifest/outputs, non-email UI, app/extension | 7 email tests, 154 tests, build; client matrix if available | email owner |
| `D-act — Extension activation` | `I0` | `ext/src/design-system-mapping.js`; `ext/src/popup.html`; `ext/src/content-script.js`; `ext/src/service-worker.js` | generator/manifest/outputs, app/site/email | 31 tests, extension check, scan; Chrome proof if available | extension owner |
| `E-native — Native drift remediation` | `I0` | only non-generated Kotlin/native files reported by the 63-finding guard | `KeyboardDesignSystemMapping.kt`, generated Kotlin, generator/manifest/policy, other surfaces | 15 scanner tests; broad guard zero unexplained or evidence-backed exceptions | native owner |
| `I1 — Integration and proof` | `A-act–E-native` | parity/evidence artifacts, CI evidence-only reconciliation, this spec, and its checklist | all source, manifest/generator, bridges/consumers, generated outputs | all DS scenarios, metadata, placeholder scan, overlap assertion, `git diff --check` | `006-sg-design` |

Ownership invariant: `F1.1` writes no output/consumer; `I0` writes outputs only; activation batches write no manifest/generator/output; `E-native` writes no generated or mapping bridge file; `I1` writes evidence/traces only. Any overlap stops execution and returns to the integration owner for rebatching.

## Acceptance Criteria

- [ ] AC-1: A versioned canonical semantic manifest/schema and adaptation registry exist, and every supported adapter traces to them.
- [ ] AC-2: Generation is deterministic and atomic; two runs are byte-identical, `--check` is clean, stale/manual generated edits fail CI, and failure leaves last-known-good files intact.
- [ ] AC-3: The approximately 594 CSS variables have an explicit classification and migration status; no acceptance metric requires blind renaming or deletion.
- [ ] AC-4: Shared roles compare by resolved value across CSS/Tailwind, Dart, Kotlin, email, and extension; every divergence is documented and proven as an intentional platform adaptation.
- [ ] AC-5: Flutter aliases, fonts, theme modes, and native IME visual roles are coherent; Dart/Kotlin duplication is generated or parity-validated; IME behavior and independence are preserved.
- [ ] AC-6: Tailwind contains no unexplained competing brand palette, duplicate config authority, test token, or arbitrary production visual utility outside the documented policy.
- [ ] AC-7: Production emails and prototypes consume the email adapter or a documented client-bound exception; rendered content remains escaped/readable with images off and no required remote styles/fonts/scripts.
- [ ] AC-8: Extension UI consumes isolated semantic styles, passes keyboard/focus/contrast/target checks, and neither leaks styles nor accepts host-page global styling.
- [ ] AC-9: Project authority, design specification, contributor guidance, and implementation agree on paths, ownership, exceptions, commands, and platform adaptations.
- [ ] AC-10: The official uv drift scan reports zero unexplained finding; the seven current candidates are removed or justified, and tests prove Kotlin/XML/email/extension/generated coverage.
- [ ] AC-11: Site browser, accessibility, Flutter, Android CI/device IME, and email rendering scenarios pass with no unintended visual or behavioral regression.
- [ ] AC-12: The old Winglowz hardening spec remains unchanged, unsuperseded, and referenced only as historical input.
- [ ] AC-13: No secrets, personal data, remote executable styling, broadened extension permission, unsafe HTML interpolation, or machine-specific path enters manifest/generated outputs/logs.
- [ ] AC-14: All required `DS-*` scenarios pass; any unavailable specialist proof keeps the relevant batch and overall chantier partial.

## Test Strategy

1. Freeze baseline values, modes, fonts, exceptions, inventory classifications, and representative renders before generation or consumer edits.
2. Unit-test manifest parsing, alias resolution, schema validation, deterministic ordering/formatting, atomic failure, platform serialization, exception validation, and resolved parity.
3. Run `uv run python tools/design_system/generate_tokens.py --check` and the ShipGlows drift checker with `$SHIPGLOWS_ROOT` resolved from the environment; include broad and changed-file modes.
4. Run site `pnpm build:check` and `pnpm test:unit`, then browser comparison at the assigned ShipGlows URL across representative widths/modes/states with keyboard, contrast, target, focus, and reduced-motion proof.
5. Run `flutter analyze`, targeted theme/widget/keyboard tests, and full `flutter test`; use approved Android CI for Kotlin/native build/tests and a physical device for IME selection, rapid typing, custom theme, action row, safe-area, and press/focus proof.
6. Render production and prototype emails with representative EN/FR, long strings, escaped untrusted text, blocked images, and supported dark/client profiles; inspect generated HTML and screenshots.
7. Load the extension popup and isolation fixture, test keyboard/focus/contrast/targets and CSP, and compare computed styles under hostile page CSS.
8. Run integrated parity, metadata/link/path validation, official drift scan, generated-clean check, and `git diff --check`. Record proof in the required checklist; source review alone is insufficient.

## Risks

- **High — visual regression hidden by structural success:** identical compilation does not prove identical rendering. Mitigation: immutable baseline, representative rendered comparisons, and specialist proof per surface.
- **High — semantic over-unification:** forcing the same raw value can weaken IME usability, email compatibility, platform conventions, or accessibility. Mitigation: explicit adaptation registry and resolved-role proof.
- **High — large CSS taxonomy migration:** approximately 594 variables can create alias cycles, accidental coupling, or broad diffs. Mitigation: classification first, compatibility windows, batch ownership, and no mechanical rename target.
- **High — native/app divergence:** Dart and Kotlin may drift while one test surface stays green. Mitigation: shared generation/parity fixtures, Android CI, and physical IME proof.
- **Medium — generated-source maintenance:** stale or hand-edited outputs can become shadow authorities. Mitigation: provenance headers, `--check`, deterministic output, and CI failure.
- **Medium — email and extension security:** styling migration can introduce unsafe markup, remote dependencies, CSP violations, or host-page CSS collision. Mitigation: scoped local assets, contextual escaping tests, hostile CSS fixture, and OWASP gate.
- **Medium — documentation lag:** contributors may follow obsolete brand or arbitrary-value guidance. Mitigation: docs batch, clean-checkout walkthrough, and link/path/metadata validation.
- **Residual:** complete visual equality across every page/client/device is impractical. Owner `006-sg-design` must maintain representative risk-based baselines and record unsupported clients/devices as explicit residual scope, never as silent parity.

## OWASP Security Gate

- **Applicability:** yes. Although this is primarily a design-system migration, it changes email-rendered HTML/CSS, extension-owned markup/CSS under browser CSP, generated files consumed by build/CI, and failure behavior at cross-surface interfaces.
- **Top 10:2025 considered:** `A02 Security Misconfiguration` (extension CSP, remote assets, generated config); `A03 Software Supply Chain Failures` (generator/dependency/provenance); `A05 Injection` (email HTML/style interpolation and generated-value encoding); `A06 Insecure Design` (unowned adapters/bypass paths); `A08 Software or Data Integrity Failures` (stale/tampered generated outputs); `A10 Mishandling of Exceptional Conditions` (partial generation, unsafe fallback, unavailable proof). `A01`, `A04`, `A07`, and `A09` are not materially changed because the spec does not alter authorization, cryptography, authentication, or security-event collection; existing behavior remains invariant.
- **Trust/data boundaries:** canonical JSON and contributor inputs → generator/CI → checked-in platform outputs; application/email content → existing renderer → recipient client; extension package → browser popup/host page. Token values are non-secret, but all inputs are untrusted until schema/encoding validation.
- **Selected ASVS v5.0.0 requirements:** no exact requirement ID is asserted in this draft because ASVS mapping has not been verified against the current official requirement text. Readiness or implementation must perform the freshness gate before naming an ID. Proof remains concrete: schema allowlist, contextual serialization/escaping, atomic generation, provenance/clean-output check, CSP/no-remote-resource inspection, hostile CSS isolation, negative fixtures, and no-secrets scan.
- **Misuse/abuse cases:** malicious token strings attempting CSS/HTML/code injection; crafted alias cycles or resource exhaustion; manual generated-file tampering; remote extension stylesheet/script addition; unescaped email content; host page overriding extension UI; logs leaking input or absolute paths.
- **Required outcome:** invalid inputs fail closed with bounded diagnostics; generator writes atomically; generated outputs contain only allowed formats; email remains contextually escaped; extension permissions/CSP do not broaden; no secrets or PII are logged or generated.
- **Residual gap and owner:** current official ASVS ID selection and actual email-client/extension-browser proof remain implementation gates owned by the security reviewer with `006-sg-design`; missing proof leaves the batch partial and blocks closure.

## Execution Notes

First reads: this spec; `AGENT.md`; `shipglows_data/technical/design-system-authority.md`; historical hardening spec/audit; app theme sources; Kotlin IME theme/rendering sources; site `global.css` and Tailwind config; email theme/templates; extension popup/manifest; current CI and scanner tests.

Implement strictly in batch order `F0 → F1 → (A, B, C, D, E) → I`. Keep batch branches/diffs limited to exclusive ownership. The integration owner resolves any shared manifest/schema/generator change; downstream batches regenerate rather than editing generated outputs.

The initial manifest must import current resolved semantics. A mismatch found during inventory is recorded as `legacy-unexplained` and blocks migration of that role until classified; it is not silently picked from one surface. Compatibility aliases require consumer count, owner, target role, and removal condition. Exceptions require platform/API reason, scope, proof, owner, and review/removal condition.

Stop and reroute if the manifest authority is contested; a material visual/brand direction changes; a migration weakens contrast, focus, reduced motion, dynamic type, target size, safe area, IME responsiveness, email readability, or extension isolation; an adapter cannot be generated deterministically; a new dependency lacks freshness/security review; parallel write ownership overlaps; unrelated dirty files would enter the batch; or required visual/device/client proof is unavailable for the claimed result.

Rollback is per adapter: restore the last-known-good checked-in generated outputs and compatibility aliases, revert only the affected consumer batch, and keep the canonical manifest version unchanged until the mismatch is repaired. Never roll back by reintroducing untracked local literals.

## Open Questions

None. The operator approved complete remediation of the audit findings. The governing decisions are: one versioned semantic manifest, explicit platform adaptations, visual preservation by default, classification rather than mechanical CSS renaming, and proof-sensitive migration. Execution availability remains a gate, not an unresolved product decision.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
| --- | --- | --- | --- | --- | --- |
| 2026-08-13 22:19:20 UTC | 100-sg-spec | GPT-5.6 Codex | Created the durable cross-surface remediation contract from the approved 006-sg-design audit findings, including canonical semantic authority, platform adapters, non-overlapping batches, security gates, and specialist proof. | draft | Run `101-sg-ready`; do not implement until the spec is ready. |
| 2026-08-13 22:32:33 UTC | 101-sg-ready | GPT-5.6 Codex | Completed adversarial readiness, strengthened token layering and atomic generation, made stored-theme compatibility, production plain text, closed-Shadow-DOM behavior, and exclusive generated-output ownership executable. | ready | Run `102-sg-start`; begin with F0 only. |
| 2026-08-13 22:40:34 UTC | 006-sg-design | GPT-5.6 Codex | Completed Batch F0: froze checksummed cross-surface source evidence, classified all 593 unique site custom properties, recorded five surface inventories and six legacy-unexplained mapping groups, captured the official 484-file/seven-candidate uv baseline, and created all twelve NOT_RUN proof rows. | complete | Begin F1 foundation; do not edit generated adapters or existing consumers. |
| 2026-08-13 22:54:20 UTC | 006-sg-design | GPT-5.6 Codex | Completed Batch F1: established the versioned manifest/schema and reviewed registries, a deterministic target-scoped standard-library generator/checker with atomic staging, negative tests, a minimal CI token gate, and the active authority map. No platform adapter or product consumer was written; six F0 groups remain explicitly legacy-unexplained. | complete | Begin the non-overlapping app/native, site, email, extension, and docs/scanner batches against fixture/check targets only. |
| 2026-08-13 23:10:09 UTC | 006-sg-design | GPT-5.6 Codex | Implemented Batch A source mappings and compatibility proof: reconciled Flutter semantic aliases and bundled font roles, centralized adapter literals, preserved compatibility consumers, mapped independent Kotlin IME defaults, reduced safe Keyboard Studio literals, and added shared preset/theme/cloud-sync plus XML scanner fixtures. | partial | Batch I must write generated Dart/Kotlin adapters; run Flutter 3.41.7 checks, Android CI, and physical IME proof before DS-FLUTTER/DS-IME/DS-PRESET can pass. |
| 2026-08-13 23:34:10 UTC | 006-sg-design | GPT-5.6 Codex | Reconciled completed A-D source work and partial E scanner work with actual local proof; repaired the remaining plan into sequential foundation/output stages, exact disjoint activation ownership, a 63-finding native batch, and evidence-only integration. | partial | Execute `F1.1`, `I0`, `A-act–E-native`, then `I1`; retain missing specialist proof as `EXCEPTION_WITH_PROOF`. |
| 2026-08-14 00:27:00 UTC | 006-sg-design | GPT-5.6 Codex | Corrected provenance integration: retained immutable F0 SHA-256 gates, replaced mutable bridge hashes with path/contract evidence, added regression tests and CI coverage, required direct site aliases without literal fallbacks, and atomically regenerated all six digest-bearing outputs. Foundation tests 19/19, site tests 154/154, build check, manifest validation, and generated-output check pass. | partial | Complete the separately owned 63-finding E-native batch and remaining browser/client/Flutter/Android/device proof before I1 closure. |
| 2026-08-14 08:18:52 UTC | 006-sg-design | GPT-5.6 Codex | Re-ran final local integration proof after interruption: 19/19 foundation tests, manifest validation, six-output stale check, byte-identical double dry-run, immutable F0 hashes, project guard broad/changed at 445/0 and 38/0, ShipGlows scanner broad/changed at 313/0 and 47/0, targeted site/email 10/10, full site 154/154, Astro check with zero errors/warnings, extension 31/31 plus package check, metadata/link/diff checks, and cache cleanup. | partial | Collect browser/accessibility, email-client, Flutter 3.41.7, Android CI, and physical IME proof before verification or closure. |
| 2026-08-14 09:55:58 UTC | 006-sg-design | GPT-5.6 Codex | Started the site through ShipGlows and used Playwright at 390/768/1280 CSS pixels to remediate and recheck public light/dark/reduced-motion rendering, targets, keyboard focus, contrast, semantics, labels, IDs, nested controls, and overflow. Added a regression contract; site tests now pass 155/155, Astro check remains clean, generated outputs are current, and both drift scanners remain at zero. | partial | Authenticate the Playwright session to verify protected account/docs surfaces, then collect the remaining client, Flutter, Android/device, and unpacked-extension proof. |
| 2026-08-14 23:50:57 UTC | 006-sg-design | GPT-5.6 Codex | Used a one-time Clerk development agent task for authenticated Playwright proof, confirmed the dashboard Sign Out state, light/dark responsive rendering, keyboard focus and overflow, increased dark magenta contrast to 5.91:1, and remediated standalone dashboard actions to 44x44px minimum. Re-ran 19 foundation tests, six-output check, both broad/changed scanners at zero, site 155/155 plus Astro check, and extension 31/31 plus package check. | partial | Use an entitled test account for protected course docs, then collect Flutter 3.41.7, Android CI/device IME, received email-client, and unpacked-Chrome extension proof. |
| 2026-08-15 09:42:26 UTC | 006-sg-design | GPT-5.6 Codex | Migrated the app contract from Flutter 3.41.7 to 3.44.9 without upgrading direct dependencies, accepted only four SDK-driven transitive lockfile updates, and made the storage-rules contract test line-ending independent. Flutter analysis reports no issue and all 322 tests pass; 19 foundation tests, six generated outputs, and both broad/changed drift guards remain clean. | partial | Collect Flutter rendered visual proof plus Android CI/device IME, entitled course-doc, received email-client, and unpacked-Chrome extension proof. |

## Current Chantier Flow

| Step | Status | Evidence | Next step |
| --- | --- | --- | --- |
| 006-sg-design | in_progress | Local I1 integration, authenticated dashboard proof, and Flutter 3.44.9 migration are clean: analysis has no issue, all 322 Flutter tests pass, 19 foundation/guard tests pass, six outputs are current, project guard is 446/0 broad and 51/0 changed, and the independent scanner is 314/0 broad and 61/0 changed. Entitled docs, received-client, Flutter visual, Android/device, and unpacked-extension proof remain incomplete. | Obtain the remaining specialist proof before verification or closure. |
| 100-sg-spec | complete | This autonomous draft contains behavior, scope, authority, security/ZOMBIES gates, dependency-ordered tasks, non-overlapping execution batches, acceptance criteria, and proof scenarios. | Submit to readiness review. |
| 101-sg-ready | complete | Readiness v1.1.0 found no open operator decision after adversarial correction; tasks, scenarios, and batches now cover data compatibility, email plain text, closed Shadow DOM, and exclusive generated-output ownership. | Hand the ready contract to implementation. |
| 102-sg-start | in_progress | Foundation, generated outputs, all source activations, native/module drift remediation, and local I1 checks are complete. | Retain the chantier as partial until the external specialist proofs are collected. |
| 103-sg-verify | pending | Required `DS-*` proof has not been collected. | Verify after all implementation batches integrate. |
| 104-sg-end | pending | The chantier remains open. | Close only after verified acceptance and documentation coherence. |
| 005-sg-ship | pending | No release/deployment is in scope or authorized. | Ship only under a later explicit release plan. |
