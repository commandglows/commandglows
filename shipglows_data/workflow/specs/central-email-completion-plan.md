---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.1.0"
project: CommandGlows
created: "2026-09-07"
created_at: "2026-09-07 11:53:25 UTC"
updated: "2026-09-07"
updated_at: "2026-09-07 11:53:25 UTC"
status: draft
source_skill: sg-planning
source_model: GPT-6
scope: central-email-completion-plan
owner: Diane
user_story: "Gérer les emails de service, alertes et newsletters de plusieurs business depuis un service commun et indépendant du transport."
confidence: medium
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems: [CommandGlows, Convex, Astro, Postmark, Resend, CommunityGlows, ContentGlows]
depends_on: [shipglows_data/workflow/specs/unified-identity-email-consent-and-delivery.md, shipglows_data/workflow/specs/commerce-launch-readiness.md, shipglows_data/technical/central-email-operations.md]
supersedes: []
evidence: [commandglows_site/convex/email.ts, commandglows_site/convex/emailDelivery.ts, commandglows_site/convex/commerceAlerts.ts, commandglows_site/src/lib/email/central/transport.ts, commandglows_site/src/lib/email/central/worker.ts, commandglows_site/tests/email/centralLifecycle.test.ts]
next_step: Erase the scoped test evidence on September 14; separately validate commerce linkage, callbacks and independent monitoring before broader activation.
next_review: "2026-10-07"
---

# Service email commun : achèvement backend et API

## Status

### Correction de périmètre autorisée le 7 septembre

L’opératrice demande le lancement dans une nouvelle tâche du **backend et des API**. Les UI existantes de ContentGlows et ShipGlows seront les clientes de composition et de pilotage ; aucun nouvel éditeur de newsletters ni nouvelle console email n’est à construire dans CommandGlows. Les références à une console ci-dessous décrivent les besoins servis par les API, pas une nouvelle surface à implémenter dans ce dépôt.

Ce lancement autorise l’audit de disponibilité puis l’implémentation locale vérifiée du périmètre corrigé, avec commits progressifs. Le statut draft conserve les décisions d’activation encore ouvertes : ce n’est pas une garantie de perfection ni une autorisation d’envoi public. Les modifications d’UI des autres dépôts restent des lots de raccordement ultérieurs. Lire leurs interfaces existantes est permis pour concevoir les contrats compatibles. La recette doit exercer ces contrats via clients de test en attendant les UI.

Livrables API explicites : catalogue/versions de modèles, aperçu rendu HTML/texte, création/version de campagne, estimation d’audience expurgée, approbation, programmation/fuseau, pause/annulation, statut paginé, diagnostic et opérations autorisées. Publier schémas, exemples sans secrets, erreurs, idempotence et tests de compatibilité. Une UI ne reçoit aucun jeton fournisseur ni credential global ; authentification utilisateur et autorisation business sont vérifiées par le backend ou un relais serveur déclaré. Ne pas embarquer un secret machine dans Flutter ou le navigateur.

Plan d’exécution complémentaire du contrat `unified-identity-email-consent-and-delivery.md`, qui reste l’autorité du modèle métier. Ce document ne crée ni second registre de contacts ni architecture concurrente. Il couvre les manques de la tranche locale déjà écrite, son activation maîtrisée et son déploiement progressif dans les business.

La demande du 7 septembre autorise l’implémentation locale du backend et des API décrite dans la correction ci-dessus, ainsi que les commits et push progressifs. Les décisions d’activation restent ouvertes. Aucun achat, changement DNS, abonnement fournisseur, import réel ou activation publique n’est autorisé automatiquement. Le destinataire de recette autorisé dans la conversation sera fourni par configuration privée, jamais inscrit dans le code ou les exemples publics.

### Disponibilité et exécution locale — 7 septembre

