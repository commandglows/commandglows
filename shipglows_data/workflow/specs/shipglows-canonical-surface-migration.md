---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlowz"
created: "2026-08-03"
created_at: "2026-08-03 20:10:00 UTC"
updated: "2026-08-03"
updated_at: "2026-08-03 20:18:00 UTC"
status: ready
source_skill: 100-sg-spec
source_model: "GPT-5 Codex"
scope: "migration"
owner: "Diane"
confidence: high
user_story: "En tant qu'operatrice, je veux rendre ShipGlows canonique sur toutes les surfaces WinGlowz afin que le nouveau nom soit coherent sans casser les URLs, installateurs ou droits existants."
risk_level: high
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "winglowz_site"
  - "winglowz_app"
  - "convex"
  - "github"
  - "shipglows_data"
depends_on:
  - artifact: "shipglows_data/technical/architecture.md"
    artifact_version: "1.0.1"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/guidelines.md"
    artifact_version: "0.1.0"
    required_status: "reviewed"
supersedes: []
evidence:
  - "Read-only inventory found 177 tracked files and 1232 lines containing the legacy ShipGlowz identity."
  - "159 tracked paths contain shipglowz, including governance roots and five active site runtime files."
  - "Both https://github.com/dianedef/ShipGlowz and https://github.com/dianedef/ShipGlows resolve on 2026-08-03."
  - "The initial git worktree was clean on main."
next_step: "/102-sg-start shipglows-canonical-surface-migration"
---

# Title

ShipGlows Canonical Surface Migration

## Status

Ready implementation contract for the monorepo-wide ShipGlowz to ShipGlows identity migration.

## User Story

En tant qu'operatrice de WinGlowz, je veux que toutes les surfaces actives utilisent le nom canonique ShipGlows afin que les utilisateurs, installateurs, agents et integrations voient une identite coherente sans perdre leurs liens, configurations ou droits existants.

## Minimal Behavior Contract

Le depot accepte encore les URLs, variables d'environnement et identifiants produit historiques aux frontieres de compatibilite, les normalise vers ShipGlows, puis n'expose et ne produit que le nouveau nom canonique. Une migration reussie rend les nouvelles pages, commandes, installateurs, documents et chemins de gouvernance disponibles sous `shipglows`; une entree historique reste recuperable sans doublon ni perte d'acces. Si une ancienne valeur ne peut pas etre normalisee de facon sure, le systeme echoue explicitement sans creer un droit concurrent. Le cas facile a oublier est un utilisateur possedant deja un entitlement `shipglowz`, qui doit conserver l'acces sans recevoir un second grant incoherent.

## Success Behavior

- Les routes canoniques sont `/shipglows`, `/fr/shipglows` et `/shipglows-script`.
- Les anciennes routes publiques redirigent en permanence vers leurs equivalents canoniques et conservent la query string utile, notamment `format=powershell`.
- Les installateurs utilisent `ShipGlows`, le depot GitHub `dianedef/ShipGlows`, le repertoire `shipglows` et les variables `SHIPGLOWS_*`.
- Les anciens `SHIPGLOWZ_*` et `SHIPFLOW_*` ne sont lus que dans un adaptateur de compatibilite deprecie; les sorties et exemples n'en generent plus.
- Le product ID canonique est `shipglows`; un entitlement `shipglowz` existant est normalise avant selection ou creation de grant.
- Un seul corpus de gouvernance existe a la racine sous `shipglows_data/` et les taches du corpus imbrique sont preservees dans le tracker racine.
- Les tests, docs, liens et noms de fichiers suivis utilisent le nouveau nom, sauf mentions historiques ou adaptateurs explicitement autorises.

## Error Behavior

- Une collision de fichiers entre les deux corpus de gouvernance bloque la consolidation au lieu d'ecraser silencieusement un document.
- Une ancienne variable et sa nouvelle equivalente avec des valeurs contradictoires donnent la priorite a `SHIPGLOWS_*` et emettent une indication de deprecation sans exposer de secret.
- La normalisation d'entitlement ne cree jamais deux grants actifs pour la meme politique canonique.
- Une route historique inconnue ne contourne pas Clerk et ne devient pas publique par prefixe trop large.
- Un lien ou chemin renomme manquant fait echouer les checks de coherence avant toute fermeture du chantier.

