---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "winglowz_app"
created: "2026-05-19"
created_at: "2026-05-19 20:56:40 UTC"
updated: "2026-05-25"
updated_at: "2026-05-25 14:55:01 UTC"
status: ready
source_skill: sf-spec
source_model: "GPT-5.5 Codex"
scope: "android-ime-keyboard-gestures"
owner: "Diane"
user_story: "En tant qu'utilisatrice du clavier WinGlows sur Android, je veux pouvoir assigner des actions aux swipes haut, bas, gauche et droite en plus des corners diagonaux, afin que les actions directionnelles comme les fleches se declenchent par un geste qui correspond naturellement au symbole affiche."
risk_level: "high"
confidence: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Android native IME"
  - "Kotlin keyboard gesture classifier"
  - "Kotlin keyboard shortcut resolver"
  - "Kotlin keyboard rendering and touch dispatch"
  - "KeyboardStateStore SharedPreferences"
  - "Android keyboard MethodChannel"
  - "Flutter keyboard domain models"
  - "Flutter keyboard preview"
  - "Flutter keyboard gesture/corner editor"
  - "Flutter Settings"
  - "Physical-device Android QA"
depends_on:
  - artifact: "shipglows_data/workflow/specs/proprietary-swipe-corner-android-keyboard.md"
    artifact_version: "1.0.0"
    required_status: "ready"
  - artifact: "shipglows_data/workflow/specs/configurable-key-corner-swipes.md"
    artifact_version: "0.1.0"
    required_status: "ready"
  - artifact: "shipglows_data/workflow/specs/keyboard-swipe-corner-settings-editor.md"
    artifact_version: "0.1.0"
    required_status: "ready"
  - artifact: "shipglows_data/workflow/specs/keyboard-stable-grid-touch-geometry.md"
    artifact_version: "0.1.0"
    required_status: "implemented-pending-android-qa"
supersedes: []
evidence:
  - "User request 2026-05-19: flèches mises en corner sur H are cognitively confusing because an up arrow should be reached by an upward swipe, not a top-right diagonal."
  - "User request 2026-05-19: support optional actions for swipe up, down, left and right in addition to existing swipe corners, without requiring all gestures on one key."
  - "Local code: KeyboardGestureClassifier.kt only returns PrimaryTap, TopLeft, TopRight, BottomLeft, BottomRight or Canceled."
  - "Local code: KeyboardCornerShortcuts.kt models only four corner slots and maps GestureSelection to KeyboardCornerSlot."
  - "Local code: WinGlowzKeyboardView.kt dispatches any non-primary selection through key.cornerAssignments.forSelection(selection)."
  - "Local code: Flutter keyboard_models.dart mirrors KeyboardCornerSlot with only topLeft/topRight/bottomLeft/bottomRight."
  - "Explorer subagent 2026-05-19: adding cardinal directions directly to KeyboardCornerSlot would blur the architecture; the spec should generalize to gesture slots while preserving JSON compatibility."
  - "Audit 2026-05-25: current Kotlin code appears non-compilable around WinGlowzKeyboardView.retainPressedHighlight due to an extra brace after an early return."
  - "Audit 2026-05-25: KeyboardCornerShortcutResolver.resolve still empties all assignments when cornerModeEnabled is false, so the later directional-swipe classification patch cannot reliably restore S/Z swipes."
  - "Audit 2026-05-25: temporary WinGlowzCornerDebug logs for letter-s and letter-z remain in the dispatch path."
  - "User clarification 2026-05-25: AZERTY S/Z gestures are swipes left/right/up/down, not corners, and should not be reasoned about through corner-only settings."
next_step: "/sf-verify keyboard-directional-gesture-shortcuts --android-ci-device-proof"
---

## Title
Keyboard Directional Gesture Shortcuts

## Status
Reopened on 2026-05-25 as a repair spec after code audit. The original 2026-05-19 implementation intent remains correct: default arrow shortcuts use layout-aware cardinal slots on `W`/`Z` for up/down and `S` for left/right, while diagonals remain available for accents and secondary shortcuts. The current code state does not satisfy the contract because directional assignments are still coupled to corner-mode resolution, the previous local patch happened too late in the dispatch chain, temporary debug logs remain, and `WinGlowzKeyboardView.kt` appears syntactically broken around `retainPressedHighlight()`.

Readiness gate 2026-05-25: validated for repair execution. The current repair target is clear, the implementation task list is unambiguous, and only Tasks 11-15 are executable on the next `/sf-start`.

Spec clarification 2026-05-25: this reopened chantier is now scoped as a repair-only pass. For the next `/sf-start`, only Tasks 11-15 are executable. Tasks 1-10 are retained as historical implementation reference from the original 2026-05-19 gesture-slot chantier and must not be reimplemented unless a separate broader gesture/editor chantier is explicitly reopened.

Verification gate 2026-05-25: local verification is partial. The repair code and allowed local checks pass, but Android-native proof is still required through GitHub Actions/Blacksmith and Diane physical-device QA before the chantier can be marked fully verified.

## User Story
En tant qu'utilisatrice du clavier WinGlows sur Android, je veux pouvoir assigner des actions aux swipes haut, bas, gauche et droite en plus des corners diagonaux, afin que les actions directionnelles comme les fleches se declenchent par un geste qui correspond naturellement au symbole affiche.

Acteur principal: utilisateur Android de WinGlows qui utilise WinGlows keyboard comme methode de saisie systeme.

Declencheur: l'utilisateur active les gestures clavier, pose le doigt sur une touche compatible, glisse vers une direction configuree, puis relache.

Resultat observable: un swipe vers `↑`, `↓`, `←` ou `→` declenche l'action correspondante sans demander une diagonale; les anciens swipes de coin continuent a fonctionner pour les accents, ponctuations et raccourcis deja configures.

