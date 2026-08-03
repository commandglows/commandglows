---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "winglowz_app"
created: "2026-05-19"
created_at: "2026-05-19 18:30:18 UTC"
updated: "2026-05-19"
updated_at: "2026-05-19 18:52:16 UTC"
status: active
source_skill: sf-spec
source_model: "GPT-5 Codex"
scope: "android-ime-keyboard-layout"
owner: "Diane"
confidence: medium
user_story: "En tant qu'utilisatrice rapide du clavier WinGlows sur Android, je veux que les modes principaux reposent sur une grille stable avec des exceptions en multiples de cellule, afin que le clavier reste beau, cohérent, prévisible et plus fiable au toucher."
risk_level: "medium"
security_impact: "none"
docs_impact: "yes"
linked_systems:
  - "Android IME Kotlin"
  - "Keyboard layout models"
  - "Keyboard custom View rendering"
  - "Keyboard touch hit testing"
  - "Physical-device QA"
depends_on:
  - artifact: "shipglows_data/technical/architecture.md"
    artifact_version: "0.1.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/guidelines.md"
    artifact_version: "0.1.0"
    required_status: "reviewed"
  - artifact: "docs/explorations/2026-05-19-keyboard-touch-hitboxes.md"
    artifact_version: "1.0.0"
    required_status: "draft"
supersedes: []
evidence:
  - "User request 2026-05-19: keep the WinGlows keyboard visual design while eliminating dead tactile gaps."
  - "User request 2026-05-19: layouts across ABC, symbols/signs, numbers, and navigation feel inconsistent and should share a clearer grid."
  - "User decision 2026-05-19: exceptions are allowed only when they remain mathematically aligned as multiples of original key widths/heights."
  - "Local code: KeyboardLayoutModels.kt uses arbitrary Float weights such as 0.9, 1.1, 1.15, 1.2, 1.3 and leading/trailing weights across modes."
  - "Local code: WinGlowzKeyboardView.kt currently computes visual rectangles in drawRow/drawPanelScrollRow and uses the same RectF for hit testing."
  - "Exploration report: docs/explorations/2026-05-19-keyboard-touch-hitboxes.md recommends shared grid presets plus visual/touch geometry separation."
  - "Explorer subagent 2026-05-19: KeyFrame should carry slotRect, visualRect and touchRect; hitTest must not depend on firstOrNull over overlapping rectangles."
next_step: "Blacksmith/GitHub Actions Android validation and Diane physical-device QA"
---

## Title
Keyboard Stable Grid Touch Geometry

## Status
Implemented locally. `flutter analyze` and `git diff --check` passed on 2026-05-19. Android native compile/package proof and tactile UX proof still require Blacksmith/GitHub Actions and Diane physical-device QA because local Android builds, Gradle tasks, installs and APK validation are forbidden on this VM.

## User Story
En tant qu'utilisatrice rapide du clavier WinGlows sur Android, je veux que les modes principaux reposent sur une grille stable avec des exceptions en multiples de cellule, afin que le clavier reste beau, cohérent, prévisible et plus fiable au toucher.

## Minimal Behavior Contract
Quand WinGlows construit ou dessine un mode clavier principal sur Android, les touches doivent être placées sur une grille logique stable et réutilisable. Une touche standard occupe une cellule; une exception comme espace, entrée, suppression ou shift peut occuper plusieurs cellules entières, mais ne doit plus utiliser de largeur arbitraire qui casse l'alignement. Le rendu visuel peut garder les gaps, arrondis, ombres et thèmes WinGlows, tandis que la cellule logique reste disponible pour une interaction tactile sans zone morte. Si une ligne ne rentre pas dans la grille choisie, elle doit être réorganisée ou explicitement classée hors scope, jamais rendue par un poids flottant opportuniste. L'edge case facile à rater est la troisième ligne: ABC, symboles, chiffres et navigation doivent garder une impression de même système même quand leur contenu diffère.

