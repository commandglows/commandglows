---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "0.1.0"
project: "WinGlows"
created: "2026-05-10"
created_at: "2026-05-10 21:41:03 UTC"
updated: "2026-05-14"
updated_at: "2026-05-14 22:02:35 UTC"
status: draft
source_skill: sf-spec
source_model: "GPT-5 Codex"
scope: "local-first-user-owned-sync-strategy"
owner: "Diane"
confidence: medium
user_story: "En tant que fondatrice de WinGlows, je veux que l'app fonctionne d'abord localement et puisse synchroniser via les appareils et comptes cloud des utilisateurs avec un minimum de serveurs WinGlows, afin de rendre le LTD rentable sans ajouter de friction multi-appareils."
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Flutter app"
  - "Backend-agnostic stores"
  - "Local mode"
  - "SettingsStore"
  - "ClipboardHistoryStore"
  - "TranscriptionStore"
  - "SnippetStore"
  - "DictionaryStore"
  - "Firebase first adapter"
  - "Android IME keyboard"
  - "Android overlay"
  - "User-owned cloud storage providers"
  - "Optional P2P/rendezvous relay"
depends_on:
  - artifact: "README.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/business/business.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/architecture.md"
    artifact_version: "0.1.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md"
    artifact_version: "0.1.0"
    required_status: "ready"
  - artifact: "shipglows_data/workflow/specs/clipboard-backend-agnostic-api.md"
    artifact_version: "0.1.0"
    required_status: "ready"
supersedes: []
evidence:
  - "User report 2026-05-10: WinGlows installed without Supabase configuration shows local_mode diagnostic and blank non-settings pages, proving local mode must be real product behavior, not only a backend fallback notice."
  - "User decision 2026-05-10: maximize local behavior and avoid paid infrastructure where possible for LTD economics."
  - "User decision 2026-05-10: prefer user devices and user-owned cloud accounts such as Dropbox or Google Drive as sync relays."
  - "User decision 2026-05-10: do not force devices onto the same Wi-Fi; sync must work across independent 3G/Wi-Fi networks when possible."
  - "User decision 2026-05-10: avoid paid add-ons by default; increase the LTD price earlier if the product value and cost model require it."
  - "User decision 2026-05-14: for AppSumo/LTD global buyers, local dictation must use downloadable language packs instead of assuming only French and English."
  - "Research 2026-05-14: free/on-device ASR candidates include sherpa-onnx, Whisper local, Vosk, FunASR/SenseVoice, Moonshine, WeNet, and PaddleSpeech; model licensing and language coverage vary by pack."
  - "Official docs checked 2026-05-10: MDN WebRTC protocols document ICE/STUN/TURN and the need for TURN relay fallback when direct peer connection is blocked."
  - "Official docs checked 2026-05-10: Google Drive appDataFolder supports hidden app-specific storage through the drive.appdata scope."
  - "Official docs checked 2026-05-10: Dropbox App folder access scopes API calls to the app folder and requires production approval for public scale."
  - "Official docs checked 2026-05-10: Microsoft Graph OneDrive app folder uses Files.ReadWrite.AppFolder and /special/approot."
  - "Official docs checked 2026-05-10: Syncthing relay docs show relay infrastructure as a fallback pattern, with private relay support and rate limits."
  - "Official docs checked 2026-05-10: Automerge documents local-first, offline updates, network-agnostic sync and automatic merge semantics."
next_step: "/sf-ready shipglows_data/workflow/specs/local-first-user-owned-sync-strategy.md"
---

# Title

Local-First User-Owned Sync Strategy

# Status

Draft. This spec is the first architecture and product draft for making WinGlows genuinely local-first, lowering infrastructure cost for a lifetime deal, and using user-owned sync surfaces before WinGlows-owned servers.

This spec does not implement the current blank-page bug directly. It does treat that bug as evidence that the current `local_mode` fallback is not enough: every core page must have durable local data behavior even when Firebase, Supabase, or any future backend is missing.

# User Story

En tant que fondatrice de WinGlows, je veux que l'app fonctionne d'abord localement et puisse synchroniser via les appareils et comptes cloud des utilisateurs avec un minimum de serveurs WinGlows, afin de rendre le LTD rentable sans ajouter de friction multi-appareils.

Acteur principal: fondatrice/builder WinGlows.

Acteurs secondaires: utilisateur Android, futur utilisateur desktop/mobile, utilisateur non connecte, utilisateur LTD, fournisseur de stockage cloud choisi par l'utilisateur, eventuel serveur WinGlows de licence/rendezvous/relay.

Declencheurs principaux:

- L'utilisateur installe WinGlows sans backend distant configure.
- L'utilisateur cree ou modifie une transcription, un snippet, un terme de dictionnaire, un item clipboard ou une preference.
- L'utilisateur veut retrouver ses donnees entre mobile et desktop sans etre sur le meme Wi-Fi.
- Les deux appareils ne sont pas en ligne au meme moment.
- Un provider distant, un relais P2P, ou un compte cloud utilisateur devient indisponible.
- WinGlows doit vendre un LTD sans absorber une charge serveur illimitee.

Resultat observable attendu: WinGlows reste utilisable et durable en local, puis propose une synchronisation optionnelle chiffree via stockage utilisateur ou P2P opportuniste. Les serveurs WinGlows ne deviennent jamais la source de verite des donnees produit et ne stockent pas de contenu lisible.

# Minimal Behavior Contract

WinGlows accepte les actions produit normales sans backend distant, persiste les donnees localement de facon durable, puis synchronise les changements seulement si l'utilisateur active une methode de sync. La sync produit des changements observables sur un autre appareil via un transport choisi, prioritairement un espace cloud appartenant a l'utilisateur ou une connexion P2P quand elle est possible; en cas d'echec, les changements restent locaux, visibles en etat pending ou error, et peuvent etre renvoyes plus tard sans perte. L'edge case facile a rater est le cas mobile/desktop non simultanement en ligne: le P2P direct ne suffit pas, donc la strategie doit inclure une boite aux lettres asynchrone chiffree, idealement dans le cloud de l'utilisateur, avec un relais WinGlows minimal seulement comme fallback explicite.

