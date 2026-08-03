---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "0.1.0"
project: "WinGlowz"
created: "2026-04-26"
updated: "2026-05-09"
status: superseded
source_skill: sf-spec
scope: "migration"
owner: "Diane"
confidence: "medium"
user_story: "En tant que mainteneur de WinGlowz, je veux migrer toute l'application vers Flutter avec Supabase afin d'obtenir une base unique, performante, multi-plateforme et sans code applicatif JavaScript/TypeScript dans ce repo."
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Flutter"
  - "Supabase"
  - "OpenAI Whisper"
  - "Anthropic Messages API"
  - "Android overlay services"
  - "iOS speech and audio permissions"
  - "Desktop platform shells: macOS, Windows, Linux"
  - "Web build"
depends_on:
  - artifact: "docs/DECISIONS.md"
    artifact_version: "0.1.0"
    required_status: "reviewed"
  - artifact: "docs/MIGRATION_FLUTTER.md"
    artifact_version: "0.1.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/business/product.md"
    artifact_version: "0.1.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/architecture.md"
    artifact_version: "0.1.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/business/business.md"
    artifact_version: "0.1.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/business/branding.md"
    artifact_version: "0.1.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/technical/guidelines.md"
    artifact_version: "0.1.0"
    required_status: "reviewed"
  - artifact: "docs/API.md"
    artifact_version: "0.1.0"
    required_status: "reviewed"
  - artifact: "docs/API_SUPABASE.md"
    artifact_version: "0.1.0"
    required_status: "reviewed"
  - artifact: "docs/PLATFORM_BEHAVIOR.md"
    artifact_version: "0.1.0"
    required_status: "reviewed"
  - artifact: "docs/OVERLAY_ANDROID.md"
    artifact_version: "0.1.0"
    required_status: "reviewed"
  - artifact: "docs/VERIFICATION.md"
    artifact_version: "0.1.0"
    required_status: "reviewed"
supersedes:
  - "docs/MIGRATION_FLUTTER.md@0.1.0 as execution scope"
superseded_by: "shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md"
evidence:
  - "package.json"
  - "app/(tabs)/index.tsx"
  - "app/(tabs)/clipboard.tsx"
  - "app/(tabs)/settings.tsx"
  - "hooks/useVoiceRecording.ts"
  - "hooks/useOverlayPermissions.ts"
  - "components/OverlayBridge.tsx"
  - "convex/schema.ts"
  - "docs/API.md"
  - "docs/API_SUPABASE.md"
  - "docs/PLATFORM_BEHAVIOR.md"
  - "docs/OVERLAY_ANDROID.md"
  - "docs/VERIFICATION.md"
  - "shipglows_data/workflow/reviews/security-readiness-flutter-supabase.md"
  - "modules/floating-overlay/android/src/main"
next_step: "/sf-start shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md"
---

# Title

Migration totale WinGlowz vers Flutter + Supabase

> Superseded: this spec is no longer the active implementation target after the
> 2026-05-09 decision to use backend-agnostic contracts with Firebase as the
> first Android adapter. Keep it as migration history only. The active spec is
> `shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md`.
>
> Archived spec: do not execute new tasks from this document.

# Status

Superseded. Do not start new implementation from this spec.

# User Story

En tant que mainteneur de WinGlowz, je veux migrer toute l'application vers Flutter avec Supabase afin d'obtenir une base unique, performante, multi-plateforme et sans code applicatif JavaScript/TypeScript dans ce repo.

# Minimal Behavior Contract

WinGlowz doit devenir une application Flutter qui fonctionne sur Android, iOS, macOS, Windows, Linux et web, avec les memes workflows produit que l'app actuelle plus les zones deja prevues: dictee locale quand la plateforme la supporte, transcription avancee Whisper, nettoyage Claude optionnel, historique, clipboard synchronise, snippets, dictionnaire personnel, reglages, vraie authentification Supabase et overlay Android. En cas d'echec d'une permission, d'une cle API, d'un appel IA, d'une synchronisation Supabase ou d'une fonctionnalite non disponible sur une plateforme, l'utilisateur doit recevoir un etat explicite et recuperable sans perte de texte deja produit. L'edge case le plus facile a rater est l'overlay Android: il doit rester une capacite native Android isolee avec fallback clipboard, pendant que les autres plateformes gardent une experience complete sans promettre d'overlay systeme equivalent.

# Success Behavior

Un utilisateur peut installer ou lancer WinGlowz sur Android, iOS, macOS, Windows, Linux et web, se connecter via Supabase Auth, configurer ses cles OpenAI et Anthropic en stockage local securise quand la plateforme le permet, dicter du texte via le meilleur mode disponible sur la plateforme, obtenir un resultat nettoye, le copier, l'editer, le sauvegarder, le retrouver dans son historique synchronise, l'envoyer vers le clipboard partage, gerer ses snippets et son dictionnaire, puis retrouver ces donnees sur une autre plateforme connectee au meme compte.

Sur Android, l'utilisateur peut aussi activer l'overlay, demarrer une dictee depuis une autre application, arreter ou annuler l'enregistrement, puis recevoir le texte final dans le clipboard ou directement dans le champ actif quand le service d'accessibilite est autorise.

