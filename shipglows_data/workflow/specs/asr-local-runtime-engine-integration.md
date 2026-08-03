---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "0.1.0"
project: "winglowz_app"
created: "2026-05-18"
created_at: "2026-05-18 00:00:00 UTC"
updated: "2026-05-18"
updated_at: "2026-05-18 00:00:00 UTC"
status: draft
source_skill: sf-spec
source_model: "GPT-5 Codex"
scope: "implementation"
owner: "Diane"
confidence: medium
user_story: "En tant qu'utilisatrice WinGlowz, je veux une dictée locale fiable dans le clavier Android afin de dicter sans appel serveur implicite."
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Android IME keyboard"
  - "flutter_voice settings UI"
  - "On-device ASR local runtime"
  - "Diagnostics and telemetry"
  - "Native method channel"
depends_on:
  - artifact: "shipglows_data/workflow/specs/asr-language-pack-catalog.md"
    artifact_version: "0.1.0"
    required_status: "ready"
  - artifact: "shipglows_data/workflow/specs/on-device-asr-free-options-research.md"
    artifact_version: "1.0.0"
    required_status: "active"
  - artifact: "shipglows_data/workflow/specs/keyboard-action-bar-voice-recording.md"
    artifact_version: "1.0.0"
    required_status: "active"
supersedes: []
evidence:
  - "Catalog runtime contract exists and currently provides local/Android fallback state transitions with stubbed local engine linkage."
  - "Local runtime timeout and fallback_reason semantics are implemented in provider state."
  - "Current bridge path already carries voice pack configuration and pack artifact path."
next_step: "/102-sg-start shipglows_data/workflow/specs/asr-local-runtime-engine-integration.md"

---

# Title

ASR Local Runtime Engine Integration

# Status

Draft. This is the implementation spec to replace the current placeholder local-runtime behavior with a real on-device recognizer path in Android IME, while preserving current fallback semantics and diagnostics.

# User Story

En tant qu'utilisatrice WinGlows, je veux que la dictée clavier utilise vraiment un moteur ASR local quand un pack est installé et valide, pour pouvoir dicter sans appel serveur implicite et sans interruption silencieuse.

Acteur principal: utilisatrice Android WinGlows utilisant le clavier.
Acteurs secondaires: produit, support, infrastructure QA.

# Minimal Behavior Contract

Le runtime doit charger et exécuter un moteur local réel à partir d’un chemin de modèle déjà installé dans le store WinGlows, produire la transcription en local, puis revenir de manière explicite au fallback système si le chargement, l’initialisation ou la reconnaissance locale échouent.

Quand un pack est absent, invalide, invalide côté licence/ABI/RAM/disque, ou si le runtime local ne peut pas démarrer, le clavier doit exposer un fallback explicite (Android SpeechRecognizer ou cloud selon paramètre utilisateur).

# Success Behavior

- Given un pack `sherpa_onnx` installé et vérifié, when l'utilisatrice démarre la dictée clavier, then le runtime local doit monter en moins de `10s`, produire des résultats initiaux partiels puis finaux, et rapporter `runtime_mode=local` + `pack_id` + `engine`.
- Given `AudioRecord` indisponible ou permission refusée, then le système doit basculer proprement sur fallback avec `fallback_reason=runtime_load_failed` et explication UI.
- Given chargement modèle trop long ou plantage runtime, then le système bascule vers fallback explicite sans boucle infinie et avec `fallback_reason=runtime_timeout` / `runtime_load_failed` approprié.
- Given arrêt manuel (stop/pause/cancel), then le moteur local se stoppe proprement, l’état revient à `available`/`unavailable` côté diagnostic et aucune capture fantôme ne continue.

# In Scope

- Intégration native réelle Android d’au moins un runtime local (`sherpa_onnx`) et sa dépendance.
- Gestion du runtime local de bout en bout dans `KeyboardVoiceController` (init, stream, stop, cancel, timeout, erreurs).
- Gestion du format de pack attendu par le moteur local (dossier modèle + manifest local minimal).
- Mapping d’erreur local vers diagnostics Flutter contractuels.
- Tests unitaires natifs et Flutter ciblés sur transitions local/fallback.
- Tests de smoke Android réels (au moins 2 appareils: low-end et mid-range).

# Out of Scope

- Choix final de la grille de modèles commerciaux toutes langues (reste à la spec catalogue).
- Construction d’un vrai download manager cloud (les artefacts existent déjà comme prérequis).
- Benchmark de toutes les langues de marché (reste à la spec benchmark/research).
- iOS/desktop.

# Data Contract Extensions

`LanguagePackCatalogEntry` et `InstalledLanguagePack` reçoivent les contraintes d’exécution suivantes déjà existantes:

- `engine` peut valider local runtime réel (`sherpa_onnx`, `whisper_cpp`, `vosk`, `android_speech_recognizer`).
- `model_artifact_path` (côté natif/Flutter bridge) doit pointer un dossier de modèle existant et validé.
- `runtime_mode` conserve les valeurs: `local`, `android_fallback`, `cloud_fallback`, `unavailable`.
- `fallback_reason` conserve les valeurs: `missing_pack`, `runtime_load_failed`, `runtime_timeout`, `unsupported_language`, `user_disabled_cloud`.

Champs d’exécution additionnels proposés (Natifs):

- `model_runtime_profile` : objet résumant `format` (`onnx`, `ncnn`, `tflite`), `sample_rate_hz`, `frame_ms`, `chunk_ms`.
- `local_runtime_ready` : booléen `true` si moteur+modèle chargés.
- `model_load_ms` : durée de chargement modèle (entier en ms).
- `warm_cache_ms` : précharge audio/feature warm-up optionnel.

# Architecture

## Runtime abstraction

Créer une couche d’abstraction minimale dans `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime`:

- `KeyboardVoiceEngine` interface
  - `start(config: LocalRuntimeConfig): StartResult`
  - `feedPcmFrame(frame: ByteArray)`
  - `stop()`
  - `cancel()`
  - `getState()`
- `KeyboardVoiceLocalEngine` implémentation `sherpa` (au départ).
- `KeyboardVoiceFallbackEngine` existante `SpeechRecognizer` conservée.

### Contrat de transition

- `start` renvoie `LOCAL_STARTED` seulement après chargement initial non bloquant validé.
- Pendant chargement: état `local_loading`.
- Sur erreurs de path/modèle: `sherpa_engine_not_linked`, `local_model_path_missing`, `local_model_path_invalid`, `local_runtime_init_failed`.
- Sur timeout 10s: bascule automatique vers fallback explicit avec `fallback_reason=runtime_timeout`.

## Chemin audio

- Utiliser flux PCM direct via `AudioRecord` (même logique que voix existante) pour éviter dépendance à `SpeechRecognizer` quand en mode local.
- Convertir en format attendu par le moteur (généralement mono 16-bit PCM 16k).
- Traiter en thread dédié avec priorisation audio/IO minimale.
- Pas de travail lourd sur le thread IME/UI.

## Chargement modèle

- Validation stricte du dossier `modelArtifactPath`:
  - dossier existant.
  - fichiers attendus présents (ex: `model.onnx`, `tokens.txt`, `bpe.model`, etc. selon moteur).
  - version/compatibilité détectable depuis `model_version`.
- Initialiser moteur avec timeout contrôlé (`10s`) et journal `model_load_ms`.
- Si le runtime n'est pas intégré (lib absente), retourner `sherpa_engine_not_linked`.

## Lifecycle

- `startLocalRuntime`:
  1. stop() précédent si nécessaire.
  2. valider pack/modèle.
  3. charger moteur en tâche de fond.
  4. démarrer capture audio + feed frames.
  5. publier status `local_loading` puis `local_active`.
- `stop`:
  1. signaler fin propre au moteur
  2. stopper capture
  3. libérer resources JNI/audio
  4. état fallback/unavailable.
- `cancel` idem `stop` sans produire résultat.

# Error Mapping

Erreurs natives à exposer explicitement au niveau statut:

- `sherpa_engine_not_linked` -> `fallback_reason=runtime_load_failed`, `runtime_mode=android_fallback`.
- `local_model_path_missing` -> `fallback_reason=missing_pack`, `runtime_mode=android_fallback`.
- `local_model_path_invalid` -> `fallback_reason=unsupported_language` tant que validité local invalide.
- `local_runtime_init_failed` -> `fallback_reason=runtime_load_failed`.
- `local_runtime_timeout` -> `fallback_reason=runtime_timeout`.
- `local_audio_capture_error` -> `fallback_reason=runtime_load_failed`.

Tous les échecs doivent être récupérables et persister `last_error_code`/`fallback_reason` dans le statut existant (sans secret, sans chemin complet, sans audio).

# Performance and Resource Constraints

- Ne jamais bloquer l’IME au-delà de 50ms de délai de frame côté UI.
- Initialisation modèle doit se faire hors UI thread.
- Timeout strict 10s sur `startLocalRuntimePath` + `startSpeech` local.
- Stop propre des threads quand l’app est détruite.
- Nettoyage mémoire: au maximum, libérer buffers récents quand l’inactivité dépasse seuil court.

# Security and Privacy

- Aucun envoi vers cloud tant qu’un succès local est en cours.
- Ne pas persister chemin local complet dans logs UI/diagnostic.
- Le fallback cloud n’est utilisable qu’après consentement explicite `allow_cloud_fallback=true`.
- Les logs diagnostic contiennent uniquement metadata technique stable.

# Implementation Tasks

- Tâche A : Intégrer la dépendance runtime locale
  - Ajouter le binding Android/NDK/ABI nécessaire pour `sherpa-onnx` (ou moteur choisi).
  - Vérifier résolution gradle/caches avant runtime branch.

