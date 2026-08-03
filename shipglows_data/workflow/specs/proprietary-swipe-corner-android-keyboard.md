---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-05-09"
created_at: "2026-05-09 15:32:50 UTC"
updated: "2026-05-16"
updated_at: "2026-05-16 12:44:20 UTC"
status: ready
source_skill: sf-spec
source_model: "GPT-5 Codex"
scope: "feature"
owner: "Diane"
confidence: high
user_story: "En tant qu'utilisateur Android de WinGlows, je veux un clavier proprietaire rapide et utilisable, avec caracteres secondaires accessibles par gestes vers les coins, afin de remplacer le prototype actuel inutilisable par une implementation entierement codee par nous."
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Android InputMethodService"
  - "WinGlows native Kotlin IME"
  - "Flutter Settings"
  - "Android keyboard MethodChannel"
  - "ClipboardHistoryApi"
  - "Android speech recognition"
  - "Android media key dispatch"
depends_on:
  - artifact: "shipglows_data/business/business.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/business/product.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/business/branding.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/guidelines.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/workflow/specs/android-ime-winglowz_app-keyboard.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/workflow/specs/clipboard-backend-agnostic-api.md"
    artifact_version: "1.0.0"
    required_status: "ready"
  - artifact: "shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md"
    artifact_version: "1.0.0"
    required_status: "ready"
supersedes: []
evidence:
  - "User decision: product must remain proprietary and the keyboard implementation will be coded in-house."
  - "User requirement: the current WinGlows keyboard prototype was tested and is not usable enough for daily typing."
  - "Product direction: use tap plus swipe-to-corner gestures so one compact key can expose primary and secondary characters."
  - "Local Android IME exists at android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime but WinGlowzKeyboardView is a Button-based minimal QWERTY prototype with no real swipe-corner layout engine."
  - "Local manifest already declares WinGlowzInputMethodService with BIND_INPUT_METHOD and @xml/winglowz_app_input_method."
  - "Android official docs checked 2026-05-10: IMEs are services extending InputMethodService declared with BIND_INPUT_METHOD, android.view.InputMethod intent, and metadata."
  - "Android official docs checked 2026-05-10: InputConnection commitText/deleteSurroundingText/performEditorAction are the correct path for field insertion and editing; deleteSurroundingTextInCodePoints is available for code point deletion."
  - "FlorisBoard repository reviewed 2026-05-09: Apache-2.0 Android keyboard with smartbar quick actions, configurable preferences, input feedback, incognito behavior, editor/input abstractions and IME window concepts."
  - "User decision 2026-05-09: keep WinGlows adaptive smartbar because pinned actions give users a fixed option while unpinned actions can adapt."
  - "User decision 2026-05-09: do not rely on swipe arrows for cursor navigation; add a dedicated Navigation mode with a large joystick/D-pad and visible edit buttons."
  - "User decision 2026-05-09: strengthen private/incognito mode with visible indicator and no dictation, clipboard capture, enriched snippets, usage stats or sync."
  - "User decision 2026-05-09: long press on an action-bar button must be configurable between pinning the action and attaching a persistent contextual quick-action row for that action."
  - "User decision 2026-05-09: onboarding means a concrete keyboard activation assistant in Settings, with Android enablement, active keyboard selection and an integrated test field."
  - "User decision 2026-05-09: add a hidden developer touch-debug mode that overlays key bounds, detected swipe direction, gesture thresholds and triggered action for tuning."
  - "User decision 2026-05-09: add double-space-to-period as a keyboard setting; exclusions for email/URL/password/OTP should be best-effort, and the user can disable the feature if it is annoying."
  - "User decision 2026-05-09: add punctuation auto-spacing as a disableable keyboard correction, enabled by default for French and disabled by default for English."
  - "User decision 2026-05-09: adapt visible keys and enter action to Android field type, including email, URL, phone and search contexts."
  - "User decision 2026-05-09: do not add one-handed/compact left-right mode; add only a lightweight landscape/tablet adaptation for height, spacing and density."
  - "User decision 2026-05-09: add a lightweight emoji panel with recent emojis and simple categories; no full emoji search/catalog in the MVP."
  - "User decision 2026-05-09: after pasting from the clipboard panel, the keyboard should automatically close the panel and return to the normal typing layout."
  - "User decision 2026-05-09: clipboard items can be pinned so they are never automatically deleted, and the user can choose the retention duration for non-pinned clipboard history."
  - "User decision 2026-05-09: clipboard retention choices are 24 hours, 7 days, 30 days, and unlimited, with 7 days as the default."
  - "User decision 2026-05-09: pinned clipboard items should be accessible through a small dedicated pinned-items button/filter, so many pinned items do not crowd the normal clipboard history."
  - "User decision 2026-05-09: Navigation mode needs visible adjacent buttons for word-by-word left/right movement and paragraph-by-paragraph up/down movement, in addition to character movement."
  - "User decision 2026-05-09: paragraph navigation targets real paragraphs, with fallback only when the host field does not provide enough text context."
  - "User decision 2026-05-09: special keys such as Shift/Maj and Control can support a double-tap policy for secondary actions."
  - "User decision 2026-05-09: add drawable gesture shortcuts starting from the space bar, with a settings page to record shapes and bind each recognized shape to an action."
  - "User decision 2026-05-09: drawable gestures from the space bar should start by movement threshold, not long press; tap remains space, swipe/draw beyond a configurable threshold starts the gesture."
  - "User decision 2026-05-16: action bars and attached quick-action rows must share one normalized architecture; individual actions must declare capabilities and content, not reimplement tap, long-press, pinning, paging, availability, rendering or feedback behavior."
  - "User decision 2026-05-16: attached action rows scroll by whole pages, not by arbitrary pixel drift; the number row first page keeps digits 1-0 visible and extra math/sign characters live on adjacent pages."
  - "User decision 2026-05-09: backend work is backend-agnostic, Firebase is the first remote adapter, and Supabase is legacy/reference only."
  - "Android official docs checked 2026-05-10: external actions should use explicit/implicit Intents where available, common intents for standard tasks, app launch intents, settings intents, app shortcuts when exposed by apps, and package visibility constraints when querying availability."
  - "Reference keyboard reviewed at /home/claude/keyboard on 2026-05-11: mature IME service uses input-method subtypes, supports switching to next input method, onStartInputView/onUpdateSelection lifecycle hooks, EditorConfig-style field context, layout parsing, candidates, dictionaries, direct-boot-aware preferences and parser-level tests."
next_step: "/sf-start Proprietary Swipe-Corner Android Keyboard action-bar architecture"
---

# Title

Proprietary Swipe-Corner Android Keyboard

# Status

Ready for implementation. This spec defines a WinGlows-owned Android keyboard implementation coded in-house. Current code state as of 2026-05-16: `WinGlowzKeyboardView.kt` and `WinGlowzInputMethodService.kt` include a modular Canvas/touch keyboard with tap + swipe-corner classifier, QWERTY/AZERTY profile switching, field-context behavior, native panels, configurable height/compact behavior, theme application, and transitional pinned action rows. The full spec remains open because advanced modules, final action-bar architecture, richer emoji/clipboard workflows, Android packaging proof and Android real-device QA are not complete. Next slice: replace transitional action-row branches with the shared action-bar architecture contract from Taches 10-11.

# User Story

En tant qu'utilisateur Android de WinGlows, je veux un clavier proprietaire rapide et utilisable, avec caracteres secondaires accessibles par gestes vers les coins, afin de remplacer le prototype actuel inutilisable par une implementation entierement codee par nous.

Acteur principal: utilisateur Android de WinGlows qui active WinGlows keyboard comme methode de saisie systeme.

Declencheur: l'utilisateur focalise un champ texte, selectionne WinGlows keyboard, puis tape ou glisse sur une touche pour produire un caractere primaire ou secondaire.

Resultat observable: le clavier est assez fiable pour ecrire un message normal, corriger, changer de layout, entrer des chiffres/symboles courants, utiliser dictation/clipboard/snippets/media sans bloquer la saisie, et rester en mode prive dans les champs sensibles.

# Minimal Behavior Contract

Quand WinGlows keyboard est actif dans un champ Android compatible, le clavier affiche une surface native stable construite avec des briques modulaires: modules de rangées de touches, modules de panneaux, modules d'actions, modules de modes, modules de langues, modules de themes et modules de feedback. Les profils QWERTY et AZERTY sont des assemblages de ces briques, avec un mode normal sans caracteres de coins et un mode avance optionnel ou chaque touche compatible peut produire jusqu'a quatre caracteres secondaires par glissement vers les coins. Le clavier insere le texte via le champ courant, gere effacement, espace, entree, shift, une barre haute d'icones compactes composee de briques d'actions modulaires, chiffres/signes mathematiques, accents, symboles, emoji, mode Navigation, actions WinGlows, clipboard, langues actives, themes, parametres, configuration de barre, et retour au layout texte sans latence perceptible. L'utilisateur peut ajouter, retirer et reordonner des modules autorises du clavier, y compris la barre haute et certaines rangees/panneaux, sans pouvoir supprimer le set minimal necessaire pour taper et revenir aux parametres. Le bouton emoji ouvre un panneau leger, pas un clavier emoji complet: il affiche les emojis recents, quelques categories simples, insere l'emoji choisi via `InputConnection`, et n'enregistre aucun recent en mode prive ou champ sensible. Le panneau clipboard permet de coller un element admissible puis se ferme automatiquement apres collage reussi pour revenir au layout de saisie normal; il garde l'historique normal lisible et propose un petit bouton/filtre `Epingles` pour basculer vers les elements epingles sans les afficher tous au-dessus de l'historique. L'utilisateur peut epingler des elements clipboard pour les exclure de la purge automatique, et choisir une duree de retention pour les elements non epingles parmi `24h`, `7 jours`, `30 jours` et `illimite`, avec `7 jours` par defaut. Un panneau langues, accessible depuis la barre d'actions et le panneau parametres, remplace temporairement le clavier pour choisir quelles langues sont actives pour les layouts clavier et la dictee vocale. Un panneau themes, accessible depuis la barre d'actions et le panneau parametres, remplace temporairement le clavier pour choisir le theme du clavier, de la barre d'action et du panneau parametres; chaque theme a obligatoirement une variante light et une variante dark, et l'utilisateur choisit un mode d'apparence `light`, `dark` ou `system`. La barre haute est swipable pour afficher des rangees/pages supplementaires d'icones; elle classe progressivement les actions non epinglees par frequence et recence d'utilisation locale, tandis que les actions epinglees restent fixes et donnent a l'utilisateur un clavier stable quand il le veut. Le comportement long press des actions de la barre haute est configurable dans les parametres: soit le long press epingle/desepingle l'action, soit il attache sous la barre principale une rangee contextuelle persistante contenant les quick actions de cette action, par exemple une rangee chiffres `1` a `0` pour l'action Chiffres ou une rangee media avec play/pause, precedent, suivant et controles disponibles pour l'action Media. Les rangees contextuelles attachees restent visibles pendant le travail courant jusqu'a fermeture manuelle, peuvent etre ajoutees a la volee, et ne remplacent pas le layout principal sauf si l'action le demande explicitement. Le bouton parametres remplace temporairement le clavier par un panneau de boutons de reglage rapides; le bouton media affiche un symbole compact type `>| ||`, lance play/pause au tap, et peut ouvrir ou attacher une barre media selon le comportement long press choisi. Le mode Navigation remplace temporairement le clavier par un grand joystick/D-pad central, des fleches tres visibles, des boutons adjacents gauche/droite pour mouvement caractere par caractere et mot par mot, des boutons adjacents haut/bas pour mouvement ligne/paragraphe, des boutons lateraux de suppression caractere/mot a gauche et a droite, et des actions de repetition au long press pour les suppressions mot a mot. Un appui sur mot gauche va au debut du mot precedent; un appui sur mot droite va au debut du mot suivant ou au prochain separateur pertinent selon le champ; un appui sur paragraphe haut/bas va au debut du paragraphe precedent/suivant quand l'app hote expose assez de texte autour du curseur. Les reglages natifs du clavier et ceux de la page Settings Flutter representent le meme contrat de preferences; un changement d'un cote doit etre visible de l'autre cote des que la synchronisation locale est disponible. Si le geste est ambigu, hors seuil, revient au centre, annule, ou si le champ refuse l'action, le clavier ne produit pas de caractere inattendu et affiche un feedback discret haptique/audio selon preferences. L'edge case facile a rater est le champ sensible: le clavier doit rester utilisable pour taper, mais afficher un indicateur prive et desactiver dictation, clipboard capture, snippets enrichis, apprentissage, stats d'usage adaptatives, historique emoji et toute sync.

Precision Navigation: le mouvement paragraphe haut/bas cible un vrai paragraphe, pas simplement la ligne visuelle precedente/suivante. Un paragraphe est detecte depuis les separateurs de paragraphe disponibles dans le texte autour du curseur; si Android ou l'app hote ne fournit pas assez de contexte, le bouton utilise un fallback non destructeur clairement indique.

Politique touches speciales: les touches speciales comme Shift/Maj, Controle, espace, entree, backspace, Navigation ou Parametres peuvent declarer des actions distinctes pour simple appui, double appui et appui long. Le double appui est reserve aux actions utiles mais non critiques, doit avoir un delai court configurable, un feedback visible/haptique specifique, et doit etre desactivable globalement ou par touche si l'utilisateur declenche trop d'actions par accident. Priorite de detection: si un appui long est atteint, il gagne sur double appui; sinon deux taps de la meme touche dans la fenetre configurée declenchent l'action double appui; un tap seul garde l'action normale.

Gestes dessines depuis espace: l'utilisateur demarre sur la barre espace; si le doigt se leve sans depasser le seuil de mouvement, l'action reste un espace normal, et si le mouvement depasse le seuil configurable, par defaut autour de 20 px/dp apres calibration densite, le clavier bascule en mode trace et l'utilisateur dessine un motif simple sur la surface clavier, par exemple ligne, angle, zigzag, carre ou cercle. Pendant le trace, le clavier affiche le motif reconnu et l'action associee a cote; au relachement, si la confiance de reconnaissance depasse le seuil et que l'action est autorisee dans le contexte courant, l'action est lancee. Une page de parametres permet d'enregistrer des gestes, tester la reconnaissance, regler le seuil de demarrage, voir les collisions entre motifs, choisir l'action associee et desactiver la fonctionnalite. Les actions disponibles passent par un catalogue Android conservateur: actions WinGlows internes, ouverture d'une app installee via launch intent, intents Android communs quand disponibles, ecrans Settings Android connus, raccourcis d'app exposes quand Android les rend disponibles, media controls deja supportes, et insertion de texte/snippet. Les actions qui exigent permissions, accessibilite, automatisation systeme profonde ou controle d'une autre app non expose par Android sont marquees indisponibles au lieu d'etre promises.

# Action Bar Architecture Contract

Les barres d'action WinGlows doivent etre implementees par une architecture commune, pas par une addition de cas speciaux dans `WinGlowzKeyboardView.kt`. Chaque action declare ses capacites dans un catalogue local, et le moteur commun gere le tap, l'appui long, l'epinglage, les rangees attachees, les pages horizontales, la disponibilite par contexte, le mode prive, le rendu, le feedback et les fallbacks. Une action fournit du contenu et des commandes; elle ne doit pas reimplementer le comportement de barre.

Contrat de modele attendu:
- `KeyboardActionDescriptor`: id stable, label court, icone/glyphe, description accessibilite, commande tap, politique de disponibilite, eligibilite a l'epinglage, eligibilite au tri adaptatif, surface visuelle, et fournisseur optionnel de rangee attachee.
- `KeyboardActionCatalog`: source locale unique des actions disponibles (`123`, `ABC`, accents, symboles, emoji, navigation, clip, media, theme, langues, prefs, snippets, dictation, configuration de barre). Le catalogue remplace les listes ad hoc dans le renderer.
- `KeyboardActionBarState`: ordre courant, actions epinglees, page visible, action active, rangees attachees, preference `actionBarLongPressBehavior`, et offsets/pages de lignes.
- `KeyboardActionRowSpec`: rangee d'actions attachable ou permanente avec items, taille de page visible, comportement `pagedHorizontal`, politique de fermeture, dedupe key, et surface `actionSurface`.
- `KeyboardActionRowProvider`: interface fournie par une action pour construire sa ou ses rangees contextuelles selon le contexte courant. Exemples: `123` produit chiffres puis signes mathematiques; `Navigation` produit fleches/debut/fin/del; `Media` produit controles media; `Clip` produit cut/copy/paste/paste history quand autorise.
- `KeyboardActionBarController`: applique la preference de long press, attache/detache les rangees, remet a zero les pages quand le contexte change, route les commandes vers le dispatcher, et garantit qu'aucune action ne peut creer de doublon.
- `KeyboardActionRenderer`: dessine toutes les barres/rangees d'action avec les memes regles de hitbox, paging, feedback pressed, couleurs action-surface et theming.

