---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-05-30"
created_at: "2026-05-30 16:38:20 UTC"
updated: "2026-05-30"
updated_at: "2026-05-30 21:33:12 UTC"
status: reviewed
source_skill: sf-build
source_model: "GPT-5 Codex"
scope: "windows-desktop-overlay-hotkeys-parity"
owner: "Diane"
confidence: medium
user_story: "En tant qu'utilisateur Windows de WinGlows, je veux retrouver le concept d'overlay flottant, de raccourcis globaux et d'actions rapides de l'app Android, afin de corriger, dicter, transformer, coller et reutiliser mes textes dans n'importe quelle application desktop sans perdre la base commune Flutter."
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Flutter desktop"
  - "Windows runner"
  - "Shared Flutter overlay UI"
  - "Global hotkeys"
  - "Clipboard"
  - "Text delivery"
  - "Voice pipeline"
  - "Backend-agnostic stores"
  - "Android overlay parity reference"
depends_on:
  - artifact: "docs/PLATFORM_BEHAVIOR.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "docs/OVERLAY_ANDROID.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/workflow/specs/android-overlay-flutter-parity-repair.md"
    artifact_version: "1.0.0"
    required_status: "active"
  - artifact: "shipglows_data/workflow/specs/local-first-user-owned-sync-strategy.md"
    artifact_version: "0.1.0"
    required_status: "draft"
supersedes: []
evidence:
  - "User decision 2026-05-30: IME is Android-only, but the overlay concept and user interface should be brought to Windows."
  - "User decision 2026-05-30: the goal is functional parity through a shared Flutter product surface plus OS-specific native hosts, not a code port of the Android overlay implementation."
  - "User decision 2026-05-30: most WinGlows concepts should not be Android-only; users will expect near-complete platform parity."
  - "User decision 2026-05-30: platform priority order is Windows, macOS, Linux, iOS, then web."
  - "User decision 2026-05-30: adapted platform experiences are acceptable only when they produce a better result; when the result is equivalent, avoid perturbing the user."
  - "User decision 2026-05-30: first Windows implementation should try to cover hotkey, overlay, clipboard and automatic best-effort delivery together."
  - "Repository scaffold already includes `windows/` and Flutter multi-platform targets."
  - "docs/PLATFORM_BEHAVIOR.md previously marked Windows overlay unavailable."
  - "docs/VERIFICATION.md previously marked Windows desktop launch out of current scope."
  - "Implemented first Windows host slice: typed Flutter bridge, Windows runner MethodChannel, global hotkey, topmost show/hide, clipboard copy, and best-effort paste delivery."
  - "Manual Windows QA checklist created under shipglows_data/workflow/verification/windows-desktop-overlay-hotkeys-parity-checklist.md."
next_step: "/sf-test --local shipglows_data/workflow/verification/windows-desktop-overlay-hotkeys-parity-checklist.md"
---

# Title

Windows Desktop Overlay And Hotkeys Parity

# Status

Reviewed and partially implemented chantier opened from Diane's 2026-05-30
platform decision. This spec is the first concrete slice of a broader parity
doctrine: WinGlows concepts should be cross-platform by default, with
Android-only, desktop-only, or web-limited status reserved for capabilities that
are genuinely constrained by an OS. The Windows work proves the pattern for
desktop: shared Flutter product/UI plus a native platform host. Android keeps
IME and Android overlay service; Windows now has a first desktop overlay host
slice with global hotkey, clipboard/text delivery primitives, and typed Flutter
bridge contracts. Windows runner/manual proof is still required before a public
Windows parity claim.

Platform priority after Android is fixed as Windows -> macOS -> Linux -> iOS ->
web. Platform-specific UX adaptations are allowed only when they improve the
result for that platform; if the result is equivalent, keep the user mental
model and interaction pattern stable.

# User Story

