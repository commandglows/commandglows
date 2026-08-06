---
artifact: business_context
metadata_schema_version: "1.0"
artifact_version: "1.2.0"
project: "CommandGlows"
created: "2026-03-18"
updated: "2026-08-06"
status: "reviewed"
source_skill: "sf-docs"
scope: "business"
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
  - "docs/API.md"
  - "README.md"
  - "shipglows_data/workflow/audits/2026-06-10-commandglows-platform-parity.md"
business_model: "14-day trial-then-paid voice productivity app with bring-your-own-key advanced features and bounded founder plans"
market: "Cross-platform dictation, transcript cleanup, snippets, dictionary, and clipboard productivity tools"
target_audience: "Professionals and power users who produce text from speech across Android, iOS, desktop, and web"
value_proposition: "Capture speech quickly from the Android keyboard, overlay or platform quick-action surface, use local language packs where available, clean text when needed, and reuse it across apps with sync paths designed to avoid unbounded server cost"
depends_on: []
supersedes: []
next_review: "2026-05-26"
next_step: "$sf-docs update"
---

# Business — CommandGlows

## Statut de preuve

Ce document sépare explicitement:

- `legacy-current`: état réel pré-migration (Expo/Convex/Clerk non branché).
- `target-reviewed`: cible validée Flutter avec contrats backend-agnostiques, Firebase comme premier adaptateur, Android comme première surface native avancée, et parité fonctionnelle quasi complète comme direction produit.
- `out-of-scope`: hors migration actuelle.

## Mission

Libérer les mains des professionnels grâce à la dictée vocale intelligente, en transformant la parole en texte propre et exploitable rapidement.

## Proposition de valeur

CommandGlows cible une application Flutter multi-plateforme avec contrats backend-agnostiques et Firebase comme premier adaptateur distant. Le produit combine un clavier Android natif comme surface prioritaire sur Android, des overlays ou quick actions adaptés par plateforme, dictée locale par packs de langue téléchargeables quand disponible, fallback de transcription explicite, nettoyage IA Claude optionnel avec clé Anthropic locale BYO, historique synchronisé, snippets et dictionnaire personnel.

## Capacités business de référence

| Capacité | Statut | Preuve |
|---|---|---|
| App Flutter multi-plateforme, Android avancé en premier | target-reviewed | `docs/DECISIONS.md`, `commandglows_app/README.md` |
| Backend-agnostic stores + Firebase first adapter | target-reviewed | `docs/DECISIONS.md` |
| Clés OpenAI/Anthropic BYO stockées localement | target-reviewed | `docs/SPEC_FLUTTER_SUPABASE_MIGRATION.md` |
| Snippets + dictionnaire comme fonctionnalités produit | target-reviewed | `docs/SPEC_FLUTTER_SUPABASE_MIGRATION.md` |
| Clavier Android natif CommandGlows | target-reviewed | `shipglows_data/workflow/specs/android-ime-commandglows_app-keyboard.md` |
| Overlay / quick actions par plateforme | target-reviewed | `shipglows_data/workflow/specs/windows-desktop-overlay-hotkeys-parity.md`, `shipglows_data/workflow/specs/macos-linux-desktop-overlay-hotkeys-parity.md` |
| Packs vocaux locaux téléchargeables | target-reviewed | `shipglows_data/workflow/specs/keyboard-action-bar-voice-recording.md` |
| Expo/Convex/Clerk comme implémentation cible | out-of-scope | explicitement exclu de la cible finale |
| Quotas gratuits / premium / billing | target-reviewed | contrat d'entitlement et paiement enregistré dans `shipglows_data/technical/payment-activation-entitlements.md` |

## Modèle commercial

Le modèle commercial target-reviewed est `trial_then_paid`: essai initial de
14 jours, deux relances maximum de 14 jours, puis achat obligatoire pour
l'accès premium. Les clés BYO restent locales et ne constituent pas un
entitlement. La garantie commerciale de 30 jours est une fenêtre de
remboursement, pas une expiration automatique de l'accès.

### Offre target-reviewed (post-migration attendue)

