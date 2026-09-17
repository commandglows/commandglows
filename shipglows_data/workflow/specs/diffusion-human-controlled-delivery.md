---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.2.0"
project: CommandGlows
created: "2026-09-16"
updated: "2026-09-16"
created_at: "2026-09-16T19:02:32Z"
updated_at: "2026-09-16T21:16:38Z"
status: draft
source_skill: sg-development
source_model: GPT-6
scope: diffusion-human-controlled-delivery
owner: Diane
user_story: "Contrôler humainement la diffusion avant, pendant et après envoi, avec règles visibles, alertes segmentées et IA limitée à la recommandation."
confidence: medium
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems: [commandglows_site, shipglows-email-engine, Convex, Postmark]
depends_on:
  - shipglows_data/workflow/specs/unified-identity-email-consent-and-delivery.md
  - shipglows_data/workflow/specs/central-email-completion-plan.md
  - shipglows_data/technical/newsletter-campaign-api.md
supersedes: []
evidence:
  - "Demande de Diane : contrôle avant, pendant et après envoi ; approbation humaine des changements sensibles."
  - commandglows_site/convex/emailCampaigns.ts
  - commandglows_site/convex/emailCampaignPolicy.ts
  - commandglows_site/convex/email.ts
  - commandglows_site/src/lib/email/central/campaignApi.ts
  - commandglows_site/src/lib/email/central/transport.ts
next_step: Implémenter le lot 0 selon les contrats R01–R08 précisés ; réparer les tests du socle avant les lots dépendants ; aucune activation réelle.
---

# Title

Diffusion : contrôle humain avant, pendant et après envoi

## Status

Corrections documentaires R01–R08 intégrées le 16 septembre 2026 dans « Normative implementation contracts ». Les contrats sont définis pour préparer les lots locaux ; le socle incompatible reste à réparer au lot 0. La revue `not ready` ci-dessous est conservée comme constat historique antérieur aux corrections, et ne constitue pas un nouveau résultat de tests. Le contrat de suspension validé par Diane reste inchangé. Aucune implémentation ni activation effectuée dans ce chantier. Les paramètres métier de production restent explicitement non approuvés.

Le livrable demandé dans cette tâche est cette spec et son emplacement. Cette spec n'est pas une autorisation de déploiement, d'envoi réel, de modification DNS, de consentement ou de fournisseur. Les autorisations historiques d'autres chantiers ne sont pas transférées automatiquement.

## User Story

En tant qu'opératrice de plusieurs business, je veux préparer et approuver une diffusion bornée, suivre ses résultats par segment et fournisseur de boîte, comprendre les alertes et décider d'une réduction, suspension ou reprise, sans qu'une IA puisse décider seule d'envoyer ou d'étendre l'envoi.

## Minimal Behavior Contract

Quand l'opératrice demande une vérification, le serveur produit un rapport daté lié à une version de contenu, une identité, une audience et une politique. L'envoi reste bloqué tant que les preuves obligatoires ou l'approbation humaine manquent. Chaque départ est recontrôlé ; une désinscription intervenue après approbation exclut immédiatement le contact des départs suivants. Pendant et après l'envoi, les anomalies calculées à partir des résultats réels alimentent une fiche explicative, sans pouvoir d'envoi autonome de l'IA.

## Success Behavior

L'opératrice voit les règles applicables, les destinataires admissibles et exclus, les preuves et leur fraîcheur, puis confirme une portée précise. Le serveur exécute uniquement cette portée, respecte les plafonds malgré la concurrence et présente les résultats et alertes avec leurs limites de mesure. Toute décision sensible est attribuable à un humain autorisé.

## Error Behavior

Une preuve absente, expirée ou inaccessible bloque l'approbation ou suspend les prochains départs. Une donnée analytique absente est « indisponible », jamais zéro. Un résultat fournisseur incertain reste incertain jusqu'à réconciliation, sans renvoi aveugle. La suspension ne rappelle pas les messages déjà transmis. Les erreurs préservent le brouillon et expliquent la prochaine action possible.

## Problem

Constat statique local au 16 septembre 2026, à revalider au démarrage :

- Le backend contrôle version approuvée, audience, adhésion, liste de destinataires autorisés et suppressions ; il revérifie l'éligibilité juste avant transmission.
- La configuration `activated` et la stabilité de la route ne constituent pas une preuve actuelle de vérification de l'identité d'envoi.
- Les pages de 25 et quotas de tests ne constituent pas une politique de volume de campagne ou de fréquence par contact.
- Les événements de rebond, plainte et désinscription existent ; leur traitement individuel n'est pas un moteur d'alertes agrégées.
- `transport.ts` désactive actuellement `TrackOpens` et `TrackLinks`. Aucun suivi de clics/réponses de campagne ne peut être revendiqué sur cette base.
- L'interface classe déjà des campagnes « à vérifier », mais selon états d'échec/incertitude/échéance. Un brouillon avec objet peut être marqué prêt sans préflight complet.
- Le relais administrateur emploie notamment `review/save`, `idempotencyKey` et des reçus différents du backend `snapshot/revise`, `key`. Correction après exécution des tests : un test de contrat réel relais HTTP/Convex existe dans `campaignDomain.test.ts` ; il échoue actuellement. Les tests avec doublures du relais ne compensent pas cet échec.

## Solution

Étendre le backend canonique et l'interface existante, sans second moteur de consentement ni nouvelle console CommandGlows. La politique déterministe protège l'envoi ; l'IA explique des faits et propose une action. Les décisions humaines sont des commandes distinctes avec autorisation serveur et portée immuable.

### 1. Contrat partagé et préflight

- Réconcilier le client Flutter, les routes administrateur, les routes machine, les validateurs Convex et le schéma existant selon le contrat canonique R01 ci-dessous ; ne pas conserver deux logiques métier divergentes.
- Chaque résultat de préflight contient : identifiant et version de rapport, business, campagne/version, identité/route, snapshot d'audience, version de politique, dates de vérification/expiration, contrôles bloquants, avertissements, références de preuve, nombres admissibles/exclus et motifs.
- Contrôles bloquants : authentification et permission, identité d'envoi vérifiée pour la route courante, désinscription fonctionnelle, suppressions consultables et synchronisation suffisamment fraîche, audience complète et admissible, consentement/finalité, politique approuvée et capacité de quota disponible.
- Définir pour chaque preuve sa source, son propriétaire et sa durée de validité dans la politique. Ne jamais accepter un booléen fourni par Flutter comme preuve. L'état fournisseur/DNS doit être vérifié par une source serveur autorisée ; les exigences exactes seront vérifiées dans la documentation officielle lors de l'intégration.
- Réapprobation obligatoire si contenu, identité, route, politique, audience sélectionnée ou plafond autorisé changent. Les retraits de consentement réduisent l'audience admissible sans réintroduire personne ; les nouveaux inscrits n'entrent pas dans un snapshot approuvé.
- « Prête à valider » signifie préflight complet et frais ; « Envoi approuvé » signifie approbation humaine valide. Un objet renseigné ne suffit jamais.

### 2. Politique visible et quotas

Politique versionnée, par business et identité d'envoi, avec portée explicite des limites partagées : maximum par campagne, maximum par fenêtre glissante, fréquence par contact, taille du premier lot, fenêtre d'observation, validité des preuves et règles d'alerte. Les fenêtres utilisent l'heure serveur UTC ; l'interface présente le fuseau utilisateur.

- Aucun profil de production implicitement illimité. Une politique absente ou non approuvée bloque les envois concernés. Ne pas enlever la liste actuelle de destinataires autorisés.
- Toute hausse du plafond ou extension de la portée approuvée exige une nouvelle validation humaine, même en dessous d'un seuil dit « important ». Le volume de référence est le plafond de la dernière politique approuvée, pas le volume proposé par l'IA.
- La fréquence s'applique entre campagnes d'un même business pour un même contact normalisé. Les plafonds d'identité couvrent aussi les business qui partagent réellement cette identité ; ne pas exposer leurs données aux autres tenants.
- Réserver atomiquement les quotas au dernier point avant transmission, avec registre de destinataires indépendant des révisions et identifiant de tentative selon R03/R04. Deux workers ou deux campagnes concurrents ne doivent pas dépasser un plafond.
- Réservation consommée dès transmission possible au fournisseur ; un résultat incertain conserve sa consommation. Libération seulement avec preuve d'absence de transmission. Une relance certaine constitue une tentative soumise aux mêmes limites.
- « Nouvelle audience » : aucune qualification humaine enregistrée pour sa version de définition/source/finalité. Une modification de provenance ou un ajout de contacts non qualifiés remet la cohorte concernée en premier lot. Dupliquer une campagne ou renommer une audience ne contourne pas cette règle.
- Le premier lot est déterministe, borné et approuvé. Les lots suivants attendent la fenêtre d'observation, des données suffisamment fraîches, l'absence de blocage et une validation humaine de poursuite. Le passage du temps seul n'autorise rien.

