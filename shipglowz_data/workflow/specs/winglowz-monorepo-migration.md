---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-05-24"
created_at: "2026-05-24 21:02:33 UTC"
updated: "2026-05-24"
updated_at: "2026-05-24 21:38:00 UTC"
status: reviewed
source_skill: sf-spec
source_model: "GPT-5 Codex"
scope: "repository-migration"
owner: "Diane"
confidence: medium
user_story: "En tant que mainteneuse de WinGlows, je veux regrouper le site et l'app dans un monorepo canonique afin que le produit, la gouvernance, la documentation, le CI et les deploiements soient coordonnes depuis une seule source de verite."
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "/home/claude/winglowz"
  - "/home/claude/winglowz_app"
  - "GitHub repositories"
  - "Vercel projects"
  - "GitHub Actions"
  - "Dependabot"
  - "Firebase CLI files"
  - "ShipGlowz governance corpus"
depends_on:
  - artifact: "docs/explorations/2026-05-24-winglowz-monorepo.md"
    artifact_version: "1.0.0"
    required_status: "draft"
  - artifact: "shipglowz_data/technical/guidelines.md"
    artifact_version: "unknown"
    required_status: "reviewed"
  - artifact: "shipglowz_data/technical/architecture.md"
    artifact_version: "unknown"
    required_status: "reviewed"
supersedes: []
evidence:
  - "2026-05-24: /home/claude/winglowz is clean on main...origin/main."
  - "2026-05-24: /home/claude/winglowz_app is clean on master...origin/master."
  - "2026-05-24: winglowz is an Astro/Vercel/pnpm site repository."
  - "2026-05-24: winglowz_app is a Flutter/Firebase app repository."
  - "ReplayGlowz and ContentGlowz already use a canonical monorepo root with app/site subdirectories."
  - "Vercel official monorepo docs confirm separate projects can target different root directories in the same repository."
next_step: "/sf-end shipglowz_data/workflow/specs/winglowz-monorepo-migration.md"
---

# Title

WinGlows Monorepo Migration

# Status

Ready for staged implementation. The spec has explicit success/error behavior, invariants, stop conditions, documentation impacts, and validation steps for migrating WinGlows from two sibling repositories into one canonical monorepo.

# User Story

En tant que mainteneuse de WinGlows, je veux regrouper le site et l'app dans un monorepo canonique afin que le produit, la gouvernance, la documentation, le CI et les deploiements soient coordonnes depuis une seule source de verite.

Acteur principal: mainteneuse WinGlows.

Acteurs secondaires: agents ShipGlowz, GitHub Actions, Vercel, Firebase CLI, collaborateurs futurs.

Declencheur: les deux depots `winglowz` et `winglowz_app` sont propres et la mainteneuse confirme que la migration peut demarrer.

Resultat observable attendu: `/home/claude/winglowz` contient la racine monorepo, le site vit sous `winglowz_site/`, l'app vit sous `winglowz_app/`, un seul `shipglowz_data/` canonique reste a la racine, et les commandes de verification site/app restent executables depuis leurs sous-dossiers.

# Minimal Behavior Contract

La migration transforme l'organisation du depot sans changer le comportement fonctionnel du site ni de l'app. Le site Astro doit continuer a se construire depuis son nouveau sous-dossier, l'app Flutter doit continuer a s'analyser et a tester depuis son nouveau sous-dossier, et les fichiers de CI/deploiement doivent pointer vers les nouveaux chemins. Si une etape de migration echoue, l'etat doit rester recuperable depuis Git sans suppression destructive de l'ancien depot `winglowz_app`. L'edge case facile a rater est l'ajout du depot app comme repertoire imbrique avec son `.git`, ce qui creerait un depot embarque au lieu de vrais fichiers suivis dans le monorepo.

# Problem

WinGlows est actuellement fragmente entre deux depots sibling: `winglowz` pour le site Astro et `winglowz_app` pour l'app Flutter. Cette separation fragmente les specs, bugs, docs techniques, workflows CI/deploiement et decisions produit. Le modele est aussi incoherent avec ReplayGlowz et ContentGlowz, qui utilisent deja un depot canonique par produit avec des sous-projets.

# Solution

