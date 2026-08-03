---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-06-12"
created_at: "2026-06-12 12:57:00 UTC"
updated: "2026-06-12"
updated_at: "2026-06-12 15:41:39 UTC"
status: ready
source_skill: 100-sf-spec
source_model: "GPT-5 Codex"
scope: "android voice pipeline hardening"
owner: "Diane"
confidence: "high"
user_story: "En tant qu'utilisatrice Android de WinGlows, je veux que les fonctions micro et transcription produisent un resultat fiable et sur sans fuite vers le presse-papiers ni faux etat actif, afin de pouvoir dicter depuis le clavier ou l'overlay sans ambiguite."
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Flutter app"
  - "Android IME keyboard"
  - "Android overlay foreground service"
  - "Android accessibility injection"
  - "Android SpeechRecognizer fallback"
  - "On-device ASR local runtime"
  - "Transcription stores"
  - "Runtime diagnostics and Sentry"
depends_on:
  - artifact: "shipglows_data/workflow/specs/asr-local-runtime-engine-integration.md"
    artifact_version: "0.1.0"
    required_status: "draft"
  - artifact: "shipglows_data/workflow/specs/android-overlay-flutter-parity-repair.md"
    artifact_version: "1.0.0"
    required_status: "active"
  - artifact: "CLAUDE.md"
    artifact_version: "1.2.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/business/business.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
supersedes: []
evidence:
  - "Audit 401-sf-audit-code du 2026-06-12: OverlayTextInjectionHelper copie toujours le texte dicte dans le presse-papiers, y compris sur champ sensible."
  - "Audit 401-sf-audit-code du 2026-06-12: le parcours produit de packs locaux existe deja, mais KeyboardLocalVoiceEngine ne prouve pas encore un moteur local Android fonctionnel end-to-end dans le code audite."
  - "Audit 401-sf-audit-code du 2026-06-12: AndroidOverlayBridge expose drainEvents(), mais le flux overlay n'est pas importe dans l'historique vocal Flutter."
  - "Audit 401-sf-audit-code du 2026-06-12: MainActivity.startOverlayRecording ne bloque pas sur RECORD_AUDIO et peut presenter un faux demarrage fonctionnel."
  - "CLAUDE.md: Voice recording and AI cleanup pipelines are not fully wired end-to-end."
next_step: "/107-sf-test shipglows_data/workflow/test-checklists/android-micro-transcription-pipeline-hardening.md"
---

# Title

Android Micro/Transcription Pipeline Hardening

# Status

Ready. Cette spec transverse couvre les trous fonctionnels restants entre les chantiers overlay Android et runtime ASR local. Le besoin n'est pas de refaire l'UI, mais de garantir que les surfaces micro/transcription Android ont un contrat executable, coherent et sur de bout en bout.

# User Story

En tant qu'utilisatrice Android de WinGlows, je veux que les fonctions micro et transcription produisent un resultat fiable et sur sans fuite vers le presse-papiers ni faux etat actif, afin de pouvoir dicter depuis le clavier ou l'overlay sans ambiguite.

Actrice principale: utilisatrice Android WinGlows qui dicte via l'IME ou l'overlay.

Acteurs secondaires: support, produit, QA Android, observabilite runtime.

Declencheurs principaux:

- l'utilisatrice lance une dictee depuis le clavier Android WinGlows;
- l'utilisatrice lance une dictee depuis l'overlay Android;
- l'app tente d'utiliser un pack local, un fallback Android, ou une livraison accessibility/clipboard;
- une permission micro, overlay, foreground service ou accessibility manque, change, ou est revoquee.

Resultat observable attendu: une session micro unique demarre seulement quand les preconditions reelles sont satisfaites, produit un texte final route vers le bon store/source, et ne fuit jamais vers le clipboard si la politique de securite l'interdit.

# Minimal Behavior Contract

Le pipeline micro/transcription Android doit posseder un seul orchestrateur fonctionnel par session, capable de valider les permissions et la route active avant de marquer la capture "active", de produire un texte final source `keyboard` ou `overlay`, de persister ce texte dans l'historique vocal quand il est valide, et de livrer ce texte dans le champ cible ou le clipboard selon une politique explicite de securite.