### 3. Résultats par segment et fournisseur de boîte

- Conserver les dimensions au moment de l'envoi : business, campagne/version, référence pseudonymisée de destinataire, cohortes/segments et fournisseur destinataire. Fournisseur destinataire signifie Gmail/Outlook/etc., pas Postmark.
- Classifier les domaines personnalisés via une résolution serveur bornée et mise en cache lorsque justifiée ; conserver méthode/date/confiance et une catégorie « inconnu ». Ne pas déduire Gmail du seul domaine visible d'une adresse professionnelle.
- Afficher vue globale et ventilation par segment, fournisseur et croisement des deux. Un destinataire appartenant à plusieurs segments ne doit pas être compté plusieurs fois dans le total global.
- Compteurs : tentatives, acceptations fournisseur, livraisons, rebonds temporaires/définitifs, plaintes, désinscriptions, clics uniques qualifiés, réponses uniques attribuées. Séparer les échecs techniques des rebonds destinataires.
- Pour chaque taux : afficher numérateur, dénominateur, fenêtre, effectif, fraîcheur et couverture. Livraison/rebond/échec utilisent les tentatives distinctes pertinentes ; engagement et désinscription utilisent les livraisons connues de la cohorte observée. Si événements incohérents ou couverture incomplète, conserver les compteurs et signaler le taux incomplet plutôt que le corriger silencieusement.
- Clics : ingestion authentifiée et dédupliquée, classification connue/suspecte/inconnue des scanners, conservation séparée du brut et du qualifié ; ne pas prétendre filtrer tous les robots.
- Réponses : corrélation sûre à un message/campagne, exclusion des réponses automatiques et messages de livraison, sans importer par défaut le contenu privé des conversations dans l'analytique.
- Le suivi des clics et la collecte de réponses restent désactivés tant que leur politique de données, rétention et activation n'est pas approuvée. Construire et tester les adaptateurs sur fixtures ; afficher les métriques indisponibles en exploitation tant que non activées.
- Les ouvertures restent facultatives, secondaires et explicitement limitées ; elles ne suffisent jamais à qualifier un contact actif, lever une alerte ou augmenter le volume.

### 4. Alertes et urgence

Moteur déterministe serveur, relançable et borné. Règles versionnées pour échecs, rebonds, plaintes, désinscriptions, baisse durable des clics/réponses et audience inactive. Chaque règle déclare : périmètre, métrique, seuil, fenêtre, référence historique comparable, effectif minimal, nombre de fenêtres consécutives, gravité, délai de répétition et condition de résolution.

- Les comparaisons d'engagement utilisent des cohortes et couvertures comparables. Changement de suivi, échantillon insuffisant ou données périmées donnent « analyse indisponible » ; pas une baisse ou une inactivité inventée.
- Une audience inactive est définie par l'absence durable de clics/réponses qualifiés dans une période configurée avec couverture suffisante ; une ouverture ne la réactive pas.
- Clé d'incident stable par business/campagne/règle/dimensions ; mises à jour et webhooks répétés ne créent pas de fiches en double. Acquittement distinct de résolution ; les événements tardifs recalculent sans effacer l'historique.
- Les signaux font passer automatiquement une campagne « à vérifier » en urgente selon la politique approuvée. Une alerte urgente n'est pas automatiquement une autorisation de suspendre ou reprendre.
- Les blocages obligatoires du préflight arrêtent toujours les prochains départs. Une suspension automatique sur seuil statistique n'est permise que si cette action déterministe est explicitement incluse dans la politique approuvée. Sinon l'alerte appelle une décision humaine. Aucune reprise automatique.
- Notification uniquement à l'apparition, aggravation significative, résolution ou besoin d'action ; pas de répétition à chaque recalcul. Le contrat R07 prévoit des notifications durables dans l'interface Diffusion existante ; aucun canal externe existant n'est présumé disponible.

### 5. Fiche et actions

Étendre la rubrique Diffusion existante et ses composants/thèmes. Aucun nouvel écran concurrent. La fiche présente motif compréhensible, gravité, données factuelles, segment/fournisseur, période, valeur/seuil/référence, fraîcheur, données manquantes, actions et historique humain. Le texte de l'IA est séparé des faits et référence les preuves du serveur ; une fiche reste utilisable sans IA.

- « Réduire l'audience » : aperçu du sous-ensemble encore non envoyé, exclusions et impact ; crée une révision du plan restant et invalide son approbation. Ne modifie pas le consentement et ne renvoie pas aux destinataires déjà traités.
- « Suspendre » : stoppe l'expansion, les nouvelles réservations et les départs non commencés ; indique les messages déjà en vol et leur suivi.
- Décision humaine validée dans cette conversation : arrêter la suite dès la prise en compte serveur de la suspension ; les emails déjà en cours d'envoi peuvent encore arriver et doivent être clairement affichés comme tels. La frontière de départ est le dernier contrôle serveur autorisant la transmission, enregistré atomiquement face à la suspension. Une simple réservation ne constitue pas un départ. Si la suspension gagne cette concurrence, aucune transmission ne commence ; si le départ gagne, le message est suivi comme « en cours d'envoi », sans promesse de rappel ni de livraison. Cette validation porte sur la suspension ; elle ne modifie pas les règles de consentement.
- « Valider » : libellé contextualisé (« Valider ce lot », « Valider la reprise », « Valider la nouvelle limite »), jamais un bouton qui acquitte tout. Refus serveur si préflight obsolète, blocage obligatoire ou permission absente.
- Reprise : nouveau préflight et décision humaine explicite, sans remise à zéro des compteurs/quota/premier lot.
- Accessibilité : clavier, focus après action, annonce d'état, libellés français accentués, petit écran et agrandissement du texte ; réutiliser les tokens de design existants.

### 6. Autorité humaine et IA

- L'IA peut lire une synthèse expurgée, expliquer une alerte et enregistrer une recommandation. Elle ne peut ni approuver, programmer, envoyer, reprendre, augmenter un volume, ni modifier DNS, domaine, identité ou consentement.
- Séparer les identités/scopes serveur de lecture-recommandation, exécution machine bornée et décision humaine. Les workers ne disposent que du pouvoir d'exécuter un plan humain déjà approuvé.
- Approbation issue d'une session opérateur authentifiée et autorisée pour le business, avec confirmation de la portée courante et challenge à usage unique lié à cette session, action et version. Un `actorId`, `human=true` ou identifiant d'approbation fourni par un client ne suffit pas.
- Ne jamais fournir au rôle IA les credentials/scopes d'approbation. Un agent contrôlant une session humaine déjà ouverte reste une limite du modèle : le serveur ne peut pas en déduire l'intention humaine. Documenter cette limite et appliquer les règles d'autorisation de l'agent ; ne pas promettre une preuve biométrique ou une nouvelle authentification forte sans décision dédiée.
- Les demandes de changement DNS/domaine/consentement sont des propositions hors exécution de cette feature. Aucun contournement des exclusions n'est offert par « valider ».
- Journal append-only : acteur/type, business, action, motifs, références de version, ancienne/nouvelle portée, résultat et date. Pas de secrets, corps privés ou listes d'adresses dans les logs/explications IA.

## Scope In

Compatibilité réelle client/API/backend ; préflight et approbations ; politiques et réservations atomiques ; premiers lots ; ingestion normalisée ; agrégats et alertes ; interface Diffusion existante ; séparation IA/humain ; migrations additives, documentation et tests.

## Scope Out

Déploiement, envoi réel, hausse des destinataires autorisés, activation du tracking, achat, migration de fournisseur ou d'authentification, changement DNS, import de contacts, collecte massive des boîtes privées, nouvelle console, modifications de l'app clavier CommandGlows.

## Constraints / Dependencies

