---
artifact: technical_module_context
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: CommandGlows
created: "2026-09-06"
updated: "2026-09-06"
status: reviewed
source_skill: sg-development
scope: commerce-launch-scenarios
owner: Diane
confidence: high
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems: [Stripe, Convex, Clerk, Astro]
depends_on: [shipglows_data/workflow/specs/commerce-launch-readiness.md]
supersedes: []
evidence: [commandglows_site/tests/commerce/commerceLifecycle.test.ts, commandglows_site/tests/commerce/commerceWebhookFailures.test.ts, commandglows_site/tests/commerce/commerceOperationsConvex.test.ts]
next_step: "Complete separately authorized hosted test-mode acceptance before commercial opening."
next_review: "2026-09-13"
---

# Commerce : matrice de lancement

Décisions validées le 6 septembre 2026. Responsable opérationnelle : Diane, avec prise en charge nominative par un compte administrateur dans la console. Le traitement est isolé par environnement, achat, produit et PaymentIntent. Les autres achats, essais et droits manuels restent indépendants.

La page de retour affiche une vérification en cours ; elle ne constitue jamais une preuve de paiement ou de droits. Le client consulte son compte ou revient dans son application pour lire les droits serveur. Le support reste accessible. Les formulations ci-dessous désignent l'information à donner, pas une notification client déjà envoyée.

## Matrice de traitement