Transformer `winglowz` en racine monorepo, deplacer le site dans `winglowz_site/`, importer l'app dans `winglowz_app/`, puis consolider la gouvernance ShipGlowz a la racine. Les workflows, README et chemins de deploiement sont ajustes pour que chaque surface reste deployable et testable depuis son sous-dossier.

# Success Behavior

Preconditions: les depots `/home/claude/winglowz` et `/home/claude/winglowz_app` sont propres, accessibles localement, et aucune suppression destructive n'est necessaire. Action: la migration recompose le layout du depot racine et importe l'app. Resultat operateur: un seul depot `winglowz` contient le site, l'app, les workflows et la gouvernance. Effet systeme: Git suit les fichiers site/app sans depot imbrique, les commandes de verification pointent vers les nouveaux sous-dossiers, et les docs expliquent les root directories. Preuve de succes: `git status`, absence de `.git` imbrique, presence des manifests site/app, checks site/app lances ou blocages documentes.

# Error Behavior

Si un worktree n'est pas propre, l'execution s'arrete avant tout deplacement. Si `git subtree` n'est pas disponible ou echoue, l'execution s'arrete pour choisir explicitement entre fallback sans historique ou reprise technique; elle ne copie pas silencieusement l'app en perdant l'historique. Si une collision de documents `shipglowz_data` risque d'ecraser un artefact, l'execution renomme ou conserve les deux versions avec une note claire. Si un check echoue apres migration, l'echec est documente avec la commande et la surface concernee; il ne doit pas etre masque par un commit de migration pretendu complet.

# Scope In