Checkpoint vérifié : `34b4e68`, branche isolée `codex/central-email-backend`. Socle installé avec le lockfile ; 48 tests email existants passent avant modification. Contrats et runbook lus. Les lots locaux indépendants sont prêts ; aucun déploiement partagé n’est prêt tant que schéma/index/fonctions/crons réels ne sont pas capturés et comparés. Aucun outil Convex ou Vercel n’est exposé dans le catalogue de cette tâche ; leur installation sur Windows ne constitue pas une connexion à la recette.

Classification : backend, domaine partagé, documentation. Invariants de validation : autorisation business côté serveur, idempotence et concurrence Convex, aucune reprise aveugle des inconnus, suppressions préservées, schéma additif, aucun secret client. La configuration de recette Live n’autorise que la classe opérateur et réserve durablement un quota avant soumission. Une activation reste un acte distinct.

### Execution Batches

| Lot local | Propriété d’écriture exclusive | Dépendance et preuves | Intégration |
| --- | --- | --- | --- |
| Distribution | `convex/email.ts`, `emailConfig.ts`, `emailSchema.ts`, `central/worker.ts`, `central/transport.ts`, tests distribution existants/nouveaux | Socle ; tests Convex et HTTP quota, inconnus, routes et suppressions | Agent principal |
| Opérations et contrats | Nouveaux modules `emailOperations*`, `convex/schema.ts`, contrôleurs/routes opérateur, `central/api.ts`, tests opérations, gouvernance | Contrats existants ; intégration finale avec distribution ; authz, isolation, pagination, arrêt et audit | Agent principal |

Les écritures de ces deux lots sont disjointes. Le raccordement commerce intervient après la distribution, sans modification concurrente de ses fichiers. Les interfaces des autres dépôts restent en lecture seule.

Après validation locale distribution/commerce, le lot campagnes possède exclusivement les nouveaux `emailCampaign*`, contrôleur/routes campagnes, tests campagnes et les raccordements limités `email.ts`, `emailSchema.ts`, `schema.ts`, `emailDelivery.ts`. L’agent principal conserve revue, documentation, API opérateur/catalogue et intégration finale. Il réutilise la politique de consentement existante ; aucun import réel, élargissement de destinataires actifs ou politique de rétention n’est inclus. Preuves : instantané paginé, version/approbation, retrait, pause/annulation et reprise sans double job.

## User Story

En tant qu’opératrice seule de nombreux business, je veux configurer un business une fois, envoyer ses messages de service et ses newsletters avec sa marque, comprendre les échecs depuis une console commune, et pouvoir changer de fournisseur sans modifier chaque application ni perdre les consentements.

## Minimal Behavior Contract

Un événement métier vérifié ou une campagne explicitement approuvée produit une demande durable. Le service contrôle le business, l’environnement, le destinataire, le modèle et les règles d’envoi ; il affiche ensuite un résultat traçable. Un échec possède un responsable, une explication et une sortie. Un résultat fournisseur incertain reste incertain : il n’entraîne pas un deuxième envoi aveugle. Une désinscription entre la préparation et l’envoi bloque le marketing restant.

## Success Behavior / Error Behavior

- Une commande acceptée retourne un identifiant interne stable, pas une promesse de réception.
- L’opératrice distingue mis en file, soumis au fournisseur, livraison déclarée, rejeté, supprimé par politique et résultat inconnu. La réception dans une boîte est une preuve distincte.
- L’utilisateur voit la bonne marque, une adresse de réponse fonctionnelle, un contenu lisible et les préférences adaptées au message.
- Si le fournisseur tombe, les droits d’accès et la commande métier restent cohérents ; un email défaillant ne révoque pas un achat.
- En cas d’incertitude, l’opératrice peut vérifier les preuves, suspendre ou résoudre le dossier ; aucune commande « renvoyer » ne contourne cette vérification.

## Problem / Existing Evidence

Audit de préparation ciblé, sans prétention d’audit exhaustif des vingt business :

