---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "winglowz_app"
created: "2026-05-14"
created_at: "2026-05-14 22:30:00 UTC"
updated: "2026-05-22"
updated_at: "2026-05-22 10:10:29 UTC"
status: ready
source_skill: sf-spec
source_model: "GPT-5 Codex"
scope: "feature"
owner: "Diane"
confidence: medium
user_story: "En tant qu'utilisatrice WinGlows qui veut dicter dans sa langue depuis le clavier Android, je veux installer seulement les packs vocaux locaux dont j'ai besoin et comprendre clairement le fallback disponible, afin d'utiliser la dictée sans coût serveur implicite ni promesse trompeuse."
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Android IME keyboard"
  - "Flutter Settings"
  - "On-device ASR runtime"
  - "Diagnostics"
  - "Local storage"
  - "Optional cloud fallback"
depends_on:
  - artifact: "shipglows_data/workflow/specs/keyboard-action-bar-voice-recording.md"
    artifact_version: "1.0.0"
    required_status: "active"
  - artifact: "shipglows_data/workflow/specs/on-device-asr-free-options-research.md"
    artifact_version: "1.0.0"
    required_status: "active"
  - artifact: "shipglows_data/workflow/specs/local-first-user-owned-sync-strategy.md"
    artifact_version: "0.1.0"
    required_status: "draft"
  - artifact: "shipglows_data/business/business.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/business/gtm.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/architecture.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
supersedes: []
evidence:
  - "User decision 2026-05-14: keyboard becomes primary voice UI; overlay stays optional."
  - "User decision 2026-05-14: local device resources should be used instead of WinGlows workers whenever possible."
  - "User decision 2026-05-14: global LTD buyers require install-on-demand language packs rather than French/English-only assumptions."
  - "User decision 2026-05-14: do not bundle all models in the APK; downloading after install is preferred."
  - "Current code already includes Android IME voice capture through KeyboardVoiceController using Android SpeechRecognizer, proving a fallback path exists but not a local-model catalog."
  - "Current code already exposes Settings and diagnostics surfaces for keyboard and overlay status, which can host pack-management state."
next_step: "/sf-ship BUG-2026-05-20-001 BUG-2026-05-19-002"
---

# Title

ASR Language Pack Catalog

# Status

Ready. This spec defines the product and implementation contract for downloadable on-device ASR language packs used by the WinGlows Android keyboard. It exists to turn the current high-level local-first direction into a concrete catalog, installation, fallback, diagnostics, and benchmarking plan that an implementation agent can execute without inventing policy later.

# User Story

En tant qu'utilisatrice WinGlows qui veut dicter dans sa langue depuis le clavier Android, je veux installer seulement les packs vocaux locaux dont j'ai besoin et comprendre clairement le fallback disponible, afin d'utiliser la dictée sans coût serveur implicite ni promesse trompeuse.

Acteur principal: utilisatrice Android qui dicte depuis le clavier WinGlows.

Acteurs secondaires: fondatrice WinGlows, futur support client, utilisateur LTD international, moteur ASR local choisi, fallback Android SpeechRecognizer, fallback cloud explicite.

Déclencheurs principaux:

- l'utilisatrice appuie sur le bouton micro du clavier sans pack local installé;
- l'utilisatrice ouvre Settings pour gérer les langues vocales;
- le système détecte une langue clavier/système sans pack local installé;
- un pack devient obsolète, incompatible, corrompu ou trop lourd pour l'appareil;
- le marketing veut publier une promesse de support langue pour le lancement LTD.

Résultat observable attendu: WinGlows liste des packs de langue installables avec métadonnées fiables, permet de télécharger/supprimer/mettre à jour un pack, choisit un moteur local compatible quand il existe, et montre un fallback explicite quand le local n'est pas disponible.

# Minimal Behavior Contract

Quand l'utilisatrice veut dicter depuis le clavier, WinGlows doit pouvoir lui proposer un pack vocal local compatible avec sa langue, le télécharger et l'utiliser sur l'appareil sans passer par un worker WinGlows par défaut; si aucun pack local compatible n'existe, n'est pas installé, échoue au chargement ou n'est pas supporté par l'appareil, l'app doit afficher un fallback explicite et récupérable plutôt qu'un échec silencieux. Le résultat observable est soit une dictée locale active avec moteur et langue identifiés, soit un statut clair indiquant l'installation, l'incompatibilité ou le mode fallback. L'edge case le plus facile à rater est le cas où la langue système semble supportée mais le pack choisi est trop lourd ou incompatible avec l'ABI/RAM de l'appareil: l'app doit alors refuser proprement le mode local au lieu de promettre une langue "supportée" qui ne marche pas sur le terminal réel.

# Success Behavior

- Given l'utilisatrice ouvre la section "On-device speech" dans Settings, when le catalogue est chargé, then elle voit les packs classés par langue avec moteur, taille, licence, niveau qualité, statut offline et politique fallback.
- Given aucun pack local n'est installé pour la langue active, when l'utilisatrice touche le micro clavier, then WinGlows propose soit l'installation du pack recommandé, soit un fallback explicite si aucun pack local recommandé n'existe.
- Given un pack compatible est installé et vérifié, when l'utilisatrice dicte depuis le clavier, then le moteur local démarre sans ouvrir l'overlay ni une UI Flutter intermédiaire et le diagnostic identifie le pack, le moteur et la source `keyboard`.
- Given un pack téléchargé à 100% avec checksum valide, when l'installation se termine, then le pack apparaît comme `installed` avec taille disque, version et date d'installation persistantes.
- Given une mise à jour de pack est publiée dans le catalogue, when l'utilisatrice consulte Settings, then l'UI signale qu'une update existe sans forcer l'installation immédiate.
- Given plusieurs packs existent pour une même langue, when WinGlows choisit le pack par défaut, then le choix suit un ordre déterministe basé sur compatibilité appareil, niveau qualité et politique produit.
- Given une langue n'a pas de pack local prêt à recommander, when le support produit ou le GTM consulte la matrice des langues, then la langue est marquée `experimental` ou `fallbackOnly` et non vendue comme offline vérifiée.

# Error Behavior