- Tâche B : Formaliser l’interface runtime
  - Ajouter interface Kotlin: `KeyboardVoiceEngine` + états/erreurs.
  - Ajouter adapter pour fallback actuel (`SpeechRecognizer`) et local (`sherpa_onnx`).

- Tâche C : Implémenter le path local dans `KeyboardVoiceController`
  - Ajouter `startLocalRuntime`, `feedAudioChunk`, arrêt propre, timeout, et mapping d’erreur.
  - Conserver l’émission `runtimeStateOverride = local_loading` / `local_active` et fallback explicit.

- Tâche D : Normaliser le pack artifact schema
  - Définir contrat dossier `manifest.json` ou dossier modèle minimal.
  - Ajouter validation stricte dans `KeyboardLocalRuntimePath` (existence, fichiers minimaux, compat).

- Tâche E : Brancher le bridge Flutter <-> Android
  - Assurer transmission `engine` + `model_artifact_path` + runtime status local détaillé.
  - Mémoriser erreurs de runtime dans `AndroidKeyboardStatus`.

- Tâche F : Tests natifs + Flutter
  - Unit tests Kotlin: start/stop/timeout/error mapping pour path local.
  - Unit tests Dart: parsing status/runtime mode + fallback reasons.
  - Widget/manual for settings diagnostics.

- Tâche G : Validation Android réelle
  - Smoke tests sur appareil low-end + mid-range:
    - premier micro sans pack,
    - pack installé/chargé local,
    - path invalide,
    - timeout local,
    - stop/cancel.

# Acceptance Criteria

- [ ] AC 1 : Avec un pack `sherpa_onnx` valide, l’utilisateur obtient des résultats locaux sans intervention cloud pour une phrase de 5-10 mots sur un appareil compatible.
- [ ] AC 2 : `local` démarre en moins de 10s sur appareils mid-range (`sherpa_onnx`) avec résultats partiels observables.
- [ ] AC 3 : Quand `sherpa_engine_not_linked`, le statut devient `android_fallback` et `fallback_reason=runtime_load_failed`.
- [ ] AC 4 : Quand `local_model_path_missing`, statut `android_fallback` et `fallback_reason=missing_pack`.
- [ ] AC 5 : Quand `runtime_timeout`, la bascule fallback est explicite (`runtime_mode=android_fallback` + `fallback_reason=runtime_timeout`), avec aucun crash et sans retry infini.
- [ ] AC 6 : Stop, pause et cancel laissent l’état stable, libèrent audio, et ne relancent pas spontanément la capture.
- [ ] AC 7 : Tous les retours de statut respectent la convention sans révéler secrets/audio/chemins complets.
- [ ] AC 8 : Les tests unitaires ciblés passent en Flutter + tests Kotlin sans dépendance réseau.
- [ ] AC 9 : Manuels: le même scénario produit le même state machine sur low-end et mid-range (pas de branchement silencieux cloud).

# Test Strategy

- Unitaires Dart:
  - Parsing/normalisation statut local/fallback.
  - Gestion event queue et persistence des erreurs.
- Unitaires Kotlin:
  - `KeyboardVoiceController` + abstraction engine sur timeouts,
  - validation du pack path,
  - transitions state local/fallback.
- Smoke manuel Android:
  - low-end: `local_loading -> timeout/fallback`, fallback UI lisible,
  - mid-range: local path réel.
- Observabilité:
  - capture des états runtime_mode/fallback_reason par scénario test.

# Risks

- Intégration ABI/NDK de runtime peut retarder si libs natives trop lourdes.
- Variabilité latence/parole sur appareils très bas de gamme.
- Taille modèle initiale peut dépasser budget batterie/mémoire.
- Cas i18n non benchmarkés par langue peuvent induire faux positifs en support marketing.

# Documentation Coherence

- Mettre à jour `shipglows_data/workflow/specs/asr-language-pack-catalog.md`:
  - pointer que le contrat catalogue est maintenant exécuté par une implémentation réelle.
  - marquer CA runtime dépendantes de cette spec comme implémentées quand validées.
- Mettre à jour la matrice `on-device-asr-free-options-research.md` quand un moteur passe `candidate`.

# Open Questions

- Le premier moteur à stabiliser est-il uniquement `sherpa_onnx` ou aussi `whisper_cpp` en parallèle ?
- Quel seuil de latence réelle (ms pour premier token partiel) est commercialement acceptable par langue/device class ?
- Quel budget mémoire max est acceptable par pack installé côté bas de gamme ?

# Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|---|---|---|---|---|---|
| 2026-05-18 12:00:00 UTC | sf-spec | GPT-5 Codex | Created asr-local-runtime-engine-integration.md | Draft initialized for real local runtime engineering | sf-ready asr-local-runtime-engine-integration.md |

# Current Chantier Flow

- `sf-spec`: done - this document captures the execution scope left to make local runtime real.
- `sf-ready`: pending - await readiness validation of architecture, dependency, and integration risk.
- `sf-start`: not started.
- `sf-verify`: not started.
- `sf-end`: not started.
