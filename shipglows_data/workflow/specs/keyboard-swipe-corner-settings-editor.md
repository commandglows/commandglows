---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-05-14"
created_at: "2026-05-14 16:09:20 UTC"
updated: "2026-05-14"
updated_at: "2026-05-14 16:30:18 UTC"
status: ready
source_skill: sf-spec
source_model: "GPT-5 Codex"
scope: "feature"
owner: "Diane"
confidence: medium
user_story: "En tant qu'utilisateur Android de WinGlows qui personnalise son clavier, je veux configurer les swipes de coins depuis une interface visuelle, guidee et reversible, afin de choisir rapidement accents, ponctuation, snippets, actions ou macros sans ecrire des expressions techniques."
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Flutter Settings"
  - "Flutter keyboard preview"
  - "Flutter keyboard corner editor"
  - "Dart keyboard domain models"
  - "Android keyboard MethodChannel"
  - "Android native IME corner shortcut config"
  - "Snippet store"
  - "Dictionary/text-expander rules"
  - "Keyboard privacy policy"
depends_on:
  - artifact: "shipglows_data/workflow/specs/configurable-key-corner-swipes.md"
    artifact_version: "0.1.0"
    required_status: "ready"
  - artifact: "docs/COMPONENTS.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "docs/VERIFICATION.md"
    artifact_version: "unknown"
    required_status: "reviewed"
supersedes: []
evidence:
  - "User request 2026-05-14: create a separate spec for a real pleasant product interface for keyboard corner settings."
  - "Requested scope: visual key-by-key editor, direct key selection on preview, guided action choice, snippet/shortcut search, language presets, private-field UX validation, preview before save, import/export, and per-key reset."
  - "lib/features/keyboard/presentation/keyboard_corner_shortcuts_screen.dart currently provides a functional base UI with preset dropdown, key dropdown, corner dropdown, raw KeyboardKeyValue expression, optional label, sensitive flag, save, clear override and reset defaults."
  - "lib/features/keyboard/presentation/keyboard_preview_screen.dart already renders a keyboard preview, configurable corner labels, private mode, settings panel, snippets panel, clipboard panel and simulated input buffer."
  - "lib/features/keyboard/domain/keyboard_models.dart defines AndroidKeyboardCornerConfig, AndroidKeyboardCornerShortcut, KeyboardCornerSlot and a Dart preview preset catalog."
  - "android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardCornerShortcuts.kt is the native authority for persisted config validation, presets, parser-backed values and private-field suppression."
  - "lib/features/snippets/presentation/snippets_screen.dart and snippet stores expose user snippets with trigger, content and optional label, and already sync snippets to the Android keyboard bridge."
next_step: "/sf-prod winglowz_app after bounded keyboard editor ship"
---

# Title

Keyboard Swipe Corner Settings Editor

# Status

Ready for implementation. This is a follow-up product-UX chantier on top of the shipped configurable corner shortcut engine. It should not replace the native IME runtime; it should make the existing power usable from a polished app interface.

# User Story

En tant qu'utilisateur Android de WinGlows qui personnalise son clavier, je veux configurer les swipes de coins depuis une interface visuelle, guidee et reversible, afin de choisir rapidement accents, ponctuation, snippets, actions ou macros sans ecrire des expressions techniques.

Acteur principal: utilisateur Android de WinGlows qui utilise WinGlows keyboard comme IME et veut personnaliser son clavier.

Declencheur: l'utilisateur ouvre Settings > Keyboard > Corner shortcuts, selectionne une touche directement sur une preview, choisit un coin, choisit une action dans un catalogue guide, previsualise le resultat puis sauvegarde.

Resultat observable: l'utilisateur voit la touche et ses quatre coins avant sauvegarde, peut rechercher une action ou un snippet, comprend si l'action sera bloquee en champ prive, sauvegarde une config valide, annule ou reset par touche sans casser les autres raccourcis.

# Minimal Behavior Contract

L'editeur accepte une configuration existante de coins du clavier, un preset actif, une touche selectionnee sur une preview et une action choisie depuis un catalogue guide; il produit une configuration brouillon visible avant sauvegarde, puis persiste uniquement une configuration valide via le bridge clavier natif. Si une action est invalide, interdite, indisponible sur la plateforme ou bloquee en champ prive, l'interface explique le probleme avant sauvegarde et laisse l'utilisateur corriger ou annuler sans modifier la config active. L'edge case facile a rater est la confusion entre preview web et IME natif: la preview doit aider a choisir et inspecter, mais la validation executable reste native Android quand une expression, action ou macro peut avoir des effets systeme.

# Success Behavior

