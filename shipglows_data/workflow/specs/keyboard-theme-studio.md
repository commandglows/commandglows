---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "winglowz_app"
created: "2026-05-15"
created_at: "2026-05-15 19:09:11 UTC"
updated: "2026-05-15"
updated_at: "2026-05-15 19:14:52 UTC"
status: ready
source_skill: sf-spec
source_model: "GPT-5 Codex"
scope: "feature"
owner: "Diane"
confidence: medium
user_story: "En tant qu'utilisateur Android power user, je veux personnaliser entièrement le thème visuel et les effets du clavier WinGlows, afin d'avoir un clavier utile, expressif et adapté à mon style sans sacrifier la lisibilité ni la performance."
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Flutter Settings"
  - "Flutter keyboard preview"
  - "Android InputMethodService"
  - "Android custom View Canvas rendering"
  - "Android Photo Picker / app-private image storage"
  - "MethodChannel winglowz_app/keyboard"
depends_on:
  - artifact: "shipglows_data/business/product.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/business/branding.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/architecture.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/guidelines.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "docs/technical/android-native.md"
    artifact_version: "0.1.0"
    required_status: "draft"
supersedes: []
evidence:
  - "User request 2026-05-15: wants configurable keyboard color themes, gradients, custom images, borders, shadows, press effects such as fireworks, scale, shake, pulse and ease-out."
  - "android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt currently renders keyboard colors and press state directly through Canvas Paint objects."
  - "android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt persists non-sensitive IME preferences and already round-trips JSON configs for corner shortcuts."
  - "lib/features/keyboard/presentation/keyboard_corner_shortcuts_screen.dart already implements a draft-before-save visual keyboard editor pattern."
  - "Android official docs: property animations support duration, interpolators, repeat behavior, ValueAnimator and AnimatorUpdateListener."
  - "Android official docs: Android recommends Photo Picker for privacy-preserving image selection without broad storage permissions; URI access can be temporary."
next_step: "/sf-start Keyboard Theme Studio"
---

## Title
Keyboard Theme Studio

## Status
Ready for implementation after `sf-ready` on 2026-05-15. This is intentionally a full spec because the feature spans Flutter UI, native Android rendering, persistent config, image handling, accessibility, performance, and documentation.

## User Story
En tant qu'utilisateur Android power user, je veux personnaliser entièrement le thème visuel et les effets du clavier WinGlows, afin d'avoir un clavier utile, expressif et adapté à mon style sans sacrifier la lisibilité ni la performance.

## Minimal Behavior Contract
L'utilisateur ouvre une page dédiée au thème du clavier, choisit un preset ou modifie un thème en brouillon, voit immédiatement une preview fidèle, puis sauvegarde pour appliquer le rendu au clavier Android natif. La feature accepte des couleurs, dégradés, tailles de bordures, ombres, rayon des touches, styles de texte, transparence, effets d'appui et une image de fond locale importée explicitement par l'utilisateur; elle produit une configuration versionnée persistée localement et appliquée au prochain rendu du clavier. Si une valeur est invalide, trop lourde, illisible, inaccessible ou non supportée par l'appareil, la sauvegarde est refusée avec une explication et le thème précédemment actif reste intact. L'edge case facile à oublier est qu'un thème spectaculaire peut rendre le clavier inutilisable dans un champ sensible ou sur un téléphone lent: le système doit donc garder un fallback lisible, limiter les effets coûteux, et ne jamais dépendre d'une image dont l'accès URI peut expirer.

## Success Behavior
- Depuis Settings ou la page Keyboard, l'utilisateur ouvre `Keyboard Theme Studio` et voit un éditeur avec presets, preview clavier, contrôles de couleurs, contrôles d'effets et actions `Save`, `Discard`, `Reset`.
- Quand l'utilisateur change une couleur, un dégradé, une bordure, une ombre ou un effet, la preview Flutter se met à jour en brouillon sans modifier le clavier natif tant que `Save` n'est pas pressé.
- Quand l'utilisateur sauvegarde un thème valide, `AndroidKeyboardBridge` envoie une config JSON versionnée à Android, `KeyboardStateStore` la persiste, et le clavier déjà ouvert se redessine ou le prochain clavier ouvert reprend ce thème.
- Quand l'utilisateur choisit une image de fond, l'app utilise un sélecteur système Android, copie ou décode l'image vers un fichier privé de l'app, stocke seulement une référence locale contrôlée, puis applique l'image comme fond si elle respecte les limites de taille et de mémoire.
- Quand l'utilisateur active un effet d'appui comme `scale`, `shake`, `pulse`, `ripple`, `confetti` ou `fireworks`, l'effet se déclenche sur la touche appuyée, respecte `reduce motion` / accessibilité animations désactivées, et revient à l'état normal après la durée configurée.
- Une réussite est vérifiable par inspection du statut clavier, par un test de round-trip JSON, par une preview Flutter, par `:app:compileDebugKotlin`, et par test manuel Android sur un champ texte réel.