| Surface | État observé | Travail restant |
| --- | --- | --- |
| Convex `email.ts`, `emailSchema.ts`, `emailConfig.ts` | Domaine, commandes, consentements, préférences, suppressions, file et tentatives existants | Réconcilier avec le contrat complet, découper les responsabilités si nécessaire, tests de portée et migration additive |
| API v1 et `central/transport.ts` | Interface de transport et adaptateur Postmark existants | Rendre les capacités explicites et prouver le remplacement sans dépendance métier au fournisseur |
| `central/worker.ts`, `emailDelivery.ts` | Worker et surveillance périodique écrits ; envoi central non configuré dans la prévisualisation inspectée | Configuration déclarée, activation, exploitation et preuve hébergée |
| Newsletters | Aperçu/approuvation d’un pilote à un destinataire, pas moteur complet d’audience | Campagnes paginées, planification, arrêt, bilans partiels et reprise |
| `commerceAlerts.ts` | Transport webhook HTTP uniquement ; cinq essais, suivi et escalade visibles en recette | Raccordement durable au service email, sans assimilation « file acceptée » à « email livré » |
| Postmark | Accès opérateur et domaine CommandGlows vérifiés lors du tour précédent | Revalider serveur réel, flux, droits, configuration et réception au moment de l’activation |
| Resend | Appels hérités encore présents | Inventaire exact des envois/inscriptions, reprise de provenance et bascule sans double envoi |
| Autres produits | Documentation d’un pilote CommunityGlows et d’un proxy ContentGlows | Réaudit de chaque branche/surface avant toute modification ; aucun état hébergé supposé |

Le socle local est réutilisable. Les chiffres de tests des checkpoints antérieurs ne sont pas une nouvelle preuve de ce plan. Aucun benchmark ou chiffrage fournisseur global n’a été exécuté ici.

## Solution / Architecture proposée

`Applications → API métier versionnée → politiques et file Convex → worker → adaptateur de transport → fournisseur`

`Événements fournisseur → entrée authentifiée → normalisation → état interne / suppression / console`

CommandGlows héberge initialement ce service, avec les technologies existantes. Pas de nouveau microservice, broker ou moteur externe sans besoin démontré. Les modules internes restent séparés : configuration, contacts/consentements, modèles, demandes/campagnes, distribution, événements et exploitation. Les applications ne connaissent ni Server ID Postmark ni jeton fournisseur.

Le contrat de transport expose soumission et résultat normalisé ; recherche de preuve, mode de test, limites, traitement des désinscriptions et capacité d’idempotence sont déclarés par adaptateur. Une capacité absente n’est jamais simulée par un faux succès. Les particularités de désinscription Postmark restent dans l’adaptateur et ses liens opaques, pas dans les produits.

Preuve d’agnosticisme : mêmes commandes/domaines testés avec Postmark et un adaptateur de capture indépendant ; export/import canonique et répétition du scénario de changement fournisseur. Un deuxième fournisseur réel complet est différé tant qu’aucun besoin/budget ne le justifie. La migration future de délivrabilité, des domaines et des suppressions demandera toujours une recette.

## Scope In

1. Emails de service : achat confirmé, accès disponible, attente/anomalie d’accès et autres événements enregistrés au catalogue.
2. Alertes opérateur : incident commerce, échec d’envoi, file bloquée, surveillance manquante, seuils de coût/volume.
3. Newsletter : inscription anonyme ou connectée, confirmation, préférences, désinscription, campagne, programmation et suivi.
4. API de pilotage pour les UI existantes, onboarding d’un business par configuration, diagnostic, export et opérations auditées.
5. Modèles versionnés HTML/texte, FR/EN, marques et adresses de réponse propres aux business.
6. Déploiement, reprise, migrations Resend et intégration progressive des applications sélectionnées.

## Scope Out / Constraints