## Minimal Behavior Contract
Quand le mode gestures clavier est actif, WinGlows accepte des raccourcis par touche sur huit directions possibles: haut, bas, gauche, droite, haut-gauche, haut-droite, bas-gauche et bas-droite. Une touche peut techniquement avoir un melange de directions cardinales et diagonales, mais les presets et l'UI doivent favoriser une intention lisible: directions cardinales pour navigation/fleches, diagonales pour accents et raccourcis secondaires. Au relachement, le clavier classe le geste dans une seule direction, execute au plus une action via le moteur `KeyboardKeyValue`, ou annule proprement si le geste est trop court, ambigu, revenu au centre, indisponible ou interdit par la politique de champ. L'edge case facile a rater est la coexistence avec les gestes deja proteges: la barre espace garde son slider de curseur, les rows scrollables gardent leur scroll horizontal, les panels gardent leur scroll vertical, les longs press gardent leur priorite, et les anciennes configs de corners restent importables et executables.

## Success Behavior
- Given une touche `W` en QWERTY ou `Z` en AZERTY configuree avec `↑`/`↓`, when l'utilisateur swipe vers le haut ou le bas, then l'action `NavigateLineUp`/`NavigateLineDown` est executee sans devoir viser une diagonale.
- Given la touche `S` configuree avec `←`/`→`, when l'utilisateur swipe vers la gauche ou la droite, then l'action `NavigateCharLeft`/`NavigateCharRight` est executee.
- Given une touche de lettre garde des accents en diagonales, when l'utilisateur swipe haut-gauche ou haut-droite, then les accents existants restent disponibles avec le meme comportement qu'avant.
- Given une touche a la fois des cardinaux et des diagonales, when le geste est nettement horizontal, vertical ou diagonal, then une seule action deterministe est declenchee.
- Given le geste est trop court, revient au centre apres avoir depasse le seuil, ou tombe dans une zone d'ambiguite, then aucun caractere/action inattendu n'est emis et le feedback d'annulation existant est utilise.
- Given un utilisateur a une config JSON actuelle avec `slot: topLeft`, when l'app est mise a jour, then cette config continue a charger et a s'exporter sans perdre le raccourci.
- Given l'editeur Flutter affiche une touche avec des actions cardinales, when l'utilisateur regarde la preview, then les labels sont places sur les bords haut/bas/gauche/droite et ne ressemblent pas a des corners.
- Given `cornerModeEnabled` est actif aujourd'hui, when l'UI migre vers un libelle plus general, then le comportement utilisateur reste compatible et le setting garde la valeur existante.

## Error Behavior
- Si un slot directionnel inconnu est lu depuis JSON, le runtime ignore uniquement ce raccourci, conserve les autres, et l'editeur signale l'entree invalide sans crash.
- Si une ancienne config de corners est absente, vide, corrompue ou trop grande, le fallback reste le preset par defaut et la saisie primaire continue.
- Si une direction est configuree vers une action sensible interdite en private field, le resolver applique la meme politique que les corners actuels: pas d'execution, feedback discret, aucune fuite de contenu.
- Si un swipe cardinal commence sur la barre espace et ressemble au slider horizontal de curseur, le slider gagne; un raccourci directionnel sur espace ne doit pas voler ce geste dans cette phase.
- Si un swipe commence sur une row scrollable ou un panel vertical et depasse les seuils de scroll, le scroll gagne; aucun item ou raccourci ne doit partir accidentellement.
- Si le classifieur ne peut pas distinguer proprement une diagonale d'un cardinal, il doit annuler ou revenir au tap primaire selon la regle existante, jamais choisir un slot arbitraire.
- Si la preview Flutter peut simuler un texte mais pas une action native, elle doit indiquer que l'action est Android-only au lieu d'afficher un faux succes.
- Ce qui ne doit jamais arriver: double emission tap+gesture pour le meme toucher, crash IME sur config migree, perte silencieuse des anciens corners, contournement du mode prive, ou logs contenant texte tape, snippets ou clipboard.

## Problem
Les raccourcis de gestes WinGlows sont actuellement modeles comme des corners. C'est adapte pour des accents ou symboles secondaires, mais pas pour des actions directionnelles. Quand une fleche `↑` est placee dans un corner, l'utilisateur doit faire une diagonale pour declencher une action qui annonce une direction droite. Cette contradiction rend la navigation difficile a apprendre et donne une impression que le clavier ne respecte pas son propre langage visuel.

Audit repair 2026-05-25: le modele a ete partiellement generalise, mais l'implementation actuelle garde une dependance de resolution a `cornerModeEnabled` dans `KeyboardCornerShortcutResolver.resolve()`. Comme `WinGlowzKeyboardView.effectiveGestureSelection()` commence par `key.cornerAssignments.isEmpty()`, un swipe cardinal valide peut redevenir un tap primaire avant que la classification directionnelle soit utile. Le code contient aussi des logs de diagnostic temporaires sur `letter-s`/`letter-z` et une anomalie d'accolade dans `retainPressedHighlight()` qui doit etre corrigee avant toute validation.

## Solution
Generaliser le modele de corners en modele de gesture slots a huit directions, tout en gardant la compatibilite des anciens noms et configs. Le classifieur doit produire une selection cardinale ou diagonale selon l'angle et les seuils. Le resolver, le rendu natif, la preview Flutter, l'editeur et le bridge doivent utiliser un contrat commun capable d'afficher et de persister les quatre directions cardinales en plus des quatre diagonales.

Pour la reparation actuelle, le fix doit etre place au bon niveau: le resolver doit pouvoir produire les assignments cardinaux des touches texte `letter-z` et `letter-s` sans passer par une condition de corner-only. La vue native doit ensuite appliquer une politique explicite: swipes cardinaux de touches texte comme gestes directionnels, diagonales comme corners, special keys derriere leur gate dediee. Un slot cardinal configure et autorise ne doit jamais afficher `Gesture shortcut unavailable` a cause d'une assignation supprimee en amont.