## Error Behavior
- Si le JSON importé ou reçu par Android est invalide, inconnu, trop volumineux ou hors version supportée, Android refuse la config, renvoie une erreur explicite et conserve le thème actif.
- Si une couleur rend le texte trop peu contrasté, la sauvegarde affiche une erreur ou une correction proposée; elle ne doit pas enregistrer un thème illisible par défaut.
- Si l'image sélectionnée est trop grande, inaccessible, non image, corrompue, ou perd son accès URI, l'import échoue ou retombe sur le fond précédent sans crash du clavier.
- Si un effet coûte trop cher, si l'appareil est en mode réduction d'animations, ou si le clavier est dans un contexte privé/sensible, l'effet doit être désactivé ou réduit selon la policy, avec un état UI visible.
- Si le MethodChannel est indisponible parce que la plateforme n'est pas Android ou que l'IME n'est pas accessible, la page reste en simulation et explique que la sauvegarde native est Android-only.
- Le système ne doit jamais logger le contenu tapé, le texte du presse-papier, le chemin complet d'une image privée, les données binaires d'image, ni une config contenant des payloads excessifs.

## Problem
Le clavier WinGlows commence à devenir un vrai outil de productivité, mais son apparence est encore traitée comme un paramètre global basique. Même après la synchronisation light/dark, l'utilisateur ne peut pas créer une identité visuelle forte, régler les détails de lisibilité, ni choisir des effets d'appui expressifs. Le risque est de continuer à empiler des toggles dans Settings alors que ce besoin mérite un studio dédié avec preview, presets, import/export, garde-fous de performance et un contrat natif stable.

## Solution
Créer une page dédiée `Keyboard Theme Studio` qui reprend le modèle de l'éditeur corner shortcuts: brouillon local, preview interactive, presets, validation, import/export JSON, puis sauvegarde native via `winglowz_app/keyboard`. Côté Android, remplacer `NativeKeyboardColors` par une configuration `KeyboardThemeConfig` versionnée capable de dessiner fonds solides, dégradés, image locale privée, touches, bordures, ombres et animations d'appui bornées.

## Scope In
- Page Flutter dédiée au thème du clavier, accessible depuis `Settings > Appearance`, `Settings > WinGlows Keyboard`, la page `/keyboard`, et le bouton natif `Theme` du panel settings clavier.
- Modèle Dart `KeyboardThemeConfig` versionné avec presets, validation, import/export JSON, copy/reset/discard/save.
- Modèle Kotlin équivalent `KeyboardThemeConfig` avec parsing JSON robuste, fallback safe et limites de taille.
- Presets livrés en v1: `System`, `WinGlows Light`, `WinGlows Dark`, `Neon Terminal`, `Glass Mint`, `Sunset Gradient`, `Midnight Aurora`, `Paper Ink`, `Pixel Candy`, `Minimal Contrast`.
- Personnalisation v1: fond solide, dégradé linéaire, dégradé radial simple, image locale privée, couleur/alpha des touches, couleur/alpha des touches spéciales, active/pressed/disabled, texte, label corner, status, bordure, rayon, shadow, gaps visuels si supportés sans casser le layout, effet d'appui, durée, intensité, easing.
- Effets d'appui v1: `none`, `scale`, `pulse`, `shake`, `ripple`, `glow`, `confetti-lite`, `fireworks-lite`.
- Prévisualisation Flutter fidèle pour couleurs, dégradés, bordures, ombres et une simulation des effets.
- Application native dans `WinGlowzKeyboardView` avec animations Canvas bornées à la touche active et invalidation limitée.
- Import d'image Android privacy-first via Photo Picker ou sélecteur système, copie/downsample dans stockage privé app, suppression de l'ancienne image non utilisée.
- Diagnostic Settings incluant preset/theme id, source de fond, effet actif, config size et fallback status.
- Tests unitaires Dart/Kotlin pour parse/validation/fallback/round-trip et tests widget pour draft/save/import/export.
- Documentation Android native + composants mise à jour.

## Scope Out
- Pas de marketplace de thèmes ni partage cloud public en v1.
- Pas de synchronisation remote des images de fond en v1; les images restent locales à l'appareil.
- Pas d'éditeur vectoriel avancé, particules programmables libres ou scripts d'effets user-defined.
- Pas de fonts custom importées par l'utilisateur en v1.
- Pas de thème par application hôte en v1.
- Pas de pack d'animations Lottie ou moteur graphique externe en v1.
- Pas de promesse de rendu identique pixel-perfect entre preview Flutter et Canvas Android; la preview doit être comportementalement fidèle et signaler les différences natives.

