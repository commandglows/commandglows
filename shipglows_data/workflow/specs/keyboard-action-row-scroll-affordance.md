---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "winglowz_app"
created: "2026-05-19"
created_at: "2026-05-19 14:46:49 UTC"
updated: "2026-05-19"
updated_at: "2026-05-19 18:00:37 UTC"
status: active
source_skill: sf-spec
source_model: "GPT-5 Codex"
scope: "feature"
owner: "Diane"
confidence: medium
user_story: "En tant qu'utilisatrice du clavier WinGlows sur Android, je veux que les lignes d'action scrollables indiquent clairement quand le scroll commence, où il reste du contenu et sur quelle page la ligne va se repositionner, afin de comprendre le geste sans ambiguïté visuelle."
risk_level: "medium"
security_impact: "none"
docs_impact: "yes"
linked_systems:
  - "Android IME Kotlin"
  - "Keyboard action bar"
  - "Keyboard horizontal row renderer"
  - "Physical-device QA"
depends_on:
  - artifact: "shipglows_data/technical/architecture.md"
    artifact_version: "0.1.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/guidelines.md"
    artifact_version: "0.1.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/workflow/specs/proprietary-swipe-corner-android-keyboard.md"
    artifact_version: "unknown"
    required_status: "active"
supersedes: []
evidence:
  - "User request 2026-05-19: current horizontal action-row scroll animation is not visually clear enough."
  - "User request 2026-05-19: when scroll starts, keys and the bar should shrink in width, height, and overall size to make the scroll state obvious."
  - "User request 2026-05-19: the row needs a visual indication of remaining scrollable content on the left and right."
  - "User request 2026-05-19: near the end of the page gesture, the row should begin growing back, then snap to normal size and either stay on the current page or move to the next/previous page on release."
  - "Local code: android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt centralizes horizontal scroll gesture handling, snap animation, row drawing, and row scroll state."
  - "Local code: android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/actions/KeyboardActionCatalog.kt and KeyboardActionRenderer.kt decide which action rows become paged horizontal rows."
next_step: "Blacksmith Android validation and Diane physical-device QA for action-row scroll affordance"
---

## Title
Keyboard Action Row Scroll Affordance

## Status
Implemented locally. Flutter analyzer passed on 2026-05-19. Android IME validation still requires Blacksmith/GitHub Actions and Diane physical-device QA because local Android builds, Gradle tasks, installs and APK validation are forbidden on this VM.

## User Story
En tant qu'utilisatrice du clavier WinGlows sur Android, je veux que les lignes d'action scrollables indiquent clairement quand le scroll commence, où il reste du contenu et sur quelle page la ligne va se repositionner, afin de comprendre le geste sans ambiguïté visuelle.

## Minimal Behavior Contract
Quand l'utilisateur démarre un geste horizontal sur une ligne d'action scrollable du clavier Android, WinGlows doit accepter le drag, entrer rapidement dans un état visuel de scroll, réduire la ligne et ses touches, afficher les indications de contenu restant à gauche et/ou à droite, puis revenir à la taille normale au relâchement en snappant vers la page actuelle, précédente ou suivante selon le seuil franchi. Si la ligne n'a pas de contenu scrollable ou si le geste reste sous le seuil horizontal, aucun état de scroll ne doit être affiché et le tap normal doit rester possible. L'edge case facile à rater est le geste paged qui ne déplace qu'un peu la row: la réduction visuelle doit signaler le scroll, mais le relâchement doit revenir sur la même page sans donner l'impression d'un changement de page.

## Success Behavior
- Précondition: le clavier WinGlows Android est actif et une ligne horizontale paged est visible, par exemple une action row attachée `123`, `Nav`, `Emoji`, `Media`, `Clip`, `Snip`, ou une row panel compatible.
- Action: l'utilisateur pose le doigt sur une touche de la ligne scrollable et glisse horizontalement au-delà du seuil de scroll.
- Résultat visible immédiat: la ligne passe en état réduit en moins de 120 ms; les touches sont plus petites en largeur, hauteur, rayon et texte, sans devenir illisibles.
- Résultat visible pendant le drag: des fades ou ombres de bord indiquent s'il reste du contenu à gauche, à droite, ou des deux côtés; l'indicateur disparaît ou s'affaiblit au bord atteint.
- Résultat visible près du snap: quand le seuil de page est franchi, la ligne commence à regrossir légèrement ou affiche un feedback de snap discret, tout en gardant le contenu lisible.
- Résultat au relâchement: la ligne revient à sa taille normale et la position horizontale s'anime vers la page courante, précédente ou suivante selon le seuil existant.
- Preuve de succès: QA physique confirme que Diane voit clairement le début du scroll, comprend où il reste du contenu et ne confond pas un scroll court avec un changement de page.