- Utiliser `/home/claude/winglowz` comme racine canonique.
- Deplacer les fichiers du site actuel vers `winglowz_site/`, en conservant une racine monorepo lisible.
- Importer le contenu de `/home/claude/winglowz_app` dans `winglowz_app/` sans inclure son repertoire `.git`.
- Preserver autant que possible l'historique utile de l'app, avec `git subtree` si l'outil est disponible localement.
- Garder un seul `shipglowz_data/` a la racine du monorepo.
- Migrer les specs, bugs, reviews, tests logs et docs de gouvernance app depuis `winglowz_app/shipglowz_data` vers le corpus racine sans ecraser les documents site existants.
- Mettre a jour le README racine pour documenter le layout, les commandes et les root directories de deploiement.
- Mettre a jour les docs/contrats agent racine et sous-projets si necessaire.
- Adapter `.github/workflows/**` et `.github/dependabot.yml` apres l'import de l'app.
- Conserver `vercel.json`, `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `pubspec.yaml`, `package.json` et les lockfiles dans les sous-projets qui les possedent.
- Verifier au minimum l'integrite Git, les chemins documentaires, et les checks rapides disponibles.

# Scope Out

- Changer le comportement produit du site ou de l'app.
- Refactorer le code Astro, Flutter, Android natif, Firebase ou Convex.
- Changer les providers auth, paiement, backend ou analytics.
- Modifier les secrets, les variables de production ou les projets Vercel/Firebase eux-memes.
- Supprimer le depot sibling `/home/claude/winglowz_app` apres migration.
- Pousser vers GitHub sans demande explicite.

# Constraints

- Ne jamais supprimer `/home/claude/winglowz_app` pendant cette migration.
- Ne jamais inclure `winglowz_app/.git` dans le monorepo.
- Garder un seul `shipglowz_data/` canonique a la racine.
- Ne pas deplacer les secrets ni inventer de nouvelles variables d'environnement.
- Garder les commandes app/site executables depuis leurs sous-dossiers.
- Garder les contenus user-facing existants dans leur langue actuelle.
- Utiliser des chemins relatifs stables dans les docs et workflows.

# Dependencies

- Git local, avec support `git subtree` si disponible.
- Depot source app: `/home/claude/winglowz_app`, branche `master`.
- Depot cible monorepo: `/home/claude/winglowz`, branche `main`.
- Precedents locaux: `/home/claude/replayglowz/README.md` et `/home/claude/contentglowz/README.md`.
- Vercel monorepo/root directory behavior, confirme via documentation officielle.
- Flutter SDK et pnpm pour les checks, si disponibles dans l'environnement.

# Invariants

- La migration est structurelle: elle ne change pas les contrats produit, auth, paiement, Firebase, Convex ou contenu.
- Le site reste une app Astro/Vercel/pnpm.
- L'app reste une app Flutter/Firebase.
- Les providers et secrets existants restent externes au depot.
- Le depot sibling `winglowz_app` reste disponible comme fallback tant que le monorepo n'est pas shippe.
- Les specs ShipGlowz restent des artefacts internes, pas des contenus Astro.

# Links & Consequences

- GitHub: le depot canonique actif devient `winglowz`; l'ancien depot app devra etre considere comme archive ou migration source apres validation.
- Vercel: les projets doivent cibler `winglowz_site` et `winglowz_app` comme Root Directory selon leur surface.
- GitHub Actions: les workflows importes depuis l'app doivent vivre sous `.github/workflows/` racine et prefixer leurs chemins.
- Dependabot: les entries app doivent pointer vers `winglowz_app`; les entries site vers `winglowz_site`.
- ShipGlowz: `shipglowz_data` racine devient le seul corpus de gouvernance.
- Documentation: les liens README/docs qui supposaient un depot app separe doivent etre ajustes.

# Documentation Coherence

- `README.md` racine doit devenir le plan monorepo.
- `winglowz_site/README.md` doit conserver les commandes et details du site.
- `winglowz_app/README.md` doit conserver les commandes et details de l'app.
- `AGENT.md` et `CLAUDE.md` racine doivent decrire les regles monorepo; les contrats sous-projet peuvent rester specifiques.
- Les docs de deploiement doivent nommer les root directories Vercel.
- Les specs et bugs app doivent rester trouvables sous `shipglowz_data/workflow/`.
- Aucun changelog public n'est requis dans cette spec, sauf si la migration est shippee publiquement plus tard.

# Edge Cases

- `git add` peut traiter un dossier contenant `.git` comme depot embarque: l'import doit l'eviter.
- Des fichiers racine site (`README.md`, `AGENT.md`, `CLAUDE.md`, `CHANGELOG.md`) peuvent entrer en collision avec les futurs fichiers racine monorepo; il faut les deplacer ou les reecrire volontairement.
- Des artefacts `shipglowz_data/business/*.md` existent dans les deux depots; les versions app et site ne doivent pas s'ecraser silencieusement.
- Les workflows app peuvent contenir des chemins implicites depuis l'ancienne racine.
- Vercel peut continuer a utiliser l'ancien root directory jusqu'a modification cote dashboard/projet.
- Les commandes Windows-style dans `package.json` du site restent telles quelles si elles existaient avant; la migration ne corrige pas ce sujet.

# Confirmed Technical Decisions

- Racine canonique: `/home/claude/winglowz`.
- Branche racine cible: `main`.
- Branche source app: `/home/claude/winglowz_app` sur `master`.
- Layout cible:

```text
winglowz/
  README.md
  AGENT.md
  CLAUDE.md
  CHANGELOG.md
  shipglowz_data/
  .github/
  winglowz_site/
  winglowz_app/
```

- Les projets Vercel devront utiliser des root directories distincts: `winglowz_site` pour le site, `winglowz_app` pour l'app web si elle reste deployee sur Vercel.
- Le monorepo ne depend pas obligatoirement d'un workspace pnpm, car le site est Node/pnpm et l'app est Flutter/Dart.
- Fresh docs verdict: `fresh-docs checked` pour Vercel monorepo/root directory; les autres decisions sont locales aux depots et precedents ReplayGlowz/ContentGlowz.

# Risks

- Perte d'historique app si le fallback copie est utilise sans decision explicite.
- CI casse si les chemins de workflow ne sont pas tous prefixes.
- Deploiement Vercel casse si les Root Directory settings ne sont pas mis a jour.
- Docs gouvernance incoherentes si les corpus site/app sont fusionnes trop agressivement.
- Checks longs ou indisponibles selon Flutter/SDK/node_modules locaux.

# Execution Notes

- Lire d'abord `git status` des deux depots, `README.md`, `AGENT.md`, `CLAUDE.md`, `.github` app, et les manifests `package.json`/`pubspec.yaml`.
- Faire la migration sur une branche ou un worktree propre si un doute apparait; ne pas pousser sans instruction.
- Preferer `git subtree add --prefix=winglowz_app /home/claude/winglowz_app master` pour importer l'app avec historique.
- Si un commit intermediaire est necessaire pour le move site avant subtree, le faire uniquement si l'utilisateur a demande une migration commitable; sinon garder l'etat local inspectable.
- Ne pas lancer de commande destructive non demandee.
- Si les checks de build sont trop longs, lancer au minimum les checks structurels et noter les checks non executes.

# Implementation Tasks

- [ ] Tache 1 : Proteger l'etat initial
  - Fichiers : aucun fichier applicatif.
  - Action : verifier `git status --short --branch` dans `winglowz` et `winglowz_app`, noter les remotes et branches.
  - Validate with : les deux worktrees sont propres avant de bouger les fichiers.

- [ ] Tache 2 : Creer la structure monorepo site
  - Fichiers : racine `winglowz`, `winglowz_site/**`.
  - Action : deplacer les fichiers et dossiers site actuels dans `winglowz_site/` en gardant a la racine seulement les contrats monorepo, `shipglowz_data/`, `.github/` si present, et les fichiers de gouvernance racine.
  - Validate with : `git status --short` montre des renames/additions attendus, aucun `.git` imbrique.

- [ ] Tache 3 : Importer l'app
  - Fichiers : `winglowz_app/**`.
  - Action : importer `/home/claude/winglowz_app` dans `winglowz_app/`, idealement via `git subtree add --prefix=winglowz_app /home/claude/winglowz_app master` pour garder l'historique; fallback acceptable: copie suivie sans `.git` si subtree indisponible et explicitement documente.
  - Validate with : `test ! -d winglowz_app/.git`, `git status --short`, presence de `winglowz_app/pubspec.yaml`.

- [ ] Tache 4 : Consolider `shipglowz_data`
  - Fichiers : `shipglowz_data/**`, ancien `winglowz_app/shipglowz_data/**`.
  - Action : fusionner les artefacts app dans le corpus racine sans ecraser les artefacts site; conserver les specs app sous `shipglowz_data/workflow/specs/`, les bugs sous `shipglowz_data/workflow/bugs/`, et les docs techniques/business en les renommant ou scindant si necessaire.
  - Validate with : un seul repertoire `shipglowz_data/` dans le monorepo, aucun `winglowz_app/shipglowz_data` restant sauf exception documentee.

- [ ] Tache 5 : Mettre a jour les contrats et docs racine
  - Fichiers : `README.md`, `AGENT.md`, `CLAUDE.md`, `winglowz_site/README.md`, `winglowz_app/README.md`, docs liees.
  - Action : le README racine decrit le monorepo; les README sous-projets decrivent leurs commandes locales; les liens vers docs/gouvernance sont ajustes.
  - Validate with : liens critiques relus, mentions obsoletes de depot separe corrigees.

- [ ] Tache 6 : Adapter CI/deploiement
  - Fichiers : `.github/workflows/**`, `.github/dependabot.yml`, `winglowz_site/vercel.json`, `winglowz_app/vercel.json`, docs de deploiement.
  - Action : deplacer les workflows app a la racine `.github/`, prefixer les chemins/working directories, documenter les Vercel Root Directory settings.
  - Validate with : YAML lisible, chemins existants, root directories documentes.

- [ ] Tache 7 : Executer les checks disponibles
  - Fichiers : aucun fichier source nouveau sauf corrections de chemins necessaires.
  - Action : lancer les checks adaptes depuis les sous-dossiers.
  - Validate with :
    - `git -C /home/claude/winglowz status --short --branch`
    - `find /home/claude/winglowz -path '*/.git' -type d`
    - `pnpm --dir /home/claude/winglowz/winglowz_site build:check` ou check equivalent disponible
    - `flutter analyze` depuis `winglowz_app` si Flutter est disponible
    - `flutter test` depuis `winglowz_app` si l'environnement le permet