## Problem

WinGlowz contient encore l'ancienne identite sur la gouvernance, les pages publiques, les installateurs Unix et Windows, les variables d'environnement, les identifiants Convex, les tests, la documentation et des archives. Une substitution globale non gouvernee casserait des liens publics, des scripts copies, des configurations d'automatisation et potentiellement des droits existants.

## Solution

Appliquer une migration canonique complete vers ShipGlows, avec des adaptateurs de compatibilite limites aux frontieres externes. Renommer les chemins et symboles actifs, normaliser les anciennes valeurs avant la logique metier, conserver des redirections publiques permanentes et documenter une allowlist minimale pour les mentions historiques intentionnelles.

## Scope In

- Corpus racine `shipglows_data/` vers `shipglows_data/` et toutes ses references.
- Reconciliation de `winglowz_site/shipglows_data/workflow/TASKS.md` dans le tracker racine, puis suppression du corpus imbrique.
- Guidance racine, site et app; README, changelog, docs, conversations, specs, bugs et trackers.
- Routes/pages/installateurs site, middleware, donnees de page, contenus publics et liens GitHub.
- Variables, fonctions, constantes, noms de fichiers, repertoires temporaires et messages d'installation.
- Product IDs et politiques d'entitlement Convex/site, avec normalisation legacy.
- Tests automatises et scans de coherence associes.

## Scope Out

- Renommer le produit WinGlowz, les dossiers `winglowz_site/` ou `winglowz_app/`.
- Modifier l'historique Git ou les commits passes.
- Editer `node_modules/`, `.vercel/output/`, `dist/`, `build/`, `.dart_tool/`, `coverage/` ou d'autres sorties generees.
- Construire Android/Gradle localement; les contrats app interdisent ces builds.
- Deployer, committer ou pousser sans autorisation explicite.

## Constraints

- Preserver les modifications utilisateur et arreter si le worktree cesse d'etre propre hors chantier.
- Utiliser les outils canoniques sous `/home/claude/shipglows/`.
- Les aliases historiques restent confines a une couche de compatibilite testee et ne sont jamais affiches comme nom courant.
- Les anciennes mentions historiques ne restent que lorsqu'elles decrivent fidelement un etat passe; elles doivent etre allowlistees par chemin et motif.
- Les fichiers `src/generated/` sont suivis et font partie des sources a migrer.

## Test Contract

- `surface`: monorepo governance, Astro/TypeScript public site, Convex entitlement contracts, shell/PowerShell installers and Flutter documentation references.
- `proof_profile`: mixed automated, route/browser, compatibility-contract and local Flutter static/unit proof.
- `proof_order`: diff/scope -> metadata/link scans -> targeted site contract tests -> full site checks -> Flutter analyze/tests -> browser redirects and raw installer responses.
- `checklist_path`: `shipglows_data/workflow/test-checklists/shipglows-canonical-surface-migration.md`.
- `required_scenario_ids`: `SGM-ROUTE-01`, `SGM-SCRIPT-02`, `SGM-ENV-03`, `SGM-ENTITLEMENT-04`, `SGM-GOVERNANCE-05`, `SGM-NAME-SCAN-06`.
- `required_results`: canonical pages/scripts resolve; legacy URLs redirect permanently; new env names win over fallbacks; legacy entitlements normalize without duplicate grants; one governance corpus remains; only allowlisted legacy mentions survive.
- Automated proof: metadata lint, `pnpm build:check`, targeted then complete unit tests, `flutter analyze`, `flutter test`, tracked scans and `git diff --check`.
- Manual/browser proof: inspect the EN/FR canonical pages, 301 redirects, shell response and `?format=powershell` response without executing installers.
- `exception_with_proof`: no local Android/Gradle build, as forbidden by `winglowz_app/AGENTS.md`; Flutter analyze/tests and existing CI contracts provide the permitted local proof.

## Dependencies

- Astro routing and middleware already established in `winglowz_site`; fresh-docs checked against local implementation because no framework upgrade is introduced.
- GitHub repository `dianedef/ShipGlows`, reachable on 2026-08-03; the legacy URL also resolves and remains an external compatibility path.
- Convex entitlement contracts in `winglowz_site/convex/defaultFreeEntitlements.ts` and bridge contracts in `winglowz_site/src/lib/suiteBridge.ts`.

