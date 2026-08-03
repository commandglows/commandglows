---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-06-12"
created_at: "2026-06-12 03:47:50 UTC"
updated: "2026-06-12"
updated_at: "2026-06-12 08:53:59 UTC"
status: active
source_skill: 100-sf-spec
source_model: "GPT-5 Codex"
scope: "custom-action-bar-ime-surface"
owner: "Diane"
confidence: high
user_story: "En tant qu'utilisatrice WinGlows, je veux configurer une barre d'action unique et scrollable dans une page dédiée, puis l'activer dans le clavier Android IME, afin d'utiliser mes commandes personnalisées directement pendant la saisie."
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "WinGlows Flutter app"
  - "Android IME"
  - "Custom action buttons"
  - "Keyboard settings"
  - "Keyboard action bar native controller"
  - "Sentry diagnostics"
depends_on:
  - artifact: "shipglows_data/workflow/specs/custom-action-buttons-and-command-macros.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/workflow/specs/android-ime-winglowz_app-keyboard.md"
    artifact_version: "unknown"
    required_status: "reviewed"
  - artifact: "shipglows_data/workflow/specs/keyboard-action-row-scroll-affordance.md"
    artifact_version: "unknown"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/design-system-authority.md"
    artifact_version: "1.0.0"
    required_status: "draft"
supersedes: []
evidence:
  - "User decision 2026-06-12: V1 is one global scrollable and configurable action bar."
  - "User decision 2026-06-12: primary usage surface is the Android IME action bar."
  - "User decision 2026-06-12: activation must be available inside the app and inside keyboard preferences."
  - "User decision 2026-06-12: custom action buttons should have a dedicated app page, not be hidden inside Snippets."
  - "Code scan: `lib/features/custom_action_buttons/**` already provides typed button models, stores, layout metadata, and a runner."
  - "Code scan: `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/actions/KeyboardActionBarController.kt` already owns native action-row rendering state."
  - "Official Android docs: input methods normally extend `InputMethodService` and can expose settings UI through the system input-method settings surface."
next_step: "/005-sf-ship winglowz_app for Blacksmith Android proof"
---

# Title

Custom Action Bar In Android IME

## Status

Ready for implementation. The product direction is settled: one global custom
action bar, horizontally scrollable, configured from a dedicated app page,
activatable from app settings and keyboard preferences, and rendered inside the
Android IME.

## User Story

En tant qu'utilisatrice WinGlows, je veux configurer une barre d'action unique
et scrollable dans une page dédiée, puis l'activer dans le clavier Android IME,
afin d'utiliser mes commandes personnalisées directement pendant la saisie.

## Minimal Behavior Contract

WinGlows doit offrir une page dédiée aux actions qui permet de créer,
ordonner, tester et configurer une seule barre d'action globale. Quand la barre
est activée, le clavier Android IME affiche cette barre comme une rangée
horizontale scrollable au-dessus ou dans la zone d'action existante du clavier.
Les boutons visibles dans l'IME exécutent uniquement les actions compatibles
avec le contexte Android courant; les actions incompatibles restent visibles
dans la page app avec une explication claire, mais ne doivent pas simuler une
exécution dans l'IME. L'edge case critique est la confidentialité: en champ
privé, mot de passe, OTP ou contexte sensible, la barre doit masquer ou bloquer
les actions sensibles comme snippets, presse-papiers, voix, macros sensibles ou
texte utilisateur privé.

## Success Behavior

- Given l'utilisatrice ouvre l'app, when elle choisit la nouvelle page Actions,
  then elle voit la barre globale, ses boutons, leur ordre, leur disponibilité
  IME, et les commandes pour créer, modifier, supprimer et réordonner.
- Given elle active la barre depuis la page Actions ou Settings > Keyboard,
  when elle ouvre le clavier Android WinGlows dans un champ standard, then une
  rangée d'actions scrollable affiche les boutons compatibles dans l'ordre
  configuré.
- Given elle désactive la barre depuis l'app ou les préférences clavier, when
  elle rouvre l'IME, then la barre personnalisée disparaît sans supprimer les
  boutons stockés.
