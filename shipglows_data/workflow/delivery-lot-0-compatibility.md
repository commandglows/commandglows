---
artifact: documentation
metadata_schema_version: "1.0"
artifact_version: "0.1.0"
project: CommandGlows
created: "2026-09-16"
updated: "2026-09-16"
status: draft
source_skill: sg-development
scope: diffusion-human-controlled-delivery-lot-0
owner: Diane
confidence: medium
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems: [commandglows_site, shipglows-email-engine, Convex]
depends_on: [shipglows_data/workflow/specs/diffusion-human-controlled-delivery.md]
supersedes: []
evidence: [commandglows_site/src/lib/email/central/campaignApi.ts, commandglows_site/convex/emailCampaigns.ts, commandglows_site/convex/emailSchema.ts]
next_step: Démarrer le lot 1 sans activer de fournisseur ni de diffusion réelle.
---

# Lot 0 — matrice de compatibilité et clôture de migration

Ce document est un artefact local du lot 0. Il ne constitue ni une activation fournisseur, ni une approbation de campagne, ni une preuve de déploiement.

## Matrice R01

| Surface | Contrat canonique | Adaptateur conservé | Garde de sortie |
| --- | --- | --- | --- |
| Lecture contexte | business autorisés côté serveur | `campaignApi.ts` → `emailCampaigns:read` | aucun wildcard tenant |
| Liste | curseur + limite bornée + état filtré avant pagination | GET `campaigns` | `next_cursor`, pas de contact brut |
| Détail | campagne + rendu lié à la version | GET `campaigns/{id}` | vérification business avant lecture |
| Création | `command/create`, `expectedVersion: 0` interne | POST `campaigns` | blocs et `source_id` préservés |
| Modification | `command/revise`, `expectedVersion` | POST `.../save` | brouillon seulement avant départ |
| Préflight | `command/snapshot`, réentrant et paginé | POST `.../review` | rapport incomplet non approuvable |
| Test | commande séparée, destinataire allowlisté | POST `.../test` | file seulement, pas preuve de réception |
| Approbation | revue + challenge + portée liée | POST `.../approve` | aucun acteur choisi par le client |
| Pause / reprise | arrêt idempotent ; reprise avec nouveau contrôle | commandes dédiées | reprise automatique interdite |
| Annulation | arrêt terminal, sans rappel | POST `.../cancel` | reçu conservé |
| Suppression | brouillon sans départ uniquement | POST `.../delete` | tombstone/rejeu à conserver |

## Chemins historiques inventoríés

- `email:command` / `broadcast_approve` : doit rester borné par campagne ou refuser avec `legacy_guard_required` ; l'absence de `campaignId` n'est pas une exemption.
- `campaignDispatchState` : doit refuser les départs de diffusion sans campagne approuvée ; les messages de service restent dans leur périmètre propre.
- `emailOperations` : la reprise de canal ne réactive jamais une approbation de campagne.
- `emailCampaigns:pump` et les cron/recovery : doivent respecter le fencing de campagne et ne jamais régénérer un permis de départ perdu.
- Routes admin et client Flutter : les erreurs sont mappées par code (`401`, `403`, `404`, `409`, `422`, `503`) sans secret, adresse ou corps privé.

## Fencing de migration

1. Ajouter les champs/références de lot de manière additive : version de contenu, révision du plan, époque de dispatch, reçu de commande et identifiant de tentative.
2. Lire les anciens enregistrements sans les considérer approuvés ; un état ancien `scheduled`/`sending` devient une preuve historique et suspend les nouveaux départs jusqu'à un rapport frais et une décision humaine.
3. Le worker ancien et le worker nouveau peuvent coexister uniquement en lecture pendant la fenêtre de migration. Un départ exige la clôture du fencing et un permis associé à l'époque courante.
4. En cas d'interruption, reprendre sur curseur/checkpoint idempotent. Ne supprimer ni consentements, ni suppressions, ni historiques, ni tentatives incertaines.
5. En rollback, conserver la lecture et les reçus ; ne jamais réactiver un worker qui ignore le fencing, et ne jamais remettre un résultat inconnu en file sans preuve de non-acceptation.

## État de preuve local

- Les tests ciblés API, contenu, snapshot, expansion, outbox, politique de livraison et compatibilité `centralCampaigns` passent : 66/66.
- L'expansion de compatibilité exige désormais credential + tenant + campagne ; elle traite une page bornée et préserve les compteurs `queued/sending/submitted/unknown`.
- `email:claim` reste unitaire par défaut pour préserver la concurrence atomique ; seul le worker HTTP demande explicitement un lot maximal de dix. Le worker s'arrête sur un résultat inconnu ou rate-limit et les messages non encore transmis restent visibles comme travail en vol.
- Le rejeu concurrent d'une même clé rend un reçu identique ; la même clé avec une empreinte différente retourne un conflit. Les attentes historiques ont été migrées vers les statuts R01/R02 (`cancel` de sécurité autorisé, approbation sans revue en 422).
- Les tests globaux historiques hors périmètre email campagne restent séparés ; aucun bypass de sécurité n'a été ajouté.
- Aucun serveur, fournisseur, DNS, consentement, envoi réel, déploiement ou migration distante n'a été activé.