Si le runtime local n'est pas prouve end-to-end dans le code actif, l'app ne doit pas se presenter comme en mode local actif. Si l'overlay ne peut pas enregistrer faute de permission micro ou de raccordement de session, l'app ne doit pas presenter un faux etat `recording`. Si le champ cible est sensible, le texte ne doit pas etre injecte ni copie silencieusement.

L'edge case facile a rater est que les etats natifs peuvent aujourd'hui etre "corrects" visuellement alors que rien n'est branche jusqu'au store Flutter ou que la livraison texte fuit via clipboard.

# Success Behavior

- Given `RECORD_AUDIO` manque, when une session clavier ou overlay est demandee, then la session est refusee avant tout etat actif trompeur, avec un code d'erreur stable et un statut diagnostic coherent.
- Given une session IME produit un resultat final, when le draft est valide, then il est persiste une seule fois dans le store de transcription avec `source=keyboard`.
- Given une session overlay produit un resultat final, when le draft est valide, then il est persiste une seule fois dans le store de transcription avec `source=overlay`.
- Given un pack local est configure mais que le moteur n'est pas reellement demarrable, when la dictree commence, then le statut expose explicitement le fallback ou l'indisponibilite sans pretendre a un `runtime_mode=local` fonctionnel.
- Given le texte final doit etre livre dans une autre app, when le champ cible est editable et non sensible, then l'injection accessibility peut etre tentee; le clipboard n'est utilise que selon la politique explicite de delivery.
- Given le champ cible est sensible ou non injectable, when un texte final existe, then aucune injection ni copie implicite non autorisee n'a lieu; le systeme remonte un resultat de delivery qui permet a Flutter d'expliquer l'echec de facon recuperable.
- Given l'overlay ou l'IME est deja en session micro, when une deuxieme surface tente de demarrer, then le systeme refuse ou arbitre explicitement la nouvelle session; aucun double usage du micro ne demarre.

# Error Behavior

- Si `RECORD_AUDIO` manque, le pipeline retourne un code stable de permission manquante et n'entre pas dans `recording`, `processing`, ou un equivalent trompeur.
- Si l'overlay a seulement la permission d'affichage sans permission micro, le service peut rester affichable, mais la commande de start recording doit echouer explicitement.
- Si le runtime local reste non prouve, non linked, ou invalide dans le code actif, l'etat diagnostic doit dire `android_fallback` ou `unavailable`; il ne doit jamais suggerer qu'une vraie transcription locale a demarre.
- Si Flutter n'importe aucun evenement overlay final, le run doit etre considere incomplet; aucune acceptance criteria ne peut etre validee tant que `source=overlay` n'est pas persistee.
- Si le champ cible est password/OTP/sensible, le texte ne doit ni etre injecte ni etre copie automatiquement au clipboard. Le resultat de delivery doit exposer ce blocage sans fuite de contenu.
- Si la persistance store echoue apres resultat micro, l'echec doit etre visible dans les diagnostics et ne pas etre masque par un simple changement d'etat visuel natif.

# Problem

Le produit a aujourd'hui trois ruptures majeures dans ses fonctionnalites micro/transcription Android:

1. le chemin runtime local IME est annonce, configurable et teste en surface, mais le moteur local Android n'est pas encore prouve end-to-end dans le code audite, malgre l'existence d'un parcours produit de packs locaux;
2. le chemin overlay Android expose un bridge et des etats natifs, mais le resultat final n'est pas raccorde de facon sure au store Flutter des transcriptions;
3. la livraison finale du texte overlay copie aujourd'hui le contenu dans le presse-papiers meme quand le champ cible est sensible ou quand l'injection a deja reussi.

Ces trous combinent risque securite, faux positifs fonctionnels, et incoherence produit. Ils rendent impossible une promesse fiable du type "dicter localement ou via overlay" tant que le pipeline n'est pas durci de bout en bout.

# Solution

Durcir le pipeline micro/transcription Android comme un contrat transverse a deux chantiers existants:

- `asr-local-runtime-engine-integration.md` reste le chantier du vrai moteur local IME;
- `android-overlay-flutter-parity-repair.md` reste le chantier de la bulle et du bridge overlay;
- cette nouvelle spec impose les regles de verite fonctionnelle, de persistance, d'arbitration de session, et de delivery securise que les deux chantiers doivent satisfaire ensemble.

Le principe directeur est: aucune surface Android ne peut annoncer un etat de capture ou de transcription qu'elle n'est pas capable de mener jusqu'a un resultat observable, persiste, et non fuyant.

Decisions explicites confirmees pour cette spec:

- tant que le moteur local Android n'est pas prouve end-to-end, WinGlows doit se declarer explicitement `android_fallback` ou `unavailable`, jamais `local` actif;
- si le champ cible est sensible, WinGlows ne doit ni injecter ni copier automatiquement le texte; une recuperation manuelle explicite peut etre proposee plus tard, mais elle n'appartient pas a ce chantier;
- si une session micro est deja active, toute seconde tentative de demarrage doit etre refusee proprement; ce chantier ne retient pas la preemption automatique;
- la preuve Android manuelle doit passer par une checklist dediee couvrant overlay hors app, IME dictation, champ sensible, permission micro refusee, et concurrence IME/overlay;
- l'ordre d'implementation impose est: fuite clipboard -> faux etats micro -> raccordement overlay store -> clarification runtime local -> arbitrage de session -> diagnostics.

# Scope In

- Android uniquement.
- Fonctionnalites micro/transcription du clavier IME.
- Fonctionnalites micro/transcription de l'overlay Android.
- Politique de delivery du texte final vers accessibility et clipboard.
- Persistance des transcriptions Flutter pour les sources `keyboard` et `overlay`.
- Contrat de verite des permissions micro/overlay/accessibility.
- Diagnostics runtime, statut de fallback, et preuves minimales Sentry/log-copy pour ces flux.
- Tests unitaires et d'integration cibles sur la logique fonctionnelle, sans redesign UI.

# Scope Out

- Refonte visuelle des ecrans Voice ou Settings.
- iOS, desktop, web.
- Benchmark complet des moteurs ASR par langue.
- Nouveau pipeline cloud de nettoyage IA.
- Suppression des specs existantes ou fusion de leurs chantiers.
- Refonte generale du design system.

# Constraints

- Respecter les garde-fous repo: pas de build Android local; la preuve APK/device passe par GitHub Actions/Blacksmith et QA physique Diane.
- Les surfaces Flutter partagees restent testables par `flutter test`; les comportements natifs Android restent verifies par tests Kotlin et preuve externe Android.
- Le texte dicte, les champs cibles, les contenus clipboard et les secrets ne doivent pas entrer dans les logs diagnostics ou Sentry.
- Le runtime local ne doit pas etre presente comme disponible tant qu'un moteur Android local fonctionnel n'est pas prouve end-to-end.
- Le clipboard ne doit plus etre une consequence automatique de toute tentative de delivery overlay.

# Test Contract

surface: Flutter shared app + Android native IME + Android native overlay + accessibility delivery + transcription stores.
proof_profile: automation-first for contract drift and safety regressions, then Android CI proof, then physical-device proof for microphone, overlay, and sensitive-field behavior.
proof_order:
- `flutter analyze`
- targeted `flutter test` for voice/import/store/diagnostics flows
- targeted Kotlin unit tests for permission truthfulness, local-runtime fallback truthfulness, and delivery policy
- GitHub Actions/Blacksmith Android build + test proof
- manual Android checklist execution on physical device
checklist_path: `shipglows_data/workflow/test-checklists/android-micro-transcription-pipeline-hardening.md`
required_scenario_ids:
- AMP-001
- AMP-002
- AMP-003
- AMP-004
- AMP-005
required_results:
- no false-positive active/recording state when `RECORD_AUDIO` is denied
- `source=overlay` persists exactly once after a valid overlay completion
- `source=keyboard` persists exactly once after a valid IME completion
- sensitive target blocks injection and automatic clipboard copy
- runtime local non prouve exposes fallback or unavailable, never a fake active local runtime
- concurrent IME/overlay start is refused cleanly
exception_with_proof:
- Android native microphone capture and overlay behavior cannot be proven by Flutter-only tests; GitHub Actions Android proof and Diane device QA are mandatory before closure.
- Accessibility delivery on sensitive and non-sensitive fields requires physical-device proof because emulator/browser-only evidence is insufficient for trust.
exception_without_proof: none

