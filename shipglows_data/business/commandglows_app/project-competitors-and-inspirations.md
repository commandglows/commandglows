---
artifact: competitive_intelligence
metadata_schema_version: "1.0"
artifact_version: "0.3.2"
project: "CommandGlows"
created: "2026-03-18"
updated: "2026-07-07"
status: "draft"
source_skill: "sf-docs"
scope: "project-competitors-and-inspirations"
owner: "Diane"
confidence: "medium"
risk_level: "low"
security_impact: "none"
docs_impact: "yes"
linked_systems: []
target_projects:
  - "CommandGlows"
reference_categories:
  - "transcription_ai"
  - "native_dictation"
  - "audio_voice"
  - "productivity_ai"
source_policy: "Keep public, non-secret references only; cite source notes when external research is promoted into positioning."
depends_on:
  - "shipglows_data/business/business.md@0.1.0"
  - "shipglows_data/business/product.md@0.1.0"
supersedes:
  - "INSPIRATION.md"
evidence:
  - "shipglows_data/business/business.md"
  - "shipglows_data/business/product.md"
  - "shipglows_data/workflow/research/2026-05-11-concurrents-inspirations.md"
  - "Public-source review 2026-07-07: https://amical.ai/ + https://appsumo.com/products/amical/ + AppSumo founder Q&A/reviews."
  - "Public-source review 2026-07-07: https://insertkit.com/ + https://insertkit.com/lifetime-deal + https://www.trustpilot.com/review/insertkit.com"
next_review: "2026-06-11"
next_step: "$sf-docs update"
---

# Inspiration — CommandGlows

## Transcription IA

### Otter.ai
Référence produit pour les fonctionnalités de transcription en temps réel, la gestion de l'historique et l'intégration avec les outils de visioconférence.

### OpenAI Whisper
Moteur de transcription utilisé dans CommandGlows pour le pipeline de transcription avancée.

### Notta
Inspiration potentielle pour le post-traitement du texte transcrit et la présentation des résultats.

### Rev.ai
Inspiration potentielle pour les cas d'usage transcription orientés API.

## Dictée native

### Google Voice Typing
Benchmark de dictée native Android pour la latence et l'expérience de dictée mobile.

### Apple Dictation
Benchmark de dictée native iOS pour l'intégration système et la fluidité d'usage.

### Blip AI
Concurrent/inspiration pour la dictée IA cross-platform: raccourci global, parole vers texte propre, insertion dans n'importe quelle app, limites d'usage mensuelles et acquisition via AppSumo. À benchmarker contre CommandGlows App sur déclenchement clavier/overlay, nettoyage IA, historique, confidentialité et mode local-first.

### [Amical](https://amical.ai/) + [page AppSumo](https://appsumo.com/products/amical/)
Concurrent direct/inspiration forte pour la dictée IA cross-platform: hotkey global, texte injecté dans n'importe quelle app, formatage selon le contexte de l'app, vocabulaire personnalisé, mode local ou cloud, et angle open-source/local-first. La page AppSumo ajoute un signal précieux sur les attentes réelles des utilisateurs finaux: annulation d'une dictée en cours, transcription de réunion en temps réel, stabilité de la fenêtre flottante, et arbitrage confidentialité/vitesse. À benchmarker contre CommandGlows App sur overlay/hotkey, dictée context-aware, mode offline/local-first, commandes vocales, et UX de capture/annulation sans casser le flux.

### Typing Hero
Concurrent/inspiration pour le text expansion Android: snippets, templates, insertion de date/heure, calculs simples, transformation de texte, historique presse-papiers et automatisation via accessibilité. À benchmarker contre CommandGlows App sur les snippets, les variantes de template, les actions texte et le positionnement freemium/premium.

### [InsertKit](https://insertkit.com/) + [lifetime deal](https://insertkit.com/lifetime-deal)
Concurrent/inspiration pour une surface de productivite multi-plateforme orientee saisie repetitive: text expansion, snippets dynamiques, variations, historique presse-papiers, voice typing IA, commandes vocales et application Android en plus du desktop et de l'extension Chrome. Le site officiel le positionne aussi explicitement contre TextExpander, TypeDesk et Wispr Flow, avec un angle valeur/free plan qui peut parler a notre audience. Le faible volume actuel de reviews publiques visibles invite a rester prudent sur la traction reelle, mais le packaging produit est tres pertinent a benchmarker contre CommandGlows App sur la combinaison snippets + clipboard + voix, la clarte du positionnement cross-platform, la promesse "type less, insert more", et l'articulation entre plan gratuit, offre lifetime et cas d'usage business.

## Audio et voix

### Descript
Inspiration pour le lien texte-audio et les possibilités de correction post-transcription.

### Speechify
Inspiration de positionnement autour de la voix et de l'accessibilité.

### Krisp
Inspiration pour le traitement audio en amont de la transcription.

## Écosystème

### Microsoft Copilot
Référence de positionnement pour la voix comme interface de productivité.

### Trigr
Concurrent indirect/inspiration pour les workflows Windows sans scripting: hotkeys visuels, macros et text expansion. Pertinent pour l'app CommandGlows si les raccourcis, snippets, overlays et actions rapides deviennent une surface de productivité desktop au-delà de la dictée.

## Veille productivité IA — 2026-05-11

| Lien | Type | Score | Usage concret |
|---|---:|:---:|---|
| [VenturOS](https://betalist.com/startups/venturos) | Concurrent / inspiration | 8/10 | Benchmark "executive operating system": décisions, priorités, pilotage. |
| [Validue](https://betalist.com/startups/validue) | Module formation | 7/10 | Leçon potentielle sur validation d'hypothèses avant exécution. |
| [Populous](https://betalist.com/startups/populous) | Module validation | 7/10 | Inspiration pour tester une idée avant d'y passer 3 mois. |
| [IntelCue](https://betalist.com/startups/intelcue-2) | Module veille IA | 6/10 | Exemple de veille marché intégrée dans Claude/ChatGPT. |
| [MemoryPlugin](https://betalist.com/startups/memoryplugin) | Module mémoire IA | 6/10 | Sujet productivité IA: mémoire utile vs mémoire risquée. |
| [Spec27](https://betalist.com/startups/spec27) | Module agents fiables | 6/10 | Alimenter une page "spécifier avant de déléguer à l'IA". |
| [Mindry](https://betalist.com/startups/mindry) | Inspiration journaling | 5/10 | À surveiller; moins B2B que les autres références. |

## Questions ouvertes

- Quels produits doivent rester en benchmark prioritaire pour Q2 2026 (max 3) ?
- Faut-il séparer explicitement les inspirations "mobile", "desktop" et "workflow éducatif" ?