## Constraints
- Android IME reste natif, léger et privacy-aware; il ne doit pas dépendre d'un backend ni d'une UI Flutter au moment de rendre le clavier.
- La config native doit rester non sensible et bornée; la limite recommandée v1 est 48 KB JSON hors image, avec validation stricte avant persistance.
- Les images doivent être copiées/downsamplées en stockage privé app pour éviter les URI expirées et les permissions larges.
- Les animations doivent être désactivables, courtes par défaut, et compatibles avec les paramètres système de réduction d'animation.
- Le clavier doit rester lisible: contraste minimum recommandé de 4.5:1 pour labels principaux ou fallback automatique vers texte clair/foncé contrôlé.
- Les champs privés détectés par `KeyboardSecurityPolicy` doivent pouvoir forcer un thème discret si les effets ou images sont trop distractifs.
- Aucun ajout de permission de stockage large ne doit être fait pour importer une image de fond.
- Les anciens thèmes `system/light/dark` doivent migrer sans casser les préférences existantes.
- Les tests Android complets peuvent rester bloqués localement par l'incident `aapt2`; `:app:compileDebugKotlin -x :app:processDebugResources` reste une preuve locale acceptable, avec device QA obligatoire.

## Dependencies
- Flutter/Dart: `flutter_riverpod`, `go_router`, `Material`, patterns existants de `KeyboardCornerShortcutsScreen` et `KeyboardPreviewScreen`.
- Android/Kotlin: `InputMethodService`, `View`, `Canvas`, `Paint`, `Shader`, `LinearGradient`, `RadialGradient`, `BitmapFactory`, `ValueAnimator` ou boucle d'invalidation bornée pour effets.
- Android image import: Photo Picker ou intent système équivalent sans permission large, puis copie en stockage privé app.
- Official docs consulted:
  - Android Property Animation Overview, https://developer.android.com/develop/ui/views/animations/prop-animation, fresh-docs checked 2026-05-15: duration, interpolation, repeat behavior, `ValueAnimator` and update listeners are supported primitives.
  - Android Selected Photos Access / Photo Picker guidance, https://developer.android.com/about/versions/14/changes/partial-photo-video-access, fresh-docs checked 2026-05-15: Photo Picker is recommended for privacy without broad storage permissions; URI access can be temporary, so copied private storage is required for durable keyboard backgrounds.
  - Android `MediaStore.ACTION_PICK_IMAGES` reference, https://developer.android.com/reference/android/provider/MediaStore.html, fresh-docs checked 2026-05-15: Photo Picker intents return content URIs with permission checks and constraints.

## Invariants
- Existing text input behavior, corner shortcuts, media controls, snippets, clipboard, suggestions, navigation, private mode and field context behavior must not regress.
- `KeyboardStateStore` remains the native source of truth for IME preferences.
- Flutter remains the authoring surface; Android remains the rendering authority.
- A failed save never corrupts the active theme.
- Corrupt stored theme JSON falls back to a safe preset and exposes the fallback in status/diagnostic.
- Theme config stores no typed text, selected text, clipboard content, voice content, auth ids, API keys, or remote user identifiers.
- Private fields never enable additional capture/sync because of a theme effect.
- Import/export JSON excludes image bytes; it may include preset id and a local image reference only if clearly marked non-portable.
- Authorized actor is the local app user on the current Android device; no remote auth, tenant, admin role, or backend authorization is involved in v1 because theme data and imported images remain local-only.
- All untrusted inputs are bounded before native persistence: imported JSON, MethodChannel payloads, color values, enum names, image URI metadata, decoded image dimensions and animation numeric values.
- Logs and diagnostics may include preset id, config version, fallback reason and validation error codes, but never typed text, clipboard content, image bytes, full private file paths, external URIs, account ids or API keys.

## Links & Consequences
- `lib/core/router/app_router.dart`: add a route or shell tab navigation path for a dedicated theme studio if not nested under Settings.
- `lib/features/settings/presentation/settings_screen.dart` and sections: add clear entry points without making Settings more cluttered.
- `lib/features/keyboard/presentation/keyboard_preview_screen.dart` and widgets: preview must accept a theme config and render it.
- `lib/features/keyboard/presentation/keyboard_corner_shortcuts_screen.dart`: reuse design patterns, not code copy-paste that creates divergent editors.
- `lib/features/keyboard/domain/keyboard_models.dart`: add Dart config models adjacent to existing keyboard config models.
- `lib/core/platform/android_keyboard_bridge.dart`: extend MethodChannel with get/set/reset/import/export theme methods.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt`: handle theme config bridge and image import result.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`: persist active theme JSON and image metadata.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`: render theme and effects.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzInputMethodService.kt`: apply runtime preferences and react to theme preference changes.
- Docs must make Android-only and local-image-local-only constraints explicit.