Pour la dictee clavier, le comportement minimal est aussi local-first: WinGlows doit utiliser les ressources de l'appareil quand un pack de langue local est installe, puis seulement retomber sur Android SpeechRecognizer ou un worker WinGlows explicite quand le pack local manque, echoue, ou n'est pas disponible pour la langue choisie. Un lancement LTD global ne doit pas promettre une dictee offline universelle; il doit promettre des packs locaux gratuits pour les langues supportees, avec fallback clair pour les autres langues.

La recommandation de packaging est de ne pas embarquer de modele ASR lourd dans l'APK initial. Les packs doivent etre installes apres l'installation de l'app: suggestion au premier lancement, demande au premier appui micro, ou action explicite depuis Settings. Un eventuel micro-modele embarque ne doit etre envisage que si son benefice UX depasse clairement le cout de taille APK.

# Success Behavior

- Given l'app est installee sans `SUPABASE_URL`, sans `SUPABASE_PUBLISHABLE_KEY` et sans Firebase configure, when l'utilisateur ouvre Voice, Voice Flows, Dictionary ou Clipboard Snippet, then chaque page affiche son contenu local ou un etat vide utilisable, pas un coeur de page blanc.
- Given l'utilisateur cree une transcription, un snippet, un terme dictionnaire, un item clipboard ou une preference, when l'app est fermee puis relancee, then la donnee locale reapparait sans compte distant.
- Given l'utilisateur active la sync Google Drive, Dropbox, OneDrive ou WebDAV, when l'app a obtenu l'autorisation utilisateur, then elle cree une zone d'echange app-specific et y ecrit uniquement des enveloppes chiffrees, jamais du texte lisible par WinGlows ou par le provider au niveau applicatif.
- Given l'appareil A cree un changement puis passe offline, when l'appareil B se connecte plus tard au meme compte de stockage utilisateur, then B telecharge les enveloppes manquantes, decrypte localement et applique les changements dans un ordre deterministe.
- Given les deux appareils sont en ligne en meme temps sur des reseaux differents, when la connexion P2P reussit, then les changements peuvent etre echanges directement sans passer par un stockage central WinGlows.
- Given le P2P direct echoue a cause de NAT, pare-feu ou reseau mobile, when un transport asynchrone est configure, then WinGlows retombe sur la boite aux lettres cloud utilisateur ou sur un relais minimal, et l'utilisateur voit seulement un statut de sync plus lent, pas une panne bloquante.
- Given le compte cloud utilisateur a un quota depasse, une autorisation expiree ou une API rate limited, when une sync est lancee, then les changements restent locaux et l'UI expose une action reconnect/retry.
- Given l'utilisateur est en LTD, when il utilise le produit sans sync cloud WinGlows, then le cout variable serveur reste proche de zero hors licence, telemetry minimale et distribution.
- Given l'utilisateur est en LTD et dicte dans une langue supportee par un pack local installe, when il utilise le clavier WinGlows, then la transcription ne consomme pas de worker WinGlows.
- Given l'utilisateur dicte dans une langue sans pack local installe, when il lance la dictee clavier, then WinGlows propose l'installation du pack si disponible ou bascule vers une politique fallback explicite.
- Given aucun pack ASR n'est installe, when l'utilisateur appuie sur le micro clavier, then l'UI propose d'installer le pack local recommande au lieu de paraitre cassee.
- Given la langue systeme ou la langue clavier change, when WinGlows detecte une langue compatible, then il peut suggerer le pack local correspondant sans le telecharger silencieusement.
- Given un utilisateur retire un appareil, when l'appareil retire essaie de synchroniser, then il ne peut plus dechiffrer les nouvelles enveloppes et son statut est visible comme appareil revoque.

# Error Behavior

- Si la base locale durable n'est pas initialisee, l'app doit afficher une erreur recuperable et bloquer les ecritures concernees plutot que pretendre sauvegarder.
- Si un provider de stockage utilisateur refuse l'autorisation OAuth, la sync n'est pas activee et les donnees restent locales.
- Si le token provider expire, WinGlows marque le transport `needs_reauth`, garde les enveloppes locales en queue et n'efface aucune donnee acceptee.
- Si deux appareils modifient la meme donnee hors ligne, le moteur applique une regle de merge connue par domaine et conserve assez de metadata pour expliquer le resultat ou exposer un conflit manuel quand la merge automatique serait risquee.
- Si une enveloppe distante est corrompue, trop ancienne, inconnue ou signee par un appareil revoque, elle est ignoree ou mise en quarantaine sans casser la queue.
- Si un relais WinGlows est indisponible, la sync P2P live echoue proprement et la sync asynchrone reste disponible quand un provider utilisateur est configure.
- Si un pack ASR local est absent, corrompu, incompatible avec l'appareil, ou trop lourd pour la memoire disponible, la dictee clavier doit afficher un fallback explicite au lieu de bloquer ou d'envoyer silencieusement l'audio vers un worker.
- Si une langue n'a pas encore de pack local de qualite suffisante, la fiche pack doit l'indiquer comme `experimental` ou `fallback only`, pas comme support complet.
- Si l'utilisateur perd sa cle de recovery, WinGlows doit etre honnete: les donnees chiffretees hors appareil ne sont pas recuperables par WinGlows.
- Si un contenu sensible clipboard provient d'un champ prive ou d'une capture automatique, les regles de `ClipboardHistoryApi` continuent de s'appliquer; la sync ne doit pas contourner private mode ou confirmation.
- Ce qui ne doit jamais arriver: stockage de cles OpenAI/Anthropic en cloud, logs de contenu utilisateur en clair, service-role secret dans le client, ecriture cloud silencieuse alors que l'utilisateur pense etre en local-only, ou suppression distante sans tombstone/retry.

# Problem

WinGlows vise un usage multi-appareils, mais un LTD rend dangereux tout modele ou nos serveurs deviennent le lieu principal de stockage et de synchronisation de textes, clipboard, snippets, dictionnaires et transcriptions. Le cout serveur peut devenir structurel alors que le revenu est encaisse une seule fois.

Le meme probleme existe pour la dictee: si chaque appui sur le micro du clavier declenche un worker WinGlows, un LTD mondial peut transformer des utilisateurs tres actifs en cout variable permanent. Le produit doit donc separer la valeur du clavier et des workflows de la consommation serveur, en utilisant des packs ASR locaux gratuits quand c'est possible.