La preuve de succes est une verification multi-plateforme: builds Android, iOS, macOS, Windows, Linux et web; tests de schema Supabase; tests unitaires Dart; tests d'integration des repositories; tests manuels des permissions audio, clipboard et overlay; controle final confirmant qu'aucun code applicatif JavaScript/TypeScript ne reste dans le repo.

# Error Behavior

Si l'utilisateur refuse une permission micro, speech, overlay, notification ou accessibilite, l'app doit afficher l'etat bloque correspondant, proposer l'action de recuperation appropriee et ne jamais demarrer un enregistrement fantome. Si la cle OpenAI est absente, invalide ou si Whisper echoue, le mode avance doit refuser ou echouer proprement sans sauvegarder de transcription vide. Si Claude echoue, le texte brut doit rester disponible et le nettoyage local doit servir de fallback. Si Supabase est indisponible, l'app doit conserver l'etat local courant et exposer un etat de synchronisation en erreur; aucune mutation partielle ne doit produire de donnees orphelines, croisees entre utilisateurs ou visibles par un autre compte. Aucun secret utilisateur ne doit etre journalise, synchronise vers Supabase ou inclus dans un rapport d'erreur.

# Problem

Le repo actuel est une app Expo / React Native avec backend Convex en TypeScript, auth Clerk non branchee, identifiant temporaire `local-user`, et module Android natif d'overlay. Cette architecture ne correspond plus a la direction produit choisie: Flutter multi-plateforme, experience applicative premium, performances previsibles et repo final sans code applicatif JavaScript/TypeScript.

# Solution

Recreer WinGlowz comme app Flutter unique avec Supabase comme backend principal. Remplacer Convex par Supabase Auth, Postgres, Row Level Security et realtime. Porter la logique produit vers Dart, adapter le code Kotlin d'overlay Android via un plugin Flutter ou des platform channels, creer les shells Android/iOS/macOS/Windows/Linux/web, puis purger l'ancien code Expo, React Native, Convex et JavaScript/TypeScript apres verification de parite.

# Scope In

- Flutter app pour Android, iOS, macOS, Windows, Linux et web.
- Supabase Auth avec isolation reelle par utilisateur.
- Supabase schema pour transcriptions, clipboard items, snippets, dictionary, user settings et debug/event metadata minimale.
- Row Level Security pour toutes les donnees utilisateur.
- Migration fonctionnelle complete depuis les contrats Convex documentes.
- Voice screen: mode gratuit, mode avance, affichage, edition, copie, partage clipboard, historique.
- Clipboard screen: polling/capture quand disponible, listing, copie, pin, suppression, synchronisation.
- Settings screen: cles OpenAI/Anthropic locales, langue, permissions, logs, session auth.
- Snippets UI complete: liste, creation, edition, suppression, recherche par trigger.
- Dictionary UI complete: liste, creation, edition, suppression, application au nettoyage local.
- Android overlay natif: permission, service foreground, bulle, waveform, stop/cancel, injection accessibilite, fallback clipboard.
- iOS support sans overlay systeme Android.
- Desktop support Day 1 pour macOS, Windows et Linux avec experience adaptee aux capacites disponibles.
- Web support avec limitations explicites pour audio, stockage securise et clipboard selon navigateur.
- Docs cible: README, architecture Flutter, API Supabase, guide plateforme, guide verification.
- Suppression du code applicatif JavaScript/TypeScript du repo final.

# Scope Out

- Billing, abonnements, quotas premium et paiements.
- Migration automatique de donnees utilisateur Convex existantes en production, car le projet actuel n'a pas de deployment Convex configure et utilise `local-user`.
- Overlay systeme equivalent sur iOS, macOS, Windows, Linux ou web.
- Promesse de chiffrement de bout en bout.
- Distribution App Store, Play Store, Microsoft Store ou notarisation macOS.

# Constraints

- Le repo final ne doit contenir aucun code applicatif JavaScript/TypeScript.
- La migration se fait en une seule vague produit, mais l'execution doit etre decoupee par domaines et agents.
- Android, iOS, macOS, Windows, Linux et web sont des plateformes Day 1.
- L'overlay Android reste du code natif Kotlin, isole derriere une interface Dart.
- Les cles OpenAI et Anthropic restent locales a l'appareil et ne sont jamais stockees dans Supabase.
- Supabase RLS doit etre active avant toute utilisation multi-utilisateur.
- L'ancien raccourci `TEMP_USER_ID` / `local-user` ne doit pas etre reproduit dans la nouvelle app.
- Les textes vides ne doivent pas etre sauvegardes.
- L'utilisateur doit toujours pouvoir copier le texte final meme si l'injection automatique echoue.
- La synchronisation clipboard doit etre opt-in, visible et desactivable.
- Aucun service role key Supabase ne doit etre present dans une app Flutter, un bundle web, un log ou une variable publique.
- Les appels OpenAI/Anthropic directs sont un modele BYOK power-user; le web reste desactive pour le mode avance tant qu'un contrat direct/proxy n'est pas verifie.
- Les limites locales minimales sont: audio avance 10 minutes max, upload 25 MB max ou limite fournisseur plus basse, 2 retries automatiques max, timeout visible, payload texte borne selon `docs/PLATFORM_BEHAVIOR.md`.