## Documentation Coherence
- Update `docs/technical/android-native.md` with the keyboard theme config contract, image import storage behavior, animation constraints and validation checklist.
- Update `docs/COMPONENTS.md` with `KeyboardThemeStudioScreen`, theme preview responsibilities and bridge contract.
- Update `docs/PLATFORM_BEHAVIOR.md` if it describes Android-only keyboard limitations.
- Update `shipglows_data/technical/code-docs-map.md` to point to the new theme model and editor.
- Add changelog entry if the project maintains user-facing release notes.
- No pricing, SEO, public marketing, or auth docs change is required for v1 because this is local UI/native behavior and not a monetized/cloud feature.

## Edge Cases
- Theme JSON is valid JSON but contains unknown enum values: fallback per field, not total crash.
- User imports a huge panoramic image: reject or downsample to bounded dimensions before save.
- Image URI works immediately but expires later: native render must use private copied file, not external URI.
- User selects transparent text on transparent key: contrast validator blocks save or applies explicit text fallback.
- User enables fireworks on every key and types quickly: effect queue must cap particles and drop old effects.
- Android reduce-motion is enabled: effects collapse to `none` or `glow` depending config.
- Battery saver or low-end device stutters: effects must be bounded and optionally auto-degraded.
- Private/password field opens: background image/effects may be replaced by discreet private fallback if configured.
- Import/export across devices includes a local image path that does not exist: config loads but image background falls back with a warning.
- App theme is dark but keyboard theme is custom light: custom theme wins unless user selects `follow_app` or `system` preset.
- Existing `themeMode` preference from the dark-sync fix exists but no custom theme config exists: migrate to a preset without data loss.

## Implementation Tasks
- [ ] Tâche 1 : Définir le contrat thème Dart versionné
  - Fichier : `lib/features/keyboard/domain/keyboard_models.dart`
  - Action : Ajouter `KeyboardThemeConfig`, `KeyboardThemePreset`, `KeyboardThemeBackground`, `KeyboardThemeKeyStyle`, `KeyboardThemeTextStyle`, `KeyboardThemePressEffect`, validation, defaults, presets, `fromMap`, `toMap`, `copyWith`.
  - User story link : Permettre à l'utilisateur de configurer tout le thème de façon persistable.
  - Depends on : Aucun.
  - Validate with : Tests unitaires Dart de parse, round-trip, validation des couleurs, valeurs hors limites et fallback.
  - Notes : Garder un schéma JSON compact, versionné, et extensible; ne pas stocker d'image bytes.

- [ ] Tâche 2 : Définir le contrat thème Kotlin équivalent
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardThemeModels.kt`
  - Action : Créer les data classes/parsers Kotlin pour le même schéma, avec defaults sûrs, validateurs et conversion vers couleurs/mesures natives.
  - User story link : Assurer que le clavier natif applique exactement la configuration sauvée.
  - Depends on : Tâche 1.
  - Validate with : Tests JUnit Kotlin `KeyboardThemeModelsTest` pour JSON valide, JSON corrompu, valeurs inconnues, limites de taille et fallback.
  - Notes : Nouveau fichier recommandé pour éviter de surcharger `KeyboardStateStore` ou `WinGlowzKeyboardView`.

- [ ] Tâche 3 : Étendre `KeyboardStateStore` pour stocker le thème actif
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`
  - Action : Ajouter clés `KEY_THEME_CONFIG`, `KEY_THEME_IMAGE_PATH`, méthodes `themeConfig()`, `replaceThemeConfig()`, `resetThemeConfig()`, migration depuis `themeMode` vers preset system/light/dark.
  - User story link : Sauvegarde durable et fallback sûr du thème.
  - Depends on : Tâche 2.
  - Validate with : Tests Kotlin du store si harness disponible; sinon test parser + sanity compile.
  - Notes : Limiter la taille JSON; supprimer les anciennes images privées inutilisées quand une nouvelle image remplace l'ancienne.

- [ ] Tâche 4 : Étendre le bridge Flutter/Android pour le thème
  - Fichier : `lib/core/platform/android_keyboard_bridge.dart`
  - Action : Ajouter `getKeyboardThemeConfig`, `setKeyboardThemeConfig`, `resetKeyboardThemeConfig`, `importKeyboardThemeImage`, types d'erreurs et mapping vers modèle Dart.
  - User story link : Relier l'éditeur Flutter au clavier Android.
  - Depends on : Tâches 1 et 3.
  - Validate with : Tests Dart MethodChannel mock qui vérifient les méthodes, payloads et erreurs.
  - Notes : Sur plateformes non Android, retourner defaults et marquer sauvegarde native unsupported.

