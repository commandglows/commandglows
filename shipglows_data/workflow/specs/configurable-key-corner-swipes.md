---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-05-14"
created_at: "2026-05-14 09:54:42 UTC"
updated: "2026-05-14"
updated_at: "2026-05-14 16:04:15 UTC"
status: ready
source_skill: sf-spec
source_model: "GPT-5 Codex"
scope: "feature"
owner: "Diane"
confidence: medium
user_story: "En tant qu'utilisateur Android de WinGlows qui personnalise son clavier, je veux configurer touche par touche les actions declenchees par les swipes vers les quatre coins, afin d'adapter accents, ponctuation, snippets, raccourcis systeme et macros a ma facon d'ecrire sans changer de mode."
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Android native IME"
  - "Kotlin keyboard layout builder"
  - "Kotlin keyboard touch/gesture dispatch"
  - "KeyboardKeyValue parser and modifier engine"
  - "KeyboardStateStore SharedPreferences"
  - "Android keyboard MethodChannel"
  - "Flutter keyboard domain models"
  - "Flutter keyboard preview"
  - "Flutter Settings"
  - "Snippets and dictionary text expansion"
depends_on:
  - artifact: "shipglows_data/workflow/specs/proprietary-swipe-corner-android-keyboard.md"
    artifact_version: "1.0.0"
    required_status: "ready"
  - artifact: "shipglows_data/workflow/specs/android-ime-winglowz_app-keyboard.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
supersedes: []
evidence:
  - "User request 2026-05-14: ideal behavior is to configure swipe shortcuts per key corner on the keyboard."
  - "android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardLayoutModels.kt defines KeyboardKeyGlyph with string-only topLeft/topRight/bottomLeft/bottomRight outputs."
  - "KeyboardLayoutModels.kt glyphFor() hardcodes French accent corner labels for a/e/i/o/u/c/n/s."
  - "android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt keyValueForSelection() converts non-primary corner output into KeyboardKeyValue.text(raw), so corners cannot yet dispatch snippets, actions, key events, modifiers, or macros."
  - "android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardKeyValueEngine.kt already supports Text, KeyEvent, Action, Modifier and Macro values with a parser and modifier/modmap layer."
  - "android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt persists keyboard preferences and JSON lists for snippets/clipboard, but has no persisted corner shortcut configuration."
  - "lib/features/keyboard/presentation/keyboard_preview_screen.dart hardcodes preview corners through _cornerFor() and currently exposes only two accent slots."
  - "lib/features/settings/presentation/settings_screen.dart exposes global corner toggles only: cornerModeEnabled and specialKeyCornersEnabled."
next_step: "/sf-prod winglowz_app after bounded keyboard-only ship"
---

# Title

Configurable Key Corner Swipes

# Status

Ready for implementation. This is a focused follow-up to the proprietary swipe-corner keyboard chantier: it does not rewrite the IME, it turns the current hardcoded corner accents into a configurable per-key shortcut system.

# User Story

En tant qu'utilisateur Android de WinGlows qui personnalise son clavier, je veux configurer touche par touche les actions declenchees par les swipes vers les quatre coins, afin d'adapter accents, ponctuation, snippets, raccourcis systeme et macros a ma facon d'ecrire sans changer de mode.

Acteur principal: utilisateur Android de WinGlows qui utilise le clavier natif WinGlows comme IME.

Declencheur: l'utilisateur active le mode coins, ouvre l'editeur de raccourcis des coins depuis Settings ou le panneau Preferences du clavier, choisit une touche et un coin, puis assigne une action autorisee.

Resultat observable: le clavier natif et la preview Flutter affichent les labels de coins configures; un swipe vers un coin declenche l'action configuree; la configuration persiste apres redemarrage de l'app ou du service IME.

# Minimal Behavior Contract

Quand le mode coins est active, WinGlows accepte une configuration persistante qui associe une touche stable, un coin parmi `topLeft`, `topRight`, `bottomLeft` et `bottomRight`, et une action valide du catalogue clavier. L'action peut etre du texte, un accent, une ponctuation, un snippet, une action clavier/navigation, un key event, un modifier ou une macro exprimee par le moteur `KeyboardKeyValue`. Le clavier affiche le label resolu dans le coin concerne et declenche cette action sur swipe; si aucun raccourci utilisateur n'existe, il conserve le preset ou le comportement par defaut actuel. En cas de configuration invalide, corrompue, interdite dans le contexte courant ou impossible a parser, le clavier ignore uniquement ce raccourci, affiche un etat recuperable dans les settings ou le debug, et retombe sur le default sans crash ni emission inattendue. L'edge case facile a rater est la collision avec les gestes proteges: la barre espace garde son slider de curseur, les lignes scrollables gardent leur scroll horizontal, les snippets/clipboard restent bloques dans les champs prives, et les touches speciales ne recoivent des coins que si `specialKeyCornersEnabled` l'autorise.

