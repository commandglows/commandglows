---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-05-30"
created_at: "2026-05-30 20:24:44 UTC"
updated: "2026-05-30"
updated_at: "2026-05-30 21:10:44 UTC"
status: ready
source_skill: sf-spec
source_model: "GPT-5 Codex"
scope: "flutter-app-local-to-cloud-data-promotion-merge"
owner: "Diane"
confidence: high
user_story: "En tant qu'utilisatrice WinGlows qui a commence en mode local, je veux que mes donnees locales utiles soient fusionnees ou promues dans mon compte cloud quand je cree ou connecte un compte, afin de ne pas perdre mon travail et de le retrouver apres reinstallation."
risk_level: high
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "winglowz_app"
  - "Flutter app"
  - "Firebase Auth"
  - "Cloud Firestore"
  - "Firestore Security Rules"
  - "Suite identity / entitlements"
  - "Local mode stores"
  - "Clipboard history"
  - "Voice transcriptions"
  - "Snippets"
  - "Dictionary"
  - "Settings"
  - "Keyboard sync controller"
  - "SocialGlowz reference sync doctrine"
  - "Shared sync/save status component"
depends_on:
  - artifact: "shipglows_data/business/winglowz_app/product.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/business/winglowz_app/branding.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/winglowz_app/context.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md"
    artifact_version: "1.0.0"
    required_status: "ready"
  - artifact: "shipglows_data/workflow/specs/account-backed-keyboard-sync-and-recovery.md"
    artifact_version: "1.0.0"
    required_status: "ready"
  - artifact: "shipglows_data/workflow/specs/guidage-compte-cloud-winglowz-socialglowz-parity.md"
    artifact_version: "1.0.0"
    required_status: "ready"
  - artifact: "shipglows_data/workflow/specs/app-home-feed-global-actions-search.md"
    artifact_version: "1.0.0"
    required_status: "ready"
supersedes:
  - "Open question from firebase-backend-agnostic-migration.md about whether anonymous/local data must be preserved when enabling account-backed sync."
evidence:
  - "User correction 2026-05-30: SocialGlowz has a clear doctrine for merging local data with distinct cloud data; WinGlows must not frustrate users by deleting local data when they create an account."
  - "Local code 2026-05-30: clipboard_store_provider.dart, transcription_store_provider.dart, snippet_store_provider.dart, dictionary_store_provider.dart and settings_store_provider.dart choose Firebase only when Firebase is configured, the session is not local fallback, entitlement grants winglowz_app and Firebase UID exists."
  - "Local code 2026-05-30: PersistentClipboardHistoryStore persists local clipboard in FlutterSecureStorage under clipboard_history_v1; voice, snippets and dictionary local stores are currently in-memory and therefore need durable local-mode storage before reliable promotion."
  - "Local code 2026-05-30: FirebaseClipboardHistoryStore, FirebaseTranscriptionStore, FirebaseSnippetStore, FirebaseDictionaryStore and FirebaseSettingsStore already write user-scoped data under users/{uid}/..."
  - "Local code 2026-05-30: settings_screen.dart saves local settings first and remote settings when the active store is remote, but this is not a general local-to-cloud migration doctrine for product data."
  - "Local tests 2026-05-30: local_mode_store_provider_test.dart proves local mode selects local stores and remote sessions without suite entitlement stay local; no product-data local-to-cloud promotion tests exist yet."
  - "Existing spec 2026-05-30: app-home-feed-global-actions-search.md currently scopes out remote sync rule changes and immediate cloud guarantees, which is insufficient for this trust-critical account creation path."
  - "SocialGlowz reference 2026-05-30: src/lib/cloudSyncDecisions.ts distinguishes empty cloud snapshots, same remembered user, anonymous/local reuse and allowed local seeding on sign-up."
  - "SocialGlowz reference 2026-05-30: src/lib/cloudSync.ts hydrates cloud after auth, seeds cloud from local only when safe, flushes pending queues for reusable local state and clears stale queues on user change."
  - "SocialGlowz reference 2026-05-30: src/lib/cloudSyncQueue.ts persists a durable local mutation queue with dedupe keys and retry semantics."
  - "SocialGlowz reference 2026-05-30: src/lib/postAuthSyncFeedback.ts exposes blocking post-auth stages before the app claims that data is ready."
  - "WinGlows reference 2026-05-30: keyboard_sync_controller.dart already implements a local/cloud conflict doctrine for keyboard profiles: seed empty cloud, restore clean local from cloud, detect divergent conflict, partition queues by account and prevent silent overwrites."
  - "Official Firebase docs checked 2026-05-30: Cloud Firestore set writes can merge into existing documents to avoid full overwrites."
  - "Official Firebase docs checked 2026-05-30: Cloud Firestore supports transactions and batched writes; transactions retry on concurrent edits and fail offline, while batched writes are atomic."
  - "Official Firebase docs checked 2026-05-30: Firebase Security Rules can use Firebase Authentication request.auth.uid to restrict reads and writes to the owning user."
  - "User decisions 2026-05-30: auto-seed local data only for account creation in the same flow; make voice transcriptions eligible only after durable local storage; sync clipboard deletes with tombstones; promote up to the current 200 clipboard item cap; resolve conflicts primarily in Settings > Compte & cloud with feed indicators; require physical-device QA by Diane."
  - "User decision 2026-05-30: secrets are excluded from V1; any future secret sync requires a separate encrypted vault / secret backup spec."