## Scope In
- Ajouter un modele conceptuel `KeyboardGestureSlot` cote Kotlin avec `up`, `down`, `left`, `right`, `topLeft`, `topRight`, `bottomLeft`, `bottomRight`.
- Garder les anciens noms `topLeft`, `topRight`, `bottomLeft`, `bottomRight` dans le format JSON et dans l'import/export.
- Renommer ou envelopper progressivement les concepts `Corner` en `Gesture` la ou le code manipule des slots generiques, sans casser les APIs publiques existantes.
- Etendre `GestureSelection` et `KeyboardGestureClassifier` aux quatre directions cardinales avec seuils, angle sectors et annulation des gestes ambigus.
- Generaliser `KeyboardCornerAssignments` vers une structure capable de retourner une action pour n'importe quel gesture slot.
- Rendre les labels cardinaux dans `WinGlowzKeyboardView.kt` sur les bords haut, bas, gauche et droite de la touche.
- Mettre a jour la preview Flutter pour afficher les cardinaux comme des labels de bord, pas comme des labels de coin.
- Adapter l'editeur Flutter pour choisir un slot parmi les huit directions et pour presenter une intention claire: `Directions` et `Corners`.
- Ajouter un preset ou une config recommandee pour les fleches en cardinal uniquement: `↑`/`↓` sur la touche physique `W` en QWERTY ou `Z` en AZERTY, et `←`/`→` sur `S`.
- Preserver les policies existantes: private field, special key gating, snippets/clipboard, actions Android-only, labels courts, validation JSON.
- Mettre a jour les tests Kotlin et Flutter ciblant classifier, resolver, import/export, preview et editor.
- Mettre a jour les docs comportementales du clavier et les notes de verification Android.
- Reparation 2026-05-25: corriger l'accolade de `retainPressedHighlight()` dans `WinGlowzKeyboardView.kt` avant toute autre validation.
- Reparation 2026-05-25: supprimer les logs temporaires `WinGlowzCornerDebug` ajoutes pour `letter-s` et `letter-z`.
- Reparation 2026-05-25: decoupler la resolution des swipes cardinaux de touches texte du gating corner-only dans `KeyboardCornerShortcutResolver.resolve()`.
- Reparation 2026-05-25: verifier explicitement le flux AZERTY `letter-z` up/down et `letter-s` left/right, avec `cornerModeEnabled` et `specialKeyCornersEnabled` dans leurs combinaisons pertinentes.

## Scope Out
- Glide typing.
- Gestes dessines libres depuis espace; ils restent un systeme distinct.
- Gesture per-app/per-domain.
- Refonte complete de l'editeur de corners au-dela des changements necessaires pour selectionner et afficher huit slots.
- Cloud sync multi-device des mappings.
- Changement de la grille tactile ou de l'animation de barre d'action deja couverts par d'autres specs.
- Build APK local, Gradle, install Android ou `flutter run -d android` sur cette VM.
- Refonte complete des preferences utilisateur de gestures; cette reparation peut clarifier wording/gating localement, mais ne doit pas lancer une migration large de settings sans spec dediee.

## Constraints
- Respecter les guardrails locaux: seuls `flutter analyze`, `flutter test` et tests Flutter cibles sont autorises localement; Android compile/package/IME validation passe par GitHub Actions/Blacksmith et QA physique Diane.
- Le clavier natif Kotlin reste source d'autorite pour classer, valider et executer les gestures productifs.
- Les anciens presets et overrides de corners ne doivent pas etre perdus ni invalides par la migration.
- Les actions directionnelles doivent utiliser `KeyboardKeyValue`, `KeyboardKeyValueParser` et le dispatcher existant; ne pas creer un deuxieme langage d'actions.
- Les gestes reserves ont priorite: long press, repeat, space slider, horizontal row scroll et vertical panel scroll.
- Une interaction tactile produit au plus un evenement productif.
- Les nouveaux labels ne doivent pas masquer le label primaire de la touche ni rendre la preview illisible sur mobile.
- `fresh-docs not needed`: le changement depend du code local Kotlin/Dart et des APIs Android deja utilisees; aucune nouvelle API externe, SDK, auth, service ou integration n'est introduite.
- Les swipes cardinaux sur touches texte ne doivent pas dependre de `specialKeyCornersEnabled`; ce flag reste reserve aux touches non texte/speciales.
- Si un toggle global de gestures continue d'exister, son role doit etre explicite dans le code et les tests: il ne peut pas etre appele "corner" tout en bloquant silencieusement des swipes directionnels.

## Dependencies
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardGestureClassifier.kt`: classifier et enum `GestureSelection`.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardCornerShortcuts.kt`: slots, shortcuts, assignments, presets, validation, JSON.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardLayoutModels.kt`: actions de navigation et injection des assignments dans les key specs.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`: touch lifecycle, arbitration, rendering labels, dispatch.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`: persistence `corner_config` et limites JSON.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt`: MethodChannel get/set/reset config.
- `lib/core/platform/android_keyboard_bridge.dart`: bridge Flutter pour config et preferences.
- `lib/features/keyboard/domain/keyboard_models.dart`: miroir Dart des slots, ids/noms de presets, config et overrides explicites; pas de tables fonctionnelles de presets.
- `lib/features/keyboard/presentation/keyboard_corner_shortcuts_screen.dart`: editeur de shortcuts et overrides.
- `lib/features/keyboard/presentation/keyboard_preview_screen.dart` et `keyboard_preview_widgets.dart`: rendu preview leger des overrides explicites, sans simulation des presets natifs.
- `lib/features/settings/presentation/settings_screen.dart` et `settings_screen_sections.dart`: libelles, acces settings et toggles.
- Tests existants: `KeyboardGestureClassifierTest.kt`, `KeyboardCornerShortcutsTest.kt`, `keyboard_corner_shortcuts_screen_test.dart`, `widget_test.dart`.
- Audit repair 2026-05-25: `WinGlowzKeyboardView.kt` contient le correctif partiel actuel dans `effectiveGestureSelection()` mais le vrai point de couplage reste `KeyboardCornerShortcutResolver.resolve()`.