## Success Behavior
- Précondition: le clavier Android WinGlows affiche un mode principal non compact, par exemple ABC, Numbers, Symbols, Accents ou Navigation.
- Action: l'utilisateur change de mode ou regarde/tape rapidement sur les lignes principales.
- Résultat visible: les largeurs des touches standard restent cohérentes d'un mode à l'autre; les exceptions visibles occupent des multiples clairs de cellule.
- Résultat tactile: les futures hitboxes peuvent utiliser les cellules complètes, sans dépendre des gaps visuels ni des rects arrondis dessinés.
- Effet système: le calcul de géométrie de row est centralisé et réutilisé par les rows normales, les panel rows et les rows scrollables compatibles.
- Preuve de succès: debug touch overlay ou inspection de géométrie montre des cellules alignées, et Diane confirme en QA physique que les modes ne donnent plus l'impression de partir dans tous les sens.

## Error Behavior
- Si une row reçoit un span impossible à placer dans la grille cible, l'implémentation doit utiliser un fallback sûr qui conserve le rendu existant pour cette row et journalise/debugue le cas via les outils déjà disponibles, sans crash.
- Si une row scrollable contient plus de cellules que la fenêtre visible, les cellules hors viewport ne doivent pas capter les touches; leur géométrie tactile doit être clipée au viewport.
- Si une ligne de panneau vertical est masquée ou partiellement masquée, sa géométrie tactile doit être clipée au viewport vertical actif.
- Si une row panel ou suggestion ne correspond pas au modèle principal, elle doit rester explicitement hors grille principale ou utiliser un preset secondaire, sans polluer les modes ABC/Numbers/Symbols/Navigation.
- Si un thème utilise de grands gaps ou un `keyWidthScale` réduit, le rendu visuel peut rester espacé mais la cellule logique ne doit pas devenir une zone morte.

## Problem
Le clavier utilise aujourd'hui des poids flottants et des spacers ligne par ligne. ABC, Numbers, Symbols, Accents et Navigation ne partagent pas une même logique de largeur: certaines touches valent `0.9f`, d'autres `1.1f`, `1.15f`, `1.2f` ou `1.3f`, et certaines lignes ajoutent des `leadingWeight`. Cette souplesse donne un rendu qui peut paraître désordonné, rend les modes moins prévisibles, et transforme les gaps visuels en zones mortes parce que la hitbox actuelle est le même rectangle que la touche dessinée.

## Solution
Introduire une abstraction de grille clavier stable dans le code Android IME. Les rows principales doivent se définir en cellules et spans entiers plutôt qu'en poids flottants arbitraires. Le moteur de grille doit produire au minimum un `slotRect` stable, un `visualRect` thémable et un `touchRect` non chevauchant, afin que le rendu reste premium pendant que la couche tactile devient mathématiquement cohérente.

## Scope In
- Définition d'un modèle de grille réutilisable pour les modes principaux Android IME: Letters/ABC, Numbers, Symbols, Accents et Navigation.
- Remplacement progressif des poids flottants arbitraires des rows principales par des spans entiers de cellule.
- Autorisation d'exceptions explicites uniquement en multiples de cellule: par exemple `1x`, `2x`, `3x`, `4x`.
- Extraction ou création d'un moteur de géométrie qui calcule `slotRect`, `visualRect` et `touchRect`.
- Utilisation du même moteur pour `drawRow` et `drawPanelScrollRow`, et préparation pour `drawScrollableRow`.
- Mise à jour du debug touch overlay pour pouvoir vérifier les cellules tactiles réelles.
- Tests ciblés sur la cohérence des spans et l'absence de chevauchement tactile quand une extraction pure est possible.
- QA physique Android pour valider le ressenti de cohérence et de réactivité.

## Scope Out
- Refonte complète du thème visuel, des couleurs, des arrondis, des ombres ou de la personnalisation.
- Suppression des gaps visuels entre touches.
- Refonte éditoriale de tous les labels de navigation; seuls les labels nécessaires au fit grille peuvent être raccourcis ou remplacés par symboles.
- Refonte de la barre d'action scrollable déjà traitée dans `keyboard-action-row-scroll-affordance.md`, sauf adaptation technique au nouveau moteur de grille.
- Refonte des panneaux emoji, clipboard, snippets, media, settings et theme settings au-delà de ce qui est nécessaire pour ne pas casser leur rendu.
- Build APK local, Gradle, install Android ou `flutter run -d android` sur cette VM.