next_step: "/sf-verify shipglows_data/workflow/specs/app-local-to-cloud-data-promotion-merge.md"
---

# Title

WinGlows Local-to-Cloud Data Promotion and Merge

# Status

Draft. This spec creates the trust-critical account creation and account connection contract for WinGlows product data. It does not implement the feature yet.

The current app can route stores to Firebase after a valid authenticated and entitled session exists, but it does not yet define how existing local data is preserved, promoted, merged, queued, or deliberately isolated when the user creates or connects a cloud account. That gap must be closed before WinGlows can honestly promise that local-first usage can later become account-backed usage without data loss.

# User Story

En tant qu'utilisatrice WinGlows qui a commence en mode local, je veux que mes donnees locales utiles soient fusionnees ou promues dans mon compte cloud quand je cree ou connecte un compte, afin de ne pas perdre mon travail et de le retrouver apres reinstallation.

Acteur principal: utilisatrice WinGlows qui a capture du texte, cree des snippets, enrichi son dictionnaire, configure ses settings ou utilise la voix en mode local avant de creer ou connecter un compte.

Acteurs secondaires:

- utilisatrice deja connectee qui revient online apres des modifications locales;
- utilisatrice qui change de compte sur le meme appareil;
- nouvel appareil ou reinstallation qui doit recuperer les donnees promues;
- Firebase Auth, Cloud Firestore et Security Rules;
- suite identity / entitlement `winglowz_app`;
- support qui lit un diagnostic redige sans contenu brut.

Declencheurs:

- creation de compte depuis le mode local;
- connexion a un compte existant depuis un appareil qui contient des donnees locales;
- retour online apres modifications locales;
- refresh/synchronisation manuel depuis le composant partage sync/save;
- changement de compte ou de session;
- reinstallation puis reconnexion au meme compte.

Resultat observable attendu: WinGlows explique qu'il prepare les donnees locales, lit le cloud du compte, fusionne ou demande une decision en cas de conflit, puis affiche un statut vrai. Apres reinstallation et reconnexion au meme compte, les donnees eligibles qui ont ete promues reapparaissent depuis Firebase.

# Minimal Behavior Contract

Quand une utilisatrice cree ou connecte un compte WinGlows depuis un etat local, l'app doit comparer les donnees locales eligibles avec le snapshot cloud du compte avant de remplacer les stores actifs. Si le cloud est vide et que les donnees locales appartiennent au meme contexte utilisateur ou a une creation de compte explicite, WinGlows promeut automatiquement les donnees locales eligibles vers le cloud avec des operations idempotentes. Si le cloud contient deja des donnees et que le local est propre, WinGlows hydrate le local depuis le cloud. Si le cloud et le local contiennent des donnees distinctes, WinGlows fusionne seulement les cas non ambigus, conserve les conflits sans ecrasement silencieux, et demande une decision explicite pour les collisions. Si le compte change, aucune file locale ni donnee locale liee a un autre compte ne doit etre envoyee sans confirmation. Les donnees locales ne sont jamais supprimees avant une preuve de persistance cloud ou une decision utilisateur explicite. L'edge case facile a rater est la creation de compte apres usage local: ce chemin doit etre traite comme un seed local vers cloud par defaut quand le cloud est vide, pas comme un basculement brutal vers des stores distants vides.

# Success Behavior