| Cas | Résultat prévu sur les droits | Information acheteur | Traitement vérifié localement | Sortie en cas d'erreur |
| --- | --- | --- | --- | --- |
| Achat payé | Un droit pour l'achat lié à la session serveur | Vérification en cours, puis accès dans le compte | Événement signé paid, identité/offre/session/PaymentIntent contrôlés ; tests lifecycle et checkout | Incident identifiable si un préalable manque ; aucune attribution par email ou URL |
| Paiement refusé | Aucun droit nouveau | Échec du paiement ; nouvelle tentative possible | Échec différé enregistré ; création Checkout refusée retourne une erreur sans finalisation | Corriger le moyen de paiement côté Stripe ; carte refusée réelle à prouver en hébergé |
| Abandon ou onglet fermé | Aucun droit sans paiement confirmé | Revenir au compte ; recommencer si aucun paiement n'a abouti | Un retour navigateur n'attribue rien ; expiration enregistrée ; ancienne session sans résultat signalée comme à vérifier | Vérifier la session Stripe avant de déclarer payé/non payé ; incident de vérification avec échéance |
| Jeton de transfert expiré | Aucun droit, aucune nouvelle session depuis ce jeton | Reprendre l'achat depuis le compte authentifié | Refus du handoff invalide/expiré, sans appel Stripe | Nouveau transfert authentifié ; une session déjà créée se réconcilie avec ses références existantes |
| Session Stripe expirée | Aucun droit nouveau | Session expirée ; reprendre l'achat | checkout.session.expired enregistré ; un événement tardif ne supprime pas un paiement confirmé | Session exacte à vérifier si incohérente ; jamais inférer un paiement à partir de son âge |
| Paiement différé en cours | Aucun droit nouveau | Paiement en attente de confirmation | checkout.session.completed unpaid devient awaiting_payment, réponse 200 | Une attente ancienne crée un dossier de vérification ; succès/échec signé termine l'attente |
| Paiement différé réussi | Droit accordé une fois | Accès disponible après actualisation serveur | checkout.session.async_payment_succeeded traverse le même processeur | Reprise opérateur si identité/session indisponible |
| Paiement différé échoué | Aucun droit nouveau | Paiement non abouti ; nouvelle tentative possible | checkout.session.async_payment_failed enregistré sans attribution | Support si paiement bancaire constaté contradictoire ; vérification fournisseur requise |
| Double clic / reprise Checkout | Une même session pour un même handoff | Reprendre la session existante | Clé d'idempotence Stripe stable ; finalisation Convex rejouable | Panne de finalisation : erreur visible, reprise même clé ou réparation via session Stripe authentifiée |
| Webhook livré plusieurs fois | Aucun double droit ni double remboursement | Aucun changement supplémentaire | Reçu par provider/environnement/event ID ; enveloppe originale réutilisée | Payload signé différent sous même ID : conflit ; incident, pas de réaffectation |
| Événements désordonnés | Aucune résurrection d'un achat bloqué | Vérification si transition encore indécidable | Remboursement/litige avant paiement : binding payé puis reprise négative avant attribution ; fermeture avant ancienne ouverture conservée | Reprendre le dossier bloquant avec motif et compteur attendu |
| Panne Stripe durant normalisation | Aucun effet partiel | Vérification en cours | HTTP 500 et incident d'entrée sur identifiants vérifiés ; appels fournisseur bornés | Stripe peut relivrer ; opérateur réimporte l'événement exact si nécessaire |
| Panne Convex | Aucun acquittement trompeur | Vérification en cours | HTTP 500 ; journal de secours sans données client si l'incident ne peut être persisté | Alerte d'hébergement indépendante obligatoire ; réconciliation après rétablissement |
| Aucun webhook reçu | Aucun droit supposé ; dossier à vérifier | Support avec référence de commande/session | Balayage borné des anciens handoffs ; incident et alerte, sans les qualifier de payés | Importer l'événement original depuis Stripe ; réparer d'abord la finalisation si nécessaire |
| Mauvais compte / produit / environnement | Aucune attribution ni révocation étrangère | Vérifier le compte utilisé, contacter le support | Contrôles côté serveur, conflit d'identité/paiement conservé en revue | Résolution avec preuve ; jamais changer le propriétaire d'une enveloppe ni accorder sur simple email |
| Métadonnées manquantes | Aucun droit nouveau | Vérification par le support | Reçu pending_review durable, même sans utilisateur résolu | Nouvelle preuve fournisseur liée ou escalade ; pas de reconstruction devinée de l'identité |
| Remboursement partiel réussi | Accès conservé sauf autre blocage | Achat partiellement remboursé | Somme des remboursements réussis distincts, en unité monétaire minimale | Montant/devise contradictoire : suspension prudente et incident |
| Remboursements successifs devenant totaux | Accès retiré pour cet achat | Achat entièrement remboursé | Chaque refund ID compte une fois ; remboursement créé puis mis à jour ne double pas le cumul | Événement manquant : relivraison/import depuis Stripe selon procédure |
| Remboursement pending/canceled/failed | Ne compte pas comme remboursé avec succès | Remboursement en attente, annulé ou échoué selon preuve | État fournisseur le plus récent par refund ID ; accès conservé si aucun autre blocage | failed/requires_action ouvre une alerte opérateur ; échec tardif rétablit seulement l'accès encore payé |
| Ancien remboursement relivré après évolution de la charge | Aucun conflit dû à cette évolution | Aucun nouveau changement | Le hash du snapshot signé ignore pending_webhooks ; amount_refunded courant n'intervient pas dans la classification | L'enveloppe d'origine reste inchangée ; corruption réelle du snapshot reste rejetée |
| Litige ouvert | Achat suspendu | Accès suspendu pendant le litige | État suspended propre à cet achat et incident opérateur | Répondre au litige via Stripe dans son délai ; la console ne soumet pas de preuves bancaires |
| Litige gagné | Rétablissement si achat payé et aucun autre blocage | Accès rétabli après actualisation | Won ne lève que son propre litige ; même droit restauré | Autre litige, remboursement total ou révocation externe : blocage conservé |
| Litige perdu | Achat révoqué | Accès retiré pour cet achat | Lost bloque le calcul des droits | Clôture opérateur tracée ; aucun override du statut fournisseur |
| Warning closed / prevented | Ce motif de suspension est levé | Vérifier l'accès dans le compte | États Stripe de clôture sans litige actif, sous les mêmes contrôles que won | Incohérence ou statut inconnu : revue, aucune restauration aveugle |
| Plusieurs litiges / statuts contradictoires | Tout litige encore ouvert ou perdu continue de bloquer | Traitement par le support | Calcul par dispute ID ; issues terminales contradictoires donnent pending_review, même à des dates distinctes | Escalade et résolution externe avec référence vérifiable ; un nouvel événement ne peut effacer la contradiction |
| Cinquième tentative sans résolution | Aucun contournement de droits | Dossier pris en charge par le support | Escalade persistante ; compteur conservé ; raison, propriétaire et échéance visibles | Une sixième tentative exceptionnelle exige le même événement retrouvé chez Stripe ; sinon résolution externe liée ou escalade technique |
| Alerte non configurée / rejetée / interrompue | Aucun effet sur les droits | Support disponible ; état de paiement inchangé | Outbox durable, baux de livraison, reprises bornées, échec visible | Corriger le canal, relancer un cycle audité ; réception effective à prouver avant ouverture |
| Résolution manuelle d'un incident | Aucun droit attribué par cette action | Traitement et référence consignés | Motif, preuve/référence et administrateur conservés ; reçu inchangé | Une note n'est ni un remboursement ni une attribution ; l'opérateur doit vérifier la résolution réelle |