Le probleme actuel est double. D'abord, l'app a deja un mode `local_mode`, mais le retour utilisateur indique que plusieurs pages restent vides hors Settings quand la configuration Supabase manque. Cela signifie que le local mode n'est pas encore une promesse produit robuste. Ensuite, la sync multi-appareils ne peut pas etre resolue uniquement par P2P direct: les appareils ne sont pas toujours en ligne ensemble, pas toujours sur le meme reseau, et les reseaux mobiles ou pare-feu peuvent bloquer les connexions directes.

La strategie doit donc separer trois choses: source de verite locale durable, transport de sync interchangeable, et serveur WinGlows minimal pour licence/rendezvous/relay quand il y a une vraie necessite produit.

# Solution

Faire de WinGlows une app local-first: les stores produit ecrivent d'abord dans une base locale durable, puis produisent un journal de changements chiffrable et rejouable. La synchronisation devient un pipeline optionnel et backend-agnostic qui peut utiliser des transports differents: fichier/export manuel, dossier applicatif Google Drive/Dropbox/OneDrive/WebDAV, P2P opportuniste, puis relais WinGlows minimal et borne quand les autres chemins ne suffisent pas.

La doctrine par defaut est:

- Local durable comme source de verite.
- Cloud utilisateur comme boite aux lettres asynchrone chiffree.
- P2P comme optimisation live, pas comme unique garantie.
- Serveurs WinGlows limites a licence, device registry minimal, rendezvous/signaling et eventuel relay rate-limited.
- Aucun contenu utilisateur lisible cote WinGlows.
- Dictee locale via catalogue de packs de langue gratuits et optionnels, telecharges a la demande selon langue systeme, langue clavier ou choix utilisateur.
- Worker WinGlows pour transcription seulement en mode fallback/qualite explicite, avec garde-fous de quota compatibles LTD.

# Scope In

- Remplacer les stores in-memory par des stores locaux durables derriere les interfaces existantes.
- Ajouter une base locale et des migrations pour settings, transcriptions, clipboard, snippets, dictionary, device identity, sync journal, tombstones et sync checkpoints.
- Definir une identite appareil locale avec cle de signature/chiffrement, statut d'appareil et rotation/revocation.
- Definir un format `SyncEnvelope` chiffrable, signe, versionne, idempotent et transport-agnostic.
- Definir un `SyncTransport` ou `UserOwnedSyncProvider` commun pour export fichier, Google Drive appDataFolder, Dropbox App Folder, OneDrive app folder, WebDAV et eventuels autres providers.
- Ajouter une sync asynchrone par boite aux lettres: upload/download d'enveloppes chiffrees, pagination, checkpoints, retries, backoff, dedupe.
- Ajouter une strategie de pairing entre appareils: QR code, phrase de recovery ou lien court qui ne transmet jamais la cle maitre en clair a WinGlows.
- Ajouter des etats UI: local-only, sync pending, synced, needs reauth, conflict, provider quota/rate limited, relay unavailable.
- Ajouter un catalogue de packs ASR locaux: langue, moteur, modele, taille, licence, niveau qualite (`experimental`, `standard`, `recommended`), compatibilite appareil, version et checksum.
- Ajouter un gestionnaire de telechargement modele: installation, reprise, verification checksum, suppression, mise a jour, stockage local et etat visible.
- Ajouter une politique fallback ASR: pack local installe, pack disponible a installer, Android SpeechRecognizer, worker qualite explicite, ou indisponible.
- Ajouter une detection langue: locale systeme, langues clavier, choix manuel utilisateur et eventuelle detection audio quand le moteur la supporte.
- Definir une politique de sync par domaine: settings syncables, transcriptions syncables, snippets/dictionary syncables, clipboard syncable avec garde-fous et opt-out par categorie.
- Definir le role minimal possible des serveurs WinGlows: licence/entitlement, device registry metadata, rendezvous/signaling, relay rate-limited et telemetry redacted.
- Documenter les limites commerciales: pas de promesse "sync illimitee via nos serveurs" pour les LTD.
- Mettre a jour README, docs techniques, FAQ/support, onboarding et pricing copy quand la feature est implementee.

# Scope Out

- Construire un serveur WinGlows qui stocke les donnees produit en clair.
- Promettre une sync instantanee et illimitee sans cout serveur dans tous les reseaux.
- Implementer tous les providers au premier sprint.
- Forcer les appareils a etre sur le meme Wi-Fi.
- Synchroniser les cles OpenAI/Anthropic BYO dans la premiere version.
- Synchroniser l'audio brut par defaut.
- Bundler tous les modeles ASR dans l'APK initial.
- Bundler un modele ASR lourd par defaut dans l'APK initial sans preuve forte que le gain UX justifie la taille.
- Promettre une dictee offline haute qualite dans toutes les langues au lancement LTD.
- Ajouter de la collaboration temps reel multi-utilisateur type Google Docs.
- Ajouter billing/checkout complet, sauf si necessaire pour verifier entitlement LTD.
- Remplacer Firebase partout en une seule passe; Firebase peut rester un adaptateur distant tant que le contrat local-first le contient.
- Utiliser le P2P comme seule strategie pour les appareils qui ne sont pas connectes simultanement.

# Constraints

- Local-first signifie que chaque operation utilisateur acceptee doit survivre a un redemarrage sans backend distant.
- Les stores UI ne doivent pas importer directement Firebase, Supabase, Dropbox, Drive, OneDrive ou WebRTC.
- Toutes les donnees envoyees vers un provider utilisateur ou un serveur WinGlows doivent etre chiffrees cote client avant transport.
- Les serveurs WinGlows ne doivent pas avoir la cle permettant de lire transcriptions, clipboard, snippets, dictionnaire ou preferences sensibles.
- La dictee clavier ne doit pas envoyer l'audio vers un worker WinGlows sans action ou reglage explicite quand un mode local est attendu.
- Les packs ASR locaux doivent avoir une licence compatible avec la distribution commerciale WinGlows avant d'etre marques `recommended`.
- Les langues vendues dans la page LTD doivent correspondre a des packs verifies ou a un fallback clairement annonce.
- Les cles BYO OpenAI/Anthropic restent dans `flutter_secure_storage` ou equivalent local securise et ne sont pas syncables en V1.
- Le clipboard a des risques particuliers: private fields, contenus secrets, retention et confirmation continuent de primer sur la sync.
- Les suppressions doivent produire des tombstones synchronisables; supprimer localement sans tombstone peut ressusciter une donnee sur un autre appareil.
- Les identifiants doivent etre stables et generes cote client avec metadata de device/origin.
- Les changements doivent etre idempotents: rejouer deux fois la meme enveloppe ne doit pas creer de doublon.
- Les providers utilisateur peuvent etre supprimes, renommes, rate limited, sans reseau, sans quota ou deconnectes; l'app doit garder un etat recuperable.
- Le P2P WebRTC a besoin de signaling pour se trouver et de STUN/TURN pour traverser certains reseaux; TURN consomme de la bande passante serveur et doit etre traite comme fallback couteux.
- Les claims publics doivent rester alignes avec ce qui est verifie: "local-first", "sync via your cloud" ou "encrypted sync" seulement quand les comportements sont prouves.