- Given l'utilisatrice est en mode local avec clipboard, snippets, dictionnaire, settings ou transcriptions eligibles, when elle cree un compte WinGlows avec entitlement actif, then l'app lit le cloud, detecte qu'il est vide, promeut les donnees locales eligibles, affiche les etapes de synchronisation, puis bascule en etat synchronise ou en attente de retry selon le resultat reel.
- Given l'utilisatrice se reconnecte au meme compte sur un appareil propre apres reinstallation, when Firebase Auth et l'entitlement sont valides, then WinGlows hydrate les stores depuis `users/{uid}` et les donnees precedemment promues reapparaissent.
- Given l'appareil local a une file pending pour le meme compte remembered, when le reseau revient ou l'utilisateur clique sur le composant sync/save, then WinGlows relit les revisions cloud utiles, flush la file idempotente, et marque chaque domaine comme synchronise, pending, erreur ou conflit.
- Given le cloud contient deja des snippets et le local contient des snippets avec triggers differents, when l'utilisatrice connecte le compte, then WinGlows fusionne les deux ensembles sans doublons.
- Given le cloud et le local contiennent le meme trigger snippet avec contenu different, when la sync post-auth s'execute, then WinGlows n'ecrase pas l'un par l'autre et expose un conflit resoluble.
- Given le cloud contient deja un dictionnaire personnel et le local contient des termes differents, when la sync post-auth s'execute, then WinGlows fusionne les termes non conflictuels et signale seulement les collisions de remplacement.
- Given le clipboard local contient des items rejetes comme sensibles, prives ou non eligibles, when la promotion cloud s'execute, then ces items restent local-only et ne sont pas envoyes.
- Given les transcriptions locales ont ete creees avant connexion, when elles sont durables et eligibles, then elles sont promues avec un identifiant stable ou une cle de dedupe deterministe.
- Given des settings locaux existent et le cloud contient deja un profil, when les deux profils divergent, then WinGlows applique une fusion par champ pour les preferences non sensibles et demande une decision pour les champs ambigus.
- Given Firebase est indisponible ou offline au moment de la creation du compte, when des donnees locales existent, then WinGlows conserve les donnees locales, cree des operations pending partitionnees par compte, et affiche `en attente de synchronisation` plutot qu'un faux succes.
- Given l'utilisatrice change de compte sur le meme appareil, when une file locale appartient a l'ancien compte, then l'app ne la rejoue pas vers le nouveau compte et demande confirmation avant toute promotion de donnees locales non liees a ce nouveau compte.
- Given le composant partage sync/save est clique, when une sync locale-cloud est possible, then il relance la lecture cloud, le flush de queue et la resolution de statut sans dupliquer les donnees.

# Error Behavior

- Session Firebase absente, local fallback actif ou entitlement manquant: ne pas ecrire dans Firebase; conserver l'etat local et afficher que la sync cloud WinGlows est inactive.
- Cloud inaccessible: ne pas remplacer le local par un snapshot vide; garder les donnees locales et marquer les operations comme pending/retry.
- Transaction Firestore conflictuelle: ne pas supposer que la derniere ecriture gagne; recalculer le snapshot et basculer en conflit ou retry selon le domaine.
- Donnee locale invalide ou trop grande: l'exclure de la promotion, enregistrer une erreur redigee et afficher un resume user-safe sans contenu brut.
- Collision de compte: ne jamais envoyer une queue ou un snapshot local vers un `uid` different sans consentement explicite.
- Echec partiel de batch: garder les operations non confirmees dans la queue et ne pas annoncer `tout synchronise`.
- Reinstallation sans promotion prealable: afficher clairement que seules les donnees deja synchronisees peuvent etre restaurees; ne pas promettre une recuperation impossible.
- Suppression locale avant confirmation cloud: interdite, sauf action utilisateur explicite et reversible si le domaine le permet.
- Logs et diagnostics: ne jamais inclure texte clipboard brut, transcription brute sensible, secrets, tokens, cles API locales ou payloads Firestore complets.

# Problem

WinGlows propose un mode local qui permet de commencer sans compte, ce qui est bon pour l'adoption. Mais le produit devient dangereux si la creation d'un compte fait disparaitre les donnees locales parce que les providers basculent directement vers des stores Firebase vides. L'utilisatrice percevrait alors le compte cloud comme une perte de travail, exactement l'inverse de la promesse de synchronisation.

Le projet a deja les briques:

- stores Firebase user-scoped pour clipboard, transcriptions, snippets, dictionnaire et settings;
- stores locaux pour le mode local;
- authentification suite et entitlement;
- composant UX de statut sync/save en cours de specification;
- doctrine SocialGlowz de seed local, queue durable et feedback post-auth;
- doctrine WinGlows clavier qui evite deja les overwrites silencieux.

Le manque est un contrat transverse: quand, comment, avec quelles preuves et quelles limites WinGlows transforme du local en cloud.

# Solution

Ajouter une couche de synchronisation locale-cloud explicite, adaptee a Flutter/Firebase, qui orchestre les stores existants au lieu de laisser chaque ecran ou provider decider seul. Cette couche doit:

- capturer un snapshot local durable par domaine;
- lire un snapshot cloud du compte courant;
- prendre une decision reproductible inspiree de SocialGlowz et du `KeyboardSyncController`;
- promouvoir, hydrater, fusionner, mettre en file ou bloquer selon la situation;
- exposer un statut unifie au composant sync/save et aux ecrans Compte & cloud / Accueil;
- prouver par tests qu'une creation de compte apres usage local ne perd pas les donnees eligibles.