## Error Behavior
- Si un `ValueAnimator` de scale ou de snap est annulé par un nouveau geste, il doit être annulé proprement et remplacé par le nouvel état sans saut de layout.
- Si la row disparaît pendant un refresh layout, changement de panel, long press ou privacy mode, les états visuels de scroll associés à son `rowId` doivent être nettoyés.
- Si la row n'est plus scrollable après rebuild, les offsets doivent être clampés et aucune ombre de débordement ne doit rester dessinée.
- Si une erreur de rendu survient, le fallback clavier existant doit rester prioritaire; cette feature ne doit pas affaiblir les garde-fous de résilience du clavier.

## Problem
Le scroll horizontal actuel des lignes d'action est techniquement fonctionnel, mais le feedback visuel est trop discret. L'utilisateur peut déclencher un drag sans savoir clairement à quel moment le clavier a quitté le mode tap pour entrer en mode scroll, ni savoir s'il reste du contenu hors écran à gauche ou à droite. Le snap final fonctionne, mais le ressenti ne guide pas assez le geste.

## Solution
Ajouter un état visuel de scroll row-level dans `WinGlowzKeyboardView`: une animation de réduction de la ligne pendant le drag, des indicateurs de débordement gauche/droite dessinés au-dessus du contenu, et une sortie coordonnée avec le snap horizontal existant. Conserver la logique de pagination et de seuils actuelle sauf ajustement strictement nécessaire pour que le feedback visuel corresponde au résultat du relâchement.

## Scope In
- Animation de réduction pour les rows horizontales scrollables, en priorité `pagedHorizontalScrollable`.
- Réduction visuelle de la row et des touches: hauteur, largeur interne, rayon, texte, et espacement si nécessaire.
- Indicateurs de contenu restant à gauche/droite: fade, ombre intérieure, ou voile de bord subtil.
- Retour à taille normale au relâchement, coordonné avec `animateHorizontalRowOffset`.
- Nettoyage des états visuels par `rowId` lors des refreshs, annulations et changements de panel.
- Tests unitaires Kotlin ciblés sur calculs de page/offset/edge affordance quand le code est extractible.
- QA Android physique obligatoire pour valider le ressenti.

## Scope Out
- Refonte complète du catalogue d'actions, de l'ordre des actions ou du modèle de pinning.
- Changement du comportement long press attach/pin.
- Ajout d'un tutoriel, texte explicatif in-keyboard, onboarding ou modal.
- Refonte Flutter web/settings preview pour cette animation, sauf si un test ou aperçu existant casse.
- Changement des animations de pression des touches dans `KeyboardPressEffects.kt`, sauf conflit visuel direct avec le nouvel état de scroll.
- Build APK local, Gradle assemble, Android install ou `flutter run -d android` sur cette VM.

## Constraints
- Respecter les guardrails locaux: seuls `flutter analyze`, `flutter test` et tests Flutter ciblés sont autorisés localement; Android build/APK/IME validation passe par GitHub Actions/Blacksmith et QA physique.
- Le rendu clavier est un `View` custom Kotlin: la solution doit rester légère et ne pas créer d'allocation excessive dans `onDraw`.
- La ligne principale d'action ne doit pas devenir librement scrollable par accident; seules les rows explicitement scrollables doivent recevoir ce feedback.
- Les touches doivent rester lisibles et touchables pendant le drag; la réduction est visuelle, pas une réduction du hit target actif pendant le geste.
- Le feedback ne doit pas ajouter de texte visible expliquant l'interaction.
- `fresh-docs not needed`: le comportement dépend de code Android local et d'APIs Android déjà utilisées (`View`, `Canvas`, `ValueAnimator`), sans nouvelle dépendance externe.

