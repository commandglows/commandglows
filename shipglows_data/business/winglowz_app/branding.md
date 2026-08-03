---
artifact: brand_context
metadata_schema_version: "1.0"
artifact_version: "1.1.0"
project: "WinGlows"
created: "2026-03-18"
updated: "2026-06-10"
status: "reviewed"
source_skill: "sf-docs"
scope: "branding"
owner: "Diane"
confidence: "medium"
risk_level: "low"
docs_impact: "yes"
security_impact: "none"
evidence:
  - "docs/SPEC_FLUTTER_SUPABASE_MIGRATION.md"
  - "shipglows_data/business/business.md"
  - "shipglows_data/business/product.md"
  - "shipglows_data/workflow/audits/2026-06-10-winglowz-platform-parity.md"
brand_voice: "Direct, productive, and honest about prerequisites"
trust_posture: "Do not overpromise auth, billing, privacy, or AI quality beyond verified code paths"
depends_on:
  - "shipglows_data/business/business.md@0.1.0"
supersedes: []
next_review: "2026-05-26"
next_step: "$sf-docs update"
---

# Branding — WinGlows

## Cadre

Ce document cadre la marque pour la cible `target-reviewed` Flutter + backend-agnostic avec Firebase comme premier adaptateur. Les mentions Expo/Convex/Clerk/Supabase appartiennent uniquement au contexte de migration quand elles existent encore dans le repo et ne doivent pas être utilisées comme promesse produit.

## Nom et identité

- **Nom** : WinGlows — contraction de Voice + Flow + z, cohérente avec l'écosystème WinGlows.
- **Promesse courte** : parler, nettoyer, copier.
- **Tagline actuelle dans l'app** : "Speak. Transcribe. Ship."
- **Tagline française utilisable** : "Parle. C'est écrit."

## Identité visuelle

### Cohérence écosystème

WinGlows peut rester visuellement relié à WinGlows, avec une identité orientée produit utilitaire: rapide, lisible, orientée action. La documentation ne doit pas promettre un design system partagé complet tant que les tokens communs ne sont pas versionnés.

### Couleurs

- **Fond sombre** : `#0f172a`
- **Surface** : `#1e293b`
- **Primaire** : `#6366f1`
- **Accent audio** : `#22d3ee`
- **Texte principal** : `#f8fafc`

### Accent audio

- Onde sonore animée pendant l'enregistrement.
- États visuels clairs : repos, enregistrement, traitement, résultat, erreur.
- Les animations servent le feedback fonctionnel.

## Typographie

- Polices système Flutter par plateforme (Android, iOS, desktop, web).
- Hiérarchie simple : titre, sous-titre, résultat, historique.
- Le texte transcrit doit rester lisible et facile à copier ou modifier.

## Ton de voix

- Direct, productif, sans jargon.
- Orienté action : enregistrer, transcrire, copier, synchroniser.
- Les messages de configuration doivent rester honnêtes sur les prérequis : compte via l'adaptateur actif, clé OpenAI BYO locale, clé Anthropic locale optionnelle, activation clavier Android, permissions Android overlay/accessibilité, hôte desktop natif ou adaptation iOS/web quand la plateforme le nécessite.
- Les plateformes non Android ne doivent pas recevoir de promesse de clavier système WinGlows. Elles peuvent recevoir une promesse d'overlay/quick action uniquement quand le host natif, l'adaptation ou la limitation dégradée est implémenté, testé et documenté.

## Valeurs de marque

| Valeur | Signification |
|---|---|
| Rapidité | L'utilisateur obtient vite un texte exploitable. |
| Discrétion | L'application doit rester légère dans le workflow mobile. |
| Précision | Le nettoyage IA améliore le texte sans changer l'intention. |
| Contrôle | Les clés API restent sur l'appareil et les permissions sont explicites. |

## Claims autorisés / interdits

### Claims autorisés (target-reviewed)

- "Application Flutter multi-plateforme."
- "Connexion et synchronisation de données via l'adaptateur actif."
- "Clés OpenAI/Anthropic BYO conservées localement."
- "Overlay ou quick action disponible selon plateforme, avec hôte natif ou adaptation documentée."
- "Clavier WinGlows disponible uniquement sur Android."
- "Snippets et dictionnaire personnel synchronisés par compte."

### Claims interdits tant que non implémentés

- "Billing premium actif", "quotas appliqués", "entitlements en production".
- "Chiffrement bout-en-bout".
- "Overlay système identique sur iOS/macOS/Windows/Linux/web".
- "Parité complète sur toutes les plateformes" sans preuve de QA et matrice de limites.

### Claims legacy-current à ne pas utiliser comme cible

- "Backend Convex", "auth Clerk en cours", "application Expo/React Native" comme direction produit.