## Constraints
- Respecter les guardrails locaux: seuls `flutter analyze`, `flutter test` et tests Flutter ciblés sont autorisés localement; Android build/APK/IME validation passe par GitHub Actions/Blacksmith et QA physique Diane.
- La grille stable est une contrainte produit: les exceptions doivent être entières et visibles comme des multiples de cellule.
- Ne pas remplacer une incohérence par une autre: les anciens poids flottants arbitraires ne doivent pas être recréés ailleurs sous un autre nom.
- Le rendu visuel doit rester indépendant de la cellule tactile: gaps, radius, shadow et `keyWidthScale` appartiennent à `visualRect`, pas à la surface tactile finale.
- Les cellules tactiles ne doivent pas se chevaucher de manière ambiguë; `hitTest` ne doit pas dépendre d'un ordre arbitraire pour départager deux touches voisines.
- Les gaps horizontaux et verticaux doivent être attribués à des cellules voisines de façon déterministe; aucun gap interne ne doit rester sans cible tactile dans les modes principaux.
- `fresh-docs not needed`: la spec dépend de code Kotlin local et d'APIs Android déjà utilisées (`View`, `Canvas`, `RectF`), sans nouvelle dépendance externe.

## Dependencies
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardLayoutModels.kt`: source des `KeyboardKeySpec`, `KeyboardRowSpec`, modes et rows à normaliser.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`: source du calcul actuel des rects, du rendu, de `keyFrames` et de `hitTest`.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardThemeModels.kt`: source de `keyHorizontalGap`, `rowVerticalGap`, `keyWidthScale`, radius et styles visuels.
- `docs/explorations/2026-05-19-keyboard-touch-hitboxes.md`: exploration produit/technique de la séparation visual/touch et des incohérences de grille.
- `shipglows_data/workflow/specs/keyboard-action-row-scroll-affordance.md`: changement récent sur les rows scrollables, à préserver.

## Invariants
- Une touche standard de mode principal occupe exactement une cellule logique.
- Une exception occupe un nombre entier de cellules, jamais une largeur flottante ad hoc.
- La largeur visuelle d'une touche peut être inset dans sa cellule, mais la cellule reste la base mathématique du layout.
- Les lignes ABC, Numbers, Symbols et Navigation doivent partager une grille de référence perceptible; le contenu peut changer, pas l'échelle implicite des touches.
- Les accents peuvent être centrés ou partiellement remplis, mais leur centrage doit se faire par cellules vides ou spans entiers, pas par `leadingWeight` flottant.
- `touchRect` doit couvrir la cellule logique non chevauchante, puis être clipé aux bounds visibles pour les rows scrollables/panels.
- `visualRect` peut respecter `keyHorizontalGap`, `rowVerticalGap`, `keyWidthScale`, radius, border, shadow et animations.
- `hitTest` doit utiliser uniquement `touchRect`; `drawKey`, press visuals et rendu normal doivent utiliser `visualRect`.
- Le mode compact peut utiliser un preset compact, mais il doit suivre la même règle de spans entiers.

## Links & Consequences
- `KeyboardLayoutModels.kt` devient plus contractuel: les rows ne sont plus seulement une liste pondérée de touches, elles doivent exprimer une grille.
- `WinGlowzKeyboardView.kt` doit cesser de calculer la même géométrie à plusieurs endroits avec des variations locales.
- `KeyFrame` devra porter explicitement `slotRect`, `visualRect` et `touchRect`, en gardant les flags existants liés au scroll/panel.
- `hitTest` devra lire `touchRect` plutôt que le rectangle visuel.
- Les touches de navigation avec labels longs peuvent nécessiter un rendu plus icon-first pour tenir dans une cellule standard.
- La future correction des zones mortes sera plus simple si cette spec est implémentée avant des ajustements fins de hitboxes.
- Les tests et le debug overlay deviennent importants pour prouver la géométrie, pas seulement le rendu à l'oeil.

## Documentation Coherence
- Mettre à jour le rapport d'exploration ou la doc technique Android pour indiquer que les modes principaux sont basés sur une grille stable à spans entiers.
- Ajouter au changelog de ship une note sur la cohérence des layouts clavier et la réduction des zones mortes tactiles.
- Ajouter les résultats Blacksmith et QA physique dans le log de test projet au moment de la validation, pas pendant la spec.

## Edge Cases
- Troisième ligne ABC: `Shift` et `Del` peuvent rester des exceptions, mais leur largeur doit être un span entier.
- Troisième ligne Symbols: `Esc`, symboles restants et `Del` doivent être remappés sur la même logique de cellule, sans `leadingWeight = 0.5f`.
- Numbers: les chiffres ne doivent plus être plus larges que les signes par `1.1f` vs `0.9f`; si une hiérarchie visuelle est nécessaire, elle doit être graphique, pas géométrique.
- Navigation: les actions doivent privilégier cellules standard et icônes/labels courts; une action plus large doit occuper `2x` ou plus, explicitement.
- Accents: les rows courtes doivent être centrées par cellules vides ou preset centré, pas par poids flottants.
- Rows scrollables: les cellules hors écran ne doivent jamais capter un toucher.
- Themes avec grand gap: les gaps restent visibles mais ne deviennent pas des zones mortes dans la géométrie tactile.
- Gaps verticaux près de la status bar, des suggestions et du bord clavier: ne pas capturer hors de la zone clavier active.
- Gestes commencés dans un gap désormais tactile: long press, repeat, corner gestures, space slider et scroll doivent rester déterministes.
- Compact mode: peut avoir moins de colonnes visibles, mais les spans doivent rester entiers.

## Implementation Tasks
- [ ] Tâche 1 : Définir le contrat de grille stable
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardLayoutModels.kt`
  - Action : Ajouter un modèle explicite pour les spans entiers de grille, par exemple une propriété dédiée sur les specs de touches/rows ou des helpers de construction qui produisent des spans entiers.
  - User story link : garantit que les exceptions restent mathématiques.
  - Depends on : none
  - Validate with : inspection + test ciblé sur les rows principales.
  - Notes : Conserver une compatibilité de lecture pour les rows hors scope qui utilisent encore `weight`, mais interdire les nouveaux poids flottants dans les modes principaux.