Comportement standardise:
- Tap: execute la commande primaire de l'action, ou ouvre le panneau/layout cible si l'action est un mode.
- Long press en `pin_action`: epingle/desepingle l'action si elle est pinnable; sinon feedback indisponible.
- Long press en `attach_context_row`: attache la rangee contextuelle fournie par l'action; si aucune rangee n'est disponible, feedback indisponible sans changer l'etat.
- Une rangee deja attachee n'est jamais dupliquee; le moteur la garde visible, la deplace selon l'ordre configure ou la remplace uniquement si la regle de dedupe le demande.
- Les rangees attachees utilisent un scroll horizontal par pages entieres. Un swipe gauche/droite remplace la page visible par la page precedente/suivante; les hitboxes correspondent toujours aux touches visibles.
- La rangee `123` affiche `1 2 3 4 5 6 7 8 9 0` sur la premiere page. Les signes comme `+`, `-`, `=`, `$` et autres caracteres utiles vont sur les pages suivantes.
- Les actions clipboard sensibles (`cut`, `copy`, `paste`, historique) appartiennent a l'action `Clip`, pas aux rangees Navigation ou Symboles.
- En mode prive, le moteur masque ou desactive les actions sensibles via la policy commune et n'incremente aucun usage adaptatif.
- Les actions/rangees indisponibles restent recuperables: statut bref, haptique de rejet si active, aucun crash, aucune emission de texte inattendue.
- Toute nouvelle barre ou action future doit passer par ces descriptors/providers; ajouter un nouveau `if (action == X)` dans le renderer ou dans la gestion long press est une regression d'architecture.

# Success Behavior

- Given WinGlows keyboard est active comme IME, when l'utilisateur ouvre un champ texte standard, then la vue clavier native apparait sans lancer Flutter et propose une rangee d'actions compacte plus un layout de saisie utilisable.
- Given la preview clavier FlutterWeb est ouverte sur Vercel, when l'utilisateur appuie sur les touches visibles, then un champ de saisie simule au-dessus du clavier affiche immediatement le texte produit.
- Given l'utilisateur teste Shift, Space, Back, Enter, une suggestion, un mode ou un panneau dans la preview FlutterWeb, when l'action est simulee localement, then le champ simule et un statut court montrent le resultat sans presenter cela comme une preuve de comportement IME Android natif.
- Given l'utilisateur change le contexte de preview email, URL, telephone, recherche ou prive, when la simulation est relancee, then les touches, les suggestions, les actions desactivees et le champ simule restent coherents avec ce contexte.
- Given l'utilisateur ouvre Settings sans clavier configure, when il consulte la section clavier, then un assistant d'activation affiche l'etape exacte: activer WinGlows keyboard dans Android, le choisir comme clavier actif, puis tester la saisie dans un champ integre.
- Given l'assistant d'activation est visible, when l'etat Android change, then il affiche un statut clair `pas active`, `active mais pas actif`, ou `actif`, et propose uniquement l'action suivante utile.
- Given le mode debug tactile est active dans les options developpeur, when l'utilisateur interagit avec le clavier, then les limites des touches, la direction de swipe detectee, les seuils et l'action declenchee sont visibles sans journaliser le texte utilisateur.
- Given l'option double espace point est activee, when l'utilisateur tape deux espaces apres un mot dans un champ texte standard, then le clavier remplace le premier espace par `. `; when le champ ressemble a email, URL, password, OTP ou autre champ sensible, then le clavier tente de ne pas appliquer cette correction.
- Given l'auto-espace ponctuation est active pour la langue courante, when l'utilisateur tape une ponctuation dans un champ texte standard, then le clavier corrige les espaces autour de cette ponctuation selon les regles de la langue; by default cette option est activee en francais et desactivee en anglais.
- Given le champ actif expose un type email, URL, telephone ou recherche, when le clavier s'ouvre, then il adapte les touches visibles et l'action entree au contexte: email montre `@`, `_`, `.com`; URL montre `/`, `.`, `.com`; telephone utilise un layout numerique; recherche utilise l'action search.
- Given l'appareil est en paysage, grand ecran, tablette ou split-screen, when le clavier s'ouvre, then il ajuste hauteur, espacement et densite pour rester utilisable sans activer un mode flottant ou une main.
- Given un profil clavier QWERTY ou AZERTY est charge, when le clavier construit sa surface, then il assemble les modules requis: barre haute, rangees lettres, rangee controle, gestion shift/backspace/space/enter, et panneaux de modes disponibles.
- Given une touche speciale declare une action double appui, when l'utilisateur tape deux fois cette touche dans la fenetre configuree, then l'action double appui est declenchee une seule fois avec feedback distinct, sans emettre deux actions simples.
- Given les gestes dessines depuis espace sont actives, when l'utilisateur demarre sur espace puis depasse le seuil de mouvement configurable, then le clavier bascule en mode trace, affiche l'action associee pendant le geste et l'execute au relachement si elle est autorisee.
- Given l'utilisateur ouvre les parametres de gestes dessines, when il enregistre un nouveau motif, then WinGlows teste la reconnaissance, signale les collisions avec les motifs existants, et demande de choisir une action disponible dans le catalogue.
- Given l'utilisateur tape au centre d'une touche lettre, when le doigt se leve sans sortir du seuil de tap, then le caractere primaire est insere une seule fois via `InputConnection.commitText`.
- Given une touche contient un caractere secondaire dans un coin, when l'utilisateur glisse au-dela du seuil vers ce coin et relache, then le caractere du coin est insere et aucun caractere primaire n'est emis.
- Given le geste sort puis revient au centre avant relache, when le deplacement final est classe comme retour centre, then le geste est annule et aucun caractere primaire ou secondaire n'est insere.
- Given l'utilisateur appuie sur backspace, when il n'y a pas de selection, then un code point avant le curseur est supprime sans casser les emoji/surrogates; si une selection existe, elle est remplacee/supprimee selon le comportement du champ.
- Given l'utilisateur choisit QWERTY ou AZERTY dans les preferences clavier, when le clavier s'ouvre, then le layout selectionne est utilise; AZERTY privilegie les accents francais dans les coins quand les coins sont actives.
- Given l'utilisateur ouvre le panneau langues depuis la barre haute ou le panneau parametres, when il active ou desactive une langue, then cette langue apparait ou disparait des choix de layout clavier et des choix de dictee vocale.
- Given plusieurs langues sont actives, when l'utilisateur change la langue courante du clavier, then le layout/module associe est charge et la dictee vocale utilise la meme langue par defaut sauf si l'utilisateur choisit une langue de dictee differente.
- Given l'utilisateur ouvre le panneau themes depuis la barre haute ou le panneau parametres, when il choisit un theme et un mode `light`, `dark` ou `system`, then le clavier, la barre d'action et le panneau parametres appliquent la variante resolue sans relancer l'app Flutter.
- Given l'utilisateur change un reglage clavier depuis la page Settings Flutter, when le clavier est ouvert ensuite ou recoit la mise a jour locale, then le meme reglage est applique cote IME; l'inverse est vrai pour les reglages modifies depuis le clavier.
- Given le mode coins est desactive, when l'utilisateur glisse sur une touche lettre, then le clavier ignore les caracteres de coins et conserve un comportement de clavier normal.
- Given la barre haute d'icones est visible, when l'utilisateur appuie sur le bouton chiffres/math, then le clavier passe aux chiffres et signes mathematiques; when il appuie sur accents, then il passe au layout accents; when il appuie sur symboles, then il passe au layout symboles; when il appuie sur emoji, then il ouvre le panneau emoji; when il appuie sur lettres, then il revient au layout QWERTY/AZERTY courant.
- Given le panneau emoji leger est ouvert, when l'utilisateur choisit un emoji recent ou une categorie simple, then l'emoji est insere via `InputConnection` et apparait dans les recents uniquement si le champ n'est pas prive/sensible.
- Given la barre haute d'icones contient plus d'actions que l'ecran ne peut afficher, when l'utilisateur swipe la barre, then la rangee/page suivante d'icones apparait sans changer le texte deja saisi ni le layout courant.
- Given l'utilisateur utilise regulierement certaines actions, when le score local d'usage est mis a jour, then les actions non critiques les plus utilisees remontent dans les premieres positions de la barre sans deplacer brutalement les actions epinglees.
- Given l'utilisateur epingle une action dans la barre haute, when le classement adaptatif se met a jour, then cette action conserve sa position fixe et seules les actions non epinglees peuvent etre reordonnees.
- Given le comportement long press de barre est configure sur `pin_action`, when l'utilisateur reste appuye sur une action de la barre haute, then cette action est epinglee ou desepinglee sans ouvrir de rangee contextuelle.
- Given le comportement long press de barre est configure sur `attach_context_row`, when l'utilisateur reste appuye sur une action compatible, then une rangee contextuelle liee a cette action est ajoutee sous la barre principale et reste visible jusqu'a fermeture manuelle.
- Given l'action Chiffres expose une rangee contextuelle, when l'utilisateur la long press avec `attach_context_row`, then une rangee de chiffres rapides est ajoutee a la volee au-dessus du layout de saisie principal.
- Given l'action Media expose une rangee contextuelle, when l'utilisateur la long press avec `attach_context_row`, then une rangee media persistante est ajoutee avec les controles disponibles sans masquer le clavier principal.
- Given l'utilisateur ouvre la configuration de barre depuis la barre haute ou le panneau parametres, when il ajoute ou retire une action, then la barre se reconstruit depuis le catalogue de briques modulaires et persiste la selection localement.
- Given l'utilisateur ouvre la configuration du clavier, when il ajoute, retire ou reordonne un module autorise, then le clavier reconstruit le profil depuis le catalogue de modules et persiste la configuration localement.
- Given la barre haute d'actions est visible, when l'utilisateur appuie sur clipboard, then le panneau clipboard s'ouvre; when il reste appuye sur clipboard, then le clavier affiche les actions clipboard secondaires disponibles sans capturer de contenu sensible.
- Given le panneau clipboard est ouvert, when l'utilisateur colle un element admissible avec succes, then le panneau se ferme automatiquement et le clavier revient au layout de saisie normal.
- Given le panneau clipboard est ouvert, when l'utilisateur epingle un element, then cet element reste conserve jusqu'a suppression manuelle meme si la retention automatique purge les autres elements.
- Given le panneau clipboard contient des elements epingles, when il s'ouvre, then un petit bouton/filtre `Epingles` permet d'afficher les elements epingles sans pousser l'historique normal vers le bas.
- Given l'utilisateur change la duree de retention clipboard, when il choisit `24h`, `7 jours`, `30 jours` ou `illimite` et que la purge automatique s'execute, then seuls les elements non epingles plus anciens que cette duree sont supprimés; par defaut la retention est `7 jours`.
- Given la barre haute d'actions est visible, when l'utilisateur appuie sur Navigation, then le clavier est remplace par un panneau de navigation avec un gros joystick/D-pad central, des fleches tres visibles, mouvement caractere gauche/droite, mouvement mot gauche/droite, mouvement paragraphe haut/bas, suppression caractere gauche/droite, suppression mot gauche/droite et retour au clavier lettres.
- Given le mode Navigation est ouvert, when l'utilisateur appuie sur mot gauche ou mot droite, then le curseur se deplace au debut du mot precedent ou suivant; chaque appui repete le saut d'un mot.
- Given le mode Navigation est ouvert, when l'utilisateur appuie sur paragraphe haut ou paragraphe bas, then le curseur se deplace vers le debut du vrai paragraphe precedent ou suivant quand le champ permet de calculer cette position; sinon le clavier applique un fallback non destructeur.
- Given le mode Navigation est ouvert, when l'utilisateur reste appuye sur supprimer mot a gauche ou supprimer mot a droite, then l'action se repete mot par mot dans la direction correspondante jusqu'au relachement ou a l'annulation.
- Given la barre haute d'actions est visible, when l'utilisateur appuie sur parametres, then le layout de touches est remplace temporairement par un panneau de reglages rapides avec retour au clavier, ouverture des parametres Android, changement de clavier par defaut, toggle coins sur les touches, et toggle raccourcis haptiques.
- Given le bouton media affiche `>| ||`, when l'utilisateur appuie dessus, then WinGlows envoie play/pause; when il reste appuye dessus, then le comportement depend de la preference long press: epinglage de l'action ou ajout d'une rangee media contextuelle.
- Given un champ indique une action IME comme send/search/done, when l'utilisateur appuie sur entree, then `performEditorAction` est appele avant fallback key event.
- Given les preferences de feedback sont actives, when l'utilisateur tape, swipe, long press ou repete une suppression, then WinGlows emet le feedback haptique/audio configure en respectant les reglages systeme.
- Given le champ est password/OTP/noPersonalizedLearning/private, when le clavier s'ouvre, then les gestes de saisie restent actifs mais WinGlows affiche un etat prive et coupe dictation/clipboard/snippets/sync/stats adaptatives.
- Given l'utilisateur active clipboard sync clavier, when une capture explicite admissible arrive, then l'evenement passe par la queue native puis `ClipboardHistoryApi`, pas par Supabase direct.

# Error Behavior

- Si `currentInputConnection` est nul ou retourne false, l'action est consideree non appliquee; le clavier affiche un feedback bref et ne met pas a jour d'etat de sync.
- Si une touche de la preview FlutterWeb n'a pas encore de simulation fiable, elle affiche l'action attendue ou un statut non simule au lieu de modifier silencieusement le champ.
- Si une touche ou suggestion est desactivee en mode prive/sensible dans la preview FlutterWeb, elle reste inerte et ne modifie pas le champ simule.
- Si un geste reste sous le seuil ou tombe entre deux directions, il est traite comme tap primaire ou annule selon la regle documentee; il ne choisit jamais un coin aleatoire.
- Si un geste revient au centre avant relache, il est toujours annule et n'insere rien.
- Si plusieurs pointeurs touchent le clavier, seul le premier pointeur actif peut produire une action; les autres sont ignores jusqu'a relache complete.
- Si le layout courant manque une definition de touche, le clavier refuse de charger le layout et retombe sur le layout QWERTY proprietaire embarque en mode normal.
- Si le champ est sensible, aucune dictation, capture clipboard, snippet enrichi, prediction, journalisation texte ou sync n'est autorisee.
- Si le champ est sensible, le classement adaptatif et les stats locales d'usage de la barre ne doivent pas enregistrer les actions realisees pendant cette session privee.
- Si le champ est sensible, le panneau emoji reste utilisable pour inserer un emoji si le champ l'accepte, mais il ne lit ni n'ecrit l'historique des recents.
- Si l'insertion emoji echoue, si le champ refuse les caracteres non texte, ou si l'emoji choisi n'est pas supporte correctement par l'app hote, le clavier affiche un feedback bref et reste dans le panneau sans crash.
- Si le texte ou le clipboard depasse les limites du contrat existant, l'insertion directe peut rester autorisee mais la capture/sync est refusee avec raison recuperable.
- Si un collage depuis le panneau clipboard echoue ou est refuse par le champ, le panneau reste ouvert avec feedback bref pour permettre de reessayer ou choisir un autre element; fermeture automatique uniquement apres collage confirme.
- Si un element clipboard est epingle, la purge automatique par retention ne peut pas le supprimer; seule une suppression manuelle explicite ou une action de reset total confirmee peut le retirer.
- Si la duree de retention clipboard est modifiee vers une duree plus courte, la purge s'applique seulement aux elements non epingles et doit pouvoir afficher combien d'elements seront concernes avant une purge manuelle depuis Settings.
- Si la configuration de retention clipboard est absente, invalide ou corrompue, WinGlows utilise `7 jours` par defaut et ne supprime aucun element epingle.
- Si la retention clipboard est `illimite`, les elements non epingles ne sont pas purges par age, mais restent supprimables manuellement et peuvent disparaitre lors d'un reset app ou effacement des donnees Android.
- Si Android speech recognition, media key dispatch, ou clipboard systeme echoue, la saisie clavier reste disponible.
- Si un long press action est declenche dans un contexte prive ou sans permission, l'action secondaire est masquee ou affiche un etat indisponible; elle ne force pas une permission et ne contourne pas le mode prive.
- Si le comportement long press est `attach_context_row` mais que l'action ne fournit aucune rangee contextuelle, le clavier affiche un feedback bref et ne modifie pas l'epinglage.
- Si une rangee contextuelle est deja attachee, un nouveau long press sur la meme action la garde visible, la deplace selon l'ordre configure ou la ferme seulement si ce comportement est explicitement choisi; il ne cree pas de doublon.
- Si trop de rangees contextuelles sont attachees pour la hauteur disponible, le clavier applique une limite visible, compacte les rangees ou demande de fermer une rangee existante; il ne reduit pas les touches principales sous une taille utilisable.
- Si une rangee contextuelle contient une action indisponible dans le contexte courant, cette action est desactivee ou masquee sans supprimer la rangee attachee.
- Si le panneau parametres est ouvert et qu'une action systeme echoue ou quitte l'IME, les preferences locales deja modifiees restent coherentes et l'utilisateur peut revenir au clavier.
- Si le classement adaptatif ne peut pas lire ou ecrire ses stats locales, la barre retombe sur l'ordre par defaut sans bloquer la saisie.
- Si une action est epinglee, le classement adaptatif ne peut pas la deplacer; si la configuration d'epinglage est corrompue, le set minimal epingle est restaure.
- Si la configuration de barre est vide, corrompue ou retire une action obligatoire, le clavier restaure un set minimal epingle: lettres, parametres, configuration de barre et retour clavier.
- Si la configuration modulaire du clavier est vide, corrompue ou retire un module obligatoire, le clavier restaure un profil minimal utilisable avec lettres, espace, entree, backspace, parametres et retour clavier.
- Si une action modulaire est indisponible dans le contexte courant, elle reste visible comme desactivee ou est masquee selon sa definition, mais sa presence dans la configuration utilisateur n'est pas perdue.
- Si aucune langue n'est active apres une modification, le clavier restaure la langue par defaut de l'appareil ou `fr-FR`/`en-US` selon le profil disponible.
- Si une langue active n'a pas de layout ou de support dictee disponible sur l'appareil, le panneau langues l'indique et utilise le meilleur fallback sans bloquer la saisie.
- Si un theme est invalide, absent, incomplet, ou manque une variante light/dark, le clavier retombe sur le theme par defaut et le mode `system` tout en gardant les preferences utilisateur non visuelles.
- Si la synchronisation entre IME et Settings Flutter n'est pas disponible au moment du changement, le reglage est conserve localement puis expose a l'app au prochain bridge disponible.
- Si le swipe de barre est confondu avec un tap, l'action ne doit pas se declencher accidentellement; seuils et feedback differencient tap, swipe de barre et long press.
- Si une touche speciale recoit deux taps trop lents, ils sont traites comme deux actions simples; si le second tap arrive dans la fenetre de double appui, l'action double appui remplace la deuxieme action simple selon la definition de la touche et ne doit pas produire une double emission confuse.
- Si un appui long est detecte sur une touche speciale, il gagne sur le double appui et annule l'attente de double tap pour cette interaction.
- Si les actions double appui sont desactivees globalement ou pour une touche, la touche garde son comportement simple appui/appui long habituel.
- Si le doigt part de la barre espace puis se leve avant le seuil de mouvement, le clavier insere un espace normal et ne demarre pas la reconnaissance de geste.
- Si le trace depuis espace est trop court apres demarrage, ambigu, trop proche d'un autre motif, ou sous le seuil de confiance, aucune action n'est lancee et le clavier affiche une annulation claire.
- Si le geste dessine correspond a une action indisponible dans le contexte courant, par exemple permission manquante, app absente, intent non resolu, champ prive, ou action bloquee par Android, le clavier affiche l'indisponibilite et ne tente pas de contourner Android.
- Si l'utilisateur relache le geste hors de la zone clavier ou annule en revenant sur espace selon le geste d'annulation defini, aucune action n'est lancee.
- Si l'utilisateur revient des reglages Android sans avoir active ou selectionne le clavier, l'assistant garde l'etape incomplete visible et ne marque pas le clavier comme pret.
- Si le statut Android est incoherent ou non lisible, l'assistant affiche un etat recuperable avec bouton rafraichir et lien vers les reglages Android, sans bloquer le reste de Settings.
- Si le mode debug tactile est active en champ sensible, il affiche uniquement des metadonnees de geste et de layout; il ne montre ni ne loggue le texte, le clipboard, les suggestions ou le contenu du champ.
- Si l'option double espace point est activee mais que le champ est email, URL, password, OTP, noPersonalizedLearning, raw input ou detecte comme sensible, le clavier ne doit pas appliquer la transformation; si la detection echoue dans une app hote, l'utilisateur peut desactiver l'option dans les parametres.
- Si l'auto-espace ponctuation est active mais que le champ est email, URL, password, OTP, code, raw input ou detecte comme sensible, le clavier ne doit pas appliquer la transformation; si la detection ou la regle de langue produit un resultat genant, l'utilisateur peut desactiver l'option.
- Si Android ne fournit pas un type de champ fiable ou si l'app hote expose un champ custom incoherent, le clavier retombe sur le layout texte standard et conserve l'action entree la plus sure.
- Si l'orientation, le split-screen ou le form factor donne une hauteur disponible trop faible, le clavier compacte les rangees non essentielles avant de reduire les touches principales sous une taille utilisable.
- Si le mode Navigation est ouvert sans `InputConnection` valide ou dans un champ qui refuse les mouvements, les boutons affichent un feedback d'indisponibilite et ne declenchent pas de suppression cachee.
- Si le mode Navigation ne peut pas lire assez de texte autour du curseur pour calculer un saut de mot ou de vrai paragraphe, le bouton concerne affiche un feedback d'indisponibilite ou applique le meilleur fallback non destructeur; le fallback ne doit pas etre presente comme un vrai saut paragraphe.
- Si un saut mot/paragraphe atteint le debut ou la fin du texte disponible, il s'arrete proprement et ne continue pas a envoyer des mouvements inutiles.
- Si une suppression mot par mot en long press atteint le debut ou la fin du champ, la repetition s'arrete proprement et ne continue pas a emettre des actions inutiles.
- Ce qui ne doit jamais arriver: texte utilisateur en logs, double emission tap+swipe, effacement de deux caracteres par backspace simple, ou blocage total de l'IME apres erreur de panneau WinGlows.