En tant qu'utilisateur Windows de WinGlows, je veux retrouver le concept d'overlay flottant, de raccourcis globaux et d'actions rapides de l'app Android, afin de corriger, dicter, transformer, coller et reutiliser mes textes dans n'importe quelle application desktop sans perdre la base commune Flutter.

Acteur principal: utilisateur Windows de WinGlows.

Acteurs secondaires: utilisateur Android existant, futurs utilisateurs iOS, macOS, Linux et web, utilisateur local-only, utilisateur connecte avec sync optionnelle.

Declencheurs principaux:

- L'utilisateur appuie sur un raccourci clavier global.
- L'utilisateur selectionne du texte dans une application Windows et appelle WinGlows.
- L'utilisateur veut dicter, reformuler, corriger, coller un snippet ou envoyer le resultat vers l'application active.
- L'application cible bloque l'injection ou ne fournit pas de selection lisible.

Resultat observable attendu: une surface WinGlows desktop apparait rapidement au-dessus du contexte de travail Windows, propose les memes actions produit que les surfaces Flutter communes, et livre le resultat par collage ou fallback clipboard sans promettre d'IME Windows.

# Minimal Behavior Contract

WinGlows doit viser une parite quasi complete entre plateformes: les workflows
produit, l'UI, les actions, les donnees locales/sync, l'historique, les
snippets, le dictionnaire, la dictee/enregistrement et les overlays/quick
actions doivent etre partages par defaut. Les exceptions doivent etre explicites
et justifiees par l'OS, pas par habitude Android-first. Sur Windows, l'overlay
n'est pas un port du service Android: c'est une fenetre desktop always-on-top,
declenchee par hotkey global, capable d'utiliser le clipboard, de recevoir une
selection quand c'est disponible, de lancer les actions WinGlows, puis de livrer
le texte final dans l'application active par collage/injection best-effort ou
clipboard fallback. L'edge case facile a rater est de confondre "base de code
commune Flutter" avec "meme mecanisme OS": Flutter partage l'UI et la logique,
mais les permissions, hotkeys, fenetres flottantes, focus et delivery restent
natifs par plateforme.

L'excellence produit prime sur une parite cosmetique: une experience adaptee
par plateforme est acceptable si elle donne un meilleur resultat utilisateur.
Si deux approches donnent un resultat equivalent, WinGlows doit eviter de
perturber l'utilisateur et conserver le modele mental commun.

# Success Behavior

- Given WinGlows est lance sur Windows, when l'utilisateur appuie sur le hotkey global configure, then l'overlay WinGlows apparait sans ouvrir une page marketing ni perdre le focus de travail plus que necessaire.
- Given du texte est selectionne dans l'application active, when l'overlay s'ouvre, then WinGlows peut recevoir ce texte par le meilleur chemin disponible ou proposer un fallback clipboard explicite.
- Given aucun texte selectionne n'est lisible, when l'overlay s'ouvre, then l'utilisateur peut dicter, coller ou saisir un texte source manuellement.
- Given l'utilisateur lance correction, reformulation, snippet, dictionnaire ou transformation, when l'action reussit, then le resultat peut etre copie au clipboard et livre a l'application active si le delivery est disponible.
- Given le delivery automatique est autorise par Windows et l'application cible, when un resultat est pret, then WinGlows tente de le livrer dans l'application active des la premiere version Windows au lieu de se limiter au copier manuel.
- Given l'application active bloque le collage/injection, when le resultat est pret, then WinGlows garde le texte visible et copie au clipboard avec un message recuperable.
- Given une adaptation Windows ameliorerait le resultat, when elle est comparee a l'UX commune, then elle peut etre retenue seulement si le benefice utilisateur est concret et documente.
- Given l'utilisateur change de raccourci, taille, opacite ou position, when il relance l'overlay, then les preferences locales sont conservees.
- Given l'utilisateur est local-only, when il utilise l'overlay Windows, then les actions locales et BYOK restent utilisables sans backend distant.
- Given l'utilisateur est connecte, when l'action cree historique, snippet ou clipboard item, then l'ecriture passe par les stores backend-agnostic existants.