- Given l'utilisateur ouvre l'editeur, when la config native se charge, then il voit le preset actif, une preview de clavier, la touche selectionnee, ses quatre coins et un etat "saved" ou "draft clean".
- Given l'utilisateur tape sur une touche dans la preview, when la touche existe dans l'inventaire configurable, then l'editeur selectionne cette touche et affiche les actions de ses quatre coins.
- Given l'utilisateur tape sur un coin de la touche selectionnee, when le coin contient deja une action, then le panneau d'edition affiche la categorie, le label, l'expression et le statut de confidentialite derives de cette action.
- Given l'utilisateur choisit la categorie "Accent", when il selectionne `é`, then l'editeur cree une action texte valide avec un label court et montre le rendu du coin avant sauvegarde.
- Given l'utilisateur choisit la categorie "Ponctuation", when il selectionne un signe courant, then l'editeur montre son impact sur la touche et conserve les autres coins inchanges.
- Given l'utilisateur choisit la categorie "Snippet", when il recherche `JA` ou `j'arrive`, then la liste filtre les snippets existants par trigger, label et contenu sans afficher de donnees hors de la session locale.
- Given l'utilisateur choisit un snippet, when il sauvegarde, then l'expression generee insere le contenu attendu en champ standard et est marquee sensible ou private-blocked selon la politique choisie.
- Given l'utilisateur choisit "Action", when il selectionne Undo, Redo, Copy, Paste, navigation ou deletion, then l'UI montre clairement si l'action est native-only, special-key gated ou bloquee en champ prive.
- Given l'utilisateur choisit "Macro", when il compose une suite valide d'actions autorisees, then l'editeur affiche un recapitulatif lisible et une expression native validable sans exiger de taper la grammaire brute.
- Given un preset de langue est selectionne, when l'utilisateur change entre French accents, French + punctuation, English/common punctuation, Developer symbols ou No corners, then la preview se met a jour sans effacer les overrides utilisateur tant qu'il ne confirme pas un reset.
- Given l'utilisateur active le mode champ prive dans l'aperçu, when une action sensible existe sur la touche, then le coin est signale comme bloque en private mode au lieu de sembler fonctionnel.
- Given l'utilisateur clique "Preview", when l'action est simulable en web, then le buffer de preview montre le texte insere; when elle est native-only, then le statut indique ce qui sera valide uniquement sur Android.
- Given l'utilisateur clique "Save", when la config est valide, then le bridge natif persiste la config, l'etat devient saved, et Settings recharge le preset/status clavier.
- Given l'utilisateur clique "Reset key", when il confirme, then seuls les overrides de la touche selectionnee sont retires et les coins de preset redeviennent visibles pour cette touche.
- Given l'utilisateur exporte la config, when l'operation reussit, then il obtient un JSON versionne de config de coins sans historique d'usage, contenu de clipboard ou donnees de saisie.
- Given l'utilisateur importe une config, when le JSON est valide, then l'editeur montre un preview diff avant sauvegarde; rien n'est persiste avant confirmation.

# Error Behavior

- Si le bridge Android est indisponible, l'editeur reste en mode simulation explicite: preset, preview et draft fonctionnent localement, mais Save native est desactive ou explique que l'IME Android n'est pas modifie.
- Si le chargement natif echoue, l'editeur affiche l'erreur recuperee, propose retry, et ne remplace pas silencieusement la config native par des defaults.
- Si une touche selectionnee n'est pas configurable dans le layout courant, elle est visible comme non configurable ou ignoree; l'utilisateur ne peut pas sauvegarder un override orphelin sans avertissement.
- Si une expression, macro ou action est rejetee par la validation native, l'erreur est attachee au champ/action concerne et aucun changement n'est persiste.
- Si un snippet reference par un raccourci n'existe plus, l'editeur le marque comme missing et propose de vider le coin, choisir un autre snippet ou convertir en texte statique.
- Si une action est sensible et que la preview est en private mode, l'editeur montre "blocked in private fields" et ne laisse pas croire que le snippet, clipboard, voice ou macro sensible sera execute.
- Si l'utilisateur importe un JSON trop grand, corrompu ou d'une version inconnue, l'editeur refuse l'import avec une explication courte et conserve la config active.
- Si l'utilisateur quitte avec des changements non sauvegardes, il voit une confirmation discard/save; le retour systeme ne doit pas perdre silencieusement un draft modifie.
- Si deux changements ciblent la meme touche et le meme coin dans un import, le dernier override valide est montre dans le diff et le doublon est signale.
- Si un label depasse la taille native autorisee, l'UI propose un label raccourci avant sauvegarde au lieu d'attendre l'erreur native finale.
- Ce qui ne doit jamais arriver: persister une config partielle apres echec, logger le contenu complet de snippets/clipboard dans diagnostics, exporter l'historique utilisateur de saisie, contourner les restrictions private field, ou masquer qu'une action est Android-only.

# Problem

Le moteur de coins configurable existe maintenant, mais l'interface expose encore une forme technique: liste de touches partielle, choix par dropdown, expression `KeyboardKeyValue` brute, label manuel, et flag sensitive que l'utilisateur doit comprendre seul. Cette UI est suffisante pour prouver le moteur, pas pour un vrai usage produit. Elle rend les cas puissants comme snippets, actions, macros, presets par langue et import/export trop faciles a mal configurer et trop difficiles a previsualiser.

# Solution

Refondre `KeyboardCornerShortcutsScreen` en editeur visuel centre sur la preview: selection directe d'une touche, selection directe d'un coin, panneau d'action guide, recherche de snippets/raccourcis, validation avant sauvegarde, et import/export/reset. Le runtime natif Android reste l'autorite pour parser et persister; Flutter fournit une experience de composition, preview, recherche et explication.

# Scope In

- Editeur visuel touche par touche dans l'app principale.
- Selection d'une touche directement depuis une preview de clavier.
- Selection d'un coin directement sur la touche selectionnee ou depuis un petit controle equivalent accessible.
- Panneau guide par categories: accents, ponctuation, snippets, actions, macros et expression avancee.
- Barre de recherche commune pour snippets, actions, presets et raccourcis.
- Chargement des snippets existants via `snippetStoreProvider`.
- Generation d'expressions `KeyboardKeyValue` depuis des choix guides, avec label court automatique.
- Validation locale de forme et validation native optionnelle avant sauvegarde.
- UX de champ prive: action allowed, blocked in private fields, native-only, special-key gated.
- Apercu avant sauvegarde avec etat draft/saved/dirty/error.
- Reset par coin, reset par touche et reset complet.
- Import/export JSON versionne de `AndroidKeyboardCornerConfig`.
- Presets groupes par intention ou langue: French accents, French accents + punctuation, common punctuation, developer symbols, no corners, et futurs presets langue.
- Tests widget pour selection preview, recherche, save, reset, import invalide, private-mode warning et bridge unsupported.
- Documentation de verification manuelle et composants.

# Scope Out

- Refonte du moteur natif de gestes ou du dispatch `KeyboardKeyValue`.
- Cloud sync multi-device des configurations de coins.
- Marketplace public de presets.
- Editeur drag-and-drop complet de layout clavier.
- Creation d'un langage de macro different de `KeyboardKeyValue`.
- Prediction, autocorrect avance ou glide typing.
- Gestion per-app/per-domain des mappings.
- Import/export via stockage distant, compte utilisateur ou partage public.
- Garantie que la preview web prouve les key events Android ou les politiques IME natives.

# Constraints

- Le runtime Android IME reste Kotlin; ne pas mettre une vue Flutter dans l'IME.
- Les actions executables restent representees par `KeyboardKeyValue` ou par le contrat natif existant.
- L'editeur ne doit pas contourner `KeyboardCornerConfig` ni dupliquer une validation plus permissive que le natif.
- Les snippets et contenus utilisateur ne doivent pas etre logs en clair dans `AppDiagnostics`.
- L'import/export doit contenir uniquement la config de coins versionnee: presetId, overrides, labels, sensitive; pas d'historique de saisie ni clipboard.
- La preview doit avoir des dimensions stables: aucun label long ne doit deformer la grille ou chevaucher les touches voisines.
- Les special keys restent dependantes de `specialKeyCornersEnabled`; l'UI doit expliquer cette barriere.
- Les actions sensibles restent bloquées par `KeyboardSecurityPolicy` en champs prives.
- Les plateformes non Android ne doivent jamais afficher un faux succes natif.
- Le serveur ARM local peut valider Flutter et une compile Kotlin partielle, mais les tests Android complets peuvent rester bloques par AAPT2.

# Dependencies

- `KeyboardCornerShortcutsScreen` comme surface actuelle a refondre.
- `KeyboardPreviewScreen` comme source de preview/sandbox et layout visuel reutilisable ou extractible.
- `AndroidKeyboardCornerConfig`, `AndroidKeyboardCornerShortcut`, `KeyboardCornerSlot`, `KeyboardCornerPresetCatalog` comme modeles Dart existants.
- `AndroidKeyboardBridge` pour lire/ecrire/resetter la config native.
- `KeyboardCornerShortcuts.kt` comme autorite native pour presets, parser, limites et private-field suppression.
- `SnippetStore` et `snippetStoreProvider` pour rechercher les snippets utilisateur.
- `SettingsScreen` pour l'entree navigation et le refresh statut apres sauvegarde.
- `AppTheme` tokens pour cartes, espacements, couleurs, tailles clavier et composants existants.
- Fresh external docs: `fresh-docs not needed` pour la spec actuelle, car elle s'appuie sur les composants Flutter/MethodChannel deja utilises localement et ne choisit pas de nouvelle API externe. Si l'implementation ajoute un file picker, share sheet, stockage externe ou package d'import/export, consulter les docs officielles avant ce slice.

# Invariants

- La config sauvegardee doit rester compatible avec le moteur natif existant.
- Un draft non sauvegarde ne modifie jamais la config native.
- Le preset actif et les overrides utilisateur restent separables.
- Reset par touche ne supprime que les overrides de cette touche.
- Reset par coin ne supprime que l'override de ce coin.
- Reset complet restaure les defaults natifs apres confirmation.
- Les actions sensibles sont visibles comme telles avant sauvegarde.
- Les actions native-only peuvent etre configurees mais ne doivent pas pretendre etre simulees en web.
- Les snippets supprimes ou manquants restent recuperables par correction utilisateur.
- La preview web ne remplace pas la QA Android IME.

# Links & Consequences

- `lib/features/keyboard/presentation/keyboard_corner_shortcuts_screen.dart`: devient l'editeur produit principal; probablement a decomposer en widgets prives ou fichiers dedies.
- `lib/features/keyboard/presentation/keyboard_preview_screen.dart`: extraire ou partager les pieces de preview de touche/rangees pour eviter deux representations qui divergent.
- `lib/features/keyboard/domain/keyboard_models.dart`: ajouter un modele d'inventaire configurable et un modele de brouillon/action guide si necessaire.
- `lib/core/platform/android_keyboard_bridge.dart`: peut ajouter une methode de validation native sans persistance, par exemple `validateKeyboardCornerConfig` ou `validateKeyboardCornerShortcut`, si la validation pre-save ne peut pas rester pure Flutter.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt`: seulement si une methode native de validation sans sauvegarde est ajoutee.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardCornerShortcuts.kt`: seulement si de nouveaux presets langue ou helpers de validation/export sont requis.
- `lib/features/snippets/domain/snippet_store.dart` et implementations: lecture uniquement pour recherche; ne pas coupler l'editeur de coins a une mutation snippet.
- `lib/features/settings/presentation/settings_screen.dart`: entree et refresh status apres retour.
- `test/widget_test.dart`: tests widget existants a etendre ou tests dedies a creer.
- `docs/COMPONENTS.md`, `docs/VERIFICATION.md`, `docs/PLATFORM_BEHAVIOR.md`: mettre a jour la description de l'editeur et la matrice QA.
- UX consequence: l'utilisateur doit comprendre ce qui est preset, override, draft, native-only et private-blocked sans lire la grammaire technique.
- Security consequence: l'interface facilite macros/actions; elle doit rendre la sensibilite et les limites de champs prives visibles.
- Perf consequence: le filtrage snippets/actions doit rester local et leger; eviter rebuilds lourds de toute la preview a chaque frappe si la liste grossit.
- Accessibility consequence: selection de touche/coin doit avoir labels semantiques et alternative non tactile par listes/segments.

# Documentation Coherence

- `docs/COMPONENTS.md`: remplacer la description "preset and per-key override editor" par l'editeur visuel guide, preview selection, recherche et import/export.
- `docs/VERIFICATION.md`: ajouter QA pour selection directe sur preview, recherche snippets/actions, private-mode warning, preview before save, reset par touche, import/export et bridge unsupported.
- `docs/PLATFORM_BEHAVIOR.md`: rappeler que la preview web est une simulation, que la persistence native est Android-only, et que les actions native-only demandent QA device.
- `docs/technical/flutter-app.md`: documenter le flux Flutter Settings -> draft editor -> bridge native.
- `docs/technical/android-native.md`: documenter toute nouvelle methode MethodChannel de validation si ajoutee.
- Support/onboarding futur: expliquer que les coins peuvent etre configures par presets ou touche par touche, et que les snippets/actions sensibles peuvent etre bloques en champ prive.

# Edge Cases

- L'utilisateur selectionne une touche absente du layout courant apres switch QWERTY/AZERTY.
- L'utilisateur configure quatre labels longs sur une petite touche.
- L'utilisateur recherche un snippet dont le contenu est tres long.
- L'utilisateur modifie un snippet dans un autre onglet pendant que l'editeur de coins est ouvert.
- L'utilisateur importe une config qui reference des keyIds inconnus.
- L'utilisateur importe une config qui reference un preset non disponible.
- L'utilisateur annule apres avoir change preset et plusieurs overrides.
- L'utilisateur sauvegarde pendant que le bridge natif renvoie une erreur.
- L'utilisateur configure une action de clipboard ou voice en private mode.
- L'utilisateur configure une action sur `space`, mais le slider espace gagne au runtime.
- L'utilisateur configure une special key alors que `specialKeyCornersEnabled` est off.
- L'utilisateur utilise la preview web et pense avoir modifie l'IME Android.
- L'utilisateur exporte une config contenant un label derive d'un snippet sensible.
- Le JSON exporte est colle dans un autre environnement avec une version native plus ancienne.
- L'utilisateur reset par touche sur une touche qui n'a que des valeurs de preset, donc aucun override a supprimer.

# Implementation Tasks

- [ ] Tache 1 : Extraire un inventaire partage des touches configurables
  - Fichier : `lib/features/keyboard/domain/keyboard_models.dart`
  - Action : Ajouter un modele `KeyboardConfigurableKey` ou equivalent avec `id`, `label`, `row`, `special`, `layoutProfiles`, `description`, et remplacer la constante locale `_keyOptions` de l'ecran actuel par ce catalogue partage.
  - User story link : permet de selectionner une touche visuellement et de garder les memes IDs que le moteur natif.
  - Depends on : none.
  - Validate with : `flutter test test/widget_test.dart` pour verifier que les IDs `letter-a`, `space`, `enter`, `modifier-ctrl`, `del-letter-row` restent parsables.
  - Notes : ne pas inventer d'IDs qui ne sont pas produits par le builder natif.

- [ ] Tache 2 : Extraire une preview clavier reutilisable et selectable
  - Fichier : `lib/features/keyboard/presentation/keyboard_preview_screen.dart`
  - Action : Isoler les widgets/modeles de rendu des touches ou ajouter une variante reutilisable qui accepte `selectedKeyId`, `selectedSlot`, `onKeySelected` et `onSlotSelected` sans embarquer toute la sandbox.
  - User story link : l'utilisateur choisit la touche directement sur une preview.
  - Depends on : Tache 1.
  - Validate with : test widget qui tappe une touche dans la preview et observe la selection.
  - Notes : conserver les dimensions stables et les labels de coins existants.

- [ ] Tache 3 : Introduire un modele de draft editor
  - Fichier : `lib/features/keyboard/domain/keyboard_models.dart`
  - Action : Ajouter un modele de brouillon qui separe `savedConfig`, `draftConfig`, selection courante, dirty state, erreurs de validation et diff par touche/coin.
  - User story link : l'utilisateur peut previsualiser avant sauvegarde et annuler.
  - Depends on : Tache 1.
  - Validate with : tests unitaires Dart de reset coin, reset key, apply preset, discard et dirty state.
  - Notes : garder `AndroidKeyboardCornerConfig` comme payload persiste; le draft peut etre un modele UI non envoye tel quel au natif.

- [ ] Tache 4 : Creer un catalogue guide d'actions
  - Fichier : `lib/features/keyboard/domain/keyboard_models.dart`
  - Action : Ajouter des types UI pour categories `accent`, `punctuation`, `snippet`, `action`, `macro`, `advancedExpression`, avec generation d'expression `KeyboardKeyValue`, label par defaut, warning private et statut native-only.
  - User story link : l'utilisateur n'a pas besoin d'ecrire la grammaire technique.
  - Depends on : Tache 3.
  - Validate with : tests unitaires pour generation `é`, `JA:'j\\'arrive'`, `Undo:action:Undo`, macro simple et labels courts.
  - Notes : les expressions avancees restent disponibles mais derriere une section explicite.