- [ ] Tâche 5 : Implémenter les méthodes native MethodChannel
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt`
  - Action : Ajouter handlers get/set/reset theme config et import image; utiliser un picker système Android pour sélectionner une image puis copier/downsampler vers stockage privé app.
  - User story link : Permettre images custom et sauvegarde native.
  - Depends on : Tâches 2 et 3.
  - Validate with : Compile Kotlin; test manuel Android image import; vérification qu'aucune permission large de stockage n'est ajoutée.
  - Notes : Si le flux ActivityResult est trop gros pour `MainActivity`, extraire `KeyboardThemeImageImporter.kt`.

- [ ] Tâche 6 : Remplacer `NativeKeyboardColors` par un résolveur thème natif
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action : Introduire `ResolvedKeyboardTheme`, appliquer background solid/gradient/image, couleurs touches, bordures, radius, ombres, texte et fallback private mode.
  - User story link : Rendre le clavier selon le thème utilisateur.
  - Depends on : Tâches 2 et 3.
  - Validate with : Compile Kotlin; test manuel light/dark/custom; screenshot/device QA.
  - Notes : Garder le layout existant; ne pas mélanger refactor layout et refactor thème.

- [ ] Tâche 7 : Ajouter le moteur d'effets d'appui Canvas
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardPressEffects.kt`
  - Action : Créer un petit moteur d'effets borné pour scale, pulse, shake, ripple, glow, confetti-lite, fireworks-lite; piloter l'invalidation depuis touch events.
  - User story link : Offrir les effets fun demandés sans rendre le clavier lent.
  - Depends on : Tâche 6.
  - Validate with : Tests unitaires sur durée/limites si possible; test manuel typing rapide; vérifier reduce-motion.
  - Notes : Effets `confetti-lite` et `fireworks-lite` doivent capper particules et durée; aucun effet ne doit déclencher mesure/layout complet.

- [ ] Tâche 8 : Appliquer la config runtime depuis l'IME service
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzInputMethodService.kt`
  - Action : Charger le thème dans `applyRuntimePreferencesToView`, écouter changements prefs theme config/image, gérer `onConfigurationChanged` pour system/follow_app.
  - User story link : Voir les changements sans tuer l'app ou rebasculer de clavier.
  - Depends on : Tâches 3, 6 et 7.
  - Validate with : Compile Kotlin; test manuel thème changé pendant clavier ouvert.
  - Notes : La préférence `themeMode` existante reste un alias/migration, pas la source complète du studio.

- [ ] Tâche 9 : Créer `KeyboardThemeStudioScreen`
  - Fichier : `lib/features/keyboard/presentation/keyboard_theme_studio_screen.dart`
  - Action : Construire UI draft/save/discard/reset/import/export avec sections collapsibles: presets, background, keys, text, borders/shadows, effects, safety/performance.
  - User story link : Donner une page dédiée à la personnalisation avancée.
  - Depends on : Tâches 1 et 4.
  - Validate with : Widget tests pour chargement, modification brouillon, save, discard, reset, unsupported platform.
  - Notes : Réutiliser le style de `KeyboardCornerShortcutsScreen`; éviter de surcharger Settings.

- [ ] Tâche 10 : Brancher preview Flutter thémable
  - Fichier : `lib/features/keyboard/presentation/keyboard_preview_widgets.dart`
  - Action : Faire accepter un `KeyboardThemeConfig` à `KeyboardPreviewSnapshot`/`_KeyboardFrame`, rendre couleurs, dégradés, bordures, ombres et simulation d'effets.
  - User story link : L'utilisateur voit l'impact de son thème avant sauvegarde.
  - Depends on : Tâches 1 et 9.
  - Validate with : Widget tests de rendu de labels/presets; golden facultatif si infra stable.
  - Notes : Ne pas promettre pixel-perfect avec Android; afficher un label simulation si effet natif-only.

- [ ] Tâche 11 : Ajouter les entrées navigation Settings/Keyboard
  - Fichier : `lib/core/router/app_router.dart`
  - Action : Ajouter route `/keyboard/theme` ou navigation shell équivalente vers `KeyboardThemeStudioScreen`.
  - User story link : Rendre la page découvrable.
  - Depends on : Tâche 9.
  - Validate with : Router/widget test; navigation depuis Settings.
  - Notes : Si `AppShellScreen` ne supporte pas les sous-routes, utiliser `Navigator.push` depuis Settings comme l'éditeur corners.

- [ ] Tâche 12 : Ajouter les CTA dans Settings et panel clavier
  - Fichier : `lib/features/settings/presentation/settings_screen_sections.dart`
  - Action : Ajouter bouton `Keyboard Theme Studio` dans Appearance et WinGlows Keyboard.
  - User story link : L'utilisateur trouve le studio là où il cherche les thèmes.
  - Depends on : Tâche 11.
  - Validate with : Widget test Settings.
  - Notes : Garder Settings collapsible et éviter d'ajouter tous les sliders dans Settings.

- [ ] Tâche 13 : Mettre à jour le bouton natif `Theme`
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzInputMethodService.kt`
  - Action : Faire ouvrir directement la route thème via intent extra vers `MainActivity`, au lieu d'un simple message Appearance générique.
  - User story link : Depuis le clavier, ouvrir l'éditeur du clavier, pas seulement l'apparence globale.
  - Depends on : Tâche 11.
  - Validate with : Test manuel depuis panel Settings du clavier.
  - Notes : Préserver `onSettings()` pour les autres entrées.