- Pas de migration Clerk/Auth0 : Clerk reste le fournisseur du site. Les emails OTP/reset restent sous l’autorité du fournisseur d’identité ; leur configuration peut être inventoriée, mais leur réimplémentation est exclue.
- Pas de CRM complet, SMS/push, boîte de réception/support omnicanal, automation marketing arbitraire, listes achetées ou scraping.
- Pas d’activation automatique des vingt business. Chaque business passe la même fiche d’intégration et ses preuves ; priorité initiale proposée : CommandGlows puis CommunityGlows puis ContentGlows.
- Pas de partage de destinataires entre marques par défaut, ni migration automatique des business sensibles. Centraliser l’administration n’autorise pas le croisement de données.
- Pas d’import historique sans provenance, ni nettoyage destructif des anciennes tables/index. L’incident antérieur sur les index email reste à réconcilier.
- Pas de nouvelle plateforme de test payante imposée. Simulation locale, sandbox fournisseur et test réel borné sont trois modes explicites.

## Invariants / Frontières de confiance

- Identité, adresse de contact, consentement, audience, droit produit et transport restent distincts. Aucun achat n’accorde automatiquement le marketing ; aucune désinscription ne supprime une licence.
- Authentifier chaque application et vérifier côté serveur ses business, opérations et environnement. Les formulaires publics ne possèdent jamais un secret d’envoi ni le droit de choisir arbitrairement un destinataire/contenu.
- Un job pour un destinataire ; pas de listes exposées par To/CC. Les identifiants idempotents sont bornés par business/environnement/opération ; réemploi avec contenu différent → conflit.
- Les déclencheurs métier viennent de faits vérifiés et persistés. Définir pour chaque modèle qui envoie déjà une confirmation (Stripe, Clerk, application) afin d’éviter les messages redondants.
- Le message conserve version de modèle, contenu approuvé, langue, périmètre et route fournisseur. Un job `unknown` reste lié à son fournisseur initial, y compris lors d’une bascule.
- Le consentement et la suppression sont relus avant chaque envoi. Prévoir une priorité de suppression explicite par motif et classe ; ne jamais promettre qu’un email transactionnel contournera un blocage de sécurité ou un hard bounce.
- Les modifications de contenu, audience, expéditeur, calendrier ou route invalident une approbation de campagne. Un retrait de consentement réduit les destinataires sans élargir l’audience approuvée.
- Secrets en stockage déclaré ; logs sans corps, adresses brutes, liens signés ni données d’addiction/santé. Les business sensibles ont une frontière documentée avant onboarding ; leur simple appartenance ne figure pas dans la vue globale par défaut.

## Catalogue des messages et configuration par business

La fiche versionnée contient : business/product IDs, propriétaire juridique, marque visible, expéditeur/reply-to, domaines publics et préférences, langues, sources/événements autorisés, finalités et notices, périmètre de suppression, modèles, transport/flux, environnement, destinataires autorisés en recette, quotas, rétention, opérateur et procédure de secours. Les valeurs privées restent hors du dépôt partagé.

Chaque modèle déclare : déclencheur, public, classe (`service`, `operator`, `marketing`), schéma de variables, langue par défaut, expiration du message, clé de déduplication et événement rendant le message obsolète. Exemples : ne pas annoncer un accès disponible si le grant n’existe pas ; ne pas envoyer une ancienne relance après remboursement ; ne pas confondre facture et notification d’achat. Les rappels promotionnels ne sont pas classés « service » par commodité.

## Implementation Tasks