## Invariants

- `shipglows` is the only canonical emitted product ID and public slug after migration.
- Legacy values are normalized before authorization or entitlement decisions.
- Existing user access is preserved and no duplicate default entitlement is created.
- Exactly one canonical governance corpus remains at monorepo root.
- Public installer endpoints remain unauthenticated only for the exact expected paths.
- No secret, token or sensitive environment value is logged.

## Links & Consequences

- SEO and inbound links: permanent redirects preserve bookmarks and indexing while canonical links move to ShipGlows.
- Automation: old env names remain readable temporarily; new documentation emits only `SHIPGLOWS_*`.
- Data: existing `shipglowz` entitlement records remain valid through normalization and may be migrated idempotently when a write path is available.
- Operations: scripts clone/update `~/shipglows`; an existing `~/shipglowz` checkout is detected and handled without destructive overwrite.
- Documentation: historical evidence is distinguished from active instructions to avoid falsifying prior events.

## Documentation Coherence

- Align root `AGENT.md`, `CLAUDE.md`, `README.md`, site/app agent guidance and all canonical governance references.
- Align site public copy, blog links, installer commands and repository URLs.
- Keep historical records truthful while updating actionable paths and tool names.
- Update code/docs maps and public-surface maps when route ownership changes.

## Edge Cases

- Both `SHIPGLOWS_*` and a legacy variable are set with different values.
- A machine already has `~/shipglows`, `~/shipglowz`, or both, with local changes.
- A caller requests the old PowerShell format URL with query parameters.
- An account has only a legacy entitlement, both legacy and canonical entitlements, or neither.
- Case variants appear in GitHub links, filenames, PowerShell variables or shell functions.
- Historical transcripts legitimately mention the old brand while active commands inside them are stale.
- Generated output still contains old routes after a clean source build; it must be regenerated, not hand-edited.

## Implementation Tasks

- [x] Tache 1 : Consolider et renommer la gouvernance canonique
  - Fichier : `shipglows_data/**`, `winglowz_site/shipglows_data/workflow/TASKS.md`, guidance racine/site/app
  - Action : fusionner sans perte les taches imbriquees, renommer le corpus racine et mettre a jour les references actives.
  - User story link : coherence documentaire et source de verite unique.
  - Depends on : none
  - Validate with : recherche de corpus imbriques, metadata lint et verification des liens.

- [x] Tache 2 : Renommer les surfaces publiques et conserver les redirections
  - Fichier : `winglowz_site/src/pages/**`, `src/data/scriptInstallPages.ts`, middleware et tests de routes
  - Action : creer les routes canoniques ShipGlows, ajouter des 301 exactes depuis les anciennes routes et preserver les queries utiles.
  - User story link : nouveaux liens coherents sans casser les liens entrants.
  - Depends on : Tache 1
  - Validate with : tests de routes, build Astro et smoke navigateur EN/FR/script.

- [x] Tache 3 : Migrer les installateurs et variables avec compatibilite bornee
  - Fichier : `winglowz_site/src/generated/shipglows-installer.*`, endpoint script, tests deployment
  - Action : renommer fichiers/symboles/messages/chemins vers ShipGlows, donner priorite a `SHIPGLOWS_*`, puis lire les aliases historiques uniquement en fallback deprecie.
  - User story link : automatisations existantes preservees et nouvelles commandes canoniques.
  - Depends on : Tache 2
  - Validate with : tests shell/PowerShell textuels, priorite env, repo URL et chemin local.

- [x] Tache 4 : Canonicaliser le product ID et les entitlements
  - Fichier : `winglowz_site/src/lib/suiteBridge.ts`, `winglowz_site/convex/defaultFreeEntitlements.ts`, tests bridge/Convex
  - Action : introduire `shipglows`, normaliser `shipglowz` aux frontieres et rendre la creation de grant idempotente sans doublon.
  - User story link : preservation des acces existants.
  - Depends on : Tache 1
  - Validate with : tests legacy-only, canonical-only, dual-record et missing-record.

