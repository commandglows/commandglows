---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "winglowz"
created: "2026-06-11"
created_at: "2026-06-11 15:06:43 UTC"
updated: "2026-06-11"
updated_at: "2026-06-11 15:07:15 UTC"
status: ready
source_skill: 100-sf-spec
source_model: "GPT-5 Codex"
scope: "design-system-hardening"
owner: "Diane"
confidence: medium
user_story: "En tant qu'utilisatrice WinGlows, je veux une cohérence visuelle stricte entre app, site et composants, sans déviation locale de tokens, afin que l'identité produit soit pro, lisible et maintenable sur mobile et desktop."
risk_level: "high"
security_impact: "none"
docs_impact: "yes"
linked_systems:
  - "shipglowz_data/technical/design-system-authority.md"
  - "winglowz_app/lib/core/theme/winglowz_theme_tokens.dart"
  - "winglowz_app/lib/core/theme/app_theme.dart"
  - "winglowz_site/src/assets/styles/global.css"
  - "winglowz_site/tailwind.config.mjs"
  - "winglowz_app/lib/features/keyboard/presentation/keyboard_theme_studio_screen.dart"
  - "winglowz_site/src/components/Button.astro"
depends_on:
  - artifact: "shipglowz_data/business/branding.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglowz_data/technical/guidelines.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglowz_data/technical/architecture.md"
    artifact_version: "1.0.1"
    required_status: "reviewed"
  - artifact: "shipglowz_data/technical/winglowz_app/guidelines.md"
    artifact_version: "1.0.1"
    required_status: "reviewed"
supersedes: []
evidence:
  - "python3 /home/claude/shipglowz/tools/design_system_drift_check.py --format markdown --warn-only --max-findings 5000"
  - "Excluding generated .vercel/output artifacts: 422 findings still actionable"
  - "Canonique visuel recommandé dans `shipglowz_data/technical/design-system-authority.md`"
next_step: "/102-sf-start WinGlows token hardening and visual standardization"
---

# Title

WinGlows Token Hardening and Visual Standardization

## Status

Ready. The token authority contract is in place, and this spec is now approved as the implementation source for the next token-hardening cycle. Production UI and site code still contain direct visual literals; implementation starts now with the tasks below.

## User Story

En tant qu'utilisatrice WinGlows, je veux une cohérence visuelle stricte sur toutes les surfaces (application Android/web, site de présentation, composants partagés), afin d'avoir une expérience professionnelle stable, cohérente, et sans régression de branding, sur mobile et desktop.

## Minimal Behavior Contract

WinGlows enforces that every production visual decision about color, spacing, typography, motion, radius, elevation, layout sizing, and theme-sensitive branching flows from the canonical token sources per project surface; non-authoritative visual literals are rejected unless explicitly whitelisted as temporary, documented platform-bound exceptions. When a screen or component is rendered, its visual output must be deterministic from token sources and shared component abstractions, and if a visual override is blocked at runtime or by migration, the app/site continues in a safe, branded fallback style rather than rendering ad-hoc constants. The main edge case is cross-surface drift (app/site/integration) where one surface compiles with updated tokens and another silently keeps legacy values.

## Success Behavior

- Given production Flutter UI code and site components are modified under this spec, when `design_system_drift_check.py --changed` runs on changed files, then no unapproved hardcoded visual literals are reported in `winglowz_app/lib` and `winglowz_site/src`, excluding `winglowz_site/.vercel/output/**`.
- Given a developer applies or updates a visual token, when they touch shared components, then shared tokens in `winglowz_theme_tokens.dart` or `global.css`/`tailwind.config.mjs` are updated first and consumed by the target component without adding bypass values.
- Given a color/spacing/motion value appears outside canonical sources in production UI code, when review/CI is run, then implementation is blocked until moved to canonical token source or explicitly documented as an exception.
- Given a successful implementation, users observe consistent visual behavior across home, auth-adjacent surfaces, keyboard-related components, and site landing pages, including mobile-safe interaction and spacing standards.

## Error Behavior

