---
artifact: verification_checklist
metadata_schema_version: "1.0"
artifact_version: "0.7.0"
project: "CommandGlows"
created: "2026-08-14"
updated: "2026-08-15"
status: draft
source_skill: 006-sg-design
scope: "cross-surface-design-system-unification"
owner: "Diane"
confidence: high
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems:
  - "design-system/inventory/"
  - "commandglows_app"
  - "commandglows_site"
  - "ext"
depends_on:
  - artifact: "shipglows_data/workflow/specs/commandglows-cross-surface-design-system-unification.md"
    artifact_version: "1.7.0"
    required_status: ready
supersedes: []
evidence:
  - "F0 inventory classifies all 593 unique site custom properties and freezes current cross-surface sources/checksums without changing a consumer."
  - "Official broad scanner baseline through uv: 484 files scanned and seven drift candidates."
  - "Local I1 enforcement: project guard 445 files / 0 findings; independent broad scanner 313 files / 0 findings."
  - "Resolved matrix: 33 equal roles and one body-font role covered by three reviewed platform adaptations."
  - "Playwright public-site proof at 390, 768, and 1280 CSS pixels covers light/dark, reduced motion, keyboard focus, semantic structure, contrast, target size, overflow, and screenshots; rendered findings were remediated and rechecked."
  - "Authenticated Playwright dashboard proof covers desktop/mobile light/dark rendering, a single Sign Out action, 44x44px dashboard actions, keyboard focus, no horizontal overflow, and magenta contrast from 5.73:1 to 5.91:1."
next_step: "Obtain an entitled test user for protected course docs, Flutter rendered visual proof, Android CI and physical IME proof, received email-client evidence, and an unpacked-Chrome extension run."
---

# CommandGlows cross-surface design-system unification checklist

F0 establishes evidence only. `NOT_RUN` is intentional until the batch that owns each proof has implemented its prerequisite. No row may become `PASS` from source inspection alone when rendered, browser, client, CI, or device proof is required.