# Dependencies

- `shipglows_data/workflow/specs/asr-local-runtime-engine-integration.md`: chantier de preuve et d'integration du moteur local Android.
- `shipglows_data/workflow/specs/android-overlay-flutter-parity-repair.md`: chantier bridge/overlay natif.
- `lib/features/voice/application/transcription_store_provider.dart`
- `lib/features/voice/domain/transcription_draft.dart`
- `lib/features/voice/presentation/voice_screen.dart`
- `lib/features/shell/presentation/app_shell_screen.dart`
- `lib/core/platform/android_overlay_bridge.dart`
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt`
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/OverlayForegroundService.kt`
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/OverlayTextInjectionHelper.kt`
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardVoiceController.kt`
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardLocalVoiceEngine.kt`
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardLocalRuntimePath.kt`
- Fresh docs verdict: `fresh-docs not needed` pour cette spec, car elle formalise d'abord des incoherences locales de branchement et de securite deja observables dans le code du repo.

# Invariants

- Une seule session micro active a la fois entre IME, overlay et toute autre surface voix.
- Un etat `recording` ou `active` ne peut etre publie que si la surface correspondante peut reellement capter le micro.
- Une transcription persistable doit toujours passer par `TranscriptionDraft.isValid`.
- `source=overlay` doit exister dans le store quand une session overlay aboutit a un texte final valide.
- `source=keyboard` ne doit pas etre dupliquee lors des imports auto ou refresh de page.
- La delivery overlay ne doit jamais copier automatiquement dans le clipboard un texte detecte comme sensible pour le champ cible.
- Les diagnostics runtime et Sentry restent redacts et commencent par l'identite build/commit + Paris/UTC quand une surface de copie est utilisee.

# Links & Consequences

- Le chantier local-runtime devra soit prouver un moteur local Android fonctionnel end-to-end, soit declasser explicitement toute promesse locale tant que cette preuve manque.
- Le chantier overlay devra etre considere incomplet tant que les evenements natifs ne creent pas de transcription `source=overlay` dans Flutter.
- Les flux Settings et Voice peuvent conserver leur UI actuelle, mais leurs messages devront refleter des etats fonctionnels veridiques.
- La politique de clipboard peut impacter le support utilisateur: il faudra documenter quand WinGlows copie encore un texte et quand il bloque volontairement.
- La matrice de verification Android doit inclure au minimum password/OTP, permission micro refusee, et concurrence IME/overlay.

# Documentation Coherence

- Mettre a jour `docs/OVERLAY_ANDROID.md` apres implementation pour documenter la nouvelle politique de delivery, les codes d'erreur micro, et le contrat `source=overlay`.
- Mettre a jour les sections diagnostics/support de l'app si elles exposent le statut runtime voix.
- Ajouter ou mettre a jour une checklist de verification manuelle Android dans `shipglows_data/workflow/test-checklists/` si elle n'existe pas deja pour ces flux.
- Les specs `asr-local-runtime-engine-integration.md` et `android-overlay-flutter-parity-repair.md` devront etre relues ensuite pour aligner leurs acceptance criteria avec cette verite produit.

# Edge Cases

- `RECORD_AUDIO` refusee mais overlay permission accordee.
- Accessibility accordee mais champ non editable.
- Champ password, web password, OTP, ou champ numerique sensible.
- Injection accessibility reussie mais clipboard indisponible.
- Clipboard disponible mais policy security interdit la copie.
- Overlay demarre alors que l'IME ecoute deja.
- IME redemarre pendant une session overlay.
- Pack local configure mais moteur non linked.
- Fallback Android disponible mais boucle de restart du recognizer depassee.
- Persistance store indisponible apres resultat final.
- Reouverture de l'ecran Voice apres evenements deja draines.