# Problem

Le repo WinGlows contient deja un IME Android natif, mais la vue actuelle est une pile de boutons Android standards: labels longs, layout rigide, pas de moteur de gestures, pas de vraie carte de touches, pas de comportement clavier attendu par un utilisateur. L'utilisateur a teste le clavier et le juge inutilisable. WinGlows a besoin d'un clavier proprietaire compact, fiable et agreable a utiliser au quotidien.

# Solution

Construire une implementation proprietaire et independante du clavier Android WinGlows autour d'un moteur de layout interne, d'une vue custom Kotlin dessinee/tactile, et d'un modele de gestes simple tap/swipe-corner. La premiere version doit privilegier la qualite de saisie de base et la compatibilite Android IME; dictation, clipboard, snippets et media restent dans une barre compacte, mais ne doivent pas rendre le clavier principal instable.

# Scope In

- Android uniquement.
- Remplacement de `WinGlowzKeyboardView` Button-based par une vue custom proprietaire dessinee en Kotlin.
- Modele de donnees interne modulaire pour profils clavier, modules de rangées, modules de touches, modules de panneaux, modules d'actions, labels primaires, labels secondaires de coins, largeur relative, roles, disponibilite par contexte et layouts.
- Layouts proprietaires QWERTY et AZERTY avec lettres, ponctuation courante, espace, entree, shift, backspace, settings et switch de modes.
- Profils clavier modulaires: QWERTY et AZERTY sont des assemblages de modules configurables avec un set minimal obligatoire.
- Configuration du clavier complet: ajouter/retirer/reordonner les modules autorises, restaurer le profil par defaut, et proteger les modules indispensables a la saisie.
- Barre haute d'icones compactes composee de briques modulaires: bouton lettres, bouton chiffres/signes mathematiques, bouton accents, bouton symboles, bouton emoji, bouton navigation, bouton clipboard, bouton dictation, bouton langues, bouton themes, bouton snippets, bouton parametres, bouton configuration de barre, bouton media compact.
- Panneau langues: remplace temporairement le clavier pour choisir les langues actives du clavier et de la dictee vocale, definir la langue courante, et voir les indisponibilites layout/dictee.
- Panneau themes: remplace temporairement le clavier pour choisir entre differents themes, choisir le mode `light`/`dark`/`system`, et appliquer la variante resolue au clavier, a la barre d'action et au panneau parametres.
- Panneau emoji leger: recents, categories simples, insertion directe, retour au clavier lettres, et historique local coupe en mode prive/sensible.
- Contrat de preferences partage: les reglages du clavier natif doivent correspondre aux reglages exposes dans la page Settings Flutter, incluant themes, langues, modules, barre d'action, coins, haptics, dictation, clipboard et media.
- Assistant d'activation dans Settings Flutter: guider l'utilisateur dans l'activation Android du clavier, la selection comme clavier actif, le rafraichissement de statut et le test de saisie integre.
- Mode debug tactile cache pour developpement: overlay local des bounds de touches, pointeur actif, direction/coin detecte, seuils de geste, action dispatch et motif d'annulation.
- Option de correction `double espace = point`, configurable dans les parametres clavier, appliquee uniquement en best-effort dans les champs texte standards.
- Option de correction d'espacement de ponctuation, configurable dans les parametres clavier et par langue; activee par defaut pour le francais, desactivee par defaut pour l'anglais.
- Variantes de layout contextuelles selon `EditorInfo`/type de champ: email, URL, telephone, recherche, texte standard et fallback normal quand Android ne fournit pas assez d'information fiable.
- Adaptation paysage/tablette legere: profils de hauteur, espacement, taille de police et densite par orientation/form factor, sans mode une main ni clavier flottant dans le MVP.
- Barre haute swipable: plusieurs rangees/pages d'icones accessibles par swipe pour exposer plus d'actions sans agrandir le clavier par defaut.
- Configuration de barre: ajouter/retirer/reordonner les actions disponibles depuis un bouton de la barre et depuis le panneau parametres.
- Classement adaptatif local des icones: les actions non critiques et non epinglees se reclassent par frequence/recence d'utilisation; les actions epinglees restent fixes pour permettre une barre stable.
- Preference de long press sur la barre haute: choisir entre `pin_action` et `attach_context_row`; `pin_action` epingle/desepingle l'action, `attach_context_row` ajoute sous la barre principale une rangee contextuelle persistante liee a l'action.
- Politique double appui pour touches speciales: catalogue d'actions speciales par touche, fenetre de double appui configurable, activation/desactivation globale et par touche, feedback dedie, et precedence claire avec l'appui long.
- Gestes dessines depuis la barre espace: demarrage par seuil de mouvement configurable depuis espace, tap sous seuil = espace normal, moteur de reconnaissance proprietaire pour motifs simples, overlay de trace, preview de l'action reconnue, seuil de confiance, annulation, page de parametres pour enregistrer/tester/supprimer les gestes, detection de collisions entre motifs, et catalogue d'actions Android/WinGlows autorisees.
- Catalogue d'actions pour gestes: actions internes WinGlows, insertion texte/snippet, ouvrir une app installee, ouvrir un ecran Settings Android connu, lancer un intent commun supporte, lancer un raccourci d'app expose par Android quand disponible, media controls supportes, et etats indisponibles explicites quand Android ne fournit pas l'action.
- Rangees contextuelles attachables: chaque action compatible peut declarer une rangee de quick actions attachee a la volee, persistante jusqu'a fermeture manuelle, avec bouton de fermeture, ordre controle, limite de hauteur, et fallback si l'action n'est plus disponible.
- Exemples de rangees contextuelles MVP: Chiffres ajoute une rangee `1 2 3 4 5 6 7 8 9 0`; Media ajoute une rangee media avec play/pause, precedent, suivant et controles disponibles; Navigation peut ajouter une rangee courte de fleches ou ouvrir le panneau complet selon configuration future.
- Bouton media visuel: symbole compact type `>| ||`, tap = play/pause, long press = epinglage ou rangee media contextuelle selon preference.
- Mode Navigation dedie: bouton de barre haute qui remplace temporairement le clavier par un gros joystick/D-pad central, fleches tres visibles, boutons adjacents pour mouvement caractere gauche/droite, mouvement mot gauche/droite, mouvement vrai paragraphe haut/bas avec fallback si contexte insuffisant, suppression caractere gauche/droite, suppression mot gauche/droite, repetition au long press pour suppression mot par mot, et retour clair au clavier.
- Bouton parametres: tap = panneau de reglages rapides qui remplace temporairement le clavier; ce panneau inclut au minimum retour clavier, ouvrir parametres Android, changer clavier par defaut, toggle coins sur touches, toggle raccourcis haptiques.
- Mode coins optionnel: clavier normal par defaut ou preference utilisateur explicite, avec coins visibles/actifs seulement quand le mode est active.
- Gestes proprietaires: tap primaire, swipe vers haut-gauche, haut-droite, bas-gauche, bas-droite, retour centre qui annule, annulation sous seuil, feedback visuel pendant drag.
- Feedback utilisateur: preferences haptique/audio separees pour tap, swipe-corner valide, annulation, long press et repetition; activation par defaut respectant les reglages systeme.
- AZERTY avance: privilegier accents francais dans les coins et/ou layout accents dedie.
- Detection de champ sensible via `KeyboardSecurityPolicy` existant, et maintien du mode prive.
- Insertion et edition via `InputConnection`: commitText, deleteSurroundingTextInCodePoints quand disponible, performEditorAction, sendKeyEvent fallback.
- Barre WinGlows compacte: dictation, clipboard panel, snippets, settings, media play/pause, sans bloquer les touches principales.
- Panneau clipboard: apres collage reussi, fermeture automatique du panneau et retour au layout texte courant.
- Panneau clipboard: afficher l'historique normal par defaut, avec un petit bouton/filtre `Epingles` pour afficher les elements epingles a la demande; epingler/desepingler un element, supprimer manuellement un element epingle, et afficher clairement que les elements epingles ne sont pas touches par la retention automatique.
- Reglages clipboard: choix de duree de retention pour les elements non epingles avec options `24h`, `7 jours`, `30 jours`, `illimite`; defaut `7 jours`; preference appliquee localement et coherente avec le contrat backend-agnostic clipboard.
- Preferences Flutter/MethodChannel existantes conservees: voiceEnabled, clipboardSyncDesired, mediaControlsEnabled, privacyMode.
- Tests unitaires JVM/Kotlin pour resolution layout/geste/politique autant que possible, plus tests Dart existants pour bridge/settings.
- Documentation de la QA Android manuelle.
- Preview FlutterWeb interactive dans `lib/features/keyboard/presentation/keyboard_preview_screen.dart`: champ de saisie simule, buffer/cursor local, taps de touches, Shift, Space, Back, Enter, suggestions, changements de mode/contexte/panneau, clear/reset, dernier statut d'action, et libelles explicites quand une action reste seulement visuelle.

# Scope Out

- Import d'une base clavier externe comme fondation du produit.
- Copie de layouts externes au lieu de definir les layouts WinGlows.
- Copie d'assets, icones, textes ou noms internes depuis une autre application clavier.
- Navigation principale par swipes fins sur espace/delete/fleches. Les swipes peuvent rester des raccourcis futurs, mais le MVP de navigation repose sur un mode dedie avec grosses cibles.
- Automatisation systeme illimitee depuis les gestes. WinGlows ne promet pas de cliquer dans d'autres apps, modifier des reglages proteges, contourner les permissions Android, ou executer des actions non exposees par intents/raccourcis/API autorisees.
- Autocorrect, dictionnaires, suggestions avancees, glide typing, emoji complet, recherche emoji, stickers/GIFs, themes marketplace.
- Editeur avance de themes personnalisés dans le MVP; seuls des themes predefinis et extensibles sont requis.
- Gestes circle/roundtrip comme actions productives dans le MVP WinGlows; le retour centre est uniquement une annulation.
- Multi-langues exhaustif au-dela de QWERTY et AZERTY.
- iOS custom keyboard, desktop/web keyboard, billing, entitlement premium.
- Fidelite IME native complete dans FlutterWeb: pas de vrai `InputConnection`, pas de gestes multi-touch natifs, pas de long press/repeat Android, pas de clipboard systeme, pas de voice/media systeme; la preview web est un outil de review rapide, pas la validation finale.
- Refonte du backend clipboard ou de Supabase.
- Mode une main, clavier compact gauche/droite, clavier flottant et redimensionnement libre.

# Constraints

- WinGlows reste proprietaire et l'implementation clavier est codee en interne.
- Toute implementation doit etre ecrite depuis zero dans le repo WinGlows, avec noms/types/structures propres.
- L'IME doit rester natif Kotlin; ne pas demarrer une vue Flutter dans le clavier pour le rendu temps reel.
- Le clavier doit fonctionner hors ligne, avant ouverture de l'app Flutter, et sans session Supabase.
- Ne pas journaliser le texte tape, dicte, colle, selectionne ou genere par gestures.
- Les champs sensibles gardent la saisie basique mais coupent toute fonctionnalite WinGlows enrichie.
- Les champs sensibles coupent aussi les statistiques locales d'usage de la smartbar afin que l'adaptation ne revele pas des comportements en contexte prive.
- La latence de tap doit rester prioritaire sur les panneaux WinGlows; aucun appel reseau ou Flutter MethodChannel ne doit etre dans le chemin critique d'une touche.
- Le layout doit eviter les labels texte longs dans les touches compactes; utiliser symboles ou labels courts.
- Les caracteres de coins doivent etre optionnels et desactivables; le clavier normal doit rester disponible.
- Le MVP exclut le mode une main, clavier compact gauche/droite et clavier flottant; ne pas ajouter de logique de deplacement/redimensionnement libre.
- Les actions epinglees de la smartbar ne doivent jamais etre deplacees par l'adaptation automatique.
- Le comportement long press de la barre haute est une preference explicite et doit rester coherent entre l'IME natif et Settings Flutter.
- Les rangees contextuelles attachees ne doivent pas rendre les touches principales trop petites; une limite de rangees visibles est obligatoire.
- Toute capture clipboard depuis l'IME doit rester explicite et passer par le contrat backend-agnostic existant.

# Dependencies

- Kotlin Android natif dans `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/`.
- `InputMethodService` et `InputConnection` Android.
- `android/app/src/main/AndroidManifest.xml` et `android/app/src/main/res/xml/winglowz_app_input_method.xml` deja presents.
- `lib/core/platform/android_keyboard_bridge.dart` et `lib/features/keyboard/domain/keyboard_models.dart` pour Settings.
- `lib/features/settings/presentation/settings_screen.dart` et specs settings existantes pour exposer les memes preferences dans l'app Flutter.
- `ClipboardHistoryApi` et `KeyboardClipboardEventQueue` pour clipboard.
- Le contrat clipboard backend-agnostic doit exposer ou accepter les metadonnees `pinned`, `createdAt`/`capturedAt`, `expiresAt` ou equivalent local, et une preference de retention enumeree `24h`/`7d`/`30d`/`unlimited` sans coupler l'IME a Supabase.
- Fresh external docs checked:
  - Android Create an input method, consulted 2026-05-10: an IME is an app service extending `InputMethodService`, declared with `BIND_INPUT_METHOD`, `android.view.InputMethod`, and metadata.
  - Android `InputConnection`, consulted 2026-05-10: text insertion/deletion/editor actions are done through the active input connection; `deleteSurroundingTextInCodePoints` supports code point deletion when available.
  - Android `InputMethodSubtype`, consulted 2026-05-09: subtypes describe locale/mode and can declare ASCII capability; keep subtype additions small and explicit.
  - Android Intents and intent filters, consulted 2026-05-10: use explicit/implicit intents and resolve availability before launching external actions.
  - Android Common intents, consulted 2026-05-10: common actions exist for standard tasks but availability depends on apps/device support.
  - Android App shortcuts, consulted 2026-05-10: app-defined shortcuts can expose common app actions when the app/launcher/API supports them.
  - Android package visibility, consulted 2026-05-10: when querying other apps or action availability on Android 11+, declare necessary package visibility needs or rely on intents that are automatically visible where applicable.
  - Fresh external docs not needed for the 2026-05-12 FlutterWeb typing sandbox slice: the change is local Flutter widget behavior using existing project patterns, with no new external API, platform contract, dependency, or Vercel build behavior.