- Given elle configure un bouton texte ou expression clavier Android, when elle
  appuie dessus dans l'IME, then l'action est exécutée par le moteur natif
  borné existant.
- Given elle configure un bouton presse-papiers, media ou snippet-compatible,
  when le contexte Android autorise cette famille d'action, then l'IME exécute
  l'action via les callbacks natifs existants.
- Given elle configure une séquence clavier desktop comme `Ctrl+W, N`, when la
  barre est affichée dans l'IME Android, then ce bouton est marqué
  incompatible IME et n'est pas exécuté.
- Given un champ sensible est actif, when la barre serait visible, then les
  actions sensibles sont bloquées ou filtrées selon `KeyboardSecurityPolicy`
  et l'UI ne montre pas de contenu privé.
- Given une erreur native survient pendant l'exécution, when l'action échoue,
  then l'utilisateur voit un statut récupérable et les diagnostics restent
  redigés.

## Error Behavior

- Bouton sans titre, action vide, action inconnue ou payload trop long: refuser
  l'enregistrement ou la synchro native avec un message utilisateur clair.
- Store local/Firebase indisponible: conserver la page utilisable en lecture
  locale quand possible et afficher un état de synchronisation non destructif.
- Pont Android indisponible sur web/desktop: afficher que la barre IME est une
  capacité Android et permettre seulement la configuration app.
- Action non compatible IME: ne pas envoyer d'événement natif, ne pas afficher
  de succès, et conserver le bouton pour les autres surfaces compatibles.
- Erreur de parsing native: ignorer seulement le bouton fautif, garder la barre
  et reporter un statut redigé.
- Crash IME: Sentry/native diagnostics doivent pouvoir corréler l'erreur sans
  texte tapé, snippet, clipboard, token, email, prompt ou contenu privé.

## Problem

La V1 actuelle permet de créer des boutons personnalisés dans `Snippets >
Boutons`, mais cette surface est surtout une bibliothèque et une
prévisualisation. Elle ne répond pas encore au besoin principal: avoir une
barre d'action quotidienne directement dans le clavier Android, activable ou
désactivable par l'utilisatrice, avec une page dédiée pour la gérer.

## Solution

Créer une page app dédiée aux actions personnalisées, extraire la barre
prévisualisée en composant partagé, ajouter un réglage persistant
`customActionBarEnabled`, synchroniser les boutons compatibles vers Android, et
adapter le contrôleur natif `KeyboardActionBarController` pour rendre une rangée
custom scrollable issue de la bibliothèque de boutons.

## Scope In

- Nouvelle page Flutter dédiée aux actions personnalisées, visible dans la
  navigation principale ou accessible comme destination produit de premier
  niveau.
- Déplacement ou réutilisation de `CustomActionButtonsPanel` hors de l'écran
  Snippets; Snippets peut garder un lien de renvoi, mais ne doit plus être la
  surface principale de création des boutons.
- Une seule barre globale, horizontalement scrollable, configurable par ordre
  manuel.
- Réglage d'activation dans la page Actions.
- Réglage d'activation dans Settings > Keyboard.
- Préférence native Android correspondante dans `KeyboardStateStore` et dans le
  statut `AndroidKeyboardStatus`.
- Méthode de bridge Flutter -> Android pour synchroniser l'activation et la
  liste des actions compatibles IME.
- Rendu natif dans l'IME à travers la mécanique existante de
  `KeyboardActionBarController`, `KeyboardActionRowSpec` et
  `KeyboardKeySpec`.
- Filtrage par compatibilité de plateforme et politique de confidentialité.
- Tests Flutter widget/store/bridge et tests Kotlin unitaires ciblés.
- Documentation utilisateur et technique alignée.

## Scope Out

- Plusieurs barres par application, par contexte ou par profil.
- Drag and drop avancé si un ordre manuel simple suffit pour la V1.
- Exécution Android de séquences clavier desktop comme `Ctrl+W, N`.
- Commandes shell, scripts, processus libres, URLs externes ou automatisations
  système arbitraires.
- Build APK, install Android, `flutter run`, Gradle local ou QA device locale
  sur cette VM.
- Refonte complète de la barre d'action native déjà existante.

## Constraints

