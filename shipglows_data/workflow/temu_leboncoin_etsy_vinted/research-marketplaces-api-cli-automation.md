---
artifact: research_report
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-06-19"
updated: "2026-06-19"
status: reviewed
source_skill: sf-veille
scope: "API officielles et outils CLI pour automatiser la publication d'annonces sur Leboncoin, Vinted et Etsy"
owner: "Diane"
confidence: medium
risk_level: medium
security_impact: none
docs_impact: yes
source_count: "10"
primary_sources:
  - "https://www.leboncoin.fr/robots.txt"
  - "https://www.leboncoin.fr/dc/cgu"
  - "https://pro-docs.svc.vinted.com/"
  - "https://www.vinted.com/robots.txt"
  - "https://www.vinted.fr/pro"
  - "https://www.vinted.fr/help/908-frais-de-protection-acheteurs-pro"
  - "https://developers.etsy.com/"
  - "https://developers.etsy.com/documentation/tutorials/quickstart/"
  - "https://developers.etsy.com/documentation/tutorials/shopmanagement/"
  - "https://github.com/sov2000/etspi-cli"
recommendation: "Privilégier Etsy pour une automatisation fiable; n'envisager Vinted qu'en compte Pro allowlisté; éviter toute automatisation Leboncoin sans accord explicite."
depends_on: []
supersedes: []
evidence:
  - "Recherche web du 2026-06-18 sur API officielles, robots.txt et outils CLI tiers."
  - "Recherche web du 2026-06-19 sur le coût actuel de Vinted Pro en France."
next_step: "$sf-docs update"
---

# Marketplaces API et automatisation CLI

## Résumé exécutif

- `Leboncoin` : aucune API publique officielle trouvée pour publier des annonces. Le `robots.txt` interdit explicitement l'usage de méthodes automatiques sans permission spéciale, donc un bot de publication serait juridiquement et opérationnellement fragile.
- `Vinted` : API officielle disponible via `Vinted Pro Integrations`, mais seulement pour des comptes Pro `allowlisted`. L'automatisation de publication existe donc, mais elle n'est pas ouverte au grand public.
- `Etsy` : API officielle publique (`Open API v3`) disponible avec clé approuvée et OAuth. C'est la plateforme la plus propre pour automatiser depuis le terminal.

## Détail par plateforme

### Leboncoin

- API publique officielle de publication : non trouvée.
- Position plateforme : le `robots.txt` interdit les robots de recherche et autres méthodes automatiques sans autorisation spécifique.
- Implication pratique : l'automatisation terminal passerait probablement par du navigateur piloté (`Playwright`, `Puppeteer`) ou du reverse-engineering, avec risque de blocage et de non-conformité.
- Conclusion : ne pas investir sur Leboncoin sans accord explicite ou partenariat.

### Vinted

- API officielle : oui, via `Vinted Pro Integrations`.
- Condition d'accès : compte `Vinted Pro` + accès `allowlisted`.
- Capacité produit : l'API documente la gestion d'items, commandes et webhooks, y compris la création d'articles.
- Coût côté Pro France : `Vinted Pro` est annoncé comme gratuit à l'inscription et à l'usage de base, sans abonnement ni frais pour mettre en ligne des articles.
- Frais acheteur : la `Protection acheteurs Pro` s'applique automatiquement, généralement autour de `5 %` du prix plus un montant fixe.
- Conclusion : intéressant seulement si WinGlows vise un flux professionnel structuré et peut opérer avec un compte Pro autorisé.

### Etsy

- API officielle : oui, `Etsy Open API v3`.
- Auth : clé API approuvée + OAuth.
- Capacité produit : création et gestion de listings, y compris les drafts/listings de boutique.
- Conclusion : meilleur candidat pour une automatisation fiable, scriptable et maintenable depuis le terminal.

## Outils terminal identifiés

U g## Outils sûrs / officiels

- `curl` : suffisant pour `Etsy Open API` et pour `Vinted Pro Integrations` si l'accès Pro est validé.
- Client généré OpenAPI : pertinent pour `Vinted Pro Integrations` si besoin d'un flux plus robuste qu'un simple script shell.

### Outils tiers repérés

- `etspi-cli` : CLI tiers pour Etsy permettant de gérer boutique et listings depuis le terminal.
- `vinted-mcp-cli` : outil tiers non officiel pour Vinted, à utiliser avec prudence car il ne constitue pas une voie officielle supportée par la plateforme.

### Outils non recommandés

- Bots navigateur génériques pour Leboncoin ou Vinted hors API officielle.
- Reverse-engineering d'API privées pour publication d'annonces.

## Recommandation pour WinGlows

1. Si l'objectif est un pipeline robuste d'ajout d'annonces, commencer par `Etsy`.
2. Si un flux `Vinted` devient stratégique, vérifier l'éligibilité `Vinted Pro` puis l'accès `allowlist` aux intégrations.
3. Éviter `Leboncoin` pour une automatisation de publication tant qu'il n'existe pas d'accord officiel.

## Sources

- Leboncoin robots.txt : <https://www.leboncoin.fr/robots.txt>
- CGU Leboncoin : <https://www.leboncoin.fr/dc/cgu>
- Vinted Pro Integrations : <https://pro-docs.svc.vinted.com/>
- Vinted robots.txt : <https://www.vinted.com/robots.txt>
- Vinted Pro France : <https://www.vinted.fr/pro>
- Frais de protection acheteurs Pro : <https://www.vinted.fr/help/908-frais-de-protection-acheteurs-pro>
- Etsy Open API : <https://developers.etsy.com/>
- Etsy Quick Start : <https://developers.etsy.com/documentation/tutorials/quickstart/>
- Etsy Shop Management : <https://developers.etsy.com/documentation/tutorials/shopmanagement/>
- etspi-cli : <https://github.com/sov2000/etspi-cli>