# Error Behavior

- Si l'enregistrement du hotkey global echoue parce qu'il est deja reserve par Windows ou une autre app, Settings doit proposer un autre raccourci.
- Si l'overlay window ne peut pas etre creee en always-on-top, WinGlows doit revenir a une fenetre normale explicite et marquer l'overlay Windows comme degrade.
- Si le presse-papiers est indisponible, verrouille ou modifie par une autre app, WinGlows doit refuser proprement sans perdre le texte produit.
- Si l'application active ne reprend pas le focus apres delivery, WinGlows doit laisser le resultat copiable et ne pas boucler sur des tentatives invisibles.
- Si la session utilisateur change pendant une action overlay, les donnees compte doivent rester separees et la livraison finale doit rester locale.
- Aucun log Windows ne doit contenir texte selectionne, clipboard, transcription, audio ou secret BYOK.

# Problem

Les docs actuelles de WinGlows decrivent correctement l'IME comme Android-only,
mais elles classent encore trop de concepts comme Android-first ou hors scope
desktop. Cette formulation est trop restrictive pour la direction produit: les
utilisateurs attendront une parite quasi complete entre plateformes. L'overlay
est un concept WinGlows portable, tandis que l'implementation Android actuelle
n'est qu'un hote natif parmi d'autres. Windows doit etre le premier chantier
desktop pour prouver cette architecture: UI et logique communes en Flutter,
hotkeys/fenetre/focus/clipboard/delivery derriere un adaptateur Windows, puis
extension aux autres plateformes par hotes natifs equivalents ou limitations
documentees.

# Solution

Introduire un contrat de capacites partagees cote Flutter, en commencant par
`OverlayHost`, qui represente les operations produit communes: afficher,
masquer, recevoir un trigger, lire une entree, mettre a jour l'etat visuel,
livrer du texte et reporter les erreurs. Android l'implemente avec le service
overlay existant et l'IME reste separe. Windows l'implemente avec un hote
desktop natif: fenetre Flutter always-on-top, hotkeys globaux, clipboard, focus
active-window et delivery par paste/injection best-effort. La premiere tranche
Windows doit privilegier une parite fonctionnelle utilisable et testable:
hotkey -> overlay -> action -> clipboard/delivery. Les chantiers suivants
doivent appliquer le meme principe aux autres plateformes, pas redemarrer le
debat conceptuel.

La premiere tranche Windows doit essayer de livrer le flux complet: hotkey
global, fenetre overlay, input via selection/clipboard/manual, action WinGlows,
clipboard fallback et delivery automatique best-effort. Si une partie native est
bloquee par Windows ou l'application cible, l'implementation doit degrader
proprement et garder le texte recuperable, pas reduire l'objectif produit a un
MVP clipboard-only.

# Scope In

- Windows desktop comme premiere plateforme hors Android pour l'overlay produit.
- Parite quasi complete comme principe produit: les concepts WinGlows sont
  cross-platform par defaut, sauf exception OS documentee.
- Ordre de parite apres Windows: macOS, Linux, iOS, puis web.
- UI Flutter partagee pour panneau overlay, etats, actions, erreurs et preferences.
- Adaptateur Windows pour hotkeys globaux, show/hide overlay, fenetre always-on-top, focus, clipboard et delivery texte.
- Delivery automatique best-effort dans la premiere implementation Windows,
  avec clipboard fallback obligatoire.
- Preferences utilisateur: hotkey, position, taille, opacite, comportement clipboard/delivery.
- Actions communes: correction, reformulation, snippets, dictionnaire, historique clipboard, dictee/enregistrement si le runtime Windows le permet.
- Backend-agnostic stores pour historique, snippets, dictionnaire, transcriptions et clipboard.
- Tests Flutter pour le contrat commun et Settings; QA Windows manuelle pour hotkey/focus/delivery.