# Implementation Tasks

- [ ] Tache 1: Verite permission et etat actif
  - Fichiers: `MainActivity.kt`, `KeyboardVoiceController.kt`, `android_overlay_bridge.dart`
  - Action: empecher tout faux demarrage micro; un start doit valider `RECORD_AUDIO` avant de publier un etat actif ou un succes de commande.
  - Validate with: tests Kotlin/Dart sur refus permission et statuts retournes.

- [ ] Tache 2: Politique de delivery securisee
  - Fichiers: `OverlayTextInjectionHelper.kt`, bridge Flutter overlay
  - Action: supprimer la copie clipboard automatique quand le champ est sensible ou quand la policy de delivery ne l'autorise pas; remonter un resultat de delivery plus precis a Flutter.
  - Validate with: tests unitaires Kotlin sur champ editable, non editable, password, et exception clipboard.

- [ ] Tache 3: Raccordement overlay -> transcription store
  - Fichiers: `android_overlay_bridge.dart`, `voice_screen.dart`, `app_shell_screen.dart`, event queues Android
  - Action: consommer effectivement les evenements overlay pertinents et persister les resultats valides avec `source=overlay`.
  - Validate with: test Dart/integration local simulant un evenement overlay final et verifiant l'apparition dans le store.

- [ ] Tache 4: Clarification du runtime local reel
  - Fichiers: `KeyboardLocalVoiceEngine.kt`, `KeyboardVoiceController.kt`, spec dependante ASR locale
  - Action: declasser explicitement la disponibilite locale pour eviter toute promesse mensongere tant que le moteur local Android n'est pas prouve end-to-end; si une vraie execution locale est finalement demontree dans ce meme chantier, la preuve devra mettre a jour ce choix de facon explicite dans la spec avant verification finale.
  - Validate with: statut runtime sans faux `local active`; tests Kotlin sur path non linked/non prouve et preuve explicite si execution locale reelle.

- [ ] Tache 5: Arbitration de session micro
  - Fichiers: pipeline IME, overlay foreground service, couche Flutter voix
  - Action: centraliser la regle "une seule session micro active" et decider du comportement en cas de concurrence.
  - Validate with: scenario IME actif puis overlay start, et inversement.

- [ ] Tache 6: Diagnostics et observabilite
  - Fichiers: surface diagnostics Flutter, `AppDiagnostics`, bridges Android
  - Action: exposer les erreurs runtime micro/transcription et la policy de delivery sans texte prive, avec en-tete build/commit/Paris/UTC sur copie diagnostics.
  - Validate with: widget test ou verification manuelle de la surface diagnostics + coherence avec doctrine Sentry.

# Acceptance Criteria

- [ ] AC1: Une tentative de start micro sans `RECORD_AUDIO` ne peut plus renvoyer un etat de succes trompeur ni faire apparaitre une session active.
- [ ] AC2: Une session overlay qui produit un texte final valide cree exactement une transcription `source=overlay` dans l'historique Flutter.
- [ ] AC3: Une session IME qui produit un texte final valide cree exactement une transcription `source=keyboard` sans duplication lors des resync.
- [ ] AC4: Un champ sensible detecte bloque injection et copie clipboard automatique; aucune fuite texte n'est creee par `OverlayTextInjectionHelper`.
- [ ] AC5: Tant que le moteur local Android n'est pas prouve end-to-end, le systeme ne revendique pas un runtime local actif; il expose explicitement fallback ou indisponibilite.
- [ ] AC6: Overlay et IME ne peuvent pas enregistrer simultanement; le comportement d'arbitration est stable et diagnostiquable.
- [ ] AC7: Les diagnostics runtime pour ces flux restent redacts et fournissent assez d'etat pour investiguer sans logs de contenu utilisateur.
- [ ] AC8: Les tests cibles Dart/Kotlin couvrent au minimum permission refusee, champ sensible, import overlay, et statut runtime non prouve/fallback.
- [ ] AC9: La verification Android externe prouve au moins un scenario overlay hors app, un scenario IME, et un scenario champ sensible.