Le chemin principal est:

1. Auth/entitlement valide.
2. Gel logique court des changements pendant la lecture initiale ou queue locale idempotente.
3. Lecture du snapshot local et du snapshot cloud.
4. Decision: seed cloud, hydrate local, merge, conflict, local-only ou blocked.
5. Ecriture Firestore avec batch/transaction selon le domaine.
6. Confirmation par lecture ou revision/checksum.
7. Statut clair dans l'UI et reprise automatique en cas d'erreur recuperable.

# Scope In

- Nouvelle couche applicative `sync` pour la promotion et la fusion locale-cloud.
- Doctrine de decision locale-cloud equivalente a SocialGlowz, adaptee aux types WinGlows.
- Reutilisation des patterns du `KeyboardSyncController` pour auth context, queue partitionnee, revision/checksum, conflit et actions utilisateur.
- Promotion des donnees eligibles:
  - clipboard history;
  - voice transcriptions;
  - snippets;
  - dictionary terms;
  - settings non secrets.
- Durabilisation des stores locaux actuellement en memoire si leurs donnees sont revendiquees comme recuperables ou promouvables.
- Snapshot local et cloud par domaine avec validation, bornes de taille et sanitization.
- Queue locale durable, idempotente, partitionnee par Firebase UID / global user ID / device ID.
- Cles de dedupe deterministes par domaine.
- Gestion explicite des cas cloud vide, local vide, meme compte remembered, creation de compte, cloud existant, conflits, offline et changement de compte.
- Integration post-auth et Settings/Compte & cloud.
- Integration avec le composant partage sync/save pour loading, pending, synced, saved, conflict et error.
- Tests unitaires, adapter tests, widget tests et smoke web/Vercel.
- Documentation technique et produit sur ce qui est synchronise, local-only, exclu et recuperable apres reinstallation.

# Scope Out

- Chiffrement end-to-end ou coffre secret cloud.
- Synchronisation des clés OpenAI, Anthropic, tokens, secrets locaux ou credentials dans cette V1. Diane souhaite l'ergonomie de sync des secrets, mais cette exigence doit passer par un chantier séparé de coffre chiffré ou de secret sync explicitement sécurisé avant d'être autorisée.
- Synchronisation de contenus rejetes par les protections clipboard/saisie sensible.
- Refonte complete de Firebase, migration fournisseur ou remplacement Firestore.
- Sync realtime multi-device exhaustive au-dela du chargement, de la queue et du refresh.
- Resolution automatique de tous les conflits semantiques.
- Suppression destructive de donnees locales pour faire de la place au cloud.
- Android build, Gradle, APK local ou installation device depuis cette VM.
- Changements de billing/entitlement sauf consommation du contrat existant.

# Constraints

- Respecter les guardrails locaux: `flutter analyze`, `flutter test`, tests cibles; pas de build Android, Gradle, install ou `flutter run -d android`.
- Ne pas promettre qu'une donnee sera recuperable apres reinstallation si elle n'a pas ete promue et confirmee cote cloud.
- Ne jamais afficher `synchronise` si une ecriture locale a seulement reussi localement.
- Les stores Firebase restent sous `users/{uid}` ou un equivalent user-scoped controle par Security Rules.
- Les operations doivent etre idempotentes; un retry ne doit pas creer de doublon.
- Les transactions ne doivent pas modifier l'etat Flutter directement, car elles peuvent etre relancees par Firestore.
- Les transactions Firestore peuvent echouer offline; le mode offline doit passer par la queue locale et les batchs/transactions au retour reseau.
- Les limites de Firestore batch/transaction doivent etre respectees; les grosses promotions doivent etre chunked et resumables.
- Les logs et erreurs doivent rester rediges.
- Les textes français doivent rester naturels et honnêtes: `local uniquement`, `en attente`, `synchronisé`, `conflit`, `erreur`.
- Les secrets utilisateur ne doivent pas être synchronisés en clair dans Firestore; la V1 peut synchroniser les préférences non sensibles et l'état de configuration, mais pas la valeur des clés API/tokens.

# Test Contract

Surface: application Flutter WinGlows, stores locaux/Firebase des domaines clipboard, voice, snippets, dictionary, settings, flux post-auth, écran Settings > Compte & cloud, Accueil/feed et composant partagé sync/save.

Proof profile: automated-first plus QA manuelle. Les preuves automatisées doivent couvrir les décisions, adapters, queue, statut UI et règles de sécurité; Diane fait la QA physique finale sur appareil.

Proof order:

1. Unit tests de doctrine sync et queue.
2. Adapter tests par domaine.
3. Widget tests Settings / Compte & cloud, composant sync/save, conflit et Accueil/feed.
4. Tests Firebase fake/emulator ou Security Rules si disponibles.
5. `flutter analyze`.
6. `flutter test`.
7. Smoke Vercel/web avec contexte propre.
8. QA physique Diane pour le scénario local -> compte -> sync -> réinstallation/reconnexion ou équivalent appareil propre, et pour toute surface Android native touchée.

Checklist path: `shipglows_data/workflow/verification/app-local-to-cloud-data-promotion-merge-checklist.md`.

Required scenario IDs:

- `L2C-001`: création de compte dans le même flux avec données locales et cloud vide.
- `L2C-002`: connexion à un compte existant vide depuis un appareil local non associé.
- `L2C-003`: connexion à un compte existant depuis local propre.
- `L2C-004`: connexion à un compte existant avec local divergent.
- `L2C-005`: retour online avec queue pending.
- `L2C-006`: changement de compte avec queue ancienne.
- `L2C-007`: absence d'entitlement.
- `L2C-008`: Firebase indisponible.
- `L2C-009`: données sensibles et secrets exclus.
- `L2C-010`: suppression clipboard synchronisée par tombstone.
- `L2C-011`: réinstallation/reconnexion qui restaure les données promues.
- `L2C-012`: clic sur le composant sync/save qui relance sans doublonner.

Required results:

- Les données locales éligibles sont visibles après création de compte et après reconnexion sur contexte propre.
- Le compte existant vide ne reçoit pas automatiquement les données locales non associées sans confirmation.
- Les conflits restent visibles et récupérables dans Settings > Compte & cloud.
- Le feed peut signaler un conflit ou un état pending sans devenir le centre principal de résolution.
- Les secrets restent exclus de la V1 et les logs ne contiennent pas de payload brut.

Exception with proof: si les voice transcriptions ne sont pas encore rendues durables, elles doivent être explicitement marquées `local uniquement` et exclues des critères de restauration V1 avec test/widget preuve.

Exception without proof: aucune exception ne peut marquer un domaine `synchronisé` sans preuve d'écriture ou de présence cloud.

# Dependencies

- `firebase_core` 4.7.0, `firebase_auth` 6.4.0 et `cloud_firestore` 6.3.0 présents dans `pubspec.lock` le 2026-05-30.
- Firebase Auth pour l'identite du compte.
- Suite identity / entitlement `winglowz_app` pour autoriser la sync produit.
- Cloud Firestore pour les collections user-scoped existantes.
- Firestore Security Rules pour verifier que `request.auth.uid` correspond au chemin utilisateur.
- Documentation officielle Firebase consultée le 2026-05-30:
  - `https://firebase.google.com/docs/firestore/manage-data/add-data`
  - `https://firebase.google.com/docs/firestore/manage-data/transactions`
  - `https://firebase.google.com/docs/rules/rules-and-auth`
- References locales:
  - `/home/claude/socialglowz/src/lib/cloudSyncDecisions.ts`
  - `/home/claude/socialglowz/src/lib/cloudSync.ts`
  - `/home/claude/socialglowz/src/lib/cloudSyncQueue.ts`
  - `/home/claude/socialglowz/src/lib/postAuthSyncFeedback.ts`
  - `lib/features/keyboard/application/keyboard_sync_controller.dart`
- Provider note Firebase/Firestore locale: aucune note dédiée trouvée sous `shipglows_data/technical/platforms/` ou `shipglows_data/technical/external-platforms/` le 2026-05-30; décision basée sur code local + docs officielles Firebase.

# Invariants

- Le mode local est un vrai mode produit, pas une impasse jetable.
- Une creation de compte ne doit jamais rendre invisibles les donnees locales eligibles sans explication, queue ou decision utilisateur.
- Le cloud ne gagne pas par defaut quand le local contient un travail distinct.
- Le local ne gagne pas par defaut quand le compte cloud contient deja des donnees d'un autre contexte utilisateur.
- Une donnee ne quitte l'appareil que si elle est eligible, assainie, user-scoped et autorisee.
- Une queue locale est toujours partitionnee par compte cible et ne peut pas etre replayed cross-user.
- Le statut UI represente l'etat reel: local-only, pending, syncing, synced, conflict, failed ou unavailable.
- Les donnees sensibles et secrets restent exclus meme si l'utilisateur clique sur synchroniser.
- Les données locales non associées à un compte peuvent être seed automatiquement uniquement lors d'une création de compte dans le même flux; pour une connexion à un compte existant, une confirmation est requise si le cloud est vide.

# Links & Consequences