# Invariants

- A tap or swipe emits at most one text/action event.
- Text input path has no network dependency.
- Layout and gesture engines are deterministic for the same touch sequence.
- Drawable spacebar gestures are recognized locally from geometry and never upload trace paths or user text.
- Sensitive fields disable capture/sync/voice/snippets but not basic typing.
- Backspace handles code points, not only UTF-16 chars, where Android API allows.
- Clipboard sync events never bypass `ClipboardHistoryApi`/store.
- Settings can disable voice/clipboard/media without rebuilding the keyboard view.
- The keyboard surface is built from a local modular keyboard catalog and user profile configuration, never from remote code.
- At least one keyboard language remains active at all times.
- Dictation language selection derives from active languages and never silently uses a disabled language unless it is the documented fallback after no active language remains valid.
- Theme selection is shared by keyboard, action bar and keyboard settings panel unless the user explicitly chooses per-surface overrides later.
- Every predefined theme has both light and dark variants.
- Appearance mode is one of `light`, `dark`, or `system`; `system` resolves from Android UI night mode at render time.
- Native IME settings and Flutter Settings must converge through the same preference contract and cannot expose contradictory values.
- The action bar is built from a local modular action catalog and user configuration, never from remote code.
- All action bars, pinned rows and attached quick-action rows use the same descriptor/provider/controller/renderer contract; action-specific code only declares content and command semantics.
- Action rows use page-based horizontal navigation when configured as paged; a swipe changes the visible page, not an arbitrary partial offset.
- A minimal pinned action set is always recoverable even if user action-bar configuration is empty or corrupt.
- Pinned smartbar actions have stable positions; adaptive sorting applies only to unpinned eligible actions.
- Private/incognito sessions do not update adaptive action usage stats.
- The action-bar long-press behavior is one of `pin_action` or `attach_context_row`; no action can perform both from the same long press unless a future explicit mode is specified.
- Context rows are local UI modules attached under the main action bar; they persist until closed manually or until an invalid/corrupt configuration forces fallback.
- Attached context rows have a bounded visible count so the main typing surface remains usable.
- A minimal typing profile is always recoverable even if user keyboard-module configuration is empty or corrupt.
- Navigation editing uses a dedicated panel with large targets, not fine swipe gestures as the primary interaction.
- The fallback layout is always ASCII-capable.
- No external keyboard code, generated data, layouts, assets, comments, or naming scheme enters the proprietary codebase.

# Links & Consequences

- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`: likely replaced or reduced to a thin container for the custom rendering/touch view.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzInputMethodService.kt`: routes new key actions, lifecycle, field policy, shift/symbol state.
- New `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/drawgesture/*`: drawable gesture recorder, recognizer, action binding model, collision detector and runtime dispatcher.
- New `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/layout/*`: proprietary layout models and built-in layouts.
- New `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/modules/*`: keyboard module catalog, profile configuration, module availability and safe fallback assembly.
- New `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/languages/*`: active language store, language panel, keyboard/dictation language resolver and fallback rules.
- New `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/theme/*`: theme catalog, theme resolver, panel, per-surface token application and fallback theme.
- `lib/core/platform/android_keyboard_bridge.dart`, `lib/features/keyboard/domain/keyboard_models.dart`, `lib/features/settings/presentation/settings_screen.dart`: expand shared preferences/status so app Settings and IME settings stay aligned.
- `lib/features/settings/presentation/settings_screen.dart`: gains the keyboard activation assistant with Android settings links, active keyboard picker and embedded test field.
- New `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/debug/*`: hidden touch-debug overlay and state model for tuning gesture detection.
- New `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/correction/*`: small local correction helpers for double-space-to-period and future safe text corrections.
- New `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/context/*`: field-context resolver for email, URL, phone, search and standard text variants.
- New `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/gesture/*`: proprietary touch classification.
- `KeyboardSecurityPolicy.kt`: extend tests and edge-case coverage, not necessarily behavior.
- `KeyboardClipboardController.kt`: may need better sensitive marking and paste/copy failure reporting.
- New `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/actions/*`: modular action catalog, action-bar configuration, usage sorting and availability rules.
- Existing `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardLayoutModels.kt`: current `KeyboardRowSpec.horizontalScrollable`, `pagedHorizontalScrollable`, `visiblePageKeyCount` and `actionSurface` fields are implementation evidence for the shared row contract; the final architecture should move action-specific row construction behind catalog/providers.
- Existing `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`: current `numberRowPinned`, `navigationRowPinned`, `handleLongPressUnsafe()` and `drawScrollableRow()` are transitional code; the target is a controller/renderer split that avoids adding one branch per action.
- `lib/features/settings/presentation/settings_screen.dart`: may gain layout preference later, but not required for MVP.
- `docs/PLATFORM_BEHAVIOR.md`, `docs/OVERLAY_ANDROID.md`, `docs/VERIFICATION.md`, `README.md`: update claims from "minimal QWERTY" to "swipe-corner proprietary keyboard" only after implementation passes manual QA.
- Security consequence: a keyboard is a high-trust surface; privacy defaults and logging discipline are mandatory.
- Product consequence: this work should become the priority before deeper voice/clipboard polish, because base typing usability is currently blocking.

# Documentation Coherence

Update after implementation:

- `docs/PLATFORM_BEHAVIOR.md`: describe tap/swipe-corner behavior, Android-only status, private-field behavior.
- `docs/VERIFICATION.md`: add manual QA matrix for activation assistant, debug tactile overlay, gesture directions, backspace, sensitive fields, rotation, device sizes.
- `docs/OVERLAY_ANDROID.md`: confirm overlay remains complementary.
- `README.md`: mention Android keyboard as proprietary WinGlows implementation after QA proof.
- `shipglows_data/workflow/specs/android-ime-winglowz_app-keyboard.md`: cross-link this spec as the ergonomic rebuild of the IME surface.
- `CHANGELOG.md`: after code ships, note keyboard usability rewrite.

# Reference Keyboard Parity Roadmap

Reference source: `/home/claude/keyboard`, reviewed locally on 2026-05-11. The goal is not to copy that codebase, layouts or assets. The goal is to use it as an architecture benchmark for a production-grade Android IME.

Priority 1 - IME foundations:

- Add input-method subtypes for at least French and English, and advertise support for switching to the next input method.
- Keep the IME service defensive across lifecycle hooks: `onStartInput`, `onStartInputView`, subtype changes, fullscreen evaluation and input-view visibility.
- Replace ad hoc field detection with an `EditorConfig`-like resolver that captures field context, action id, enter label, numeric mode and selection-mode support.
- Ensure fake product placeholders never insert user-visible text; snippets must either use real snippet data or open the app/panel honestly.
- Extend tests around field-context resolution, numeric/date fields, custom action labels and failure/fallback behavior.

Priority 2 - Editing and navigation parity:

- Add `onUpdateSelection` handling and maintain a small selection/cursor state for navigation and future suggestions.
- Centralize all `InputConnection` editing in a narrow editor abstraction with explicit success/failure results.
- Add app-specific fallbacks for host editors that return success from `setSelection` but do not move the cursor.
- Improve autocapitalisation from initial caps mode and cursor updates before adding prediction.

Priority 3 - Layout extensibility:

- Move built-in layouts toward a parseable internal format or structured catalog inspired by `KeyboardData`, while keeping all WinGlows layouts proprietary.
- Add unit tests for layout parsing/catalog validation, key values, modifiers, unknown modules and fallback QWERTY.
- Add a compact subtype/language resolver before expanding beyond French and English.

Priority 4 - Advanced typing:

- Add candidates/suggestions only after the typing path, privacy mode and lifecycle hooks are stable.
- Add dictionaries as optional local modules, never as a dependency of basic typing.
- Keep private/sensitive fields as the hard stop for learning, suggestions, adaptive stats, clipboard capture and recents.

# Edge Cases

- Very small screens where corner labels collide.
- Landscape and split-screen height constraints.
- Foldables and density/font-scale changes.
- User starts touch on one key and releases over another.
- User drags diagonally but distance barely crosses threshold.
- Multi-touch, palm touch, or interrupted `ACTION_CANCEL`.
- Long press on top-row action conflicts with swipe or tap timing.
- User expects long press to pin but preference is set to attach context row, or inverse.
- Attached context rows consume too much vertical space and make the keyboard harder to type on.
- Duplicate context rows appear after repeated long press on the same action.
- A context row remains attached after the underlying action becomes unavailable.
- Long press media bar opens while no media consumer is active.
- Top bar adaptive sorting moves an action the user expected to stay fixed.
- User expects a pinned action to stay fixed while adaptive sorting updates around it.
- Private field usage accidentally changes adaptive smartbar ordering.
- User removes too many actions and cannot find the configuration button.
- User removes too many keyboard modules and loses a practical typing surface.
- A modular profile mixes incompatible modules, for example AZERTY letters with a control row expecting another geometry.
- Action-bar catalog changes between app versions and old saved action ids no longer exist.
- Keyboard module catalog changes between app versions and old saved module ids no longer exist.
- Active language has keyboard layout support but no Android speech recognition support.
- Active language has dictation support but no dedicated keyboard module.
- User disables the current language while the keyboard is open.
- Theme has insufficient contrast on a small keyboard key.
- Theme changes while the keyboard is open and a contextual panel is visible.
- Flutter Settings and native IME settings are modified concurrently before synchronization.
- Top bar swipe conflicts with keyboard swipe-corner gestures.
- Spacebar drawable gesture conflicts with normal space insertion, cursor movement expectations, or swipe-corner gestures.
- Two user-recorded drawable gestures are too similar and cause wrong actions.
- Android action selected for a gesture later becomes unavailable because the target app is uninstalled, permission changes, or Android blocks background/activity launch.
- Navigation mode joystick or edit buttons are too small to solve the original cursor movement problem.
- Word-delete long press repeats too quickly and deletes more than the user can control.
- Emoji panel opens in fields that do not accept emoji or non-text content.
- User assumes pinned clipboard items are permanent, but later clears all app data or uses a destructive reset.
- Retention policy changes while clipboard sync/import is in progress.
- Settings panel is opened accidentally while the user intended to keep typing.
- Android input method settings or picker returns without changing state.
- User activates the keyboard in Android settings but does not switch to it as active input method.
- User switches to WinGlows keyboard but Settings still shows stale status until refresh.
- Embedded test field opens another keyboard because WinGlows is enabled but not active.
- Debug overlay makes the keyboard too visually noisy during normal use if exposed outside developer settings.
- Debug overlay accidentally reveals text or clipboard data in screenshots.
- Double-space-to-period fires in a host app that exposes a generic text field for URL/email-like content.
- Punctuation auto-spacing applies French spacing rules in an English field or code-like field if language/context detection is wrong.
- Host app exposes a custom text field with misleading `EditorInfo`, causing the wrong context layout to appear.
- Landscape or split-screen height leaves too little room for context rows and the main typing surface.
- Long press on backspace or space is desired later but not implemented in MVP.
- Host app returns false from `commitText` or `deleteSurroundingTextInCodePoints`.
- Emoji/surrogate/backspace near combined characters.
- Password, OTP, credit card, private browser, and noPersonalizedLearning fields.
- IME created before Flutter settings have ever been opened.
- Locale preference absent; fallback must still be usable.
- Accessibility font scale makes labels too large.
- OEM devices with unusual IME window sizes.

# Implementation Tasks

- [x] Tache 0 : Aligner les fondations IME sur le clavier de reference
  - Fichiers : `android/app/src/main/res/xml/winglowz_app_input_method.xml`, `android/app/src/main/res/values/strings.xml`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardInputContextResolver.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardLayoutModels.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzInputMethodService.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`, `android/app/src/test/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardLayoutBuilderTest.kt`
  - Action : Ajouter subtypes FR/EN, support switch-next, hooks lifecycle defensifs, contexte numerique/date, action id resolu, mode selection supporte, bouton snippets visible, et suppression du snippet hardcode.
  - User story link : rapproche l'IME WinGlows keyboard d'un clavier Android mature sans copier le clavier de reference.
  - Depends on : audit local `/home/claude/keyboard`.
  - Validate with : revue du diff; `./gradlew testDebugUnitTest` bloque encore sans SDK Android local.
  - Status 2026-05-11 : implemente partiellement; compile Android a prouver sur environnement avec SDK.
  - Notes : Premiere tranche volontairement bas niveau; ne couvre pas encore candidats, dictionnaires, layout parser ou suggestions.

- [x] Tache 0b : Ajouter l'etat de selection et l'abstraction editeur InputConnection
  - Fichiers : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/InputConnectionEditor.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzInputMethodService.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardClipboardController.kt`, `android/app/src/test/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardTextNavigationTest.kt`
  - Action : Ajouter `onUpdateSelection`, conserver un `KeyboardSelectionState`, centraliser commit/delete/action/soft-key/navigation dans `InputConnectionEditor`, confirmer les `setSelection` quand l'app hote expose `ExtractedText`, et faire passer le collage clipboard par la meme couche.
  - User story link : rapproche la navigation et l'edition du clavier de reference avant les suggestions, dictionnaires et panneaux avances.
  - Depends on : Tache 0 et roadmap priorite 2.
  - Validate with : tests navigation/selection; `./gradlew testDebugUnitTest` bloque encore sans SDK Android local.
  - Status 2026-05-11 : implemente partiellement; compilation Android native a prouver sur environnement avec SDK.
  - Notes : Les fallbacks clavier restent conservateurs si `setSelection` est refuse ou non confirme; le vrai mode paragraphe reste a enrichir plus tard.

- [x] Tache 0c : Ajouter une surface de preview clavier dans FlutterWeb
  - Fichiers : `lib/features/keyboard/presentation/keyboard_preview_screen.dart`, `lib/features/shell/presentation/app_shell_screen.dart`, `lib/core/router/app_router.dart`, `test/widget_test.dart`
  - Action : Ajouter un ecran Flutter `Keyboard preview` accessible dans l'app et via `/keyboard`, avec controles profil QWERTY/AZERTY, contexte texte/email/URL/phone/number/search, panneaux, modes, etats private/corners/debug, plus navigation responsive rail/bottom pour garder l'app testable sur Vercel.
  - User story link : donne a l'utilisateur une surface web unique pour inspecter l'aspect du clavier sans maintenir une preview HTML separee.
  - Depends on : decision utilisateur 2026-05-11 de privilegier FlutterWeb/Vercel comme cockpit de review.
  - Validate with : `flutter analyze`, `flutter test test/widget_test.dart`, `flutter build web`.
  - Status 2026-05-11 : implemente; reste une preview visuelle proxy, pas une preuve de comportement IME Android natif.
  - Notes : La preview doit rester alignee avec les layouts Kotlin; a terme, extraire un schema partage ou ajouter des tests de coherence.

- [ ] Tache 0d : Rendre la preview FlutterWeb tappable avec champ simule
  - Fichier : `lib/features/keyboard/presentation/keyboard_preview_screen.dart`
  - Action : Ajouter une surface de saisie au-dessus du clavier, un buffer/cursor local, un dispatch de tap pour `_KeyCap`, et une semantique explicite pour lettres, chiffres, ponctuation, Space, Back, Enter, Shift, mode, panneau, suggestions et clear/reset.
  - User story link : permet a l'utilisateur de tester vite sur Vercel ce que produit le clavier sans attendre un appareil Android ou un SDK local complet.
  - Depends on : Tache 0c.
  - Validate with : `flutter test test/widget_test.dart`, `flutter analyze`, `flutter build web`, puis test manuel Vercel de `/keyboard`.
  - Notes : Le champ est un simulateur produit; ne pas pretendre couvrir `InputConnection`, gestures Android, long press/repeat natif, clipboard systeme ou voice/media.

- [ ] Tache 0e : Ajouter les tests widget de simulation clavier web
  - Fichier : `test/widget_test.dart`
  - Action : Couvrir ouverture de `/keyboard`, tap lettre, Space, Back, Enter, Shift, insertion d'une suggestion, changement contexte email/URL/private, et verification qu'une action non simulee ou desactivee ne modifie pas le buffer.
  - User story link : evite que la preview Vercel redevienne purement visuelle pendant les iterations rapides.
  - Depends on : Tache 0d.
  - Validate with : `flutter test test/widget_test.dart`.
  - Notes : Tests centres sur comportement FlutterWeb local, pas sur preuve Kotlin/Android native.

- [ ] Tache 1 : Ajouter un garde-fou provenance dans la doc technique
  - Fichier : `docs/technical/android-native.md`
  - Action : Documenter que le clavier WinGlows est une implementation interne; interdire l'import d'une base clavier externe ou de layouts externes sans decision explicite.
  - User story link : preserve le caractere proprietaire du clavier.
  - Depends on : cette spec.
  - Validate with : revue du diff; aucune reference a un fork/copie comme base.
  - Notes : Garder la doc centree sur notre architecture.