- [ ] Tache 5 : Brancher la recherche de snippets et raccourcis
  - Fichier : `lib/features/keyboard/presentation/keyboard_corner_shortcuts_screen.dart`
  - Action : Charger `snippetStoreProvider`, construire une liste searchable par trigger/label/contenu, et ajouter une recherche commune pour snippets, actions et ponctuation.
  - User story link : l'utilisateur trouve vite ses propres mots et text expanders.
  - Depends on : Taches 3 et 4.
  - Validate with : test widget qui injecte un store snippets et filtre `JA` puis selectionne le snippet.
  - Notes : ne pas logguer le contenu complet des snippets dans diagnostics.

- [ ] Tache 6 : Refondre `KeyboardCornerShortcutsScreen` en editeur visuel
  - Fichier : `lib/features/keyboard/presentation/keyboard_corner_shortcuts_screen.dart`
  - Action : Remplacer le formulaire dropdown/brut par une composition preview + panneau touche + panneau coins + action picker + statut draft/save.
  - User story link : fournit l'interface produit agreable demandee.
  - Depends on : Taches 1 a 5.
  - Validate with : `flutter test test/widget_test.dart` et screenshot manuel FlutterWeb/Vercel.
  - Notes : eviter les cartes imbriquees; utiliser des sections claires et des controles denses.

