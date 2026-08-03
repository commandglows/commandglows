---
title: "Santé & Configuration Système"
description: "Construis une base Windows saine : stockage visible, sauvegarde crédible, installations propres, réseau cohérent et matériel suffisant."
sidebar:
  label: "Santé système"
  order: 2
---

Avant d'ajouter des outils de productivité, il faut un système qui ne te ralentit pas déjà par en dessous.

> Un poste Windows productif ne commence pas avec des tweaks. Il commence avec une base saine, visible, sauvegardée<sup>[1](#concept-backup-recovery)</sup> et suffisamment cohérente pour ton vrai usage.

## Le vrai sujet : stabiliser la fondation

Cette page ne sert pas à "optimiser Windows" au sens vague. Elle sert à traiter les quelques couches qui changent vraiment l'expérience :
- savoir où part le stockage
- éviter la catastrophe de données
- installer proprement
- corriger quelques goulets d'étranglement réseau ou système
- juger si ta machine est vraiment insuffisante ou juste mal entretenue

## Le decision framework CommandGlows

Quand une machine paraît lente, instable ou pénible, pose-toi quatre questions :

1. **Est-ce un vrai problème matériel, ou surtout un problème d'encombrement, de désordre ou de maintenance ?**
2. **Est-ce que je sais où vivent mes fichiers importants et comment les récupérer ?**
3. **Est-ce que mes installations et réglages sont rejouables<sup>[2](#concept-configuration-management)</sup>, ou tout repose-t-il sur ma mémoire ?**
4. **Quel est le vrai goulet d'étranglement : stockage, RAM<sup>[3](#concept-working-set)</sup>, réseau, bruit logiciel, ou matériel insuffisant ?**

## 1. Voir avant de nettoyer

Tu ne peux pas améliorer ce que tu ne vois pas.

Avant de supprimer quoi que ce soit, commence par rendre visible l'occupation réelle du disque.

### Outils qui restent crédibles

| Outil | Rôle |
|-------|------|
| **WizTree** | Le plus rapide sur NTFS pour identifier immédiatement ce qui prend de la place |
| **SpaceSniffer** | Très bon si tu préfères une vue visuelle par blocs |
| **TreeSize Free** | Bonne lecture en arborescence si tu raisonnes en dossiers |

Le bon choix dépend plus de ton cerveau que de la technique :
- **WizTree** si tu veux aller droit au but
- **SpaceSniffer** si la carte visuelle t'aide à repérer les gros blocs
- **TreeSize** si tu préfères lire un arbre clair

Le bon réflexe ensuite :
- ne supprime pas "au hasard"
- identifie caches, doublons, anciens exports, archives oubliées, grosses vidéos, vieilles installations

## 2. Le vrai sujet du stockage : la récupération

Le stockage n'est pas seulement une question d'espace libre. C'est une question de continuité de travail.

Un système de fichiers mal tenu produit :
- de la lenteur perçue
- de la confusion
- des sauvegardes incomplètes
- une reprise chaotique en cas de panne, vol ou erreur

La bonne question n'est donc pas :
- "combien de Go me reste-t-il ?"

La bonne question est :
- **si ce PC meurt demain, qu'est-ce que je récupère proprement ?**

## 3. Sauvegarde : couche invisible, retour énorme

Le minimum sérieux est de distinguer :
- **le stockage de travail**
- **la sauvegarde**

Quelques règles simples suffisent déjà :
- garde les fichiers importants dans des emplacements clairs
- ne dépends pas d'un seul disque ou d'un seul appareil
- garde au moins une copie locale ou externe
- idéalement, combine copie locale et copie distante pour ce qui compte vraiment

La sauvegarde n'est pas un sujet "admin". C'est un sujet de productivité parce qu'elle détermine :
- ton temps de reprise
- ton niveau de stress
- ta capacité à continuer après incident

## 4. DNS : petit réglage, mais seulement si tu as un vrai besoin

Le DNS n'est pas un tweak magique. C'est simplement une couche de résolution qui peut parfois devenir un petit goulet d'étranglement ou un point de contrôle utile.

### Les profils les plus utiles

| Option | Quand l'utiliser |
|--------|------------------|
| **Cloudflare** | Si tu veux surtout un DNS rapide et simple |
| **Quad9** | Si tu veux une couche de sécurité réseau basique |
| **NextDNS** | Si tu veux plus de filtrage, de règles et de contrôle |

Le bon ordre de lecture est :
- **Cloudflare** = vitesse simple
- **Quad9** = sécurité simple
- **NextDNS** = contrôle plus fin

Je ne recommande pas de changer de DNS par réflexe. Fais-le si :
- le réseau paraît incohérent
- tu veux une couche de filtrage plus large
- tu sais pourquoi tu veux ce contrôle

Sinon, garde ce sujet secondaire.

## 5. Installe proprement, reconstruis vite

Le bon setup Windows moderne n'est pas celui où tu télécharges tout à la main depuis 15 sites différents.

Le meilleur réflexe de base :
- **winget** d'abord
- Store Microsoft si c'est plus simple pour une app bien intégrée
- téléchargement manuel seulement en dernier recours

### Pourquoi `winget` reste la base sérieuse

Parce qu'il permet :
- des installations plus propres
- des mises à jour plus cohérentes
- une liste d'outils plus facile à rejouer
- un environnement plus documentable

Le vrai gain n'est pas la ligne de commande pour elle-même. Le vrai gain, c'est la reproductibilité.

### Et les autres gestionnaires ?

**Scoop** garde du sens surtout pour :
- outils CLI
- environnements plus techniques
- besoins sans droits admin

**Chocolatey** peut rester utile dans certains cas, mais ce n'est plus le point de départ que je recommanderais en premier dans le cours.

Donc :
- **winget** pour la base
- **Scoop** si tu vas plus loin côté outils CLI
- **Chocolatey** seulement si tu as une raison précise

## 6. Portable ou installé : question de contrôle

Beaucoup d'outils Windows existent en deux formes :
- **installés**
- **portables**

La vraie question n'est pas "lequel est meilleur ?" mais :
- est-ce que je veux une intégration confortable ?
- ou est-ce que je veux un outil plus autonome, isolable, déplaçable ?

En pratique :
- **installé** pour les outils centraux du poste principal
- **portable** pour tester, transporter ou limiter l'empreinte système

Comprendre où vivent les apps et leurs réglages fait déjà partie d'un poste maîtrisé.

## 7. Desktop app vs SaaS : ne confonds pas confort et contrôle

Une application locale t'apporte souvent :
- plus de contrôle
- un meilleur comportement hors ligne
- un accès plus direct aux fichiers et au système

Un SaaS t'apporte souvent :
- plus de collaboration
- plus de synchronisation
- plus d'accès partout

Le bon choix dépend de ton travail réel, mais la bonne vigilance reste la même :
- plus c'est pratique, plus tu acceptes souvent de dépendances invisibles

Le sujet n'est pas d'être dogmatique. Le sujet est de choisir consciemment.

## 8. Ta machine est-elle vraiment insuffisante ?

Beaucoup de gens pensent avoir besoin d'un nouveau PC alors qu'ils ont surtout :
- trop d'onglets
- pas assez de RAM pour leur usage
- un vieux disque dur au lieu d'un SSD
- trop de bruit logiciel
- aucune discipline de fermeture ou de nettoyage

### Les composants qui changent réellement l'expérience

**RAM**
- `8 Go` : vite limitant
- `16 Go` : base confortable pour la plupart
- `32 Go` : utile pour multitâche sérieux, création, dev, gros projets

**SSD**
- souvent le plus grand saut de confort si la machine est encore sur disque mécanique

**CPU**
- important si tu compiles, exportes, transformes ou multitâches lourdement
- moins utile à survaloriser si le vrai problème est ailleurs

Le bon raisonnement n'est pas :
- "le benchmark dit quoi ?"

Le bon raisonnement est :
- **où est-ce que ma machine casse mon flux réel ?**

## Workflow recommandé

**Minimaliste** :
- visualiser le disque
- nettoyer ce qui est évident
- avoir une sauvegarde claire
- installer avec `winget`

**Pragmatique** :
- stockage lisible
- stratégie de sauvegarde crédible
- DNS changé seulement si besoin réel
- distinction claire entre apps centrales et outils tests

**Système personnel** :
- setup documenté et rejouable
- base logicielle installée proprement
- dépendances choisies consciemment
- jugement matériel basé sur le workflow, pas sur le marketing

:::note[Exercice pratique]
Fais un audit simple de ta machine :

1. identifie ce qui prend réellement de la place
2. note où vivent tes fichiers importants
3. écris comment tu réinstallerais tes outils principaux
4. nomme ton vrai goulet d'étranglement : stockage, RAM, réseau, bruit logiciel ou matériel

Si tu ne peux pas répondre clairement à ces 4 points, le problème n'est pas encore "optimiser Windows". Le problème est d'abord de rendre ton poste lisible.
:::

## Références du chapitre (pour aller plus loin)

<a id="ref-nist-contingency"></a>1) **Sauvegarde et reprise (contingency planning)** — NIST (2010), *SP 800-34 Rev. 1: Contingency Planning Guide for Federal Information Systems* — [NIST](https://csrc.nist.gov/publications/detail/sp/800-34/rev-1/final)

<a id="ref-nist-config-mgmt"></a>2) **Gestion de configuration (configuration management)** — NIST (2011), *SP 800-128: Guide for Security-Focused Configuration Management of Information Systems* — [NIST](https://csrc.nist.gov/publications/detail/sp/800-128/final)

<a id="ref-working-set"></a>3) **Working set (mémoire, RAM et paging)** — Peter J. Denning (1968), *The Working Set Model for Program Behavior* — [DOI](https://doi.org/10.1145/363095.363141)

<a id="ref-winget"></a>4) **Windows Package Manager (winget)** — Microsoft Learn — [winget](https://learn.microsoft.com/windows/package-manager/winget/)

<a id="ref-storage-sense"></a>5) **Storage Sense (Nettoyage automatique)** — Microsoft Support — [Storage Sense in Windows](https://support.microsoft.com/windows/storage-sense-in-windows-5f6753f0-4b99-42a7-8f6e-5a9a0b8dfc8e)

## Approfondissement des concepts techniques

<a id="concept-backup-recovery"></a>#### Sauvegarde et reprise (continuité)
Une stratégie de sauvegarde est un levier de productivité parce qu'elle détermine ton temps de reprise après incident (panne, vol, erreur). Le but n'est pas “zéro risque”, mais une récupération claire et rapide.
Source scientifique : [1](#ref-nist-contingency)

<a id="concept-configuration-management"></a>#### Configuration rejouable (gestion de configuration)
Rendre une installation “rejouable” revient à gérer explicitement la configuration (ce qui est installé, comment, et dans quel ordre). Tu réduis la dépendance à ta mémoire et la dérive au fil du temps.
Source scientifique : [2](#ref-nist-config-mgmt)

<a id="concept-working-set"></a>#### Working set (RAM, onglets, multitâche)
Quand ton working set dépasse la RAM disponible, le système compense via des accès disque (paging), ce qui dégrade fortement la fluidité. C'est pour ça que “trop d'onglets” et “pas assez de RAM” se traduisent vite en friction réelle.
Source scientifique : [3](#ref-working-set)
