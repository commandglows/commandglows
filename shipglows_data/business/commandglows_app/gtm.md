---
artifact: gtm_context
metadata_schema_version: "1.0"
artifact_version: "1.1.0"
project: "CommandGlows"
created: "2026-04-26"
updated: "2026-06-10"
status: "reviewed"
source_skill: "sf-docs"
scope: "gtm"
owner: "Diane"
confidence: "medium"
risk_level: "medium"
docs_impact: "yes"
security_impact: "none"
evidence:
  - "shipglows_data/business/business.md"
  - "shipglows_data/business/product.md"
  - "lib/features/settings/presentation/settings_screen.dart"
target_segment:
  - "Mobile professionals dictating notes and messages"
  - "Android power users needing overlay-driven text capture"
  - "Desktop power users needing quick-action text capture with explicit platform limits"
offer: "A voice-first cross-platform workflow with Android-native entrypoints first, platform quick actions where available, downloadable local voice packs for supported languages, and optional advanced AI cleanup via user-provided keys"
channels:
  - "Internal APK distribution and direct demos"
  - "Cross-promotion to adjacent CommandGlows users"
  - "Workflow-led product content and demos"
proof_points:
  - "Flutter multi-platform shell exists"
  - "Firebase-first backend-agnostic adapter path exists"
  - "Android overlay bridge baseline exists"
  - "Windows/macOS/Linux desktop overlay host workstreams exist with native QA pending"
depends_on:
  - "shipglows_data/business/business.md@0.1.0"
  - "shipglows_data/business/branding.md@0.1.0"
  - "shipglows_data/business/product.md@0.1.0"
supersedes: []
next_review: "2026-05-26"
next_step: "$sf-docs update"
---

# GTM — CommandGlows

## Positionnement

CommandGlows est un produit sibling de CommandGlows dans le même écosystème. CommandGlows porte l'axe voice-first (dictée, transcription, nettoyage, clipboard), tandis que CommandGlows porte d'autres workflows de productivité.

## Segment prioritaire

Utilisateurs orientés productivité, en priorité :

- professionnels indépendants et power users qui dictent des notes/messages ;
- utilisateurs Android qui veulent capturer du texte hors application via overlay ;
- utilisateurs desktop qui veulent déclencher CommandGlows par raccourci, fenêtre flottante, clipboard ou livraison best-effort selon l'OS ;
- early adopters capables de configurer des clés BYO pour les modes IA avancés.

## Promesse publique sûre

"CommandGlows transforme la voix en texte réutilisable avec une base Flutter commune, des entrées Android natives avancées, et des quick actions adaptées aux plateformes où elles sont vérifiées. Les packs vocaux locaux existent uniquement pour les langues et plateformes supportées, avec fallback explicite quand un pack local n'est pas disponible."

## Promesses à éviter

- "Synchronisation sécurisée par compte" tant que Supabase Auth/RLS n'a pas été validé end-to-end sur un vrai environnement.
- "Freemium avec quotas" tant que les droits et le billing n'existent pas.
- "Premium illimité" sans infrastructure de quota.
- "Données vocales jamais stockées" sans audit complet du flux audio, des caches natifs et des fournisseurs externes.
- "Prêt entreprise" sans auth, politiques de rétention et garanties sécurité.
- "Dictée offline dans toutes les langues" tant que chaque pack local n'a pas été vérifié en qualité, licence et intégration Android.
- "Support vocal universel inclus" sans distinguer packs locaux, reconnaissance Android et fallback cloud/BYO.
- "Parité complète sur toutes les plateformes" sans matrice de preuve, QA native et limites OS documentées.

## LTD / AppSumo Messaging

Le lifetime deal attire des utilisateurs globaux. Le message doit donc vendre une architecture extensible par packs de langue, pas une promesse implicite français/anglais.

Formulation sûre:

- "Local voice packs for supported languages."
- "Install only the language packs you need."
- "Fallback transcription when a local pack is unavailable."

Formulation à éviter:

- "Unlimited local voice in every language."
- "All languages offline."
- "No cloud ever" tant que les fallbacks existent.

## Canaux de distribution pragmatiques

- Cross-promotion vers la base utilisateur CommandGlows.
- Distribution interne Android APK pour premiers tests.
- Contenu orienté workflow (notes de reunion, email rapide, pensee captee en deplacement).
- Demos produit courtes centrees sur le gain de vitesse de saisie.

## Objections usuelles et reponses factuelles

| Objection | Réponse actuelle |
|---|---|
| "Mes données vocales sont-elles privées ?" | Le stockage des clés est local. Les flux audio/IA avancés doivent encore être validés avant promesse publique. |
| "Est-ce synchronisé entre mes appareils ?" | Les contrats backend-agnostiques et les stores Flutter existent; la validation end-to-end avec vrais comptes et l'adaptateur actif reste à faire avant promesse publique. |
| "Faut-il payer ?" | Pas de billing implémenté. Les modes cloud utilisent les clés API de l'utilisateur. |
| "Est-ce utilisable dans d'autres apps ?" | Oui sur Android via overlay si les permissions système sont accordées. Sur Windows/macOS/Linux, les hôtes desktop visent raccourci, fenêtre flottante et clipboard/delivery best-effort, mais il faut la QA native avant promesse publique. iOS et web nécessitent des adaptations dédiées. |

## Preconditions avant lancement public large

- Test end-to-end de l'adaptateur backend actif avec vraie configuration distante et règles de sécurité automatisées.
- Validation auth réelle et absence de raccourci `TEMP_USER_ID` / `local-user`.
- Politique claire de données et fournisseurs.
- Mesures de latence et fiabilité sur appareils Android réels.
- Matrice de parité plateforme à jour avec QA native Windows/macOS/Linux, puis specs iOS/web.
- Positionnement `LTD + abonnement` implémente avec droits/quotas.
- Catalogue initial de packs vocaux documenté avec langue, moteur, taille, licence, niveau qualité et fallback.