- Backend : `C:/Users/Diane/ShipGlows/commandglows/commandglows_site` (Astro/Convex).
- UI : `C:/Users/Diane/ShipGlows/shipglows-email-engine/app` et `packages/newsletter_studio_flutter`, avec composants de `packages/source_sidebar_flutter` si nécessaires.
- Gouvernance propriétaire : cette spec, dans le `shipglows_data` racine de CommandGlows. Elle complète les specs email existantes et la spec `newsletter-campaigns-postmark.md` du moteur, sans recopier leurs registres ni les déclarer terminés.
- Préserver tous les changements étrangers, notamment `commandglows_app/pubspec.yaml` observé modifié pendant la préparation. Relever à nouveau branches, worktrees et états Git des deux dépôts avant exécution.
- Lire les instructions de chaque dépôt et l'environnement ShipGlows avant tests dépendant du runtime. Utiliser les URL/session gérées ; aucun contournement d'authentification. Aucun secret dans Flutter, fixtures ou documentation.
- Sources initiales : `convex/emailCampaigns.ts`, `convex/email.ts`, `src/lib/email/central/campaignApi.ts`, `app/lib/campaign_repository.dart`, `app/lib/source_workspace.dart`.

## Invariants

L'achat ou la création de compte n'accorde pas un consentement marketing. Une désinscription gagne sur toute approbation. Les quotas ne diminuent pas du fait d'un redémarrage. L'IA ne s'auto-approuve pas. Une donnée absente n'est pas un succès. Les envois déjà soumis ne sont jamais présentés comme rappelés.

## Implementation Tasks / Execution Batches

| Lot | Actions et propriété d'écriture | Dépendance | Preuve de sortie |
| --- | --- | --- | --- |
| 0 — Contrat | Intégrateur : inventorier routes, consommateurs, schémas/index/crons et tests ; réconcilier relais, validateurs, reçus, modèles Flutter et erreurs ; documenter la migration | Readiness | Client/réel relais/réel handler Convex compatibles, sans mock de la frontière en défaut |
| 1 — Autorité et préflight | Backend : identités/scopes, preuves, rapports, approbations et invalidation ; migrations additives | 0 | Refus multi-tenant, agent, version périmée et preuve indisponible ; succès humain borné |
| 2 — Politique et exécution | Backend : plafonds, réservations, fréquence, premiers lots, pause/reprise et réconciliation | 1 | Deux workers/deux campagnes concurrents ; aucun dépassement ni doublon |
| 3 — Observations | Backend : adaptateurs d'événements, déduplication, dimensions, couverture, agrégats et alertes | 0 et contrat de politique 2 | Événements répétés/tardifs, fenêtres, faibles effectifs, fournisseur inconnu, bot et réponse automatique |
| 4 — Diffusion | UI : règles visibles, états honnêtes, fiche d'alerte et actions confirmées ; explication IA facultative sous scope réduit | 1–3 | Tests Flutter + parcours visuel avec données synthétiques déterministes |
| 5 — Intégration | Intégrateur : compatibilité, migration/rollback, docs, tests de non-régression et preuves finales | Tous | Matrice ci-dessous renseignée avec résultats réels et limites |

Exécution séquentielle par défaut. Un agent responsable de l'intégration possède les schémas, routes et contrats partagés. Des sous-agents peuvent travailler en lecture seule en parallèle ; écritures parallèles uniquement après contrat figé et répartition de fichiers sans chevauchement. Ne pas démarrer l'UI sur des reçus inventés.

## Acceptance Criteria / Test Contract

| ID | Scénario | Résultat obligatoire |
| --- | --- | --- |
| A01 | Relais administrateur vers vrais validateurs/handlers locaux | Aucun décalage de noms, types, états ou reçus ; tests de contrat échouent si réintroduit |
| A02 | Identité inconnue/expirée, suppressions indisponibles, audience incomplète | Zéro soumission fournisseur ; motif lisible |
| A03 | Désinscription après approbation et avant réservation | Contact exclu ; autres contacts restent bornés par le plan |
| A04 | Contenu/route/politique modifié après approbation | Approbation inutilisable ; nouvelle validation exigée |
| A05 | Deux workers et deux campagnes proches du plafond/contact | Réservations atomiques ; plafond partagé respecté |
| A06 | Timeout fournisseur, retry et redémarrage worker | Aucun renvoi aveugle ; quota conservé jusqu'à preuve contraire |
| A07 | Nouvelle audience puis campagne dupliquée | Premier lot toujours borné ; aucune poursuite sans décision humaine |
| A08 | Événements dupliqués, désordonnés, tardifs, non authentifiés | Déduplication ; refus des non authentifiés ; recomputation traçable |
| A09 | Segments qui se recouvrent et fournisseur inconnu | Totaux uniques exacts ; dimensions/limites affichées |
| A10 | Clic robot, réponse automatique, tracking désactivé | Aucun engagement humain inventé ; disponibilité explicite |
| A11 | Baisse durable avec/sans effectif suffisant | Alerte uniquement avec politique et couverture satisfaites ; déduplication/résolution vérifiées |
| A12 | Compte/scopes IA appelle approbation ou mutation sensible | Refus serveur y compris appel API direct et identifiant humain forgé |
| A13 | Réduire, suspendre, reprendre, valider depuis une fiche périmée | Suspension autorisée sans préflight frais ni verrou de version UI ; réduction avec révision attendue ; validation/reprise avec préflight frais. Pas de rappel fictif ni remise à zéro |
| A14 | Auth absente, autre business, CSRF/rejeu challenge, entrée malveillante | Refus ; aucune fuite de contact, secret ou contenu privé |
| A15 | Fiche urgente au clavier/petit écran/texte agrandi | Motif, mesure, seuil et action compréhensibles ; pas de dépendance à la couleur |
| A16 | Suspension concurrente au dernier contrôle serveur, avec message réservé et message déjà en cours d'envoi | Tester les deux ordres : suspension enregistrée avant autorisation de départ = zéro transmission ; autorisation de départ enregistrée avant suspension = message affiché en cours d'envoi et résultat suivi, sans rappel fictif. Aucun départ suivant ni nouvelle réservation après suspension ; une réservation seule ne permet pas de contourner l'arrêt. |

## Test Strategy

Tests unitaires métier puis tests Convex avec état isolé, concurrence contrôlée et horloge maîtrisée ; transport fournisseur simulé. Exercices d'intégration avec vrais contrats Astro/Convex/Flutter, sans backend partagé. Utiliser les commandes déclarées du site (`pnpm test:unit`, `pnpm build:check`) et `flutter analyze`/`flutter test` dans les packages modifiés ; vérifier leur disponibilité avant usage. Isoler et documenter les échecs préexistants plutôt que les masquer.

Recette visuelle via runtime géré et fixtures, puis login et accès protégé sur contexte autorisé si disponible. Preuves distinctes : code/tests locaux, UI rendue, intégration authentifiée, acceptation fournisseur, réception en boîte, désinscription propagée. Les trois dernières ne sont pas autorisées par cette spec et restent « non exécutées » jusqu'à autorisation concrète. Aucune ouverture seule ne satisfait un critère de réception ou d'engagement.

## Edge Cases / ZOMBIES coverage

Zéro : audience vide ou mesure absente bloque/affiche indisponible. Un : premier contact et première campagne qualifiés sans baseline inventée. Plusieurs : concurrence, segments croisés, doublons. Bornes : quota exact, expiration, changement de fenêtre/fuseau. Interfaces : divergence client/API, événements retardés, fournisseur inconnu. Exceptions : indisponibilité, timeout, annulation en vol. Sécurité : tenant, scopes IA, rejeu, contenu hostile dans une explication.

## OWASP Security Gate

Contrôle d'accès : autorité serveur, tenant et rôles distincts. Authentification : session vérifiée et protection CSRF/challenge. Injection : contenu et motifs externes sont des données, jamais des instructions/outils pour l'IA ; échappement UI. Conception sûre : préflight fermé par défaut, quotas atomiques, journal d'approbation. Journalisation : aucune donnée sensible exposée ; erreurs bornées et surveillance de fraîcheur. Prouver A12/A14 avant readiness de déploiement.

## Risks / Rollback

