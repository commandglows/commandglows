---
artifact: product_context
metadata_schema_version: "1.0"
artifact_version: "1.1.0"
project: "CommandGlows"
created: "2026-04-26"
updated: "2026-06-10"
status: "reviewed"
source_skill: "sf-docs"
scope: "product"
owner: "Diane"
confidence: "medium"
risk_level: "medium"
docs_impact: "yes"
security_impact: "high"
evidence:
  - "docs/SPEC_FLUTTER_SUPABASE_MIGRATION.md"
  - "docs/MIGRATION_FLUTTER.md"
  - "docs/DECISIONS.md"
  - "shipglows_data/technical/architecture.md"
  - "shipglows_data/technical/guidelines.md"
  - "docs/API.md"
  - "shipglows_data/workflow/audits/2026-06-10-commandglows-platform-parity.md"
target_user: "Professionals and power users capturing text from speech across mobile, desktop, and web"
user_problem: "Typing is slow or disruptive in contexts where quick dictation, cleanup, and structured reuse matter"
desired_outcomes:
  - "Capture speech quickly in local or advanced modes"
  - "Reuse transcripts through copy, edit, shared clipboard, snippets, and dictionary workflows"
  - "Use a native Android keyboard entrypoint for typing, dictation, clipboard actions, snippets entry points, and play/pause media"
  - "Use overlay or quick-action capture through the platform host available on Android, desktop, iOS, or web"
non_goals:
  - "Not a billing-enabled premium product in migration scope"
  - "Not a promise of identical OS-level overlay mechanics on every platform"
  - "Not a system keyboard/IME product outside Android"
  - "Not a JS/TS application codebase in final target repository"
depends_on:
  - "shipglows_data/business/business.md@0.1.0"
  - "shipglows_data/business/branding.md@0.1.0"
supersedes: []
next_review: "2026-05-26"
next_step: "$sf-docs update"
---

# Product — CommandGlows

## Cadre de référence

Ce document décrit la cible `target-reviewed` actuelle: Flutter partagé, contrats backend-agnostiques, Firebase comme premier adaptateur distant, et parité fonctionnelle quasi complète par défaut entre Android, iOS, Windows, macOS, Linux et web. Android reste la première surface native avancée pour l'IME; les éléments Expo/Convex/Clerk/Supabase sont conservés uniquement comme contexte de migration quand ils existent encore dans le repo.

## Problème utilisateur

Les utilisateurs produisent souvent du texte dans des contextes où taper est lent, peu pratique ou interrompt le flux de travail. CommandGlows vise à transformer rapidement la parole en texte copiable, modifiable, synchronisé et réutilisable.

## Utilisateurs cibles

- Professionnels qui rédigent notes, emails ou comptes-rendus sur mobile et desktop.
- Power users qui acceptent de configurer leurs propres clés API pour obtenir une meilleure transcription.
- Utilisateurs Android qui veulent déclencher la dictée hors application via overlay.
- Utilisateurs Android qui veulent écrire et dicter depuis un clavier CommandGlows dans n'importe quel champ compatible.
- Utilisateurs desktop ou iOS/web qui veulent retrouver le concept CommandGlows par overlay, raccourci, partage, clipboard ou autre adaptation native honnête.

## Workflows cœur

### Dictée rapide

1. L'utilisateur se connecte via l'adaptateur auth actif, Firebase Auth pour le premier MVP Android.
2. Il ouvre l'écran Voice et choisit mode local ou avancé.
3. Il enregistre sa voix.
4. CommandGlows affiche le texte brut puis le texte nettoyé si applicable.
5. L'utilisateur copie, modifie, sauvegarde, ou envoie le texte vers le clipboard.

### Mode avancé

1. L'utilisateur ajoute une clé OpenAI locale dans Settings.
2. Il active le mode Advanced.
3. L'application enregistre l'audio et l'envoie à Whisper.
4. Le texte est nettoyé localement ou via Claude si la clé Anthropic locale existe.
5. En cas d'échec Claude, le texte brut reste disponible et sauvegardable.