- Respecter `AGENTS.md`: aucun build Android/Gradle local; validation Android
  par GitHub Actions/Blacksmith et QA physique Diane.
- Respecter `shipglows_data/technical/design-system-authority.md`: nouveaux
  visuels Flutter via `WinGlowzThemeTokens`, `AppTheme`, `AppSpacing`,
  `AppInsets`, `AppSectionCard`, `ProductPageScaffold` ou primitives
  existantes.
- Ne jamais reclasser un snippet comme bouton: un snippet reste un contenu
  texte, un bouton reste un conteneur visuel avec action typée.
- Ne jamais exposer de commande arbitraire ou shell.
- Garder le pont Android strictement typé et borné.
- La barre IME doit rester utilisable avec touch targets natifs, scroll
  horizontal stable, private mode, compact mode et hauteur clavier existante.
- Les diagnostics copiés ou envoyés à Sentry ne doivent jamais contenir texte
  tapé, clipboard, snippets, dictée, emails, tokens, prompts ou payloads privés.

## Test Contract

- Surface: Flutter app settings/UI, Android native IME runtime, MethodChannel
  bridge, custom action button store, and documentation.
- Proof profile: mixed automated + CI-native + manual-device proof. Local proof
  covers Flutter analysis/widget/model/bridge behavior; Android native proof
  must come from GitHub Actions/Blacksmith and Diane's physical-device QA.
- Proof order:
  1. Flutter static/model/widget checks.
  2. Dart bridge serialization checks.
  3. ShipGlows metadata and design-system drift checks.
  4. GitHub Actions/Blacksmith Android/Kotlin checks.
  5. Diane physical-device IME QA.
- Checklist path: `shipglows_data/workflow/test-checklists/custom-action-bar-ime-surface.md`
  must be created during implementation before manual/device QA.
- Required scenario ids:
  - `CAB-IME-001`: Actions page creates and orders buttons outside Snippets.
  - `CAB-IME-002`: app setting enables and disables the IME custom action bar.
  - `CAB-IME-003`: keyboard preferences enable and disable the same bar.
  - `CAB-IME-004`: compatible text/expression/clipboard/media actions execute
    or dispatch through typed native callbacks.
  - `CAB-IME-005`: desktop-only key sequence such as `Ctrl+W, N` is marked
    incompatible in Android IME.
  - `CAB-IME-006`: private/password/OTP/no-personalized-learning fields
    suppress sensitive actions.
  - `CAB-IME-007`: overflowing buttons scroll horizontally without accidental
    dispatch.
  - `CAB-IME-008`: corrupt or oversized native config falls back safely.
  - `CAB-IME-009`: copied diagnostics include build identity and Paris/UTC
    build timestamps while redacting private payloads.
- Required results: every required scenario must produce a visible UI state,
  persisted setting, typed native state, test assertion, CI result, device QA
  result, or redacted diagnostic artifact that `103-sf-verify` can inspect.
- Automated proof:
  - `flutter analyze`
  - `flutter test test/custom_action_button_store_test.dart`
  - `flutter test test/custom_action_buttons_screen_test.dart`
  - `flutter test test/keyboard_corner_shortcuts_screen_test.dart`
  - new widget tests for the Actions page and settings toggle
  - new Dart bridge tests for custom action bar config serialization
  - existing/new Kotlin unit tests for action-bar sanitization and custom row
    rendering, executed through CI/Blacksmith rather than local Gradle
- Manual/device proof:
  - Diane installs a CI-built APK and verifies the action bar appears in the
    Android IME when enabled, disappears when disabled, scrolls horizontally,
    executes compatible actions, and blocks private-field actions.
- Exception-with-proof:
  - Local Android build/Gradle checks are forbidden by repo guardrails; use CI
    run evidence and device QA instead.
- Exception-without-proof: none accepted for the final IME runtime claim. If CI
  or device proof is unavailable, `103-sf-verify` must report the runtime proof
  as partial and keep the chantier before ship.
- Sentry/diagnostics:
  - Preserve existing Sentry initialization and safe diagnostics/log-copy
    posture.
  - Runtime diagnostics must include commit/build identity plus Paris and UTC
    build timestamps when copied, and must redact action payloads.