| Lot / priorité | Actions et cibles | Dépendances | Sortie vérifiable |
| --- | --- | --- | --- |
| 0 — P0, réconciliation | Comparer contrat, `convex/email*.ts`, API v1, tests, déploiement et appels Resend. Produire inventaire source→modèle→transport et delta de schéma/index | Plan validé | Aucun appel actif oublié dans les trois premiers produits ; incohérences et fonctions désactivées identifiées |
| 1 — P0, distribution commune | Durcir contrat de transport et politique de configuration, jobs/tentatives/callbacks, idempotence et état inconnu ; séparer mode application et mode fournisseur | 0 | Capture locale et Postmark passent la même suite ; arrêt/reprise sans perte ; aucun secret frontend |
| 2 — P0, tranche commerce utile | Connecter l’outbox commerce à la file email via une commande authentifiée/durable ; reprendre un cycle d’alerte explicitement identifié ; ajouter messages d’achat/accès selon catalogue | 1, expéditeur/recette déclarés | Incident→demande email→preuve fournisseur→réception ; pas de boucle de notifications ni changement de droits |
| 3 — P0, opérations minimales | API liste/détail/recherche, statut du canal, prise en charge, inconnus, preuves et arrêt par business/classe ; contrat utilisable par les UI existantes et surveillance indépendante | 1–2 | Clients de test prouvent diagnostic et résolution via API sans accès DB ni secret fournisseur ; intégration visuelle ultérieure explicitement distinguée |
| 4 — P1, préférences et contacts | Finaliser confirmation, retrait, réinscription, changement d’adresse, export/effacement/rétention et preuves par finalité | 1, politiques retenues | Retrait bloque un message préparé ; même adresse dans deux marques sans fuite ni fusion d’identité |
| 5 — P1, campagnes complètes | Aperçu HTML/texte, test, audience et exclusion estimées, approbation versionnée, programmation/fuseau, fan-out paginé, pause/annulation, compte rendu | 3–4 | Gros lot interrompu/repris sans doublon ; nouvelle inscription non ajoutée silencieusement à un instantané approuvé |
| 6 — P1, onboarding réutilisable | Fiche/config validée, test de connexion, modèles et checklist réutilisables ; raccorder CommandGlows puis un deuxième business | 2–5 selon classe | Deux business fonctionnent avec leur marque et leurs autorisations sans copie du moteur |
| 7 — P1, migration Resend | Inventaire lecture seule, correspondances, import sec, provenance et suppressions, checkpoints, comparaison, bascule d’un seul producteur par flux | 4, 6 | Pas de double envoi ; ambiguïtés isolées ; retour arrière conserve retraits et historique |
| 8 — P2, consolidation | Charge, restauration, rétention automatique, budget, export fournisseur, documentation et extension business par business | 0–7 | Objectifs mesurés, exercice de panne/restauration et dossier d’activation pour chaque business |

Chaque lot se termine par revue, preuves adaptées et commit ciblé. Un lot vert ne valide pas les lots suivants. Le lot 2 débloque la recette commerce sans attendre le moteur complet de newsletters. Réévaluer l’effort après le lot 0 ; aucune date ferme ni coût mensuel inventé sans volumes et offre vérifiés.

## Campagnes, reprise et observabilité

États campagne proposés : brouillon, approuvée, programmée, distribution, en pause, terminée, annulée, partiellement échouée. Cible figée par instantané/version lors de l’approbation ; distribution paginée avec checkpoint et unicité campagne+contact. Éligibilité relue au dernier moment. Annuler bloque le travail futur mais ne rappelle pas un email déjà soumis.

Priorité et quotas séparés empêchent une newsletter de bloquer un message de service. Bornes proposées à tester : prise en charge d’une alerte en moins de 5 minutes et mise en distribution d’un service en moins de 2 minutes en fonctionnement normal ; ce ne sont pas des garanties de réception fournisseur. Définir ensuite les objectifs de débit campagne à partir des volumes réels et limites contractuelles.

Console : vue globale agrégée par business/classe/environnement, détail autorisé et expurgé, âge du plus vieux job, retard du worker, taux d’échec/inconnu, rejets/plaintes, consommation estimée et envois stoppés. Pas de taux d’ouverture présenté comme preuve de lecture ; suivi d’ouvertures/clics désactivé par défaut.

Surveillance indépendante du fournisseur email indispensable : alerte de worker et canal de secours non email à choisir avant lancement. Définir regroupement, refroidissement et escalade pour éviter qu’une panne génère une tempête d’alertes. L’opératrice seule peut cumuler validation et exécution ; conserver confirmation du contenu/périmètre et piste d’audit, sans imposer artificiellement deux employés.

## Test Contract / Test Strategy