# Dependencies

Code local et contrats existants:

- `lib/core/sync/sync_status.dart`
- `lib/core/bootstrap/app_bootstrap.dart`
- `lib/core/bootstrap/firebase_bootstrap.dart`
- `lib/features/settings/domain/settings_store.dart`
- `lib/features/settings/data/local_settings_store.dart`
- `lib/features/clipboard/domain/clipboard_store.dart`
- `lib/features/clipboard/application/clipboard_history_api.dart`
- `lib/features/clipboard/data/in_memory_clipboard_history_store.dart`
- `lib/features/voice/application/transcription_store.dart`
- `lib/features/snippets/domain/snippet_store.dart`
- `lib/features/dictionary/domain/dictionary_store.dart`
- `lib/features/*/application/*_store_provider.dart`

Docs et specs locales:

- `README.md`: decrit Flutter Android-first, backend-agnostic stores, Firebase first adapter et local mode.
- `shipglows_data/business/business.md`: pose les contraintes BYO, securite et modele freemium/LTD hors billing runtime.
- `shipglows_data/technical/architecture.md`: impose stores backend-neutres et cles API locales.
- `shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md`: Firebase est un adaptateur, pas le domaine produit.
- `shipglows_data/workflow/specs/clipboard-backend-agnostic-api.md`: clipboard est deja le modele d'API produit a ne pas coupler a un backend.

Docs externes officielles consultees le 2026-05-10:

- MDN WebRTC protocols: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Protocols. Verdict `fresh-docs checked`: ICE utilise STUN/TURN; TURN relaie le trafic quand direct peer connection impossible, donc le P2P direct ne peut pas etre la seule garantie.
- Google Drive appDataFolder: https://developers.google.com/workspace/drive/api/guides/appdata. Verdict `fresh-docs checked`: `appDataFolder` est un espace app-specific cache, accessible via le scope `drive.appdata`, pertinent pour une boite aux lettres chiffree.
- Dropbox Getting Started/App folder: https://www.dropbox.com/developers/reference/getting-started. Verdict `fresh-docs checked`: App folder access limite l'app a un dossier dedie; public scale necessite attention a la production approval.
- Microsoft Graph OneDrive app folder: https://learn.microsoft.com/en-us/graph/onedrive-sharepoint-appfolder. Verdict `fresh-docs checked`: `Files.ReadWrite.AppFolder` et `/special/approot` donnent un dossier app avec permissions minimales.
- Syncthing relay server: https://docs.syncthing.net/users/strelaysrv.html. Verdict `fresh-docs checked`: le modele relay existe comme fallback, mais il reste une infra a operer, limiter et surveiller.
- Automerge docs: https://automerge.org/docs/hello/. Verdict `fresh-docs checked`: utile comme reference de local-first, sync offline, merge automatique et reseau agnostique; pas choisi comme dependance Dart a ce stade.

Dependances probables a evaluer pendant `/sf-ready`, sans engagement dans ce draft:

- Local DB Flutter/Dart: Drift/SQLite, Isar, ObjectBox ou autre solution durable. Decision recommandee: choisir une solution SQLite/Drift-like si elle facilite migrations, tests et requetes; verifier les docs officielles avant implementation.
- Crypto: package Dart audite ou bindings platform pour AEAD, HKDF et signatures. Decision recommandee: ne pas implementer la crypto a la main.
- OAuth providers: Google, Dropbox, Microsoft, WebDAV. Decision recommandee: commencer par un provider app-folder et un export fichier chiffre.
- WebRTC/P2P: uniquement apres base locale et sync asynchrone stable.

# Invariants

- Les pages produit restent utilisables sans configuration backend distante.
- La base locale durable est la source de verite primaire.
- Les providers distants ne sont que des transports ou adaptateurs.
- Le domaine produit ne depend pas d'un provider concret.
- Les payloads syncables sont versionnes, signes, chiffrables et idempotents.
- Le serveur WinGlows ne peut pas lire le contenu utilisateur.
- Un appareil revoque ne recoit pas les nouvelles cles de sync.
- Les tombstones gagnent contre les updates plus anciennes.
- Les conflits ont une resolution deterministe ou une surface utilisateur claire.
- Les donnees sensibles ont une retention et une sync plus strictes que les donnees ordinaires.
- Une erreur de sync ne doit jamais rendre impossible la lecture locale des donnees deja acceptees.
- Le statut local/sync est visible dans Settings et dans les surfaces ou l'utilisateur risque de croire que tout est synchronise.

# Links & Consequences