Le contrat local est divergent et l'état déployé n'est pas établi : inventorier avant toute migration. Ajouter schémas/index et migrer par lots reprenables ; aucun effacement de consentement, suppression, historique ou message. Tester sur copie synthétique. En cas de rollback, désactiver les nouveaux départs, conserver approbations/quotas/événements et la lecture des données ; ne pas revenir à un worker qui ignore les nouveaux garde-fous. Une absence de tracking ne doit pas être « corrigée » en l'activant à l'insu de l'opératrice.

## Links & Consequences / Documentation Coherence

Mettre à jour `shipglows_data/technical/newsletter-campaign-api.md`, les docs centrales d'opérations email et les docs du moteur concernées : contrats, limites, droits, règles, sources de preuve, fraîcheur, métriques et procédure de reprise. Reporter les liens vers cette spec dans les chantiers amont lors de l'implémentation, sans écraser leur historique. Aucune promesse publique de délivrabilité ni nouvelle URL publique ; conserver les routes/URL existantes vérifiées dans les environnements des projets.

## Open Questions — décisions d'activation, pas valeurs implicites

L'agent peut préparer les mécanismes configurables et les fixtures sans inventer de réglage de production. Avant activation, Diane approuve un profil concret contenant : plafonds et fréquence ; taille/période du premier lot ; fraîcheur des preuves ; seuils/effectifs/fenêtres/résolution ; suspension statistique éventuelle ; collecte clics/réponses et rétention. Un profil incomplet ou non approuvé reste bloquant. Les petites valeurs des tests ne sont jamais recopiées en configuration réelle.

Le choix d'un fournisseur supplémentaire, d'un service de classification de boîtes, d'une authentification renforcée ou d'un nouveau canal de notification nécessite une décision séparée s'il introduit coût, données ou permissions. Réutiliser les capacités existantes tant que le contrat peut être satisfait ; signaler sinon la capacité précisément manquante.

## Execution Notes — consigne de reprise

Lire cette spec puis les instructions des deux dépôts. Vérifier la readiness, relever les divergences actuelles et exécuter les lots dans l'ordre avec tests locaux et mocks fournisseur. Ne demander que les décisions matérielles qui bloquent réellement le lot courant ; laisser toute activation externe fermée. Mettre à jour cette spec avec preuves, limites et progression. Préserver les changements étrangers. Ne jamais conclure « opérationnel en production » à partir des tests locaux.

## Normative implementation contracts — R01–R08

These contracts define the target implementation and take precedence over shorthand in Solution and the historical review. They do not describe deployed behavior. Production values remain explicit activation decisions; missing required values fail closed. Test fixtures use isolated policies only.

### R01 — Canonical API and authority boundary

Keep the existing admin HTTP wire format documented in `newsletter-campaign-api.md`: snake-case JSON, UTC ISO dates, full structured blocks including `source_id`, title and preheader. Preserve its limits and same-origin/session checks. Internally use camel case and epoch milliseconds, converting only at the boundary. Do not flatten blocks into paragraphs. `version` is the optimistic concurrency revision of the campaign aggregate; add `content_version`, `plan_revision` and `dispatch_epoch` as separate fields. Every mutation except create and safety stops requires `expected_version`; create uses internal `expectedVersion: 0`.

| HTTP operation under `/api/admin/email` | Canonical Convex mapping / payload | HTTP result |
| --- | --- | --- |
| GET `context` | Server-authorized business list, then tenant-scoped context reads; no cross-tenant wildcard | Existing `{businesses}` |
| GET `campaigns` | `read {businessId,view:"list",paginationOpts:{numItems:limit,cursor}}`; validate and apply state filter before pagination | `{campaigns,next_cursor}` |
| GET `campaigns/{id}` | `read {businessId,view:"get",campaignId,paginationOpts:{numItems:1,cursor:null}}` | `{campaign,rendered}` |
| POST `campaigns` | `command/create`, editable content in `input` | `{campaign}` |
| POST `campaigns/{id}/save` | `command/revise`, full editable content; draft only before first departure | `{campaign}` |
| POST `campaigns/{id}/review` | `command/snapshot`, bounded cursor advancement followed by mandatory evidence checks | `{campaign,review}` with existing fields plus `report_id,expires_at,blocking_checks` |
| POST `campaigns/{id}/test` | `command/test`, allowlisted recipient, same mandatory guards and separate test ledger | Existing `{campaign,test}`; queued is not sent |
| POST `campaigns/{id}/approve` | `command/approve`, `review_id,challenge_id`, optional `scheduled_at`; scheduling is part of the approved scope | `{campaign}` |
| POST `campaigns/{id}/pause` | `command/pause`, reason; no required expected revision or preflight | `{campaign}` |
| POST `campaigns/{id}/resume` | `command/resume`, current report and challenge, expected revision | `{campaign}` |
| POST `campaigns/{id}/reduce` | `command/reduce`, expected revision and subset selector over frozen recipient IDs | `{campaign}` with unapproved remaining plan |
| POST `campaigns/{id}/cancel` | `command/cancel`, reason; idempotent safety stop without fresh preflight | `{campaign}` |
| POST `campaigns/{id}/delete` | `command/delete`, expected revision; draft without departures only | `{deleted:true}`; replay tombstone retained |

All command envelopes contain `businessId,key,operation,expectedVersion?,campaignId?,input`; map HTTP `Idempotency-Key` to `key`, never `idempotencyKey`. IDs and expected revision are at envelope root. New operations and optional stop revision require explicit validator updates, not unvalidated fallbacks. Persist one receipt per `(businessId,authenticatedPrincipalId,key)` with a canonical request fingerprint. Same key and fingerprint returns the original receipt even after challenge consumption; a changed fingerprint returns 409. Mutation responses add `operation_id` consistently. Review pagination uses a new key per step and the original key for retries.

Human decisions use a server-only operator authority envelope validated by the email backend: authenticated session reference, tenant, action, scope digest and expiring single-use challenge. Mint through the existing trusted operator bridge; never accept a caller-selected actor or a machine credential alone as human authority. Consume challenge and record decision/receipt atomically. Bind challenges to aggregate/content/plan/policy/report/identity/route and scheduled time. Pause/cancel require current operator authorization but no send-approval challenge; workers may only apply policy-authorized safety stops. Machine/AI roles cannot invoke human decisions through any alias.

Errors use `{error:{code}}`: 400 invalid input, 401 absent authentication, 403 permission/tenant/challenge rejection, 404 inaccessible or absent resource without tenant disclosure, 409 version/idempotency/state conflict, 422 incomplete or blocked preflight, 503 unavailable authority/evidence dependency. Pause must still work when evidence is unavailable; unavailable authorization/storage returns a real failure, never a false stop receipt. Return safe current revision on authorized conflicts; no secrets or contact data.

Inventory closure at lot 0 must include `emailCampaigns:command`, admin/machine campaign routes, `email:command/broadcast_approve`, `campaignDispatchState`, `emailOperations` channel resume, tests, cron recovery and queued retries. Broadcast without `campaignId` must acquire a bounded legacy plan with the same authority/guards or return `legacy_guard_required`; missing ID is never an exemption. Channel resume only clears a channel stop and never resumes campaign approvals. Classify transactional/service messages by immutable server-owned purpose; preserve their existing rules and prohibit client reclassification of Broadcast into service. Keep route adapters, with explicit refusal until migrated, rather than deleting endpoints. Lot 0 must reconcile the API reference and Flutter models with this target and test every row against real validators.

### R02 — State transitions and stop precedence

Public delivery states are `draft`, `scheduled`, `sending`, `suspended`, `completed`, `cancelled`. Readiness is a separate value (`incomplete`, `blocked`, `ready`, `approved`) so an expired report cannot masquerade as delivery progress. Internal `fanout_complete` is not public completion while queued or in-flight work remains. Unknown outcomes remain visible even when all active work is finished.

| Trigger | Preconditions | Result |
| --- | --- | --- |
| Approve draft | Complete fresh report, human authority and bound scope | `scheduled` when future dated, otherwise `sending` |
| Due schedule | Approval still matches and all mandatory checks fresh | `sending`; otherwise `suspended` with reason |
| Mandatory evidence expires/fails during sending | Detected at guard or evidence invalidation | `suspended`; increment dispatch epoch and revoke unused departure permits |
| Pause from draft/scheduled/sending/suspended | Authorized stop, including stale UI revision | Draft stays draft with no send authority; others become/remain `suspended`; repeated pause is a no-op receipt |
| Renew evidence | New server evidence and report | Does not change `suspended`, authorize new departures or restore old approval |
| Resume / continue next lot | New complete fresh report, new human decision for current remaining scope | `scheduled` or `sending`; counters and first-lot observation persist |
| Cancel active/suspended/draft | Authorized stop | `cancelled`; terminal, no automatic restart |
| Remaining plan empty | No queued/reserved/authorized/in-flight work | `completed`, including separately reported unresolved outcomes; no artificial approval needed |