| Cas obligatoire | Résultat attendu / preuve |
| --- | --- |
| Demande répétée et crash après création | Même job interne, aucun double effet ; tests Convex réels |
| Timeout après acceptation fournisseur | `unknown`, pas de renvoi automatique ni bascule vers un second fournisseur |
| Livraison tardive ou callback répété/désordonné | Corrélation au job ; pas de réactivation d’un consentement retiré |
| Mauvais secret/business/flux/environnement | Refus sans fuite ; preuve API et callbacks falsifiés |
| Achat sans inscription newsletter | Message service admissible, zéro marketing ; accès indépendant |
| Retrait avant dispatch et GET de scanner | Envoi marketing bloqué ; scanner ne confirme pas un consentement |
| Hard bounce/plainte puis réinscription | Suppression maintenue selon sa politique ; aucune réactivation implicite |
| Campagne zéro/un/beaucoup de destinataires | Décompte exact, pagination et quotas ; reprise au milieu du lot |
| Contenu/audience modifiés après approbation | Nouvelle approbation requise ; ancien snapshot identifiable |
| Arrêt, reprise, heure d’été, message obsolète | Pas d’envoi futur après arrêt ; instants/fuseau vérifiés ; expiration respectée |
| Marque A/B, même adresse | Préférences et autorisations séparées ; pas de fuite dans liens ou console |
| Effacement/restauration | Données effacées selon portée ; opposition non perdue après restauration ; droits commerce intacts |
| Fournisseur remplacé | Commandes produits inchangées ; jobs incertains conservés chez l’ancien ; suppressions réconciliées |
| Panne générale email | File durable, console explicite et alerte indépendante observable |

Ordre de preuve : suites `tests/email` et régressions commerce/identité → typecheck Astro/Convex → environnement hébergé borné → fournisseur sandbox → envoi réel autorisé → HTML/texte et en-têtes reçus → accès/préférences/console authentifiés → pilote surveillé.

Un serveur Postmark Sandbox ne livre pas en boîte. Le checkpoint initial couplait `environment=sandbox` à `DeliveryType=Sandbox` : ce couplage est maintenant remplacé localement par un mode fournisseur distinct et un profil Live de recette limité à la classe opérateur, liste blanche privée, quota atomique et expiration. Il n’est pas configuré ni vérifié en hébergé. L’adresse fournie autorise l’alerte ciblée, pas une campagne ni l’envoi à d’autres contacts.

Réception : Gmail/Outlook et un client WebKit représentatif, mobile/desktop, images bloquées, liens, contraste et texte alternatif. Utiliser les composants/tokens de marque existants ; le HTML email demande des tests dédiés de compatibilité, pas une copie des styles du site. La boîte de recette fournie peut agréger/différer les messages : distinguer acceptation SMTP et disponibilité à la lecture.

## OWASP Security Gate / ZOMBIES coverage

Autorisation multi-business (contrôle d’accès), rotation/révocation des secrets (authentification), validation de schémas/HTML/URLs (injection/SSRF), quotas anti-abus, authentification des callbacks et journalisation expurgée sont obligatoires. Opaque tokens : expiration, usage unique, non-énumération, scanner GET sans mutation de confirmation. Les mécanismes standards de désinscription fournisseur restent compatibles et vérifiés séparément.

ZOMBIES : zéro/un/multiples destinataires ; limites de taille, temps, quota et pagination ; interfaces API/UI/fournisseur ; erreurs réseau, reprises et crash ; cas simples de service et campagne avant variantes. Preuve de charge synthétique sans envoi public. Aucun label de conformité universelle n’est attribué par cette checklist.

## Dependencies / Open Questions

Décisions recommandées à valider avec le plan : socle existant Convex/Astro, Postmark premier adaptateur, capture indépendante pour preuve d’agnosticisme, tracking désactivé, CommandGlows pilote puis CommunityGlows/ContentGlows, pas de nouvelle dépense automatique.

Décisions à fournir avant les lots concernés, sans bloquer la préparation locale :