## Invariants
- Les quatre corners existants gardent leur semantique diagonale.
- Les quatre directions cardinales sont distinctes des corners, visuellement et techniquement.
- Une config legacy v1 avec `slot` corner reste valide.
- Pour les overrides explicites, le runtime natif et l'UI Flutter resolvent le meme slot; pour les presets par defaut, le runtime Kotlin natif reste seul source de verite.
- Un geste ambigu n'est jamais converti en action arbitraire.
- Les raccourcis sensibles restent bloques dans les contexts prives.
- Les gestures directionnels ne remplacent pas le mode Navigation; ils offrent des raccourcis optionnels sur certaines touches.
- Le mode produit par defaut ne doit pas encourager huit actions sur toutes les touches.
- Les assignations directionnelles par defaut pour `letter-z` et `letter-s` restent presentes dans le layout AZERTY normal tant que le preset Smart French/Punctuation actif les prevoit.
- Aucun code de debug temporaire ne doit rester dans le chemin chaud de dispatch clavier une fois le diagnostic termine.

## Links & Consequences
- Le nom utilisateur `Swipe-corner mode` devient trop etroit. L'UI devrait migrer vers `Swipe gestures` ou `Gesture shortcuts`, tout en gardant la cle de preference existante si cela reduit le risque de migration.
- Les specs `configurable-key-corner-swipes.md` et `keyboard-swipe-corner-settings-editor.md` restent valides mais deviennent des bases legacy: leurs concepts de `corner` doivent etre traites comme un sous-ensemble des gesture slots.
- Le preset de fleches doit etre directionnel, pas diagonal; le mapping layout-aware `W`/`Z` + `S` est le cas principal a valider physiquement.
- Les docs publiques ou in-app qui disent "quatre coins" doivent etre nuancees: corners pour diagonales, directions pour navigation.
- Le debug touch overlay doit afficher la direction classifiee avec des noms lisibles (`up`, `right`, `topRight`, etc.).
- Le message `Gesture shortcut unavailable` ne doit signaler qu'une action vraiment absente, invalide ou refusee; il ne doit pas masquer un bug de resolution d'assignments.

## Documentation Coherence
- Mettre a jour `docs/PLATFORM_BEHAVIOR.md` pour decrire les gesture shortcuts a huit directions et le cas des fleches.
- Mettre a jour `docs/technical/android-native.md` avec la separation legacy corners / gesture slots.
- Mettre a jour `shipglows_data/technical/code-docs-map.md` si les fichiers d'architecture gesture changent de responsabilite.
- Mettre a jour les textes Flutter Settings qui parlent seulement de `Swipe-corner mode`.
- Mettre a jour ou ajouter une matrice QA dans docs de verification si un fichier de verification clavier existe dans le repo.
- Pour la reparation 2026-05-25, une note de changelog interne suffit si seul le runtime natif change; mettre a jour les docs de comportement uniquement si le libelle ou la portee du toggle gestures change.

## Edge Cases
- Geste tres horizontal mais legerement montant: classer `left/right` si l'angle reste dans le secteur cardinal, pas `topLeft/topRight`.
- Geste tres diagonal mais pas assez vertical ou horizontal: annuler si aucun secteur clair n'est atteint.
- Retour au centre apres depassement du seuil: annuler comme aujourd'hui.
- Touche avec label primaire long ou large: les labels haut/bas/gauche/droite doivent rester lisibles ou etre compactes.
- Touche speciale avec directions configurees mais `specialKeyCornersEnabled` desactive: ne pas executer tant que la politique ne l'autorise pas, ou renommer cette politique pour couvrir tous les gestures speciaux.
- Row scrollable: ne pas lancer un gesture slot sur une action-row pendant un scroll.
- Space: conserver le slider horizontal; ne pas ajouter de direction productive sur espace dans cette phase sauf si une future spec tranche explicitement la priorite.
- Import JSON venant d'une version future avec slot inconnu: ignorer proprement.
- Flutter web preview: simuler seulement les actions sans effets natifs; afficher Android-only pour le reste.
- AZERTY normal mode: `letter-z` possede `up/down`, `letter-s` possede `left/right`; les autres directions sur ces touches ne doivent pas afficher un succes trompeur.
- Corner toggle off / special-key toggle off: les swipes cardinaux de touches texte doivent suivre la decision explicite du contrat de gestures, pas heriter d'un test nomme `allowsCornerGesture`.
- Patch partiel: modifier seulement `effectiveGestureSelection()` ne suffit pas si `cornerAssignments` a deja ete vide par le resolver.

## Implementation Tasks
Current repair scope for the next `/sf-start`: execute only Tasks 11-15.

Historical reference only: Tasks 1-10 describe the original 2026-05-19 directional gesture implementation contract. They are kept for context, invariants and regression awareness, but they are not part of the current repair execution path.

- [ ] Tache 1 : Introduire le modele de gesture slots Kotlin avec compatibilite corners
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardCornerShortcuts.kt`
  - Action : Ajouter un enum ou type `KeyboardGestureSlot` couvrant les huit directions, conserver les wire names legacy des corners, et fournir des helpers de migration depuis `KeyboardCornerSlot`.
  - User story link : permet de representer `↑`, `↓`, `←`, `→` sans les forcer dans des coins.
  - Depends on : None
  - Validate with : tests unitaires de parsing wire names legacy et nouveaux slots.
  - Notes : Eviter une rupture brutale de noms publics; une couche alias est acceptable.

- [ ] Tache 2 : Etendre le classifier aux directions cardinales
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardGestureClassifier.kt`
  - Action : Ajouter `Up`, `Down`, `Left`, `Right` a `GestureSelection`, classifier par seuil + secteur angulaire, et garder `Canceled`/`PrimaryTap`.
  - User story link : transforme un swipe vers le haut en selection `up`.
  - Depends on : Tache 1
  - Validate with : `KeyboardGestureClassifierTest.kt` couvrant tap, cancel, 4 cardinaux, 4 diagonales et ambigus.
  - Notes : Les seuils doivent eviter de voler les gestures scroll/slider deja arbitres dans `WinGlowzKeyboardView.kt`.

