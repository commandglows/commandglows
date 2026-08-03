---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "winglowz"
created: "2026-06-12"
created_at: "2026-06-12 17:35:00 UTC"
updated: "2026-06-12"
updated_at: "2026-06-12 15:26:00 UTC"
status: ready
source_skill: 100-sf-spec
source_model: "GPT-5 Codex"
scope: "roadmap-account-aware-feedback"
owner: "Diane"
confidence: high
user_story: "En tant que visiteuse ou cliente WinGlows, je veux consulter la roadmap publique, voter une fois par fonctionnalité avec mon compte, et proposer une idée liée à un produit afin que la roadmap reflète un feedback réel sans casser les garde-fous auth et anti-abus du produit actuel."
risk_level: "medium"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "src/pages/[...lang]/[roadmap].astro"
  - "src/components/roadmap/**"
  - "src/pages/api/features/**"
  - "convex/features.ts"
  - "convex/schema.ts"
  - "Clerk"
  - "Convex"
depends_on:
  - artifact: "shipglows_data/business/product.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/architecture.md"
    artifact_version: "1.0.1"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/guidelines.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/context.md"
    artifact_version: "1.0.1"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/code-docs-map.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/design-system-authority.md"
    artifact_version: "1.0.0"
    required_status: "draft"
supersedes: []
evidence:
  - "Audit 2026-06-12: `src/components/roadmap/FeatureCard.astro` posted to `/api/features/{id}/vote` but no endpoint existed."
  - "Audit 2026-06-12: `src/components/roadmap/AddFeatureModal.astro` had no submit handler or backend action."
  - "Audit 2026-06-12: `src/pages/[...lang]/[roadmap].astro` rendered hardcoded roadmap data while WinGlows now runs Clerk + Convex + product entitlement flows."
  - "Existing runtime docs show Astro SSR + Clerk middleware + Convex state as the current canonical stack."
next_step: "/103-sf-verify roadmap-account-aware-feedback"
---

# Title

Roadmap Account-Aware Feedback

# Status

ready

# User Story

En tant que visiteuse ou cliente WinGlows, je veux consulter la roadmap publique, voter une fois par fonctionnalité avec mon compte, et proposer une idée liée à un produit afin que la roadmap reflète un feedback réel sans casser les garde-fous auth et anti-abus du produit actuel.

# Minimal Behavior Contract

La page roadmap reste publiquement lisible et affiche les fonctionnalités actives depuis Convex quand elles existent, avec un fallback lisible sur le catalogue historique si la base est vide. Un vote n'est accepté que pour une session Clerk reconnue et déjà reliée à une identité produit WinGlows; la même personne ne peut voter qu'une fois par fonctionnalité et l'état retourné au navigateur est explicite. Une suggestion n'est jamais publiée automatiquement: une session reconnue peut soumettre une idée liée à un produit, elle est persistée en `pending` pour revue, les doublons évidents par même compte sont refusés proprement, et un compte non encore synchronisé ne doit jamais produire un vote ou une suggestion orpheline.

# Success Behavior

Préconditions: la route roadmap est accessible publiquement; Convex et Clerk sont configurés; l'utilisatrice connectée possède une identité Clerk déjà synchronisée dans `users`/`globalUsers`.

Action: l'utilisatrice ouvre `/roadmap` ou `/fr/roadmap`, filtre éventuellement par produit, clique sur voter, ou soumet une suggestion depuis la modale.

Résultat visible: la roadmap affiche des cartes cohérentes par statut; un vote réussi incrémente le compteur sans reload et ne peut pas être rejoué; une suggestion valide affiche une confirmation claire puis ferme/réinitialise la modale.

Effet système attendu: la liste publique provient de `features`; un vote crée une trace user-scoped dans `featureVotes` et met à jour le compteur de la feature; une suggestion crée une ligne `featureSuggestions` en `pending`.

Preuve de succès: `pnpm build:check`, sanity API locale des routes roadmap, et vérification que les composants gèrent explicitement succès, login requis, compte en cours de sync, doublon de vote et doublon de suggestion.

# Error Behavior

