---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-06-11"
created_at: "2026-06-11 10:58:00 UTC"
updated: "2026-06-12"
updated_at: "2026-06-12 03:06:00 UTC"
status: reviewed
source_skill: sf-build
source_model: "GPT-5 Codex"
scope: "custom-action-buttons-and-command-macros"
owner: "Diane"
confidence: high
user_story: "En tant qu'utilisatrice WinGlows, je veux personnaliser une barre d'action composée d'une ou plusieurs rangées de boutons, afin de lancer rapidement des actions intégrées, des snippets texte, des séquences clavier, des commandes presse-papiers, des commandes média ou des macros sans confondre bouton et snippet."
risk_level: "medium"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "WinGlows Flutter app"
  - "Snippets screen"
  - "Desktop overlay hosts"
  - "Android keyboard action expression model"
  - "Backend-agnostic stores"
depends_on:
  - artifact: "shipglows_data/workflow/specs/cross-surface-send-to-actions.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/workflow/specs/winglowz-settings-page-ux-remaster.md"
    artifact_version: "1.0.0"
    required_status: "ready"
supersedes: []
evidence:
  - "User request 2026-06-11: create custom buttons, not just custom shortcuts, with icon choice and command launching."
  - "Current app already stores Snippets separately and supports Android typed action expressions (`action:`, `keyevent:`, `modifier:`)."
  - "Current desktop overlay hosts can deliver text but do not yet expose typed key-sequence delivery."
next_step: "/104-sf-end shipglows_data/workflow/specs/custom-action-buttons-and-command-macros.md"
---

# Title

Custom Action Bar Buttons And Command Macros

## Status

Ready for a bounded V1 implementation. Product direction is clear: WinGlows
needs a customizable action bar, not only text snippets or gesture shortcuts.
This slice introduces persistent custom buttons with typed actions, row
placement, and a safe execution contract.

## User Story

En tant qu'utilisatrice WinGlows, je veux personnaliser une barre d'action
composée d'une ou plusieurs rangées de boutons, afin de lancer rapidement des
actions intégrées, des snippets texte, des séquences clavier, des commandes
presse-papiers, des commandes média ou des macros sans confondre bouton et
snippet.

## Minimal Behavior Contract

L'écran Snippets doit aussi exposer une barre d'action personnalisable. Chaque
bouton possède un titre, une icône, une rangée, un ordre, et une action typée.
La V1 accepte ces familles d'action: insertion texte/snippet, expression clavier
WinGlows, séquence clavier desktop, commande presse-papiers, commande média, et
macro stockée. Le modèle doit rester explicite: un snippet reste du contenu
texte utilisable par une action `insertText`, un bouton reste un conteneur
visuel exécutable. Les actions ne doivent jamais accepter une commande système
arbitraire ou un script shell libre. L'edge case critique est la promesse
cross-platform: quand une action n'est pas exécutable sur la plateforme
courante, l'UI doit le dire clairement au lieu de simuler un succès.

## Success Behavior

- Given l'utilisatrice ouvre Snippets, when elle bascule sur l'onglet boutons,
  then elle voit une prévisualisation de barre d'action organisée en rangées, la
  liste des boutons existants et un formulaire de création.
- Given elle crée un bouton texte, when elle l'exécute sur un host overlay
  desktop compatible, then WinGlows livre le texte vers l'app cible via le pont
  natif existant.
- Given elle crée un bouton macro clavier desktop avec une séquence du type
  `Ctrl+W` puis `N`, when elle l'exécute sur un host desktop compatible, then la
  séquence est envoyée proprement à l'application ciblée.
- Given elle crée un bouton action clavier WinGlows, when elle le consulte dans
  l'UI, then le contrat stocké reste compatible avec le langage d'expression
  Android existant et peut être réutilisé ailleurs sans ambiguïté.
- Given elle crée un bouton presse-papiers, when elle choisit copier/couper/coller
  sur desktop compatible, then WinGlows traduit cette action en séquence clavier
  bornée plutôt qu'en commande système libre.
- Given elle crée un bouton média ou macro, when l'hôte d'exécution direct n'est
  pas encore disponible, then WinGlows conserve l'action typée et affiche une
  limite d'exécution claire.
- Given un bouton n'est pas exécutable sur la plateforme courante, when elle
  appuie dessus, then l'app affiche un message clair sur la limite plutôt qu'un
  faux succès.
- Given l'utilisatrice édite ou supprime un bouton, when l'action aboutit, then
  la liste est rafraîchie sans redémarrer l'app.

## Error Behavior

- Nom vide, action vide ou type incomplet: la création est refusée avec un
  message récupérable.
- Macro desktop mal formée: la validation locale bloque l'enregistrement.
- Host natif indisponible ou non supporté: l'exécution retourne un état
  explicite et non destructif.
- Aucune donnée sensible, texte privé ou commande complète ne doit être loggée
  en diagnostic brut.

## Scope In

- Nouveau modèle `CustomActionButton` et actions typées.
- Modèle de layout de barre par rangée et ordre.
- Store backend-agnostic local/Firebase pour les boutons.
- Onglet ou segment UI dans l'écran Snippets pour lister, créer, éditer,
  supprimer, positionner en rangée, prévisualiser et lancer des boutons.