- L'utilisateur se connecte avec l'adaptateur auth actif, Firebase Auth pour le premier MVP Android.
- Les données utilisateur sont isolées via les règles de sécurité de l'adaptateur actif.
- Les clés OpenAI/Anthropic restent locales à l'appareil et ne sont pas stockées dans le backend distant.
- L'utilisateur gère transcriptions, clipboard, snippets et dictionnaire depuis son compte.
- Le clavier Android CommandGlows reste disponible uniquement sur Android et sert de surface prioritaire dans les champs texte.
- L'overlay Android reste disponible sur Android avec fallback clipboard; Windows, macOS et Linux utilisent des hôtes desktop natifs avec raccourci/fenêtre/clipboard selon les limites OS; iOS et web doivent passer par des chantiers d'adaptation explicites avant toute promesse publique.
- La dictée clavier vise un mode local-first par packs de langue installables; les langues non couvertes doivent utiliser un fallback explicite et ne doivent pas être présentées comme offline garanties.

### État legacy-current (pré-migration, à ne pas présenter comme cible)

- Application Expo/React Native.
- Backend Convex avec `local-user`.
- Auth Clerk non branchée.

## Impact sécurité et mitigations

`security_impact: high` parce que le produit manipule voix, texte potentiellement sensible, clipboard, clés API BYO et synchronisation cloud.

Mitigations obligatoires pour readiness migration:

1. Auth distante obligatoire avant usage multi-utilisateur; suppression du pattern `TEMP_USER_ID`.
2. Règles de sécurité backend obligatoires sur toutes les collections/tables utilisateur.
3. Clés OpenAI/Anthropic en stockage local sécurisé seulement; interdiction de sync distante et de logs en clair.
4. Redaction systématique des secrets dans logs/erreurs/analytics.
5. Interdiction de sauvegarder des textes vides; fallback texte brut si nettoyage IA échoue.
6. Clavier Android et overlay/quick actions par plateforme derrière actions utilisateur explicites, avec private mode et états dégradés visibles pour champs sensibles et limites OS.

## Persona principal

**Le Multitâche**

- Professionnel en mobilité et sur poste fixe: commercial, consultant, manager ou indépendant.
- Rédige des emails, notes de réunion et comptes-rendus en déplacement.
- Enchaîne les contextes de travail et veut capturer l'information sans taper.
- Valorise la vitesse, la précision et la disponibilité immédiate du texte.

## Marché cible

- **Segment** : productivité voice-to-text cross-platform.
- **Usage prioritaire** : transformer une pensée ou note vocale en texte exploitable sur mobile et desktop.
- **Contrainte produit** : aucune promesse sécurité/compliance/quota hors comportements vérifiés.

## Avantage concurrentiel

1. **Pipeline hybride BYO**: local + Whisper + nettoyage IA optionnel.
2. **Entrées natives adaptées**: clavier IME Android pour écrire dans les champs; overlay ou quick actions par plateforme pour capture flottante, raccourci, partage ou clipboard avec fallback robuste.
3. **Données structurées utiles**: transcriptions + clipboard + snippets + dictionnaire synchronisés par compte.

## Stratégie Go-to-Market

- Lancement initial auprès d'utilisateurs techniques capables de configurer leurs clés API BYO.
- Positionnement migration: outil de productivité voice-first multi-plateforme, Android avancé en premier, avec sécurité de base robuste côté auth/règles backend et limites plateforme explicites.
- Les extensions premium restent post-migration et non promises à ce stade.

## Métriques clés

| Métrique | Statut | Description |
|---|---|---|
| Minutes transcrites | target-reviewed | Instrumentation à implémenter côté Flutter/adaptateur backend |
| Nombre de transcriptions | target-reviewed | Mesurable par compte distant |
| Utilisation clipboard | target-reviewed | Mesurable via store clipboard et événements UI |
| Utilisation snippets/dictionnaire | target-reviewed | Mesurable sur CRUD dédiés |
| Conversion premium | out-of-scope | Nécessite billing non inclus dans la migration |