# Success Behavior

- Given aucun reglage utilisateur de coins n'existe, when l'utilisateur active `cornerModeEnabled`, then les accents actuels sur les lettres restent disponibles comme preset par defaut.
- Given l'utilisateur choisit la touche `letter-a` et le coin `topLeft`, when il assigne le texte `à`, then la touche `a` affiche `à` en haut gauche et un swipe haut-gauche insere `à`.
- Given l'utilisateur choisit la touche `letter-j` et le coin `bottomRight`, when il assigne un snippet `j'arrive`, then un swipe bas-droite sur `j` insere le remplacement du snippet si le contexte autorise les snippets.
- Given l'utilisateur choisit la touche `text-.-.` ou une touche de ponctuation stable, when il assigne une macro `...`, then le label de coin est rendu et le swipe declenche la macro via `KeyboardKeyValue`.
- Given un preset `French accents` est actif, when l'utilisateur modifie une seule touche, then l'override utilisateur gagne uniquement pour cette touche et les autres coins continuent a venir du preset.
- Given `cornerModeEnabled` est desactive, when l'utilisateur swipe vers un coin, then le clavier traite l'interaction comme le comportement primaire existant ou comme annulation selon le classifieur; aucun raccourci de coin n'est declenche.
- Given `specialKeyCornersEnabled` est desactive, when un raccourci est configure sur `shift`, `enter`, `ctrl`, `backspace`, `space` ou une action bar, then le label n'est pas rendu et l'action n'est pas declenchee tant que l'option n'est pas activee.
- Given la touche espace possede un raccourci de coin configure, when l'utilisateur glisse horizontalement au-dela du seuil de slider, then le slider de curseur gagne et aucun raccourci de coin ne part.
- Given la ligne snippets ou clipboard est scrollable horizontalement, when l'utilisateur scroll la ligne, then le scroll gagne sur les coins et aucun item n'est insere accidentellement.
- Given l'utilisateur change un raccourci dans Settings Flutter, when la methode native confirme l'ecriture, then le prochain statut clavier et la preview exposent la configuration sauvegardee.
- Given la preview Flutter est ouverte sur le web, when l'utilisateur selectionne un preset ou modifie une touche dans la simulation, then les coins affiches correspondent au modele de configuration et le statut indique que la preuve reste une simulation web.
- Given l'utilisateur restaure les defaults, when il confirme le reset, then les overrides utilisateur sont supprimes et le preset par defaut redevient visible.

# Error Behavior

- Si le `keyId` n'existe pas dans le layout courant, l'editeur l'affiche comme inactif ou orphelin; le runtime ignore le mapping sans supprimer la donnee utilisateur.
- Si le `KeyboardKeyValueParser` rejette une action, la sauvegarde native refuse cette entree avec une erreur recuperable; si l'entree corrompue vient du stockage, elle est ignoree a la lecture.
- Si une action de coin reference un snippet supprime, l'editeur marque le raccourci comme casse et le runtime ne declenche rien a part un feedback discret.
- Si une action de coin reference le clipboard, un snippet ou une capture interdite en champ prive, le clavier respecte `KeyboardSecurityPolicy` et refuse l'action pour ce champ.
- Si deux mappings ciblent la meme touche, le meme scope et le meme coin, le dernier override valide remplace l'ancien; aucun doublon ne doit rendre le resultat non deterministe.
- Si le JSON de configuration est absent, vide, trop grand ou invalide, le clavier charge le preset par defaut et conserve la saisie normale.
- Si un label de coin est trop long pour une touche, le rendu doit l'ellipser ou le compacter sans deplacer la grille ni masquer le label primaire.
- Si une macro partiellement executee echoue, le moteur s'arrete a l'echec, ne relance pas les actions deja faites, et affiche un statut bref; les macros dangereuses restent limitees au catalogue autorise.
- Si le bridge Flutter appelle une methode de coins sur une plateforme non Android, le resultat est `unsupported` ou simulation locale; aucun faux succes natif n'est affiche.
- Ce qui ne doit jamais arriver: texte utilisateur ou contenu de snippet/clipboard loggue en clair, crash de l'IME sur preference corrompue, emission tap primaire plus emission corner pour le meme geste, ou contournement du mode prive par un raccourci de coin.

# Problem

Le clavier WinGlows a maintenant une base native mature: layout modulaire, panneaux, scroll horizontal de snippets/clipboard, gestures, navigation, modifiers, snippets, suggestions et settings. Mais les swipes de coin restent un mecanisme semi-statique: les coins sont des strings dans `KeyboardKeyGlyph`, les accents sont hardcodes dans `glyphFor()`, la preview Flutter duplique une petite table `_cornerFor()`, et le dispatch transforme les coins en texte brut. Cela bloque exactement le comportement souhaite par l'utilisateur: choisir touche par touche si les coins servent aux accents, a la ponctuation, aux snippets, aux raccourcis de navigation, aux modifiers ou aux macros.

# Solution

Ajouter un modele de raccourci de coin type, persiste et resolu au moment de construire le layout. Le resolver combine un preset actif, les overrides utilisateur et les politiques de contexte pour produire des labels de coins et des `KeyboardKeyValue` dispatchables. La native IME reste source d'autorite pour parser, valider et executer; Flutter Settings et la preview deviennent des surfaces d'edition et de simulation branchees sur le meme contrat de donnees.

# Scope In

- Modele Kotlin pour `KeyboardCornerSlot`, `KeyboardCornerShortcut`, `KeyboardCornerPreset`, `KeyboardCornerConfig` et un resolver de raccourcis.
- Stabilisation des `KeyboardKeySpec.id` pour les touches configurables, avec IDs lisibles et durables: lettres, chiffres, ponctuation, modifiers, espace, entree, backspace, panneaux et touches systeme compatibles.
- Conservation du preset actuel d'accents francais comme configuration par defaut equivalente aux hardcodes existants.
- Presets initiaux: `French accents`, `Punctuation corners`, `French accents + punctuation`, `Developer symbols`, `No corners`.
- Overrides utilisateur par touche et par coin, au-dessus du preset actif.
- Actions autorisees via `KeyboardKeyValue`: texte, key event, action, modifier, macro.
- References snippet par id ou trigger stable, resolues en texte au runtime et invalidees proprement si le snippet disparait.
- Persistance locale native dans `KeyboardStateStore` avec JSON versionne, limites de taille, decode tolerant et reset.
- Bridge Android/Flutter pour lire, ecrire, resetter et selectionner les presets de coins.
- UI Settings Flutter pour ouvrir un editeur de coins, choisir une touche, choisir un coin, choisir une action depuis un catalogue, sauvegarder et resetter.
- Preview FlutterWeb qui affiche les coins configures et simule au moins les actions texte/snippet les plus simples.
- Rendu natif des labels de coins depuis le resolver, pas depuis des strings hardcodees.
- Dispatch natif des swipes de coins par `KeyboardKeyValue`, avec respect des modifiers, macros, actions et politiques de champ.
- Tests Kotlin et Flutter couvrant defaults, overrides, corruptions, toggles, preview et bridge.

# Scope Out

- Cloud sync multi-device des configurations de coins.
- Marketplace de layouts ou partage public de presets.
- Editeur visuel drag-and-drop complet du clavier.
- Nouveaux gestes autres que les quatre coins deja detectes.
- Glide typing, prediction avancee ou autocorrect base sur les coins.
- Gestion per-app/per-domain des mappings dans cette phase.
- Changement du moteur Android IME de base hors ce qui est necessaire pour rendre les coins configurables.

# Constraints

- Ne pas reintroduire un clavier Flutter dans l'IME natif; la surface runtime Android reste Kotlin.
- Utiliser `KeyboardKeyValue`, `KeyboardKeyValueParser`, `KeyboardKeyModifier` et `KeyboardModMap` au lieu d'un deuxieme langage de raccourcis.
- Les strings stockees sont des expressions de configuration, jamais des logs d'usage ou du texte tape par l'utilisateur.
- Les configs doivent avoir des limites: nombre d'overrides, longueur de label, longueur d'expression, profondeur de macro et taille JSON totale.
- Les IDs de touches doivent survivre aux changements de label visuel, au shift et au profil QWERTY/AZERTY quand la touche represente le meme role.
- Les gestes proteges gardent leur priorite: slider espace, scroll horizontal, long press repetition, long press clipboard full, et annulation par retour au centre.
- `specialKeyCornersEnabled` reste la barriere pour les touches non texte.
- Les champs prives continuent d'appliquer `KeyboardSecurityPolicy`; un raccourci de coin ne peut pas forcer snippets, clipboard, dictation, stats ou sync.
- Sur web, la preview est une simulation produit; elle ne prouve pas le comportement natif Android.
- Le serveur ARM local peut compiler Kotlin avec les commandes partielles deja utilisees, mais les builds Android complets peuvent rester limites par `aapt2`.

# Dependencies

- Kotlin Android native IME in `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/`.
- Flutter/Dart Settings, preview and bridge in `lib/features/keyboard/`, `lib/features/settings/`, `lib/core/platform/android_keyboard_bridge.dart`.
- Existing snippets store and bridge contract through `KeyboardTextRule` and `AndroidKeyboardTextRule`.
- Existing gesture classifier in `KeyboardGestureClassifier.kt`.
- Fresh external docs verdict: `fresh-docs not needed` for this spec because the change is internal to existing Android View/IME, MethodChannel and Flutter patterns already present in the repo. If implementation introduces new Android system APIs beyond existing key events, IME settings, input method picker or SharedPreferences, consult official Android docs before coding that slice.

# Invariants

- A missing or invalid corner config cannot break primary typing.
- User overrides win over preset values; preset values win over built-in fallback; primary tap wins when corners are disabled.
- Runtime dispatch is deterministic for one touch gesture: at most one key action per gesture.
- The native parser is the authority for executable actions.
- Labels rendered in corners are derived from the resolved action label, not copied independently.
- Private fields suppress sensitive actions even when configured.
- Defaults preserve current French accent behavior for users who do not customize anything.
- The UI cannot save actions outside the native allowlist.
- Corrupted persisted data is recoverable by fallback and reset.
- Tests must prove native and preview models do not drift for the basic presets.

# Links & Consequences

- `KeyboardLayoutModels.kt`: model shape changes from string-only glyph corners to typed corner assignments.
- `WinGlowzKeyboardView.kt`: rendering and dispatch must resolve corners through the new model and preserve gesture priority.
- `KeyboardKeyValueEngine.kt`: may need serializer helpers or parser validation wrappers for saved expressions.
- `KeyboardStateStore.kt`: stores versioned corner config and exposes read/write/reset.
- `WinGlowzInputMethodService.kt`: applies resolved config to the view and refreshes after preference changes.
- `MainActivity.kt`: MethodChannel adds corner config calls.
- `android_keyboard_bridge.dart` and `keyboard_models.dart`: expose Dart models and native bridge methods.
- `settings_screen.dart` and likely a new keyboard corner editor widget/screen: user-facing configuration.
- `keyboard_preview_screen.dart`: preview switches from hardcoded `_cornerFor()` to config-driven corner labels.
- Tests in `android/app/src/test/kotlin/...` and `test/widget_test.dart` must expand.
- Security consequence: configurable macros and actions are powerful inside an IME; allowlist, context policy and no-logging rules are mandatory.
- Perf consequence: corner resolution must happen at layout build or config-change time, not per pixel draw.
- Accessibility consequence: long labels need compact rendering and settings descriptions should remain understandable with screen readers.

# Documentation Coherence

Update or create:

- `docs/PLATFORM_BEHAVIOR.md`: mention per-key corner customization, Android-only native runtime and web-preview limitation.
- `docs/VERIFICATION.md`: add manual QA cases for presets, overrides, private fields, space slider and scrollable rows.
- `docs/COMPONENTS.md`: document the Settings editor and keyboard preview behavior if this doc remains the component inventory.
- `shipglows_data/workflow/specs/proprietary-swipe-corner-android-keyboard.md`: after implementation, record that hardcoded corner accents have been replaced by configurable shortcuts.
- User support/onboarding copy: explain that accents, punctuation and snippets can be assigned to corners and reset to defaults.

# Edge Cases

- User configures a corner on a key not present in AZERTY but present in QWERTY.
- User switches profile after configuring a key.
- User disables French language while using the French accents preset.
- User disables all presets but leaves global corner mode enabled.
- User configures all four corners of a small key with long labels.
- User configures a modifier or action on a letter then presses another modifier before swiping.
- User swipes a key in a scrollable row.
- User swipes space diagonally when horizontal slider could also start.
- User long-presses a repeating key and moves toward a corner before release.
- User imports or pastes malformed JSON through a future debug route.
- Snippet referenced by a corner is edited, renamed or deleted.
- Private field suppresses snippet/clipboard action but should still allow normal accent text.
- Macro contains an unsupported key event on the current device.
- Preview web config diverges from native parser because Dart cannot parse the full grammar.
- Android process restarts while Settings writes a config.

# Implementation Tasks

- [ ] Tache 1 : Stabiliser l'inventaire des touches configurables
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardLayoutModels.kt`
  - Action : Auditer les `KeyboardKeySpec.id`, normaliser les IDs instables de `textKey()`, et documenter les IDs configurables par role (`letter-a`, `digit-1`, `text-comma`, `modifier-ctrl`, `space`, `enter`, `backspace`, etc.).
  - User story link : permet a l'utilisateur de retrouver la meme touche apres restart, changement de label ou changement de profil.
  - Depends on : none.
  - Validate with : `./gradlew :app:testDebugUnitTest --tests '*KeyboardLayoutBuilderTest*'` on a compatible Android/JVM runner; local fallback `./gradlew :app:compileDebugKotlin -x :app:processDebugResources -x :app:processDebugManifest -x :app:compileFlutterBuildDebug`.
  - Notes : eviter de casser les IDs deja utilises par les tests sans migration explicite.