- Avant envois publics : entités responsables, pays/marchés, notices/finalités et rétention par classe de données ; clauses/sous-traitants et transferts applicables à vérifier. Ne pas déduire une politique légale du seul fait que l’opératrice parle français.
- Avant exploitation : canal indépendant de secours et couverture en cas d’indisponibilité de l’opératrice ; limites acceptées de volume, dépenses et priorité.
- Avant chaque business : identité visible, expéditeur/réponse, sensibilité et séparation nécessaire ; volumes mensuels et pointes attendus.
- Avant activation réelle : exacts déploiement, serveur, flux, secrets stockés, origine des liens, destinataires et plafond de la recette. L’autorisation existante pour une alerte test reste bornée à cet usage.

## Risks / Retour arrière

Risque principal : confondre travail accepté et message reçu, ou renvoyer après timeout. Autres risques : newsletter bloquant le service, réputation partagée, fuite entre marques, anciens retraits perdus à la migration, coûts variables, arrêt de l’unique opératrice, email d’authentification dupliqué. Les séparations logiques ne garantissent ni cloisonnement réglementaire ni réputation indépendante.

Rollback par business/classe : arrêter nouveaux jobs, conserver historique et suppressions, traiter les envois en vol, vérifier les inconnus, réactiver uniquement un producteur/transport déclaré après réconciliation. Interdit de vider les files, réinitialiser les compteurs ou recharger les anciennes listes pour revenir en arrière.

## Acceptance Criteria

Le service n’est déclaré prêt que si un nouveau business peut être ajouté par configuration documentée, deux business passent les preuves d’isolation, les trois classes de messages fonctionnent, une campagne partielle reprend correctement, un timeout ne duplique pas, un retrait bloque la suite, la console permet la résolution, la surveillance indépendante alerte, la restauration préserve les oppositions et les coûts sont bornés. Chaque business conserve sa propre autorisation d’ouverture et son procès-verbal de recette.

## Links & Consequences / Documentation Coherence

Mettre à jour le contrat principal pour les extensions validées ; `central-email-operations.md` pour l’exploitation/profils ; `commerce-operator-runbook.md` pour l’alerte email ; `commerce-launch-readiness.md` pour les preuves ; schéma/config/API et exemples sans secrets ; notices/pages préférences de chaque produit après validation. Conserver `shipglows_data` racine comme corpus canonique. Aucun second tracker parallèle.