- [ ] Tache 7 : Ajouter la validation avant sauvegarde
  - Fichier : `lib/core/platform/android_keyboard_bridge.dart`
  - Action : Ajouter une methode de validation native sans persistance si necessaire; sinon centraliser la validation UI pour longueur label/expression, keyId connu, action private-blocked et special-key gated.
  - User story link : l'utilisateur voit les erreurs avant de casser sa config.
  - Depends on : Taches 3 et 4.
  - Validate with : tests MethodChannel mock pour succes/erreur et test UI affichant une erreur de validation.
  - Notes : si une methode native est ajoutee, modifier aussi `MainActivity.kt` et tester la compilation Kotlin.

- [ ] Tache 8 : Implementer le preview avant sauvegarde
  - Fichier : `lib/features/keyboard/presentation/keyboard_corner_shortcuts_screen.dart`
  - Action : Afficher la config draft sur la preview, permettre de simuler les actions texte/snippet, et afficher `native-only` pour actions/keyevents/modifiers/macros non simulables.
  - User story link : l'utilisateur inspecte l'effet avant save.
  - Depends on : Taches 2, 3 et 4.
  - Validate with : test widget qui modifie un coin sans save et observe la preview draft.
  - Notes : ne pas appeler `setCornerConfig` tant que l'utilisateur n'a pas clique Save.