- [ ] Tâche 2 : Créer le moteur de géométrie de grille
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardGridLayoutEngine.kt`
  - Action : Créer un calcul pur qui transforme une row, ses bounds, le gap, le scale visuel et les constraints de clip en cellules contenant `slotRect`, `visualRect` et `touchRect`.
  - User story link : dissocie la logique visuelle de la logique tactile.
  - Depends on : Tâche 1
  - Validate with : tests unitaires ciblés du calcul si l'environnement de test le permet.
  - Notes : Le moteur doit éviter les allocations inutiles dans le rendu final; les tests peuvent utiliser des modèles purs.

- [ ] Tâche 3 : Brancher `drawRow` sur le moteur de grille
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action : Remplacer le calcul local `unit/slotWidth/keyWidth/keyLeft` par les cellules du moteur; dessiner avec `visualRect` et enregistrer `touchRect`.
  - User story link : rend les lignes normales cohérentes et prépare les hitboxes gapless.
  - Depends on : Tâche 2
  - Validate with : `flutter analyze` + QA visuelle ABC/Numbers/Symbols/Navigation.
  - Notes : `KeyFrame` doit évoluer pour contenir `slotRect`, `visualRect` et `touchRect`.

- [ ] Tâche 4 : Brancher `drawPanelScrollRow` sur le même moteur
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action : Supprimer la duplication du calcul pondéré et utiliser le moteur partagé pour les panel rows non horizontales.
  - User story link : évite que les panneaux gardent une logique divergente.
  - Depends on : Tâche 3
  - Validate with : QA panels Navigation/Accents/Settings non scrollables.
  - Notes : Les panels hors scope peuvent conserver des specs legacy, mais leur rendu doit passer par le même calcul quand possible.

- [ ] Tâche 5 : Adapter `hitTest` et le debug overlay
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action : Faire utiliser `touchRect` par `hitTest`; faire afficher le debug overlay de façon à distinguer au moins la zone tactile réelle du rectangle visuel.
  - User story link : rend observable la disparition des zones mortes.
  - Depends on : Tâches 3-4
  - Validate with : debug touch overlay + fast typing QA physique.
  - Notes : Le choix de style overlay doit rester léger et ne pas gêner le mode normal.

- [ ] Tâche 6 : Normaliser les rows ABC et Symbols
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardLayoutModels.kt`
  - Action : Convertir les rows Letters et Symbols vers les presets/spans de grille; supprimer les poids flottants non entiers et les `leadingWeight` arbitraires dans ces modes.
  - User story link : corrige les incohérences les plus visibles entre ABC et signes.
  - Depends on : Tâche 1
  - Validate with : comparaison visuelle ABC/Symbols + test de spans.
  - Notes : Garder le sens fonctionnel des touches; ne pas changer le comportement de `Shift`, `Del`, `Esc`, symbol page.