- [ ] Tache 3 : Generaliser assignments/resolver/runtime dispatch
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardCornerShortcuts.kt`
  - Action : Remplacer ou envelopper `KeyboardCornerAssignments` par des assignments de gesture slots, et faire resoudre presets + overrides pour les huit directions.
  - User story link : permet a une touche d'avoir des actions cardinales et diagonales selon le besoin.
  - Depends on : Taches 1-2
  - Validate with : `KeyboardCornerShortcutsTest.kt` pour legacy corners, overrides cardinaux, private policy et special keys.
  - Notes : Le nom de fichier peut rester temporairement `KeyboardCornerShortcuts.kt` si le rename augmente le risque; le modele interne doit etre plus general.

- [ ] Tache 4 : Brancher le dispatch natif et les labels de bords
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action : Adapter `effectiveGestureSelection`, `keyValueForSelection`, `dispatch`, `renderCornerGlyphs` et le debug overlay pour utiliser les huit slots et dessiner les cardinaux sur les bords.
  - User story link : rend le geste directionnel visible et productif dans le clavier reel.
  - Depends on : Tache 3
  - Validate with : `flutter analyze` localement puis Android CI/Blacksmith pour compilation Kotlin.
  - Notes : Preserver priorites long press, repeat, space slider, horizontal row scroll et vertical panel scroll.

- [ ] Tache 5 : Ajouter le preset directionnel des fleches
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardCornerShortcuts.kt`
  - Action : Ajouter une configuration/preset interne pour `letter-w`/`letter-z` en up/down selon le layout actif et `letter-s` en left/right, sans utiliser les diagonales.
  - User story link : corrige le cas concret des fleches placees en diagonales.
  - Depends on : Tache 4
  - Validate with : test resolver + QA physique sur champs texte.
  - Notes : Verifier si le preset doit etre actif par defaut ou propose comme preset selectionnable avant implementation; si ce choix change l'experience par defaut, demander validation Diane.

- [ ] Tache 6 : Adapter le contrat Dart et le bridge
  - Fichier : `lib/features/keyboard/domain/keyboard_models.dart`
  - Action : Ajouter le miroir Dart des huit gesture slots, garder import/export legacy, et limiter les catalogues/presets Flutter aux ids/noms DTO et a la preview des overrides explicites.
  - User story link : permet Settings et preview de manipuler les memes directions que le runtime.
  - Depends on : Tache 1
  - Validate with : tests Flutter existants + tests model ciblant fromMap/toMap.
  - Notes : `android_keyboard_bridge.dart` peut rester stable si le payload reste compatible; sinon documenter version config.

- [ ] Tache 7 : Adapter l'editeur Flutter
  - Fichier : `lib/features/keyboard/presentation/keyboard_corner_shortcuts_screen.dart`
  - Action : Presenter les slots en deux groupes `Directions` et `Corners`, permettre choix de `up/down/left/right`, afficher warnings private/native/special-key pour tous les slots, et adapter import/export/reset.
  - User story link : l'utilisateur peut configurer un swipe haut pour une fleche haut sans expression technique supplementaire.
  - Depends on : Tache 6
  - Validate with : `test/keyboard_corner_shortcuts_screen_test.dart`.
  - Notes : Le titre de l'ecran peut devenir `Gesture shortcuts`; garder les anciens termes dans les textes de compatibilite si utile.

- [ ] Tache 8 : Adapter la preview Flutter
  - Fichier : `lib/features/keyboard/presentation/keyboard_preview_widgets.dart`
  - Action : Dessiner les labels cardinaux sur les bords des touches, maintenir les labels diagonaux dans les coins, et eviter les chevauchements mobile/desktop.
  - User story link : rend visible la correspondance entre fleche et geste.
  - Depends on : Tache 6
  - Validate with : tests widget/snapshots existants si disponibles, plus verification manuelle web.
  - Notes : `keyboard_preview_screen.dart` doit simuler au moins les gestures texte et signaler Android-only pour les actions natives.

- [ ] Tache 9 : Mettre a jour settings, docs et wording
  - Fichiers : `lib/features/settings/presentation/settings_screen_sections.dart`, `docs/PLATFORM_BEHAVIOR.md`, `docs/technical/android-native.md`, `shipglows_data/technical/code-docs-map.md`
  - Action : Renommer les libelles utilisateur trop limites a `corner`, expliquer directions + corners, et documenter les limites QA Android.
  - User story link : evite de promettre seulement des diagonales alors que le produit accepte des directions.
  - Depends on : Taches 4, 7, 8
  - Validate with : `flutter analyze` et revue docs.
  - Notes : Ne pas changer les cles de preferences sans migration explicite.

- [ ] Tache 10 : Validation et QA
  - Fichiers : `android/app/src/test/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardGestureClassifierTest.kt`, `android/app/src/test/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardCornerShortcutsTest.kt`, `test/keyboard_corner_shortcuts_screen_test.dart`
  - Action : Ajouter couverture tests pour classifier, resolver, JSON legacy/nouveau, preview/editor et politiques.
  - User story link : prouve que les directions ne cassent ni les corners ni les gestures reserves.
  - Depends on : Taches 1-9
  - Validate with : `flutter analyze`, `flutter test` ou tests Flutter cibles autorises; Android compile/package via Blacksmith/GitHub Actions seulement.
  - Notes : Diane doit valider physiquement le ressenti sur appareil Android.

Actionable repair tasks for the next `/sf-start`:

- [ ] Tache 11 : Restaurer un etat compilable de la vue clavier native
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action : Corriger l'accolade de trop dans `retainPressedHighlight()` et verifier que le bloc `durationMs == 0` se ferme correctement.
  - User story link : aucune correction gesture n'est livrable si le clavier natif ne compile pas.
  - Depends on : None
  - Validate with : `flutter analyze`; Android Kotlin/native compile via Blacksmith/GitHub Actions seulement si disponible.
  - Notes : Ne pas melanger cette correction avec des refactors de rendu.

- [ ] Tache 12 : Retirer le diagnostic temporaire S/Z du chemin de dispatch
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action : Supprimer `tracingCornerDebug` et les `Log.d("WinGlowzCornerDebug", ...)` ajoutes pour `letter-s` et `letter-z`.
  - User story link : evite de garder du bruit debug dans un IME qui traite des interactions sensibles.
  - Depends on : Tache 11
  - Validate with : recherche locale `rg "WinGlowzCornerDebug" android/app/src/main/kotlin`.
  - Notes : Le debug overlay existant reste autorise s'il ne loggue pas de texte utilisateur.

- [ ] Tache 13 : Deplacer le decouplage cardinaux/corners dans le resolver
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardCornerShortcuts.kt`
  - Action : Faire en sorte que les assignments cardinaux autorises pour touches texte soient resolus avant tout gate corner-only; conserver le gate des diagonales/corners et des special keys selon leur politique.
  - User story link : rend `Z` haut/bas et `S` gauche/droite disponibles en AZERTY parce que ce sont des swipes directionnels, pas des corners.
  - Depends on : Tache 11
  - Validate with : test resolver ciblant `letter-z` AZERTY `up/down` et `letter-s` `left/right`, y compris quand `specialKeyCornersEnabled` est false.
  - Notes : Si le toggle global `cornerModeEnabled` doit rester un toggle de tous les gestures, le code doit le nommer/traiter explicitement comme tel et les tests doivent le prouver; ne pas utiliser une condition corner-only implicite.

- [ ] Tache 14 : Simplifier la classification effective apres resolver
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action : Garder `effectiveGestureSelection()` comme arbitre clair entre tap, swipe cardinal, corner diagonal et cancel, sans compenser une assignation vide causee par le resolver.
  - User story link : evite les corrections trop tardives qui transforment un vrai swipe en tap primaire ou en message `Gesture shortcut unavailable`.
  - Depends on : Tache 13
  - Validate with : test comportemental ou QA debug overlay montrant `letter-z` -> `Up/Down` et `letter-s` -> `Left/Right`.
  - Notes : Preserver les priorites `slidingSpace`, `scrollingHorizontalRow`, `scrollingVerticalPanel` et `longPressTriggered`.

- [ ] Tache 15 : Ajouter une regression test ou preuve ciblee pour S/Z AZERTY
  - Fichiers : `android/app/src/test/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardCornerShortcutsTest.kt`, `android/app/src/test/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardGestureClassifierTest.kt`
  - Action : Couvrir le mapping AZERTY `letter-z` up/down et `letter-s` left/right, plus un cas special-key qui reste bloque sans `specialKeyCornersEnabled`.
  - User story link : protege exactement le bug signale par Diane.
  - Depends on : Taches 13-14
  - Validate with : tests unitaires Kotlin sur runner compatible; localement, au minimum `flutter analyze` et tests Flutter autorises si Kotlin test local n'est pas disponible.
  - Notes : La preuve finale reste Android CI/Blacksmith + QA physique.

## Acceptance Criteria
- [ ] CA 1 : Given une touche configuree avec `up`, when l'utilisateur swipe clairement vers le haut, then l'action `up` est executee et aucune action diagonale ne part.
- [ ] CA 2 : Given une touche configuree avec `right`, when l'utilisateur swipe clairement vers la droite, then l'action `right` est executee et aucune action primaire ne part.
- [ ] CA 3 : Given une touche configuree avec `topRight`, when l'utilisateur swipe clairement haut-droite, then l'ancien comportement corner continue a fonctionner.
- [ ] CA 4 : Given une config legacy v1 avec `slot: topLeft`, when elle est chargee apres mise a jour, then le raccourci top-left reste visible et executable.
- [ ] CA 5 : Given une config exportee avec nouveaux slots cardinaux, when elle est importee, then les slots `up/down/left/right` sont preserves.
- [ ] CA 6 : Given un geste ambigu entre `up` et `topRight`, when il ne respecte pas un secteur clair, then le clavier annule ou retombe sur le comportement documente sans choisir arbitrairement.
- [ ] CA 7 : Given le slider espace est utilise, when le doigt glisse horizontalement sur espace, then le slider de curseur gagne et aucun shortcut directionnel ne part.
- [ ] CA 8 : Given une action row scrollable, when l'utilisateur la scroll horizontalement, then le scroll gagne et aucun raccourci de gesture ne part.
- [ ] CA 9 : Given un raccourci sensible configure sur un slot cardinal, when le champ est prive, then l'action est bloquee comme pour les corners sensibles.
- [ ] CA 10 : Given la preview Flutter affiche une touche avec `↑`, `↓`, `←`, `→`, when l'utilisateur la regarde sur mobile, then les labels de bord ne chevauchent ni le label primaire ni les labels de coin.
- [ ] CA 11 : Given l'editeur Flutter selectionne une touche, when l'utilisateur choisit un slot, then il peut choisir parmi Directions et Corners sans confusion de vocabulaire.
- [ ] CA 12 : Given le debug overlay est actif, when un geste cardinal est effectue, then la direction affichee correspond au slot classe.
- [ ] CA 13 : Given les tests locaux autorises sont lances, when l'implementation est terminee, then `flutter analyze` passe et les tests Flutter cibles pertinents passent.
- [ ] CA 14 : Given l'implementation est prete a shipper, when Android CI/Blacksmith compile l'IME, then aucune erreur Kotlin/native n'est presente.
- [ ] CA 15 : Given Diane teste sur appareil physique, when elle utilise les fleches sur `W`/`Z` et `S`, then le geste ressenti correspond bien a la direction affichee.
- [ ] CA 16 : Given le code est analyse ou compile, when `WinGlowzKeyboardView.kt` est pris en compte, then aucune erreur Kotlin n'est causee par `retainPressedHighlight()`.
- [ ] CA 17 : Given `letter-z` en AZERTY possede `up/down`, when le resolver construit les assignments, then ils ne sont pas supprimes par un gate nomme ou pense pour les corners.
- [ ] CA 18 : Given `letter-s` possede `left/right`, when `specialKeyCornersEnabled` est false, then les swipes texte gauche/droite restent resolus et les touches speciales restent bloquees.
- [ ] CA 19 : Given un slot cardinal valide est swipe, when l'action native reussit, then `Gesture shortcut unavailable` n'est pas affiche.
- [ ] CA 20 : Given le diagnostic S/Z est termine, when le code est cherche, then aucun `WinGlowzCornerDebug` temporaire ne reste dans le chemin de dispatch.

## Test Strategy
- Unit Kotlin: `KeyboardGestureClassifierTest.kt` pour seuils, secteurs, retour centre, gestes ambigus, cardinaux et diagonales.
- Unit Kotlin: `KeyboardCornerShortcutsTest.kt` pour parsing legacy/nouveau, validation JSON, private policy, presets et overrides.
- Flutter unit/model tests: `keyboard_models.dart` fromMap/toMap pour ancien et nouveau format.
- Flutter widget tests: `keyboard_corner_shortcuts_screen_test.dart` pour choix de slot, import/export, reset, warnings et unsupported bridge.
- Flutter widget/preview tests: verifier rendu des labels de bords et absence de chevauchement obvious.
- Local checks autorises: `flutter analyze`, `flutter test` ou tests Flutter cibles.
- Android proof: GitHub Actions/Blacksmith pour compilation/package; pas de Gradle local.
- Manual QA Diane: appareil Android, clavier reel, gestes rapides/lents, fleches `W`/`Z` + `S`, chiffres en swipe up, accents legacy, space slider, action row scroll, panel scroll, private fields, haptics/status.
- Repair proof 2026-05-25: ajouter au moins une preuve statique ou test cible montrant que `KeyboardCornerShortcutResolver.resolve()` ne supprime plus les slots cardinaux de `letter-z`/`letter-s` par confusion avec les corners.

## Risks
- Risque architecture high: le code et l'UI sont nommes `Corner`; une extension naive rendrait le modele incoherent.
- Risque migration: casser les configs existantes de corners serait un regress produit majeur.
- Risque gesture: les cardinaux peuvent voler les scrolls ou le slider espace si l'arbitrage est mal ordonne.
- Risque UX: autoriser huit slots sur une touche peut devenir illisible; l'UI doit permettre mais ne pas encourager ce pattern partout.
- Risque divergence: Kotlin doit rester la seule source de verite fonctionnelle pour les presets/resolution; Flutter garde les DTO, les ids/noms de presets, l'editeur Settings et une preview legere des overrides explicites uniquement.
- Risque validation: `flutter analyze` ne compile pas le Kotlin; Android CI/Blacksmith reste obligatoire.
- Risque privacy: les nouveaux slots doivent passer par les memes restrictions que les corners.
- Risque correctif partiel: corriger uniquement `effectiveGestureSelection()` laisse le bug ouvert si `cornerAssignments` est deja vide.
- Risque nomenclature: conserver les noms `Corner` partout augmente la probabilite de nouveaux bugs sur les gestures cardinaux.

## Execution Notes
- Lire d'abord `KeyboardGestureClassifier.kt`, `KeyboardCornerShortcuts.kt`, `WinGlowzKeyboardView.kt`, puis le miroir Dart dans `keyboard_models.dart`.
- Implementer en fondations d'abord: modele slots, classifier, resolver, dispatch, rendu, contrat Dart DTO/overrides sans tables de presets fonctionnels, UI, docs, tests.
- Preferer une migration additive: conserver les anciens noms, payloads et toggles, puis renommer l'UX progressivement.
- Ne pas renommer massivement tous les fichiers `Corner` dans le meme chantier si cela ajoute du risque sans valeur utilisateur immediate.
- Stop condition: si le preset fleches layout-aware sur `W`/`Z` + `S` doit changer encore l'experience par defaut pour tous les utilisateurs, demander validation Diane avant de figer ce changement.
- Stop condition: si le classifieur cardinal degrade physiquement les accents ou scrolls, reduire le scope au preset fleches et revisiter les seuils avant ship.
- Validation locale limitee par AGENTS.md: ne pas lancer `flutter build apk`, `flutter run -d android`, Gradle, assemble, bundle, compile ou `testDebugUnitTest`.
- Repair note 2026-05-25: commencer par corriger la syntaxe, puis supprimer les logs temporaires, puis corriger le resolver. L'ordre inverse complique la preuve parce que le fichier peut ne pas compiler.
- Repair note 2026-05-25: la decision produit conservee est celle formulee par Diane: les swipes gauche/droite/haut/bas de `S`/`Z` sont des swipes directionnels, pas des corners.

## Open Questions
- None for the spec. The product decision captured here is: support both cardinal and diagonal slots technically, but use cardinal directions for arrows/navigation and keep diagonals for accents/secondary shortcuts.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-05-19 20:56:40 UTC | sf-spec | GPT-5 Codex + explorer subagent | Created directional gesture shortcuts spec from Diane's product decision and local gesture architecture review. | Draft spec saved. | `/sf-ready keyboard-directional-gesture-shortcuts` |
| 2026-05-19 21:13:08 UTC | sf-ready | GPT-5 Codex | Validated readiness for implementation: scope, guardrails, legacy JSON compatibility, protected gesture priority, and test strategy were concrete and actionable. | ready | `/sf-start keyboard-directional-gesture-shortcuts` |
| 2026-05-19 21:13:08 UTC | sf-build | GPT-5 Codex worker | Implemented directional+corner slots in Kotlin/Dart models, classifier/runtime dispatch/rendering, editor+preview+settings wording, docs, and targeted tests; ran allowed local checks only. | implemented-pending-android-qa | Blacksmith/GitHub Actions Android validation and Diane physical-device QA |
| 2026-05-19 21:18:49 UTC | sf-build | GPT-5 Codex integrator | Reviewed worker changes, removed default diagonal arrow mappings from `H` so arrows use cardinal slots only, and reran allowed local checks including full `flutter test`. | implemented-pending-android-qa | Blacksmith/GitHub Actions Android validation and Diane physical-device QA |
| 2026-05-19 21:55:47 UTC | direct preset update | GPT-5 Codex + explorer subagent | Updated Smart French/punctuation presets for numeric up-gestures, layout-aware arrow gestures on `W`/`Z` + `S`, and `-`/`_` on `N`; synced Kotlin/Dart/docs/tests. | implemented-pending-android-qa | Allowed local checks, then Android CI/physical QA |
| 2026-05-19 22:37:37 UTC | sf-build | GPT-5 Codex | Removed Dart functional preset tables/resolution, kept preset ids/names as DTO/UI fallback, updated Flutter tests and docs for Kotlin-native source of truth. | implemented-local-verified | Android CI/Blacksmith and Diane physical-device QA |
| 2026-05-19 23:45:16 UTC | direct default update | GPT-5 Codex + explorer subagent | Changed default keyboard layout to AZERTY and enabled gesture/corner mode by default across native state, view fallback, Flutter DTO fallback, preview default, docs, and tests. | implemented-local-verified | Android CI/Blacksmith and Diane physical-device QA |
| 2026-05-25 06:02:12 UTC | sf-spec | GPT-5.5 Codex | Reopened the directional gesture chantier from code audit: current code has a probable Kotlin syntax break, temporary S/Z debug logs, and a resolver-level cardinal/corner coupling that can still suppress AZERTY `S`/`Z` swipes. | draft-repair | `/sf-ready keyboard-directional-gesture-shortcuts` |
| 2026-05-25 06:33:58 UTC | sf-ready | GPT-5.5 Codex | Reviewed the reopened repair spec against Definition of Ready. | not ready: repair goal is clear but task list still mixes historical full gesture work with current S/Z repair scope. | `/sf-spec keyboard-directional-gesture-shortcuts repair-only scope clarification` |
| 2026-05-25 09:29:00 UTC | sf-spec | GPT-5.5 Codex | Clarified repair-only execution scope after readiness review: Tasks 11-15 are the only actionable `/sf-start` tasks; Tasks 1-10 are historical reference only. | draft updated | `/sf-ready keyboard-directional-gesture-shortcuts` |
| 2026-05-25 09:32:09 UTC | sf-ready | GPT-5.5 Codex | Re-validated the repaired scope and confirmed the repair task set is executable. | ready | `/sf-start keyboard-directional-gesture-shortcuts` |
| 2026-05-25 10:01:47 UTC | sf-start | GPT-5 Codex | Corrigé la compilabilité de `retainPressedHighlight`, retiré les logs temporaires S/Z du dispatch, découpé le resolver pour désolidariser le gate special-key/texte, simplifié `effectiveGestureSelection`, et ajouté un test de régression AZERTY S/Z. | implemented | `/sf-verify keyboard-directional-gesture-shortcuts` |
| 2026-05-25 14:55:01 UTC | sf-verify | GPT-5 Codex | Verified the repair against the spec with allowed local checks: resolver/dispatch snippets reviewed, S/Z regression test present, debug logs absent, metadata lint passed, and `flutter analyze` passed. Android-native CI/device proof remains required. | partial | `/sf-verify keyboard-directional-gesture-shortcuts --android-ci-device-proof` |
| 2026-05-26 18:10:45 UTC | sf-test | GPT-5 Codex | Guided Diane through physical-device manual QA for AZERTY `letter-z` up/down and `letter-s` left/right directional swipes, including the expected absence of `Gesture shortcut unavailable`. | pass | `/sf-verify keyboard-directional-gesture-shortcuts --android-ci-device-proof` |
| 2026-06-11 18:29:17 UTC | 001-sf-build | GPT-5 Codex + worker subagent | Implemented held swipe/corner repeat for repeatable navigation/deletion gesture actions only, preserving one-shot text/clipboard actions and existing primary long-press repeat behavior; added policy tests for repeat eligibility. | partial | Android CI/Blacksmith Kotlin proof and physical-device IME QA for held swipes |
| 2026-06-11 20:19:44 UTC | 005-sf-ship | GPT-5 Codex | Quick-shipped Android IME repeat tuning: primary character hold repeats, and navigation/deletion repeat accelerates from distance and thumb activity. | shipped | Android CI/Blacksmith Kotlin proof and physical-device IME QA |

## Current Chantier Flow

Flux: sf-spec ✅ -> sf-ready ✅ -> sf-start ✅ -> sf-verify 🔄 -> sf-end ⏳ -> sf-ship ✅

Reste a faire:
- Passer la preuve CI/Blacksmith Android-native pour confirmer compilation/tests Kotlin; la QA appareil Android Diane sur `letter-z` haut/bas et `letter-s` gauche/droite est passee.
- Retester sur appareil Android le maintien d'un swipe/corner repeatable (`↑`, `Word→`, `DelW→`) et verifier que `/`, `@`, `Paste` restent one-shot.
- Retester sur appareil Android la repetition des caracteres primaires et l'acceleration des actions navigation/suppression quand le doigt part loin ou bouge beaucoup.

Prochaine etape:
- `/sf-verify keyboard-directional-gesture-shortcuts --android-ci-device-proof`