- Le chantier `app-home-feed-global-actions-search.md` doit rester coherent: l'accueil peut exposer les dernieres entrees, mais il ne doit pas promettre une recuperation cloud tant que cette spec n'est pas implementee.
- Le chantier `guidage-compte-cloud-winglowz-socialglowz-parity.md` devient l'UX de surface de cette doctrine; cette spec devient la doctrine de donnees sous-jacente.
- Le chantier `account-backed-keyboard-sync-and-recovery.md` reste la reference clavier et fournit un pattern a generaliser, pas un substitut pour clipboard/snippets/dictionnaire/voice/settings.
- La documentation marketing et produit devra distinguer `stocke localement`, `en attente de sync`, `synchronise par compte`, et `exclu de la sync`.
- Toute verification de production devra prouver le scenario: creer des donnees locales, creer un compte, synchroniser, reinstaller ou simuler un appareil propre, se reconnecter, retrouver les donnees.

# Documentation Coherence

Mettre a jour, si l'implementation touche les fichiers concernes:

- `docs/VERIFICATION.md`: ajouter le scenario local -> compte -> reinstall/relogin.
- `docs/technical/flutter-app.md`: documenter la couche `sync`, les adapters et les statuts.
- `docs/technical/code-docs-map.md`: ajouter les nouveaux fichiers sync.
- `README.md` ou doc support app: expliquer honnetement ce qui est synchronise et ce qui reste local.
- `shipglows_data/business/winglowz_app/product.md`: verifier que les promesses `synchronise` correspondent aux domaines effectivement couverts.
- `shipglows_data/business/winglowz_app/branding.md`: garder une formulation directe et non trompeuse.

# Edge Cases

- Cloud vide mais local contient seulement des donnees non eligibles: afficher `rien a synchroniser` et ne pas creer de faux profil cloud.
- Cloud vide et creation de compte: seed local automatique pour donnees eligibles.
- Cloud vide et connexion à un compte existant: pas de seed automatique depuis un local non associé; demander confirmation, sauf si les métadonnées locales prouvent que c'est le même compte remembered.
- Cloud non vide et local vide: hydrate local depuis cloud.
- Cloud non vide et local clean cache du meme compte: hydrate ou compare checksum.
- Cloud non vide et local divergent: merge non conflictuel, conflit pour collisions.
- Changement de compte: isoler les caches et queues; demander confirmation avant upload local.
- App offline apres auth: queue et statut pending.
- Reauth ou token refresh: ne pas recommencer une promotion deja confirmee.
- Operation replayed apres crash: idempotency key empeche les doublons.
- Suppression locale d'un item deja cloud: representer comme tombstone ou operation delete selon domaine, pas comme oubli silencieux.
- Clipboard duplicate avec timestamps proches: dedupe par hash normalise + source + fenetre temporelle.
- Snippet meme trigger contenu different: conflit.
- Dictionary meme terme remplacement different: conflit.
- Settings field sensible ou secret: valeur exclue en V1; l'app peut synchroniser un indicateur de présence/configuration non secret.
- Transcription sans id stable historique: generer une migration locale d'identifiants avant promotion.
- Clipboard history volumineux: promouvoir au maximum le plafond local existant de 200 éléments, après exclusions sensibles et dedupe.
- Conflit entre deux versions d'une même entité: la modification la plus récente peut primer seulement si l'entité porte une horloge fiable, un auteur/device et aucune collision sémantique; sinon conflit explicite.

# Implementation Tasks

1. Creer les modeles de decision sync dans `lib/features/sync/domain/local_cloud_sync_models.dart`: auth context, snapshot state, domain status, decision, conflict, queue operation, revision/checksum.
2. Creer un `LocalCloudSyncController` dans `lib/features/sync/application/` qui orchestre lecture locale, lecture cloud, decision, ecriture, queue et statut.
3. Ajouter un provider Riverpod pour exposer l'etat sync global et par domaine au shell, Settings, Accueil et composant sync/save.
4. Ajouter un store de metadata locale durable: device ID, remembered Firebase UID, remembered global user ID, last promoted at, per-domain checksums et queue partitions.
5. Rendre durables les stores locaux actuellement en mémoire pour les domaines promouvables, au minimum snippets, dictionnaire et transcriptions, ou réduire explicitement la promesse produit de ces domaines jusqu'à durabilisation.
6. Ajouter des adapters `LocalSyncSnapshotAdapter` par domaine: clipboard, voice, snippets, dictionary, settings.
7. Ajouter des adapters `CloudSyncSnapshotAdapter` par domaine, en reutilisant les Firebase stores existants quand ils suffisent.
8. Definir les schemas de snapshot assainis avec bornes: longueurs max, timestamps, source, version, device ID, deleted/tombstone si necessaire.
9. Definir les cles de dedupe par domaine:
   - clipboard: hash normalise + source + fenetre temporelle + device/source metadata;
   - voice: id stable local ou hash normalise + createdAt + source;
   - snippets: trigger normalise par compte;
   - dictionary: terme normalise + caseSensitive;
   - settings: champ nomme + version de schema.