- `lib/features/*/data/in_memory_*_store.dart`: ces stores ne sont pas suffisants pour un vrai mode local; ils doivent etre remplaces ou encapsules par des stores durables.
- `lib/features/*/application/*_store_provider.dart`: ces providers deviennent le point d'injection local durable + sync adapter; ils ne doivent pas exposer les providers de transport a l'UI.
- `lib/core/sync/sync_status.dart`: doit probablement evoluer pour differencier `localOnly`, `pending`, `syncing`, `synced`, `needsReauth`, `conflict`, `quotaExceeded`, `relayUnavailable`.
- `lib/core/bootstrap/app_bootstrap.dart`: doit initialiser la base locale avant les stores distants.
- `lib/features/settings/presentation/settings_screen.dart`: doit exposer le mode local, la methode de sync, les appareils lies, les erreurs provider et les actions reconnect/revoke.
- `lib/features/clipboard/application/clipboard_history_api.dart`: doit rester l'autorite metier pour clipboard; la sync ne contourne pas ses validations.
- `android/app/src/main/kotlin/**` et bridges Android: l'IME/overlay produisent des evenements locaux; ils ne deviennent pas clients Dropbox/Drive/WebRTC directs.
- `README.md`, `shipglows_data/business/*`, `shipglows_data/technical/*`: devront remplacer les promesses "Firebase first remote sync" par "local-first + optional remote adapters" une fois le comportement implemente.
- Billing/pricing/LTD: le marketing doit eviter de promettre de la sync relayee illimitee par nos serveurs; le prix LTD doit integrer le cout minimal de licence, support, signaling/relay et telemetry.
- Support: il faudra documenter ce que l'utilisateur doit faire si son compte Drive/Dropbox est plein, revoke, deconnecte ou s'il perd sa cle de recovery.

# Documentation Coherence

- README: ajouter une section "Local-first and sync options" quand le socle durable existe.
- Docs techniques: creer ou mettre a jour une page architecture sync locale, schema de base locale, format d'enveloppe et providers.
- Docs securite: documenter E2EE, stockage local, recovery key, revocation appareil, et limites de responsabilite.
- Onboarding: expliquer local-only, choix de sync, pairing appareil et consequence de perte de cle sans jargon.
- FAQ/support: ajouter provider auth expired, quota, reauth, appareil perdu, conflit, export/import.
- Pricing/LTD copy: dire que le LTD inclut le produit local et les transports user-owned; tout service relay intensif doit etre borne ou reserve a des plans qui couvrent le cout.
- Changelog: documenter par etapes, d'abord "durable local mode", puis "encrypted export/import", puis "Drive/Dropbox/OneDrive sync", puis "P2P beta" si implemente.
- Existing stale docs: `shipglows_data/business/branding.md` et `shipglows_data/business/gtm.md` contiennent encore des mentions Supabase; elles devront etre revisees avant claims publics.

# Edge Cases

- Installation neuve sans backend distant.
- App relancee apres creation de donnees en local-only.
- Migration depuis stores in-memory ou Firebase existant vers local durable.
- Device A modifie hors ligne, Device B supprime hors ligne, puis les deux sync plus tard.
- Meme changement uploade deux fois a cause d'un retry.
- Horloge appareil fausse ou timezone differente.
- Provider cloud supprime le dossier applicatif.
- User desinstalle l'app provider ou retire l'autorisation OAuth.
- Quota Drive/Dropbox/OneDrive depasse.
- Provider API change de comportement ou impose revue production.
- Deux appareils ne sont jamais en ligne simultanement.
- Deux appareils sont en ligne mais P2P echoue pour NAT/pare-feu.
- TURN/relay WinGlows sature ou coute trop cher.
- Appareil perdu mais encore en possession d'anciennes enveloppes.
- Cle de recovery perdue.
- Enveloppe distante corrompue, inconnue ou issue d'une version future.
- Clipboard d'un champ password/private.
- Donnee supprimee qui revient parce qu'un tombstone a expire trop tot.
- Sync partielle apres crash pendant application d'un batch.
- Utilisateur veut changer de provider de sync.

# Implementation Tasks

- [ ] Tache 1 : Corriger le contrat local mode observable
  - Fichiers : `lib/features/voice/presentation/voice_screen.dart`, `lib/features/dictionary/presentation/dictionary_screen.dart`, `lib/features/snippets/presentation/snippets_screen.dart`, `lib/features/clipboard/presentation/clipboard_screen.dart`, `lib/core/widgets/local_mode_notice.dart`, tests widget.
  - Action : Garantir que chaque page non-settings affiche un etat local vide/actionnable ou des donnees locales, jamais un coeur blanc quand aucun backend distant n'est configure.
  - User story link : l'app doit etre utilisable localement avant toute sync.
  - Depends on : bug report utilisateur 2026-05-10 et providers local existants.
  - Validate with : fresh install sans defines backend, navigation vers toutes les icones, widget tests ou smoke manuel.
  - Notes : cette tache peut etre extraite dans un chantier bug separe si elle doit shipper avant la sync.

- [ ] Tache 2 : Choisir la base locale durable
  - Fichiers : `pubspec.yaml`, `lib/core/local/`, `test/core/local/`, docs techniques.
  - Action : Evaluer et choisir la dependance de persistence locale, puis documenter le choix, les migrations, les limitations plateforme et le plan de tests.
  - User story link : local-first exige persistence apres redemarrage.
  - Depends on : fresh-docs check de la dependance choisie.
  - Validate with : doc decision + prototype create/read/update/delete en test local.
  - Notes : ne pas garder in-memory comme implementation produit.

- [ ] Tache 3 : Creer le schema local initial
  - Fichiers : `lib/core/local/local_database.dart`, `lib/core/local/local_migrations.dart`, `test/core/local/local_database_test.dart`.
  - Action : Ajouter tables/collections locales pour settings, transcriptions, clipboard items, snippets, dictionary terms, devices, sync journal, sync checkpoints et tombstones.
  - User story link : toutes les donnees produit principales doivent etre locales.
  - Depends on : Tache 2.
  - Validate with : migration test from empty DB, schema version test, CRUD smoke.

- [ ] Tache 4 : Implementer les stores locaux durables derriere interfaces existantes
  - Fichiers : `lib/features/settings/data/`, `lib/features/voice/data/`, `lib/features/clipboard/data/`, `lib/features/snippets/data/`, `lib/features/dictionary/data/`, providers application.
  - Action : Remplacer l'usage produit des stores in-memory par des stores locaux durables qui implementent les contrats existants.
  - User story link : les donnees locales survivent au redemarrage et aux absences backend.
  - Depends on : Tache 3.
  - Validate with : tests par store + smoke app sans backend + `flutter test`.

- [ ] Tache 5 : Ajouter l'identite appareil et le coffre local de sync
  - Fichiers : `lib/core/device/device_identity.dart`, `lib/core/device/device_identity_store.dart`, `lib/features/settings/data/secure_secret_store.dart`, tests.
  - Action : Generer un device id stable, une cle locale et metadata appareil; stocker les secrets dans le secure storage.
  - User story link : pairing, signature, revocation et dedupe dependent d'une identite appareil stable.
  - Depends on : Tache 2.
  - Validate with : identity persists after restart, rotates only on explicit reset, no secret logs.