Sources relues le 7 septembre 2026 : [Postmark Sandbox](https://postmarkapp.com/developer/user-guide/sandbox-mode/server-sandbox-mode), [tests Postmark](https://postmarkapp.com/support/article/1213-best-practices-for-testing-your-emails-through-postmark), [CNIL prospection électronique](https://www.cnil.fr/la-prospection-commerciale-par-courrier-electronique). Le choix du double opt-in et des frontières de business reste une politique produit à distinguer des règles légales contextuelles.

## Execution Notes / Current Chantier Flow

### Local milestone evidence — September 7

- Lot 0 : interfaces des trois clients inspectées ; producteurs source inventoriés ; 32 schémas/index de tables et 69 contrats de fonctions capturés en lecture seule sur la recette. Test de compatibilité additive passé. Inventaire live des crons et incident historique d’index encore ouverts.
- Lot 1 : Postmark/capture, mode fournisseur distinct, profil de recette opérateur à quota durable, route figée, relecture des suppressions et inconnus sans renvoi automatique ; aucune configuration/envoi réel.
- Lot 2 : liaison atomique alertes commerce→email et état fournisseur distinct, canal figé, obsolescence/rebonds tardifs, relance des cycles en échec sans duplication d’inconnu. Aucun nouveau message acheteur faute de déclencheur/ownership de confirmation réconciliés.
- Lot 3 : API opérateur paginée/expurgée, relais admin du site, contrôle de pause et actions versionnées/idempotentes, preuves fournisseur et catalogue/aperçu. Audit au niveau client technique ; attribution individuelle des relais externes et surveillance indépendante encore à compléter.
- Lot 5 local indépendant : versions de contenu, instantané paginé par génération de consentement, approbation/horaire/fuseau, fanout paginé, pause/reprise/annulation et priorité opérateur/service. Le moteur réutilise les règles existantes ; il n’active aucun public nouveau. Blocs avancés, import/rétention et raccordements UI restent exclus de ce jalon.
- Preuves intégrées : **326 tests / 35 suites** email/commerce/auth/bridge passent ; TypeScript Convex passe ; Astro **296 fichiers, 0 erreur, 0 avertissement, 1 hint préexistant**. Revue indépendante et corrections des pauses après claim, du budget de retry et du blocage des anciens cycles livrés. Les métadonnées de sept documents passent leur validation.
- Implementation Excellence Gate : backend/shared pass pour les surfaces locales exercées (authz/isolation, idempotence, pagination, concurrence, arrêts, schéma additif et secrets hors clients). UI non modifiée. Hosted/fournisseur/réception/restauration restent non prouvés ; aucune conformité globale ni clôture d’activation revendiquée.

Les lots de rétention/effacement automatique et d’import/bascule dépendent toujours des décisions opérateur et de preuves spécifiques. Aucun compte, credential fournisseur, abonnement, DNS, import réel ou migration Clerk/Auth0 n’a été modifié. Les nouveaux contrats publics décrivent le backend local et ne prouvent pas leur déploiement.

Préparation achevée → lancement backend/API autorisé en nouvelle tâche → revue de disponibilité et lot 0 → lots 1/2/3 pour commerce → lots 4/5 newsletters → lots 6/7/8 par business → raccordements UI puis recette et activation distinctes. Les migrations d’authentification restent suspendues. Les preuves de rendu des UI ne sont pas remplacées par les seuls tests API.

## Skill Run History

September 7 result: `d31760a` deployed to the shared development target and protected branch preview; four historical indexes restored and verified with no index deletion. One authorized operator test was submitted through the normal hosted worker; Postmark reports Delivered and the durable quota is 1/1. The operator supplied a Gmail screenshot confirming visible inbox receipt with the expected sender, subject and content; only a redacted evidence reference is stored. No campaign, default scheduler dispatch or commerce channel was activated. Acceptance configuration was removed after the proof. Seven-day trace cleanup remains due September 14. The preceding preparation notes remain chronological evidence, superseded by this result.

The operator subsequently authorized the exact controlled test, specified the CommandGlows sender/reply address and private recipient, and chose seven-day evidence retention. Four historical index definitions were recovered from the original deployment receipt; additive restoration and an internal idempotent acceptance producer are prepared. The shared-target dry run reports no index deletion. Scheduled dispatch and the commerce channel stay disabled while the single test is manually driven through authenticated preview access. No public activation is implied.

Continuation at 16:57 UTC: the authenticated dashboard cron inventory now matches all three local schedules (300/60/900 seconds). The four core email/commerce-email configuration variables are absent/empty; a redacted readiness snapshot and cron parity regression are retained. Vercel reports the `a92de91` preview successfully deployed. No shared deployment, configuration mutation or real email was performed. Historical index recovery and private activation settings still block hosted acceptance; the earlier incomplete-cron note above records the preceding checkpoint.

| Date UTC | Skill | Model | Action | Result | Next step |
| --- | --- | --- | --- | --- | --- |
| 2026-09-07 | sg-planning / sg-engineering | GPT-6 | Réconcilier contrat et socle local, identifier limites de recette et écrire le plan complet | Draft complémentaire, pas d’activation | Validation du périmètre puis lot 0 |
| 2026-09-07 | sg-development | GPT-6 | Réconciliation, distribution, commerce, opérations et campagnes locales ; revue indépendante et corrections | 326 tests/35 suites, Convex et Astro passent ; source isolée, aucune activation | Parité crons/configuration, décisions opérateur et recette hébergée bornée |
