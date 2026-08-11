---
artifact: business_context
metadata_schema_version: "1.0"
artifact_version: "1.5.0"
project: "CommandGlows"
created: "2026-03-18"
updated: "2026-08-11"
status: "reviewed"
source_skill: "sg-docs"
scope: "business"
owner: "Diane"
confidence: "medium"
risk_level: "medium"
docs_impact: "yes"
security_impact: "high"
evidence:
  - "commandglows_app/README.md"
  - "commandglows_app/lib/features/auth/presentation/trial_access_screen.dart"
  - "commandglows_site/src/pages/api/commerce/checkout.ts"
  - "commandglows_site/src/pages/api/commerce/webhooks/stripe.ts"
  - "shipglows_data/technical/architecture.md"
  - "shipglows_data/technical/payment-activation-entitlements.md"
  - "shipglows_data/workflow/audits/2026-06-10-commandglows-platform-parity.md"
  - "Operator decision 2026-08-11: Stripe Managed Payments is the target Merchant of Record for CommandGlows."
business_model: "14-day trial-then-paid voice productivity app with bring-your-own-key advanced features and bounded founder plans"
market: "Cross-platform dictation, transcript cleanup, snippets, dictionary, and clipboard productivity tools"
target_audience: "Professionals and power users who produce text from speech across Android, iOS, desktop, and web"
value_proposition: "Capture speech quickly from the Android keyboard, overlay or platform quick-action surface, use local language packs where available, clean text when needed, and reuse it across apps with sync paths designed to avoid unbounded server cost"
depends_on: []
supersedes: []
next_review: "2026-09-11"
next_step: "Validate the customer trial-to-purchase journey and hosted payment lifecycle before public launch."
---

# Business — CommandGlows

## Payment Provider Decision

CommandGlows uses Stripe Managed Payments as its target Merchant of Record for
direct digital-product sales. Ordinary Stripe Payments does not satisfy this
decision. Convex remains the source of truth for product access, and the current
Stripe checkout, signed webhook, and HMAC-signed app identity handoff are
implemented and locally verified. Lemon Squeezy remains active only for
CommunityGlows; hosted Stripe and Convex lifecycle proof is still required.

## Statut de preuve

Ce document sépare explicitement:

- `implementation-current`: comportement présent dans le dépôt et vérifié localement.
- `target-reviewed`: direction validée qui demande encore une preuve hébergée, native ou de production.
- `historical`: ancien contexte de migration, sans autorité sur le runtime actuel.

## Mission

Libérer les mains des professionnels grâce à la dictée vocale intelligente, en transformant la parole en texte propre et exploitable rapidement.

## Proposition de valeur

CommandGlows cible une application Flutter multi-plateforme avec contrats backend-agnostiques et Firebase comme premier adaptateur distant. Le produit combine un clavier Android natif comme surface prioritaire sur Android, des overlays ou quick actions adaptés par plateforme, dictée locale par packs de langue téléchargeables quand disponible, fallback de transcription explicite, nettoyage IA Claude optionnel avec clé Anthropic locale BYO, historique synchronisé, snippets et dictionnaire personnel.

## Capacités business de référence

| Capacité | Statut | Preuve |
|---|---|---|
| App Flutter multi-plateforme, Android avancé en premier | implementation-current | `commandglows_app/README.md` |
| Backend-agnostic stores + Firebase first adapter | implementation-current | `shipglows_data/technical/architecture.md` |
| Clés OpenAI/Anthropic BYO stockées localement | implementation-current | `commandglows_app/lib/features/settings/` |
| Snippets + dictionnaire comme fonctionnalités produit | implementation-current | `commandglows_app/lib/features/` |
| Clavier Android natif CommandGlows | target-reviewed | `shipglows_data/workflow/specs/android-ime-commandglows_app-keyboard.md` |
| Overlay / quick actions par plateforme | target-reviewed | `shipglows_data/workflow/specs/windows-desktop-overlay-hotkeys-parity.md`, `shipglows_data/workflow/specs/macos-linux-desktop-overlay-hotkeys-parity.md` |
| Packs vocaux locaux téléchargeables | target-reviewed | `shipglows_data/workflow/specs/keyboard-action-bar-voice-recording.md` |
| Expo/Convex/Clerk comme implémentation cible | out-of-scope | explicitement exclu de la cible finale |
| Essai, accès payé et billing | implementation-current, preuve hébergée ouverte | `shipglows_data/technical/payment-activation-entitlements.md` |

## Modèle commercial

Le modèle commercial target-reviewed est `trial_then_paid`: essai initial de
14 jours, deux relances maximum de 14 jours, puis achat obligatoire pour
l'accès premium. Les clés BYO restent locales et ne constituent pas un
entitlement. La garantie commerciale de 30 jours est une fenêtre de
remboursement, pas une expiration automatique de l'accès.

Le socle technique local applique désormais l'expiration d'essai par identité
globale et installation aléatoire pseudonymisée côté serveur, et ne délivre
plus de grant gratuit permanent pour `commandglows_app`. Une fenêtre réseau
temporaire limite les créations d'essai sans conserver l'IP brute. Le parcours
client de relance/achat est présent localement; la preuve hébergée du paiement
et la rétention automatisée des signaux de risque restent à finaliser.

### Offre actuelle et limites de preuve

- L'utilisateur se connecte avec l'adaptateur auth actif, Firebase Auth pour le premier MVP Android.
- Les données utilisateur sont isolées via les règles de sécurité de l'adaptateur actif.
- Les clés OpenAI/Anthropic restent locales à l'appareil et ne sont pas stockées dans le backend distant.
- L'utilisateur gère transcriptions, clipboard, snippets et dictionnaire depuis son compte.
- Le clavier Android CommandGlows reste disponible uniquement sur Android et sert de surface prioritaire dans les champs texte.
- L'overlay Android reste disponible sur Android avec fallback clipboard; Windows, macOS et Linux utilisent des hôtes desktop natifs avec raccourci/fenêtre/clipboard selon les limites OS; iOS et web doivent passer par des chantiers d'adaptation explicites avant toute promesse publique.
- La dictée clavier vise un mode local-first par packs de langue installables; les langues non couvertes doivent utiliser un fallback explicite et ne doivent pas être présentées comme offline garanties.

### Contexte historique de migration (sans autorité runtime)

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
| Conversion premium | implementation-current | Checkout local implémenté; instrumentation et preuve hébergée restent à compléter |