- Fresh external docs:
  - `fresh-docs checked`: Android Developers confirms IMEs are built by
    extending `InputMethodService` and commonly expose a settings UI through
    input-method settings; this supports the app + keyboard preferences split.
  - Source: https://developer.android.com/develop/ui/views/touch-and-input/creating-input-method

## Dependencies

- Existing Flutter custom action button domain/store:
  `lib/features/custom_action_buttons/**`
- Existing snippets screen integration:
  `lib/features/snippets/presentation/custom_action_buttons_panel.dart`
- Existing app shell navigation:
  `lib/features/shell/presentation/app_shell_screen.dart`
- Existing settings screen keyboard section:
  `lib/features/settings/presentation/settings_screen.dart`
  and `settings_screen_sections.dart`
- Existing Android bridge:
  `lib/core/platform/android_keyboard_bridge.dart`
  and `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt`
- Existing native action bar:
  `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/actions/KeyboardActionBarController.kt`
  and related contracts.
- Existing native state:
  `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`
- Official Android IME guidance:
  https://developer.android.com/develop/ui/views/touch-and-input/creating-input-method
- Language doctrine:
  internal section names, metadata, action ids, test ids and machine-readable
  contracts stay in English; visible French UI/doc copy must be natural and
  accented; external citations keep their original language and are labelled.
- Design authority:
  brand contract and app visual language come from
  `shipglows_data/technical/design-system-authority.md`;
  token source is `lib/core/theme/winglowz_theme_tokens.dart`;
  technology carrier is Flutter `ThemeData` in `lib/core/theme/app_theme.dart`;
  component bridge is `lib/core/widgets/app_components.dart`;
  layout/motion authority is `AppSpacing`, `AppInsets`, `AppBreakpoints`,
  `AppDuration*`, existing keyboard metrics and native layout measurement;
  forbidden bypasses are screen-local hardcoded colors, spacing, radii, motion,
  keyboard/IME offsets, z-index-like layering, and untokenized component values.

## Invariants

- One global action bar only in V1.
- Button order is user-configurable and deterministic.
- The Android IME consumes only Android-compatible action payloads.
- Desktop-only actions remain available to desktop surfaces but are not
  executable in the IME.
- Disabling the bar hides the IME surface but does not delete the buttons.
- Private/sensitive fields always override user customization.
- The native keyboard must remain usable if custom action data is corrupt,
  oversized, missing, or partially unsupported.

## Links & Consequences

- The app navigation gains a new important product surface; tests that assert
  tab counts, destinations, routing, or home-source navigation may need updates.
- Snippets no longer owns the custom button management surface; docs and UI copy
  must stop implying that custom buttons are a subsection of snippets.
- Keyboard sync/export may need to include the enabled flag and safe action-bar
  metadata, but must not export sensitive action payloads unless already allowed
  by the custom action store contract.
- Android IME layout height and scroll handling can regress existing action-row,
  snippets, clipboard, media and voice controls; targeted Kotlin tests are
  required.
- Unsupported platform messaging must remain clear on Flutter web and desktop.

## Documentation Coherence

- Update `docs/CUSTOM_ACTION_BUTTONS.md` to describe the dedicated Actions page
  and the IME action bar.
- Update `docs/PLATFORM_BEHAVIOR.md` to clarify which action types are
  executable in Android IME versus desktop overlay.
- Update `docs/COMPONENTS.md` for the new Actions page and shared action-bar
  component.
- Update `docs/VERIFICATION.md` with manual QA steps for enable/disable,
  scroll, private field suppression and unsupported actions.
- Update `README.md` feature notes if the navigation surface changes.

## Edge Cases

- Empty custom action library while the bar is enabled.
- More buttons than fit on a phone-width keyboard row.
- Very long button titles or icon-only labels.
- Duplicate titles or duplicate action payloads.
- Corrupt native serialized config.
- Firebase/local store loads after IME starts.
- App disabled the bar while IME is already open.
- Private field suppresses only part of the bar.
- Clipboard permission/policy unavailable.
- Media access unavailable.
- Desktop-only button exists in the global bar.
- User deletes a button while native state still references it.
- Text scale or accessibility settings increase label size.