- [ ] Tache 9 : Ajouter presets par langue et intention
  - Fichier : `lib/features/keyboard/domain/keyboard_models.dart`
  - Action : Grouper les presets existants et, si necessaire, ajouter metadata UI `language`, `category`, `description`, `recommendedForEnabledLanguages`; ne modifier les presets natifs que si de nouveaux IDs doivent etre persistables.
  - User story link : l'utilisateur choisit un depart coherent selon sa langue et son usage.
  - Depends on : Tache 4.
  - Validate with : tests de rendu du groupe French/Developer/None et conservation des overrides.
  - Notes : ne pas supprimer le preset default French accents.

- [ ] Tache 10 : Ajouter reset par coin, reset par touche, reset complet
  - Fichier : `lib/features/keyboard/presentation/keyboard_corner_shortcuts_screen.dart`
  - Action : Ajouter actions de reset ciblees avec confirmation quand elles suppriment des overrides; afficher combien de coins seront touches.
  - User story link : rend l'edition reversible et rassurante.
  - Depends on : Tache 3.
  - Validate with : tests unitaires draft + test widget de reset touche.
  - Notes : reset par touche ne doit pas effacer le preset.

- [ ] Tache 11 : Ajouter import/export JSON
  - Fichier : `lib/features/keyboard/presentation/keyboard_corner_shortcuts_screen.dart`
  - Action : Exporter le JSON `AndroidKeyboardCornerConfig.toMap()` versionne, importer depuis un champ/dialog, previsualiser le diff, puis sauvegarder seulement apres confirmation.
  - User story link : permet backup, partage prive ou retour a une config connue.
  - Depends on : Taches 3 et 7.
  - Validate with : tests import valide, import invalide, version inconnue, JSON trop gros et export sans donnees hors config.
  - Notes : si l'implementation utilise clipboard/share/file picker, consulter les docs officielles du package/API avant ce slice.