# Scope Out

- IME Windows. Le clavier systeme WinGlows reste Android-only.
- Port direct du code Kotlin Android vers Windows.
- Promesse d'injection universelle dans toutes les apps Windows.
- Capture silencieuse du clipboard ou surveillance globale de frappe.
- Implementation iOS/macOS/Linux/web dans ce chantier; ces plateformes auront
  leurs chantiers separes apres la preuve Windows, avec objectif de parite
  maximale et exceptions justifiees.
- Publication ou promesse marketing avant verification Windows.

# Constraints

- Flutter reste la base commune pour l'UI et la logique produit; l'OS-specific doit rester derriere une interface de plateforme.
- Les adaptations d'experience sont autorisees seulement si elles produisent un
  meilleur resultat utilisateur; si le resultat est equivalent, garder le
  comportement commun pour ne pas perturber l'utilisateur.
- Les plugins natifs Windows doivent etre maintenables, documentes, et limites aux capacites systeme necessaires.
- Toutes les actions sensibles doivent etre explicites: pas d'enregistrement micro, de capture selection/clipboard ou d'injection sans intention utilisateur.
- Clipboard fallback est obligatoire pour tout texte final.
- Le texte utilisateur, l'audio, les selections, les snippets sensibles et les secrets ne doivent pas etre logs.
- Les donnees produit passent par les stores backend-agnostic; Windows ne doit pas parler directement a Firebase/Supabase.
- Local checks autorises dans ce repo: `flutter analyze`, `flutter test`, tests cibles, et checks web si necessaires. Les builds natifs Windows doivent etre faits sur runner Windows.

# Dependencies

- Flutter Windows desktop enabled in the project scaffold.
- Existing shared Flutter feature surfaces under `lib/features/**`.
- Existing Android overlay spec as parity reference for behavior, not source code.
- Platform capability model in `lib/core/platform/**`.
- Future plugin or platform-channel layer for Windows native capabilities.
- CI or manual Windows runner for build and smoke proof.

# Invariants

- Une seule session voix active a la fois entre app, overlay Android, IME Android et overlay Windows.
- Windows ne montre jamais de promesse IME.
- L'overlay Windows ne capture pas le clipboard ou la selection en continu.
- Le resultat final reste recuperable meme si l'injection/paste echoue.
- Les erreurs natives Windows sont transformees en codes stables pour l'UI Flutter.
- Les plateformes non implementees affichent un etat clair au lieu de simuler un succes.

# Links & Consequences

- `docs/PLATFORM_BEHAVIOR.md`: doit distinguer concepts produit portables,
  exceptions OS justifiees, et hotes natifs par plateforme.
- `docs/OVERLAY_ANDROID.md`: doit rester le contrat Android, tout en pointant vers le contrat multi-plateforme pour le concept overlay.
- `docs/VERIFICATION.md`: doit ouvrir une matrice Windows overlay/hotkey au lieu de classer Windows comme hors scope global.
- `docs/technical/flutter-app.md`: doit documenter l'interface commune et les invariants de plateforme.
- `lib/core/platform/**`: devra gagner un contrat overlay commun et un adaptateur Windows.
- `windows/`: devra porter les hooks natifs ou plugin Windows retenus.
- `lib/features/settings/**`: devra exposer les preferences Windows sans afficher de controles Android IME.

# Documentation Coherence

Mettre a jour avant implementation:

- README: expliquer que Flutter partage l'app, mais que les hotes overlay sont natifs par OS.
- `docs/PLATFORM_BEHAVIOR.md`: matrice de parite Android/Windows/macOS/Linux/iOS/web et ordre de priorite.
- `docs/VERIFICATION.md`: preuve Windows attendue.
- `docs/technical/code-docs-map.md`: mapping `windows/**`.
- `docs/DECISIONS.md`: decision produit 2026-05-30.

# Edge Cases