- If a token source lacks a needed value, then the implementing agent must introduce it in the canonical source before wiring UI consumers.
- Si un écran/site contient une valeur visuelle legacy non migrable immédiatement, alors il doit être listé dans le `Exceptions` de la spec (`Execution Notes`) avec propriétaire, délai, et proof de remplacement.
- If a component currently depends on hardcoded values for layout stability, then migration must use shared abstractions (or explicit token wrappers) to preserve behavior and avoid regressions instead of removing constraints by shortcut.
- If a drift check still finds hardcoded values outside approved exceptions, the verification gate fails and work must loop back to implementation with explicit task updates.
- If one surface is migrated and another still drifts, implementation cannot be marked done until both surfaces agree or the split is explicitly documented as intentional and temporary.

## Problem

Le chantier d’audit a confirmé une dette visuelle élevée: beaucoup de couleurs, dimensions, motions et utilitaires arbitraires vivent encore dans les fichiers UI de production au lieu des sources de tokens. Le risque immédiat est un effet “prototype” sur mobile et un branding incohérent entre application Flutter et site Astro, malgré la présence de sources canoniques.

## Solution

Appliquer une migration systémique en 3 couches: (1) verrouiller le contrat d’autorité visuelle existant, (2) remplacer les usages visuels non autorisés dans les zones critiques par des tokens centralisés, (3) protéger la dette résiduelle par exceptions traçables et un plan de suppression progressive. Le chantier doit se faire sans quick-fix: toute valeur visuelle passe par token/source, et chaque changement doit être vérifiable par drift-check.

## Scope In

- Application Flutter: suppression des usages visuels hardcodés non autorisés dans `winglowz_app/lib`.
- Site Astro: remplacement des utilitaires Tailwind visuels arbitraires et des hex/rgb dans `winglowz_site/src`.
- Application des règles de design-system à:
  - `winglowz_site/src/assets/styles/global.css`
  - `winglowz_site/tailwind.config.mjs`
  - `winglowz_app/lib/core/theme/winglowz_theme_tokens.dart`
  - `winglowz_app/lib/core/theme/app_theme.dart`
  - composants partagés (notamment `winglowz_app/lib/core/widgets/app_components.dart`, `winglowz_site/src/components/Button.astro`)
- Validation automatisée par drift-check ciblé sur fichiers changés, plus vérifications locales de build/lint.
- Documentation de chantier dans `shipglowz_data/technical/design-system-authority.md` et `shipglowz_data/technical/guidelines.md` si nécessaire.

## Scope Out

- Refactor complet de l’architecture Flutter/Connext.
- Changement de stack UI (frameworks, libraries, routing core).
- Refonte visuelle produit majeure hors composants de cohérence tokenisée.
- Création de nouveaux thèmes de marque, palettes alternatives, ou dark-mode expérimental sans demande produit.
- Réécriture des parcours business (checkout/auth/integration) non liées au design system.

## Constraints

- Aucune personnalisation visuelle hors-canonique sans passage par les tokens/mappage canonical.
- Interdiction des quick-fix qui déplacent une valeur visuelle dans un composant isolé.
- `winglowz_app/lib/features/keyboard/presentation/keyboard_theme_studio_screen.dart` peut rester en exception temporaire uniquement si documenté avec TTL et plan de migration.
- `winglowz_site/.vercel/output/**` est exclu du scope de preuve.
- Les changements doivent maintenir la compatibilité Android-first du clavier tout en améliorant la cohérence mobile app/site.

## Dependencies

- Contrat technique visuel canonique : `shipglowz_data/technical/design-system-authority.md`.
- Contrat produit/branding : `shipglowz_data/business/branding.md`.
- Contraintes techniques : `shipglowz_data/technical/guidelines.md`.
- Contexte Flutter App : `shipglowz_data/technical/winglowz_app/guidelines.md`.
- Contrat d’architecture : `shipglowz_data/technical/architecture.md`.
- Outil de contrôle qualité : `/home/claude/shipglowz/tools/design_system_drift_check.py`.
- Script de validation local Flutter : `flutter analyze`, `flutter test` dans `winglowz_app` si mutation Flutter.
- Script de validation site : `pnpm build:check` dans `winglowz_site` si mutation site.