# Security Contract

La migration a un impact securite eleve: voix, texte, clipboard, secrets BYOK, authentification, donnees multi-utilisateur et overlay Android. L'implementation doit appliquer les contrats suivants avant toute validation:

- Auth/RLS: toutes les tables utilisateur suivent `docs/API_SUPABASE.md`, utilisent `auth.uid()` comme seule source d'identite, activent RLS, definissent `using` et `with check`, refusent les utilisateurs anonymes et passent des tests SQL cross-user.
- Secrets: cles OpenAI/Anthropic locales uniquement, jamais synchronisees, jamais logguees, jamais affichees, jamais incluses dans debug export, crash report ou metadata Supabase.
- Stockage local: suivre `docs/PLATFORM_BEHAVIOR.md`; si le stockage securise est indisponible ou degrade, l'UI affiche l'etat degrade et desactive les modes cloud tant que l'utilisateur n'accepte pas explicitement le risque documente.
- IA directe: native mobile/desktop peut appeler OpenAI/Anthropic avec BYOK; web doit etre verifie explicitement et reste off si CORS, exposition de cle ou proxy non specifie bloquent le modele.
- Logs/erreurs: erreurs utilisateur typees et recuperables; logs techniques redactes; aucun corps brut de reponse fournisseur, audio, transcript brut sensible ou secret dans les logs copiables.
- Clipboard: capture/sync opt-in, pause/desactivation visibles, longueur bornee, pas de capture background interdite par plateforme, UX explicite que le contenu peut etre stocke dans Supabase.
- Overlay Android: demarrage uniquement par action utilisateur, notification foreground pendant enregistrement, pas d'injection silencieuse, fallback clipboard, pas d'injection dans champs sensibles quand detectable, transitions stop/cancel debounced.
- Offline/concurrence: delete wins, evenements realtime idempotents par `id` + `updated_at`, retries bornes, erreurs visibles, aucune perte de texte courant.
- Purge: aucune suppression JS/TS applicative sans snapshot verifie, dry-run, keep/delete rules, verification Flutter/Supabase/overlay et post-purge search.

# Dependencies

- Flutter SDK stable actuel, avec plateformes Android, iOS, macOS, Windows, Linux et web activees.
- Supabase project avec Auth, Postgres, Realtime et RLS.
- `supabase_flutter` 2.x comme client Supabase Flutter.
- `flutter_riverpod` 3.x pour l'etat applicatif; ne pas importer les APIs experimentales Riverpod.
- `go_router` 16.x pour navigation declarative, deep links auth et shells multi-plateformes.
- `flutter_secure_storage` 10.x pour les secrets locaux, avec comportement web documente separement.
- `speech_to_text` 7.3.x pour le mode dictee locale sur Android, iOS, macOS, web et Windows; Linux doit exposer le mode local comme indisponible et utiliser l'enregistrement audio + Whisper.
- `record` 6.2.x pour l'enregistrement audio avance sur Android, iOS, macOS, Windows, Linux et web.
- `permission_handler` 12.x pour permissions supportees par le package; permissions non couvertes, comme overlay Android, passent par le bridge natif.
- Clipboard Flutter: `Clipboard` de `package:flutter/services.dart` pour les operations standard, plus services natifs dedies uniquement si la capture automatique clipboard ne peut pas etre implementee proprement par plateforme.
- OpenAI Whisper API pour transcription avancee.
- Anthropic Messages API pour nettoyage IA optionnel.
- Kotlin Android pour overlay et accessibility service.
- `docs/API_SUPABASE.md` pour schema, contraintes, RLS, realtime et tests SQL.
- `docs/PLATFORM_BEHAVIOR.md` pour matrice secure storage, IA directe, clipboard et limites par plateforme.
- `docs/OVERLAY_ANDROID.md` pour contrat permission/service/accessibility/fallback.
- `docs/VERIFICATION.md` pour gate de validation technique, securite et purge.

Fresh external docs verdict: `fresh-docs checked`.

Sources officielles consultees:

- Flutter supported platforms: https://docs.flutter.dev/reference/supported-platforms
- Flutter architectural overview: https://docs.flutter.dev/resources/architectural-overview
- Flutter platform channels: https://docs.flutter.dev/platform-integration/platform-channels
- Supabase Dart reference: https://supabase.com/docs/reference/dart/introduction
- Supabase Flutter tutorial: https://supabase.com/docs/guides/getting-started/tutorials/with-flutter
- Supabase Realtime docs: https://supabase.com/docs/guides/realtime
- supabase_flutter pub.dev: https://pub.dev/packages/supabase_flutter
- flutter_riverpod pub.dev: https://pub.dev/packages/flutter_riverpod
- go_router pub.dev: https://pub.dev/packages/go_router
- flutter_secure_storage pub.dev: https://pub.dev/packages/flutter_secure_storage
- speech_to_text pub.dev: https://pub.dev/packages/speech_to_text
- record pub.dev: https://pub.dev/packages/record
- permission_handler pub.dev: https://pub.dev/packages/permission_handler
- Convex docs home: https://docs.convex.dev/home
- Convex Swift client docs: https://docs.convex.dev/client/swift