# Acceptance Criteria

- `/home/claude/winglowz` est le seul depot Git actif pour les surfaces WinGlows.
- `winglowz_site/package.json` existe et conserve les scripts site.
- `winglowz_app/pubspec.yaml` existe et conserve les scripts/configs app.
- Aucun `.git` n'existe sous `winglowz/winglowz_app`.
- Il n'existe qu'un `shipglowz_data/` canonique a la racine.
- Les specs et bugs app existants sont encore presents dans le corpus racine.
- Les workflows GitHub de l'app sont presents sous `.github/` racine avec chemins adaptes.
- Le README racine documente le layout, les commandes principales et les root directories Vercel.
- Les checks site/app tentables ont ete lances ou les blocages d'environnement sont documentes.

# Test Strategy

- Inspecter Git:
  - `git status --short --branch`
  - `find . -path '*/.git' -type d`
  - `git log --oneline -- winglowz_app/pubspec.yaml` si import subtree retenu.
- Verifier le site:
  - `pnpm --dir winglowz_site build:check`
  - `pnpm --dir winglowz_site test:unit` si rapide et disponible.
- Verifier l'app:
  - `cd winglowz_app && flutter analyze`
  - `cd winglowz_app && flutter test`
- Verifier la gouvernance:
  - `find . -path '*/shipglowz_data' -type d`
  - `find shipglowz_data/workflow/specs -maxdepth 1 -type f | sort`