## Implementation Tasks

- [ ] Task 1: Define custom action bar settings and compatibility contracts.
  - File: `lib/features/custom_action_buttons/domain/custom_action_buttons.dart`
  - Action: Add explicit IME compatibility helpers, payload limits, labels, and serialization rules for Android-compatible actions.
  - User story link: The IME must show only executable compatible buttons.
  - Depends on: Existing custom action button model.
  - Validate with: `flutter test test/custom_action_button_store_test.dart`
  - Notes: Do not make desktop key sequences Android-compatible.

- [ ] Task 2: Create a dedicated Actions page.
  - File: `lib/features/custom_action_buttons/presentation/custom_action_buttons_screen.dart`
  - Action: Move the primary create/edit/delete/order/toggle UI into a first-class screen with a shared scrollable bar preview.
  - User story link: The user should not manage important action buttons from the Snippets page.
  - Depends on: Task 1.
  - Validate with: new widget test for Actions page creation, ordering, and enabled-state messaging.
  - Notes: Use existing `AppSectionCard`, `ProductPageScaffold`, `AppMetricPill`, `AppSpacing` and theme tokens.

- [ ] Task 3: Add Actions as an app-level destination.
  - File: `lib/features/shell/presentation/app_shell_screen.dart`
  - Action: Add the new page to the main shell navigation or equivalent first-level destination, with icon and label `Actions`.
  - User story link: The feature is important enough to be directly discoverable.
  - Depends on: Task 2.
  - Validate with: shell/navigation widget tests.
  - Notes: Preserve responsive rail/bottom navigation behavior.

- [ ] Task 4: Convert Snippets > Boutons into a link or secondary entry point.
  - File: `lib/features/snippets/presentation/snippets_screen.dart`
  - Action: Remove custom button creation as the primary Snippets sub-surface or replace it with a guided link to Actions.
  - User story link: Snippets and buttons stay conceptually separate.
  - Depends on: Task 3.
  - Validate with: existing snippets tests updated for the new separation.
  - Notes: Avoid losing existing users' custom buttons.

- [ ] Task 5: Add app settings toggle for the IME action bar.
  - File: `lib/features/settings/presentation/settings_screen.dart`
  - Action: Add a keyboard setting to enable/disable the custom action bar and show platform support state.
  - User story link: The user can control whether the bar appears in the keyboard.
  - Depends on: Task 1.
  - Validate with: settings widget tests and `flutter analyze`.
  - Notes: Keep toggle state consistent with the Actions page.

- [ ] Task 6: Add Flutter bridge methods and status fields.
  - File: `lib/core/platform/android_keyboard_bridge.dart`
  - Action: Add typed config methods for custom action bar enabled state and compatible action list sync.
  - User story link: Flutter configuration must reach Android IME.
  - Depends on: Tasks 1 and 5.
  - Validate with: new bridge serialization tests.
  - Notes: Unsupported platforms must return a clear non-Android status.

- [ ] Task 7: Add Android channel handling and native storage.
  - File: `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt`
  - Action: Handle new MethodChannel calls and persist custom action bar config in `KeyboardStateStore`.
  - User story link: Enable/disable and button list survive IME restarts.
  - Depends on: Task 6.
  - Validate with: CI Kotlin tests through Blacksmith.
  - Notes: Redact action payloads from diagnostic events.

- [ ] Task 8: Extend native keyboard state and sync profile safely.
  - File: `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`
  - Action: Add `customActionBarEnabled` and sanitized custom action definitions with size limits, corrupt JSON fallback and status map fields.
  - User story link: The IME can render the configured bar after restart.
  - Depends on: Task 7.
  - Validate with: new Kotlin unit tests in CI.
  - Notes: Consider whether keyboard sync should include only IDs/order/metadata or also safe payloads.

- [ ] Task 9: Render custom actions in the native IME action bar.
  - File: `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/actions/KeyboardActionBarController.kt`
  - Action: Merge custom compatible buttons into a single scrollable custom row or main action row according to enabled state and field policy.
  - User story link: The action bar appears directly in the Android keyboard.
  - Depends on: Task 8.
  - Validate with: `KeyboardActionBarControllerTest` updates in CI.
  - Notes: Reuse existing scroll/paging row machinery.