# Invariants

- Une transcription vide ou whitespace-only n'est jamais sauvegardee.
- Les donnees utilisateur sont toujours filtrees par l'utilisateur authentifie, pas par un identifiant client arbitraire.
- Les cles OpenAI et Anthropic ne quittent pas le stockage local sauf pour appeler directement les APIs correspondantes depuis le client, si cette decision est conservee.
- Le nettoyage IA ne doit pas changer l'intention de l'utilisateur.
- Un echec Claude ne bloque pas l'usage du texte brut.
- Un echec Supabase ne doit pas supprimer le texte courant.
- L'overlay Android a toujours un fallback clipboard.
- Les plateformes sans overlay systeme n'affichent pas de commande trompeuse.
- Toute limitation plateforme est explicite dans l'UI de reglages ou dans la documentation.
- Linux affiche la dictee locale on-device comme indisponible tant que `speech_to_text` ne supporte pas Linux; le mode avance Whisper reste le chemin de dictee Linux Day 1.
- Le repo final conserve `docs/DECISIONS.md` et cette spec ou son successeur.

# Links & Consequences

- Backend: remplacement complet de Convex par Supabase; les contrats `clipboard`, `transcriptions`, `snippets`, `dictionary` deviennent des tables Postgres avec RLS.
- Auth: remplacement du plan Clerk par Supabase Auth; les docs business doivent cesser de presenter Clerk comme cible active.
- Data: toutes les donnees passent d'un modele `userId` fourni par client a `auth.uid()` cote Supabase.
- Security: RLS, secret handling, logs et erreurs deviennent des points bloquants de readiness.
- Product: snippets et dictionary passent de tables partiellement exposees a UI complete.
- Platform: Android conserve des capacites supplementaires via overlay; iOS, macOS, Windows, Linux et web doivent avoir une experience complete sans overlay.
- Ops: Supabase migrations doivent devenir la source de verite schema.
- Docs: `shipglows_data/technical/architecture.md`, `shipglows_data/technical/guidelines.md`, `docs/API.md`, `docs/COMPONENTS.md`, `shipglows_data/business/business.md`, `shipglows_data/business/product.md` et `shipglows_data/business/branding.md` sont alignes comme contrats reviewed; `README.md` et les guides generes doivent rester coherents pendant l'implementation.

# Documentation Coherence

Docs a creer ou remplacer:

- `README.md`: quickstart Flutter/Supabase, plateformes supportees, commandes.
- `docs/ARCHITECTURE_FLUTTER.md`: architecture cible Dart, features, data layer, platform services.
- `docs/API_SUPABASE.md`: cree et reviewed; a transformer en migrations SQL executables pendant implementation.
- `docs/PLATFORM_BEHAVIOR.md`: cree et reviewed; a tenir a jour avec les verifications reelles par plateforme.
- `docs/OVERLAY_ANDROID.md`: cree et reviewed; a completer si le bridge Kotlin change.
- `docs/VERIFICATION.md`: cree et reviewed; a cocher avec les resultats effectifs.
- `docs/DECISIONS.md`: reviewed avec decision Flutter + Supabase.
- `shipglows_data/business/business.md`, `shipglows_data/business/product.md`, `shipglows_data/business/branding.md`, `shipglows_data/technical/architecture.md`, `shipglows_data/technical/guidelines.md`, `docs/API.md`, `docs/COMPONENTS.md`: reviewed et alignes sur cible Flutter + Supabase.
- `shipglows_data/workflow/reviews/security-readiness-flutter-supabase.md`: revue adversariale integree dans cette spec.

# Edge Cases

- Utilisateur connecte sur deux plateformes et modifie le meme transcript.
- Clipboard indisponible ou restreint sur web.
- Speech recognition indisponible sur une plateforme ou langue non supportee.
- Navigateur refuse micro ou clipboard.
- Desktop sans secure storage natif fiable selon OS.
- iOS suspend l'enregistrement en arriere-plan.
- Android 15 restreint les permissions d'overlay pour apps sideloaded.
- Accessibility service active mais aucun champ texte n'est focalise.
- Supabase offline ou timeout pendant sauvegarde.
- Realtime livre les evenements dans un ordre inattendu.
- Cle OpenAI/Anthropic invalide, expiree ou rate-limited.
- Texte tres long dans transcript, snippet ou clipboard.
- Snippet trigger duplique.
- Dictionnaire avec remplacement vide, boucle de remplacement ou casse sensible.
- Suppression concurrente d'un item deja affiche.
- Deconnexion pendant un enregistrement ou une mutation.
- Clipboard sync active par erreur sur contenu sensible.
- Rejeu ou double tap overlay qui tente deux enregistrements simultanes.
- Suppression concurrente pendant edition offline.
- Evenement realtime plus ancien que l'etat local.
- Web build sans modele direct/proxy acceptable pour OpenAI/Anthropic.

# Implementation Tasks