10. Implémenter la queue locale durable partitionnée par compte et domaine avec idempotency keys, retry count, next retry at, last error rédigée et statut.
11. Implémenter les décisions: seed empty cloud pour création de compte dans le même flux, confirmation pour compte existant vide non associé, hydrate clean local, merge safe, conflict, local-only, blocked different user, pending offline.
12. Implémenter les écritures Firestore par batch ou transaction selon le besoin de révision; chunker les gros lots, promouvoir au maximum 200 éléments clipboard et écrire des tombstones pour suppressions clipboard V1.
13. Ajouter une confirmation post-write par revision/checksum ou lecture cible avant de marquer `synced`.
14. Integrer le controller dans le flux post-auth, creation de compte et retour session.
15. Integrer le controller dans Settings / Compte & cloud avec les etapes: preparation locale, lecture cloud, fusion, envoi, pret ou action requise.
16. Brancher le composant partage sync/save sur le statut global et les actions retry/refresh.
17. Ajouter les actions de résolution de conflits dans Settings > Compte & cloud: fusionner quand possible, garder cet appareil, utiliser le cloud, laisser local-only, exporter si applicable; Accueil/feed affiche seulement un indicateur et un lien vers cette résolution.
18. Ajouter les protections de changement de compte: purge/ignore des queues anciennes, binding des caches, confirmation avant upload vers nouveau compte.
19. Ajouter diagnostics rediges: statut par domaine, counts, queue length, last safe error, aucun payload brut.
20. Mettre a jour l'accueil/feed pour afficher des statuts vrais si une donnee est local-only, pending ou synced.
21. Mettre a jour les docs techniques, verification et promesses produit.
22. Preparer une checklist QA Vercel/web et device physique uniquement pour les surfaces Android natives touchees.

# Acceptance Criteria

- Une utilisatrice peut creer des donnees locales, creer un compte, attendre la sync, puis retrouver ces donnees apres reconnexion sur un contexte propre.
- Les domaines eligibles affichent un statut correct: local-only, pending, syncing, synced, conflict, failed ou unavailable.
- Aucun domaine ne marque `synced` sans preuve d'ecriture cloud ou de presence cloud existante.
- Le cloud vide après sign-up reçoit les données locales éligibles sans action supplémentaire.
- Le cloud vide d'un compte existant ne reçoit pas automatiquement des données locales non associées; l'utilisateur doit confirmer.
- Un compte cloud existant ne se fait pas ecraser silencieusement par des donnees locales divergentes.
- Un changement de compte ne rejoue pas les queues de l'ancien compte.
- Les données sensibles, secrets et contenus rejetés restent exclus de la V1; leur synchronisation exige un chantier de coffre chiffré séparé.
- Les suppressions clipboard synchronisées sont représentées par tombstone ou opération équivalente et ne réapparaissent pas après refresh/reconnexion.
- La promotion initiale clipboard respecte le plafond actuel de 200 éléments après exclusions.
- Les retries sont idempotents et ne creent pas de doublons.
- Les tests couvrent les decisions, adapters, queue, conflit, UI de statut et smoke de reconnexion.
- La documentation ne promet plus une sync pour un domaine non implemente ou non verifie.

# Test Strategy

- Unit tests domaine sync:
  - cloud empty + local eligible + sign-up -> seed cloud;
  - cloud empty + local eligible + existing unknown account -> confirmation/block;
  - cloud existing + local clean -> hydrate;
  - cloud existing + local divergent -> merge/conflict;
  - same remembered account + pending queue -> flush;
  - different account + pending queue -> blocked/purge partition;
  - entitlement absent -> no remote writes;
  - offline -> pending queue.
- Adapter tests:
  - clipboard sanitization, sensitive exclusions, dedupe and tombstones;
  - snippets trigger collisions;
  - dictionary term collisions;
  - voice stable IDs and duplicate handling;
  - settings field-level merge and secret exclusions.
- Queue tests:
  - idempotency on retry;
  - persisted pending operations survive app restart;
  - account partition prevents cross-user replay;
  - retry/backoff and last error redaction.
- Firebase integration or fake Firestore tests:
  - user-scoped paths;
  - batch chunking;
  - transaction conflict behavior;
  - Security Rules deny cross-user access if the rules test harness is available.
- Widget tests:
  - post-auth stages;
  - sync/save component loading, pending, synced, error and conflict states;
  - conflict resolution panel;
  - Settings / Compte & cloud summary.