Si l'utilisatrice n'est pas connectée, le vote et la suggestion ne doivent produire aucune écriture et doivent renvoyer `401` pour permettre une redirection propre vers `/signin`. Si le compte Clerk n'est pas encore synchronisé côté produit, l'API renvoie un état `account_not_ready` sans créer de données partielles. Si une fonctionnalité fallback n'existe pas encore en base, le backend peut la matérialiser à partir du catalogue historique avant d'appliquer le premier vote, mais il ne doit jamais créer de doublon logique. Si la même personne revote ou resoumet la même suggestion pending, l'API renvoie un conflit récupérable et l'UI doit l'expliquer sans mentir. Aucune erreur ne doit augmenter le compteur de vote, publier une suggestion, ni exposer des données d'un autre compte.

# Problem

La page roadmap existante appartenait à un ancien état du site: données hardcodées, bouton de vote relié à aucune route réelle, modale de suggestion purement décorative, types divergents, et aucune connexion avec le système moderne Clerk + Convex + identités/entitlements WinGlows. Dans cet état, la page donne une promesse interactive fausse et fragilise la confiance produit.

# Solution

Réactiver la roadmap comme surface publique branchée au runtime actuel: lecture des features depuis Convex avec fallback contrôlé, votes authentifiés et idempotents par compte, suggestions persistées en file `pending`, et UI Astro existante conservée avec des retours d'état honnêtes. Le chantier reste volontairement hors modération admin complète et hors entitlement payant spécifique: l'authentification suffit, l'entitlement n'est pas requis pour participer à la roadmap.

# Scope In

- lecture roadmap via Convex avec fallback sur le catalogue historique actuel
- vote authentifié une fois par fonctionnalité
- persistance de suggestions `pending` côté Convex
- compatibilité bilingue `en` / `fr`
- retours UI explicites pour login requis, compte non prêt, doublon et erreur serveur
- documentation technique minimale mise à jour pour les nouveaux contrats de données/API

# Scope Out

- interface d'administration/modération des suggestions
- workflow d'approbation/publication des suggestions
- entitlement payant requis pour voter ou suggérer
- notifications email, analytics produit, ou scoring avancé des idées
- suppression/édition de suggestion par l'utilisatrice

# Constraints

- garder la roadmap publiquement lisible
- réutiliser Clerk middleware et `locals.auth()` au lieu d'un flux auth parallèle
- conserver l'autorité visuelle existante du site (`global.css` + `tailwind.config.mjs`)
- ne pas publier automatiquement les suggestions pour limiter spam et contenu non revu
- aucune lecture/écriture cross-account
- éviter une dépendance à un job de seed manuel pour garder la page opérationnelle

# Test Contract

- surface: "Astro page + Astro API + Convex backend"
- proof_profile: "automated_plus_local_runtime"
- proof_order:
  - "pnpm build:check"
  - "API sanity for roadmap vote/suggest contracts"
  - "targeted browser/manual follow-up only if build or API proof is insufficient"
- checklist_path: "None, because the first slice stays local and code-backed"
- required_scenario_ids:
  - "RM-001"
  - "RM-002"
  - "RM-003"
  - "RM-004"
  - "RM-005"
- required_results:
  - "Public roadmap renders with live or fallback data"
  - "Authenticated vote is single-use per feature"
  - "Unauthenticated or unsynced account cannot write"
  - "Suggestion persists as pending and duplicate pending suggestion is rejected"
- exception_with_proof:
  - "No browser proof is required if type/build checks pass and API/client contracts are fully exercised in code review for this turn."
- exception_without_proof:
  - "None"

# Dependencies

- Clerk Astro session via middleware and `locals.auth()`
- Convex schema and HTTP client queries/mutations
- Existing `users` and `globalUsers` identity mirror
- Fresh external docs verdict: `fresh-docs not needed`, because the implementation reuses already-established Clerk middleware and Convex HTTP patterns from the local codebase without introducing a new provider contract or SDK feature

# Invariants

- English roadmap routes stay unprefixed and French routes stay under `/fr`
- roadmap reads remain public
- writes remain user-scoped and authenticated
- one account cannot vote twice on the same feature
- suggestions are stored as `pending`, not auto-published
- UI copy must stay bilingual and honest about actual state

# Links & Consequences

