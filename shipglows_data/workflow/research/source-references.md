---
artifact: documentation
metadata_schema_version: "1.0"
artifact_version: "0.2.0"
project: "WinGlows"
created: "2026-03-18"
updated: "2026-04-27"
status: "draft"
source_skill: "sf-docs"
scope: "update"
owner: "Diane"
confidence: "medium"
risk_level: "low"
security_impact: "unknown"
docs_impact: "yes"
linked_systems:
  - "OpenAI"
  - "Anthropic"
  - "Flutter"
  - "Supabase"
depends_on:
  - "shipglows_data/business/business.md@0.1.0"
  - "shipglows_data/business/product.md@0.1.0"
supersedes: []
evidence:
  - "pubspec.yaml"
  - "lib/core/bootstrap/supabase_bootstrap.dart"
  - "supabase/migrations/20260427084000_init_winglowz_app.sql"
  - "shipglows_data/business/product.md"
next_step: "$sf-docs update"
---

# Sources — WinGlows

## APIs et services (observés dans le repo)

- **Supabase Auth/Postgres/RLS** — backend cible pour comptes, données utilisateur et isolation multi-utilisateur.
- **Flutter** — runtime applicatif cible multi-plateforme.
- **OpenAI Whisper API** — cible prévue pour la transcription avancée BYOK.
- **Anthropic Messages API** — cible prévue pour le nettoyage et la reformulation BYOK.

## Standards et documentation technique de référence

- **speech_to_text** — reconnaissance vocale locale quand la plateforme la supporte.
- **record** — capture audio pour le mode avancé.
- **flutter_secure_storage** — stockage local des clés utilisateur, avec garanties variables selon plateforme.
- **permission_handler** — permissions runtime prises en charge par Flutter.
- **Android platform channels** — pont natif pour overlay et accessibilité Android.

## Recherche externe à confirmer

- Productivité voice-first : études à sélectionner et dater.
- Ergonomie de la dictée : fatigue, précision, contextes d'usage.
- Accessibilité vocale : références W3C WAI à intégrer précisément.

## Questions ouvertes

- Quelles 3 sources externes "marché" sont validées officiellement pour les docs WinGlows ?
- Faut-il maintenir une section "Communautés" ici, ou la déplacer dans `shipglows_data/business/gtm.md` ?