## Preuves locales et limites

Le contrôle combiné du 6 septembre 2026 passe : **244 tests dans 28 fichiers**, contrôle TypeScript Convex et contrôle Astro. La [procédure opérateur](commerce-operator-runbook.md) décrit l'attribution, les échéances, les alertes, la récupération et la sortie après épuisement des tentatives.

- `tests/commerce/commerceLifecycle.test.ts` : signatures synthétiques jusqu'aux mutations Convex, cumul, litiges, désordre, identité, état différé et métadonnées manquantes.
- `tests/commerce/commerceProcessorConvex.test.ts` : isolation des achats, compatibilité, doublons concurrents, récupération, compteurs et historique.
- `tests/commerce/checkoutRoute.test.ts`, `checkoutHandoffConvex.test.ts`, `checkoutIdentity.test.ts`, `authenticatedCheckoutStart.test.ts` : transfert authentifié, expiration, reprises et pannes de création/finalisation.
- `tests/commerce/commerceWebhookFailures.test.ts` : incident durable, panne totale et réponse de reprise ; aucun appel réel fournisseur.
- `tests/commerce/commerceOperationsConvex.test.ts` et tests API/interface associés : droits administrateur, file, actions, alertes, candidats et réconciliation.
- Les tests de bridge, politiques d'accès et formation contrôlent les consommateurs existants.

Un résultat de reçu est historique : une relivraison peut retourner son ancien résultat granted alors que les droits courants ont depuis été retirés. Seul le snapshot d'accès serveur décrit l'accès actuel.

## Passage hébergé obligatoire avant lancement

Dans une étape séparément autorisée, vérifier chaque ligne pertinente en mode Stripe test, avec comptes autorisés : session réelle, signature, base Convex, connexion puis ressource protégée, actualisation de l'application, retour acheteur, console administrateur accessible et utilisable au clavier, réception et échec d'alerte, balayage actif et reprise après panne. Vérifier aussi le refus bancaire réel, l'abandon et le délai des moyens de paiement autorisés. Conserver les références de preuves et le résultat attendu/obtenu. Une ligne bloquée garde l'ouverture commerciale bloquée.

Les événements activés dans Stripe doivent couvrir completed, async_payment_succeeded, async_payment_failed, expired, refund.created, refund.updated, refund.failed et charge.dispute.created/updated/closed. Les événements charge.refunded et funds_reinstated ne remplacent pas les faits détaillés de remboursement/litige de ce contrat. Le runbook impose la comparaison aux événements Stripe et leur réimportation exacte lors d'une anomalie.

Sources vérifiées : [types d'événements Stripe](https://docs.stripe.com/api/events/types), [objet remboursement](https://docs.stripe.com/api/refunds/object), [objet litige](https://docs.stripe.com/api/disputes/object), [webhooks et reprises](https://docs.stripe.com/webhooks). Les règles de droits sont les décisions CommandGlows validées ; Stripe fournit les faits financiers.