- `src/pages/[...lang]/[roadmap].astro` must stop being the source of truth for live roadmap data
- `src/components/roadmap/FeatureCard.astro` and `AddFeatureModal.astro` must become truthful interactive clients
- `convex/schema.ts` gains persistent write contracts that must preserve identity boundaries
- `shipglows_data/technical/architecture.md` must mention the new roadmap feedback API and tables

# Documentation Coherence

- Update `shipglows_data/technical/architecture.md` to document roadmap feedback routes and Convex tables
- No README or editorial content update required, because public copy promises stay limited to browsing, voting, and suggesting

# Edge Cases

- Convex unavailable or placeholder URL: roadmap stays readable via fallback and writes fail honestly
- First vote targets a historical fallback feature not yet persisted in Convex
- Clerk session exists but product-side `users` mirror is not ready yet
- Same account retries vote due to double-click or refresh
- Same account submits the same pending suggestion twice
- Project filter references a product with no current features

# Implementation Tasks

- [ ] Task 1: Normalize the roadmap domain model and fallback catalog
  - Fichier : `src/types/roadmap.ts`, `src/lib/roadmapDefaults.ts`
  - Action : Align the frontend type contract with `projectId`, stable feature keys, and the legacy fallback feature catalog used when Convex has no rows
  - User story link : Public roadmap must stay readable while the runtime source of truth migrates
  - Depends on : None
  - Validate with : `pnpm build:check`
  - Notes : Keep the fallback catalog deterministic so server and client speak the same feature keys

- [ ] Task 2: Add durable Convex contracts for roadmap feedback
  - Fichier : `convex/schema.ts`, `convex/features.ts`
  - Action : Extend `features`, add `featureVotes` and `featureSuggestions`, expose public list query, idempotent vote mutation, and pending suggestion mutation
  - User story link : Votes and suggestions must persist safely per account
  - Depends on : Task 1
  - Validate with : `pnpm build:check`
  - Notes : Vote mutation may materialize a fallback feature on first interaction to avoid a manual seed dependency

- [ ] Task 3: Expose Clerk-aware roadmap API routes
  - Fichier : `src/pages/api/features/[key]/vote.ts`, `src/pages/api/features/suggest.ts`
  - Action : Create JSON API routes that require `locals.auth().userId`, translate backend errors into stable HTTP statuses, and call Convex
  - User story link : Authenticated participation must follow the current product auth system
  - Depends on : Task 2
  - Validate with : `pnpm build:check`
  - Notes : Treat missing product-side user mirror as `409 account_not_ready`

- [ ] Task 4: Rewire the roadmap page to runtime data
  - Fichier : `src/pages/[...lang]/[roadmap].astro`
  - Action : Replace hardcoded page-only source of truth with Convex query plus fallback, preserve project filtering, and pass the new interaction copy/state to child components
  - User story link : The roadmap page must reflect the current product state without becoming blank or broken
  - Depends on : Task 1, Task 2
  - Validate with : `pnpm build:check`
  - Notes : Keep the page public even when writes require auth

- [ ] Task 5: Make vote and suggestion UI truthful
  - Fichier : `src/components/roadmap/FeatureCard.astro`, `src/components/roadmap/AddFeatureModal.astro`, `src/i18n/en/roadmap.json`, `src/i18n/fr/roadmap.json`
  - Action : Add client-side success/error handling, login redirect behavior, and bilingual messages for vote/suggestion states
  - User story link : The user must understand whether the action succeeded, needs login, or is blocked
  - Depends on : Task 3, Task 4
  - Validate with : `pnpm build:check`
  - Notes : Keep styles inside existing tokenized site primitives

- [ ] Task 6: Refresh technical docs for the new contract
  - Fichier : `shipglows_data/technical/architecture.md`
  - Action : Document roadmap feedback API routes and new Convex tables
  - User story link : Future changes must stay aligned with the current runtime architecture
  - Depends on : Task 2, Task 3
  - Validate with : `pnpm build:check`
  - Notes : No public marketing copy change is required

# Acceptance Criteria