- [ ] Tache 1 : Creer un snapshot rollback avant purge
  - Fichier : hors repo ou archive locale
  - Action : Creer une copie complete du repo actuel avant suppression massive
  - User story link : proteger la migration totale
  - Depends on : aucun
  - Validate with : verifier que l'archive contient `app/`, `convex/`, `modules/floating-overlay/` et `docs/`
  - Notes : ne pas utiliser de commande destructive sans snapshot verifie

- [ ] Tache 2 : Figer les decisions de migration
  - Fichier : `docs/DECISIONS.md`
  - Action : Ajouter la decision Flutter + Supabase + plateformes Day 1 Android/iOS/macOS/Windows/Linux/web
  - User story link : rendre la direction autonome pour un agent frais
  - Depends on : Tache 1
  - Validate with : relire que Convex/Clerk sont remplaces comme cible
  - Notes : conserver l'historique de decision precedent

- [ ] Tache 3 : Creer la documentation cible minimale
  - Fichier : `docs/ARCHITECTURE_FLUTTER.md`, `docs/API_SUPABASE.md`, `docs/PLATFORM_BEHAVIOR.md`, `docs/OVERLAY_ANDROID.md`, `docs/VERIFICATION.md`
  - Action : Ecrire les contrats d'architecture avant purge du code source actuel
  - User story link : permettre une execution multi-agent coherente
  - Depends on : Tache 2
  - Validate with : chaque doc nomme les plateformes concernees et les limites connues
  - Notes : ces docs remplacent les anciennes references React Native/Convex

- [ ] Tache 4 : Initialiser le projet Flutter
  - Fichier : `pubspec.yaml`, `lib/main.dart`, `lib/app/`, `test/`, `integration_test/`
  - Action : Creer l'app Flutter avec Android, iOS, macOS, Windows, Linux et web actives
  - User story link : base unique multi-plateforme
  - Depends on : Tache 3
  - Validate with : `flutter doctor`, `flutter test`, `flutter build web`
  - Notes : ne pas ajouter de JS/TS applicatif

- [ ] Tache 5 : Definir l'architecture Dart
  - Fichier : `lib/app/`, `lib/core/`, `lib/features/`, `lib/data/`, `lib/services/`
  - Action : Creer les couches app shell, routing, theme, state, repositories et services plateformes
  - User story link : base bien codee et maintenable
  - Depends on : Tache 4
  - Validate with : tests unitaires des services abstraits et analyse Dart
  - Notes : utiliser `flutter_riverpod` 3.x sans APIs experimentales et `go_router` 16.x

- [ ] Tache 6 : Creer les migrations Supabase
  - Fichier : `supabase/migrations/*.sql`
  - Action : Creer tables `profiles`, `transcriptions`, `clipboard_items`, `snippets`, `dictionary_terms`, `user_settings`, `client_events` selon `docs/API_SUPABASE.md`
  - User story link : remplacer Convex avec backend moderne
  - Depends on : Tache 3
  - Validate with : appliquer migrations sur projet local ou remote de test + verifier contraintes non-empty, unique trigger par user, limites de longueur
  - Notes : SQL est autorise comme infrastructure backend; utiliser `user_id uuid not null default auth.uid()` pour les tables utilisateur

- [ ] Tache 7 : Activer Supabase Auth et RLS
  - Fichier : `supabase/migrations/*.sql`, `docs/API_SUPABASE.md`
  - Action : Ajouter policies `select/insert/update/delete` avec `using` et `with check`, profils `id = auth.uid()`, et aucune policy anonyme sur contenu utilisateur
  - User story link : vraie isolation utilisateur
  - Depends on : Tache 6
  - Validate with : tests SQL own-user allow, cross-user deny, unauth deny, forged `user_id` deny, realtime scoped
  - Notes : aucune table utilisateur ne doit rester sans RLS

- [ ] Tache 8 : Implementer le client Supabase Flutter
  - Fichier : `lib/data/supabase/`, `lib/features/auth/`
  - Action : Initialiser Supabase, session auth, repositories et erreurs typees
  - User story link : synchronisation multi-plateforme
  - Depends on : Tache 7
  - Validate with : tests repository avec client mock ou environnement de test
  - Notes : ne pas exposer service role key dans l'app

- [ ] Tache 9 : Implementer stockage local securise et settings
  - Fichier : `lib/features/settings/`, `lib/services/secure_storage/`
  - Action : Stocker OpenAI key, Anthropic key et langue preferee par plateforme selon `docs/PLATFORM_BEHAVIOR.md`, avec etat degrade explicite
  - User story link : controle utilisateur et secrets locaux
  - Depends on : Tache 5
  - Validate with : tests de facade storage, suppression/revocation de cles, test manuel par plateforme, absence de secrets dans logs
  - Notes : web/Linux peuvent etre degrades; cloud AI doit rester desactive ou explicitement accepte si stockage non fiable

- [ ] Tache 10 : Porter le nettoyage local et dictionnaire
  - Fichier : `lib/features/voice/domain/`, `lib/features/dictionary/`
  - Action : Reimplementer cleanup local en Dart et appliquer dictionary terms
  - User story link : texte exploitable sans IA externe obligatoire
  - Depends on : Tache 5, Tache 8
  - Validate with : tests unitaires sur ponctuation, mots de remplissage, remplacements
  - Notes : eviter les remplacements recursifs infinis