- Si le catalogue ne charge pas, l'UI doit afficher un état erreur récupérable avec action `Retry`; l'ancienne liste valide peut rester visible mais marquée stale.
- Si un téléchargement est interrompu, la progression doit rester observable et reprenable; aucun pack partiellement téléchargé ne doit être exposé comme `installed`.
- Si le checksum ou la signature d'un pack échoue, le fichier doit être rejeté, le statut doit passer à `failed_verification`, et aucun chargement moteur ne doit être tenté.
- Si l'appareil ne satisfait pas `minAndroidSdk`, `supportedAbis` ou `minRamMb`, l'installation doit être bloquée avec explication visible et fallback proposé.
- Si le preflight de capacite disque echoue, l'installation doit etre refusee avant download avec un message explicite (`required_mb`, `available_mb`) et un fallback propose.
- Si le moteur local ne peut pas charger le modèle installé, WinGlows doit journaliser l'échec, marquer la cause dans l'état natif persistant, puis proposer Android SpeechRecognizer ou le fallback configuré.
- Si le démarrage runtime local dépasse le timeout de chargement (`10s`), WinGlows doit basculer vers fallback explicite, persister `fallback_reason=runtime_timeout`, et ne pas boucler en retry infini.
- Si l'utilisatrice soumet plusieurs actions concurrentes (tap répété micro ou install), les commandes doivent être idempotentes: une seule transaction active par `pack_id`, les autres sont ignorées ou fusionnées avec feedback UI.
- Ce qui ne doit jamais arriver: lancement silencieux d'un worker WinGlows alors que l'utilisatrice pense etre en local, pack marque `recommended` sans licence commerciale verifiee, ou texte marketing annonçant un support langue offline non benchmarke.

# Problem

Le produit veut devenir keyboard-first et local-first, mais aujourd'hui il n'existe ni catalogue de packs ASR ni contrat unique pour dire quelles langues sont installables, quel moteur local les execute, comment les telecharger, ni quel fallback utiliser. Sans ce cadre, chaque langue risque de devenir un bricolage ad hoc, avec promesses marketing non tenables, support client flou, et depenses worker qui explosent des que les utilisateurs LTD internationaux commencent a dicter.

# Solution

Introduire un catalogue de packs de langue ASR versionne, telechargeable et gratuit, alimente par metadonnees produit verificables et consomme par deux surfaces: le clavier Android pour le choix runtime/fallback, et Settings pour l'installation/maintenance. Le catalogue doit separer clairement le statut marketing d'une langue, le statut technique d'un pack, la compatibilite appareil, et la politique fallback, afin que le produit puisse etendre sa couverture linguistique sans gonfler l'APK ni mentir sur la qualite offline.

# Data Contract

`LanguagePackCatalogEntry` doit exposer les champs obligatoires suivants:

- `pack_id`: identifiant stable unique, format lowercase `engine.language.region.variant.version` sans espace.
- `language_tag`: tag BCP-47 normalise (`fr-FR`, `en-US`, `hi-IN`), distinct de la langue UI.
- `display_name`: libelle user-facing localise ou fallback anglais.
- `engine`: enum stable (`android_speech_recognizer`, `sherpa_onnx`, `whisper_cpp`, `vosk`, `cloud_fallback`, `unavailable`).
- `engine_version`: version moteur ou `unknown` si le fallback systeme Android ne l'expose pas.
- `model_version`: version modele ou `none` pour fallback systeme/cloud sans artefact local.
- `quality_tier`: enum `recommended`, `standard`, `experimental`, `fallbackOnly`.
- `runtime_mode`: enum `local`, `android_fallback`, `cloud_fallback`, `unavailable`.
- `fallback_policy`: enum `prefer_local`, `android_then_cloud_auto`, `cloud_auto_only`, `unavailable`.
- `download_url`: URL HTTPS ou `none` si aucun artefact local n'est telechargeable.
- `download_size_mb`: entier positif ou `0` si aucun artefact local.
- `installed_size_mb`: entier positif ou `0` si aucun artefact local.
- `sha256`: checksum hex lowercase obligatoire pour tout artefact local, `none` sinon.
- `signature`: signature ou reference de signature obligatoire pour tout artefact local, `none` sinon.
- `license_id`: identifiant de licence; ne peut pas etre `unknown` pour un pack `recommended`.
- `commercial_distribution_allowed`: booleen; doit etre `true` pour tout pack `recommended`.
- `min_android_sdk`, `supported_abis`, `min_ram_mb`, `requires_streaming`, `supports_offline`: champs de compatibilite obligatoires.
- `benchmark_status`: enum `unbenchmarked`, `candidate`, `benchmarking`, `passed`, `failed`.
- `benchmark_evidence`: chemin doc local ou `none`; obligatoire et non-`none` pour `recommended`.
- `updated_at`: timestamp UTC ISO-8601 du catalogue.

`InstalledLanguagePack` doit exposer les champs obligatoires suivants:

- `pack_id`, `language_tag`, `engine`, `model_version`.
- `install_state`: enum `not_installed`, `queued`, `downloading`, `paused_insufficient_storage`, `verifying`, `installed`, `update_available`, `failed_download`, `failed_verification`, `blocked_incompatible_device`, `blocked_insufficient_storage`, `corrupted`, `removed`.
- `runtime_mode`: enum `local`, `android_fallback`, `cloud_fallback`, `unavailable`.
- `fallback_reason`: enum `none`, `missing_pack`, `incompatible_device`, `insufficient_storage`, `runtime_load_failed`, `runtime_timeout`, `verification_failed`, `unsupported_language`, `cloud_auto_policy`, `user_disabled_cloud`.
- `download_progress`: entier `0..100`.
- `installed_size_mb`, `required_mb`, `available_mb`.
- `checksum_verified`: booleen.
- `installed_at`, `last_verified_at`, `last_error_at`: timestamps UTC ISO-8601 ou `none`.
- `last_error_code`: code stable ou `none`; ne contient jamais de secret, audio, transcription brute ni chemin local complet.

# Scope In

- Definir le format `LanguagePackCatalogEntry` et l'etat `InstalledLanguagePack`.
- Definir la matrice de qualite et de readiness des langues: `recommended`, `standard`, `experimental`, `fallbackOnly`.
- Definir la politique d'installation: apres install app, au premier micro, ou depuis Settings.
- Definir la politique de fallback: local, Android SpeechRecognizer, cloud explicite (mode auto), ou indisponible.
- Definir les controles de compatibilite appareil: SDK, ABI, RAM, taille, support streaming.
- Definir les etats de telechargement, verification, installation, suppression, mise a jour et corruption.
- Definir les diagnostics minimaux cote Flutter et natif.
- Definir le protocole de benchmark qui autorise une langue a passer `recommended`.
- Definir la coherence documentaire et GTM autour des promesses de support langue.

# Scope Out

- Implementer le runtime ASR lui-meme dans cette spec.
- Choisir definitivement entre `sherpa-onnx`, `whisper.cpp`, Vosk ou autre pour toutes les langues avant benchmark.
- Construire un marketplace payant de packs.
- Embarquer tous les modeles dans l'APK.
- Traiter iOS, desktop ou web dans cette premiere spec.
- Promettre un support offline universel.

# Constraints