## Test Contract

- surface: production UI Flutter app + production UI Astro site.
- proof_profile: evidence-first + automated-first (drift + analyze/build checks).
- proof_order:
  1. Pre-merge checks ciblés (`design_system_drift_check.py --changed --format markdown`).
  2. Validation lint/build locale (`flutter analyze` ou `pnpm build:check`).
  3. Revue manuelle UI ciblée mobile sur zones de touch / spacing et cohérence branding.
- checklist_path: `shipglowz_data/workflow/test-checklists/winglowz-token-hardening-and-visual-standardization.md`.
- required_scenario_ids:
  - DS-APP-TOKENS-001
  - DS-SITE-TOKENS-001
  - DS-MOBILE-TARGET-001
- required_results:
  - zero visual-literallies regressions in scoped files after remediation (exception list only).
  - identical canonical source use across duplicated UI entrypoints.
  - token fallback stable for any temporary exception.

## Invariants

- Le branding WinGlows reste cohérent entre app et site dans l'espace visuel canonique.
- Les composants UI applicatifs doivent lire les styles via `WinGlowzThemeTokens`/tokens CSS/aliases.
- Les tests et la migration suivent un ordre: source token → consommation composant → validation.
- Aucun changement de logique métier n’est introduit dans ce chantier.
- Les tokens restent la source vérité des conventions mobile/desktop.

## Links & Consequences

- `winglowz_app/lib` : modifications à `app_theme.dart`, `winglowz_theme_tokens.dart`, composants UI et éventuellement écrans Flutter touchés.
- `winglowz_site/src` : modifications aux styles globaux, composants UI, et pages en production.
- `shipglowz_data/technical/design-system-authority.md` : devient le garde-fou opérationnel de design-system.
- `shipglowz_data/workflow/TASKS.md` : tâches résiduelles de dette visuelle si des exceptions temporaires restent ouvertes.
- Documentation utilisateur et brand pages may need alignment if copy around theming/help text changes.

## Documentation Coherence

- Mettre à jour, si besoin, `shipglowz_data/technical/design-system-authority.md` avec la liste finale des exceptions acceptées.
- Mettre à jour `shipglowz_data/technical/guidelines.md` si de nouvelles règles de migration ou de guardrails sont promulguées.
- Mettre à jour la spec elle-même si le périmètre d’exceptions dépasse ce qui est prévu.
- En l’absence d’exceptions nouvelles, la documentation utilisateur n’est pas impactée.

## Edge Cases

- Migration sur une seule surface (app ou site) avec dérive de l’autre.
- Valeur visuelle encore utilisée pour un cas de debug/legacy non documentée.
- Composants tiers (Preline/icons) utilisant des valeurs internes non alignables immédiatement.
- Contraste insuffisant mobile si token values ne sont pas homogènes.
- Règle de layout safe-area/viewport changeant entre Flutter web et Android.

## Implementation Tasks

- [ ] Tâche 1: Verrouiller la doctrine d’autorité visuelle
  - Fichiers: `shipglowz_data/technical/design-system-authority.md`, `shipglowz_data/technical/guidelines.md`
  - Action: consolider les règles “no hardcoded value”, définir les exceptions autorisées et préciser la règle d’exclusion `Keyboard Theme Studio`.
  - User story link: évite les écarts de doctrine lors de toutes les modifications futures.
  - Validate with: relecture de docs + récurrence de conventions.

- [ ] Tâche 2: Introduire les tokens manquants de tokens partagés (app)
  - Fichiers: `winglowz_app/lib/core/theme/winglowz_theme_tokens.dart`, `winglowz_app/lib/core/theme/app_theme.dart`
  - Action: regrouper les espacements/motions/couleurs encore répétés en tokens explicites et documenter les dépréciations.
  - User story link: garantit la traçabilité visuelle dans l’app Flutter.
  - Validate with: revue de références + `flutter analyze`.