- [ ] Tache 11 : Implementer pipeline voice
  - Fichier : `lib/features/voice/`, `lib/services/audio/`, `lib/services/speech/`
  - Action : Implementer free speech recognition, advanced recording, Whisper, Claude fallback, limites duree/taille/retries/timeouts, et matrice direct/proxy web
  - User story link : coeur de valeur WinGlowz
  - Depends on : Tache 8, Tache 9, Tache 10
  - Validate with : tests unitaires d'etat, erreurs 401/403/429/413/timeout, tests manuels plateformes; verifier que Linux utilise advanced recording + Whisper et affiche le mode local indisponible
  - Notes : utiliser `speech_to_text` 7.3.x pour Android/iOS/macOS/web/Windows et `record` 6.2.x pour l'audio avance toutes plateformes

- [ ] Tache 12 : Implementer Voice UI
  - Fichier : `lib/features/voice/presentation/`
  - Action : Creer ecran dictee, mode toggle, resultat, edition, historique, actions copie/clipboard
  - User story link : workflow principal utilisateur
  - Depends on : Tache 11
  - Validate with : widget tests et test manuel
  - Notes : UI sobre, dense, lisible, adaptee outil productivite

- [ ] Tache 13 : Implementer Clipboard UI et sync
  - Fichier : `lib/features/clipboard/`
  - Action : Lister, copier, pin/unpin, supprimer, capturer clipboard quand plateforme disponible avec opt-in visible, pause/desactivation et bornes de longueur
  - User story link : clipboard partage multi-device
  - Depends on : Tache 8
  - Validate with : tests repository, widget tests, test manuel multi-session, verification qu'aucune sync clipboard n'arrive avant opt-in
  - Notes : le polling clipboard doit etre configurable, explicite et respectueux des restrictions plateforme

- [ ] Tache 14 : Implementer Snippets UI complete
  - Fichier : `lib/features/snippets/`
  - Action : Liste, creation, edition, suppression, recherche par trigger, insertion dans workflows texte
  - User story link : migration totale des capacites prevues
  - Depends on : Tache 8
  - Validate with : tests CRUD et edge cases triggers dupliques
  - Notes : triggers uniques par utilisateur

- [ ] Tache 15 : Implementer Dictionary UI complete
  - Fichier : `lib/features/dictionary/`
  - Action : Liste, creation, edition, suppression, application au cleanup
  - User story link : personnalisation du texte final
  - Depends on : Tache 10
  - Validate with : tests CRUD et tests cleanup
  - Notes : afficher clairement les effets des remplacements

- [ ] Tache 16 : Porter l'overlay Android vers Flutter
  - Fichier : `android/`, `lib/features/overlay/`, `lib/services/overlay/`
  - Action : Adapter Kotlin existant en plugin/platform channel, exposer show/hide/state/events/inject selon `docs/OVERLAY_ANDROID.md`
  - User story link : dictee depuis d'autres apps Android
  - Depends on : Tache 11
  - Validate with : build Android + tests permission denied, no focused field, non-editable field, sensitive field detectable, locked screen/background, rapid start/stop/cancel, logout active
  - Notes : repartir des fichiers `modules/floating-overlay/android/src/main`; demarrage uniquement par action utilisateur et notification foreground pendant enregistrement

- [ ] Tache 17 : Adapter comportements iOS, macOS, Windows, Linux et web
  - Fichier : `ios/`, `macos/`, `windows/`, `linux/`, `web/`, `lib/core/platform/`
  - Action : Declarer permissions, capabilities et fallbacks par plateforme
  - User story link : multi-plateforme reel
  - Depends on : Tache 11, Tache 13
  - Validate with : builds et tests manuels par plateforme disponible
  - Notes : pas d'overlay systeme hors Android

- [ ] Tache 18 : Refaire theme et design system Flutter
  - Fichier : `lib/core/theme/`, `lib/core/ui/`
  - Action : Reprendre l'identite WinGlowz avec composants Flutter coherents et accessibles
  - User story link : produit beau, performant, professionnel
  - Depends on : Tache 5
  - Validate with : widget tests de composants critiques et revue visuelle
  - Notes : eviter UI marketing; prioriser outil rapide et scannable

- [ ] Tache 19 : Purger l'ancien code JS/TS applicatif
  - Fichier : `app/`, `components/`, `hooks/`, `lib/*.ts`, `convex/`, `plugins/`, `package.json`, `package-lock.json`, `tsconfig.json`, `metro.config.js`
  - Action : Supprimer les anciens fichiers apres parite Flutter verifiee, dry-run revu, keep/delete rules explicites et snapshot rollback verifie
  - User story link : repo sans code applicatif JS/TS
  - Depends on : Tache 16, Tache 17
  - Validate with : `rg --files -g '*.ts' -g '*.tsx' -g '*.js' -g '*.jsx'` ne retourne aucun code applicatif; garder SQL, docs, assets utilises, Kotlin overlay et platform files
  - Notes : aucun agent ne fait cette purge sans validation explicite de `docs/VERIFICATION.md`