- [ ] Tache 6 : Definir le format `SyncEnvelope`
  - Fichiers : `lib/core/sync/sync_envelope.dart`, `lib/core/sync/sync_codec.dart`, `lib/core/sync/sync_crypto.dart`, tests.
  - Action : Specifier et coder le format enveloppe: schema version, envelope id, entity type/id, operation, vector or revision metadata, device id, timestamps, tombstone flag, encrypted payload, signature/MAC.
  - User story link : un transport commun doit porter tous les changements sans connaitre le domaine.
  - Depends on : Taches 3 et 5.
  - Validate with : encode/decode roundtrip, duplicate apply ignored, corrupt envelope rejected.
  - Notes : utiliser une lib crypto reconnue; ne pas inventer primitives crypto.

- [ ] Tache 7 : Ajouter un journal de changements local
  - Fichiers : `lib/core/sync/change_journal.dart`, stores locaux, tests.
  - Action : Chaque write produit un change record transactionnel avec l'ecriture locale; chaque sync marque les checkpoints sans perdre l'historique utile.
  - User story link : sync offline et non simultanee exige un journal rejouable.
  - Depends on : Taches 3 et 6.
  - Validate with : write local then export changes, crash/retry safe, tombstone preserved.

- [ ] Tache 8 : Definir les regles de merge par domaine
  - Fichiers : `lib/core/sync/merge_policy.dart`, `lib/features/*/domain/*`, tests.
  - Action : Documenter et implementer les policies: settings last-write per field, snippets/dictionary by entity revision, clipboard append/dedupe/tombstone, transcriptions immutable-with-edit-revisions.
  - User story link : sync multi-appareils doit etre deterministe.
  - Depends on : Tache 7.
  - Validate with : conflict matrix unit tests.

- [ ] Tache 9 : Creer l'interface de transport sync
  - Fichiers : `lib/core/sync/sync_transport.dart`, `lib/core/sync/sync_engine.dart`, tests.
  - Action : Definir list/upload/download/delete-or-archive/checkpoint abstraits, avec erreurs normalisees `needsReauth`, `quotaExceeded`, `rateLimited`, `offline`, `corruptRemote`, `unsupportedVersion`.
  - User story link : Drive/Dropbox/OneDrive/P2P/Firebase ne doivent pas toucher le domaine produit.
  - Depends on : Tache 6.
  - Validate with : fake transport tests.

- [ ] Tache 10 : Implementer export/import fichier chiffre
  - Fichiers : `lib/core/sync/transports/file_sync_transport.dart`, Settings UI, tests manuels.
  - Action : Permettre export/import manuel d'un bundle chiffre comme premier transport zero-serveur et outil de recovery.
  - User story link : premiere sync sans cout infra ni provider API complexe.
  - Depends on : Taches 6 a 9.
  - Validate with : export from device A, import on device B, no plaintext in bundle.

- [ ] Tache 11 : Implementer pairing appareil V1
  - Fichiers : `lib/core/sync/pairing/`, Settings UI, tests.
  - Action : Ajouter un QR code ou phrase de pairing qui transmet les infos minimales pour joindre le groupe de sync et partager les cles de maniere chiffree.
  - User story link : l'utilisateur doit connecter mobile/desktop avec peu de friction.
  - Depends on : Taches 5 et 6.
  - Validate with : pair two local test profiles, reject wrong phrase, revoke device.

- [ ] Tache 12 : Ajouter Google Drive appDataFolder transport
  - Fichiers : `lib/core/sync/transports/google_drive_appdata_transport.dart`, auth provider integration, docs.
  - Action : Utiliser `drive.appdata` pour stocker et lister des enveloppes chiffrees dans `appDataFolder`.
  - User story link : utiliser le compte cloud utilisateur plutot que nos serveurs.
  - Depends on : Taches 9 et 11 + docs officielles Google revalidees.
  - Validate with : OAuth test account, upload/list/download envelopes, auth revoke path.
  - Notes : provider recommande en premier pour Android/Google audience, sous reserve de verification implementation Flutter.

- [ ] Tache 13 : Ajouter Dropbox App Folder transport
  - Fichiers : `lib/core/sync/transports/dropbox_app_folder_transport.dart`, provider config docs.
  - Action : Utiliser App folder access pour stocker des enveloppes chiffrees sous la racine app.
  - User story link : offrir une alternative user-owned cloud frequente.
  - Depends on : Taches 9 et 11 + production approval Dropbox plan.
  - Validate with : dev account, linked user, upload/list/download, revoke, production review checklist.

- [ ] Tache 14 : Ajouter OneDrive app folder transport
  - Fichiers : `lib/core/sync/transports/onedrive_app_folder_transport.dart`, Microsoft Graph auth docs.
  - Action : Utiliser `Files.ReadWrite.AppFolder` et `/special/approot` pour stocker les enveloppes chiffrees.
  - User story link : couvrir les utilisateurs Microsoft 365/Windows.
  - Depends on : Taches 9 et 11 + docs Microsoft Graph revalidees.
  - Validate with : consumer and work/school account smoke, quota/delete folder handling.

- [ ] Tache 15 : Ajouter WebDAV transport avance
  - Fichiers : `lib/core/sync/transports/webdav_transport.dart`, Settings advanced UI, docs.
  - Action : Permettre aux utilisateurs avances d'utiliser Nextcloud, NAS ou autre WebDAV comme boite aux lettres chiffree.
  - User story link : reduire dependance aux grands providers et aux serveurs WinGlows.
  - Depends on : Tache 9.
  - Validate with : local WebDAV test container or known provider, auth failure and retry tests.

- [ ] Tache 16 : Ajouter le moteur sync asynchrone
  - Fichiers : `lib/core/sync/sync_engine.dart`, `lib/core/sync/sync_scheduler.dart`, providers Riverpod, tests integration.
  - Action : Orchestrer pull, validate, decrypt, apply, push, checkpoint, backoff et statut UI.
  - User story link : les appareils non simultanement en ligne doivent converger.
  - Depends on : Taches 7 a 10; providers cloud peuvent etre ajoutes ensuite.
  - Validate with : fake transport multi-device tests, crash/retry tests, conflict tests.