- [ ] Tâche 3: Régulariser `keyboard_theme_studio_screen.dart` vers tokens
  - Fichiers: `winglowz_app/lib/features/keyboard/presentation/keyboard_theme_studio_screen.dart`
  - Action: déplacer les `Color(0x...)` et dimensions de preview vers des helpers de tokens ou une exception documentée, sans changer la valeur UX métier.
  - User story link: supprime un bypass visuel connu dans les métriques d’audit.
  - Depends on: Tâche 2.
  - Validate with: revue de code + `flutter analyze`.

- [ ] Tâche 4: Réduire les valeurs littérales dans composants Flutter partagés
  - Fichiers: composants UI principaux dans `winglowz_app/lib/core/widgets`, `winglowz_app/lib/features/**`
  - Action: remplacer les hardcodes visuels identifiés par tokens partagés.
  - User story link: améliore la cohérence et la maintenabilité de la plupart des parcours.
  - Depends on: Tâche 2.
  - Validate with: `python3 /home/claude/shipglowz/tools/design_system_drift_check.py --changed --format markdown`.

- [ ] Tâche 5: Recentrer le système de composants UI du site
  - Fichiers: `winglowz_site/src/assets/styles/global.css`, `winglowz_site/tailwind.config.mjs`
  - Action: étendre/normaliser les tokens CSS manquants et harmoniser les alias Tailwind.
  - User story link: source unique de style pour le site.
  - Validate with: `pnpm build:check`.

- [ ] Tâche 6: Nettoyer `Button.astro`
  - Fichier: `winglowz_site/src/components/Button.astro`
  - Action: retirer styles visuels inline arbitraires et basculer sur tokens + utilitaires tailwind standardisés.
  - User story link: supprime l’un des principaux points de drift visuel.
  - Validate with: revue ciblée + build.

- [ ] Tâche 7: Nettoyer les landing/components critiques
  - Fichiers: `winglowz_site/src/pages/[...lang]/bio.astro`, `winglowz_site/src/components/sections/landing/HeroSectionAlt.astro`, `winglowz_site/src/assets/styles/docs.css`, `winglowz_site/src/assets/styles/landing.css`, `winglowz_site/src/components/shared/site/Navbar.astro`
  - Action: remplacer hardcoded colors/font-size/paddings par tokens et classes partagées.
  - User story link: cohérence mobile + branding homogène.
  - Depends on: Tâche 5.
  - Validate with: build + preview visual check mobile (sectionnaire).

- [ ] Tâche 8: Mettre en place le contrôle de preuve visuelle
  - Fichiers: `shipglowz_data/workflow/test-checklists/winglowz-token-hardening-and-visual-standardization.md`, `shipglowz_data/workflow/audits/` si nécessaire
  - Action: écrire la checklist de preuve (automatisée + mobile) et consigner les exceptions autorisées.
  - User story link: empêche le retour en mode quick-fix.
  - Validate with: exécution checklist complète et signature dans `103-sf-verify`.

- [ ] Tâche 9: Re-lancer l’audit de drift avant fermeture
  - Fichiers: `shipglowz_data/workflow/audits/2026-06-11-winglowz-design-token-audit.md` + nouveaux outputs de drift.
  - Action: obtenir un nouveau baseline, viser une chute significative des findings non-justifiés.
  - Depends on: Tâches 2-8.
  - Validate with: `python3 /home/claude/shipglowz/tools/design_system_drift_check.py --format markdown --warn-only --max-findings 5000` et comparaison des KPI.

- [ ] Tâche 10: Finaliser la doc de sortie chantier
  - Fichiers: cette spec, `shipglowz_data/technical/design-system-authority.md`
  - Action: documenter les décisions finales, exceptions restantes, conditions de suppression.
  - User story link: permet la reprise propre et empêche les régressions.
  - Validate with: clôture de spec conforme (`104-sf-end` lorsque le chantier progresse).

## Acceptance Criteria