Pause/cancel on terminal states returns the unchanged terminal receipt. All guards, consent checks and departure authorization serialize against the same campaign epoch and recipient suppression state. Recheck consent after reservation immediately before authorizing departure; a consent withdrawal committed first forbids departure. Withdrawal after departure authorization cannot recall transmission and is recorded for subsequent attempts. No network call occurs inside the transaction. Only the worker owning the one-use departure permit may transmit; lost ownership or restart never regenerates that permit. The approved A16 boundary remains the authorization commit, and the UI includes those messages in flight even before HTTP completes.

### R03 — Remaining-plan revisions and recipient identity

Use a durable recipient ledger keyed by `(businessId,campaignId,canonicalContactKey)`, independent of content version, plan revision, membership IDs and address aliases already unified by the existing contact normalizer. Do not introduce provider-specific address normalization. Each attempt has its own immutable ID linked to this ledger. States: eligible, reserved, departure_authorized, accepted, delivered, rejected_before_acceptance, unknown, excluded. Accepted/delivered/unknown and authorized-but-unsettled records cannot become eligible because of a revision or policy change.

Reduction atomically pauses the campaign, increments aggregate revision, plan revision and dispatch epoch, and invalidates the remaining approval. The selected set must be a subset of the previous frozen plan; intersect it with currently eligible, never-departed contacts. Cancel unused reservations after their permits are fenced; preserve in-flight and uncertain entries outside the remaining set for reconciliation. Preserve content version, historical audience dimensions, quota records and first-lot qualification. A post-departure content edit is rejected; different content requires an explicitly separate campaign and approval under shared frequency limits.

Retry is a separate explicit authorized operation, not an effect of reduce/resume. Only a definitive proof that the provider did not accept the previous attempt may permit it; a delivered or accepted message cannot be resent as a retry. Unknown stays quarantined until reconciliation proves acceptance or non-acceptance. A snapshot becoming empty completes only after unused reservations are released and in-flight work settles; unresolved unknowns remain displayed. A new campaign ID does not evade audience qualification or cross-campaign contact limits.

### R04 — Quota units, clocks and crash recovery

Required policy fields distinguish `campaignUniqueRecipientLimit`, `campaignAttemptLimit`, `businessAttemptWindowLimit`, `identityAttemptWindowLimit`, `contactAttemptWindowLimit` and their positive rolling durations. Identity scope is the server-resolved canonical provider account/stream/sender identity key, shared across businesses using that identity; tenant responses expose only their own usage and available decision, not another tenant's counts. Contact frequency scope is `(businessId,canonicalContactKey)` across campaigns. Test sends consume business, identity and contact limits plus their test budget; they never count as production first-lot recipients.

Campaign unique usage is the number of distinct ledger contacts with an unreleased reservation or any authorized departure. Campaign attempt usage counts reserved or authorized attempts, including certain retries. Windows count attempts, not unique recipients: active reservations always occupy capacity; authorized attempts count when `authorizedAt` is in `(now-window,now]`. Use server UTC for all comparisons. A retry consumes another attempt and another contact-frequency slot, but no second campaign unique slot. Expired rolling usage stops affecting that window only; campaign totals and the attempt ledger never reset. Policy changes re-evaluate existing usage without rewriting timestamps; a lower limit below current usage blocks new departures.

Reservation and all applicable bucket checks occur in one serializable transaction. At authorization, recheck all windows, policy, approval, epoch and consent, then change reserved to consumed once. `reservedAt` and lease ownership support recovery; `authorizedAt` is the durable window timestamp. An expired pre-authorization lease may be released only by atomically fencing its owner and proving no departure permit exists. A crash after authorization is uncertain even if no HTTP response was recorded; retain consumption and prohibit blind retry. A reservation does not expire out of capacity merely because a rolling window moved.

Release after authorization requires adapter evidence of definitive non-transmission/non-acceptance (correlated provider rejection or a transport proof that no request could leave), stored with source and attempt ID. Silence, timeout, expired lease and an unsuccessful provider lookup are insufficient. Such proof releases rolling capacity, but retains campaign departure/attempt history and lifetime attempt consumption to bound retries. Pre-authorization cancellation releases all reserved capacity. Reconciliation is idempotent; no worker may decrement twice.

### R05 — Evidence catalogue and suppression checkpoints

Every record has `kind,source,owner,scopeDigest,collectedAt,validUntil,sourceRevision,status,reason,evidenceRef`. Status is valid/invalid/unavailable/incomplete; only valid permits approval. The policy supplies a positive `maxAge` for each mandatory kind; `validUntil=min(collectedAt+maxAge,sourceExpiry)` when source expiry exists. Missing expiry configuration blocks activation. A report expires at the earliest mandatory evidence expiry and is invalidated immediately by a scope revision. The backend evidence collector owns refresh; operators own policy approval; the provider adapter owns translation, never policy authority.

| Mandatory evidence | Server source and exact scope | Renewal / invalidation |
| --- | --- | --- |
| Identity | Authenticated provider identity verification result for account/stream/from/domain; required DNS checks only where the approved adapter contract requires them | Refresh provider check; identity/config change invalidates immediately |
| Route | Server configuration revision and authenticated provider route/stream capability lookup, bound to credential reference (never secret value) | Route/credential/config rotation invalidates; inaccessible source is unavailable |
| Unsubscribe | Server-generated signed destination plus verified handler round trip on an isolated synthetic member; durable suppression write and dispatcher exclusion asserted | Handler/template/signing configuration change invalidates; HTML link presence alone never qualifies |
| Suppression synchronization | Complete baseline/import reconciliation plus durable incremental ingestion checkpoint scoped to provider account/stream and local suppression generation | Advance only after all pages/events through the checkpoint are durably applied; failed/partial scan is incomplete |
| Audience and consent | Completed frozen membership scan, purpose, local consent generations and pilot allowlist revision | Relevant changes invalidate report or conservatively remove contacts; recheck per departure |
| Policy and capacity | Approved immutable policy revision and current quota ledger | Recheck on approval and departure; report availability never reserves future capacity |

Suppression checkpoint stores run ID, baseline ID, all-page completion, provider cursor/watermark when supported, scan start/end, locally committed ingestion sequence and reconciliation result. A recent webhook only advances its own applied-event sequence, not completeness. If the provider supplies no complete watermark, use a complete reconciliation with event catch-up through the locally captured sequence, record that bounded observation and its age; never claim real-time external completeness. Any missing page or unresolved gap blocks approval. Local unsubscribe writes take effect transactionally without waiting for provider sync. Acquisition/probes use fixtures until external access is separately authorized.

Analytics availability is separate evidence with source coverage and freshness. Disabled click/reply collection marks dependent rules inapplicable and metrics unavailable; it does not block sending unless a required observation policy explicitly depends on those metrics, in which case the profile is incomplete and cannot activate.

### R06 — Metric equations and attribution

For a selected immutable departure cohort `[start,end)` in server UTC, let `T` be distinct departure-authorized attempt IDs, `P` provider-accepted attempt IDs, `D` attempt IDs with delivery events, `Btemp/Bhard` attempt IDs with the corresponding bounce events, and `F` attempts definitively rejected without acceptance or local technical failure after authorization. Unknown attempts remain in T. Provider-internal retries are events on the same attempt; a new application retry is a new attempt. Pre-departure exclusions and failures are separate counts outside T. Dimensions come from each departure; totals deduplicate IDs before grouping and overlapping segment rows must never be summed into a global total.

| Metric | Numerator / denominator | Uniqueness |
| --- | --- | --- |
| Acceptance, delivery, temporary bounce, hard bounce, technical failure | `|P|/|T|`, `|D|/|T|`, `|Btemp|/|T|`, `|Bhard|/|T|`, `|F|/|T|` | Attempt ID; bounce categories can overlap and are not a partition |
| Complaint | Distinct attributed complained attempts / `|P union D|` | Attempt ID; numerator outside denominator displayed as inconsistency |
| Unsubscribe | Distinct attributed unsubscribed contacts with known delivery / distinct delivered contacts | Contact key within cohort |
| Qualified unique click / attributed unique reply | Distinct qualified contacts with known delivery / distinct delivered contacts | Contact key within cohort |