## Dependencies
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`: gesture state, horizontal scroll state, drawing, snap animation.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardLayoutModels.kt`: `KeyboardRowSpec` flags and panel rows that can scroll.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/actions/KeyboardActionCatalog.kt`: action row providers and paged row definitions.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/actions/KeyboardActionRenderer.kt`: conversion to `horizontalScrollable` / `pagedHorizontalScrollable`.
- `android/app/src/test/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardLayoutBuilderTest.kt` and `KeyboardActionBarControllerTest.kt`: nearest test patterns for action row behavior.
- Blacksmith/GitHub Actions and Diane physical-device QA for Android IME validation.

## Invariants
- A short horizontal movement below the scroll threshold must still allow a normal tap.
- A vertical-ish gesture must not enter horizontal scroll mode.
- `rowPageById` remains the persisted source of truth for paged attached action rows.
- Offset and page calculations must remain clamped between page 0 and `maxPage`.
- Edge indicators must reflect actual scrollability: no right indicator at max offset, no left indicator at offset 0.
- Rebuilds caused by layout mode, panel mode, compact mode, theme, field policy, suggestions, voice row or clipboard row must not leave stale visual progress.
- Private fields do not need special handling because no user content is drawn or logged by this feature.

## Links & Consequences
- `handleHorizontalRowScroll` becomes the entrypoint for starting the visual scroll state.
- `finishHorizontalRowScroll` must coordinate page target, haptic feedback and scale-out animation.
- `drawScrollableRow` must draw keys in a reduced visual transform while preserving row clipping and hit-frame correctness.
- `animateHorizontalRowOffset` may need to run alongside a row visual progress animator.
- `clearHorizontalRowScrollState` must clear visual scale/indicator state as well as offsets and animators.
- `KeyboardActionRenderer` should remain a configuration bridge only; avoid moving animation behavior there.
- UX consequence: the row will feel more deliberate and slightly less static during scroll; tune scale so it communicates state without looking broken.
- Performance consequence: extra drawing must be simple gradients/rects and reused paints; no per-frame object churn beyond current patterns.

## Documentation Coherence
- Update `docs/technical/android-native.md` or `docs/PLATFORM_BEHAVIOR.md` with a short note that action rows use visual scroll affordances and require physical-device QA.
- Add validation evidence to `shipglows_data/workflow/TEST_LOG.md` after Blacksmith/physical QA, not during spec creation.
- Changelog entry at ship time: action-row scroll feedback and overflow affordances.

## Edge Cases
- First page: left indicator hidden, right indicator visible when `maxOffset > 0`.
- Last page: right indicator hidden, left indicator visible when offset is greater than 0.
- Middle page: both indicators visible.
- Under-threshold drag: row may briefly enter reduced state only after the actual scroll threshold is crossed; release snaps back to current page and normal size.
- Over-threshold drag to next/previous page: row gives a clear snap hint and haptic remains aligned with actual page change.
- Drag starts while a previous snap animation is running: previous animator cancels and the new gesture starts from the current visual offset.
- Action row has exactly `visiblePageKeyCount` items or less: no scroll state, no indicators.
- Non-paged rows such as clipboard/snippets panel rows: either use the same shrink plus free-scroll edge indicators or remain unchanged if implementation chooses to limit v1 to paged rows; the choice must be explicit during implementation.
- Compact mode changes row count/height: scale math must use actual drawn row height.
- Theme with image/gradient/custom shadows: edge indicators remain visible but subtle across light/dark/custom themes.

## Implementation Tasks
- [ ] Tâche 1 : Introduire un état visuel de scroll par row
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action : Ajouter maps/valeurs pour progression visuelle par `rowId`, animateurs de scale, état actif et helpers de nettoyage.
  - User story link : signaler clairement le passage en mode scroll.
  - Depends on : none
  - Validate with : inspection Kotlin + tests de compilation via CI/Blacksmith, pas de build Android local.
  - Notes : Préférer une progression `0f..1f` où `1f` représente l'état réduit.

- [ ] Tâche 2 : Déclencher la réduction au vrai début du scroll horizontal
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action : Dans `handleHorizontalRowScroll`, démarrer l'animation de réduction quand `scrollingHorizontalRow` passe à `true`, après les checks de seuil horizontal et de `maxOffset`.
  - User story link : montrer précisément quand le geste devient un scroll.
  - Depends on : Tâche 1
  - Validate with : QA appareil sur action row `123` et `Nav`.
  - Notes : Durée cible 80-120 ms; ne pas déclencher sous le seuil ou pour un mouvement vertical.