- [ ] Tache 2 : Ajouter le modele Kotlin de configuration de coins
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardCornerShortcuts.kt`
  - Action : Creer les enums/data classes `KeyboardCornerSlot`, `KeyboardCornerShortcut`, `KeyboardCornerPreset`, `KeyboardCornerConfig`, les limites de taille, et les helpers label/value.
  - User story link : definit ce qu'un utilisateur peut assigner a chaque coin.
  - Depends on : Tache 1.
  - Validate with : nouveau test pur Kotlin `KeyboardCornerShortcutsTest`.
  - Notes : les actions executees doivent etre des `KeyboardKeyValue`, pas des callbacks ad hoc.

- [ ] Tache 3 : Migrer le preset d'accents hardcode vers un preset declaratif
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardCornerShortcuts.kt`
  - Action : Reproduire `glyphFor()` comme preset `French accents` avec les memes sorties: a/e/i/o/u/c/n/s, y compris les slots bottom existants.
  - User story link : aucun utilisateur ne perd le comportement actuel en activant les coins.
  - Depends on : Tache 2.
  - Validate with : test qui compare les labels attendus a/e/u/c/n/s avec le comportement actuel.
  - Notes : inclure des presets additionnels sans les activer par defaut.

- [ ] Tache 4 : Ajouter le resolver de coins
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardCornerShortcutResolver.kt`
  - Action : Combiner preset actif, overrides utilisateur, `cornerModeEnabled`, `specialKeyCornersEnabled`, touche courante, mode/layout et politique de champ pour retourner les coins rendus et dispatchables.
  - User story link : transforme la configuration utilisateur en comportement visible et executable.
  - Depends on : Taches 2 et 3.
  - Validate with : tests resolver pour override, fallback, special keys disabled, private-field-sensitive action disabled.
  - Notes : ne pas resoudre les corners a chaque `drawText`; le snapshot doit porter le resultat.

- [ ] Tache 5 : Remplacer les corners string-only dans le layout snapshot
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardLayoutModels.kt`
  - Action : Ajouter aux specs de touches des assignments de coins resolus et faire produire ces assignments par `KeyboardLayoutBuilder.build()`.
  - User story link : le clavier affiche les raccourcis configures au bon endroit.
  - Depends on : Tache 4.
  - Validate with : `KeyboardLayoutBuilderTest` et nouveau test de snapshot configuré.
  - Notes : garder `KeyboardKeyGlyph.primary` ou remplacer prudemment, mais supprimer la dependance aux sorties secondaires string-only pour le dispatch.