- [ ] Tache 2 : Creer le modele de layout proprietaire
  - Fichiers : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/layout/KeyboardLayout.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/layout/BuiltInLayouts.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/modules/KeyboardModule.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/modules/KeyboardModuleCatalog.kt`
  - Action : Definir rows, keys, roles, labels primaires, slots de coins, poids de touches, layouts `qwerty`, `azerty`, `numbers_math`, `accents`, `symbols`, variantes contextuelles `email`, `url`, `phone`, `search`, modules de rangees/panneaux/actions, compatibilite entre modules, et fallback QWERTY normal.
  - User story link : permet des touches compactes avec caracteres secondaires.
  - Depends on : Tache 1.
  - Validate with : tests unitaires de resolution layout, assemblage de modules, selection QWERTY/AZERTY, modes hauts et fallback ASCII.
  - Notes : AZERTY doit privilegier les accents francais dans les coins quand ils sont actifs; le layout accents dedie reste disponible meme si les coins sont desactives.

- [ ] Tache 3 : Creer le classificateur de gestes proprietaire
  - Fichiers : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/gesture/KeyGestureClassifier.kt`, `android/app/src/test/kotlin/com/winglowz_app/winglowz_app/ime/gesture/KeyGestureClassifierTest.kt`
  - Action : Classer tap, double tap de touche speciale, swipe quatre coins, demarrage de geste dessine depuis espace par seuil de mouvement configurable, retour-centre annule, appui long, annulation, mouvement ambigu, avec seuils en dp, fenetre double appui configurable et hysteresis simple.
  - User story link : produit le comportement attendu tap/swipe-corner.
  - Depends on : Tache 2.
  - Validate with : tests de seuils, diagonales, retour-centre annule, double tap dans/hors fenetre, precedence appui long vs double tap, tap espace sous seuil, demarrage geste espace au-dela du seuil, annulation, multi-touch ignore.
  - Notes : Pas de gesture productive hors tap, double tap de touche speciale, appui long declare et quatre coins dans le MVP.

- [ ] Tache 4 : Remplacer la vue Button-based par une vue custom dessinee
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action : Dessiner les touches, labels primaires, labels de coins optionnels, barre haute d'icones swipable avec boutons emoji/navigation/clipboard/parametres/media `>| ||`, panneau de reglages rapides, feedback pressed/swipe/long-press/repeat; gerer `onTouchEvent`.
  - User story link : rend le clavier utilisable et lisible.
  - Depends on : Taches 2-3.
  - Validate with : build Android debug + QA visuelle sur appareil/emulateur.
  - Status 2026-05-10 : partiel hors flux formel `sf-start`; `WinGlowzKeyboardView.kt` est desormais une vue custom Canvas/touch avec touches dessinees, hit-test, modes `ABC`/`123`/`Acc`/`Sym`, panneau clipboard, haptique tap, et conservation des callbacks IME existants. Restent a faire pour terminer la tache : brancher le vrai modele de layout, le classificateur swipe-corner, la barre haute swipable, les appuis longs/double taps, le panneau reglages rapides complet, et valider sur Android SDK/appareil.
  - Notes : Garder dimensions stables et labels courts; aucune vue Flutter.

- [ ] Tache 5 : Integrer l'etat clavier dans le service IME
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzInputMethodService.kt`
  - Action : Gerer layout QWERTY/AZERTY, variantes contextuelles email/URL/telephone/recherche, mode coins on/off, shift, modes lettres/chiffres-math/accents/symboles/emoji/navigation, panneau parametres, enter action, backspace codepoint, espace, clipboard, media play/pause, long-press actions, double appui des touches speciales, swipe de barre haute, et dispatch des actions WinGlows.
  - User story link : permet la saisie complete au quotidien.
  - Depends on : Tache 4.
  - Validate with : tests manuels dans champs texte, email, recherche, textarea, chat.
  - Notes : Le chemin tap/swipe doit rester sans appel reseau.

- [ ] Tache 6 : Renforcer edition InputConnection et mode Navigation
  - Fichiers : `WinGlowzInputMethodService.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/InputConnectionEditor.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/navigation/KeyboardNavigationPanel.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/navigation/KeyboardNavigationAction.kt`
  - Action : Centraliser commit/delete/action, utiliser `deleteSurroundingTextInCodePoints` quand disponible, traiter retours false/null, exposer un resultat confirme/echec pour le collage clipboard, ajouter un mode Navigation avec joystick/D-pad central, grosses fleches, mouvement caractere gauche/droite, mouvement mot gauche/droite, mouvement vrai paragraphe haut/bas avec fallback si contexte insuffisant, suppression caractere gauche/droite, suppression mot gauche/droite, repetition long press et retour clavier.
  - User story link : evite les suppressions/insertion incoherentes et donne une navigation precise sans swipes fins.
  - Depends on : Tache 5.
  - Validate with : tests manuels emoji, selection, champs qui refusent l'input, collage clipboard reussi/refuse, deplacement curseur caractere/mot/vrai paragraphe, fallback paragraphe sans contexte, suppression caractere gauche/droite, suppression mot gauche/droite et long press controle.
  - Notes : Ne jamais logguer le contenu texte; les details exacts du joystick peuvent etre ajustes pendant implementation, mais les cibles doivent etre grandes.

- [ ] Tache 7 : Ajouter tests Kotlin/JVM ou Android selon faisabilite locale
  - Fichiers : `android/app/src/test/kotlin/...` ou `android/app/src/androidTest/kotlin/...`
  - Action : Couvrir layout model, gesture classifier, policy sensitive, action mapping.
  - User story link : verrouille les comportements qui rendent le clavier fiable.
  - Depends on : Taches 2-6.
  - Validate with : `./gradlew testDebugUnitTest` ou commande Gradle equivalente disponible.
  - Notes : Si l'environnement manque Android SDK, documenter le blocage et faire passer Flutter analyze/test.

- [ ] Tache 8 : Ajouter le classement adaptatif local de la barre haute
  - Fichiers : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/actions/KeyboardActionUsageStore.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/actions/KeyboardActionBarModel.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/actions/KeyboardActionCatalog.kt`
  - Action : Definir un catalogue de briques d'actions, persister localement les compteurs d'usage/recence, reclasser uniquement les actions non critiques et non epinglees, garder les actions epinglees stables, ignorer les usages en contexte prive, et fournir un ordre par defaut recuperable.
  - User story link : le clavier s'ajuste progressivement au comportement de l'utilisateur.
  - Depends on : Tache 5.
  - Validate with : tests unitaires de tri, actions epinglees fixes, reset/fallback, contexte prive sans stats, et absence de texte utilisateur dans les stats.
  - Notes : Ne stocker que des identifiants d'action et compteurs, jamais de contenu tape ou clipboard.

- [ ] Tache 9 : Implementer la configuration modulaire du clavier complet
  - Fichiers : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/modules/KeyboardProfileConfigStore.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/modules/KeyboardProfileConfigPanel.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/modules/KeyboardProfileAssembler.kt`
  - Action : Permettre d'ajouter, retirer, reordonner et restaurer les modules clavier autorises: barres, rangees, panneaux, modes et modules d'actions; valider les compatibilites et restaurer un profil minimal si la configuration devient invalide.
  - User story link : le clavier entier devient compose de briques modulaires ajustables par l'utilisateur.
  - Depends on : Taches 2, 4, 5.
  - Validate with : tests unitaires de profil vide/corrompu, module inconnu, module obligatoire, incompatibilite, ajout/retrait/reordre; QA manuelle de configuration du clavier depuis parametres.
  - Notes : Le profil ne doit stocker que des ids de modules, options et ordre; jamais de contenu utilisateur.

- [x] Tache 10 : Implementer la configuration modulaire de la barre d'actions
  - Fichiers : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/actions/KeyboardActionDescriptor.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/actions/KeyboardActionCatalog.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/actions/KeyboardActionBarState.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/actions/KeyboardActionBarController.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/actions/KeyboardActionBarConfigStore.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/actions/KeyboardActionBarConfigPanel.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`
  - Action : Ajouter le catalogue local de descriptors d'actions, un etat de barre unique et un controller commun qui gere tap, long press, epinglage, disponibilite, ordre, pages et fallback; ajouter un bouton configuration de barre dans la barre et dans le panneau parametres; permettre d'ajouter, retirer, reordonner, epingler/desepingler et restaurer les actions; ajouter la preference `actionBarLongPressBehavior` avec valeurs `pin_action` et `attach_context_row`; persister la configuration localement avec fallback minimal epingle.
  - User story link : le clavier devient compose de briques modulaires ajustables par l'utilisateur.
  - Depends on : Taches 4-9.
  - Validate with : tests unitaires de config vide/corrompue, action inconnue, action obligatoire, ajout/retrait/reordre, long press pin vs attach, private mode, availability, page changes; QA manuelle de la configuration depuis la barre et depuis parametres.
  - Notes : Le catalogue definit id, icone, label accessibilite, action tap, rangee contextuelle optionnelle, disponibilite par contexte, pinning, surface visuelle et eligibilite au tri adaptatif. Le renderer ne doit pas contenir une branche speciale par action.

- [x] Tache 11 : Implementer les rangees contextuelles attachables
  - Fichiers : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/actions/KeyboardActionRowSpec.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/actions/KeyboardActionRowProvider.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/actions/KeyboardContextRowStore.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/actions/KeyboardActionRowRenderer.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/actions/KeyboardActionCatalog.kt`
  - Action : Permettre a une action compatible d'attacher une rangee de quick actions sous la barre principale via long press quand `actionBarLongPressBehavior=attach_context_row`; fournir fermeture manuelle, dedupe, limite de hauteur, ordre stable, page-based horizontal scroll, persistance locale et fallback si la rangee devient invalide.
  - User story link : l'utilisateur peut ajouter a la volee une rangee de travail, par exemple chiffres ou media, sans quitter son champ de saisie.
  - Depends on : Taches 4, 5, 8, 10.
  - Validate with : tests unitaires d'attachement, fermeture, dedupe, limite de rangees, action indisponible, config corrompue, paging gauche/droite, hitboxes visibles; QA manuelle long press Chiffres, Navigation, Media et Clip.
  - Notes : MVP requis: rangee Chiffres premiere page `1` a `0` puis pages signes mathematiques, rangee Navigation, rangee Media avec controles disponibles, rangee Clip pour cut/copy/paste. Les rangees ne stockent que des ids/actions, jamais de contenu utilisateur.

- [ ] Tache 12 : Implementer les langues actives clavier et dictee
  - Fichiers : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/languages/KeyboardLanguageStore.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/languages/KeyboardLanguagePanel.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/languages/KeyboardLanguageResolver.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardVoiceController.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`
  - Action : Ajouter une action langues dans la barre et le panneau parametres; permettre d'activer/desactiver les langues clavier/dictee, choisir langue courante, resoudre layout et langue de dictee, et afficher les fallbacks quand une langue n'est pas disponible.
  - User story link : l'utilisateur controle les langues disponibles pour taper et dicter depuis le clavier.
  - Depends on : Taches 2, 5, 9, 10.
  - Validate with : tests unitaires de langue active minimale, fallback appareil/fr/en, langue layout sans dictee, langue dictee sans layout, changement langue courante; QA manuelle du panneau langues et de la dictee.
  - Notes : Persister uniquement ids/lang tags et preferences; ne pas stocker de texte dicte.

- [ ] Tache 13 : Implementer les themes clavier, barre et panneau parametres
  - Fichiers : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/theme/KeyboardThemeCatalog.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/theme/KeyboardThemeStore.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/theme/KeyboardThemePanel.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/theme/KeyboardThemeResolver.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`
  - Action : Ajouter une action themes dans la barre et le panneau parametres; permettre de choisir un theme predefini et un mode `light`/`dark`/`system`; exiger une variante light et dark par theme; appliquer les tokens resolus au clavier, a la barre d'action et au panneau parametres; fournir fallback theme par defaut en mode system.
  - User story link : l'utilisateur personnalise l'apparence du clavier sans quitter le contexte de saisie.
  - Depends on : Taches 4, 5, 9, 10.
  - Validate with : tests unitaires de theme absent/invalide, variante light/dark manquante, resolution system night mode, application par surface, contraste minimal declare, fallback; QA manuelle du panneau themes.
  - Notes : Prevoir une structure extensible pour futurs themes, mais ne pas inclure d'editeur avance dans le MVP.

- [ ] Tache 14 : Synchroniser les preferences IME avec la page Settings Flutter
  - Fichiers : `lib/core/platform/android_keyboard_bridge.dart`, `lib/features/keyboard/domain/keyboard_models.dart`, `lib/features/settings/presentation/settings_screen.dart`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`
  - Action : Etendre le MethodChannel/status model pour exposer et modifier les memes preferences cote app et cote IME: theme id, mode d'apparence `light`/`dark`/`system`, langues actives, langue courante, modules clavier, barre d'action, actions epinglees, comportement long press de barre, rangees contextuelles attachees, adaptation smartbar, coins, haptics/audio, dictation, clipboard, media.
  - User story link : les reglages du clavier et ceux de l'application correspondent toujours.
  - Depends on : Taches 8-13.
  - Validate with : tests Dart de parsing/status, tests manuels changement depuis IME puis Settings Flutter et inversement.
  - Notes : La source locale native reste disponible quand Flutter n'est pas ouvert; l'app doit lire cet etat plutot que presenter une valeur contradictoire.

- [ ] Tache 15 : Implementer l'assistant d'activation du clavier dans Settings
  - Fichiers : `lib/features/settings/presentation/settings_screen.dart`, `lib/core/platform/android_keyboard_bridge.dart`, `lib/features/keyboard/domain/keyboard_models.dart`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt`
  - Action : Ajouter un parcours clair avec statuts `pas active`, `active mais pas actif`, `actif`; boutons ouvrir reglages Android de methode de saisie, afficher le picker clavier, rafraichir le statut, et champ de test integre.
  - User story link : permet a l'utilisateur d'activer et verifier le clavier sans comprendre les reglages Android IME.
  - Depends on : Tache 14.
  - Validate with : tests Dart de parsing/status et QA manuelle: installation fraiche, clavier non active, active mais non actif, actif, retour depuis reglages Android, test de saisie.
  - Notes : C'est l'onboarding clavier. Ne pas en faire une page marketing; chaque etape doit montrer l'action systeme suivante.

- [ ] Tache 16 : Implementer le sizing paysage/tablette leger
  - Fichiers : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/window/KeyboardSizingResolver.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/window/KeyboardSizingProfile.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`
  - Action : Ajouter des profils portrait/paysage/grand ecran/split-screen pour hauteur, espacement vertical/horizontal, taille de police et nombre maximal de rangees contextuelles visibles; exclure tout mode une main ou flottant.
  - User story link : garde le clavier utilisable quand l'ecran est large ou bas.
  - Depends on : Taches 2-4.
  - Validate with : QA manuelle portrait, paysage, split-screen et grand ecran/emulateur tablette; verification que les touches principales gardent une taille minimale.
  - Notes : Compacter ou masquer les rangees secondaires avant de rendre les touches principales trop petites.

- [ ] Tache 17 : Implementer le mode debug tactile cache
  - Fichiers : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/debug/KeyboardTouchDebugState.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/debug/KeyboardTouchDebugOverlay.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
  - Action : Ajouter un toggle developpeur cache qui affiche bounds de touches, pointeur actif, distance/seuil, direction de swipe, coin detecte, action dispatch et raison d'annulation; interdire affichage/log du texte utilisateur.
  - User story link : aide a rendre les gestures vers les coins fiables sans deviner.
  - Depends on : Taches 3-4.
  - Validate with : QA manuelle en tap/swipe/annulation/multi-touch; revue de code pour confirmer aucune donnee texte/clipboard dans l'overlay ou les logs.
  - Notes : Visible uniquement via options developpeur ou geste/toggle cache; jamais dans l'interface normale.

- [ ] Tache 18 : Implementer le panneau parametres clavier
  - Fichiers : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/settings/KeyboardQuickSettingsPanel.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt`
  - Action : Ajouter un panneau qui remplace temporairement le clavier avec boutons retour clavier, configurer themes, choisir apparence light/dark/system, configurer langues actives, configurer clavier modulaire, configurer barre d'actions, choisir comportement long press de barre (`pin_action` ou `attach_context_row`), configurer/desactiver double appui des touches speciales, ouvrir la page gestes dessines depuis espace, gerer les rangees contextuelles attachees, regler la retention clipboard, ouvrir parametres Android, changer clavier par defaut, toggle mode coins, toggle double espace point, toggle auto-espace ponctuation, toggle raccourcis haptiques; persister les toggles dans `KeyboardStateStore`.
  - User story link : permet d'ajuster le clavier sans quitter le contexte de saisie.
  - Depends on : Taches 4-14.
  - Validate with : tests manuels d'ouverture/fermeture panneau, settings Android, picker clavier, persistance coins/haptics.
  - Notes : Les toggles ne doivent pas passer par Flutter dans le chemin critique; synchronisation Settings Flutter peut venir ensuite via MethodChannel.

- [ ] Tache 18c : Implementer les gestes dessines depuis espace
  - Fichiers : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/drawgesture/SpaceGestureRecognizer.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/drawgesture/SpaceGestureRecorder.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/drawgesture/SpaceGestureActionCatalog.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/drawgesture/SpaceGestureDispatcher.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`, `lib/features/settings/presentation/settings_screen.dart`
  - Action : Ajouter un mode optionnel de gestes dessines demarrant depuis la barre espace par seuil de mouvement configurable, tap sous seuil = espace normal, overlay de trace, reconnaissance de motifs simples, seuil de confiance, preview de l'action associee pendant le trace, execution au relachement, annulation claire, page de parametres pour regler le seuil, enregistrer/tester/supprimer les motifs, detection de collisions, et catalogue d'actions autorisees via WinGlows/internal, snippets, app launch intents, common intents, settings intents, media controls et raccourcis d'app disponibles.
  - User story link : permet des raccourcis puissants sans encombrer la barre d'actions.
  - Depends on : Taches 3, 4, 5, 14 et 18.
  - Validate with : tests unitaires recognizer/collision/seuils, tap espace sous seuil, demarrage au-dela du seuil, tests action indisponible, QA manuelle trace carre/cercle/angle, preview action, relachement execute, annulation, app absente, permission manquante, mode prive.
  - Notes : Ne pas promettre d'automatiser les autres apps. Toute action externe doit etre resolue et autorisee par Android avant affichage comme disponible.