| Scenario | Result | F0 baseline evidence | Required completion evidence | Owner |
| --- | --- | --- | --- | --- |
| `DS-FOUNDATION-001` | PASS | Manifest 1.3.0 and adaptation registry 1.2.0 validate; 19/19 foundation/guard tests pass; all six active outputs were regenerated atomically and `--all --check` is clean. Immutable F0 hashes remain provenance gates. | Re-run validation, tests, and stale-output check after any foundation change. | F1.1 / I0 / I1 |
| `DS-PARITY-001` | PASS | The generated matrix contains 34 roles: 33 resolve equally across all five surfaces. The sole divergence, `semantic.typography.body.family`, matches the reviewed Flutter, email, and extension adaptations; `legacyUnexplained` is empty. | Re-run matrix comparison and adaptation validation after any semantic/adaptation change. | I1 |
| `DS-SITE-001` | EXCEPTION_WITH_PROOF | ShipGlows assigned the Astro preview to port 3004. Public Playwright comparison passes at 390, 768, and 1280 CSS pixels in light/dark and reduced-motion modes. A one-time Clerk development agent task additionally verified the protected dashboard at 1280x720 and 390x844: exactly one Sign Out action, no horizontal overflow, inspected desktop/mobile screenshots, and readable magenta links. The session was signed out after proof. The site suite passes 155/155 and `pnpm build:check` reports zero errors/warnings. | The authenticated user has no course entitlement, so `/dashboard/docs/...` correctly redirects to the public lesson. Recovery requires a deliberately entitled test user before protected course-doc rendering can be promoted to `PASS`; do not mutate a real user's entitlement for proof. | site batch |
| `DS-SITE-A11Y-001` | EXCEPTION_WITH_PROOF | Public checks remain clean for target size, sampled contrast, reduced motion, duplicate IDs, names, labels, focus, nested controls, and overflow. Authenticated dashboard recheck additionally found and remediated seven undersized standalone actions; all now resolve to at least 44x44px. Keyboard focus is visible, desktop/mobile show no horizontal overflow, and dashboard magenta contrast measures 5.73:1 in light mode and 5.91:1 in dark mode. | Protected entitled course-doc accessibility remains unavailable. The local preview also reports development-only Clerk warnings and stale Vite optimize-dependency/dev-toolbar requests; production build checks remain clean. | site batch |
| `DS-FLUTTER-001` | EXCEPTION_WITH_PROOF | The app contract now targets installed Flutter 3.44.9. Direct dependency constraints are unchanged; the lockfile advances only four SDK-driven transitive packages. `flutter analyze --no-pub` reports no issue and the full suite passes 322/322, including theme, compatibility, text-field, routing, settings, and keyboard-preview coverage. | Automated source/widget proof is complete. Rendered mode/text-scale/high-contrast/reduced-motion visual evidence is still required before promotion to `PASS`. | app batch |
| `DS-IME-001` | EXCEPTION_WITH_PROOF | Native v1 visual defaults now resolve through an IME-local mapping object with no Flutter import or startup dependency. No Gradle/Android build was run under the repository guardrail. | Android CI/build tests plus physical-device launch, rapid typing, press/focus, action-row, safe-area evidence. | app/native batch |
| `DS-PRESET-001` | EXCEPTION_WITH_PROOF | One shared Dart/Kotlin fixture freezes catalog/legacy preset IDs, SharedPreferences identifiers, custom theme JSON v1, and cloud-sync v1/v2 revisions/checksums. The Dart side executes within the passing 322-test Flutter 3.44.9 suite. | Execute the Kotlin fixture test in approved Android CI and compare serialized snapshots before physical IME proof. | app/native batch |
| `DS-EMAIL-001` | EXCEPTION_WITH_PROOF | Batch C source is complete; 7 email tests, 154 site tests, and build pass locally. | Images-off and supported-client matrix remain missing; recover in I1 before `PASS`. | C-act / I1 |
| `DS-EXT-001` | EXCEPTION_WITH_PROOF | Batch D source is complete; 31 extension tests, extension check, closed-root fixtures, and scan pass locally. | Real Chrome keyboard/focus/isolation/screenshots remain missing; recover in I1 before `PASS`. | D-act / I1 |
| `DS-DRIFT-001` | PASS | The seven original candidates, all 63 app/native findings, and 9 historical floating-overlay findings are remediated. After authenticated-dashboard remediation, the project guard passes at 446/0 broad and 51/0 changed; the independent scanner passes at 314/0 broad and 60/0 changed. | Re-run both broad scans and the 19 scanner/foundation tests after any owned-source or policy change. | E-native / module remediation / I1 |
| `DS-DOCS-001` | PASS | Authority and foundation README now describe manifest 1.3.0, six active adapters, resolved parity, empty active migration inventory, zero-drift baselines, and remaining specialist proof limits. Metadata, path/link existence, stale-contradiction scan, generated check, and diff check pass locally. | Re-run documentation checks whenever authority paths, adapter status, or proof posture changes. | I1 |
| `DS-FAIL-001` | PASS | Unit fixtures reject unknown fields, unsafe literals, invalid layer direction, component cycles, unexplained parity mismatches, and stale output; validation failure preserves a last-known-good sentinel and target-scoped writes leave unrelated outputs unchanged. | Re-run the same negative suite after any foundation change. | F1 / integration |

## Baseline evidence

- `design-system/inventory/site-css-custom-properties.json`: exhaustive property classification with declarations, values, scopes, references, and migration status.
- `design-system/inventory/cross-surface-baseline.json`: Flutter, Kotlin/IME, site, email, extension, exceptions, legacy mismatches, checksums, and scanner perimeter.
- `design-system/inventory/README.md`: reproducible count summary and rebuild command.
- `commandglows-design-system-desktop.png`: Playwright desktop-light full-page proof with reduced motion enabled.
- `commandglows-design-system-mobile.png`: Playwright mobile-dark full-page proof with reduced motion enabled.
- `commandglows-dashboard-dark-final.png`: authenticated Playwright desktop-dark dashboard proof with the single Sign Out action and lightened magenta links.
- `commandglows-dashboard-mobile-dark-final.png`: authenticated Playwright mobile-dark dashboard proof after the 44x44px action remediation.
- Drift command: `uv run python "$env:SHIPGLOWS_ROOT\tools\design_system_drift_check.py" --format markdown --warn-only --max-findings 5000`.

## Evidence rules

- Evidence must not contain secrets, personal data, credentials, or machine-specific absolute paths.
- `exception_with_proof` names the unavailable surface, reason, evidence collected, owner, and recovery action; it leaves the dependent batch and chantier partial.
- A later batch updates only its owned rows. Integrated closure requires all twelve scenarios to be `PASS`.