- [ ] Task 10: Execute compatible custom action buttons in the IME.
  - File: `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action: Route custom key specs to callbacks or typed `KeyboardKeyAction` execution without adding shell/system command support.
  - User story link: Tapping a compatible custom button performs the action.
  - Depends on: Task 9.
  - Validate with: native unit tests and Diane device QA.
  - Notes: Private-mode suppression must happen before action dispatch.

- [ ] Task 11: Update docs and manual verification.
  - File: `docs/CUSTOM_ACTION_BUTTONS.md`, `docs/PLATFORM_BEHAVIOR.md`, `docs/COMPONENTS.md`, `docs/VERIFICATION.md`
  - Action: Document dedicated Actions page, IME action bar, settings toggles, compatibility limits and manual QA.
  - User story link: Users understand where to configure and where to use the feature.
  - Depends on: Tasks 2 through 10.
  - Validate with: ShipGlows metadata lint and `git diff --check`.
  - Notes: Keep French user-facing copy natural and accented.

## Acceptance Criteria

- [ ] AC 1: Given the user opens the app, when she navigates to Actions, then
  she can manage custom buttons from a dedicated page outside Snippets.
- [ ] AC 2: Given the custom action bar is enabled, when the Android IME opens
  in a normal text field, then a single horizontal scrollable custom action bar
  is visible.
- [ ] AC 3: Given the custom action bar is disabled, when the Android IME opens,
  then the bar is hidden and existing custom buttons remain stored.
- [ ] AC 4: Given a compatible text or keyboard-expression button, when tapped
  in the IME, then the native keyboard executes the action.
- [ ] AC 5: Given a desktop-only key sequence button such as `Ctrl+W, N`, when
  the IME renders the bar, then the action is not executable and the app
  explains the compatibility limit.
- [ ] AC 6: Given a private, password, OTP or no-personalized-learning field,
  when the bar is enabled, then sensitive custom actions are suppressed or
  disabled without leaking content.
- [ ] AC 7: Given more buttons than fit on screen, when the user scrolls
  horizontally, then the row remains stable and no unintended key fires.
- [ ] AC 8: Given corrupt or oversized native config, when the IME starts, then
  primary typing remains usable and the custom action bar falls back safely.
- [ ] AC 9: Given Flutter web or desktop, when the user opens Actions, then the
  page allows configuration but clearly marks Android IME execution unavailable.
- [ ] AC 10: Given diagnostics are copied after an IME action error, then the
  payload includes build identity and Paris/UTC build timestamps but no private
  text, clipboard, snippets, tokens, prompts or raw action payloads.

## Test Strategy

- Run Flutter static and widget checks locally:
  - `flutter analyze`
  - targeted Flutter tests for custom action models, Actions page, Snippets
    separation, Settings toggle and bridge serialization.
- Run design-system drift check after UI changes:
  - `python3 /home/claude/shipglows/tools/design_system_drift_check.py --changed --format markdown`
- Use GitHub Actions/Blacksmith for Android/Kotlin validation because local
  Gradle/build commands are forbidden.
- Use Diane physical-device QA for final IME behavior:
  enable/disable, scroll, tap compatible actions, unsupported desktop action,
  private-field suppression, orientation/compact mode and keyboard restart.

## Risks

- Native action bar already has pinned/adaptive/action-row behavior; custom
  rows can conflict with existing clipboard/snippets/media rows if merged
  carelessly.
- App navigation can become crowded if Actions is added as a main tab without
  responsive review.
- Syncing custom action payloads to native storage can leak user text if not
  capped, sanitized and excluded from diagnostics.
- Desktop-only action names can confuse users if the compatibility label is too
  subtle.
- Android private-field policy must override user customization even when a
  button was explicitly enabled.
- CI/device proof is required; local checks alone cannot prove IME rendering.
- Security impact: yes, mitigated by typed action allowlists, payload size
  limits, native corrupt-config fallback, private-field suppression,
  no shell/system command execution, redacted diagnostics, and no cross-user
  server authorization dependency for local IME execution.
- Auth/authz: the app's existing signed-in/local store boundaries govern button
  persistence; native IME execution is local to the device and must not create a
  new backend mutation path.
- Input validation: every custom action synced to Android is untrusted input and
  must be allowlisted by kind, capped by size, parsed safely, and rejected or
  marked incompatible on failure.
- Abuse/availability: oversized configs, excessive button counts, repeated
  taps, stale references, replayed bridge payloads and corrupt JSON must not
  freeze or crash primary typing.

## Execution Notes

- Read first:
  `lib/features/custom_action_buttons/domain/custom_action_buttons.dart`,
  `lib/features/snippets/presentation/custom_action_buttons_panel.dart`,
  `lib/features/shell/presentation/app_shell_screen.dart`,
  `lib/core/platform/android_keyboard_bridge.dart`,
  `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/actions/KeyboardActionBarController.kt`.
- Implementation order:
  domain compatibility -> dedicated page -> navigation/settings -> bridge
  serialization -> native storage -> native rendering -> docs/tests.
- Design authority:
  `shipglows_data/technical/design-system-authority.md`; use app tokens and
  shared components, not screen-local hardcoded visual values.
- Fresh docs:
  Android IME settings guidance checked via official Android Developers docs.
- Observability:
  preserve Sentry/privacy defaults and safe diagnostics/log-copy format with
  commit/build, Paris build time and UTC build time.
- Packages/abstractions:
  use existing Riverpod providers, backend-agnostic stores, MethodChannel
  bridge patterns and native Kotlin action contracts; do not add a new state
  management framework, native command runner, shell executor, or parallel
  action-language parser.
- Data flow:
  Flutter custom action store -> IME compatibility projection -> typed Android
  bridge payload -> `KeyboardStateStore` sanitized persistence ->
  `KeyboardActionBarController` render snapshot -> `WinGlowzKeyboardView`
  typed callback execution.
- Stop conditions:
  if Android native cannot safely execute a custom action type, mark it
  incompatible instead of widening action execution.

## Open Questions

None.

Product decisions supplied by Diane on 2026-06-12: one global scrollable bar,
primary Android IME surface, app + keyboard preference toggles, incompatible
actions explained, corners consume only compatible button actions, and a
dedicated app page for actions.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-06-12 03:47:50 UTC | 100-sf-spec | GPT-5 Codex | Created spec for a dedicated Actions page and Android IME custom action bar based on Diane's product decisions. | Draft ready for readiness review. | `/101-sf-ready shipglows_data/workflow/specs/custom-action-bar-ime-surface.md` |
| 2026-06-12 03:56:49 UTC | 101-sf-ready | GPT-5 Codex | Validated readiness, tightened test contract, language/design/security gates, and implementation-proof expectations. | ready | `/102-sf-start shipglows_data/workflow/specs/custom-action-bar-ime-surface.md` |
| 2026-06-12 04:23:51 UTC | 102-sf-start | GPT-5 Codex + gpt-5.3-codex-spark subagent | Implemented the dedicated Actions page, app/settings toggles, Flutter-to-Android custom action bar bridge, native IME custom row config/render path, docs, checklist and tests. | implemented; Flutter proof passed, Android runtime proof deferred to CI/Blacksmith and Diane device QA by repo guardrail. | `/103-sf-verify shipglows_data/workflow/specs/custom-action-bar-ime-surface.md` |
| 2026-06-12 08:53:59 UTC | 103-sf-verify | GPT-5 Codex | Verified local Flutter proof, repaired the checklist into a status-bearing artifact, and assessed the remaining Android IME runtime proof gates. | partial; local analyze/test/design/docs gates passed, but required Blacksmith CI/Kotlin proof and Diane device QA remain missing for CAB-IME-004/006/007/008/009 and the checklist keeps CAB-IME-003 as not run. | `/005-sf-ship winglowz_app for Blacksmith Android proof -> /405-sf-prod -> /107-sf-test` |

## Current Chantier Flow

100-sf-spec: drafted from product decisions
101-sf-ready: ready
102-sf-start: implemented
103-sf-verify: partial
104-sf-end: pending
005-sf-ship: pending
