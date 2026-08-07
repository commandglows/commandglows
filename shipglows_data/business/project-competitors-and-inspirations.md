---
artifact: competitive_intelligence
metadata_schema_version: "1.0"
artifact_version: "1.1.0"
project: commandglows
created: "2026-05-24"
updated: "2026-08-07"
status: draft
source_skill: sf-content
scope: project-competitors-and-inspirations
owner: "Diane"
confidence: medium
risk_level: medium
security_impact: none
docs_impact: yes
reference_categories:
  - competitors
  - inspirations
  - content-opportunities
  - product-benchmarks
source_policy: "Utiliser ce registre comme outil interne de veille, d'inspiration et de cadrage. Vérifier les offres, prix, fonctionnalités et claims à la source avant toute publication publique."
target_projects:
  - commandglows
evidence:
  - "shipglows_data/business/business.md"
  - "shipglows_data/business/product.md"
  - "shipglows_data/business/gtm.md"
  - "shipglows_data/editorial/content-map.md"
  - "src/content/docs/en/formations/module-2-windows/automatisation.md"
  - "src/content/docs/fr/formations/module-2-windows/automatisation.md"
  - "Public-source review 2026-08-07: https://keyshift.ai/ + https://appsumo.com/products/keyshift-ai/ + AppSumo reviews/founder updates."
  - "Public-source review 2026-08-07: https://www.typedesk.com/"
  - "Public-source review 2026-08-07: https://www.triplo.ai/en"
  - "Public-source review 2026-08-07: https://taskmagic.com/"
depends_on:
  - "shipglows_data/business/business.md"
  - "shipglows_data/business/product.md"
  - "shipglows_data/business/gtm.md"
  - "shipglows_data/editorial/content-map.md"
supersedes:
  - "INSPIRATION.md"
next_review: "2026-09-07"
next_step: "/sf-market-study update shipglows_data/business/project-competitors-and-inspirations.md"
---

# Concurrents et inspirations — CommandGlows

## Role

Ce registre sert à cadrer la veille concurrentielle, les inspirations produit et les opportunités de contenu de CommandGlows. Il n'est pas une page publique et ne doit pas être utilisé comme source de vérité commerciale sans vérification fraîche.

CommandGlows est centré sur la formation et les contenus Windows-first autour de `Windows Mastery`. Les références utiles sont donc surtout :

- des concurrents indirects : outils Windows qui résolvent une partie du problème enseigné par la formation ;
- des inspirations produit : expériences, workflows, onboarding, ergonomie clavier, automatisation et no-code ;
- des inspirations de contenu : angles pédagogiques, comparatifs, exemples et mises à jour de modules ;
- des signaux roadmap : idées ou patterns à surveiller pour les produits compagnons.

## Règles de doctrine

- Séparer clairement observation, inférence et inspiration.
- Ne pas copier une promesse, une structure, une UI ou une mécanique propriétaire sans réinterprétation CommandGlows.
- Vérifier les URLs, offres, prix, fonctionnalités et claims avant toute publication publique.
- Ne pas transformer une inspiration en recommandation outil sans test, preuve ou source officielle récente.
- Marquer les produits récents issus de plateformes de veille comme `à vérifier` tant qu'ils n'ont pas été retestés.
- Garder `Windows Mastery` comme centre narratif : les outils cités servent la méthode, ils ne la remplacent pas.

## Benchmarks structurants