- Aucun modele ASR lourd ne doit etre bundle par defaut dans l'APK sans decision explicite ulterieure.
- Le catalogue est gratuit et ne doit pas utiliser de vocabulaire "marketplace" dans l'UI actuelle.
- Une langue ne peut etre marquee `recommended` que si le pack associe a passe benchmark qualite/perf/licence sur au moins un appareil representatif.
- Le clavier ne doit jamais perdre sa reactivite parce qu'un chargement modele bloque le thread UI.
- Le produit doit utiliser les ressources du telephone avant tout worker WinGlows quand un pack local compatible est installe.
- Aucun fallback cloud ne doit etre silencieux; l'utilisatrice doit comprendre quel mode elle utilise.
- Le fallback cloud est autorise en mode auto apres echec local ou indisponibilite locale, mais seulement si l'utilisatrice a active le parametre `allow_cloud_fallback`.
- Avant toute capture susceptible d'utiliser le cloud, l'UI doit afficher le mode actif `cloud_fallback`; apres capture, les diagnostics doivent conserver `runtime_mode=cloud_fallback` et `fallback_reason=cloud_auto_policy`.
- Si `allow_cloud_fallback=false`, un echec local ou Android fallback doit aboutir a un etat recuperable `unavailable`, jamais a un envoi cloud.
- Donnees cloud autorisees: uniquement l'audio necessaire a la transcription et les metadonnees minimales `language_tag`, `engine`, `runtime_mode`, `fallback_reason`; aucune cle API utilisateur, aucun chemin local, aucun pack checksum complet, aucun texte de diagnostic verbeux ne doit etre transmis.
- Logs cloud interdits: audio brut, transcription brute avant affichage utilisatrice, cle API, token, chemin local complet, identifiant appareil persistant non necessaire.
- Le parametre `allow_cloud_fallback` doit etre modifiable dans Settings et son etat doit etre visible dans les diagnostics.
- Les retries automatiques doivent etre bornes et observables (pas de boucle infinie), avec un maximum de `3` retries automatiques par operation.
- Politique capacite disque (deterministe): un install preflight est autorise uniquement si `pack_size_mb <= 5%` de la capacite totale ET `free_space_mb >= max(3 * download_size_mb, installed_size_mb + 1536)`.
- Si le preflight espace disque echoue, l'etat doit devenir `blocked_insufficient_storage` avec l'espace requis et l'espace disponible visibles; aucun telechargement ne demarre.
- Si l'espace disque devient insuffisant en cours de telechargement, l'operation passe en `paused_insufficient_storage`, le fichier temporaire reste reprenable, et l'UI propose `Retry` apres liberation d'espace.
- Chaque transition d'etat doit etre idempotente.
- Les diagnostics ne doivent jamais contenir audio brut, cle API, token, ni chemin local complet sensible.
- Toute entree de catalogue non conforme au `Data Contract` doit etre rejetee avec etat recuperable `catalog_invalid_entry`; elle ne peut pas etre proposee a l'installation ni servir a un claim GTM.
- Les metadonnees de licence doivent faire partie du contrat de catalogue et pas d'une note externe ad hoc.
- Les claims publics AppSumo/LTD doivent etre derives des statuts du catalogue et non l'inverse.

# Dependencies

Code local et points d'ancrage:

- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzInputMethodService.kt`: point d'entree clavier natif, deja capable de dictee et d'insertion de texte.
- `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardVoiceController.kt`: implementation actuelle du fallback Android `SpeechRecognizer`, a transformer en facade moteur avec selection `local` ou `fallback`.
- `lib/core/platform/android_keyboard_bridge.dart`: pont Flutter vers l'IME, extension probable pour exposer statut packs et fallback.
- `lib/features/settings/presentation/settings_screen.dart`: surface existante pour exposer gestion overlay/clavier/diagnostics, cible pour la section "On-device speech".
- `lib/features/shell/presentation/app_shell_screen.dart`: onboarding Android et priorisation clavier/permissions; devra cesser de traiter la voix locale comme implicite.
- `lib/core/platform/android_overlay_bridge.dart`: exemple de bridge natif/Flutter avec statut detaille et diagnostics de reference.

Docs et artefacts locaux:

- `shipglows_data/workflow/specs/keyboard-action-bar-voice-recording.md`: position produit clavier principal, overlay optionnel, packs gratuits a la demande.
- `shipglows_data/workflow/specs/on-device-asr-free-options-research.md`: shortlist runtimes/modeles et recommandations de spike.
- `shipglows_data/workflow/specs/local-first-user-owned-sync-strategy.md`: cadre local-first global et exigence de packs telechargeables pour les acheteurs LTD internationaux.
- `shipglows_data/business/business.md`: promesse produit et contraintes de securite/serveur.
- `shipglows_data/business/gtm.md`: promesse publique sure et formulations a eviter.
- `shipglows_data/technical/architecture.md`: contrat backend-agnostic et pipeline voice local/advanced.

Fresh external docs:

- `fresh-docs not needed` pour ce draft, car la spec ne fige pas encore une API externe ni un SDK de telechargement; elle formalise d'abord les contrats internes a partir des recherches locales deja documentees le 2026-05-14.

# Invariants

- Le clavier reste l'interface primaire de dictee Android.
- L'overlay reste optionnel et independant du choix de pack.
- Le catalogue ne melange pas statut technique et promesse marketing.
- Un pack installe n'est utilisable que si son integrite et sa compatibilite appareil sont verifiees.
- Le mode runtime effectif doit toujours etre observable: `local`, `android_fallback`, `cloud_fallback`, `unavailable`.
- Pour un `pack_id` donne, il ne peut exister qu'une operation active a la fois (`download`, `verify`, `install`, `remove`).
- Une langue sans pack benchmarke ne peut pas etre vendue comme offline garantie.

# Links & Consequences

- Le choix d'un format de catalogue impacte l'IME natif, Settings Flutter, diagnostics, onboarding et support client.
- Le catalogue devient une source de verite transverse pour GTM et pour le comportement runtime; il faut donc eviter les copies de statuts en dur dans plusieurs couches.
- Le passage d'un pack a `recommended` a des consequences business directes sur les claims AppSumo/LTD.
- Les diagnostics backend et support devront inclure l'etat du pack pour expliquer un echec de dictee sans confondre micro, moteur, langue et permission.
- Le futur gestionnaire de telechargement devra stocker des artefacts potentiellement volumineux; la politique de suppression et de mise a jour doit donc rester visible pour eviter la saturation disque.

# Documentation Coherence

- Mettre a jour `shipglows_data/business/business.md` seulement si la taxonomie finale des niveaux de qualite change.
- Mettre a jour `shipglows_data/business/gtm.md` si la matrice MVP des langues modifie les promesses publiques ou les formulations de fallback.
- Aligner `shipglows_data/workflow/specs/keyboard-action-bar-voice-recording.md` quand le contrat de catalogue devient la reference implementation-ready pour le clavier.
- Ajouter une future doc support/FAQ expliquant: comment installer un pack, que signifie `fallbackOnly`, pourquoi une langue peut etre disponible sans etre offline locale, et comment supprimer un pack.

# Edge Cases

- L'utilisatrice a un clavier systeme en `en-IN` mais prefere dicter en hindi.
- Deux packs de meme langue existent, l'un leger mais mediocre, l'autre bon mais trop lourd pour un appareil low-end.
- Le pack est installe puis devient inutilisable apres update app ou manque d'espace disque.
- La langue est supportee localement sur `arm64-v8a` mais pas sur `armeabi-v7a`.
- L'utilisatrice supprime un pack alors qu'il est defini comme langue preferee.
- Le telechargement est coupe en plein milieu puis repris apres redemarrage.
- La langue existe seulement en fallback Android ou cloud et doit rester clairement marquee comme telle.

# Implementation Tasks

- [x] Tache 1 : Introduire le contrat de catalogue de packs de langue
  - Fichier : `lib/features/voice/domain/language_pack_catalog.dart`
  - Action : Creer les modeles Dart `LanguagePackCatalogEntry`, `InstalledLanguagePack`, enums de qualite, statut installation, mode offline et politique fallback, avec serialisation stable.
  - User story link : permet de representer les packs et leur fallback de facon explicite pour l'utilisatrice.
  - Depends on : none
  - Validate with : tests unitaires de mapping JSON/Map et comparaison de priorite.
  - Notes : utiliser des identifiants stables et une convention compatible avec un futur catalogue distant ou embarque.

- [x] Tache 2 : Ajouter un store/catalog provider local-first
  - Fichier : `lib/features/voice/application/language_pack_catalog_provider.dart`
  - Action : Definir le provider Riverpod et l'interface de chargement/rafraichissement du catalogue, avec etat `loading/success/error/stale`.
  - User story link : permet a Settings et au clavier de partager la meme source de verite.
  - Depends on : Tache 1
  - Validate with : tests de provider sur etats initiaux, erreur et rafraichissement.
  - Notes : ne pas faire dependre le domaine directement d'un transport reseau ou d'un SDK de download.

- [x] Tache 3 : Introduire l'etat natif de packs et du moteur vocal
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardVoiceController.kt`
  - Action : Refactorer le controleur actuel en facade moteur qui expose le runtime effectif, la langue active, le pack choisi, la derniere erreur moteur et les chemins `local` versus `android_fallback`.
  - User story link : garantit que la dictee clavier peut distinguer local et fallback.
  - Depends on : Tache 1
  - Validate with : tests natifs unitaires ou de logique sur selection moteur et fallback.
  - Notes : l'implementation locale concrete peut rester stubbee au debut, mais l'API interne doit etre definitive.