- [ ] Tache 6 : Dispatcher les swipes de coin via `KeyboardKeyValue`
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action : Modifier `shouldRenderCorners()`, `renderCornerGlyphs()`, `effectiveGestureSelection()` et `keyValueForSelection()` pour utiliser les assignments resolus; preserver space slider, scroll horizontal, long press et annulation.
  - User story link : un swipe sur le coin declenche l'action choisie, pas seulement du texte brut.
  - Depends on : Tache 5.
  - Validate with : tests Kotlin existants plus test manuel/debug overlay sur emulator ou device Android.
  - Notes : pour les actions snippet/clipboard, passer par les callbacks existants ou par `KeyboardKeyValue.action` quand l'action existe.

- [ ] Tache 7 : Persister et valider la config native
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`
  - Action : Ajouter `cornerConfig()`, `replaceCornerConfig()`, `resetCornerConfig()`, encodage JSON versionne, decode tolerant et limites.
  - User story link : les raccourcis personnalises restent apres restart.
  - Depends on : Tache 2.
  - Validate with : tests de read/write/corrupt JSON; compile Kotlin.
  - Notes : suivre le pattern JSON existant des snippets/clipboard, mais ne pas stocker d'historique d'usage.

- [ ] Tache 8 : Brancher le service IME sur la config resolue
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzInputMethodService.kt`
  - Action : Charger la config depuis `KeyboardStateStore`, la passer a `WinGlowzKeyboardView.applyRuntimePreferences()`, et rafraichir apres changements de preferences.
  - User story link : le clavier natif utilise immediatement la config sauvegardee.
  - Depends on : Taches 4, 5 et 7.
  - Validate with : compile Kotlin et sanity manuel en IME.
  - Notes : en champ prive, appliquer les politiques au moment du resolver ou du dispatch.