- [ ] CA-1: After implementation, `design_system_drift_check.py --changed --format markdown` reports no unapproved hardcoded `Color`/hex/rgb/motion/spacing values in changed Flutter/site production files.
- [ ] CA-2: `winglowz_app` and `winglowz_site` production visuals no longer use `Color(0x...)`, `[#A-Za-z0-9]{6}`, `max-w-[...]`, `min-h-[...]`, arbitrary px/rem values unless explicitly documented as exception.
- [ ] CA-3: `winglowz_site/src/assets/styles/global.css` and `winglowz_app/lib/core/theme/*` are the primary anchors for spacing/typography/color/motion tokens.
- [ ] CA-4: `keyboard_theme_studio_screen.dart` has either zero production visual literals or an explicit temporary exception with migration timeline.
- [ ] CA-5: At least one visual smoke check is executed on a key mobile path (`winglowz_site` landing + one key Flutter screen) after migration.
- [ ] CA-6: `shipglowz_data/technical/design-system-authority.md` reflects the enforcement rules and allowed exception list.

## Test Strategy

- Automated first: `design_system_drift_check.py --changed --format markdown`, `flutter analyze` (si besoin), `pnpm build:check`.
- Regression proof: run baseline audit command before and after, compare finding distribution by class.
- Manual proof: UI mobile spot-check pour boutons/spacing, contraste, spacing safe-area/target sur écrans clés du site + app.
- Optional cross-check: if available, run a targeted Playwright smoke for landing and auth-adjacent shell.

## Risks

- `high` — dette visuelle volumique: risque d’étalement de scope si chaque composant est traitée en urgence.
- `medium` — faux positif sur composants tierces: utilitaires visuels imposés par bibliothèques peuvent nécessiter wrappers propres.
- `medium` — risque de régression mobile: remplacement de valeurs peut changer densité/espacement perçu sans preuve locale.
- `medium` — risque de dette technique: exceptions temporaires non supprimées si non suivies.

## Execution Notes

- Lire d’abord: `shipglowz_data/technical/design-system-authority.md`, `shipglowz_data/workflow/audits/2026-06-11-winglowz-design-token-audit.md`, `winglowz_app/lib/core/theme/winglowz_theme_tokens.dart`, `winglowz_site/src/assets/styles/global.css`.
- Préférer une approche par modules: token layer → composants partagés → pages.
- Ne pas patcher en parallèle des remplacements visuels sur 10 écrans sans preuve par token.
- Interdire les shortcuts visuels: si une valeur est difficile à mapper, ajouter la task, puis mapper proprement le token.
- Arrêt si: nouveaux changements dégradent la lisibilité mobile ou cassent un flux d’authentification/bridge.
- Continuer jusqu'à avoir un diff de drift-check démontrable sur fichiers de production.

## Open Questions