Retain all raw authenticated counts, including attributed engagement without known delivery; show these separately from the rate numerator. Zero denominator returns null/unavailable, never 0%. Store `occurredAt` and `ingestedAt`; cohort selection uses departure time, observation includes events occurring before explicit `asOf`, known by `computedAt`. Late events recompute affected cohorts and retain aggregate revision/history. Reject impossible future timestamps to quarantine under adapter clock tolerance. Show observation window, numerator, denominator, coverage, freshness and revision together; do not silently clamp contradictory rates.

Coverage is measured per metric: instrumented and completely ingested eligible units / all denominator units (attempts for transport/complaints, contacts for engagement). Completeness means connector checkpoint through `asOf`, not that every recipient emitted an event. Unknown checkpoint yields null coverage; partial instrumentation yields a fraction; denominator zero yields null. Publish numeric rates as provisional when coverage is partial, and do not trigger statistical rules until policy minimum coverage, freshness and observation delay are met. Tracking disabled is unavailable, not 0% coverage interpreted as inactivity.

Deduplicate source events by `(providerAccount,eventId)`; when no stable ID exists use an adapter-defined canonical digest of message ID, kind, source timestamp and event-specific stable payload. Conflicting duplicates are quarantined. Attribute by verified provider message ID or signed correlation token bound to an attempt and tenant. Unattributed complaints/unsubscribes still update applicable suppression state but remain in an unattributed analytics bucket, never assigned to the latest campaign.

Clicks have known-automation, suspected-automation, unknown and qualified statuses. Qualified requires affirmative adapter evidence under a versioned classifier; absence of bot markers is unknown. Replies use a disabled-by-default inbound adapter emitting `{sourceEventId,providerAccount,receivedAt,inReplyTo,references,correlationToken,automaticClassification}`; correlate to a unique outgoing message using token or message references and reject ambiguity. Exclude auto-replies and delivery-status messages. Store identifiers/classification only, not body or attachments. Use fixtures for the existing provider adapter; no new mailbox, endpoint activation or permissions are implied.

### R07 — Incident lifecycle and durable in-app notification

Incident key is `(businessId,scopeType,scopeId,ruleId,ruleVersion,canonicalDimensions)`, where scope is campaign or stable audience-definition/source/purpose cohort across campaigns. A rule-version change creates a separate evaluation history and explicitly supersedes the previous incident; it does not claim recovery. Each key has an incrementing episode number, immutable transition history and states open/acknowledged/resolved. Acknowledgement records operator attention only. Insufficient or stale data sets evaluation unavailable and leaves incident state and safety stops unchanged.

Each approved rule must provide trigger threshold, minimum sample/coverage, observation delay, consecutive trigger windows, resolution threshold, consecutive recovery windows and notification cooldown. Resolve only after the configured consecutive comparable, complete recovery windows; no signal is not recovery. A later qualified breach reopens the same incident key with a new episode, including a breach discovered through late data. Significant aggravation means crossing a configured severity boundary. Recomputed identical transitions never increment the episode.

The concrete baseline channel is the existing Diffusion interface polling a new durable tenant-scoped in-app notification read model; no external notification service is assumed present. Write incident transition and notification outbox row atomically. Uniqueness key is `(incidentKey,episode,transitionSequence,notificationKind)`; emit only opening, severity increase, resolution and a new explicit action requirement. Cooldown coalesces repeated same-severity action reminders without suppressing the first opening, escalation or resolution. Upsert the UI item by notification ID; read/acknowledged state is durable per operator. Crash before commit creates nothing; crash after commit/retry reuses the same item. Optional external delivery requires separate approval and channel idempotency; do not promise exactly-once external delivery.

### R08 — Migration, retention and rollback

| Legacy record | Additive migration behavior |
| --- | --- |
| Draft | Preserve structured content; mark report/policy absent; requires fresh snapshot and approval |
| Approved/scheduled/sending campaign | Preserve historical approval as legacy evidence only; suspend future departures until policy, ledger, fresh report and new human approval exist |
| Queued/reserved without authorized departure | Fence leases and hold; import ledger idempotently; never interpret old queue membership as approval |
| Submitted/delivered/in-flight/unknown | Import durable contact and attempt markers; unknown stays quarantined; never requeue through migration |
| Snapshot without policy or partial membership scan | Mark incomplete/unapproved; rebuild remaining snapshot without expanding old approved scope |
| Completed/cancelled | Read-only historical state and counts; no implicit reopening |

Before enabling any migrated worker, disable Broadcast departures centrally, drain or classify in-flight work, and require a minimum guard protocol version at the common dispatch gate. Old workers must be fenced from provider access or stopped before the gate can reopen; a database flag alone is insufficient if an old worker bypasses it. If that exclusion cannot be proved, remain stopped. Migration batches use stable record IDs, progress checkpoints and idempotent upserts; interrupted migration never marks an incomplete campaign migrated. Compare source/import counts and uncertain entries before approval eligibility.

Rollback means keeping the compatible guarded reader/dispatcher or leaving departures disabled; never restoring a binary capable of bypassing guards. Preserve additive schema, audit, consent, quotas, approvals and unknowns. Read and reconciliation remain available with sends off. No downgrade destructively rewrites the new ledger.

Retention policy must define separate durations and deletion jobs for reports/evidence, approval/audit records, consumed challenges/idempotency receipts, reservations/attempts, pseudonymized dimensions/events, incidents/notification history and untrusted quarantine. Do not store reply bodies by default. No active reservation, uncertain attempt, unexpired authority or unresolved incident may be garbage-collected. Compact old receipts/challenges into non-replayable tombstones after expiry; challenges remain expired even after tombstone deletion. Retain campaign/contact sent markers and suppression/frequency guards for as long as any related plan can execute, retry or be restored. Purging those guards requires permanently retiring the campaign namespace; backups/restores must apply retirement and suppression tombstones before enabling sends. Pseudonymization uses a stable keyed contact reference with versioned key migration, not an unsalted address hash. Missing approved retention durations blocks production activation, not fixture testing; physical erasure is separately authorized and must not permit resending.

### Verification additions and batch exit gates

The following are required future executable tests, not tests claimed as run by this documentation change.

| ID | Required scenario and exact assertion | Batch |
| --- | --- | --- |
| A17 | Exercise every R01 wire row, structured blocks and ISO/ms conversion with real handlers; legacy Broadcast/machine/forged actor calls cannot bypass approval; service purpose cannot be forged | 0–1 |
| A18 | Expire evidence while sending, refresh it, then explicitly resume: zero intervening departures; stale UI pause succeeds despite unavailable evidence; withdrawal between reservation and authorization excludes contact | 1–2 |
| A19 | Partially delivered plan with reserved, in-flight and unknown entries is reduced and resumed: no treated/uncertain contact resent; empty remaining plan has accurate terminal/in-flight state | 2 |
| A20 | Exact unique/attempt/contact/identity limits, two businesses sharing identity, certain retry, policy change and window boundary: expected ledger counts, no reset or overshoot | 2 |
| A21 | Crash before reservation, after reservation, after authorization and after provider acceptance: only provably unused reservations released; no duplicate transmission on restart | 2 |
| A22 | Provider source unavailable, stale identity, changed route, broken unsubscribe round trip, partial suppression scan: approval blocked; disabled optional analytics alone does not block | 1 |
| A23 | Two attempts for one contact, overlapping segments, complaint without delivery, uncorrelated reply, late events and partial coverage: exact R06 fractions/nulls and unattributed counts | 3 |
| A24 | Opening, worsening, acknowledgement, recovery, reopening, stale data, late event and crash/retry: one durable notification per transition; missing data never resolves | 3–4 |
| A25 | Every R08 migration row, interruption/resume and old worker coexistence: no departure until fencing and explicit reapproval; import rerun changes no counts | 0, 5 |
| A26 | Rollback with queued/in-flight/unknown records, then read and reconcile: no unguarded send, state remains readable, no unknown requeued | 5 |
| A27 | Retention compaction and backup restore: no replayed challenge/command, no sent-marker loss enabling resend, suppressed contact stays excluded, retired campaign cannot resume | 2, 5 |