- Verifier docs/deploiement:
  - README racine relu.
  - root directories Vercel documentes.
  - workflows GitHub relus pour `working-directory` et chemins d'artifacts.

# Stop Conditions

- Un des deux depots n'est plus propre au moment de l'execution.
- `git subtree` echoue d'une facon qui rend l'historique ambigu et la mainteneuse n'a pas accepte le fallback sans historique.
- La fusion `shipglowz_data` risque d'ecraser des artefacts app ou site sans convention de renommage claire.
- Les checks revelent une casse fonctionnelle non liee au simple changement de chemin.
- Une commande destructrice serait necessaire pour continuer.

# Open Questions

None.

# Rollback Plan

- Avant commit, revenir par Git dans `/home/claude/winglowz` si la migration est incoherente.
- Ne pas supprimer `/home/claude/winglowz_app`; il reste le fallback complet de l'app pendant toute la migration locale.
- Si l'import app par subtree produit un graphe Git inutilisable, abandonner l'approche avant push et reprendre depuis un branchement dedie.

# Documentation Freshness

- `fresh-docs checked`: Vercel official monorepo documentation consulted on 2026-05-24. It confirms that each project in a monorepo can be configured with its own Root Directory, and that root directory changes affect subsequent deployments.
- `fresh-docs not needed`: GitHub Actions path updates, Flutter checks, pnpm checks, and ShipGlowz governance consolidation are derived from local repository files and existing ReplayGlowz/ContentGlowz patterns.

# Current Chantier Flow

- sf-spec: completed
- sf-ready: ready
- sf-start: implemented
- sf-verify: completed
- sf-end: pending
- sf-ship: shipped

# Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-05-24 21:02:33 UTC | sf-spec | GPT-5 Codex | Created migration spec from exploration and clean-repo confirmation | draft | /sf-ready shipglowz_data/workflow/specs/winglowz-monorepo-migration.md |
| 2026-05-24 21:04:51 UTC | sf-ready | GPT-5 Codex | Validated readiness and added missing behavior/risk sections | ready | /sf-start shipglowz_data/workflow/specs/winglowz-monorepo-migration.md |
| 2026-05-24 21:12:12 UTC | sf-start | GPT-5 Codex | Migrated site/app into monorepo, consolidated governance, updated CI/docs, and ran local checks | implemented | /sf-verify shipglowz_data/workflow/specs/winglowz-monorepo-migration.md |
| 2026-05-24 21:29:00 UTC | sf-verify | GPT-5 Codex | Verified migrated app history/content, GitHub org transfer, PR checks, and standalone app/snapshot status | completed | /sf-ship shipglowz_data/workflow/specs/winglowz-monorepo-migration.md |
| 2026-05-24 21:38:00 UTC | sf-ship | GPT-5 Codex | Merged PR #99 into main and verified post-merge Android CI, Firestore deploy, Firebase Auth check, and APK artifact upload | shipped | /sf-end shipglowz_data/workflow/specs/winglowz-monorepo-migration.md |