- [ ] Tache 18b : Implementer epinglage et retention clipboard
  - Fichiers : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardClipboardController.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardClipboardEventQueue.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`, `lib/core/platform/android_keyboard_bridge.dart`, `lib/features/keyboard/domain/keyboard_models.dart`, `shipglows_data/workflow/specs/clipboard-backend-agnostic-api.md`
  - Action : Ajouter metadonnees `pinned`, dates de capture/expiration ou equivalent, petit bouton/filtre `Epingles` dans le panneau clipboard pour afficher les elements epingles a la demande sans encombrer l'historique normal, action epingler/desepingler, purge automatique des elements non epingles selon retention choisie, options de retention `24h`, `7 jours`, `30 jours`, `illimite`, defaut `7 jours`, suppression manuelle explicite des elements epingles, et exposition de la preference cote Settings/bridge sans couplage Supabase.
  - User story link : permet de garder les clipboard importants et de limiter le reste dans le temps.
  - Depends on : Taches 5, 6, 14 et contrat clipboard existant.
  - Validate with : tests retention non epinglee pour `24h`/`7 jours`/`30 jours`/`illimite`, defaut `7 jours`, bouton/filtre epingles, historique normal non encombre, non-purge des epingles, desepinglage puis purge, changement de duree, sync/import sans suppression d'epingles, mode prive sans capture.
  - Notes : Les elements epingles ne sont pas "sauvegarde cloud garantie"; ils resistent a la retention automatique, pas a une suppression manuelle, reset app, ou effacement des donnees Android.

- [ ] Tache 19 : Implementer le panneau emoji leger
  - Fichiers : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/emoji/KeyboardEmojiPanel.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/emoji/EmojiRecentStore.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzInputMethodService.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt`
  - Action : Ajouter un panneau emoji natif leger avec recents, categories simples, insertion via `InputConnection`, retour au clavier lettres, limite de stockage local, et desactivation lecture/ecriture des recents en mode prive/sensible.
  - User story link : donne l'acces emoji attendu sans transformer le MVP en clavier emoji complet.
  - Depends on : Taches 2, 4, 5 et 6.
  - Validate with : tests manuels insertion emoji, recents, categories, retour lettres, champ sensible sans mise a jour des recents, champ qui refuse l'input.
  - Notes : Pas de recherche emoji, pas de stickers/GIFs, pas de catalogue exhaustif dans le MVP.

- [ ] Tache 20 : Aligner Settings et docs de verification
  - Fichiers : `docs/PLATFORM_BEHAVIOR.md`, `docs/VERIFICATION.md`, `docs/OVERLAY_ANDROID.md`, `README.md`, optionnel `lib/features/settings/presentation/settings_screen.dart`
  - Action : Documenter assistant d'activation clavier, activation Android, choix du clavier actif, champ de test, mode debug tactile cache pour QA interne, choix QWERTY/AZERTY, variantes de touches selon champ email/URL/telephone/recherche, adaptation paysage/tablette legere, exclusion mode une main/flottant, langues actives clavier/dictee, themes clavier/barre/panneaux, variantes light/dark, mode light/dark/system, synchronisation Settings app/IME, architecture en briques modulaires, configuration modulaire du clavier, mode coins optionnel, double espace point configurable, auto-espace ponctuation configurable par langue, barre haute d'icones swipable, bouton emoji, panneau emoji leger, recents emoji sans mode prive, bouton navigation, bouton clipboard, bouton parametres, configuration modulaire de barre, comportement long press `pin_action` vs `attach_context_row`, rangees contextuelles attachables, panneau reglages rapides, long-press actions, classement adaptatif local avec epinglage, feedback haptique/audio, mode Navigation joystick/D-pad, navigation caractere/mot/paragraphe, barre media contextuelle, private mode, limites Android-only, et matrice QA.
  - User story link : l'utilisateur sait activer et verifier le clavier.
  - Depends on : Taches 4-19.
  - Validate with : revue docs + absence de promesses non implementees.
  - Notes : Ne pas presenter une autre application clavier comme base.

# Acceptance Criteria