- [x] Tache 4 : Exposer le statut packs via le bridge Android clavier
  - Fichier : `lib/core/platform/android_keyboard_bridge.dart`
  - Action : Ajouter les structures et methodes de bridge pour lire le statut de packs, le mode runtime effectif et les actions d'installation/suppression si elles restent orchestrees cote Flutter.
  - User story link : rend le statut visible et actionnable dans l'app.
  - Depends on : Tache 3
  - Validate with : sanity check sur mapping des payloads MethodChannel.
  - Notes : suivre le style du bridge overlay existant pour les erreurs et le status summary.

- [x] Tache 5 : Ajouter la section "On-device speech" dans Settings
  - Fichier : `lib/features/settings/presentation/settings_screen.dart`
  - Action : Afficher packs installes/disponibles, taille, licence, niveau qualite, mise a jour, suppression et fallback configure.
  - User story link : permet a l'utilisatrice de gerer ses langues sans quitter l'app.
  - Depends on : Tache 2, Tache 4
  - Validate with : test widget ou verification manuelle structuree du rendu et des etats vides/erreur.
  - Notes : l'UI doit etre explicite sur ce qui est local, experimental, fallback-only ou indisponible.

- [x] Tache 6 : Etendre l'onboarding et le premier usage micro
  - Fichier : `lib/features/shell/presentation/app_shell_screen.dart`
  - Action : Inserer le prompt de pack recommande au premier usage micro et ajuster l'onboarding pour demander un pack local ou un fallback accepte, sans rendre l'overlay obligatoire.
  - User story link : evite l'effet "micro casse" lors du premier usage.
  - Depends on : Tache 2, Tache 5
  - Validate with : scenarios manuels premier lancement/premier micro/pas de pack compatible.
  - Notes : garder les transitions d'onboarding recuperables et diagnostiquables.

- [x] Tache 7 : Ajouter les diagnostics de catalogue et de runtime voix
  - Fichier : `lib/features/settings/presentation/settings_screen.dart`
  - Action : Etendre le diagnostic texte et les breadcrumbs pour inclure `pack_id`, `engine`, `quality_tier`, `runtime_mode`, `fallback_reason`, `install_state`.
  - User story link : permet de comprendre pourquoi une langue fonctionne ou non.
  - Depends on : Tache 4, Tache 5
  - Validate with : sanity check du texte diagnostic et des evenements en usage nominal et erreur.
  - Notes : ne jamais journaliser l'audio brut ni des chemins sensibles complets.

- [x] Tache 8 : Formaliser le protocole de benchmark et la matrice MVP langues
  - Fichier : `shipglows_data/workflow/specs/on-device-asr-free-options-research.md`
  - Action : Ajouter ou lier une grille normalisee de benchmark par langue/appareil et une matrice des premieres langues candidates au statut `candidate`, `benchmarking`, `recommended` ou `fallbackOnly`.
  - User story link : protege l'utilisatrice contre des promesses de support langue non verifiees.
  - Depends on : none
  - Validate with : revue documentaire et coherence avec GTM/business.
  - Notes : la matrice initiale peut couvrir `fr`, `en`, `es`, `de`, `pt`, `it`, `hi`, `ar`, `zh`, `ja`, `ko` sans toutes les vendre comme offline au depart.

# Acceptance Criteria