- [ ] Tache 17 : Ajouter Settings UI de sync et appareils
  - Fichiers : `lib/features/settings/presentation/settings_screen.dart`, widgets dedies, tests widget.
  - Action : Exposer local-only, provider choisi, derniere sync, erreurs, retry, reauth, export/import, appareils lies et revoke.
  - User story link : l'utilisateur doit comprendre ou sont ses donnees et quoi faire quand ca bloque.
  - Depends on : Taches 10, 11 et 16.
  - Validate with : widget tests + manual flows.

- [ ] Tache 18 : Definir l'architecture P2P/rendezvous
  - Fichiers : `docs/technical/local-first-sync.md`, `shipglows_data/workflow/specs/p2p-rendezvous-relay.md` si necessaire.
  - Action : Specifier signaling, STUN/TURN, privacy metadata, fallback, quotas, rate limits et cout avant implementation.
  - User story link : P2P est utile pour sync live sans cloud central, mais pas suffisant seul.
  - Depends on : moteur sync asynchrone stable.
  - Validate with : adversarial review + cost model.
  - Notes : ne pas coder TURN/relay avant modele de cout et limites LTD.

- [ ] Tache 19 : Implementer P2P opportuniste beta
  - Fichiers : `lib/core/sync/transports/p2p_sync_transport.dart`, serveur signaling minimal si approuve, docs.
  - Action : Echanger des enveloppes via WebRTC data channel quand les appareils sont en ligne, avec fallback cloud utilisateur.
  - User story link : limiter cout et accelerer sync live.
  - Depends on : Tache 18 + fresh docs WebRTC et package Flutter verifies.
  - Validate with : two networks, mobile data vs Wi-Fi, TURN disabled/enabled test, relay cost instrumentation.

- [ ] Tache 20 : Ajouter un cost guardrail serveur
  - Fichiers : backend/license/rendezvous repo si existant, docs ops, analytics redacted.
  - Action : Definir quotas de signaling/relay, metrics de bande passante, cutoffs, abus prevention et alertes de cout.
  - User story link : le LTD ne doit pas creer un cout serveur illimite.
  - Depends on : Tache 18.
  - Validate with : load/cost spreadsheet or ops runbook before public beta.

- [ ] Tache 21 : Mettre a jour docs, onboarding et claims publics
  - Fichiers : `README.md`, `shipglows_data/business/*.md`, `shipglows_data/technical/*.md`, support/FAQ si present, changelog.
  - Action : Aligner les messages produit avec local-first, sync user-owned, E2EE, limites de provider et limites de relay.
  - User story link : pricing et confiance utilisateur dependent de claims honnetes.
  - Depends on : fonctionnalites implementees et verifiees.
  - Validate with : docs review + search de claims obsoletes.

# Acceptance Criteria

- [ ] CA 1 : Given une installation sans backend distant, when l'utilisateur navigue entre Voice Flows, Dictionary, Clipboard Snippet, Voice et Settings, then chaque page a un contenu local ou empty state utilisable, jamais un body vide/blanc.
- [ ] CA 2 : Given une donnee creee en local-only, when l'app redemarre, then la donnee reapparait.
- [ ] CA 3 : Given Firebase/Supabase/Drive/Dropbox sont absents, when l'utilisateur utilise les fonctions locales, then aucune exception backend ne bloque l'UI.
- [ ] CA 4 : Given un store UI, when on inspecte ses imports, then il depend de contrats produit et pas de provider cloud concret.
- [ ] CA 5 : Given un changement local, when il est enregistre, then un change record idempotent existe dans le journal local.
- [ ] CA 6 : Given un export fichier chiffre, when on inspecte le fichier brut, then aucun contenu utilisateur lisible ni cle BYO n'apparait.
- [ ] CA 7 : Given un bundle exporte depuis l'appareil A, when l'appareil B l'importe avec la bonne cle, then les donnees convergent sans doublons.
- [ ] CA 8 : Given un bundle corrompu, when l'utilisateur importe, then l'import est refuse sans modifier les donnees locales existantes.
- [ ] CA 9 : Given deux appareils modifies hors ligne, when ils synchronisent via fake transport dans un ordre quelconque, then le resultat final est deterministe.
- [ ] CA 10 : Given une suppression sur un appareil et une update stale sur un autre, when la sync converge, then la policy tombstone choisie est respectee.
- [ ] CA 11 : Given un provider utilisateur revoque OAuth, when la sync tourne, then le statut devient `needsReauth` et les changements restent pending localement.
- [ ] CA 12 : Given un quota provider depasse, when upload echoue, then l'utilisateur voit l'erreur et aucune donnee locale n'est perdue.
- [ ] CA 13 : Given Google Drive appDataFolder active, when une sync est lancee, then seules des enveloppes chiffrees sont creees/listables dans l'espace app-specific.
- [ ] CA 14 : Given Dropbox App Folder active, when une sync est lancee, then l'app n'a pas besoin d'acces Full Dropbox.
- [ ] CA 15 : Given OneDrive App Folder active, when une sync est lancee, then l'app utilise le scope app-folder minimal et gere la suppression utilisateur du dossier.
- [ ] CA 16 : Given deux appareils non connectes simultanement, when chacun accede plus tard au meme transport asynchrone, then ils convergent.
- [ ] CA 17 : Given deux appareils en ligne sur reseaux differents, when P2P reussit, then les enveloppes sont echangees sans stockage WinGlows de contenu.
- [ ] CA 18 : Given P2P echoue, when un transport asynchrone est configure, then l'app fallback sans perte et expose un statut comprehensible.
- [ ] CA 19 : Given un appareil est revoque, when il tente d'appliquer de nouvelles enveloppes, then il ne peut pas les dechiffrer ou les faire accepter.
- [ ] CA 20 : Given un contenu clipboard sensible ou private-field, when sync est activee, then les regles de privacy/retention clipboard sont appliquees avant toute enveloppe syncable.
- [ ] CA 21 : Given un utilisateur perd sa recovery key, when il demande restauration depuis cloud chiffre, then WinGlows explique qu'il ne peut pas dechiffrer les donnees.
- [ ] CA 22 : Given les docs publiques, when on cherche les claims de sync, then aucun texte ne promet une sync serveur illimitee non implementee.