- [x] Tache 5 : Renommer les references actives sur le site, l'app et les documents
  - Fichier : fichiers suivis trouves par l'inventaire dans `winglowz_site/`, `winglowz_app/`, racine et `shipglows_data/`
  - Action : mettre a jour texte, liens, noms de symboles et chemins; conserver uniquement les mentions historiques allowlistees.
  - User story link : identite coherente sur toutes les surfaces.
  - Depends on : Taches 1 a 4
  - Validate with : scan tracked old-name + allowlist et verification de liens.

- [ ] Tache 6 : Executer la preuve proportionnelle complete
  - Fichier : monorepo complet
  - Action : executer les checks site, app, metadata, liens, symlinks, diff et old-name; corriger toute regression dans le scope.
  - User story link : migration fiable et exploitable.
  - Depends on : Taches 1 a 5
  - Validate with : commandes de la section Test Strategy.

## Acceptance Criteria

- [x] CA 1 : Given le monorepo migre, when les sources suivies sont inspectees, then tous les noms actifs utilisent ShipGlows et chaque ancien terme restant est un alias ou historique allowliste.
- [x] CA 2 : Given un visiteur sur `/shipglowz` ou `/fr/shipglowz`, when la route est ouverte, then une redirection 301 mene a la page ShipGlows equivalente.
- [x] CA 3 : Given un appel historique a `/shipglowz-script?format=powershell`, when il est execute, then il atteint l'endpoint canonique en preservant le format.
- [x] CA 4 : Given une automation avec seulement `SHIPGLOWZ_INSTALL_MODE`, when l'installateur demarre, then la valeur est normalisee; given `SHIPGLOWS_INSTALL_MODE` aussi, then la nouvelle variable gagne.
- [x] CA 5 : Given un compte avec un entitlement `shipglowz`, when l'acces est evalue, then il est reconnu comme `shipglows` sans second grant.
- [x] CA 6 : Given les deux identifiants d'entitlement, when la selection s'execute, then un resultat canonique unique et stable est retourne.
- [x] CA 7 : Given les deux anciens corpus, when la migration finit, then un seul `shipglows_data/` racine existe et aucune tache imbriquee n'est perdue.
- [ ] CA 8 : Given la suite de validation, when elle s'execute, then metadata lint, site checks/tests, Flutter analyze/tests et diff check passent sans build Android local.

## Test Strategy

1. `git diff --check` et verification du status/scope.
2. `/home/claude/shipglows/tools/shipglows_metadata_lint.py AGENT.md shipglows_data`.
3. Dans `winglowz_site`: `pnpm build:check`.
4. Dans `winglowz_site`: tests cibles installateur, bridge, entitlements, middleware et redirects, puis `pnpm test:unit`.
5. Dans `winglowz_app`: `flutter analyze` puis `flutter test`; aucun build Android/Gradle.
6. Scan des chemins suivis: `git ls-files | rg -i 'shipglowz|shipflow'` avec allowlist explicite.
7. Scan du contenu suivi: `git grep -I -i -E 'shipglowz|shipflow'` avec allowlist explicite.
8. Verification des symlinks et des liens locaux apres renommage.
9. Smoke navigateur des pages EN/FR, endpoint shell/PowerShell et redirections historiques.

## Risks

- Haute probabilite de liens/documentation oublies a cause du volume.
- Rupture d'automatisations si les aliases env sont supprimes trop tot.
- Perte ou duplication d'entitlements si le renommage du product ID est une substitution directe.
- Collision lors de la consolidation des trackers.
- Faux positif de completion si les sorties `.vercel` sont scannees ou modifiees a la place des sources.
- Redirection mal scopee pouvant modifier l'auth middleware ou creer une boucle.

## Execution Notes

- Lire d'abord `AGENT.md`, `winglowz_site/AGENT.md`, `winglowz_app/AGENTS.md`, `winglowz_site/src/data/scriptInstallPages.ts`, `winglowz_site/src/lib/suiteBridge.ts` et `winglowz_site/convex/defaultFreeEntitlements.ts`.
- Renommer les dossiers/fichiers avec des operations Git-detectables, puis appliquer les remplacements de contenu sur les fichiers suivis uniquement.
- Implementer les adaptateurs de compatibilite avant de supprimer les symboles actifs historiques.
- Ne jamais editer `.vercel/output`, `dist`, `node_modules`, `build`, `.dart_tool` ou `coverage`.
- Stopper si des changements utilisateur apparaissent, si GitHub `ShipGlows` devient inaccessible, si une collision de tracker est ambigue ou si les tests prouvent une perte d'acces.
- Fresh docs verdict: `fresh-docs checked` pour la disponibilite GitHub; routing/entitlement changes are governed by local code and tests without a framework API change.