Lot 0 exits with canonical validators/receipts/compatibility fixtures and migration fencing design; lot 1 with the evidence catalogue and authority tests; lot 2 with transitions, permanent recipient deduplication and quota crash tests; lot 3 with metric and incident fixtures; lot 4 with UI stop/notification proof; lot 5 with migration/rollback/retention execution evidence. Existing failing tests must be repaired, not removed. A01–A27 remain pending implementation.

## Full Readiness Review — 2026-09-16 (historical, before R01–R08 corrections)

### Verdict et nature des preuves

Verdict global : **not ready** pour une exécution intégrale sans interprétations importantes. La revue porte sur toutes les sections et les six lots, pas seulement le lot 0. Le document définit correctement l'intention et les interdictions ; il manque des contrats précis de transition, comptabilisation et observation. L'absence du code de la nouvelle feature n'est pas, à elle seule, un défaut de readiness. Les écarts ci-dessous distinguent les ambiguïtés de spec des défauts du socle actuel et des décisions réservées à l'activation.

État local inspecté : CommandGlows sur `main`, moteur email sur `codex/newsletter-campaigns`. Changements étrangers présents dans l'app clavier et dans le moteur, conservés. Les trois dépendances déclarées et `newsletter-campaigns-postmark.md` du moteur ont été confrontées aux surfaces concernées ; leurs validations historiques ne constituent pas une preuve actuelle. Les documents généraux d'architecture et de guidelines mentionnent encore des frontières email historiques : le code actuel et les contrats email spécifiques priment pour cet inventaire, sans transférer les anciennes autorisations de déploiement.

Commande exécutée dans `commandglows_site` : `pnpm test:unit tests/email`. Résultat : **17 fichiers, 165 tests ; 150 réussis, 15 échoués**, code de sortie 1. Les 12 tests de `campaignDomain.test.ts` et les 3 tests de `campaignSnapshot.test.ts` échouent. Erreurs observées : champ obligatoire `key` absent dans les arguments et champ `revision` absent dans une fixture de campagne. Le test « round trips the public HTTP wire into real Convex commands with blocks and approval » existe et échoue ; l'affirmation initiale laissant penser que cette frontière n'était couverte que par des mocks était incomplète.

Ces tests utilisent des états synthétiques et un transport simulé. Ils ne valident pas A01–A16 pour la future feature. Aucun test Flutter, rendu visuel, login, fournisseur ou boîte de réception n'a été exécuté pour cette revue. Le registre DevServer indique le site et la démo email arrêtés ; aucune cible Flutter de cette feature n'est active. Aucune session n'a été lancée ou modifiée.

### Couverture de toutes les sections

| Section / promesse | Résultat de revue | Conséquence |
| --- | --- | --- |
| Métadonnées, titre, statut, propriétaire | Cohérents, statut `draft` conservé | Revue tracée sans déclarer l'implémentation terminée |
| User Story, Minimal / Success / Error Behavior | Acteur, valeur et limites explicites | Préciser la sortie des blocages temporaires : R02 |
| Problem et preuves initiales | Revérifiés ; couverture de test corrigée | Socle incompatible prouvé : R01 |
| Solution 1 — contrats et préflight | Invariants solides ; sources et fraîcheur encore abstraites | R01, R02, R05 |
| Solution 2 — quotas et premiers lots | Portées et approbation définies ; unités et reprise non fixées | R03, R04 |
| Solution 3 — résultats, segments, fournisseurs | Dimensions et indisponibilité honnêtes | Formules, attribution et couverture : R06 |
| Solution 4 — alertes et urgence | Déterminisme et limites IA clairs | Cycle d'incident et notification : R07 |
| Solution 5 — fiche et actions | Réemploi UI et accessibilité explicites ; suspension validée | Priorité de l'arrêt et révision du restant : R02, R03 |
| Solution 6 — autorité humaine / IA | Session, challenge, tenant et scopes prévus | Couvrir toutes les anciennes entrées sensibles : R01 ; aucun besoin d'une nouvelle authentification forte pour préparer le code |
| Scope In / Out, dépendances, invariants | Périmètre local et interdictions cohérents | Délimiter l'application aux anciennes diffusions sans étendre silencieusement les règles aux emails de service : R01 |
| Lots 0–5 | Ordre cohérent ; propriété d'intégration explicite | Ajouter les livrables contractuels R02–R08 comme sorties vérifiables, sans attendre le lot 5 pour les découvrir |
| A01–A16 et ZOMBIES | Bonne base de scénarios | Ajouter les cas manquants listés ci-dessous ; A16 est un test à réaliser, pas une preuve déjà acquise |
| Test Strategy | Isolation et séparation des niveaux de preuve correctes | Réutiliser et réparer les tests de contrat existants ; ne pas supprimer les tests rouges pour obtenir du vert |
| OWASP Security Gate | Contrôles pertinents, preuve d'autorité encore à construire | Revue ciblée des frontières serveur ; aucune certification revendiquée |
| Risks / Rollback et documentation | Arrêt sûr et conservation prévus | Matrice de migration et rétention des nouvelles données : R08 |
| Open Questions et Execution Notes | Décisions de production correctement séparées | Aucun réglage de production requis pour terminer les précisions locales |

### Constats et corrections nécessaires

**R01 — Socle contractuel et périmètre des garde-fous, priorité haute.** Les différences dépassent `save/review` : lectures `operation/input` contre `view/paginationOpts`, acteur transmis non accepté par le validateur, identifiants et version imbriqués contre racine, contenu `blocks/title/preheader` contre `paragraphs`, dates ISO contre millisecondes, reçus et états divergents. Les sources sont `campaignApi.ts`, `campaigns.ts`, `emailCampaigns.ts`, `emailSchema.ts` et `app/lib/campaign_repository.dart`. Le lot 0 doit produire une matrice de compatibilité couvrant lecture, création, modification, préflight, test, approbation, programmation, pause, reprise, annulation et suppression de brouillon, avec erreurs et reçus. Préserver les capacités visibles de l'éditeur ; ne pas résoudre le conflit en perdant ses blocs ou liens de source.

La route historique `email:command/broadcast_approve` met encore en file un broadcast individuel ; `campaignDispatchState` laisse passer les messages sans `campaignId` et `emailOperations` possède aussi une reprise de canal. La spec exige l'autorité humaine mais ne dit pas explicitement comment ces chemins sont raccordés au nouveau contrôle. Les inventorier et appliquer aux diffusions concernées les mêmes validations, ou les rendre indisponibles tant qu'elles ne satisfont pas le contrat. Garder les messages transactionnels/de service dans leur périmètre existant. Ajouter des tests d'appel direct de ces chemins avec rôle machine/IA, et de partage d'identité entre deux business. Ce sont des conséquences techniques à traiter, pas une autorisation de supprimer des routes ou d'élargir le chantier aux services.

**R02 — États de blocage, suspension et reprise, priorité haute.** A16 fixe correctement la concurrence suspension/départ. En revanche, Error Behavior prévoit une suspension lorsque les preuves expirent, tandis que le contrat interdit toute reprise automatique : il faut préciser si le renouvellement d'une preuve laisse la campagne suspendue et quelle décision humaine la débloque. A13 regroupe « suspendre » avec des actions exigeant un nouveau préflight : une preuve indisponible ne doit pas empêcher d'arrêter. Correction proposée : documenter une table d'états et transitions ; autorisation serveur toujours obligatoire, arrêt idempotent indépendant de la santé du préflight, nouvelle vérification et décision humaine pour reprendre. Ajouter expiration pendant l'envoi, renouvellement sans reprise, arrêt depuis une fiche périmée et retrait de consentement entre réservation et dernier contrôle. La décision de Diane sur la suspension ne vaut pas modification du consentement.

**R03 — Révision du restant et déduplication, priorité haute.** « Réduire l'audience » crée une révision et ne doit jamais renvoyer aux destinataires déjà traités. L'unicité actuelle proposée par campagne/version/destinataire/tentative ne suffit pas à elle seule à garantir cela après changement de version. Le backend actuel interdit une révision dès que `fanoutQueued > 0` : ce cas exige un vrai contrat, pas seulement un bouton. Correction proposée : distinguer version du contenu et révision du plan restant ; conserver un registre durable des destinataires déjà partis ou incertains, des quotas et des qualifications de premier lot à travers les révisions. Tester une réduction après livraison partielle, avec messages réservés, en vol et incertains, puis reprise ; aucun message incertain ne redevient admissible sans preuve. Définir aussi le cas où le restant devient vide.