# Test Strategy

- Unit tests:
  - schema local and migrations.
  - store CRUD for settings, transcriptions, clipboard, snippets, dictionary.
  - `SyncEnvelope` encode/decode, signature/MAC, corruption rejection.
  - merge policy matrix per domain.
  - provider error mapping.

- Integration tests:
  - two local database profiles with fake transport.
  - offline A/B concurrent writes then sync convergence.
  - tombstone vs stale update.
  - crash during apply and retry.
  - export/import encrypted bundle.

- Widget/UI tests:
  - all main pages render in local-only mode.
  - Settings sync statuses and actions.
  - provider reauth/quota/conflict messages.

- Manual QA:
  - fresh Android install without backend defines.
  - create data on every page, kill app, relaunch.
  - pair two test profiles/devices.
  - Drive/Dropbox/OneDrive smoke with test accounts.
  - provider revoke and reconnect.
  - mobile data vs Wi-Fi P2P beta only after dedicated readiness.

- Security tests:
  - search logs for plaintext content/secrets.
  - inspect exported bundles and provider files for plaintext.
  - revoke device and verify new payloads inaccessible.
  - verify BYO OpenAI/Anthropic keys never enter sync journal.

- Cost/ops tests before any WinGlows relay:
  - measure signaling requests per pairing/session.
  - measure TURN/relay bandwidth under failure cases.
  - enforce rate limits and kill switch.

# Risks

- Data loss risk: local DB migrations and sync apply must be transactionally safe.
- Security risk: client-side crypto mistakes are severe; use audited libraries and adversarial review.
- UX risk: E2EE recovery keys can frustrate users; onboarding must be honest and short.
- Provider risk: Google/Dropbox/Microsoft API review, OAuth requirements, quota, rate limits and policy changes can affect sync.
- Dropbox scale risk: public app use requires production approval planning, not just dev tokens.
- P2P risk: WebRTC direct connection can fail; TURN relay fallback creates bandwidth cost.
- Cost risk: any WinGlows relay can become expensive under LTD; must be bounded before launch.
- Conflict risk: CRDT-like behavior may be overkill; simple operation log may fail for rich collaborative edits later.
- Product risk: too many sync options can confuse users; progressive disclosure is required.
- Privacy risk: clipboard and transcriptions may contain highly sensitive text; default sync policies must be conservative.
- Platform risk: background sync behavior differs by Android/iOS/desktop; first version should sync on app open/manual trigger unless platform proof exists.
- Scope risk: replacing all persistence and adding sync is large; ship in stages and do not wait for P2P to fix local mode.

# Execution Notes

Recommended staged execution:

1. Fix visible local mode reliability first. The blank-page bug is a product blocker independent of sync.
2. Introduce durable local storage and replace in-memory stores behind existing interfaces.
3. Add change journal, envelopes, crypto and fake transport tests before any external provider.
4. Ship export/import encrypted bundle as the first zero-infra sync/recovery path.
5. Add one user-owned cloud mailbox provider, recommended Google Drive appDataFolder first for Android affinity, then Dropbox and OneDrive.
6. Add P2P/rendezvous only after async sync works; treat P2P as speed/cost optimization, not base reliability.
7. Add any WinGlows relay only with rate limits, cost model and kill switch.

Files to read first before implementation:

- `lib/features/clipboard/domain/clipboard_store.dart`
- `lib/features/clipboard/application/clipboard_history_api.dart`
- `lib/features/settings/domain/settings_store.dart`
- `lib/features/voice/application/transcription_store.dart`
- `lib/features/*/application/*_store_provider.dart`
- `lib/core/sync/sync_status.dart`
- `lib/core/bootstrap/app_bootstrap.dart`
- `README.md`
- `shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md`
- `shipglows_data/workflow/specs/clipboard-backend-agnostic-api.md`

Packages and APIs:

- Recheck official docs before choosing local DB, crypto and WebRTC Flutter packages.
- Avoid custom crypto primitives.
- Avoid adding provider SDKs directly to UI modules.
- Avoid Cloud Functions/server storage as the first solution for content sync.

Stop conditions:

- A proposed implementation stores plaintext sync payloads in WinGlows infrastructure.
- A provider requires broad drive access when an app-folder/minimal-scope option is available.
- Local writes can be acknowledged without durable persistence.
- Conflict tests show data resurrection or silent loss.
- Relay/P2P work starts before local durable + async fake transport is stable.
- Pricing copy promises server-backed unlimited sync before cost guardrails exist.

# Open Questions

- Provider order: default proposal is export/import encrypted bundle first, Google Drive appDataFolder second, Dropbox third, OneDrive fourth, WebDAV advanced. Decision can change if user demand shows Dropbox first is more valuable for LTD buyers.
- Local DB choice: default proposal is a SQLite/Drift-like solution because migrations and queryability matter, but this must be verified against current Flutter/Dart docs before `/sf-start`.
- Merge model: default proposal is operation log + deterministic domain-specific merge, not full CRDT dependency, because WinGlows data is mostly records and settings. Revisit CRDT if real-time collaborative editing becomes a product goal.
- BYO API keys: default proposal is no sync in V1. A later opt-in could encrypt them with a separate recovery model, but the security bar is higher.
- Server role: default proposal is license/device metadata plus optional rendezvous/signaling. Content relay is beta-only, rate-limited, and never required for core sync when user-owned cloud is configured.
- LTD positioning: default proposal is to include local-first and user-owned sync in the LTD, while reserving any heavy WinGlows relay usage for bounded fair-use or future paid plans.

# Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-05-10 21:41:03 UTC | sf-spec | GPT-5 Codex | Created first local-first user-owned sync strategy spec from user direction to minimize WinGlows server costs and maximize local/user-cloud sync. | draft saved | `/sf-ready shipglows_data/workflow/specs/local-first-user-owned-sync-strategy.md` |

# Current Chantier Flow

- sf-spec: done on 2026-05-10, draft saved.
- sf-ready: not launched; required before implementation because scope touches data, security, sync, providers, pricing and infra cost.
- sf-start: not launched.
- sf-verify: not launched.
- sf-end: not launched.
- sf-ship: not launched.

Next command: `/sf-ready shipglows_data/workflow/specs/local-first-user-owned-sync-strategy.md`