- Exécution desktop bornée pour:
  - texte
  - séquences clavier typées
  - commandes presse-papiers via raccourcis système bornés
- Réutilisation du langage d'expression clavier WinGlows côté modèle/UI.
- Tests Dart/widget et tests de parsing/bridge ciblés.
- Documentation technique Flutter mise à jour.

## Scope Out

- Commandes système arbitraires, shell, scripts, URLs externes, ou lancement de
  processus libres.
- Exécution Android native depuis l'écran Flutter hors capacités déjà exposées.
- Nouveau tab principal de navigation.
- Android build/package/device QA locale.

## Constraints

- Respecter `AGENTS.md`: checks locaux autorisés seulement `flutter analyze`,
  `flutter test` et tests ciblés.
- Rester cohérent avec l'architecture backend-agnostic des stores Flutter.
- Garder une séparation produit nette entre snippets texte, actions typées,
  boutons d'action, et layout de barre.
- Les hosts desktop restent best-effort; un échec de livraison ne doit pas
  corrompre les données du bouton.
- Pas de promesse de commande arbitraire cachée derrière un champ texte.

## Test Contract

- `flutter analyze`
- `flutter test test/custom_action_button_store_test.dart`
- `flutter test test/custom_action_buttons_screen_test.dart`
- `flutter test test/desktop_overlay_bridge_test.dart test/windows_overlay_bridge_test.dart`

## Implementation Tasks

- [x] Task 1: Ajouter les modèles domaine des boutons, actions typées et layout
  de barre.
- [x] Task 2: Ajouter les stores/providers local et Firebase.
- [x] Task 3: Ajouter le moteur d'exécution desktop borné.
- [x] Task 4: Intégrer l'UI dans Snippets.
- [x] Task 5: Ajouter les tests et mettre à jour la doc technique.

## Acceptance Criteria

- [x] AC 1: L'écran Snippets expose une vue dédiée aux boutons personnalisés et
  une prévisualisation de barre en rangées.
- [x] AC 2: Un bouton peut stocker un titre, une icône, une rangée, un ordre et
  une action typée.
- [x] AC 3: Les boutons texte et séquence clavier desktop peuvent être exécutés
  depuis l'UI sur host desktop supporté.
- [x] AC 4: Les boutons action clavier WinGlows sont stockés comme actions
  typées et validées.
- [x] AC 5: Les actions presse-papiers intégrées sont stockées comme actions
  typées et exécutées par séquence clavier bornée sur desktop compatible.
- [x] AC 6: Les actions média et macro non encore exécutables affichent une
  limite claire sans perdre le contrat typé.
- [x] AC 7: Les plateformes non supportées affichent une limite claire.
- [x] AC 8: La création, l'édition et la suppression sont couvertes par tests.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-06-11 10:58:00 UTC | sf-build | GPT-5 Codex | Created ready spec for custom action buttons and command macros. | Ready for bounded implementation. | `/sf-start shipglows_data/workflow/specs/custom-action-buttons-and-command-macros.md` |
| 2026-06-11 12:10:00 UTC | sf-build | GPT-5 Codex | Implemented custom action button models, stores, snippets-library UI, bounded desktop sequence delivery, tests, and docs. | Local verification passed; closure/ship still pending explicit commit flow. | `/104-sf-end shipglows_data/workflow/specs/custom-action-buttons-and-command-macros.md` |
| 2026-06-11 14:52:02 UTC | 001-sf-build | GPT-5 Codex | Corrected product model from snippet-like buttons to action-bar buttons with typed action catalog, row layout, clipboard commands, tests, and docs. | Local verification passed; closure/ship still pending. | `/104-sf-end shipglows_data/workflow/specs/custom-action-buttons-and-command-macros.md` |
| 2026-06-12 01:02:21 UTC | 001-sf-build | GPT-5 Codex | Finalized the run trace alignment for the custom action buttons feature and aligned UI selector keys after test execution model change. | Implemented; local validation remains green (analyze + targeted widget tests). | `/104-sf-end shipglows_data/workflow/specs/custom-action-buttons-and-command-macros.md` |
| 2026-06-12 03:05:00 UTC | 104-sf-end | GPT-5 Codex | Completed end-of-task wrap-up and ready for ship with current run evidence and pending proof path noted. | Closed (ship pending). | `/005-sf-ship shipglows_data/workflow/specs/custom-action-buttons-and-command-macros.md` |
| 2026-06-12 03:06:00 UTC | 005-sf-ship | GPT-5 Codex | Closed the tracking loop and committed the 104-sf-end spec update for the custom action button feature. | Shipped (docs/trace layer). | `none` |
| 2026-06-12 04:10:00 UTC | 007-sf-content | GPT-5 Codex | Enriched user-facing docs for custom action buttons with usage examples, `Ctrl+W, N` action-sequence guidance, explicit snippet-vs-button model explanation, and verification checklist updates. | Implemented (documentation pass; runtime behavior unchanged). | `none` |

## Current Chantier Flow

sf-spec: ready
sf-ready: accepted inside sf-build
sf-start: implemented
sf-verify: local checks + docs checks pass
sf-end: closed
sf-ship: shipped