- [ ] Tache 20 : Verification finale multi-agent
  - Fichier : `docs/VERIFICATION.md`, CI config
  - Action : Executer analyse Dart, tests, builds, verification Supabase, matrice manuelle plateformes, security gate et purge gate
  - User story link : migration livrable et robuste
  - Depends on : Tache 19
  - Validate with : rapport final coche Android/iOS/macOS/Windows/Linux/web/backend/security/docs
  - Notes : ne pas shipper si Android overlay, auth/RLS ou voice pipeline restent non verifies

# Acceptance Criteria

- [ ] CA 1 : Given un repo migre, when `rg --files -g '*.ts' -g '*.tsx' -g '*.js' -g '*.jsx'` est execute, then aucun code applicatif JavaScript/TypeScript ne reste dans le repo.
- [ ] CA 2 : Given un utilisateur non connecte, when il ouvre l'app, then il peut s'authentifier via Supabase et aucune donnee utilisateur n'est chargee avant session valide.
- [ ] CA 3 : Given deux utilisateurs Supabase, when chacun cree des transcriptions, clipboard items, snippets et dictionary terms, then aucun utilisateur ne peut lire ou modifier les donnees de l'autre.
- [ ] CA 4 : Given une cle OpenAI absente, when l'utilisateur choisit le mode avance, then l'app refuse clairement l'action et ne demarre pas d'enregistrement avance.
- [ ] CA 5 : Given une dictee locale reussie, when le texte final est produit, then il est visible, copiable, editable et sauvegardable dans l'historique.
- [ ] CA 6 : Given Claude indisponible, when un nettoyage IA est demande, then le texte brut reste disponible et l'erreur est explicite.
- [ ] CA 7 : Given un clipboard item cree sur Android, when le meme compte ouvre iOS, macOS, Windows, Linux ou web, then l'item apparait apres synchronisation Supabase.
- [ ] CA 8 : Given un snippet avec trigger unique, when l'utilisateur l'edite, then la nouvelle valeur est synchronisee et l'ancien contenu n'est plus insere.
- [ ] CA 9 : Given un terme dictionary, when une transcription contient ce terme, then le remplacement attendu est applique sans boucle.
- [ ] CA 10 : Given Android avec overlay permission accordee, when l'utilisateur active la bulle, then elle apparait et peut declencher un enregistrement.
- [ ] CA 11 : Given Android sans permission accessibilite, when une dictee overlay se termine, then le texte est copie au clipboard et aucun crash d'injection ne se produit.
- [ ] CA 12 : Given iOS, macOS, Windows, Linux ou web, when l'utilisateur ouvre Settings, then l'app n'affiche pas une promesse d'overlay Android comme fonctionnalite disponible.
- [ ] CA 13 : Given le navigateur refuse le micro, when l'utilisateur tente une dictee web, then l'erreur indique comment recuperer ou que la plateforme est limitee.
- [ ] CA 14 : Given un texte vide, when une sauvegarde est tentee, then aucune transcription ni clipboard item vide n'est insere.
- [ ] CA 15 : Given une coupure Supabase pendant une mutation, when la connexion revient, then l'utilisateur voit un etat recuperable et aucune donnee incoherente n'est creee.
- [ ] CA 16 : Given la migration terminee, when README et docs sont lus, then ils ne mentionnent plus Expo, React Native, Convex ou Clerk comme implementation cible.
- [ ] CA 17 : Given Linux Day 1, when l'utilisateur choisit la dictee locale, then l'app affiche que ce mode est indisponible sur Linux et propose le mode avance Whisper sans crash.
- [ ] CA 18 : Given un client malveillant, when il tente d'inserer ou modifier une row avec le `user_id` d'un autre utilisateur, then Supabase RLS refuse l'action.
- [ ] CA 19 : Given clipboard sync desactive, when le clipboard local change, then aucun contenu clipboard n'est envoye a Supabase.
- [ ] CA 20 : Given un log exportable ou une erreur API, when une cle ou un payload fournisseur existe, then la sortie est redactee et ne contient ni secret, ni audio, ni transcript brut sensible.
- [ ] CA 21 : Given web sans contrat direct/proxy valide pour OpenAI/Anthropic, when l'utilisateur active le mode avance, then le mode est indisponible avec explication recuperable.
- [ ] CA 22 : Given deux edits concurrents puis une suppression, when realtime livre les evenements hors ordre, then l'etat final respecte `delete wins` et ne restaure pas la row supprimee.
- [ ] CA 23 : Given l'overlay Android actif, when l'utilisateur tapote rapidement start/stop/cancel, then un seul enregistrement existe et l'etat final est coherent.
- [ ] CA 24 : Given un audio trop long, trop lourd ou un fournisseur rate-limited, when le mode avance echoue, then l'erreur est lisible, bornee en retries et ne consomme pas de boucle automatique.
- [ ] CA 25 : Given la purge legacy, when le dry-run liste les suppressions, then docs, SQL Supabase, assets utilises, Kotlin overlay et platform files sont conserves.

# Test Strategy