- Hotkey deja reserve.
- Fenetre overlay creee mais cachee derriere une application fullscreen/admin.
- App cible lancee en elevation differente.
- Clipboard verrouille par une autre app.
- Focus perdu entre affichage overlay et delivery.
- Selection non lisible sans API d'accessibilite.
- Multi-monitor, DPI scaling, ecran externe, session RDP.
- Lancement au demarrage, app minimisee, app fermee.
- Logout/auth switch pendant traitement.
- BYOK absent, backend absent, ou mode local-only.

# Implementation Tasks

- [x] Tache 1 : Figer le contrat overlay multi-plateforme
  - Fichiers : `lib/core/platform/`, `docs/PLATFORM_BEHAVIOR.md`, `docs/technical/flutter-app.md`
  - Action : definir `OverlayHost`/capabilities, etats, triggers, delivery results et erreurs communes.
  - Validate with : tests unitaires Dart du contrat et des mappings de statut.

- [ ] Tache 2 : Creer la surface Flutter overlay partagee
  - Fichiers : `lib/features/voice/`, `lib/features/settings/`, eventuellement `lib/features/overlay/`
  - Action : extraire le panneau overlay et les actions communes pour reutilisation Android/Windows.
  - Validate with : widget tests desktop-sized, etats idle/recording/processing/result/error.

- [x] Tache 3 : Ajouter l'adaptateur Windows hotkeys
  - Fichiers : `windows/`, `lib/core/platform/`
  - Action : enregistrer/desenregistrer un hotkey global configurable et remonter les triggers a Flutter.
  - Validate with : build/smoke sur Windows runner; collision hotkey test manuel.

- [x] Tache 4 : Ajouter l'hote Windows always-on-top
  - Fichiers : `windows/`, `lib/core/platform/`
  - Action : afficher/masquer une fenetre overlay Flutter compacte, positionnee et persistante.
  - Validate with : QA Windows multi-monitor/DPI et comportement focus.

- [x] Tache 5 : Implementer clipboard et delivery Windows
  - Fichiers : `windows/`, `lib/core/platform/`, `lib/features/clipboard/`
  - Action : lire l'entree via selection/clipboard quand possible, copier le resultat, tenter delivery par paste/injection best-effort.
  - Validate with : Notepad, navigateur, Office/Google Docs si disponible, app cible qui bloque le paste.

- [ ] Tache 6 : Brancher actions WinGlows communes
  - Fichiers : `lib/features/voice/`, `lib/features/snippets/`, `lib/features/dictionary/`, `lib/features/clipboard/`
  - Action : correction, reformulation, snippet, dictionnaire, historique et transcription source `windows_overlay`.
  - Validate with : tests Flutter des stores et QA Windows action -> resultat -> delivery.

- [ ] Tache 7 : Settings et recovery Windows
  - Fichiers : `lib/features/settings/`
  - Action : preferences hotkey, position, taille, opacite, mode delivery, et messages recuperables.
  - Validate with : widget tests; Windows smoke.

- [x] Tache 8 : Verification et documentation de parite
  - Fichiers : `docs/VERIFICATION.md`, `README.md`, spec courante
  - Action : consigner le runner Windows, les apps testees, les limites, et les ecarts avec Android.
  - Validate with : `flutter analyze`, `flutter test`, Windows build/smoke sur runner compatible.

# Test Plan

- `flutter analyze`
- `flutter test test/windows_overlay_bridge_test.dart`
- `flutter test` before final ship if shipping this tranche.
- Tests unitaires Dart du contrat overlay commun.
- Widget tests de la surface overlay et Settings Windows.
- Windows runner:
  - `flutter build windows` ou equivalent CI.
  - Lancement app Windows.
  - Hotkey global.
  - Overlay always-on-top.
  - Clipboard input/output.
  - Delivery dans au moins Notepad, navigateur, et un champ qui refuse ou limite l'injection.
  - Multi-monitor/DPI.