- [ ] Tâche 14 : Ajouter validation accessibilité/performance côté Flutter
  - Fichier : `lib/features/keyboard/domain/keyboard_theme_validation.dart`
  - Action : Calculer contraste, bornes taille/blur/radius/effect, warnings et erreurs bloquantes.
  - User story link : Permettre créativité sans produire un clavier illisible.
  - Depends on : Tâche 1.
  - Validate with : Tests unitaires contrastes et limites.
  - Notes : Erreurs bloquantes pour illisibilité; warnings pour goûts risqués mais utilisables.

- [ ] Tâche 15 : Ajouter tests de bridge/settings
  - Fichier : `test/settings_platform_controllers_test.dart`
  - Action : Vérifier que les préférences existantes conservent `themeMode`/theme config et que les appels theme ne cassent pas les patches clavier.
  - User story link : Éviter les régressions des réglages existants.
  - Depends on : Tâches 4 et 12.
  - Validate with : `flutter test test/settings_platform_controllers_test.dart`.
  - Notes : Étendre les mocks MethodChannel existants.

- [ ] Tâche 16 : Ajouter tests preview/studio
  - Fichier : `test/keyboard_theme_studio_screen_test.dart`
  - Action : Tester preset selection, draft dirty state, save MethodChannel, reset, import JSON invalide, contrast error, unsupported platform.
  - User story link : Garantir que l'éditeur est fiable.
  - Depends on : Tâche 9.
  - Validate with : `flutter test test/keyboard_theme_studio_screen_test.dart`.
  - Notes : Utiliser viewport large comme `keyboard_corner_shortcuts_screen_test.dart`.

- [ ] Tâche 17 : Ajouter tests Kotlin thème/effets
  - Fichier : `android/app/src/test/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardThemeModelsTest.kt`
  - Action : Couvrir parser, defaults, presets, image fallback, validation de valeurs bornées, migration themeMode.
  - User story link : Sécuriser le contrat natif.
  - Depends on : Tâches 2 et 7.
  - Validate with : `./gradlew :app:testDebugUnitTest --tests com.winglowz_app.winglowz_app.ime.KeyboardThemeModelsTest` quand `aapt2` fonctionne; sinon compile Kotlin locale.
  - Notes : Éviter dépendance à Android resources si possible.

- [ ] Tâche 18 : Mettre à jour docs et changelog
  - Fichier : `docs/technical/android-native.md`
  - Action : Documenter thème config, image import, effets, limites, QA manuelle et fallback.
  - User story link : Garder les contrats Android compréhensibles pour la suite.
  - Depends on : Tâches 1 à 17.
  - Validate with : Relecture docs; liens dans `docs/COMPONENTS.md` et `shipglows_data/technical/code-docs-map.md`.
  - Notes : Mentionner explicitement image local-only et Android-only.

## Acceptance Criteria
- [ ] CA 1 : Given l'utilisateur ouvre Settings sur Android, when il appuie sur `Keyboard Theme Studio`, then une page dédiée s'ouvre avec presets, preview et actions Save/Discard/Reset.
- [ ] CA 2 : Given un thème actif, when l'utilisateur modifie une couleur en brouillon, then la preview change et le clavier natif ne change pas avant Save.
- [ ] CA 3 : Given un thème valide sauvegardé, when le clavier WinGlows est ouvert ou réouvert, then le fond, les touches, le texte, les bordures et ombres correspondent au thème.
- [ ] CA 4 : Given un dégradé linéaire ou radial valide, when le thème est sauvegardé, then Android le dessine sans fallback solide.
- [ ] CA 5 : Given une image sélectionnée via le picker système, when l'image respecte les limites, then elle est copiée en stockage privé et utilisée comme fond du clavier.
- [ ] CA 6 : Given une image corrompue ou trop lourde, when l'utilisateur tente de l'importer, then l'import est refusé avec message et le thème actif reste inchangé.
- [ ] CA 7 : Given un contraste texte/touche insuffisant, when l'utilisateur tente de sauvegarder, then l'app bloque ou propose une correction lisible.
- [ ] CA 8 : Given l'effet `scale`, `shake`, `pulse`, `ripple`, `glow`, `confetti-lite` ou `fireworks-lite`, when une touche est pressée, then l'effet se joue et revient à l'état stable sans bloquer la saisie.
- [ ] CA 9 : Given Android reduce-motion ou performance safe mode actif, when un effet lourd est configuré, then le clavier utilise un effet réduit ou `none`.
- [ ] CA 10 : Given un champ password/OTP/private, when le clavier s'ouvre, then les effets ou images non discrets sont désactivés si la policy l'exige et aucune donnée sensible n'est persistée.
- [ ] CA 11 : Given un JSON importé inconnu/corrompu, when l'utilisateur le prévisualise, then l'import est rejeté sans crash.
- [ ] CA 12 : Given un export JSON, when il est importé sur un autre appareil sans image locale, then les couleurs/effets s'appliquent et l'image tombe en fallback avec warning.
- [ ] CA 13 : Given la plateforme n'est pas Android, when l'utilisateur ouvre la page, then la preview fonctionne mais Save natif indique Android-only.
- [ ] CA 14 : Given aucun thème custom existant, when l'app démarre après cette migration, then le clavier reprend un preset cohérent avec `system/light/dark` existant.
- [ ] CA 15 : Given les réglages corners existants, when un thème est sauvegardé, then les corner shortcuts et labels restent fonctionnels.