### Clipboard + snippets + dictionnaire

1. L'utilisateur peut envoyer une transcription vers le clipboard synchronisé.
2. Il peut copier, épingler ou supprimer des éléments clipboard.
3. Il gère des snippets (CRUD + recherche trigger).
4. Il gère un dictionnaire personnel (CRUD + application au nettoyage local).

### Overlay et quick actions par plateforme

1. Sur Android, l'utilisateur active les permissions overlay/accessibilité dans Settings.
2. Sur desktop, l'utilisateur déclenche CommandGlows via l'hôte natif disponible: raccourci, fenêtre flottante, clipboard et livraison best-effort quand l'OS l'autorise.
3. Sur iOS et web, le même concept doit être adapté par un chantier dédié: app principale, partage, raccourcis, clipboard ou expérience navigateur selon les limites de la plateforme.
4. Le résultat reste récupérable: livraison directe quand possible, fallback clipboard ou retour explicite sinon.
5. Les plateformes ne doivent pas afficher de contrôle trompeur: chaque surface montre uniquement les capacités réellement disponibles ou documentées comme dégradées.

### Clavier Android CommandGlows

1. L'utilisateur active CommandGlows keyboard dans les réglages de méthode de saisie Android.
2. Il bascule sur ce clavier depuis un champ texte compatible.
3. Il peut taper, dicter localement, coller/copier explicitement, ouvrir les snippets, et envoyer play/pause au média courant.
4. Les champs password, OTP ou privés désactivent dictée, capture clipboard, snippets enrichis et sync.

## Surface target-reviewed

- Flutter app avec focus d'exécution Android en premier.
- Contrats backend-agnostiques pour auth, settings, transcriptions, clipboard, snippets et dictionnaire.
- Firebase Auth + Firestore comme premier adaptateur distant.
- Écran Voice: capture locale (si supportée), capture avancée Whisper, sauvegarde, édition, copie.
- Clipboard: liste, copy, pin, suppression, synchronisation.
- Snippets: liste, création, édition, suppression, recherche trigger.
- Dictionnaire: liste, création, édition, suppression, application nettoyage.
- Settings: clés BYO locales, permissions, langue, session auth.
- Clavier Android natif via `InputMethodService` et bridge Flutter/Kotlin.
- Overlay / quick actions comme concept produit cross-platform, avec Android via bridge Flutter/Kotlin, Windows/macOS/Linux via hôtes desktop natifs, et iOS/web à spécifier par chantiers d'adaptation.

## Legacy-current (pré-migration, non cible)

- Expo/React Native + code applicatif TS.
- Backend Convex.
- Supabase comme cible couplée.
- Auth Clerk non branchée et `local-user`.

## Exigences sécurité produit et mitigations

`security_impact: high` car le flux produit manipule données vocales/texte, secrets BYO, clipboard et synchronisation cloud.

Mitigations obligatoires:

1. Auth distante active avant toute écriture remote de données utilisateur.
2. Règles de sécurité backend obligatoires et testées; Firebase Security Rules pour le premier adaptateur.
3. Clés OpenAI/Anthropic locales uniquement; jamais synchronisées.
4. Redaction des secrets et payloads sensibles dans logs/erreurs.
5. Refus explicite des sauvegardes de texte vide.
6. États erreurs récupérables pour permissions, API IA et sync distante.
7. Overlay / quick actions conditionnés par permissions et limites de chaque plateforme, avec fallback clipboard ou récupération explicite.
8. Clavier Android conditionné par activation utilisateur, private mode pour champs sensibles et sync clipboard opt-in.

## Non-goals actuels

- Pas de billing/entitlements dans la migration.
- Pas de promesse d'overlay système identique sur toutes les plateformes; chaque OS doit avoir un hôte natif, une adaptation meilleure ou une limite documentée.
- Pas de clavier système CommandGlows hors Android dans cette phase.
- Pas de promesse de chiffrement bout-en-bout.
- Pas de code applicatif JS/TS dans le repo final.