- [ ] Tache 12 : Gerer le mode unsupported et les erreurs bridge
  - Fichier : `lib/features/keyboard/presentation/keyboard_corner_shortcuts_screen.dart`
  - Action : Rendre explicite la simulation web/non-Android, desactiver les saves natives indisponibles, afficher retry pour load/save et garder le draft local tant qu'il n'est pas persiste.
  - User story link : evite les faux succes quand l'utilisateur teste sur Vercel.
  - Depends on : Taches 6 a 8.
  - Validate with : test widget `PlatformCapabilities.keyboardImeSupported == false`.
  - Notes : ne pas promettre de changement IME depuis le web.

- [ ] Tache 13 : Ajouter tests widget et unitaires dedies
  - Fichier : `test/widget_test.dart`
  - Action : Couvrir selection de touche, selection de coin, recherche snippet, choix accent, warning private mode, draft preview, save via MethodChannel mock, reset touche, import invalide et unsupported.
  - User story link : prouve les workflows principaux de l'editeur.
  - Depends on : Taches 1 a 12.
  - Validate with : `flutter test test/widget_test.dart`.
  - Notes : si le fichier devient trop gros, creer `test/keyboard_corner_shortcuts_screen_test.dart`.

- [ ] Tache 14 : Aligner docs et verification
  - Fichier : `docs/VERIFICATION.md`
  - Action : Ajouter une matrice manuelle pour l'editeur visuel, private mode, snippets, import/export, web preview et Android native save.
  - User story link : donne une procedure claire pour verifier l'experience complete.
  - Depends on : Taches 6 a 13.
  - Validate with : revue docs + `git diff --check`.
  - Notes : mettre a jour aussi `docs/COMPONENTS.md` et `docs/PLATFORM_BEHAVIOR.md`.

