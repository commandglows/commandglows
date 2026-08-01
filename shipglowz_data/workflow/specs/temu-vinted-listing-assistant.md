---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-06-19"
created_at: "2026-06-19 00:00:00 UTC"
updated: "2026-06-21"
updated_at: "2026-06-21 10:38:40 UTC"
status: reviewed
source_skill: 001-sf-build
source_model: "Codex"
scope: "temu-vinted-listing-assistant"
owner: "Diane"
confidence: medium
user_story: "En tant que revendeur qui repart de fiches Temu, je veux coller une URL sur une page `/temu`, récupérer rapidement une description exploitable et télécharger facilement toutes les photos du produit, afin de republier plus vite l'annonce sur Vinted et autres marketplaces."
risk_level: medium
security_impact: "yes"
docs_impact: "low"
linked_systems:
  - "winglowz_site"
  - "Astro API routes"
  - "Remote marketplace product pages"
depends_on:
  - artifact: "winglowz_site/AGENT.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
supersedes: []
evidence:
  - "Instruction utilisateur du 2026-06-19: creer une page /temu pour extraire description et photos depuis une URL Temu."
next_step: "001-sf-build implementation and local verification"
---

# Spec: Temu Vinted Listing Assistant

## Title

Temu Vinted Listing Assistant

## Status

Implementation complete and locally verified in `winglowz_site`. Additional increments now add Gemini-powered resale rewriting and direct translated-image generation when server auth is configured. The tool now lives behind authenticated dashboard access instead of public routes. Ship was not requested.

## User Story

En tant que revendeur qui repart de fiches Temu, je veux coller une URL sur une page `/temu`, récupérer rapidement une description exploitable et télécharger facilement toutes les photos du produit, afin de republier plus vite l'annonce sur Vinted et autres marketplaces.

## Minimal Behavior Contract

Quand l'utilisateur colle une URL produit, la page `/temu` doit appeler un endpoint serveur qui récupère les métadonnées accessibles de la page distante, puis afficher au minimum une description copiable et une liste de photos téléchargeables. Le cas facile à rater est qu'un téléchargement direct cross-origin casse en navigateur; le site doit donc proposer des téléchargements same-origin via un proxy serveur.

## Success Behavior

- La page `/temu` accepte une URL distante valide.
- L'API extrait au mieux un titre, une description et une liste d'images uniques.
- L'UI permet de copier la description en un clic.
- L'UI permet de télécharger toutes les photos détectées sans dépendre d'un téléchargement cross-origin direct.
- Le résultat affiche aussi des informations utiles pour la suite: titre, URL source, nombre d'images, aperçus.
- L'UI peut générer un titre et une annonce de revente quand Gemini CLI est configuré côté serveur.
- L'UI peut générer de nouvelles images directement traduites en français, prêtes à télécharger.

## Error Behavior

- Si l'URL est invalide, l'utilisateur reçoit un message clair sans appel réseau inutile.
- Si l'extraction distante échoue ou est bloquée, l'UI affiche l'échec proprement sans état incohérent.
- Si certaines images échouent au téléchargement, les autres doivent quand meme pouvoir etre telechargees.
- Si Gemini n'est pas configuré, l'UI doit l'indiquer proprement sans casser l'extraction ou le téléchargement.

## Scope In

- Surface privée `/dashboard/temu`
- Endpoint API d'extraction
- Endpoint API proxy pour téléchargement d'image
- Endpoint API de réécriture / OCR via Gemini CLI
- Endpoint API de génération d'images traduites via Gemini image editing
- Helpers d'extraction HTML et tests unitaires ciblés

## Scope Out

- Publication automatique sur Vinted
- Authentification marketplace
- Réécriture IA avancée des descriptions
- Packaging ZIP des images
- Firecrawl obligatoire

## Test Contract

- `pnpm test:unit`
- `pnpm build:check`
- Vérification manuelle locale de `/temu`

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-06-19 00:00:00 UTC | 001-sf-build | Codex | Created bounded implementation spec for `/temu` extraction workspace | implemented | Implement page, API routes, and local verification |
| 2026-06-19 21:51:00 UTC | 001-sf-build | Codex | Implemented `/temu` page, extraction API, image download proxy, and unit coverage | implemented | Optional browser verification and then closure/ship if requested |
| 2026-06-20 05:13:30 UTC | 001-sf-build | Codex | Added Gemini CLI rewrite/OCR route, UI resale generation, and extra unit coverage | implemented | Configure Gemini auth and run live browser verification if desired |
| 2026-06-20 06:13:50 UTC | 001-sf-build | Codex | Replaced text-only photo translation path with direct Gemini-translated image generation and download flow | implemented | Configure Gemini auth in Vercel and verify on deployed /temu |
| 2026-06-21 10:38:40 UTC | 001-sf-build | Codex | Moved the tool behind `/dashboard/temu`, protected `/api/temu/*`, and added explicit noindex support | implemented | Verify deployed auth flow on Vercel |

## Current Chantier Flow

- 100-sf-spec: completed
- 101-sf-ready: completed
- 102-sf-start: completed
- 103-sf-verify: completed
- 104-sf-end: pending
- 005-sf-ship: pending