## Test Strategy
- Dart unit tests:
  - `KeyboardThemeConfig.fromMap/toMap` round-trip.
  - Validation couleurs, contrastes, tailles, durées et effets.
  - Import/export JSON sans bytes image.
- Flutter widget tests:
  - `KeyboardThemeStudioScreen` draft/save/discard/reset.
  - Preview theme rendering for presets and custom values.
  - Unsupported platform messaging.
  - Settings entry points.
- Kotlin unit tests:
  - `KeyboardThemeModelsTest` parser/fallback/limits.
  - Migration from `themeMode` to preset.
  - Effect config bounds.
- Native compile:
  - `./gradlew :app:compileDebugKotlin -x :app:processDebugResources` locally while `aapt2` remains broken.
  - Full `./gradlew :app:testDebugUnitTest` on a machine where `aapt2` works.
- Manual Android QA:
  - Open keyboard in normal text field, password field, Termux, browser search, messaging app.
  - Save presets and custom themes while keyboard is open.
  - Import image, restart app, reopen keyboard.
  - Type quickly with each effect and verify no input drops.
  - Verify reduce-motion/performance fallback.

## Risks
- Performance risk high: particle effects and shadows can cause jank in a keyboard `View`. Mitigation: cap particles, cap blur, short durations, no layout invalidation for effects, safe mode.
- Accessibility risk high: user themes can become unreadable. Mitigation: contrast validation, warnings, private fallback, reset button always visible.
- Security/privacy risk medium: custom images come from user storage. Mitigation: use Photo Picker/no broad storage permission, copy to app-private storage, no URI/path logging, no remote sync v1.
- Stability risk medium: corrupt JSON could crash IME. Mitigation: parser defaults and fallback preset.
- Scope creep risk high: user wants “everything”. Mitigation: v1 schema broad but bounded; no marketplace, no user scripts, no custom fonts, no cloud image sync.
- Preview parity risk medium: Flutter preview and Android Canvas can differ. Mitigation: document simulation and prioritize behavior over pixel-perfect.

## Execution Notes
- Lire d'abord:
  - `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`
  - `lib/features/keyboard/presentation/keyboard_corner_shortcuts_screen.dart`
  - `lib/features/keyboard/presentation/keyboard_preview_widgets.dart`
  - `lib/core/platform/android_keyboard_bridge.dart`
- Approche recommandée:
  - Commencer par le modèle Dart/Kotlin + presets + tests de validation.
  - Brancher bridge get/set/reset sans image ni effets lourds.
  - Rendre les couleurs/dégradés natifs.
  - Créer la page studio et la preview.
  - Ajouter image import, puis effets avancés.
  - Finir par docs et QA manuelle Android.
- Packages:
  - Éviter d'ajouter un package Flutter pour l'image en v1; préférer le picker système Android via bridge natif pour éviter permissions larges.
  - Ne pas ajouter de moteur graphique externe.
- Stop conditions:
  - Stopper et re-spécifier si l'image custom nécessite des permissions Android larges.
  - Stopper si les effets nécessitent un changement d'architecture du clavier ou introduisent du jank non borné.
  - Stopper si la config JSON commence à contenir données sensibles ou données binaires lourdes.
- Validation commands:
  - `dart format <modified dart files>`
  - `flutter test test/keyboard_theme_studio_screen_test.dart test/settings_platform_controllers_test.dart`
  - `./gradlew :app:compileDebugKotlin -x :app:processDebugResources`
  - Full Gradle tests on CI/device when `aapt2` is healthy.