# Acceptance Criteria

- [ ] CA 1 : Given l'editeur s'ouvre sur Android avec une config existante, when le chargement reussit, then le preset actif, la preview et les coins de la touche selectionnee correspondent a la config native.
- [ ] CA 2 : Given l'editeur s'ouvre sur web/non-Android, when l'utilisateur modifie un draft, then l'UI indique clairement que la config native Android n'est pas modifiee.
- [ ] CA 3 : Given l'utilisateur tape une touche dans la preview, when la touche est configurable, then elle devient la touche selectionnee et ses quatre coins sont affiches.
- [ ] CA 4 : Given l'utilisateur selectionne un coin, when il choisit un accent guide, then la preview draft affiche ce label de coin sans sauvegarder encore.
- [ ] CA 5 : Given l'utilisateur recherche un snippet par trigger, when il le selectionne, then l'editeur genere une action de text expansion lisible et valide.
- [ ] CA 6 : Given un snippet est sensible ou bloque en champ prive, when private preview est activee, then l'UI montre que l'action ne sera pas executee dans ce contexte.
- [ ] CA 7 : Given l'utilisateur choisit une action native-only, when il la preview, then l'UI affiche native-only au lieu d'inserer un faux texte.
- [ ] CA 8 : Given l'utilisateur modifie plusieurs coins, when il clique Discard, then la config saved est restauree et aucun appel natif save n'est fait.
- [ ] CA 9 : Given l'utilisateur clique Save avec une config valide, when le bridge natif repond succes, then l'etat devient saved et Settings peut relire le preset/status.
- [ ] CA 10 : Given le bridge natif refuse une expression, when Save echoue, then l'erreur est visible et la config active native reste inchangee.
- [ ] CA 11 : Given une touche a plusieurs overrides, when l'utilisateur reset key, then seuls les overrides de cette touche sont retires.
- [ ] CA 12 : Given un coin a un override, when l'utilisateur reset corner, then seul cet override est retire.
- [ ] CA 13 : Given l'utilisateur change de preset, when il n'a pas confirme la sauvegarde, then le changement reste un draft reversible.
- [ ] CA 14 : Given l'utilisateur importe un JSON valide, when le diff est affiche, then rien n'est persiste avant confirmation.
- [ ] CA 15 : Given l'utilisateur importe un JSON invalide ou trop grand, when il confirme import, then l'editeur refuse l'import et conserve le draft courant.
- [ ] CA 16 : Given l'utilisateur exporte sa config, when il inspecte le payload, then il contient seulement la config de coins versionnee et aucun clipboard, historique de saisie ou secret.
- [ ] CA 17 : Given une special key est configuree alors que special corners est off, when l'UI affiche cette action, then elle indique la barriere `specialKeyCornersEnabled`.
- [ ] CA 18 : Given un label de coin est trop long, when l'utilisateur sauvegarde, then l'UI demande de raccourcir ou propose un label tronque valide.

# Test Strategy

- Unit Dart: catalogue touches, generation d'expressions guidees, draft state, diff import, reset coin/key, private-mode classifier UI.
- Widget Flutter: chargement editeur, selection touche/coin sur preview, recherche snippets, action picker, preview draft, save success/error, unsupported web mode, import/export dialogs.
- MethodChannel mock: `getKeyboardCornerConfig`, `setKeyboardCornerConfig`, `resetKeyboardCornerConfig`, et eventuelle `validateKeyboardCornerConfig`.
- Kotlin compile seulement si une methode native de validation ou de nouveaux presets natifs sont ajoutes: `./gradlew :app:compileDebugKotlin -x :app:processDebugResources -x :app:processDebugManifest -x :app:compileFlutterBuildDebug`.
- Existing checks: `flutter analyze`, `flutter test test/widget_test.dart`, `git diff --check`.
- Manual Android QA: ouvrir l'editeur depuis Settings, sauvegarder accent/snippet/action, verifier insertion dans champ standard et suppression en champ prive, reset par touche, import/export.
- Manual web QA: Vercel preview montre l'editeur et la preview sans pretendre sauvegarder l'IME natif.