- [ ] Tâche 3 : Appliquer le scale visuel dans le dessin de row
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action : Modifier `drawScrollableRow` pour réduire visuellement les rects de touches, leur hauteur, rayon et taille de texte pendant l'état scroll, sans réduire les hit frames de manière dangereuse pendant le geste.
  - User story link : rendre le mode scroll lisible immédiatement.
  - Depends on : Tâches 1-2
  - Validate with : QA visuelle light/dark/custom theme.
  - Notes : Scale initial recommandé: hauteur 0.78-0.86, largeur 0.88-0.94, texte 0.88-0.94; ajuster au ressenti.

- [ ] Tâche 4 : Dessiner les indicateurs gauche/droite de contenu restant
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action : Ajouter edge fades/ombres dessinés dans `drawScrollableRow` selon `rowOffset`, `maxOffset` et la progression scroll.
  - User story link : montrer où il reste du contenu à scroller.
  - Depends on : Tâche 3
  - Validate with : QA sur première, dernière et page intermédiaire.
  - Notes : Utiliser des `Paint` réutilisés et couleurs dérivées du thème; éviter les allocations répétées dans `onDraw`.

- [ ] Tâche 5 : Coordonner retour taille normale et snap horizontal
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action : Dans `finishHorizontalRowScroll`, lancer le retour visuel vers taille normale en même temps que `animateHorizontalRowOffset`; ajouter un feedback de snap discret quand le seuil de changement de page est franchi.
  - User story link : rendre le relâchement cohérent avec la page finale.
  - Depends on : Tâches 1-4
  - Validate with : QA gestes courts, gestes vers page suivante, gestes vers page précédente.
  - Notes : Garder le haptic `CLOCK_TICK` uniquement quand la page change effectivement.

- [ ] Tâche 6 : Nettoyer les états visuels lors des rebuilds et annulations
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action : Étendre `cancelHorizontalRowAnimation`, `clearHorizontalRowScrollState`, `resetGesture`, refresh/panel changes si nécessaire pour annuler les nouveaux animateurs et supprimer les progressions orphelines.
  - User story link : éviter les states coincés ou indicateurs fantômes.
  - Depends on : Tâches 1-5
  - Validate with : QA changement panel pendant/après scroll, long press attach/unattach, compact mode.

- [ ] Tâche 7 : Ajouter ou adapter tests ciblés si une extraction pure est possible
  - Fichier : `android/app/src/test/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardActionBarControllerTest.kt`
  - Action : Couvrir les invariants page/offset/edge visibility via helper pur si l'implémentation extrait le calcul; sinon documenter la limite et couvrir par QA manuelle.
  - User story link : protéger le comportement de snap et d'indicateurs.
  - Depends on : Tâches 4-5
  - Validate with : Blacksmith Android unit tests ou rapport de blocage si l'environnement local ne peut pas lancer Gradle.

- [ ] Tâche 8 : Mettre à jour la documentation de validation
  - Fichier : `docs/technical/android-native.md`
  - Action : Ajouter une note courte sur les affordances de scroll des action rows et le protocole de validation physique.
  - User story link : préserver la vérification future du ressenti UX.
  - Depends on : implémentation validée
  - Validate with : review doc + changelog au ship.

## Acceptance Criteria
- [ ] Quand un drag horizontal franchit le seuil sur une row paged scrollable, la row rétrécit visiblement en moins de 120 ms.
- [ ] Quand le drag ne franchit pas le seuil, le tap normal reste possible et aucune réduction persistante ne reste affichée.
- [ ] Sur la première page d'une row multi-page, seul l'indicateur de contenu à droite est visible.
- [ ] Sur une page intermédiaire, les indicateurs gauche et droite sont visibles.
- [ ] Sur la dernière page, seul l'indicateur de contenu à gauche est visible.
- [ ] Un drag insuffisant revient à la page courante et à la taille normale au relâchement.
- [ ] Un drag suffisant change d'une page maximum dans la direction du geste, avec retour à taille normale et haptic seulement si la page change.
- [ ] Démarrer un nouveau drag pendant un snap ne provoque pas de saut, de crash ou d'état visuel bloqué.
- [ ] Changer de panel, long press attach/unattach une row, ou activer compact mode ne laisse pas de fade/scale fantôme.
- [ ] Les touches restent lisibles sur thèmes light, dark et au moins un thème custom.
- [ ] Aucun build Android local interdit n'est exécuté sur cette VM.