## Open Questions
None. The spec fixes v1 choices as local-only image storage, no marketplace, no user scripts, no custom fonts, and bounded built-in effects. Future product decisions can add cloud theme sync, theme marketplace, per-app themes, font imports, and community sharing as separate specs.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-05-15 19:09:11 UTC | sf-spec | GPT-5 Codex | Created full technical spec for configurable Android keyboard theme studio. | Draft spec saved. | /sf-ready Keyboard Theme Studio |
| 2026-05-15 19:14:52 UTC | sf-ready | GPT-5 Codex | Evaluated structure, user-story fit, task ordering, docs freshness, adversarial risks and security posture. | ready | /sf-start Keyboard Theme Studio |
| 2026-05-15 19:28:32 UTC | sf-start | GPT-5 Codex | Implemented first end-to-end slice: theme config model + bridge + native persistence/rendering + Settings/route studio entry. | partial | /sf-verify Keyboard Theme Studio |
| 2026-05-15 19:26:59 UTC | sf-verify | GPT-5 Codex | Verified first implementation slice against spec contract, checks, and residual scope. | partial | /sf-start Keyboard Theme Studio (next slice) |
| 2026-05-15 19:33:40 UTC | sf-start | GPT-5 Codex | Implemented next slice: native Theme button opens `/keyboard/theme`, studio now includes live draft preview, and baseline studio/doc tests/docs updated. | partial | /sf-verify Keyboard Theme Studio |
| 2026-05-15 19:41:52 UTC | sf-start | GPT-5 Codex | Implemented image-import slice: Android picker import via MethodChannel, theme model extended with image path/toggle, native keyboard background image rendering, studio import controls, and docs map update. | partial | /sf-verify Keyboard Theme Studio |
| 2026-05-15 19:54:15 UTC | sf-verify | GPT-5 Codex | Verified updated slice (theme model/bridge/native image import-render path/tests/docs), re-ran local tests and Kotlin compile proof, and assessed remaining contract gaps. | partial | /sf-start Keyboard Theme Studio (press effects + validation + Kotlin tests) |
| 2026-05-15 20:25:36 UTC | sf-start | GPT-5 Codex | Implemented press-effect and validation slice: Flutter contrast/performance validator, studio effect controls, native bounded Canvas press effects, private/reduce-motion suppression, tests and docs updates. | partial | /sf-verify Keyboard Theme Studio |
| 2026-05-15 20:40:25 UTC | sf-verify | GPT-5 Codex | Verified press-effect/validation slice against the Keyboard Theme Studio contract, local checks, docs, and residual acceptance criteria. | partial | /sf-start Keyboard Theme Studio (presets + import/export + advanced theme controls + device QA) |
| 2026-05-15 20:48:43 UTC | sf-start | GPT-5 Codex | Implemented advanced theme studio slice: full v1 preset catalog, collapsible sections, JSON import/export, radial gradient, border/radius/shadow/easing fields, native renderer support, downsampled image import, tests and docs updates. | partial | /sf-verify Keyboard Theme Studio |
| 2026-05-15 20:54:21 UTC | sf-verify | GPT-5 Codex | Verified advanced theme studio slice against spec contract, local Flutter/Kotlin checks, docs, metadata, bug gate and remaining Android/device proof gaps. | partial | /sf-start Keyboard Theme Studio (diagnostics + image cleanup + device QA proof) |
| 2026-05-16 01:03:55 UTC | sf-start | GPT-5 Codex | Implemented diagnostics/fallback slice: Settings keyboard diagnostic now exposes theme preset/effect/background/config-size/fallback status, native theme replacement/reset now cleans superseded private images, and press effects now apply configured easing (`easeOut`/`linear`/`spring`). | partial | /sf-verify Keyboard Theme Studio |
| 2026-05-16 01:23:41 UTC | sf-verify | GPT-5 Codex | Verified diagnostics/cleanup/easing slice against Keyboard Theme Studio contract; local Flutter checks pass and diagnostics contract is now covered, while Android device QA and full Kotlin unit execution remain pending due environment constraints. | partial | /sf-start Keyboard Theme Studio (device QA proof + full Kotlin unit run on healthy runner) |
| 2026-05-16 02:05:00 UTC | sf-start | GPT-5 Codex | Improved Theme Studio web/live preview editing sync: form controls now rebind correctly after preset/import/reset and color fields react during typing; kept contract/tests coherent. | partial | /sf-verify Keyboard Theme Studio |
| 2026-05-16 03:35:00 UTC | sf-test | GPT-5 Codex | Ran manual user QA card on web preview flow; steps 2/3/4 passed but JSON import step failed and opened BUG-2026-05-16-001. | partial | /sf-fix BUG-2026-05-16-001 |

## Current Chantier Flow

- sf-spec: done, draft created at `shipglows_data/workflow/specs/keyboard-theme-studio.md`.
- sf-ready: ready after clarifying local-only security assumptions and official docs URLs.
- sf-start: partial implementation includes diagnostics/fallback fields, private-theme-image cleanup on replace/reset, and native easing-aware press effects.
- sf-verify: partial after diagnostics/cleanup/easing verification; remaining known gaps are Android device QA evidence and full Kotlin unit execution on a healthy AAPT2 runner.
- sf-start (latest): partial web preview/control sync hardening completed for Theme Studio fields/presets/import-reset flows.
- sf-test: manual local web test logged; JSON import failed (`BUG-2026-05-16-001`), while other checked steps passed.
- sf-end: not launched.
- sf-ship: not launched.
- Prochaine commande recommandée: `/sf-fix BUG-2026-05-16-001`.