- [ ] CA 1 : Given Settings charge le catalogue, when au moins un pack est disponible, then chaque entree affiche langue, moteur, taille de telechargement, taille installee, licence, niveau qualite et fallback.
- [ ] CA 2 : Given aucun pack n'est installe pour la langue active, when l'utilisatrice touche le micro clavier, then WinGlows propose un pack recommande ou un fallback explicite, jamais un simple echec silencieux.
- [ ] CA 3 : Given un pack compatible est installe et valide, when la dictee commence depuis le clavier, then le runtime effectif est `local` et les diagnostics incluent `pack_id` et `engine`.
- [ ] CA 4 : Given un pack est incompatible avec l'appareil, when l'utilisatrice tente l'installation, then l'installation est refusee avec raison visible et fallback propose.
- [ ] CA 5 : Given un telechargement est interrompu, when l'app revient au premier plan ou relance l'installation, then l'etat reste recuperable et le pack n'apparait pas comme installe tant que la verification n'est pas finie.
- [ ] CA 6 : Given une langue n'a qu'un support `fallbackOnly`, when l'utilisatrice consulte Settings, then cette langue n'est pas presentee comme offline locale.
- [ ] CA 7 : Given un pack a une licence non validee pour distribution commerciale, when le catalogue est prepare pour shipping, then ce pack ne peut pas etre marque `recommended`.
- [ ] CA 8 : Given le GTM veut annoncer une langue en AppSumo/LTD, when la langue n'est pas benchmarkee localement, then la spec et la doc imposent une formulation fallback ou experimental au lieu d'une promesse offline.
- [ ] CA 9 : Given le runtime local depasse son timeout de demarrage (`10s`), when la tentative echoue, then l'app passe en fallback explicite, journalise `fallback_reason=runtime_timeout`, et n'effectue pas de retry infini.
- [ ] CA 10 : Given plusieurs actions concurrentes sont declenchees pour un meme `pack_id`, when l'execution est en cours, then une seule operation active est conservee et l'etat final reste coherent.
- [ ] CA 11 : Given un diagnostic voix est emis, when il est persiste ou affiche, then il contient uniquement des metadonnees techniques autorisees et jamais d'audio brut ni secret.
- [ ] CA 12 : Given une operation `download`, `verify`, `install` ou `remove` echoue, when la politique de reprise s'applique, then au plus `3` retries automatiques sont effectues avant un etat d'echec recuperable explicite.
- [ ] CA 13 : Given le local est indisponible ou echoue, when le fallback cloud auto est active, then l'UI affiche explicitement le mode `cloud_fallback`.
- [ ] CA 14 : Given `pack_size_mb > 5%` de la capacite totale OU `free_space_mb < max(3 * download_size_mb, installed_size_mb + 1536)`, when l'utilisatrice lance l'installation d'un pack, then le systeme refuse le demarrage avec `blocked_insufficient_storage`, affiche `required_mb` et `available_mb`, et n'ecrit aucun etat `downloading`.
- [ ] CA 15 : Given une entree catalogue manque un champ obligatoire du `Data Contract` ou contient un enum invalide, when le catalogue est charge, then cette entree est rejetee avec `catalog_invalid_entry` et n'apparait ni comme installable ni comme `recommended`.
- [ ] CA 16 : Given `allow_cloud_fallback=false`, when aucun runtime local ou Android fallback ne peut transcrire, then WinGlows affiche `unavailable` avec action de recuperation et n'envoie aucune donnee cloud.
- [ ] CA 17 : Given `allow_cloud_fallback=true` et le local est indisponible ou echoue, when le fallback cloud auto est utilise, then l'UI affiche `cloud_fallback`, les diagnostics exposent `fallback_reason=cloud_auto_policy`, et les logs excluent audio brut, transcription brute, secrets, tokens et chemins locaux complets.

# Test Strategy

- Tests unitaires Dart pour les modeles de catalogue, priorites de selection et mapping des statuts.
- Tests natifs de logique sur la facade `KeyboardVoiceController` pour la selection moteur et les raisons de fallback.
- Tests widget Flutter pour la section Settings "On-device speech" sur etats vide, loading, error, installed et update available.
- Verification manuelle Android sur au moins un appareil low-end et un appareil mid-range pour les flows: premier micro, installation pack, suppression, echec compatibilite, bascule fallback.
- Revue documentaire avant ship pour verifier que la matrice GTM n'annonce que des langues effectivement benchmarkees.

# Risks

- Risque produit: sur-promettre une couverture linguistique offline avant benchmark reel.
- Risque technique: choisir trop tot un moteur local qui ne tient pas les contraintes RAM/latence du clavier.
- Risque UX: rendre le premier usage micro trop complexe si le prompt d'installation est confus.
- Risque support: multiplier les etats implicites sans diagnostic lisible.
- Risque legal: promouvoir un pack dont la licence modele n'autorise pas clairement la distribution commerciale.

# Execution Notes

- Lire d'abord `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzInputMethodService.kt`, `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardVoiceController.kt`, `lib/core/platform/android_keyboard_bridge.dart`, `lib/features/settings/presentation/settings_screen.dart`, puis `shipglows_data/workflow/specs/on-device-asr-free-options-research.md`.
- Commencer par figer le contrat de donnees et les enums avant toute UI ou bridge MethodChannel.
- Reutiliser les patterns de statut/erreur de `android_overlay_bridge.dart` pour eviter un deuxieme langage de diagnostics.
- Garder le download manager et le runtime concret decouples: l'installation d'un pack ne doit pas forcer le choix d'un moteur unique dans le domaine.
- Commandes de validation minimales avant merge:
  - `flutter test lib/features/voice`
  - `flutter test lib/features/settings`
  - `./gradlew :app:testDebugUnitTest`
  - sanity manuelle Android: premier micro sans pack, install, retry, timeout runtime, fallback explicite, suppression pack.
- Stop condition: si le benchmark montre qu'aucun moteur local gratuit ne tient le niveau qualite/perf minimal pour une langue cible, la langue doit rester `fallbackOnly` et le GTM doit etre corrige au lieu de contourner le probleme par un worker silencieux.
- Language doctrine note: this artifact keeps stable English machine anchors (`Title`, `Status`, `Acceptance Criteria`, `Skill Run History`, `Current Chantier Flow`) while keeping user-facing explanatory prose in French, consistent with active project language.

# Open Questions

None.

# Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-05-14 22:30:00 UTC | sf-spec | GPT-5 Codex | Created `shipglows_data/workflow/specs/asr-language-pack-catalog.md` from keyboard-first local-ASR decisions and existing voice/on-device research. | Draft saved. | /sf-ready shipglows_data/workflow/specs/asr-language-pack-catalog.md |
| 2026-05-15 06:15:00 UTC | sf-spec | GPT-5 Codex | Applied corrective edits after readiness review: language doctrine fixes, timeout/retry/idempotence contract, validation commands, and `Open Questions` normalization. | Partial remediation done; product/security decisions still required. | /sf-spec ASR Language Pack Catalog |
| 2026-05-15 08:35:00 UTC | sf-spec | GPT-5 Codex | Applied user decisions: cloud fallback auto mode, local runtime timeout `10s`, retries cap `3`, and matching acceptance criteria updates. | Remaining blocker: disk-capacity policy thresholds still to be fixed in spec. | /sf-spec ASR Language Pack Catalog |
| 2026-05-15 09:05:00 UTC | sf-ready | GPT-5 Codex | Re-ran readiness gate on structure, metadata, behavior contract traceability, adversarial abuse cases, security posture, language doctrine, and documentation freshness obligations. | Not ready: internal contract language doctrine still inconsistent and disk-capacity/installability policy remains under-specified for deterministic implementation and verification. | /sf-spec ASR Language Pack Catalog |
| 2026-05-15 09:10:00 UTC | sf-spec | GPT-5 Codex | Resolved readiness blockers by adding deterministic storage policy (preflight threshold, blocked/paused states, explicit observable fields) and clarifying language doctrine handling for localized prose with English anchors. | Spec updated for readiness re-check. | /sf-ready shipglows_data/workflow/specs/asr-language-pack-catalog.md |
| 2026-05-15 18:04:26 UTC | sf-spec | GPT-5 Codex | Performed follow-up normalization pass: confirmed deterministic storage policy coverage in constraints/error/acceptance, cleaned trace consistency, and kept next step on readiness gate rerun. | Spec maintained in reviewed state, ready for `/sf-ready` rerun. | /sf-ready shipglows_data/workflow/specs/asr-language-pack-catalog.md |
| 2026-05-15 18:08:42 UTC | sf-build | GPT-5 Codex | Lifecycle orchestration requested (`termine`): performed chantier check and governance gate precheck; build could not proceed to implementation because readiness gate has not passed yet on the updated spec. | Rerouted to readiness rerun before any `sf-start/sf-verify/sf-end/sf-ship`. | /sf-ready shipglows_data/workflow/specs/asr-language-pack-catalog.md |
| 2026-05-15 18:30:02 UTC | sf-ready | GPT-5 Codex | Re-ran readiness gate after the latest spec corrections, checking structure, metadata, behavior contract traceability, adversarial failure modes, language doctrine, freshness obligations, and security posture. | Not ready: the pack data contract is still too implicit for deterministic implementation, and cloud fallback `auto` still lacks explicit consent/trust boundaries for secure execution. | /sf-spec ASR Language Pack Catalog |
| 2026-05-15 19:16:15 UTC | sf-ready | GPT-5 Codex | Re-ran readiness gate after storage-threshold update, checking structure, user-story traceability, data-contract determinism, adversarial bypasses, cloud fallback security, language doctrine, and freshness obligations. | Not ready: storage policy is now deterministic, but the pack data contract remains under-specified and cloud fallback `auto` still needs explicit consent/trust-boundary rules. | /sf-spec ASR Language Pack Catalog |
| 2026-05-15 19:18:30 UTC | sf-spec | GPT-5 Codex | Resolved readiness blockers by adding explicit `LanguagePackCatalogEntry` and `InstalledLanguagePack` data contracts, catalog validation failure behavior, and cloud fallback consent/trust-boundary rules. | Spec updated for readiness re-check. | /sf-ready shipglows_data/workflow/specs/asr-language-pack-catalog.md |
| 2026-05-15 19:19:39 UTC | sf-ready | GPT-5 Codex | Re-ran readiness gate after data contract and cloud fallback trust-boundary corrections. | Ready: structure, metadata, user-story traceability, data contract, adversarial cases, security posture, language doctrine, and freshness obligations are sufficient for first implementation. | /sf-start ASR Language Pack Catalog |
| 2026-05-17 13:26:48 UTC | sf-start | GPT-5 Codex | Implemented first ASR catalog slice: Dart catalog/domain contract, local-first Riverpod provider, Settings "On-device speech" section, IME voice runtime diagnostics, explicit Android fallback status, and benchmark MVP matrix. | Partial: first implementation slice is in place and locally validated; remaining work includes real download manager, local ASR runtime integration, first-micro prompt flow, update/corruption handling, and Android device QA. | /sf-start ASR Language Pack Catalog |
| 2026-05-17 13:36:32 UTC | sf-start | GPT-5 Codex | Implemented a safer Flutter install-state manager slice: testable local repository, idempotent per-pack transitions (`queued/downloading/verifying/installed`), guarded `markInstalled` (no false installed before verification), bounded retries (`max=3`), and provider tests for persistence and failure paths. | Partial: install-state lifecycle safety is now covered in Flutter state + tests, but no real model download/runtime execution is wired yet and first-micro onboarding/update/corruption flows remain. | /sf-start ASR Language Pack Catalog |
| 2026-05-17 13:39:03 UTC | sf-verify | GPT-5 Codex | Verified the implemented ASR catalog slices against the current spec scope: Flutter catalog/domain/provider state machine, Settings visibility, IME diagnostic wiring, local checks, and Android Kotlin compile surface. | Partial: focused tests, `flutter analyze`, diff hygiene, and Kotlin compile pass when resource processing is skipped; full verification is blocked by missing real download/runtime integration, first-micro flow, durable app restart persistence, Android device QA, and local AAPT2 runner incompatibility for full debug resources. | /sf-start ASR Language Pack Catalog |
| 2026-05-17 14:44:37 UTC | sf-start | GPT-5 Codex | Implemented durable Flutter persistence for ASR pack state: secure-storage repository, JSON serialization for installed pack state/retry counts/cloud fallback consent, async provider hydration, and tests for serialization plus cross-container persistence. | Implemented for this slice: local pack state now survives app restarts when secure storage is available; real model download/runtime, first-micro orchestration, update/corruption handling, and Android device QA remain outside this slice. | /sf-start ASR Language Pack Catalog |
| 2026-05-17 14:53:23 UTC | sf-start | GPT-5 Codex | Implemented deterministic install preflight for ASR packs: device profile contract, SDK/ABI/RAM/storage checks, provider-level `queueInstallAfterPreflight`, blocked states with explicit error codes, and tests proving incompatible devices never enter `downloading`. | Implemented for this slice: app-side install decisions now block incompatible/insufficient devices before queueing; real device profiling, model download/runtime execution, first-micro orchestration, update/corruption handling, and Android device QA remain outside this slice. | /sf-start ASR Language Pack Catalog |
| 2026-05-17 15:11:46 UTC | continue | GPT-5 Codex | Continued the current ASR catalog chantier by wiring Settings "Preflight install" to `queueInstallAfterPreflight`, removing the storage-simulation UI affordance, and showing blocked incompatible-device errors in the pack tile. | Continued: UI now uses the app-side preflight path instead of fake queue/simulation controls; conservative placeholder device profile remains until Android exposes real SDK/ABI/RAM/storage values. | /sf-start ASR Language Pack Catalog |
| 2026-05-17 15:19:38 UTC | continue | GPT-5 Codex | Continued to completion of the current local slice by replacing the placeholder preflight profile with device metrics from the Android keyboard bridge (`deviceAndroidSdk`, `devicePrimaryAbi`, `deviceTotalCapacityMb`, `deviceFreeSpaceMb`, `deviceRamMb`) and wiring Settings to consume those real values. | Continued: install preflight decisions now use runtime device metrics instead of hardcoded conservative defaults; remaining work is still the real download/runtime/onboarding/device-QA scope. | /sf-start ASR Language Pack Catalog |
| 2026-05-17 15:28:09 UTC | continue | GPT-5 Codex | Ran final local continuation checks on the implemented ASR catalog slices (`flutter test` targeted suites + `flutter analyze`) and refreshed chantier tracking for closure status. | Local verification passed for current slices; chantier remains partial because real download manager/runtime, first-micro orchestration, and Android device QA are still outside implemented scope. | /sf-start ASR Language Pack Catalog |
| 2026-05-17 15:44:55 UTC | sf-build | GPT-5 Codex | Orchestrated delegated execution with subagent for remaining ASR scope slice: install orchestration with preflight/download/verify path, first-micro no-pack prompt and explicit fallback action, minimal update/corruption transitions, plus targeted tests; then re-verified locally. | Partial: delegated implementation and local verification passed for the new slice, but native runtime/download integration and Android device/CI proof remain pending for full chantier completion. | /sf-start ASR Language Pack Catalog |
| 2026-05-17 16:20:31 UTC | sf-build | GPT-5 Codex | Orchestrated a second delegated wave focused on native Android runtime bridging: added IME runtime event queue, MainActivity bridge drain API, Dart bridge/event types, provider native-status ingestion, and tests for event propagation; then re-verified locally. | Partial: native runtime/fallback status now flows from IME to Flutter and tests pass, but real local-ASR engine/download-manager execution and Android device/CI proof are still pending for full chantier completion. | /sf-start ASR Language Pack Catalog |
| 2026-05-17 21:32:01 UTC | sf-build | GPT-5 Codex | Orchestrated a third delegated native wave: added explicit IME `local` runtime path with deterministic state phases (`local_loading` -> `local_active` or fallback), exposed runtime config/probe bridge APIs, synchronized Flutter/provider handling, and expanded tests for local-vs-fallback behavior. | Partial: local runtime path is now native and observable end-to-end via bridge/status events, but true local-ASR engine inference and Android device/CI proof remain pending for chantier completion. | /sf-start ASR Language Pack Catalog |
| 2026-05-17 21:39:59 UTC | continue | GPT-5 Codex | Continued pilotage after delegated waves: confirmed no local-ASR engine dependency is currently wired in project manifests, kept chantier state explicit, and routed the next execution step to `sf-start` for real engine/download-manager integration plus device/CI proof. | No fake closure: chantier remains partial until real local-ASR inference path and Android device/CI evidence exist. | /sf-start ASR Language Pack Catalog |
| 2026-05-17 21:48:55 UTC | continue | GPT-5 Codex | Continued with delegated implementation prep for real `sherpa_onnx` wiring: added explicit native `sherpa_engine_not_linked` error contract, deterministic fallback preservation, and bridge/provider tests asserting local-vs-fallback propagation without introducing heavy engine dependencies yet. | Partial: integration contract is now explicit and test-covered, but actual sherpa runtime linkage/inference and Android device/CI proof are still pending. | /sf-start ASR Language Pack Catalog |
| 2026-05-17 22:06:26 UTC | continue | GPT-5 Codex | Continued with delegated runtime-contract hardening: added persistent `modelArtifactPath` in installed-pack state, bridged artifact-path config Flutter->IME native, enforced native path validation (`local_model_path_missing`/`local_model_path_invalid`) before fallback, and extended tests for end-to-end error propagation. | Partial: model-artifact wiring and deterministic native validation are now in place and locally verified, but true sherpa runtime linkage/inference plus Android device/CI proof remain pending. | /sf-start ASR Language Pack Catalog |
| 2026-05-18 05:15:50 UTC | sf-verify | GPT-5 Codex | Verified the current ASR Language Pack Catalog slice against the spec contract after targeted local checks: Flutter analyzer clean, targeted Flutter tests pass, and the Dart/Kotlin status bridge remains coherent for catalog, preflight, and fallback paths. | Partial: local proof is strong for the implemented slice, but Android device QA and real local-ASR engine/download proof are still missing, so the chantier is not fully verified. | /sf-start ASR Language Pack Catalog |
| 2026-05-18 07:16:21 UTC | sf-build | GPT-5 Codex | Orchestrated a delegated continuation and re-verification pass from user request, including local test/analyze execution and run-state reconciliation. | Partial: targeted Flutter verification remains green, but Android device QA and real local-ASR engine/download integration are still missing for full chantier completion. | /sf-verify shipglows_data/workflow/specs/asr-language-pack-catalog.md |
| 2026-05-18 09:04:20 UTC | sf-verify | GPT-5 Codex | Performed delegated `sf-verify` continuation with timeout instrumentation, native state propagation tests, and status mapping adjustments. | Partial: local startup timeout now emits `runtime_timeout` fallback reason, status propagation is exercised locally, and deterministic preflight/storage/fallback/idempotence remains verified. Remaining blockers are stubbed local runtime engine linkage (`sherpa_engine_not_linked`) and missing Android device/CI proof. | /sf-verify shipglows_data/workflow/specs/asr-language-pack-catalog.md |
| 2026-05-18 12:28:00 UTC | sf-start | GPT-5 Codex | Continued first-spec execution with delegated Kotlin hardening: emitted explicit native `runtime_timeout` runtime event (`runtime_state=runtime_timeout`) before deterministic fallback, then re-ran targeted Flutter verification (`language_pack_catalog_test`, `settings_platform_controllers_test`) and `flutter analyze`. | Partial: local contract and timeout observability are stronger and verified locally, but real local-ASR engine inference/linkage and Android device/CI proof are still required for chantier completion. | /sf-verify shipglows_data/workflow/specs/asr-language-pack-catalog.md |
| 2026-05-18 16:55:00 UTC | sf-start | GPT-5 Codex | Continued first-spec implementation by replacing hardcoded local-engine fallback gating with dynamic linkage detection (`KeyboardLocalEngineSupport`) and injectable validation hooks in `KeyboardLocalRuntimePath`, including positive-path unit coverage for `sherpa_onnx` engine-linked scenarios. Re-ran targeted Flutter tests and analyzer. | Partial: local engine linkage detection is now runtime-driven and testable, but true local-ASR inference/runtime execution and Android device/CI proof remain pending. | /sf-verify shipglows_data/workflow/specs/asr-language-pack-catalog.md |
| 2026-05-18 17:44:00 UTC | sf-start | GPT-5 Codex | Continued first-spec implementation by adding a native local voice engine contract (`KeyboardLocalVoiceEngine`), wiring it into `KeyboardVoiceController`, preserving fallback reasons after Android fallback success, and refusing unsupported local engines with stable diagnostics instead of exposing fake local success. Checked current `sherpa-onnx` official docs for Android/Kotlin integration constraints. | Partial: local engine selection now has an explicit runtime adapter boundary and safe failure behavior, but the actual Sherpa JNI/audio-recognition implementation still needs Android CI/device work. | /sf-start ASR Language Pack Catalog |
| 2026-05-18 18:02:43 UTC | sf-start | GPT-5 Codex | Reconciled the first-spec scope against the implemented code and local proof: catalogue/domain contract, provider state machine, install preflight/storage policy, explicit cloud opt-in, first-micro no-pack prompt, Settings section, diagnostics, native bridge/runtime status propagation, timeout/fallback mapping, and benchmark matrix are implemented. Confirmed that real ASR engine inference is explicitly out of scope for this catalogue spec and belongs to `asr-local-runtime-engine-integration.md`. Re-ran targeted Flutter tests and analyzer. | Implemented for this spec scope: local catalogue and runtime-selection contract are in place; remaining real Sherpa/audio inference work is a separate runtime-engine chantier, while Android device/CI proof remains for `sf-verify`. | /sf-verify shipglows_data/workflow/specs/asr-language-pack-catalog.md |
| 2026-05-18 18:43:18 UTC | sf-verify | GPT-5 Codex | Verified the first-spec scope after reconciliation: checked contract boundaries, code surfaces, bug files, docs coherence, targeted Flutter tests, analyzer, and whitespace hygiene. Did not run Android/Gradle locally because project guardrails require Blacksmith/GitHub Actions plus physical-device QA for APK/IME behavior. | Partial: `sf-start` remains implemented for the catalogue spec scope and local proof is green, but ship-readiness is not fully verified until Android CI/device evidence covers IME first-micro, install/fallback, timeout diagnostics, and no silent cloud fallback on a real APK. | /sf-ci-build Android APK for ASR Language Pack Catalog |
| 2026-05-19 10:35:36 UTC | sf-prod | GPT-5 Codex | Verified GitHub Actions/Blacksmith run `26091472372` for SHA `37116dd1e4dbd8596d6e3937187c678c6fe57472`: detect changes, Flutter Analyze, Flutter Test, Firestore deploy, and Build Debug APK all completed successfully. Confirmed artifact `winglowz_app-debug-apk` ID `7081068119`, size `92581652` bytes, uploaded digest `0458d7160c905466aa496ffba9ee3ae9d52d69bb6a79fc4bc2eb78fcfd8f50d5`, and web health `200` for `https://winglowz-app.vercel.app/`. | Verified CI/APK production evidence: Android debug APK build exists from Blacksmith; remaining proof is physical-device IME QA for first-micro prompt, install/fallback behavior, timeout diagnostics, and no silent cloud fallback. | /sf-test Android ASR catalogue APK on physical device |
| 2026-05-19 11:29:41 UTC | sf-test | GPT-5 Codex | Logged Android physical-device QA from APK sha `37116dd` run `26091472372`: Settings catalogue visible with French/Hindi/English; diagnostic confirms cloud fallback disabled and Android SpeechRecognizer fallback metadata; action-bar mic dictation works but fallback mode is not visible enough; Hindi remove action appears no-op; overlay still blocks the interface. | Failed QA with actionable bugs: opened `BUG-2026-05-19-001` for keyboard mic fallback explanation, opened `BUG-2026-05-19-002` for Hindi remove no-op, and reopened `BUG-2026-05-11-001` for overlay behavior. | /sf-fix Android ASR catalogue physical-device QA failures |
| 2026-05-19 12:31:35 UTC | sf-fix | GPT-5 Codex | Fixed Android ASR catalogue physical-device QA failures that could be handled directly: persistent IME Android-fallback status copy, no misleading remove action for absent/removed packs, and overlay non-focusable/touch-modal flags plus honest Settings start copy. | Fix attempted: Flutter analyzer and targeted tests pass; local Android Gradle unit command is blocked by local AAPT2 runner incompatibility, so Android proof must come from Blacksmith APK and physical-device retest. | /sf-ship Android ASR catalogue physical-device QA fixes |
| 2026-05-19 12:49:42 UTC | sf-ship | GPT-5 Codex | Quick-shipped ASR catalogue physical-device QA fixes for CI/APK iteration after local checks. | Shipped for iteration: commit/push will trigger Blacksmith Android build; linked bugs remain `fix-attempted` and require APK retest before closure. | /sf-prod Android APK build for ASR catalogue QA fixes |
| 2026-05-20 09:16:59 UTC | sf-fix | GPT-5 Codex | Fixed follow-up Android real-device report that keyboard Mic fallback visibly starts but stops after a few seconds before the user presses Mic again. | Fix attempted: Android fallback no longer has an app-side 10s timeout, treats SpeechRecognizer callbacks as segments, restarts fallback after silence/no-match, and only inserts accumulated text on explicit user stop. | /sf-ship BUG-2026-05-20-001 |
| 2026-05-22 10:10:29 UTC | sf-fix | GPT-5 Codex | Reopened Android real-device QA after retest: Mic fallback still failed with `runtime_load_failed`, and speech-pack Settings actions still appeared disabled or silent. | Fix attempted: Android fallback now handles `ERROR_CLIENT` / recognizer busy as bounded delayed restarts and Settings pack actions now provide visible feedback, runtime config sync, and status-only copy for non-installable rows. Local Flutter/Kotlin checks pass. | /sf-ship BUG-2026-05-20-001 BUG-2026-05-19-002 |