# Test Strategy

- Tests Dart:
  - `TranscriptionDraft` et import store pour `source=overlay` / `source=keyboard`
  - consommation des events overlay via `AndroidOverlayBridge.drainEvents()`
  - non-duplication lors des refresh/imports automatiques
- Tests Kotlin:
  - `OverlayTextInjectionHelper` policy sensitive/non-sensitive
  - `KeyboardVoiceController` permission/start/fallback truthfulness
  - `MainActivity` status map et command refusal semantics
- Verification Flutter:
  - `flutter analyze`
  - `flutter test`
- Verification Android externe:
  - workflow GitHub Actions Android
  - QA device Diane sur overlay, IME, et champs sensibles
- Observabilite:
  - verifier que la surface diagnostics/copy logs ne divulgue ni texte dicte, ni clipboard, ni secret

# Risks

- Le chantier peut forcer une decision produit entre "implementer vraiment le local runtime maintenant" et "declasser explicitement la promesse locale" si le moteur natif reste trop immature.
- La policy clipboard plus stricte peut casser des attentes implicites si certaines surfaces comptaient sur une copie automatique silencieuse.
- Le raccordement overlay -> store peut exposer une dette plus large dans le pipeline voix Flutter si aucun recorder overlay reel n'est encore present.
- L'arbitration micro unique peut reveler des collisions plus profondes entre IME, overlay et futures surfaces voix.

# Execution Notes

- Cette spec n'annule pas les deux specs dependantes; elle les aligne sur un contrat fonctionnel et securitaire commun.
- Ordre de lecture obligatoire avant implementation:
  - `shipglows_data/workflow/specs/android-micro-transcription-pipeline-hardening.md`
  - `shipglows_data/workflow/specs/android-overlay-flutter-parity-repair.md`
  - `shipglows_data/workflow/specs/asr-local-runtime-engine-integration.md`
  - `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt`
  - `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/OverlayTextInjectionHelper.kt`
  - `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardVoiceController.kt`
  - `lib/core/platform/android_overlay_bridge.dart`
  - `lib/features/voice/presentation/voice_screen.dart`
  - `lib/features/shell/presentation/app_shell_screen.dart`
- Ordre d'implementation obligatoire:
  1. corriger la fuite clipboard sur champ sensible
  2. corriger les faux demarrages/etats micro
  3. raccorder `overlay -> transcription store`
  4. declasser explicitement le runtime local non prouve
  5. ajouter le refus de concurrence IME/overlay
  6. finaliser diagnostics et preuve
- Stop conditions:
  - arreter le chantier si une solution proposee recopie du texte sensible dans clipboard ou logs;
  - arreter si un changement pretend activer un runtime local reel sans moteur natif prouve;
  - arreter si la concurrence IME/overlay est resolue par preemption implicite au lieu d'un refus explicite;
  - arreter si la preuve Android reelle est remplacee par une preuve Flutter/web seulement.
- Toute preuve de completion devra distinguer ce qui est prouve sur Flutter partage et ce qui depend encore d'Android natif reel.

# Open Questions

None at spec time. La decision produit la plus sensible est deja cadree: pas de promesse locale active tant que le moteur local Android n'est pas prouve end-to-end, et pas de copie clipboard automatique sur champ sensible.

# Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-06-12 12:57:00 UTC | 100-sf-spec | GPT-5 Codex | Created android-micro-transcription-pipeline-hardening.md from the 2026-06-12 code audit findings and existing ASR/overlay specs. | Draft initialized for cross-cutting Android micro/transcription hardening. | /101-sf-ready shipglows_data/workflow/specs/android-micro-transcription-pipeline-hardening.md |
| 2026-06-12 13:02:00 UTC | 101-sf-ready | GPT-5 Codex | Reviewed readiness of android-micro-transcription-pipeline-hardening.md against structure, proof contract, adversarial gaps, and execution clarity. | Not ready: proof contract and execution notes still leave blocking ambiguity for a fresh implementation agent. | /100-sf-spec android-micro-transcription-pipeline-hardening |
| 2026-06-12 13:06:00 UTC | 100-sf-spec | GPT-5 Codex | Updated the spec with explicit operator decisions on local runtime truthfulness, sensitive-field clipboard policy, session arbitration, proof checklist, and implementation order. | Reviewed draft tightened for a second readiness pass. | /101-sf-ready shipglows_data/workflow/specs/android-micro-transcription-pipeline-hardening.md |
| 2026-06-12 13:12:00 UTC | 101-sf-ready | GPT-5 Codex | Re-reviewed readiness after explicit product decisions, proof-contract completion, and checklist creation. | Ready: the spec now provides a safe implementation contract, ordered proof path, and blocking security decisions. | /102-sf-start shipglows_data/workflow/specs/android-micro-transcription-pipeline-hardening.md |
| 2026-06-12 13:25:22 UTC | 001-sf-build | GPT-5 Codex | Orchestrated delegated sequential build through implementation, local verification, and pre-ship closure stop as requested. | Partial: local implementation and Flutter proof completed, but Android CI/device proof and ship remain pending. | /107-sf-test shipglows_data/workflow/test-checklists/android-micro-transcription-pipeline-hardening.md |
| 2026-06-12 13:25:22 UTC | 102-sf-start | GPT-5 Codex | Hardened Android microphone/transcription flows across overlay delivery, session arbitration, runtime truthfulness, and Flutter overlay import wiring. | Implemented: code, docs, and targeted Flutter checks completed; Android-native proof remains for verify. | /103-sf-verify shipglows_data/workflow/specs/android-micro-transcription-pipeline-hardening.md |
| 2026-06-12 13:25:22 UTC | 103-sf-verify | GPT-5 Codex | Verified local implementation against the spec with `flutter analyze` and targeted `flutter test` coverage. | Partial: Flutter proof passed, but Kotlin unit tests were not run locally and Android CI/device checklist evidence is still missing. | /107-sf-test shipglows_data/workflow/test-checklists/android-micro-transcription-pipeline-hardening.md |
| 2026-06-12 13:25:22 UTC | 104-sf-end | GPT-5 Codex | Stopped after end before ship, per operator request, without commit/push or stronger closure claims than the current proof allows. | Deferred: chantier bookkeeping updated, but final closure awaits Android CI/device proof and ship decision. | /107-sf-test shipglows_data/workflow/test-checklists/android-micro-transcription-pipeline-hardening.md |
| 2026-06-12 15:33:32 UTC | 106-sf-fix | GPT-5 Codex | Fixed the post-hardening Android overlay start regression by restoring runtime microphone permission request flow and clearing ghost overlay session locks when native startup fails before the widget appears. | Fix attempted: local Flutter checks passed and durable bug memory was created in `BUG-2026-06-12-002`, but Android device proof is still required. | /107-sf-test |
| 2026-06-12 15:41:39 UTC | 106-sf-fix | GPT-5 Codex | Improved the Android IME microphone-permission denial UX by adding a blocked mic state in the native keyboard view, red error status feedback, and a direct route to microphone onboarding. | Fix attempted: local Flutter checks passed and durable bug memory was created in `BUG-2026-06-12-003`, but Android device proof is still required. | /107-sf-test |

# Current Chantier Flow

- `100-sf-spec`: done - spec created to unify functional truthfulness, safe delivery, and end-to-end persistence across IME and overlay voice flows.
- `101-sf-ready`: ready - proof contract, execution order, and blocking product decisions are now explicit.
- `102-sf-start`: implemented - overlay delivery policy, microphone session arbitration, fallback truthfulness, and overlay-to-store imports were wired locally with updated docs/tests.
- `103-sf-verify`: partial - `flutter analyze` and targeted `flutter test` passed, but Android-native proof remains pending through Kotlin/CI/device surfaces.
- `104-sf-end`: deferred - the session stopped before ship, with no commit/push and no bookkeeping claim beyond the current partial verification state.
- `005-sf-ship`: not started.