None.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-06-11 15:06:43 UTC | 100-sf-spec | GPT-5 Codex | create | draft | /101-sf-ready WinGlows token hardening and visual standardization |
| 2026-06-11 15:07:15 UTC | 101-sf-ready | GPT-5 Codex | readiness-check | ready | /102-sf-start WinGlows token hardening and visual standardization |
| 2026-06-11 15:47:26 UTC | 102-sf-start | GPT-5 Codex | implementation | partial | /103-sf-verify WinGlows token hardening and visual standardization |
| 2026-06-11 19:46:43 UTC | 006-sf-design | GPT-5 Codex | app-input-token-standardization | partial | Continue field-token sweep or /103-sf-verify after full token scope |
| 2026-06-11 19:51:04 UTC | 006-sf-design | GPT-5 Codex | app-field-row-standardization | partial | Continue full token scope or /103-sf-verify after remaining surfaces |
| 2026-06-12 20:46:04 UTC | 001-sf-build | Codex | implementation | partial | Continue WinGlows site token migration before /103-sf-verify |
| 2026-06-18 00:00:00 UTC | 001-sf-build | GPT-5 Codex | implementation | done | WinGlows app/site drift reduced to zero; ready for /103-sf-verify |
| 2026-06-22 06:30:00 UTC | 102-sf-start | Claude Code | implementation | partial | Improved token values (spacing, shadows, semantic palette), fixed 5 hardcoded values in Settings, added motion tokens; flutter analyze clean | Complete Tâches 2-4 and 9 before /103-sf-verify |
| 2026-06-23 07:08:00 UTC | 103-sf-verify | Claude Code | verification | partial | Production UI drift-check clean (0 findings on changed files); residual 4 findings in idees/emails/ (non-production); build:check and flutter analyze pass; bug gate not assessed | Route idees/emails/ cleanup to optional follow-up then launch /104-sf-end |
| 2026-07-18 08:30:00 UTC | 001-sg-build | unknown | continuation | in_progress | Continue navbar token migration as part of existing chantier | Complete Tâche 7 Navbar.astro tokenization then run /103-sg-verify |
| 2026-07-18 08:46:00 UTC | 103-sg-verify | unknown | verification | verified | Navbar token migration verified clean: drift-check 0 findings, build:check 0 errors, no hardcoded colors remain | Launch /104-sg-end then /005-sg-ship |
| 2026-07-18 08:50:00 UTC | 005-sg-ship | unknown | ship | shipped | Committed and pushed fc5c59f to origin/main | Work complete |
| 2026-07-26 13:07:06 UTC | 006-sg-design | GPT-5 Codex | routing | partial | Reused the existing token-hardening chantier and removed a duplicate site-only spec | Continue the existing WinGlowz token hardening spec only |
| 2026-07-28 00:00:00 UTC | 006-sg-design | GPT-5 Codex | audit-tokens-migration | partial | Global source scan passes for site/app; centralized shared status colors, removed duplicate Termux token, and replaced invalid CSS media queries | Continue with visual/browser proof, then /103-sg-verify |
| 2026-07-29 06:17:14 UTC | 006-sg-design | GPT-5 Codex | visual-polish-and-token-proof | done | Restored landing typography hierarchy, widened and polished the shared navbar, repaired semantic Tailwind v4 tokens, fixed cookie stacking and lead-form contrast, and centralized missing Temu state tokens; desktop/mobile plus dark-mode browser proof collected | Ready for final verification and closure |
| 2026-07-29 19:55:08 UTC | 003-sg-bug | GPT-5 Codex | mobile-navbar-visual-regression-fix | fixed-pending-verify | Repaired invalid mobile drawer class serialization, restored an opaque token-driven drawer surface, and aligned the dark landing shell with the black hero; local 390×844 light/dark browser retest passed without a build | Await operator validation of the rendered mobile result |
| 2026-08-02 12:28:59 UTC | 003-sg-bug | GPT-5 Codex | dark-landing-surface-regression-fix | fixed-pending-verify | Removed the inverted dark surface utility from the three landing sections; local 390×844 dark/light retest now computes 33/33/33 in dark and 240/240/240 in light | Await operator validation of the rendered result |
| 2026-08-02 12:31:54 UTC | 003-sg-bug | GPT-5 Codex | landing-button-contrast-fix | fixed-pending-verify | Reused the tokenized primary-action class for Pricing and Final CTA buttons; light/dark browser retest confirms readable primary and secondary button text | Await operator validation of the rendered result |

## Current Chantier Flow

| Step | Status | Evidence | Next step |
|------|--------|----------|-----------|
| 100-sf-spec | done | Spec created and approved 2026-06-11 | Keep spec current |
| 101-sf-ready | done | Readiness confirmed 2026-06-11 | Continue implementation |
| 102-sf-start | done | Navbar.astro tokenized; hardcoded colors replaced with --navbar-* tokens | Complete |
| 006-sf-design | done | Global token coherence and professional visual polish completed; desktop/mobile browser proof collected with zero undefined project CSS variables | Ready for /103-sg-verify |
| 003-sg-bug | fixed-pending-verify | Mobile drawer is opaque in light/dark; dark landing surfaces and primary button text now use theme-aware tokens with readable contrast | Await operator validation |
| 001-sf-build | done | Navbar token migration implemented and verified | Complete |
| 502-sf-audit-design | done | Remediated 115 drift findings (TemuWorkspace, global.css buttons, Navbar); drift-check --changed clean | Complete |
| 103-sf-verify | pending | Token drift passes and browser proof is collected; no build check was run per operator preference | Run final verification without redundant build checks unless an error appears |
| 104-sf-end | not launched | — | Launch after /103-sg-verify passes |
| 005-sf-ship | shipped | Committed and pushed fc5c59f to origin/main | Complete |