**R04 — Unités et cycle des quotas, priorité haute.** Le texte ne fixe pas si le plafond de campagne compte les contacts uniques ou les tentatives, ni l'effet exact d'une relance certaine sur la fréquence par contact. Distinguer explicitement ces compteurs, leur clé de partage d'identité et leur horodatage de référence. Définir réservation, autorisation de départ, consommation, preuve de non-transmission et expiration naturelle de fenêtre ; une fenêtre qui avance ne doit pas effacer l'historique ou réinitialiser un plafond de campagne. Un crash avant départ et un crash après départ ne donnent pas le même droit à libération. Tests requis : quota exact, deux campagnes/deux business sous identité commune, relance, crash à chaque frontière, rotation de fenêtre et changement de politique sans remise à zéro. Les valeurs numériques de production restent une décision d'activation.

**R05 — Catalogue des preuves, priorité haute.** La consigne de « définir chaque preuve » est une tâche à rendre concrète avant le lot 1. Il manque la liste source serveur / portée / date de collecte / fraîcheur / expiration / erreur / responsable / condition de renouvellement pour identité, route, désinscription et synchronisation des suppressions. Un webhook récent ne prouve pas, à lui seul, que toutes les suppressions ont été synchronisées ; préciser un checkpoint de synchronisation et son état incomplet. Un lien présent dans le HTML ne prouve pas une désinscription fonctionnelle. Distinguer preuve obligatoire d'envoi et disponibilité d'analytique facultative : le tracking désactivé ne doit pas rendre impossible une campagne par une règle d'engagement inapplicable. Tester source inaccessible, rapport périmé, changement de route et synchronisation partielle. L'acquisition de nouvelles permissions fournisseur éventuelles reste séparée de la construction de fixtures.

**R06 — Formules, couverture et attribution, priorité moyenne.** « Tentatives distinctes pertinentes » ne suffit pas pour un test exact. Le dénominateur des plaintes n'est pas fixé. Une désinscription peut ne pas être corrélée à un message livré ; une réponse nécessite une voie d'entrée identifiable. Préciser pour chaque métrique la clé d'unicité, le numérateur, le dénominateur, le temps utilisé (départ ou événement), la fenêtre, les événements tardifs, le dénominateur nul et le calcul de couverture. Conserver les événements non attribuables dans une catégorie séparée ; ne pas les affecter arbitrairement à la dernière campagne. Définir la qualification des clics sans assimiler absence de signal robot à certitude humaine. Choisir le contrat d'adaptateur de réponse en cohérence avec les boîtes existantes, sans activer collecte ou nouvelle route. Tester relances multiples vers un contact, segments qui se recouvrent, plainte sans livraison connue, réponse non corrélée et couverture partielle. La catégorie fournisseur « inconnu » est déjà une sortie valable ; aucun service externe de classification n'est nécessaire à la préparation.

**R07 — Cycle des alertes et notifications, priorité moyenne.** La clé business/campagne/règle/dimensions couvre une campagne mais pas explicitement une audience inactive entre campagnes. Préciser portée campagne ou audience, version de règle, réouverture après résolution, conservation de l'historique et devenir d'un incident lorsque les données deviennent indisponibles. Une absence de données ne doit pas résoudre une alerte. Nommer le canal existant et le point de raccordement : les surfaces inspectées ne démontrent pas encore un canal de notification agrégée de Diffusion prêt à réutiliser. Prévoir enregistrement durable de la notification et déduplication des reprises après crash, distincts du simple recalcul de la fiche. Tests : apparition, aggravation, acquittement sans résolution, résolution, réouverture, données tardives et redémarrage. Une notification hors application nécessitant coût ou permissions demeure une décision séparée si aucun canal existant ne convient.

**R08 — Migration, rétention et critères de sortie, priorité moyenne.** Le rollback sûr est bien formulé, mais aucun scénario A01–A16 n'en démontre l'application. Définir le sort des campagnes déjà approuvées, messages en file, tentatives incertaines et snapshots sans politique lors d'une migration additive : aucun ancien enregistrement ne devient implicitement approuvé sous la nouvelle politique. Tester coexistence d'un ancien worker et du nouveau contrat, arrêt sûr, migration interrompue/reprise et lecture après rollback. Étendre le contrat de rétention existant aux rapports, challenges consommés, approbations, réservations, dimensions pseudonymisées, incidents et événements qualifiés. Définir les liens à conserver pour empêcher rejeu et renvoi après effacement, sans conserver par défaut les corps privés. Les durées réelles restent réservées à l'activation ; les catégories, invariants et tests doivent être définis localement.

### Frontières externes et sécurité

Vérification documentaire officielle : Postmark expose des événements de clic avec identifiant de message et métadonnées, des états de vérification de signature, et une entrée de réponses via son mécanisme inbound. Cela rend des adaptateurs possibles, sans prouver les permissions/configurations actuelles ni autoriser leur activation. Le transport local conserve `TrackOpens: false` et `TrackLinks: 'None'`. Sources : [Click webhook](https://postmarkapp.com/developer/webhooks/click-webhook), [Sender signatures API](https://postmarkapp.com/developer/api/signatures-api), [Inbound webhook](https://postmarkapp.com/developer/webhooks/inbound-webhook).

OWASP : revue ciblée des catégories contrôle d'accès, configuration, conception, intégrité des événements, authentification, journalisation et exceptions. Frontières étudiées : session Clerk → relais administrateur → registre Convex email séparé ; credentials machine → mutations ; fournisseur → webhook ; faits serveur → UI/IA. Les scénarios A12/A14 sont nécessaires mais doivent inclure les chemins R01. Cette revue ne revendique ni couverture exhaustive OWASP ni conformité ASVS ; aucun contrôle ASVS numéroté n'a été vérifié formellement.

### Conclusion de readiness

La vérification complète est terminée. R02–R08 décrivent des précisions de contrat à formaliser ; R01 comporte un défaut actuel reproduit et le périmètre des chemins à protéger. Ces points sont sous responsabilité technique et ne justifient pas de redemander à Diane une approbation générale. Sa décision de suspension reste acquise. Les choix réservés à Diane avant activation demeurent ceux de la section Open Questions : valeurs métier, collecte/rétention et éventuelles nouvelles permissions/intégrations. Aucun lot d'implémentation n'est exécuté par ce rapport.

## Skill Run History

| Date | Owner | Résultat |
| --- | --- | --- |
| 2026-09-17 | sg-development / lot 0 | Lot 0 local clôturé : contrats lecture/commande, blocs structurés, reçus, expansion authentifiée, outbox borné et rejeu concurrent réconciliés ; 66 tests campagne/politique/API/contenu verts et `astro check` sans erreur. Aucune activation externe. |
| 2026-09-16 | sg-development / préparation de spec | Audit antérieur repris et divergences clés revérifiées ; contrat rédigé ; checklist indépendante de 12 invariants intégrée ; aucune implémentation |
| 2026-09-16 | sg-engineering / 101-sg-ready | Revue intégrale : `not ready`. Sections et lots 0–5 examinés ; décision de suspension conservée ; R01–R08 documentés. Tests email : 150 réussis / 15 échoués ; frontière HTTP/Convex réellement testée et en échec. Aucune implémentation ni activation. |
| 2026-09-16 | sg-docs / correction ciblée | Contrats normatifs R01–R08 intégrés, A13 corrigé et A17–A27 ajoutés. Topologie conforme et lint des métadonnées réussi. Relecture des contradictions entre règles générales et contrats détaillés ; revue initiale conservée comme historique. Aucun test applicatif relancé, aucune implémentation, activation ou modification des fichiers étrangers. |

## Current Chantier Flow

Préparation et revue historique terminées → lot 0 local clôturé : contrat campagne/routage, matrice/fencing, API, rendu structuré, expansion authentifiée, outbox borné et atomicité du rejeu prouvés → lot 1 prêt à démarrer → lots 1 à 5 non commencés et aucune activation réelle, preuve fournisseur, boîte de réception ou livraison revendiquée.