# Risks

- Security: l'UI facilite macros/actions puissantes. Mitigation: validation native, warnings private-field, pas de logs de contenu utilisateur, labels de sensibilite visibles.
- Data privacy: snippets peuvent contenir des donnees personnelles. Mitigation: recherche locale, diagnostics rediges sans contenu complet, export limite a la config.
- UX complexity: trop d'options peuvent ralentir l'utilisateur. Mitigation: presets et categories simples d'abord, expression avancee derriere un mode explicite.
- Drift preview/native: Flutter peut simuler une action que le natif refuse. Mitigation: native validation avant save pour actions non triviales et statut native-only.
- Data loss: import/reset peut effacer des overrides. Mitigation: draft, diff, confirmation et reset cible.
- Build environment: Android full tests peuvent rester limites sur ARM/AAPT2. Mitigation: Flutter tests + compile Kotlin partielle + QA device/CI.
- Accessibility: selection tactile seule serait insuffisante. Mitigation: controle alternatif par liste/segments, semantics labels et focus clavier.

# Execution Notes

- Lire d'abord `keyboard_corner_shortcuts_screen.dart`, `keyboard_preview_screen.dart`, `keyboard_models.dart`, `android_keyboard_bridge.dart`, `snippets_screen.dart` et `KeyboardCornerShortcuts.kt`.
- Commencer par les modeles UI/draft et l'inventaire partage avant de refondre l'ecran; cela reduit le risque de casser preview et tests.
- Reutiliser les tokens `AppTheme`, `AppInsets`, `AppGaps`, `AppKeyboardPreview`; ne pas introduire un nouveau design system.
- Garder le save natif en une operation explicite; chaque modification UI reste en draft jusque-la.
- Eviter de dupliquer la grammaire complete `KeyboardKeyValue` en Dart. Generer les cas guides simples et laisser le natif valider les expressions avancees.
- Stop condition: si l'import/export demande file system, share sheet ou package externe, consulter les docs officielles du package/API avant implementation et mettre a jour cette spec si le contrat change.
- Stop condition: si une action guidee exige une nouvelle permission Android ou un nouveau type d'action natif, sortir cette action dans une spec runtime separee.
- Fresh docs verdict: `fresh-docs not needed` pour le cadrage actuel; reevaluer si nouveau package/API externe.

# Open Questions

None.

# Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-05-14 16:09:20 UTC | sf-spec | GPT-5 Codex | Created a separate product-UX spec for the visual keyboard swipe-corner settings editor. | Draft spec saved. | /sf-ready Keyboard Swipe Corner Settings Editor |
| 2026-05-14 16:16:08 UTC | sf-ready | GPT-5 Codex | Reviewed user story, behavior contract, dependencies, security/private-field posture, docs coherence, implementation tasks and tests during sf-build orchestration. | ready | /sf-start Keyboard Swipe Corner Settings Editor |
| 2026-05-14 16:29:32 UTC | sf-build | GPT-5 Codex + worker | Implemented the visual corner editor with selectable preview, draft-before-save state, guided actions, snippet search, private/native-only warnings, targeted resets, JSON import/export, tests and docs. | implemented | /sf-ship Keyboard Swipe Corner Settings Editor with bounded keyboard-only scope |
| 2026-05-14 16:30:18 UTC | sf-ship | GPT-5 Codex | Shipped a bounded keyboard-editor commit after local Flutter tests, web build and diff checks; excluded unrelated dirty auth/settings/shell files. | shipped | /sf-prod winglowz_app to inspect the Vercel preview |

# Current Chantier Flow

- sf-spec: done, draft written in `shipglows_data/workflow/specs/keyboard-swipe-corner-settings-editor.md`.
- sf-ready: ready; the spec has a concrete user story, behavior contract, ordered implementation tasks, docs impacts, security/private-field constraints and test strategy.
- sf-start: implemented inside `sf-build`; Flutter editor now supports visual key/corner selection, guided actions, snippet search, draft/save separation, private/native-only warnings, resets, and JSON import/export without adding a native runtime dependency.
- sf-verify: local verification passed inside `sf-build` with `flutter analyze`, `flutter test test/keyboard_corner_shortcuts_screen_test.dart`, `flutter test test/widget_test.dart`, `git diff --check`, and `flutter build web`.
- sf-end: not launched in this quick ship; no TASKS.md or CHANGELOG.md closeout was requested.
- sf-ship: shipped as a bounded keyboard-editor scope; unrelated dirty auth/settings/shell files remain excluded.

Prochaine commande recommandee: `/sf-prod winglowz_app` to inspect the matching Vercel preview before browser QA.