- [ ] CA 1: Given Convex contains roadmap features, when a visitor opens `/roadmap` or `/fr/roadmap`, then the page renders those features grouped by status and filtered by project correctly
- [ ] CA 2: Given Convex has no roadmap rows or is unavailable, when the roadmap page renders, then the historical fallback catalog stays visible and the page does not crash
- [ ] CA 3: Given an authenticated account with a synchronized product user votes on a feature, when the vote API succeeds, then exactly one vote is recorded for that account and the returned count increments by one
- [ ] CA 4: Given the same authenticated account votes again on the same feature, when the API is called, then no second vote is written and the UI receives a recoverable duplicate response
- [ ] CA 5: Given no authenticated session exists, when vote or suggestion APIs are called, then the server returns `401` and writes nothing
- [ ] CA 6: Given a Clerk session exists but the product user mirror is missing, when vote or suggestion APIs are called, then the server returns `409 account_not_ready` and writes nothing
- [ ] CA 7: Given an authenticated synchronized account submits a valid suggestion, when the API succeeds, then a `featureSuggestions` row is created in `pending` with the correct `projectId`, title, description, and owner
- [ ] CA 8: Given the same account submits the same pending suggestion twice, when the second request is made, then the API rejects it with a duplicate response and no second row is created
- [ ] CA 9: Given the roadmap UI receives `401`, `409`, duplicate, or generic error responses, when it handles them client-side, then the user sees or is redirected through an explicit truthful path instead of a silent no-op

# Test Strategy

- run `pnpm build:check`
- review compile-time typing across Astro, API, and Convex contracts
- manually inspect vote/suggestion client flows in code for login redirect and error-state handling
- defer browser/manual proof only if build check reveals no type or route contract gap

# Risks

- Security: public write APIs could be abused if auth or duplicate guards are incomplete
- Product: silently requiring a synchronized product user could surprise brand-new signups if the Clerk webhook lags
- Data: fallback-feature materialization must not create duplicate logical entries
- UX: roadmap remains public while writes require auth, so messages must be precise to avoid feeling broken

# Execution Notes

- Read first: `src/pages/[...lang]/[roadmap].astro`, `src/components/roadmap/FeatureCard.astro`, `src/components/roadmap/AddFeatureModal.astro`, `convex/schema.ts`, `convex/features.ts`
- Implementation order: shared frontend model -> Convex schema/mutations -> Astro API routes -> roadmap page wiring -> UI feedback -> architecture doc
- Use existing Clerk middleware and `locals.auth()`; do not invent token parsing in the browser
- Use the site design-system authority already declared in `src/assets/styles/global.css` and `tailwind.config.mjs`; no new raw visual literals
- Validation command: `pnpm build:check`
- Stop conditions: ambiguous product rule for entitlement-gated roadmap participation, missing design-system authority, or inability to distinguish duplicate vote vs missing account cleanly

# Open Questions

None

# Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-06-12 17:35:00 UTC | 100-sf-spec | GPT-5 Codex | Created roadmap feedback spec from roadmap audit findings and current Clerk/Convex runtime | updated | /101-sf-ready roadmap-account-aware-feedback |
| 2026-06-12 17:35:30 UTC | 101-sf-ready | GPT-5 Codex | Validated structure, behavior contract, auth/data/security scope, and implementation autonomy | ready | /102-sf-start roadmap-account-aware-feedback |
| 2026-06-12 15:11:00 UTC | 001-sf-build | GPT-5 Codex | Implemented roadmap Convex/API/UI wiring and ran `pnpm build:check`; verification blocked by pre-existing syntax error in `src/pages/[...lang]/[testimonials].astro` | partial | /103-sf-verify roadmap-account-aware-feedback |
| 2026-06-12 15:26:00 UTC | 300-sf-docs | GPT-5 Codex | Refreshed fallback roadmap card content to better match current product docs and active WinGlows app chantiers | updated | /103-sf-verify roadmap-account-aware-feedback |
| 2026-06-12 17:56:00 UTC | 001-sf-build | GPT-5 Codex | Improved roadmap mobile responsiveness by removing project-filter overflow and turning kanban mobile into a snap-scannable horizontal rail | partial | /103-sf-verify roadmap-account-aware-feedback |

# Current Chantier Flow

- 100-sf-spec: complete
- 101-sf-ready: complete
- 102-sf-start: complete
- 103-sf-verify: partial
- 104-sf-end: pending
- 005-sf-ship: pending
- Next command: `/103-sf-verify roadmap-account-aware-feedback`