# Current Chantier Flow

- `sf-spec`: done - latest draft captured the current product direction, deterministic storage policy, data contract, cloud fallback trust boundary, and language doctrine note.
- `sf-ready`: ready - readiness gate passed after data contract and cloud fallback trust-boundary corrections.
- `sf-start`: implemented - catalogue/domain contract, local-first provider, durable pack state, deterministic SDK/ABI/RAM/storage preflight, install/retry/update/corruption state transitions, explicit cloud fallback consent, Settings "On-device Speech" management, first-micro no-pack prompt, native bridge/runtime status propagation, timeout/fallback diagnostics, runtime adapter boundary, and benchmark MVP matrix are in place. Real ASR engine inference is intentionally outside this catalogue spec and is tracked by `shipglows_data/workflow/specs/asr-local-runtime-engine-integration.md`.
- `sf-verify`: partial - local Flutter checks pass and Android CI/Blacksmith produced a debug APK artifact; physical-device QA failures now have renewed fix attempts, including push-to-stop fallback behavior and Settings speech-pack action feedback, but Android CI/APK proof and real-device retest are still required before closure. The separate runtime-engine spec is draft and remains out of scope for this catalogue verification.
- `sf-end`: not launched - closeout depends on CI/APK proof and physical-device retest for the QA fixes.
- `sf-ship`: quick-shipped - QA fixes pushed for CI/APK iteration only; not a final product-complete ship because linked bugs remain pending physical-device retest.

Next command: `/sf-ship BUG-2026-05-20-001 BUG-2026-05-19-002`