- [ ] Tâche 7 : Normaliser Numbers, Accents et Navigation
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardLayoutModels.kt`
  - Action : Remplacer `0.9f`, `1.1f`, `1.15f`, `1.2f` et les centrages flottants par cellules standard, cellules vides ou spans entiers.
  - User story link : rend tous les modes principaux prévisibles.
  - Depends on : Tâche 6
  - Validate with : QA mode switching rapide + test de spans.
  - Notes : Pour Navigation, préférer labels plus courts ou symboles si nécessaire plutôt que largeurs fractionnaires.

- [ ] Tâche 8 : Préparer les rows scrollables au modèle `slot/visual/touch`
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action : Adapter `drawScrollableRow` pour rester compatible avec la nouvelle `KeyFrame` et clipper les `touchRect` au viewport visible.
  - User story link : évite les régressions de la barre d'action et prépare les hitboxes gapless.
  - Depends on : Tâche 5
  - Validate with : QA action row scroll + `keyboard-action-row-scroll-affordance` non régressé.
  - Notes : Ne pas refaire l'animation de scroll dans cette spec.

- [ ] Tâche 9 : Ajouter des tests de géométrie
  - Fichier : `android/app/src/test/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardGridLayoutEngineTest.kt`
  - Action : Tester que les rows principales utilisent des spans entiers, que les cellules ne se chevauchent pas, que `visualRect` est inset dans `slotRect`, et que `touchRect` est clipé correctement.
  - User story link : protège la cohérence mathématique du clavier.
  - Depends on : Tâches 1-8
  - Validate with : test ciblé via environnement autorisé ou Blacksmith si les tests Android/Kotlin locaux ne sont pas disponibles.
  - Notes : Respecter les guardrails; ne pas lancer Gradle localement.

- [ ] Tâche 10 : Documenter la règle de grille
  - Fichier : `docs/explorations/2026-05-19-keyboard-touch-hitboxes.md`
  - Action : Mettre à jour le rapport ou ajouter une note technique liée à cette spec expliquant que les exceptions de layout sont des multiples de cellule.
  - User story link : préserve la décision produit pour les futures modifications.
  - Depends on : Tâches 1-9
  - Validate with : review doc.
  - Notes : La doc utilisateur publique n'est pas nécessaire tant que le changement reste une amélioration de ressenti.

## Acceptance Criteria
- [ ] CA 1 : Given le mode ABC non compact, when le clavier est dessiné, then les touches standard reposent sur une grille de cellules uniformes et les exceptions occupent des spans entiers.
- [ ] CA 2 : Given le mode Symbols non compact, when l'utilisateur compare la troisième ligne à ABC, then les largeurs ne reposent plus sur `leadingWeight` ou `1.2f` arbitraires mais sur la même logique de cellules/spans.
- [ ] CA 3 : Given le mode Numbers, when les lignes numériques sont dessinées, then les signes et chiffres ne changent pas de largeur par poids `0.9f/1.1f`; toute différence doit être visuelle et non géométrique.
- [ ] CA 4 : Given le mode Navigation, when les actions sont affichées, then les touches standard ont la même largeur logique que les autres modes ou une exception à span entier explicitement définie.
- [ ] CA 5 : Given une row courte Accents, when elle est centrée, then le centrage utilise cellules vides/spans entiers et pas un `leadingWeight` flottant.
- [ ] CA 6 : Given un thème avec gaps visibles, when l'utilisateur touche entre deux touches, then le hit test cible une cellule logique voisine au lieu de tomber dans une zone morte.
- [ ] CA 7 : Given le debug touch overlay activé, when le clavier est affiché, then les zones tactiles réelles sont vérifiables et ne se chevauchent pas.
- [ ] CA 8 : Given une row scrollable avec contenu hors écran, when elle est partiellement visible, then aucune touche hors viewport ne capte un toucher.
- [ ] CA 9 : Given un panneau vertical scrollable, when une ligne est masquée hors viewport, then ses touches ne captent aucun toucher.
- [ ] CA 10 : Given un geste commencé dans un gap visuel désormais couvert par une cellule, when l'utilisateur maintient, glisse ou relâche, then le long press, le repeat, les corner gestures et le scroll restent déterministes.
- [ ] CA 11 : Given un changement rapide ABC -> Symbols -> Numbers -> Navigation, when Diane observe les lignes principales, then l'impression de largeur de touche reste cohérente.
- [ ] CA 12 : Given les guardrails du repo, when la validation locale est faite, then aucun build Android/Gradle/APK/install interdit n'est exécuté.

## Test Strategy
- `flutter analyze` localement.
- Tests ciblés du moteur pur `KeyboardGridLayoutEngineTest` si possible sans Gradle local interdit; sinon validation via Blacksmith/GitHub Actions.
- Inspection du debug touch overlay sur device pour comparer `visualRect` et `touchRect`.
- QA physique Diane: fast typing ABC, comparaison ABC/Symbols troisième ligne, Numbers, Navigation, Accents, et action row scroll non régressée.
- Blacksmith/GitHub Actions pour Android compile/unit validation; local Android build/install reste interdit.

## Risks
- Les labels longs de Navigation peuvent devenir trop serrés si on force les cellules standard; mitigation: utiliser icônes ou labels courts plutôt que spans fractionnaires.
- Le changement de `KeyFrame` peut impacter press state, long press, corner gestures, scroll rows et panel rows; mitigation: brancher progressivement et tester les flows sensibles.
- Une grille trop rigide peut rendre certaines rows moins ergonomiques; mitigation: autoriser exceptions à spans entiers seulement.
- Les rows hors scope peuvent rester legacy temporairement; mitigation: les isoler clairement et ne pas les utiliser comme précédent pour les modes principaux.

## Execution Notes
- Lire d'abord `KeyboardLayoutModels.kt`, `WinGlowzKeyboardView.kt`, `KeyboardThemeModels.kt`, `docs/explorations/2026-05-19-keyboard-touch-hitboxes.md`, puis `keyboard-action-row-scroll-affordance.md`.
- Implémenter la fondation de grille avant de normaliser tous les modes, sinon les changements de rows risquent d'être une nouvelle série de tweaks manuels.
- Préférer un moteur pur testable pour la géométrie; garder le `View` custom léger et éviter les allocations dans `onDraw`.
- Ne pas modifier les comportements fonctionnels de touches sauf si un label doit être raccourci pour tenir dans une cellule.
- Stop condition: si une row principale ne peut pas être placée sans fraction et sans casser l'usage, revenir à Diane avec deux propositions de mapping plutôt que choisir arbitrairement.

## Open Questions
- None. La décision produit retenue est: grille stable par défaut, exceptions autorisées uniquement en multiples entiers de cellule.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-05-19 18:30:18 UTC | sf-spec | GPT-5 Codex | Created first foundation spec for stable Android IME grid and touch geometry. | Draft spec saved with integer-span grid contract and implementation tasks. | `/sf-ready keyboard-stable-grid-touch-geometry` |
| 2026-05-19 18:33:12 UTC | sf-spec | GPT-5 Codex + explorer subagent | Incorporated subagent review into spec invariants, edge cases and acceptance criteria. | Added explicit slot/visual/touch KeyFrame contract, vertical clipping and gesture determinism criteria. | `/sf-ready keyboard-stable-grid-touch-geometry` |
| 2026-05-19 18:43:56 UTC | sf-build | GPT-5 Codex + worker subagent | Accepted readiness inside sf-build and launched delegated sequential implementation. | Worker implementation in progress for Kotlin IME grid geometry. | Local checks, integration review, then Android CI/device QA |
| 2026-05-19 18:52:16 UTC | sf-build | GPT-5 Codex + worker subagent | Implemented stable grid geometry, visual/touch hitbox separation, integer spans, docs alignment and local checks. | Local checks passed; Android CI/device QA still pending. | Blacksmith/GitHub Actions Android validation and Diane physical-device QA |

## Current Chantier Flow

sf-spec ✅ -> sf-ready ✅ -> sf-start ✅ -> sf-verify 🔄 -> sf-end ⏳ -> sf-ship ⏳

Next step: run Blacksmith/GitHub Actions Android validation and Diane physical-device QA for tactile geometry, mode switching, panels, action-row scroll and fast typing.