## Test Strategy
- Inspection statique: vérifier que l'animation reste centralisée dans `WinGlowzKeyboardView.kt` et que le catalogue ne reçoit pas de logique de rendu.
- Local Flutter: `flutter analyze` si des fichiers Dart/docs liés sont modifiés; `flutter test` seulement si des surfaces Flutter changent.
- Android CI: lancer Blacksmith/GitHub Actions pour compilation et tests unitaires Android selon workflow existant.
- QA physique Diane:
  - Row `123` attachée: drag court, drag page suivante, drag retour.
  - Row `Nav` attachée: vérifier indicateurs avec plusieurs pages.
  - Row `Media` ou `Emoji`: vérifier lisibilité et snap.
  - Thèmes light/dark/custom: vérifier edge indicators et réduction.
  - Compact mode: vérifier absence d'état bloqué.

## Risks
- Réduction trop forte: touches illisibles ou impression que la row est cassée.
- Réduction trop faible: l'objectif de clarté n'est pas atteint.
- Edge fades trop visibles: conflit avec thèmes custom ou impression de contenu masqué.
- Edge fades trop discrets: l'utilisateur ne comprend toujours pas où il reste du contenu.
- Couplage offset + scale mal coordonné: snap visuel peut sembler aller vers une page différente du résultat réel.
- Performance: allocations dans `onDraw` ou multiplication d'animateurs par row peuvent rendre l'IME moins fluide.
- Tests locaux Android limités par les guardrails et l'environnement; validation finale dépend de CI et appareil réel.

## Execution Notes
- Choix UX recommandé pour v1: réduction globale de la row pendant scroll + fades de bord gauche/droite + snap/haptic existant conservé.
- Ne pas utiliser de texte explicatif dans le clavier.
- Le comportement doit être implémenté d'abord sur les rows `pagedHorizontalScrollable`; les rows non-paged peuvent rester inchangées si cela réduit le risque.
- Les hit frames peuvent rester basées sur les rects actuels pendant le geste pour préserver la robustesse touch; la réduction est principalement visuelle.
- Préférer des constantes nommées proches des constantes existantes: durée entrée, durée sortie, min scale hauteur, min scale largeur, largeur fade.
- Fresh docs verdict: `fresh-docs not needed`.

## Open Questions
- Faut-il appliquer le même état réduit aux rows horizontales non-paged (`panel-clipboard`, `panel-snippets`) dès v1, ou limiter strictement aux rows paged de l'action bar?
- Diane préfère-t-elle des edge fades/ombres seules, ou aussi un mini indicateur de page discret pendant le drag si les fades ne suffisent pas?

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-05-19 14:46:49 UTC | sf-spec | GPT-5 Codex | Created spec for clearer horizontal action-row scroll affordance in the Android keyboard. | Draft spec created. | `/sf-ready Keyboard Action Row Scroll Affordance` |
| 2026-05-19 17:40:21 UTC | sf-build | GPT-5 Codex + worker subagent | Implemented row-level scroll visual progress, key shrink, edge affordance fades, snap return and cleanup in `WinGlowzKeyboardView.kt`; ran `flutter analyze`. | Implemented locally; Flutter analyzer passed. Android validation not run locally by guardrail. | Blacksmith Android validation and Diane physical-device QA. |
| 2026-05-19 18:00:37 UTC | sf-build | GPT-5 Codex + worker subagent | Added a resting scroll affordance so hidden left/right content is indicated before the user starts dragging. | Implemented locally; `flutter analyze` and `git diff --check` passed. | Blacksmith Android validation and Diane physical-device QA. |

## Current Chantier Flow

| Step | Status | Notes |
|------|--------|-------|
| sf-spec | done | Draft created from Diane's requested interaction behavior and local code inspection. |
| sf-ready | bypassed | User asked ShipGlows to proceed and required subagents; implementation stayed within the existing scoped spec. |
| sf-start | done | Worker subagent implemented the Kotlin scroll affordance in `WinGlowzKeyboardView.kt`. |
| sf-verify | partial | `flutter analyze` passed; Android compile/IME behavior proof remains Blacksmith and physical-device QA. |
| sf-end | pending | Close docs/changelog/test log after validation. |
| sf-ship | pending | Commit/push/deploy only if explicitly requested or lifecycle requires it. |