| Source | Type | Observation | Inference CommandGlows | Inspiration exploitable | Statut preuve |
|---|---|---|---|---|---|
| [Blip AI](https://www.blipai.app/) | Concurrent indirect / inspiration produit | Outil de dictée IA cross-platform déclenché par raccourci clavier pour insérer du texte propre dans n'importe quelle app. | Concurrent direct de la promesse voice-first de l'app CommandGlows, surtout sur desktop et workflows de rédaction rapide. | Benchmarker UX de déclenchement, qualité de nettoyage, limites mensuelles, onboarding AppSumo et promesse "parler au lieu de taper". | À vérifier avant citation publique |
| [Typing Hero](https://play.google.com/store/apps/details?id=sen.typinghero) | Concurrent indirect / inspiration produit | Text expander Android orienté snippets, insertion de date/heure, calculs simples, transformation de texte, historique presse-papiers et automatisation via accessibilité. | Concurrent direct des fonctions de text expansion et d'automatisation de saisie de CommandGlows App sur Android, surtout pour snippets, templates et actions rapides. | Benchmarker l'ergonomie des snippets, les templates multi-variantes, les actions texte, la gestion du presse-papiers et le positionnement freemium/premium. | À vérifier avant citation publique |
| [CopyCat](https://play.google.com/store/apps/details?id=com.entilitystudio.CopyCat) | Concurrent indirect / inspiration produit | Background clipboard, notification persistante pour la transparence, optimisation batterie, overlay permission temporaire, service d’accessibilité, démarrage après reboot. | Signal fort pour un mode clipboard en arrière-plan dans CommandGlows App, surtout pour la détection continue du texte copié et la persistance du service. | Benchmark à reproduire côté CommandGlows sur la continuité du presse-papiers, la transparence de l’exécution en arrière-plan et la reprise automatique. | À vérifier avant citation publique |
| [Trigr](https://usetrigr.com/) | Concurrent indirect / inspiration produit | Outil Windows positionné sur hotkeys visuels, macros et text expansion sans scripting. | Signal fort que le marché cherche une couche d'automatisation Windows plus accessible qu'AutoHotkey. Concurrent indirect de la promesse "workflow Windows plus rapide", surtout pour les utilisateurs no-code. | Alimenter le module Automatisation, surveiller l'UX no-code, benchmarker le futur angle `Workflow Automation Builder`. | À vérifier avant citation publique |
| [KeyShift AI](https://keyshift.ai/) · [AppSumo](https://appsumo.com/products/keyshift-ai/) | Concurrent indirect / inspiration produit | Assistant desktop Windows/macOS qui applique des transformations IA dans l'app active : sélection, raccourcis, commandes texte, voix, presse-papiers et workflows. La fiche AppSumo affiche 13 avis et des retours sur l'intégration inter-apps, les workflows et quelques incidents mineurs corrigés. | Concurrent très proche de la promesse « IA là où l'on écrit » pour une future surface desktop CommandGlows ; signal utile pour arbitrer entre raccourci, palette, trigger textuel et injection de résultat. | Benchmarker la découverte des actions, l'annulation/undo, les conflits de raccourcis, le respect du presse-papiers et la transparence confidentialité/coûts. | Sources officielles et AppSumo vérifiées le 2026-08-07 ; pas de claim public sans test propre |
| [typedesk](https://www.typedesk.com/) | Concurrent indirect / inspiration produit | Text expander Windows/macOS et navigateur, avec snippets, variables, recherche rapide, partage d'équipe et intégration IA. | Référence forte pour la text expansion Windows et la logique de bibliothèque de modèles ; complète le benchmark mobile de Typing Hero. | Benchmarker la création et la recherche de snippets, les variables, l'accès hors navigateur et la distinction individuel/équipe sans transposer les claims commerciaux. | Source officielle vérifiée le 2026-08-07 |
| [Triplo AI](https://www.triplo.ai/en) | Concurrent indirect / inspiration produit | Assistant IA multi-OS activable par hotkey ou trigger textuel ; inclut prompts personnalisés, bases de connaissances, presse-papiers, automatisation et intégrations. | Concurrent adjacent de l'assistant contextuel et des actions IA partout dans le flux de travail, avec un périmètre plus large que la seule dictée. | Benchmarker la configuration du hotkey/trigger, les prompts réutilisables, l'injection de contexte et les limites de surface d'un assistant généraliste. | Source officielle vérifiée le 2026-08-07 |
| [TaskMagic](https://taskmagic.com/) | Concurrent indirect / inspiration automatisation | Produit d'automatisation no-code qui transforme un objectif exprimé en langage courant en plan d'actions à revoir avant exécution, pour apps et sites web. | Signal de marché pour une automatisation accessible et contrôlable, pertinent pour les modules Windows/no-code et de futurs companions plutôt que pour la dictée. | Benchmarker l'explicitation du plan, la revue utilisateur avant exécution et l'usage du langage naturel pour démarrer une automatisation. | Source officielle vérifiée le 2026-08-07 |

## À transformer en contenu ou benchmark

| Lien | Type | Score | Usage concret |
|---|---:|:---:|---|
| [Blip AI](https://www.blipai.app/) | Benchmark concurrent app / dictée IA | 8/10 | À comparer à l'app CommandGlows sur raccourci global, insertion dans les apps, nettoyage IA, historique, pricing et limites d'usage. |
| [Typing Hero](https://play.google.com/store/apps/details?id=sen.typinghero) | Benchmark concurrent app / text expansion Android | 8/10 | À comparer à CommandGlows App sur snippets, templates, actions texte, calculs simples, insertion de date/heure, clipboard history et accessibilité. |
| [CopyCat](https://play.google.com/store/apps/details?id=com.entilitystudio.CopyCat) | Benchmark concurrent app / clipboard Android | 7/10 | À comparer à CommandGlows sur background clipboard, notifications persistantes, overlay temporaire, accessibilité et reprise après reboot. |
| [Trigr](https://usetrigr.com/) | Benchmark concurrent / contenu formation | 8/10 | Déjà ajouté au module Automatisation comme passerelle no-code pour hotkeys, macros et text expansion. À creuser pour un futur comparatif "AutoHotkey vs outils no-code d'automatisation Windows". |
| [KeyShift AI](https://keyshift.ai/) · [AppSumo](https://appsumo.com/products/keyshift-ai/) | Benchmark concurrent app / IA desktop inter-apps | 9/10 | À comparer sur raccourcis, palette, trigger textuel, voix, clipboard, workflows, undo et onboarding ; les avis AppSumo sont des signaux qualitatifs, non une preuve de performance. |
| [typedesk](https://www.typedesk.com/) | Benchmark concurrent / text expansion Windows | 9/10 | À comparer sur snippets, variables, recherche rapide, disponibilité dans les apps natives et la frontière entre usage personnel et équipe. |
| [Triplo AI](https://www.triplo.ai/en) | Benchmark concurrent app / assistant IA contextuel | 8/10 | À comparer sur hotkey, triggers textuels, prompts réutilisables, bases de connaissances et assistant via presse-papiers. |
| [TaskMagic](https://taskmagic.com/) | Benchmark automatisation no-code / contenu formation | 8/10 | À étudier pour un comparatif sur l'automatisation en langage naturel, l'aperçu du plan et le contrôle avant exécution. |

## Règle de passage vers contenu public

Avant de publier une fiche, un comparatif ou une mention concurrente issue de ce registre :

1. Vérifier la page officielle ou la source primaire.
2. Distinguer observation factuelle, test CommandGlows et recommandation.
3. Éviter les claims de performance, de sécurité, de prix ou de fiabilité sans preuve fraîche.
4. Relier le sujet au bon pilier dans `shipglows_data/editorial/content-map.md`.
5. Garder la conclusion orientée méthode : l'outil est un exemple, pas le cœur de la promesse CommandGlows.

## Questions ouvertes

- Faut-il faire un benchmark dédié des outils no-code d'automatisation Windows ?
- Trigr doit-il rester une simple mention de formation ou devenir un cas d'étude dans `Windows Mastery` ?