# Rollout Plan

1. Documenter le contrat, les limites Windows et les decisions de parite.
2. Implementer le flux Windows complet en premiere vague: hotkey global,
   overlay window, input selection/clipboard/manual, actions WinGlows, clipboard
   fallback et delivery automatique best-effort.
3. Degrader proprement par capability flag si Windows ou l'application cible
   bloque une partie native, sans changer l'objectif produit.
4. Valider sur runner Windows avant toute promesse publique.
5. Utiliser ce pattern pour ouvrir ensuite macOS, Linux, iOS et web comme
   chantiers separes de parite.

# Risks

- Flutter partage l'UI, mais la fenetre always-on-top et les hotkeys restent dependants de Windows; un plugin mal choisi peut fragiliser le produit.
- L'injection texte desktop peut varier fortement selon app cible, elevation, focus et politique de securite.
- Le clipboard est un vecteur sensible; il faut eviter toute surveillance continue.
- Une promesse de "parite" trop large pourrait surestimer les capacites Windows par rapport a l'IME Android.
- Sans runner Windows, la preuve locale Linux ne suffit pas.

# Open Questions

- Quel raccourci global par defaut doit etre propose sans conflit probable avec Windows et les apps de productivite ?
- Doit-on viser une seule fenetre overlay compacte ou une mini palette + panneau detaille ?
- Quel niveau d'automatisation selection/paste reste acceptable par defaut sans surprendre l'utilisateur ni declencher de faux positifs securite ?

# Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-05-30 16:38:20 UTC | sf-build | GPT-5 Codex | Opened Windows desktop overlay/hotkeys parity chantier from Diane's platform decision and aligned docs direction. | Draft spec created; readiness and implementation still pending. | `/sf-ready shipglows_data/workflow/specs/windows-desktop-overlay-hotkeys-parity.md` |
| 2026-05-30 20:35:00 UTC | sf-build | GPT-5 Codex | Captured Diane's parity execution decisions: platform order, adaptation rule, and full first Windows wave. | Spec updated; Windows first wave now targets hotkey, overlay, clipboard fallback and automatic best-effort delivery together. | `/sf-ready shipglows_data/workflow/specs/windows-desktop-overlay-hotkeys-parity.md` |
| 2026-05-30 21:02:06 UTC | sf-build | GPT-5 Codex | Implemented first Windows desktop overlay host slice in Flutter bridge and Windows runner. | partial: local Dart checks pass; Windows runner/manual proof still required. | `/sf-verify shipglows_data/workflow/specs/windows-desktop-overlay-hotkeys-parity.md` |
| 2026-05-30 21:04:10 UTC | sf-build | GPT-5 Codex | Ran full local Flutter verification after Windows bridge implementation. | partial: `flutter analyze`, `flutter test`, metadata lint, and diff check pass; Windows native build/smoke remains pending. | `/sf-verify shipglows_data/workflow/specs/windows-desktop-overlay-hotkeys-parity.md` |
| 2026-05-30 21:32:04 UTC | sf-test | GPT-5 Codex | Created manual Windows QA checklist and recorded test status as not run. | not run: Diane will execute on a Windows machine. | `/sf-test --local shipglows_data/workflow/verification/windows-desktop-overlay-hotkeys-parity-checklist.md` |
| 2026-05-30 21:33:12 UTC | sf-ship | GPT-5 Codex | Shipped first Windows overlay host slice with pending manual Windows QA tracked. | shipped: local checks passed; Windows-native proof remains open. | `/sf-test --local shipglows_data/workflow/verification/windows-desktop-overlay-hotkeys-parity-checklist.md` |

# Current Chantier Flow

sf-spec: reviewed
sf-ready: accepted for first host slice inside sf-build
sf-start: partial implementation complete
sf-verify: local Flutter checks pass; Windows runner proof pending; manual checklist prepared
sf-end: pending
sf-ship: shipped for Windows QA