- Smoke checks:
  - Vercel/web: create local data, create/sign in, verify data remains visible and status is truthful;
  - clean browser/app state: sign in same account and verify promoted data appears;
  - physical-device QA by Diane for the final local -> account -> sync -> reinstall/relogin confidence path and any native Android surface touched.

# Risks

- High trust risk: any silent loss during account creation damages the core product promise.
- Privacy risk: broad sync could accidentally upload sensitive clipboard or local secrets if adapters are too permissive.
- Cross-user leakage risk: shared device and account switch paths must be partitioned rigorously.
- Duplicate risk: retry and merge can duplicate clipboard/transcription items without stable IDs.
- Conflict risk: snippets and dictionary have natural unique keys that need explicit conflict UI.
- Durability risk: current in-memory local stores cannot support reliable promotion after app restart.
- Product messaging risk: claiming sync before this is implemented would be misleading.

# Execution Notes

- Prefer implementing this as a foundation before expanding stronger public claims around account-backed sync.
- The first implementation slice may cover clipboard, snippets, dictionary and settings before voice if voice local durability requires a separate migration; if so, the UI must label voice honestly.
- Keep the SocialGlowz doctrine as conceptual reference, but implement native Flutter/Riverpod/Firebase patterns rather than porting JavaScript structures.
- Reuse the keyboard sync controller's account-safety ideas wherever possible.
- Use official Firebase APIs for merge writes, batched writes and transactions; avoid ad hoc overwrite flows.
- Run focused tests first, then `flutter analyze` and `flutter test` within app guardrails.
- Do not implement secret-value sync in this V1. If product insists on secret sync, stop and create a separate encrypted vault / secret backup spec before writing code.

# Open Questions

None.

Resolved decisions:

- Existing but empty cloud account: require confirmation unless the account was created in the same flow or is proven to be the same remembered account.
- Voice transcriptions: eligible in V1 only after durable local storage and safe field allowlist; otherwise label local-only.
- Clipboard deletes: synchronize in V1 through tombstones or equivalent delete operations.
- Clipboard retention: promote up to the current 200-item local cap after exclusions and dedupe.
- Conflict resolution: Settings > Compte & cloud is the primary resolution surface; Accueil/feed may show indicators and deep links.
- Cross-account local association: only metadata created after prior account use can associate local cache/queue to a Firebase/global user; pre-account local data is unassociated and needs sign-up flow or confirmation for existing accounts.
- Secrets: excluded from V1. Future secret synchronization requires a separate encrypted vault / secret backup spec.
- QA: Diane performs final physical-device QA; automated tests and Vercel/web smoke still remain required before handoff.

# Skill Run History

- 2026-05-30 20:24 UTC - `sf-spec` - Created draft spec for local-to-cloud promotion and merge after Diane clarified that local-first account creation must preserve user data and should follow the SocialGlowz doctrine.
- 2026-05-30 20:36 UTC - `sf-ready` - Readiness review failed because open product/security-impacting questions remain, the manual proof contract is incomplete, Firebase local versions are not captured in the spec dependencies, and implementation tasks do not yet name validation checks/file targets precisely enough for a fresh agent.
- 2026-05-30 20:50 UTC - `sf-spec` - Integrated Diane's decisions for account seeding, voice durability, clipboard tombstones, clipboard retention, conflict surface, account association explanation and physical-device QA; kept secret-value sync as a security blocker requiring either V1 exclusion or separate encrypted vault spec.
- 2026-05-30 20:55 UTC - `sf-ready` - Marked ready after Diane confirmed secrets are excluded from V1 and future secret sync requires a separate encrypted vault / secret backup spec.
- 2026-05-30 21:10 UTC - `sf-build` - Implemented the local-cloud sync foundation: domain models, metadata and queue stores, controller decisions, concrete adapter bridge/provider, clipboard snapshot support, and controller tests for seed, confirmation, hydrate, merge, conflict, latest-wins guard, account replay blocking, local-only voice, and metadata persistence. `flutter analyze` and `flutter test` passed. Physical-device QA remains required before closure.
- 2026-05-31 01:48 UTC - `sf-docs` - Added reusable local-cloud sync playbook and Flutter-specific implementation guide, then mapped `lib/features/sync/**` and sync specs/checklists in the WinGlows app code-docs map.

# Current Chantier Flow

- Current phase: implementation complete for local automated proof; verification/manual QA pending.
- Current owner: verification agent, then Diane for physical-device QA.
- Recommended next command: `/sf-verify shipglows_data/workflow/specs/app-local-to-cloud-data-promotion-merge.md`.
- Blockers: physical-device reinstall/relogin QA and end-to-end Settings conflict-resolution proof remain before `sf-end`/`sf-ship`.