## Open Questions

None. The professional default is to make ShipGlows canonical while retaining narrowly tested compatibility for external callers and existing access data.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|---|---|---|---|---|---|
| 2026-08-03 20:10:00 UTC | 100-sg-spec | GPT-5 Codex | Created the full migration contract from repository inventory and operator intent. | draft | Run readiness review. |
| 2026-08-03 20:18:00 UTC | 101-sg-ready | GPT-5 Codex | Reviewed structure, user-story fit, compatibility, security, adversarial cases, linked systems and proof contract; tightened explicit proof scenarios. | ready | Implement the migration. |
| 2026-08-03 20:52:00 UTC | 102-sg-start | GPT-5 Codex | Implemented canonical governance, site routes/installers, bounded legacy adapters, entitlement normalization, active-reference migration, and focused automated proof. | implemented | Run full repository verification. |
| 2026-08-03 20:58:00 UTC | 103-sg-verify | GPT-5 Codex | Ran standard verification: canonical and legacy HTTP route proof, full site checks/tests, focused app proof, metadata, shell syntax, symlink, diff and legacy-name scans. | partial | Resolve or baseline the 22 unrelated failures in the inherited full Flutter suite before a clean ship-readiness claim. |
| 2026-08-03 21:05:00 UTC | 005-sg-ship | GPT-5 Codex | Prepared full-close bookkeeping and shipped the canonical ShipGlows migration with the inherited Flutter-suite limitation recorded. | shipped | Run hosted verification for the hybrid Vercel surface; keep formal verification partial until the inherited Flutter failures are baselined or repaired. |
| 2026-08-03 21:07:12 UTC | 405-sg-prod | GPT-5 Codex | Confirmed the Vercel deployment for commit 1745c62 reached success, then attempted canonical and legacy route health checks. | partial | Preview is protected by Vercel authentication and the documented production domain does not resolve; hosted route behavior remains unproven. |
| 2026-08-04 18:31:58 UTC | 103-sg-verify | GPT-5 Codex | Verified the command copied from the live EN/FR ShipGlows pages: rendered command, live shell/PowerShell endpoint hashes, shell syntax, public Git clone, and focused site checks. The local flow stopped after the clone because `autossh` is not installed. | partial | Correct the local dependency contract so a fresh Linux local installation either installs `autossh` through an explicit safe path or declares the prerequisite before promising tunnel commands; then rerun the copied-command scenario. |

## Current Chantier Flow

| Stage | Status | Evidence | Next step |
|---|---|---|---|
| 100-sg-spec | complete | Full migration contract created from clean-worktree inventory. | 101-sg-ready |
| 101-sg-ready | complete | Readiness and adversarial review passed; metadata and proof contract are explicit. | 102-sg-start |
| 102-sg-start | complete | Tasks 1-5 implemented; focused tests, Astro check, metadata lint, diff check, governance-root and symlink checks passed. | 103-sg-verify |
| 103-sg-verify | partial | Migration-specific route and endpoint proof passes, but the live copied Unix-local command clones ShipGlows then stops at the missing `autossh` prerequisite; the inherited full Flutter suite also reports 22 unrelated UI/theme expectation failures. | Repair or clearly preflight the local `autossh` dependency, baseline the inherited Flutter failures, then rerun the copied-command scenario and complete verification. |
| 104-sg-end | partial | Full-close bookkeeping updated, but clean closure is intentionally withheld because verification remains partial. | Close after the Flutter baseline and hosted proof are resolved. |
| 005-sg-ship | complete | Migration staged, committed, and pushed with an explicit validation limitation. | Verify the matching hosted deployment. |
| 405-sg-prod | partial | Vercel deployment succeeded for commit 1745c62; preview route checks hit Vercel authentication and `winglowz.com` did not resolve. | Provide an accessible deployment target or restore production DNS, then retest the six canonical/legacy route scenarios. |