- Tests unitaires Dart pour cleanup local, dictionary replacement, state machines voice, validators, repositories.
- Widget tests Flutter pour Voice, Clipboard, Settings, Snippets, Dictionary et auth flows.
- Tests integration repository contre Supabase local ou projet de test avec RLS active.
- Tests SQL/RLS pour verifier lecture/ecriture autorisee et interdite.
- Tests SQL/RLS pour forged `user_id`, unauthenticated deny, cross-user CRUD deny et realtime scoped.
- Tests de redaction logs/erreurs pour cles, audio, transcript brut sensible et payloads fournisseurs.
- Tests de limites: duree audio, taille upload, longueur texte, retries, timeout.
- Tests manuels Android: permissions audio, speech, overlay, foreground service, accessibility, clipboard fallback.
- Tests manuels iOS: permissions micro/speech, stockage cles, voice pipeline, sync.
- Tests desktop: lancement, auth, historique, clipboard et limitations documentees sur macOS, Windows et Linux.
- Tests web: build, auth, micro/clipboard browser permissions, graceful degradation.
- Verification statique: `flutter analyze`, `dart format`, `flutter test`.
- Verification build: Android APK/AAB, iOS build, web build, macOS build, Windows build et Linux build. Si l'environnement local ne peut pas produire un build natif pour un OS donne, la verification doit etre deleguee a une CI/runner compatible avant readiness de ship.
- Verification repo: recherche finale des fichiers JS/TS applicatifs et ancienne structure Expo/Convex.

# Risks

- Le scope est tres large: frontend, backend, auth, data, native Android, web, desktop et docs changent en meme temps.
- Supabase RLS mal configuree peut exposer des donnees utilisateur.
- Les packages Flutter speech/audio peuvent avoir des differences fortes par plateforme.
- Web, macOS, Windows et Linux n'auront pas toutes les capacites systeme de mobile.
- L'overlay Android est la partie la plus risquee et demande des tests sur vrai appareil.
- Stocker les cles OpenAI/Anthropic cote client conserve un modele power-user, pas un modele SaaS controle serveur.
- Les appels Whisper/Claude depuis le client peuvent exposer consommation et rate limits aux utilisateurs.
- Purger trop tot l'ancien code peut faire perdre des details produit et natifs.
- Multi-agent sans contrats stricts peut produire des abstractions incompatibles.

# Execution Notes

Fichiers a lire d'abord:

- `docs/SPEC_FLUTTER_SUPABASE_MIGRATION.md`
- `docs/MIGRATION_FLUTTER.md`
- `shipglows_data/business/product.md`
- `shipglows_data/business/business.md`
- `shipglows_data/technical/architecture.md`
- `shipglows_data/technical/guidelines.md`
- `docs/API.md`
- `docs/API_SUPABASE.md`
- `docs/PLATFORM_BEHAVIOR.md`
- `docs/OVERLAY_ANDROID.md`
- `docs/VERIFICATION.md`
- `shipglows_data/workflow/reviews/security-readiness-flutter-supabase.md`
- `modules/floating-overlay/android/src/main/java/expo/modules/floatingoverlay/FloatingOverlayModule.kt`

Approche d'execution:

1. Creer snapshot rollback.
2. Creer docs cible.
3. Initialiser Flutter et Supabase.
4. Implementer backend/auth/RLS avant UI multi-utilisateur.
5. Implementer core Dart et repositories.
6. Implementer Voice/Clipboard/Settings.
7. Implementer Snippets/Dictionary.
8. Porter Android overlay.
9. Activer plateformes iOS/macOS/Windows/Linux/web et leurs fallbacks.
10. Purger ancien JS/TS applicatif seulement apres verification.

Decoupage agents prevu:

- Agent Backend Supabase: migrations, RLS, realtime, API docs.
- Agent Flutter Core: app shell, routing, theme, state management, platform abstractions.
- Agent Voice Pipeline: speech, audio, Whisper, Claude, cleanup, dictionary application.
- Agent Product UI: Voice, Clipboard, Settings, Snippets, Dictionary.
- Agent Android Native: overlay Kotlin, platform channel, permissions, accessibility injection.
- Agent Platform QA: Android/iOS/macOS/Windows/Linux/web builds, verification docs, repo purge checks.

Contraintes de coordination:

- Chaque agent doit posseder un write set distinct.
- Les contrats partages passent par `lib/core/`, `lib/data/` et les docs cible.
- Aucun agent ne supprime l'ancien code tant que la tache 19 n'est pas explicitement atteinte.
- Aucun agent ne contourne Supabase RLS avec un identifiant utilisateur fourni par le client.
- Stop condition immediate si auth/RLS, overlay Android ou pipeline voice ne peuvent pas etre verifies.

# Open Questions

None.

Decisions already fixed for implementation: the scope includes Android, iOS, macOS, Windows, Linux, web, Supabase, real auth, snippets, dictionary, Android overlay, target docs and final application JS/TS purge.

The selected baseline packages are `supabase_flutter` 2.x, `flutter_riverpod` 3.x, `go_router` 16.x, `flutter_secure_storage` 10.x, `speech_to_text` 7.3.x, `record` 6.2.x and `permission_handler` 12.x. If current docs contradict these versions during implementation, stop and rerun `/sf-spec` or `/sf-ready` before coding past the dependency layer.