- [ ] Tache 9 : Exposer les methodes MethodChannel
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt`
  - Action : Ajouter `getKeyboardCornerConfig`, `setKeyboardCornerConfig`, `resetKeyboardCornerConfig`, `setKeyboardCornerPreset` et erreurs parse/validation lisibles.
  - User story link : Settings Flutter peut lire et modifier la configuration reelle du clavier.
  - Depends on : Tache 7.
  - Validate with : compile Kotlin; tests Dart bridge avec MethodChannel mock.
  - Notes : ne pas melanger cette config dans le status minimal si le payload devient lourd.

- [ ] Tache 10 : Ajouter les modeles et bridge Dart
  - Fichier : `lib/features/keyboard/domain/keyboard_models.dart`
  - Action : Ajouter `KeyboardCornerSlot`, `AndroidKeyboardCornerShortcut`, `AndroidKeyboardCornerConfig`, presets et parsing depuis map.
  - User story link : l'app represente la meme configuration que le natif.
  - Depends on : Tache 9.
  - Validate with : `flutter test test/widget_test.dart` ou tests unitaires dedies.
  - Notes : garder les valeurs compatibles avec les enums Kotlin.

- [ ] Tache 11 : Ajouter les appels bridge Flutter
  - Fichier : `lib/core/platform/android_keyboard_bridge.dart`
  - Action : Ajouter les methodes pour lire/ecrire/resetter les configs et retourner des erreurs `AndroidKeyboardBridgeException` en cas de validation native refusee.
  - User story link : l'editeur sauvegarde vraiment les coins du clavier.
  - Depends on : Taches 9 et 10.
  - Validate with : tests MethodChannel mock.
  - Notes : sur plateforme non Android, retourner unsupported ou config de simulation sans side effect natif.

- [ ] Tache 12 : Construire l'editeur Settings des coins
  - Fichier : `lib/features/settings/presentation/settings_screen.dart`
  - Action : Ajouter une entree "Corner shortcuts" dans la section clavier et ouvrir un editeur permettant preset, liste de touches, choix de coin, choix d'action, sauvegarde et reset.
  - User story link : l'utilisateur peut configurer touche par touche sans editer du JSON.
  - Depends on : Taches 10 et 11.
  - Validate with : `flutter test test/widget_test.dart`; test widget pour selection preset et modification d'un coin.
  - Notes : si le fichier devient trop gros, extraire `lib/features/keyboard/presentation/keyboard_corner_shortcuts_screen.dart` et ajouter une route dans `lib/core/router/app_router.dart`.

- [ ] Tache 13 : Mettre la preview Flutter sur le meme modele
  - Fichier : `lib/features/keyboard/presentation/keyboard_preview_screen.dart`
  - Action : Remplacer `_cornerFor()` par une config de coins simulee, afficher les quatre coins, simuler texte/snippet, et indiquer les actions natives non simulables.
  - User story link : l'utilisateur peut tester rapidement l'aspect et les bases sur Vercel.
  - Depends on : Tache 10.
  - Validate with : `flutter test test/widget_test.dart`; verifier web preview manuellement apres build.
  - Notes : la preview ne doit pas pretendre valider key events Android ou politiques IME natives.

- [ ] Tache 14 : Couvrir les tests natifs de dispatch et regression
  - Fichier : `android/app/src/test/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardCornerShortcutsTest.kt`
  - Action : Ajouter tests pour parser/serializer, resolver, defaults, overrides, corrupt JSON, special keys, private policy, et macro via `KeyboardKeyValue`.
  - User story link : garantit que la personnalisation ne casse pas la saisie.
  - Depends on : Taches 2 a 8.
  - Validate with : `./gradlew :app:testDebugUnitTest --tests '*KeyboardCornerShortcutsTest*'` sur runner compatible; compile Kotlin local en fallback.
  - Notes : si les tests Android complets restent bloques par ARM/aapt2, documenter le fallback exact dans le rapport.

- [ ] Tache 15 : Aligner docs et verification
  - Fichier : `docs/VERIFICATION.md`
  - Action : Ajouter checklist manuelle pour presets, override, reset, space slider, scroll horizontal, private fields, settings bridge, preview web.
  - User story link : donne une procedure claire pour verifier que les coins configurables marchent vraiment.
  - Depends on : Taches 12 a 14.
  - Validate with : revue docs + execution des commandes de test disponibles.
  - Notes : mettre a jour `docs/PLATFORM_BEHAVIOR.md` et `docs/COMPONENTS.md` dans la meme passe si ces docs decrivent deja le clavier.

# Acceptance Criteria

- [ ] CA 1 : Given aucun override utilisateur, when `cornerModeEnabled` est active, then les accents francais actuels sont rendus et inseres comme avant.
- [ ] CA 2 : Given un override `letter-a/topLeft -> à`, when l'utilisateur swipe haut-gauche sur `a`, then `à` est insere et le tap primaire reste `a`.
- [ ] CA 3 : Given un override macro valide, when le coin est swippe, then la macro passe par `KeyboardKeyValue` et les modifiers existants sont respectes.
- [ ] CA 4 : Given une action de snippet configuree, when le champ est standard, then le snippet est insere; when le champ est prive, then l'action est refusee sans insertion.
- [ ] CA 5 : Given `specialKeyCornersEnabled` est false, when un coin configure sur une touche speciale est swippe, then aucune action speciale n'est executee.
- [ ] CA 6 : Given `specialKeyCornersEnabled` est true, when un coin configure sur une touche speciale autorisee est swippe, then l'action configuree est executee sauf geste protege.
- [ ] CA 7 : Given un swipe horizontal sur espace, when le seuil slider est atteint, then le curseur bouge et le coin configure sur espace ne part pas.
- [ ] CA 8 : Given une ligne snippets ou clipboard scrollable, when l'utilisateur scroll horizontalement, then aucun item ni coin n'est declenche.
- [ ] CA 9 : Given une config JSON corrompue, when le clavier s'ouvre, then il charge les defaults et ne crashe pas.
- [ ] CA 10 : Given un utilisateur change de preset dans Settings, when la sauvegarde native reussit, then le statut/bridge renvoie le nouveau preset et le clavier l'utilise au prochain refresh.
- [ ] CA 11 : Given un label de coin long, when la touche est rendue, then le label reste dans son coin sans casser la grille ni masquer le label primaire.
- [ ] CA 12 : Given la preview FlutterWeb utilise un preset, when les touches sont affichees, then les coins visibles correspondent au modele Dart et non a `_cornerFor()` hardcode.
- [ ] CA 13 : Given le reset defaults est confirme, when l'utilisateur revient au clavier, then les overrides ont disparu et le preset par defaut est revenu.
- [ ] CA 14 : Given une plateforme non Android, when Settings appelle le bridge de config de coins, then l'app ne pretend pas avoir modifie l'IME natif.

# Test Strategy

- Unit Kotlin: resolver, serializer, parser validation, defaults, overrides, corrupt JSON, protected gestures and field policy.
- Existing Kotlin regression: `KeyboardLayoutBuilderTest`, `KeyboardGestureClassifierTest`, `KeyboardKeyValueEngineTest`.
- Flutter unit/widget: bridge model parsing, Settings editor happy path/error path, preview rendering and simulated insertion.
- Manual Android QA: active IME in normal text field, private/password field, QWERTY/AZERTY switch, space slider, snippets/clipboard rows, reset defaults.
- Manual web QA: Vercel FlutterWeb preview shows presets and custom corners, with clear simulation language.
- Commands:
  - `flutter test test/widget_test.dart`
  - `flutter analyze`
  - `./gradlew :app:compileDebugKotlin -x :app:processDebugResources -x :app:processDebugManifest -x :app:compileFlutterBuildDebug`
  - On compatible Android/JVM runner: `./gradlew :app:testDebugUnitTest`
  - `git diff --check`

# Risks

- Security: macros and actions in an IME can trigger powerful behavior. Mitigation: native allowlist, parser validation, field policy, no logging, no hidden clipboard/snippet execution in private fields.
- Data integrity: corrupt config could brick typing. Mitigation: fallback to defaults and reset path.
- UX: too much configurability can be hard to understand. Mitigation: presets first, per-key editor second, advanced action expressions hidden behind a safer catalog.
- Drift: native and preview could diverge. Mitigation: shared shape in Dart/Kotlin and tests for key presets.
- Gesture collisions: corners can conflict with space slider, scroll rows and long press. Mitigation: explicit priority order and acceptance tests.
- Performance: resolving actions in draw loops could hurt typing. Mitigation: resolve at snapshot/config-change time.
- Build environment: full Android tests may be blocked on ARM/aapt2. Mitigation: keep pure Kotlin tests where possible and compile with the known partial Gradle command locally.

# Execution Notes

- Lire d'abord `KeyboardLayoutModels.kt`, `WinGlowzKeyboardView.kt`, `KeyboardKeyValueEngine.kt`, `KeyboardStateStore.kt` et `keyboard_preview_screen.dart`.
- Commencer par les fondations Kotlin: IDs stables, modeles de coins, preset d'accents, resolver. Ne pas commencer par l'UI Settings.
- Garder le preset par defaut strictement equivalent au comportement actuel avant d'ajouter des presets nouveaux.
- Toute action executable doit passer par `KeyboardKeyValue` ou une action existante; eviter un deuxieme dispatcher parallele.
- Implementer l'UI avec un catalogue simple en premier: accents/ponctuation/snippets/actions clavier. Ajouter l'expression avancee seulement si elle reste validee cote natif.
- Stop condition: si une action souhaitee exige une API Android nouvelle ou une permission non deja presente, sortir ce cas dans une spec separee ou consulter les docs officielles avant de l'inclure.
- Fresh docs: `fresh-docs not needed` pour la spec actuelle tant que l'implementation reste sur les APIs deja presentes.

# Open Questions

None.

# Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-05-14 09:54:42 UTC | sf-spec | GPT-5 Codex | Created spec for configurable per-key corner swipe shortcuts. | Draft spec saved. | /sf-ready Configurable Key Corner Swipes |
| 2026-05-14 11:01:54 UTC | sf-ready | GPT-5 Codex | Reviewed structure, user-story alignment, task order, documentation coherence, adversarial risks and security posture. | ready | /sf-start Configurable Key Corner Swipes |
| 2026-05-14 11:24:18 UTC | sf-build | GPT-5 Codex + worker | Implemented configurable corner shortcuts across native Kotlin IME, Android MethodChannel, Dart bridge/models, Settings editor, FlutterWeb preview, tests and docs; local Flutter checks and Kotlin compile proof passed, while full Android unit/resource test remains blocked by AAPT2 on ARM and unrelated dirty auth files block safe ship orchestration. | partial | Resolve ship scope around unrelated auth files, then /sf-end or /sf-ship Configurable Key Corner Swipes |
| 2026-05-14 16:04:15 UTC | sf-ship | GPT-5 Codex | Shipped a bounded keyboard-only commit after explicit user confirmation; excluded unrelated dirty auth files from staging. | shipped | /sf-prod winglowz_app to inspect the Vercel preview before browser QA |

# Current Chantier Flow

- sf-spec: done, draft written in `shipglows_data/workflow/specs/configurable-key-corner-swipes.md`.
- sf-ready: ready; scope, security, documentation coherence and implementation order accepted.
- sf-start: implemented inside `sf-build`; native Kotlin resolves preset/override corner assignments, dispatches corners through `KeyboardKeyValue`, persists config locally and exposes MethodChannel calls; Flutter models, bridge, Settings editor and preview are wired.
- sf-verify: local verification passed inside `sf-build` with `flutter analyze`, `flutter test test/widget_test.dart`, `git diff --check` and Kotlin compile with Android resource tasks excluded. Full `:app:testDebugUnitTest` still blocks at AAPT2 on this ARM runner, matching the known environment limit.
- sf-end: not launched in this quick ship; no TASKS.md or CHANGELOG.md closeout was requested.
- sf-ship: shipped as a bounded keyboard-only scope after explicit user confirmation; unrelated dirty auth files remain excluded.

Prochaine commande recommandee: `/sf-prod winglowz_app` to inspect the matching Vercel preview before browser QA.