- [ ] CA 1 : Given WinGlows keyboard est selectionne, when un champ texte standard est focalise, then le clavier s'affiche avec une grille custom et non une pile de boutons Android generiques.
- [ ] CA 2 : Given une touche lettre, when l'utilisateur tap au centre, then seul le caractere primaire est insere.
- [ ] CA 3 : Given une touche avec symbole haut-droite, when l'utilisateur swipe vers haut-droite et relache, then seul ce symbole est insere.
- [ ] CA 4 : Given un geste sort puis revient au centre, when l'utilisateur relache, then le geste est annule et aucun caractere n'est insere.
- [ ] CA 5 : Given une sequence tap/swipe rapide, when l'utilisateur ecrit une phrase simple, then aucun double caractere tap+swipe n'apparait.
- [ ] CA 5b : Given une touche speciale declare une action double appui, when l'utilisateur appuie deux fois dans la fenetre configuree, then l'action double appui se declenche une seule fois et les deux actions simples ne sont pas emises.
- [ ] CA 5c : Given une touche speciale est maintenue jusqu'au seuil appui long, when l'utilisateur relache, then l'action appui long gagne sur l'action double appui.
- [ ] CA 5d : Given le double appui est desactive globalement ou pour cette touche, when l'utilisateur appuie deux fois, then la touche conserve seulement son comportement simple appui/appui long habituel.
- [ ] CA 5e : Given les gestes dessines depuis espace sont actives, when l'utilisateur demarre depuis espace et depasse le seuil de mouvement configurable, then le clavier entre en mode trace, affiche le motif/action reconnue et execute l'action au relachement si elle est autorisee.
- [ ] CA 5e2 : Given l'utilisateur appuie sur espace sans depasser le seuil de mouvement, when il relache, then le clavier insere un espace normal et ne lance aucune reconnaissance de geste.
- [ ] CA 5f : Given le motif trace depuis espace est ambigu, trop proche d'un autre motif ou sous le seuil, when l'utilisateur relache, then aucune action n'est executee et l'annulation est visible.
- [ ] CA 5g : Given une action associee a un geste n'est plus disponible sur Android, when l'utilisateur trace ce geste, then le clavier affiche l'indisponibilite et ne tente pas de contourner les permissions ou restrictions Android.
- [ ] CA 5h : Given l'utilisateur enregistre un nouveau geste depuis Settings, when le motif entre en collision avec un motif existant, then WinGlows demande de refaire le geste ou de remplacer l'ancien mapping avant sauvegarde.
- [ ] CA 6 : Given une selection existe, when backspace est presse, then la selection est supprimee ou remplacee selon le comportement standard du champ.
- [ ] CA 7 : Given un emoji ou surrogate pair avant curseur, when backspace est presse, then le clavier ne laisse pas un surrogate casse.
- [ ] CA 8 : Given un champ password/OTP/noPersonalizedLearning, when le clavier s'ouvre, then tap/swipe restent utilisables mais voice/clipboard/snippets/sync/stats adaptatives sont desactives et un indicateur prive est visible.
- [ ] CA 9 : Given l'utilisateur choisit AZERTY, when le clavier s'ouvre en mode lettres, then les touches principales suivent AZERTY et les coins privilegient les accents francais si le mode coins est actif.
- [ ] CA 10 : Given le champ expose une action `search` ou `send`, when entree est presse, then l'action IME est executee avant fallback newline.
- [ ] CA 11 : Given clipboard sync est activee, when une capture explicite admissible arrive, then l'evenement est drainable via `winglowz_app/keyboard` et importe par `ClipboardHistoryApi`.
- [ ] CA 12 : Given le repo est inspecte, when l'implementation est revue, then aucun code, layout, asset ou schema de nommage externe n'a ete ajoute comme base du clavier.
- [ ] CA 13 : Given le mode coins est desactive, when l'utilisateur glisse sur une touche, then aucun caractere de coin n'est produit et le clavier reste un clavier normal.
- [ ] CA 14 : Given la barre haute d'icones est visible, when l'utilisateur appuie successivement sur chiffres/math, accents, symboles, emoji puis lettres, then chaque mode affiche le layout/panneau attendu et lettres revient au QWERTY/AZERTY courant.
- [ ] CA 15 : Given la barre haute d'actions est visible, when l'utilisateur appuie sur clipboard, then le panneau clipboard s'ouvre sans masquer definitivement le layout courant.
- [ ] CA 15b : Given le panneau clipboard est ouvert, when l'utilisateur colle un element et que `InputConnection` confirme l'insertion, then le panneau se ferme automatiquement et le clavier revient au layout de saisie normal.
- [ ] CA 15c : Given le panneau clipboard est ouvert, when le collage est refuse ou echoue, then le panneau reste ouvert avec feedback bref et aucun etat de sync n'est marque comme applique.
- [ ] CA 15d : Given un element clipboard est epingle, when la purge de retention s'execute, then cet element n'est pas supprime automatiquement.
- [ ] CA 15d2 : Given au moins un element clipboard est epingle, when le panneau clipboard s'ouvre, then un petit bouton/filtre `Epingles` est visible et l'historique normal reste directement utilisable.
- [ ] CA 15d3 : Given le filtre `Epingles` est active, when l'utilisateur consulte le panneau clipboard, then seuls les elements epingles ou une vue prioritaire des epingles sont affiches avec un retour clair vers l'historique normal.
- [ ] CA 15e : Given un element clipboard non epingle est plus ancien que la duree de retention choisie, when la purge s'execute, then cet element est supprime sans toucher aux elements epingles.
- [ ] CA 15f : Given l'utilisateur desepingle un ancien element clipboard, when la purge suivante s'execute, then cet element redevient eligible a la suppression selon la retention courante.
- [ ] CA 15g : Given l'utilisateur change la duree de retention clipboard dans Settings ou le panneau clavier, when le clavier et l'app relisent les preferences, then ils affichent la meme valeur et appliquent la meme politique aux elements non epingles.
- [ ] CA 15h : Given aucune preference clipboard retention n'est sauvegardee, when WinGlows initialise les reglages, then la retention non epinglee est `7 jours`.
- [ ] CA 15i : Given la retention clipboard est `illimite`, when la purge automatique s'execute, then aucun element non epingle n'est supprime par age, mais les suppressions manuelles restent possibles.
- [ ] CA 16 : Given le bouton media `>| ||` est visible, when l'utilisateur appuie dessus, then play/pause est envoye; when il reste appuye dessus, then une barre media etendue apparait avec des controles supplementaires.
- [ ] CA 17 : Given le champ est prive, when l'utilisateur fait un long press sur clipboard, dictation ou snippets, then les actions secondaires sensibles restent indisponibles et aucun contenu n'est capture.
- [ ] CA 18 : Given la barre haute contient plusieurs pages d'icones, when l'utilisateur swipe la barre, then la page suivante apparait sans declencher l'action sous le doigt.
- [ ] CA 19 : Given une action non critique est utilisee souvent, when le classement adaptatif se met a jour, then cette action remonte dans les premieres pages tout en conservant les actions epinglees a leur position stable.
- [ ] CA 20 : Given les stats d'usage locales sont effacees ou illisibles, when le clavier s'ouvre, then la barre haute revient a l'ordre par defaut.
- [ ] CA 21 : Given une action est epinglee, when l'utilisateur utilise d'autres actions plus souvent, then l'action epinglee ne change pas de position.
- [ ] CA 22 : Given le clavier est en mode prive, when l'utilisateur utilise des actions de la barre haute, then aucun compteur d'usage adaptatif n'est mis a jour.
- [ ] CA 23 : Given la barre haute est visible, when l'utilisateur appuie sur Navigation, then le clavier est remplace par un panneau avec gros joystick/D-pad central, fleches visibles, mouvement caractere gauche/droite, mouvement mot gauche/droite, mouvement paragraphe haut/bas, suppression caractere gauche/droite, suppression mot gauche/droite et retour clavier.
- [ ] CA 23b : Given le mode Navigation est ouvert, when l'utilisateur appuie sur mot gauche ou mot droite, then chaque appui deplace le curseur d'un mot dans la direction demandee, vers le debut du mot cible quand calculable.
- [ ] CA 23c : Given le mode Navigation est ouvert, when l'utilisateur appuie sur paragraphe haut ou paragraphe bas, then chaque appui deplace le curseur vers le debut du vrai paragraphe precedent ou suivant quand le contexte texte permet de detecter les separateurs de paragraphe.
- [ ] CA 23d : Given le mode Navigation est ouvert mais que le contexte texte est insuffisant pour detecter un vrai paragraphe, when l'utilisateur appuie sur paragraphe haut ou bas, then le clavier applique un fallback non destructeur ou affiche l'indisponibilite sans pretendre avoir fait un saut de paragraphe.
- [ ] CA 24 : Given le mode Navigation est ouvert, when l'utilisateur reste appuye sur supprimer mot a gauche ou supprimer mot a droite, then la suppression se repete mot par mot dans la direction choisie jusqu'au relachement.
- [ ] CA 25 : Given le mode Navigation est ouvert dans un champ qui refuse une action ou ne fournit pas assez de texte autour du curseur, when l'utilisateur appuie sur une commande de navigation, then le clavier affiche un feedback d'indisponibilite ou applique un fallback non destructeur sans effectuer de suppression cachee.
- [ ] CA 26 : Given les preferences haptique/audio sont actives, when l'utilisateur tap, swipe-corner, annule un geste, long press ou repete une suppression, then le feedback correspondant est emis en respectant les reglages systeme.
- [ ] CA 27 : Given la barre haute est visible, when l'utilisateur appuie sur parametres, then le clavier est remplace par un panneau de reglages rapides avec bouton retour clavier.
- [ ] CA 28 : Given le panneau parametres est ouvert, when l'utilisateur appuie sur changer clavier par defaut, then le picker Android de methode de saisie est demande sans perdre les preferences locales.
- [ ] CA 29 : Given le panneau parametres est ouvert, when l'utilisateur change mode coins ou raccourcis haptiques, then le choix est persiste localement et s'applique au clavier sans relancer l'app Flutter.
- [ ] CA 30 : Given l'utilisateur ouvre la configuration de barre depuis la barre haute, when il retire une action non obligatoire, then cette action disparait de la barre et reste disponible dans le catalogue pour etre rajoutee.
- [ ] CA 31 : Given l'utilisateur ouvre la configuration de barre depuis le panneau parametres, when il ajoute ou reordonne des actions, then la barre haute applique le nouvel ordre et le persiste localement.
- [ ] CA 32 : Given l'utilisateur tente de retirer toutes les actions ou une action obligatoire, when la configuration est sauvegardee, then le clavier conserve ou restaure le set minimal epingle.
- [ ] CA 33 : Given une version future ne reconnait plus un id d'action sauvegarde, when la barre se construit, then l'action inconnue est ignoree sans casser la configuration restante.
- [ ] CA 34 : Given l'utilisateur ouvre la configuration modulaire du clavier, when il ajoute ou retire un module autorise de rangee/panneau/mode, then le profil clavier se reconstruit et reste utilisable sans relancer l'app Flutter.
- [ ] CA 35 : Given l'utilisateur tente de supprimer un module obligatoire de saisie, when la configuration est sauvegardee, then le clavier refuse l'etat invalide ou restaure le profil minimal utilisable.
- [ ] CA 36 : Given un profil combine des modules incompatibles, when le clavier assemble le profil, then il signale la configuration invalide et utilise le fallback QWERTY minimal.
- [ ] CA 37 : Given une version future ne reconnait plus un id de module sauvegarde, when le profil est charge, then le module inconnu est ignore et le reste du profil continue de fonctionner.
- [ ] CA 38 : Given la barre haute est visible, when l'utilisateur appuie sur langues, then le clavier est remplace par le panneau des langues actives.
- [ ] CA 39 : Given le panneau langues est ouvert, when l'utilisateur active ou desactive une langue, then les choix clavier et dictee vocale se mettent a jour et au moins une langue reste active.
- [ ] CA 40 : Given plusieurs langues sont actives, when l'utilisateur choisit la langue courante, then le layout clavier et la langue de dictee par defaut suivent ce choix.
- [ ] CA 41 : Given une langue active n'a pas de support dictee Android disponible, when l'utilisateur lance la dictee, then le clavier affiche un fallback ou un etat indisponible sans demarrer une dictee dans une langue silencieusement incorrecte.
- [ ] CA 42 : Given la barre haute est visible, when l'utilisateur appuie sur themes, then le clavier est remplace par le panneau de choix de themes.
- [ ] CA 43 : Given le panneau themes est ouvert, when l'utilisateur choisit un theme et le mode `light`, `dark` ou `system`, then le clavier, la barre d'action et le panneau parametres appliquent la variante resolue sans relancer l'app Flutter.
- [ ] CA 44 : Given un theme sauvegarde est inconnu, incomplet ou sans variante light/dark, when le clavier s'ouvre, then le theme par defaut en mode system est applique sans perdre les autres preferences.
- [ ] CA 45 : Given l'utilisateur change un reglage clavier depuis la page Settings Flutter, when l'IME lit son status, then la preference correspondante est visible cote clavier; given l'utilisateur change le meme reglage depuis l'IME, when Settings Flutter est ouvert, then la page affiche la nouvelle valeur.
- [ ] CA 46 : Given le mode theme est `system`, when Android passe de light a dark ou inversement, then le clavier resout la variante correspondante au prochain rendu sans changer le theme id sauvegarde.
- [ ] CA 47 : Given le comportement long press de barre est `pin_action`, when l'utilisateur reste appuye sur l'action Chiffres, then l'action Chiffres est epinglee ou desepinglee et aucune rangee chiffres n'est ajoutee.
- [ ] CA 48 : Given le comportement long press de barre est `attach_context_row`, when l'utilisateur reste appuye sur l'action Chiffres, then une rangee contextuelle `1 2 3 4 5 6 7 8 9 0` est ajoutee sous la barre principale sans remplacer le clavier courant.
- [ ] CA 49 : Given le comportement long press de barre est `attach_context_row`, when l'utilisateur reste appuye sur l'action Media, then une rangee media contextuelle persistante apparait avec les controles disponibles et un bouton de fermeture.
- [ ] CA 50 : Given une rangee contextuelle est deja attachee, when l'utilisateur long press la meme action compatible, then le clavier ne cree pas de doublon et conserve un etat previsible.
- [ ] CA 51 : Given plusieurs rangees contextuelles sont attachees, when la hauteur disponible devient insuffisante, then le clavier applique sa limite visible et conserve une surface de frappe utilisable.
- [ ] CA 52 : Given l'utilisateur change la preference long press dans Settings Flutter ou dans le panneau parametres IME, when il revient au clavier, then le long press suivant respecte la nouvelle preference.
- [ ] CA 52a : Given une rangee contextuelle paginee est visible, when l'utilisateur swipe gauche ou droite sur la rangee, then toute la page visible est remplacee par la page precedente/suivante et aucun tap d'action n'est declenche accidentellement.
- [ ] CA 52b : Given la rangee Chiffres est attachee, when elle s'ouvre sur sa premiere page, then les dix chiffres `1 2 3 4 5 6 7 8 9 0` sont visibles; when l'utilisateur change de page, then les signes mathematiques et caracteres supplementaires apparaissent.
- [ ] CA 52c : Given l'action Navigation est long-press avec `attach_context_row`, when elle fournit une rangee contextuelle, then cette rangee utilise le meme moteur de paging/dedupe/hitbox que Chiffres et Media.
- [ ] CA 52d : Given une nouvelle action de barre est ajoutee au catalogue, when elle declare un provider de rangee, then aucun changement dans la logique centrale de long press ou de rendu n'est necessaire.
- [ ] CA 52e : Given le champ est prive, when une action sensible comme Clip, Dictation ou Snippets expose des quick actions, then le moteur commun les masque/desactive et n'enregistre aucun usage adaptatif.
- [ ] CA 53 : Given WinGlows keyboard n'est pas active dans Android, when l'utilisateur ouvre Settings clavier, then l'assistant affiche `pas active` et propose d'ouvrir les reglages Android de methode de saisie.
- [ ] CA 54 : Given WinGlows keyboard est active mais pas clavier actif, when l'utilisateur revient dans Settings, then l'assistant affiche `active mais pas actif` et propose d'ouvrir le picker clavier.
- [ ] CA 55 : Given WinGlows keyboard est actif, when l'utilisateur ouvre l'assistant, then il affiche `actif` et propose un champ de test utilisable.
- [ ] CA 56 : Given le mode debug tactile est active, when l'utilisateur tape ou swipe, then l'overlay affiche bounds, direction, seuil et action declenchee sans afficher le texte du champ.
- [ ] CA 57 : Given le mode debug tactile est desactive, when l'utilisateur utilise le clavier, then aucun overlay de debug n'est visible.
- [ ] CA 58 : Given le champ est prive, when le mode debug tactile est active, then l'overlay reste limite aux metadonnees de geste/layout et ne revele aucun contenu sensible.
- [ ] CA 59 : Given double espace point est active et le champ est texte standard, when l'utilisateur tape deux espaces apres un mot, then le clavier produit `. ` au lieu de deux espaces.
- [ ] CA 60 : Given double espace point est active et le champ est email, URL, password, OTP ou sensible selon les signaux Android disponibles, when l'utilisateur tape deux espaces, then le clavier conserve les espaces et n'applique pas la correction.
- [ ] CA 61 : Given double espace point est desactive dans les parametres, when l'utilisateur tape deux espaces dans n'importe quel champ, then le clavier conserve les deux espaces.
- [ ] CA 62 : Given la langue courante est francais et auto-espace ponctuation est au defaut, when l'utilisateur tape une ponctuation francaise dans un champ texte standard, then les espaces autour de la ponctuation sont corrigees selon les regles francaises.
- [ ] CA 63 : Given la langue courante est anglais et auto-espace ponctuation est au defaut, when l'utilisateur tape une ponctuation, then le clavier n'applique pas de correction automatique d'espacement.
- [ ] CA 64 : Given auto-espace ponctuation est desactive dans les parametres, when l'utilisateur tape une ponctuation dans n'importe quelle langue, then le clavier conserve exactement l'espacement saisi.
- [ ] CA 65 : Given un champ email, when le clavier s'ouvre, then `@`, `_` et `.com` sont accessibles plus directement que dans le layout texte standard.
- [ ] CA 66 : Given un champ URL, when le clavier s'ouvre, then `/`, `.`, `.com` et les caracteres URL utiles sont accessibles plus directement que dans le layout texte standard.
- [ ] CA 67 : Given un champ telephone, when le clavier s'ouvre, then un layout numerique/telephone est affiche.
- [ ] CA 68 : Given un champ recherche, when l'utilisateur appuie sur entree, then l'action search du champ est executee.
- [ ] CA 69 : Given l'appareil est en paysage, when le clavier s'ouvre, then hauteur, espacement et densite sont adaptes sans activer de mode une main ou flottant.
- [ ] CA 70 : Given l'appareil est en split-screen ou grand ecran, when des rangees contextuelles sont visibles, then le clavier limite/compacte les rangees secondaires pour garder les touches principales utilisables.
- [ ] CA 71 : Given le panneau emoji leger est ouvert, when l'utilisateur choisit un emoji dans les recents ou une categorie simple, then l'emoji est insere une seule fois via `InputConnection`.
- [ ] CA 72 : Given un emoji est insere dans un champ texte standard non sensible, when le panneau emoji est rouvert, then cet emoji apparait dans les recents selon la limite locale definie.
- [ ] CA 73 : Given le champ est prive ou sensible, when l'utilisateur insere un emoji depuis le panneau, then l'insertion peut fonctionner mais les recents emoji ne sont ni lus ni mis a jour.
- [ ] CA 74 : Given un geste dessine depuis espace est configure pour ouvrir une app installee ou un ecran Settings Android supporte, when l'action est resolue par Android, then WinGlows lance l'intent correspondant apres relachement.
- [ ] CA 75 : Given un geste dessine est configure pour une action WinGlows interne ou un snippet, when l'action est autorisee dans le contexte courant, then elle s'execute sans quitter le clavier.
- [ ] CA 76 : Given `/keyboard` est ouvert dans la build FlutterWeb/Vercel, when l'utilisateur tape `j`, `Space`, `a`, `Back`, then le champ simule affiche la sequence attendue et le statut de derniere action se met a jour.
- [ ] CA 77 : Given `/keyboard` est en mode texte non prive, when l'utilisateur appuie sur une suggestion comme `j'arrive`, then le champ simule insere la suggestion de facon visible et conserve une separation lisible avec le texte existant.
- [ ] CA 78 : Given `/keyboard` passe en contexte email, URL, phone, number, search ou private, when l'utilisateur interagit avec les touches contextuelles, then les labels visibles, les touches desactivees et les mutations du champ simule refletent ce contexte.
- [ ] CA 79 : Given une touche de preview n'a pas encore de comportement simule fiable, when l'utilisateur appuie dessus, then la preview affiche un statut explicite et ne modifie pas le champ comme si l'action native avait ete prouvee.

# Test Strategy

- Unit tests Kotlin/JVM for layout mapping, gesture classification, action dispatch data, and sensitive field policy where Android dependencies can be isolated.
- Android instrumentation or manual device QA for `InputMethodService`, touch rendering, `InputConnection`, and IME picker.
- Flutter checks for Settings and bridge if touched: `flutter analyze`, `flutter test`.
- FlutterWeb preview sandbox checks: widget-test `KeyboardPreviewScreen` for letter insertion, Shift, Space, Back, Enter, suggestion insertion, context switches, private disabled actions and unknown-action status; manual Vercel check on `/keyboard` after `flutter build web`.
- Manual QA required on at least one Android phone: fresh install activation assistant, enable IME, switch keyboard, test integrated field, enable hidden touch-debug overlay, verify tap/swipe/annulation diagnostics, type paragraph in QWERTY and AZERTY, test double-space-to-period on/off and in email/URL/password fields, test punctuation auto-spacing defaults in French and English, test email/URL/phone/search field variants, test special-key double tap on/off and long-press precedence, configure drawable spacebar gesture, verify space tap under threshold inserts normal space, draw recognized and ambiguous gestures beyond threshold, verify configurable threshold, verify action preview, release execution, cancellation, unavailable Android action, app launch/settings intent where available, test portrait/landscape/split-screen sizing, configure active languages, switch keyboard language, launch dictation with selected language, choose themes, test light/dark/system modes, verify keyboard/action bar/settings panel theme application, verify Settings Flutter reflects IME preferences and IME reflects Settings Flutter preferences, configure keyboard modules, add/remove/reorder allowed rows/panels/actions, validate fallback profile, toggle normal/corners mode, use all four swipe corners, verify return-center cancellation, use top icon bar, swipe icon bar pages, verify pinned actions stay fixed while unpinned actions adapt, verify private mode does not update action usage stats, set action-bar long press to pin and long-press Chiffres/Media, set action-bar long press to attach context row and long-press Chiffres/Media, verify row dedupe/close/height limit, open Navigation mode, move cursor with joystick/D-pad, use visible arrows, move character left/right, move word left/right repeatedly, move by real paragraph up/down repeatedly, verify paragraph fallback when context is insufficient, delete character left/right, delete word left/right, long-press word deletion in both directions, open emoji, insert recent/category emoji, verify emoji recents update only outside private/sensitive fields, open clipboard, paste clipboard item, verify automatic return to normal keyboard after successful paste, verify clipboard panel stays open on failed/refused paste, pin clipboard item, verify Epingles button/filter opens pinned items without crowding normal history, change clipboard retention across 24h/7 days/30 days/unlimited, verify 7 days default, verify non-pinned old items purge and pinned items remain, verify unlimited keeps non-pinned items by age, unpin old item and verify it becomes purgeable, configure action bar from top bar and settings panel, add/remove/reorder actions, open settings panel, toggle corners/haptics/audio, open Android settings, switch default keyboard, tap and long-press media, verify contextual media row, verify adaptive action sorting, backspace emoji, rotate, test password field, test chat/search/email fields.
- Build validation: Android debug build on an environment with Android SDK. Respect existing ARM64 release guardrail; do not run release APK/AAB locally on ARM64.

# Risks

- Provenance risk: accidental dependency on an external keyboard implementation. Mitigation: implementation from this spec, no copy/paste, no vendoring, review diff for provenance.
- UX risk: swipe-corner thresholds feel unreliable or users prefer a normal keyboard. Mitigation: corners are optional, unit tests plus device tuning; expose constants only after manual QA.
- UX risk: adaptive sorting can feel unstable. Mitigation: pin core actions, reorder only non-critical actions, use local counters, and provide deterministic fallback order.
- UX risk: configurable long press can be confusing if the user forgets whether it pins or attaches a row. Mitigation: expose the preference clearly in keyboard quick settings and Flutter Settings, and show immediate feedback after long press.
- UX risk: double tap on special keys can trigger hidden actions accidentally. Mitigation: reserve it for non-critical actions, provide clear feedback, make it disableable, and define long-press precedence.
- UX risk: drawable gestures from space can collide with normal space typing or be recognized incorrectly. Mitigation: optional feature, clear start gesture, visible trace/action preview, confidence threshold, collision detection in settings, and no execution until finger release.
- Platform risk: Android does not expose every desired system/app action to third-party keyboards. Mitigation: maintain an explicit action catalog, resolve intents before use, mark unsupported actions unavailable, and avoid promising automation that requires accessibility or protected permissions.
- Security risk: gesture shortcuts could launch sensitive actions from private fields. Mitigation: context policy gates external actions in private/sensitive fields and never logs gesture trace with text content.
- UX risk: attached context rows can clutter the keyboard during typing. Mitigation: visible close button, bounded row count, dedupe, and row height limits that preserve the main typing surface.
- Privacy risk: adaptive sorting could learn from private-field behavior. Mitigation: private/incognito mode disables action usage stats and any learning-like local counters.
- UX risk: navigation remains too fiddly if implemented as small arrow buttons. Mitigation: dedicated Navigation mode with large joystick/D-pad and large side edit buttons; no reliance on fine swipe arrows for primary navigation.
- UX risk: word/paragraph navigation may be inconsistent across host apps with limited surrounding text access. Mitigation: visible feedback, conservative fallback, and no destructive action when movement cannot be calculated.
- UX risk: word-delete long press can over-delete. Mitigation: controlled repeat cadence, release/cancel stops immediately, QA on long text fields.
- UX risk: modular action configuration can hide useful controls. Mitigation: provide a minimal pinned set, restore defaults, and keep configuration reachable from both the bar and settings panel.
- Architecture risk: full keyboard modularity can overcomplicate the MVP. Mitigation: implement module catalog and fallback first, expose only a small allowed module set initially, and keep QWERTY/AZERTY defaults stable.
- Performance risk: custom drawing or touch handling janks inside IME. Mitigation: native Canvas view, no network/Flutter work on key path.
- Security risk: keyboard can access sensitive user text. Mitigation: no text logs, private field gating, explicit clipboard capture only.
- Privacy risk: pinned clipboard items can preserve sensitive content longer than expected. Mitigation: make pin state visible, require manual delete/reset for pinned items, disable capture in sensitive fields, and explain that pinning bypasses automatic retention.
- Data-retention risk: retention purge could delete useful clipboard history if applied too aggressively. Mitigation: pinned items are exempt, retention is user-configurable, and shortening retention only affects non-pinned entries.
- Debug risk: touch diagnostics could leak sensitive content if implemented naively. Mitigation: overlay contains only geometry, gesture metadata and action ids; no text, clipboard, suggestions or field content.
- UX risk: keyboard and dictation language diverge unexpectedly. Mitigation: one active-language panel owns both, dictation defaults to current keyboard language, and fallback states are visible.
- UX risk: double-space-to-period can be annoying when host apps mislabel fields. Mitigation: make it a visible keyboard setting, apply exclusions best-effort, and keep it easy to disable.
- UX risk: punctuation auto-spacing can feel wrong outside French prose. Mitigation: enable by default only for French, disable by default for English, allow per-language/user toggle, and skip sensitive/code-like fields best-effort.
- UX risk: context layouts may be wrong when apps provide poor field metadata. Mitigation: fallback to standard text layout when uncertain and keep core symbols accessible from every layout.
- UX risk: landscape/tablet handling grows into a full floating/one-hand keyboard project. Mitigation: MVP only supports fixed sizing profiles and explicitly excludes one-hand/floating/free resize.
- UX risk: clipboard panel can stay open after paste and interrupt continued typing. Mitigation: close it automatically after confirmed paste, but keep it open on failure so the user can recover.
- Privacy risk: emoji recents can reveal personal habits or sensitive context. Mitigation: local bounded store only, no sync, and no read/write of emoji recents in private/sensitive fields.
- Scope risk: emoji panel can become a full product inside the keyboard. Mitigation: MVP is limited to recents and simple categories; search, stickers, GIFs and exhaustive catalog are out of scope.
- UX/design risk: themes reduce readability on compact keys. Mitigation: predefined themes use shared tokens, fallback theme, and contrast checks before release.
- State risk: IME and Flutter Settings drift. Mitigation: one shared preference contract, MethodChannel status roundtrip tests, and native local store as offline source when Flutter is closed.
- Compatibility risk: OEM IME windows and host apps vary. Mitigation: broad manual QA matrix and conservative fallback behavior.
- Scope risk: WinGlows action bar distracts from base typing. Mitigation: base typing MVP is the readiness gate; advanced panels can remain minimal.
- Review risk: FlutterWeb preview can drift from native Android behavior and give false confidence. Mitigation: label it as a simulated sandbox, keep unsupported actions explicit, add widget tests, and continue to require Kotlin compile proof plus Android device QA for native readiness.

# Execution Notes

Read first:

- `lib/features/keyboard/presentation/keyboard_preview_screen.dart`
- `test/widget_test.dart`
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzInputMethodService.kt`
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt`
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardSecurityPolicy.kt`
- `lib/core/platform/android_keyboard_bridge.dart`
- `shipglows_data/workflow/specs/clipboard-backend-agnostic-api.md`

Approach:

1. Add the provenance guardrail before code.
2. Build layout and gesture engines as small independent Kotlin units.
3. Replace rendering/touch view while keeping existing service callbacks compiling.
4. Centralize `InputConnection` editing and only then tune UX.
5. Update docs after device QA evidence exists.

Allowed packages: Android SDK/Kotlin standard APIs already in project. Avoid adding third-party keyboard libraries unless separately reviewed for product fit, licence and maintenance.

Stop conditions:

- Any need to copy an external keyboard implementation, layout file, or asset.
- Android SDK unavailable for all native validation after code changes.
- Gesture MVP cannot pass manual typing without frequent wrong characters.
- A security change would weaken sensitive-field behavior.

# Open Questions

- Aucun point bloquant ouvert pour la spec actuelle.

# Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-05-09 15:32:50 UTC | sf-spec | GPT-5 Codex | Created proprietary Android swipe-corner keyboard spec from local IME context and user requirement for an in-house usable keyboard | draft saved | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-09 15:49:18 UTC | sf-spec | GPT-5 Codex | Integrated user decisions: QWERTY and AZERTY, return-center cancels gesture, corner gestures optional, normal keyboard mode, and top row modes for numbers/math, accents, symbols and letters | draft updated | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-09 15:57:11 UTC | sf-spec | GPT-5 Codex | Added top-row clipboard action, long-press action behavior, compact media `>| ||` control and extended media bar on media long press | draft updated | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-09 16:00:29 UTC | sf-spec | GPT-5 Codex | Added emoji button, compact icon action bar, swipable action pages, and local adaptive sorting by action usage | draft updated | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-09 16:02:02 UTC | sf-spec | GPT-5 Codex | Added settings icon action and quick settings panel for Android settings, input method picker, corner-mode toggle and haptic shortcut toggle | draft updated | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-09 16:03:42 UTC | sf-spec | GPT-5 Codex | Added modular action-bar configuration from the bar and settings panel, with add/remove/reorder, action catalog, pinned minimal set and fallback for unknown actions | draft updated | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-09 16:05:21 UTC | sf-spec | GPT-5 Codex | Expanded modularity from the action bar to the full keyboard surface: module catalog, keyboard profile config, row/panel/action modules, compatibility checks and fallback typing profile | draft updated | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-09 16:08:06 UTC | sf-spec | GPT-5 Codex | Added active language selection for keyboard layouts and voice dictation, with top-bar language action, settings-panel entry, language panel, resolver and fallback rules | draft updated | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-09 16:12:22 UTC | sf-spec | GPT-5 Codex | Added keyboard themes for keyboard/action bar/settings panel plus shared preference contract to keep native IME settings and Flutter Settings aligned | draft updated | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-09 16:15:45 UTC | sf-spec | GPT-5 Codex | Required every theme to provide light and dark variants, added appearance mode light/dark/system, and synced that mode through IME and Flutter Settings preferences | draft updated | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-09 16:29:45 UTC | sf-spec | GPT-5 Codex | Integrated FlorisBoard-informed UX decisions confirmed by user: keep adaptive smartbar with pinned fixed actions, add dedicated Navigation mode with large joystick/D-pad and word deletion controls, add input feedback layer, and strengthen private mode to disable adaptive stats | draft updated | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-09 16:36:01 UTC | sf-spec | GPT-5 Codex | Added configurable action-bar long press behavior: pin/desepingle action or attach a persistent contextual quick-action row, with Chiffres and Media rows as MVP examples | draft updated | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-09 16:48:09 UTC | sf-spec | GPT-5 Codex | Added keyboard activation assistant as the concrete onboarding flow in Settings: enable Android IME, select active keyboard, refresh status and test input | draft updated | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-09 16:55:11 UTC | sf-spec | GPT-5 Codex | Added hidden developer touch-debug overlay for key bounds, swipe direction, thresholds, dispatch action and cancellation reasons without exposing user text | draft updated | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-09 17:18:47 UTC | sf-spec | GPT-5 Codex | Added configurable double-space-to-period correction with best-effort exclusions for email, URL, password, OTP and sensitive fields | draft updated | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-09 17:21:56 UTC | sf-spec | GPT-5 Codex | Added configurable punctuation auto-spacing enabled by default for French and disabled by default for English | draft updated | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-09 17:25:08 UTC | sf-spec | GPT-5 Codex | Added context-aware key variants and enter behavior for email, URL, phone and search fields | draft updated | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-09 17:29:29 UTC | sf-spec | GPT-5 Codex | Added lightweight landscape/tablet sizing adaptation and explicitly excluded one-handed/floating keyboard modes from MVP | draft updated | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-09 17:38:37 UTC | sf-spec | GPT-5 Codex | Added lightweight emoji panel with recents, simple categories, no search, and no recent-history updates in private/sensitive fields | draft updated | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-09 17:42:36 UTC | sf-spec | GPT-5 Codex | Added clipboard panel behavior: close automatically after confirmed paste and stay open with feedback when paste fails | draft updated | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-09 17:44:31 UTC | sf-spec | GPT-5 Codex | Added clipboard item pinning and configurable retention for non-pinned clipboard history | draft updated | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-09 17:49:03 UTC | sf-spec | GPT-5 Codex | Fixed clipboard retention choices to 24h, 7 days, 30 days and unlimited, with 7 days as default | draft updated | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-09 17:56:15 UTC | sf-spec | GPT-5 Codex | Added clipboard display ordering: pinned items appear in a dedicated top section above normal history | superseded by 18:11 decision | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-09 18:11:46 UTC | sf-spec | GPT-5 Codex | Replaced pinned clipboard top section with a small pinned-items button/filter so normal history stays readable when many items are pinned | draft updated | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-09 18:14:46 UTC | sf-spec | GPT-5 Codex | Expanded Navigation mode with visible word left/right and paragraph up/down movement buttons next to character navigation | draft updated | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-09 18:21:50 UTC | sf-spec | GPT-5 Codex | Clarified paragraph navigation targets real paragraphs, with non-destructive fallback only when host text context is insufficient | draft updated | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-09 18:23:57 UTC | sf-spec | GPT-5 Codex | Added double-tap policy for special keys such as Shift/Maj and Control, with configurable actions, disable switch, feedback and long-press precedence | draft updated | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-09 18:25:36 UTC | sf-spec | GPT-5 Codex | Added drawable gesture shortcuts starting from the space bar, with settings recorder, action preview, collision detection and conservative Android action catalog | draft updated | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-09 18:29:15 UTC | sf-spec | GPT-5 Codex | Changed spacebar drawable gesture start from long-press style to configurable movement threshold: tap remains space, movement beyond threshold starts drawing | draft updated | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-10 22:06:25 UTC | sf-spec | GPT-5 Codex | Checked existing keyboard chantier after user asked whether the remaining implementation work was specified; recorded partial custom Canvas/touch rewrite status for Tache 4 | draft tracking updated | /sf-ready Proprietary Swipe-Corner Android Keyboard |
| 2026-05-10 22:10:51 UTC | sf-ready | GPT-5 Codex | Evaluated readiness gate: structure, metadata, user-story fit, adversarial/security review, language doctrine, docs coherence and fresh Android docs | ready | /sf-start Proprietary Swipe-Corner Android Keyboard |
| 2026-05-10 22:24:59 UTC | sf-start | GPT-5.3 Codex | Implemented modular keyboard layout engine, tap+swipe-corner classifier, QWERTY/AZERTY and field-context IME behavior, codepoint backspace, native mini-panels, keyboard preference bridge updates, docs updates, and Kotlin unit tests | partial | /sf-verify Proprietary Swipe-Corner Android Keyboard |
| 2026-05-10 22:35:50 UTC | sf-start | GPT-5.3 Codex | Extended IME with minimal Navigation panel, lightweight Emoji panel with local recents, double-space/auto-spacing corrections, and touch-debug overlay; updated docs and bridge/status contracts | partial | /sf-verify Proprietary Swipe-Corner Android Keyboard |
| 2026-05-10 22:38:00 UTC | sf-verify | GPT-5.5 | Verified current implementation against spec, local checks, bug gate, docs, and Android SDK compile availability | partial | /sf-start shipglows_data/workflow/specs/proprietary-swipe-corner-android-keyboard.md |
| 2026-05-10 23:20:00 UTC | sf-start | GPT-5.3 Codex | Fixed post-phone layout reset, hardened InputConnection success/failure handling with visible feedback, aligned punctuation auto-spacing default to French-only, clarified clipboard pins behavior, and documented pending long-press/double-tap implementation | partial | /sf-verify Proprietary Swipe-Corner Android Keyboard |
| 2026-05-10 22:47:20 UTC | sf-verify | GPT-5 Codex | Verified post-correction gaps: phone context no longer persists Numbers mode, InputConnection failures are surfaced, punctuation default is locale-aware, pins/double-tap/long-press docs are clarified; privacy still leaks emoji recents in private mode and local Kotlin compile is blocked by missing Android SDK | partial | /sf-start targeted private emoji recents fix, then Android SDK/CI compile proof |
| 2026-05-10 22:55:00 UTC | sf-verify | GPT-5 Codex | Re-verified targeted private emoji recents fix: private fields no longer read recents into the emoji panel and no longer write inserted emoji to recent history; double-space suppression remains gated by private/email/url/phone context; local Dart checks pass, Android Kotlin compile proof remains blocked by missing SDK | verified | /sf-end Proprietary Swipe-Corner Android Keyboard |
| 2026-05-11 03:15:38 UTC | continue | GPT-5 Codex | Resumed chantier after targeted verification and routed to partial closeout because Android Kotlin compile proof and device QA remain missing | routed | /sf-end Proprietary Swipe-Corner Android Keyboard |
| 2026-05-11 03:15:38 UTC | sf-end | GPT-5 Codex | Closed the implementation session as partial: core custom keyboard work, privacy fix and Dart checks are recorded, while Android native compile/device proof remains required before ship | deferred | /sf-ship only after Android Kotlin/Gradle or CI compile proof and device QA |
| 2026-05-11 14:04:10 UTC | sf-spec | GPT-5 Codex | Added reference-keyboard parity roadmap from local `/home/claude/keyboard` audit and created a first foundation task for IME lifecycle/context/subtypes | updated | /sf-start Proprietary Swipe-Corner Android Keyboard |
| 2026-05-11 14:04:10 UTC | sf-start | GPT-5 Codex | Implemented first parity foundation slice: FR/EN IME subtypes, next-input support, defensive IME lifecycle hooks, richer input context, numeric field mode and no hardcoded snippet insertion | partial | /sf-verify Proprietary Swipe-Corner Android Keyboard |
| 2026-05-11 14:20:23 UTC | sf-start | GPT-5 Codex | Implemented second reference-keyboard parity slice: selection update state, narrow InputConnection editor abstraction, confirmed navigation moves and centralized clipboard paste insertion | partial | /sf-verify Proprietary Swipe-Corner Android Keyboard |
| 2026-05-11 15:02:57 UTC | sf-start | GPT-5 Codex | Added FlutterWeb keyboard preview as the single browser review surface for Vercel, including profile/context/panel controls and responsive shell navigation | partial | /sf-verify Proprietary Swipe-Corner Android Keyboard |
| 2026-05-11 15:12:10 UTC | sf-ship | GPT-5 Codex | Shipped reference-keyboard parity foundations and FlutterWeb keyboard preview with Dart checks and web build proof; Android native compile/device proof remains pending | shipped | /sf-verify Proprietary Swipe-Corner Android Keyboard |
| 2026-05-11 17:53:55 UTC | sf-start | GPT-5 Codex | Installed local Android SDK command-line tools/platform 36 and proved app Kotlin compilation with `./gradlew :app:compileDebugKotlin -x :app:processDebugResources -x :app:processDebugManifest -x :app:compileFlutterBuildDebug`; full Android resource packaging remains blocked on this aarch64 runner because AAPT2 is x86_64 | partial | /sf-verify Proprietary Swipe-Corner Android Keyboard on x86_64 CI or Android device |
| 2026-05-11 18:04:46 UTC | sf-verify | GPT-5 Codex | Verified current keyboard IME chantier against the spec, dirty diff, bug gate and local checks; `flutter analyze`, `flutter test test/widget_test.dart`, `git diff --check` and Kotlin compile with AAPT/Flutter resource tasks excluded pass; full `:app:testDebugUnitTest` still blocks at `:app:processDebugResources` because AAPT2 cannot start on this aarch64 runner | partial | Full Gradle packaging on x86_64 CI/Blacksmith, then Android device IME QA |
| 2026-05-12 18:28:25 UTC | sf-build | GPT-5 Codex | Continued reference-keyboard parity by adding Kotlin `KeyboardKeyValue`/parser/modifier/modmap foundations plus active-pointer touch handling, secondary pointer suppression, long-press repeat, and horizontal spacebar cursor sliding | partial | /sf-verify Proprietary Swipe-Corner Android Keyboard |
| 2026-05-12 20:02:23 UTC | direct | GPT-5 Codex | Wired the key-value engine into live layout and dispatch: parsed text keys, Ctrl/Alt/Fn modifier keys, key-event/action/macro dispatch support and built-in Fn navigation modmap | partial | /sf-verify Proprietary Swipe-Corner Android Keyboard |
| 2026-05-12 20:39:39 UTC | sf-spec | GPT-5 Codex | Added light spec for FlutterWeb keyboard typing sandbox: simulated input field, tappable preview keys, suggestions, context/private handling and widget-test coverage | updated | /sf-start FlutterWeb keyboard typing sandbox |
| 2026-05-13 03:27:07 UTC | sf-start | GPT-5 Codex | Implemented FlutterWeb keyboard typing sandbox: simulated input buffer/cursor/status, tappable `_KeyCap` dispatch for letters/numbers/punctuation and Shift/Space/Back/Enter/suggestions, clear/reset controls, explicit disabled/non-simulated statuses, and widget tests for typing plus email/private behavior | implemented | /sf-verify Proprietary Swipe-Corner Android Keyboard |
| 2026-05-13 03:30:25 UTC | sf-verify | GPT-5 Codex | Verified the FlutterWeb typing sandbox locally, fixed suggestion spacing so suggestions do not attach to existing text, and reran widget tests, analyzer and diff whitespace checks | partial | /sf-ship FlutterWeb keyboard typing sandbox, then /sf-prod and preview browser check |
| 2026-05-14 11:24:18 UTC | sf-build | GPT-5 Codex | Moved hardcoded swipe-corner accent behavior into the dedicated configurable corner shortcuts chantier; native layout now resolves corner assignments from presets/overrides and Flutter preview/settings use the same config contract | implemented in child chantier | /sf-verify Configurable Key Corner Swipes |
| 2026-05-16 11:38:42 UTC | sf-spec | GPT-5 Codex | Formalized the shared action-bar architecture contract: descriptors, catalog, state, controller, row providers, page-based rows, shared renderer, private-mode availability and anti-duplication rules for every action bar/context row. | updated | /sf-ready Proprietary Swipe-Corner Android Keyboard action-bar architecture |
| 2026-05-16 11:43:15 UTC | sf-verify | GPT-5 Codex | Verified the action-bar architecture spec update against the user decisions, metadata, dependencies, language doctrine, bug gate and diff hygiene; this verifies the contract update only, not native implementation readiness. | verified | /sf-ready Proprietary Swipe-Corner Android Keyboard action-bar architecture |
| 2026-05-16 11:47:47 UTC | sf-ready | GPT-5 Codex | Evaluated the action-bar architecture readiness gate, refreshed stale dependency versions and next-step/status metadata, and confirmed the slice is unambiguous enough for implementation. | ready | /sf-start Proprietary Swipe-Corner Android Keyboard action-bar architecture |
| 2026-05-16 12:11:41 UTC | sf-start | GPT-5.3 Codex | Implemented shared native action-bar architecture across IME actions with descriptor/catalog/state/controller/row-provider/renderer contracts, paged attached rows, private-mode sensitive-action masking, adaptive-usage gating, and integration in keyboard view/layout/service/store/tests. | implemented | /sf-verify Proprietary Swipe-Corner Android Keyboard action-bar architecture |
| 2026-05-16 12:16:33 UTC | sf-verify | GPT-5 Codex | Verified the native action-bar architecture slice locally, fixed remaining Navigation-panel clipboard action leakage into the Clip entry point, reran whitespace and Kotlin compile checks, and identified remaining proof gaps: AAPT2-blocked unit test on ARM64, missing Android device QA, and Settings UI exposure for long-press behavior. | partial | CI/Blacksmith x86_64 test/build proof plus Android device QA for action rows |
| 2026-05-16 12:44:20 UTC | sf-fix | GPT-5 Codex | Fixed Android real-device regression from action-bar architecture: restored the main action row to non-scrollable compact distribution, kept explicit context rows paged, and changed default long press to attach contextual rows instead of pin/unpin. | fixed-pending-verify | /sf-test --retest BUG-2026-05-16-006 on Android real device |

# Current Chantier Flow

- sf-spec: updated 2026-05-16 with the shared action-bar architecture contract in `shipglows_data/workflow/specs/proprietary-swipe-corner-android-keyboard.md`
- sf-ready: ready as of 2026-05-16 11:47:47 UTC for the action-bar architecture slice
- sf-start: implemented 2026-05-16 12:11:41 UTC for the native action-bar architecture slice (Taches 10-11), with Kotlin compile proof and pending hosted/manual verification.
- sf-verify: partial as of 2026-05-16 12:16:33 UTC; local diff hygiene and Kotlin compile pass, but full unit test/build proof on x86_64 CI plus Android real-device QA remain required.
- sf-fix: fixed-pending-verify as of 2026-05-16 12:44:20 UTC for `BUG-2026-05-16-006`; Android device retest and Blacksmith/x86_64 proof remain required.
- sf-end: deferred as of 2026-05-11 03:15:38 UTC; session closed as partial because compile/device evidence is still missing
- sf-ship: shipped on 2026-05-11 15:12:10 UTC for the current parity/FlutterWeb preview slice; not a final Android native readiness ship

Next command: CI/Blacksmith x86_64 test/build proof plus Android device QA for action rows
