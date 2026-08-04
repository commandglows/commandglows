---
title: "Organiser & Gérer"
description: "Maîtrise la gestion de fichiers, le tagging de métadonnées et l'organisation de tes actifs numériques."
sidebar:
  label: "Organiser"
  order: 4
---

Sans organisation, ta base de connaissances devient un cimetière de fichiers. Organiser, ce n'est pas ranger pour le plaisir — c'est investir 5 minutes maintenant pour en gagner 30 plus tard.

> Le meilleur système d'organisation est celui que tu utilises réellement. Simplicité > perfection.

À ce niveau, tu fais déjà de la **gestion des connaissances** : tu transformes du savoir dispersé en artefacts (notes, fichiers, procédures) réutilisables<sup>[1](#concept-knowledge-management)</sup>. Et tu réduis la charge mentale en externalisant des décisions et des indices (noms, tags, emplacements) dans le système<sup>[2](#concept-cognitive-offloading)</sup>.

## Minimum viable PKM : n'organise pas tout au même endroit

L'erreur classique est de vouloir mettre dans un seul outil :
- les notes de réflexion
- les liens sauvegardés
- les fichiers lourds
- les archives web
- les photos et médias

En pratique, un système plus sain sépare quelques couches simples :
- **Obsidian ou Logseq** pour les notes, les backlinks et les idées reliées
- **Karakeep** pour les liens, captures web et références rapides
- **un système de fichiers clair** pour les documents, médias et exports

Le but n'est pas de multiplier les apps. Le but est d'éviter qu'un seul outil doive tout faire mal.

### Où vit quoi ?

Tu peux garder cette règle simple :
- **idée, note, réflexion, lien conceptuel** → Obsidian ou Logseq
- **article, vidéo, bookmark, highlight, référence web** → Karakeep
- **PDF, image, archive, export, ressource lourde** → dossiers + nommage propre

Quand cette frontière est claire, ton PKM devient plus léger à maintenir.

## Gestionnaires de fichiers avancés

### [TUIFIManager](https://github.com/GiorgosXou/TUIFIManager)

TUIFIManager est un gestionnaire de fichiers en mode terminal (TUI) qui combine vitesse et légèreté :

- **Navigation au clavier** ultra-rapide
- **Prévisualisation** des fichiers directement dans le terminal
- **Opérations en lot** : renommer, déplacer, copier par sélection multiple
- **Léger** — pas de dépendances lourdes, tourne partout

### [Q-Dir](https://www.q-dir.com/) : l'alternative à l'Explorateur Windows

Q-Dir affiche jusqu'à 4 dossiers côte à côte dans une seule fenêtre :

| Fonction | Avantage |
|----------|----------|
| **4 panneaux simultanés** | Compare et déplace entre dossiers sans alt-tab |
| **Filtres rapides** | Affiche uniquement les fichiers d'un type donné |
| **Favoris** | Accès instantané à tes dossiers fréquents |
| **Portable** | Fonctionne depuis une clé USB, rien à installer |

---

## Systèmes d'organisation de fichiers

### La structure par domaine

```
📁 Documents/
  📁 Projets/         → engagements actifs
  📁 Domaines/        → responsabilités continues
  📁 Ressources/      → matériel de référence
  📁 Archives/        → projets terminés
  📁 Inbox/           → tout arrive ici, trié chaque semaine
```

### Conventions de nommage

- **Dates en préfixe** : `2026-03-08_rapport-client.pdf`
- **Pas d'espaces** : utilise des tirets ou underscores
- **Pas de caractères spéciaux** : évite les accents dans les noms de fichiers
- **Version en suffixe** : `brief_v2.pdf` ou mieux, utilise Git

### Tagging de métadonnées

Les tags rendent tes fichiers retrouvables même si tu oublies où tu les as rangés :

- **Utilise des tags cohérents** — crée une taxonomie de 15-20 tags maximum
- **Catégories de tags** : projet, type, statut, priorité
- **Outils** : [TagSpaces](https://www.tagspaces.org/) (open source, multi-plateforme) ajoute des tags à n'importe quel fichier

### Backlinks > taxonomies infinies

Quand tu organises des notes, le vrai gain moderne ne vient pas seulement des dossiers ou des tags. Il vient aussi des **liens entre notes**.

Avec des outils comme **Obsidian**, les **backlinks** te montrent quelles notes pointent déjà vers celle que tu es en train d'écrire. C'est là que le PKM devient plus qu'un simple rangement : il commence à faire émerger des connexions.

Autrement dit :
- les **dossiers** servent à réduire le chaos
- les **tags** servent à filtrer
- les **backlinks** servent à penser

Si tu devais sous-investir quelque part, je sous-investirais plutôt dans la taxonomie compliquée que dans la capacité à relier des idées.

### Exemple : [Webscape](https://webscape.co.za/)

Webscape est un bon exemple d'outil qui ne se contente pas de stocker l'information, mais qui aide aussi à la rendre exploitable.

- **Collections** pour catégoriser rapidement ce que tu gardes
- **Workspaces** pour séparer les contextes de travail
- **Recherche full-text** pour retrouver une ressource même si tu as oublié où elle est
- **Commandes rapides** pour transformer une information en action

Le point important n'est pas l'outil lui-même. C'est le principe : ton système de connaissance doit t'aider à **capturer, retrouver et réutiliser** l'information, pas seulement à l'empiler.

---

## Empreinte numérique

### [Yorba](https://yorba.co/)

Yorba t'aide à gérer ton empreinte numérique en centralisant tes comptes et données en ligne :

- **Inventaire** de tous tes comptes en ligne
- **Détection** des fuites de données te concernant
- **Suppression guidée** des comptes inutilisés
- **Vue d'ensemble** de ta présence numérique

---

## Organisation photo et vidéo

### [Immich](https://immich.app/)

Immich est une alternative auto-hébergée à Google Photos :

| Fonction | Détail |
|----------|--------|
| **Sauvegarde auto** | Sync depuis ton téléphone |
| **Reconnaissance faciale** | Regroupe les photos par personne |
| **Carte** | Visualise tes photos par lieu |
| **Partage** | Albums partagés avec famille/amis |
| **Recherche IA** | Recherche par description ("plage au coucher du soleil") |

### Choisir son cloud, ce n'est pas seulement choisir un prix

Quand tu stockes tes fichiers, tes photos ou tes documents chez un grand acteur, tu achètes souvent en même temps :
- de la commodité
- de la collaboration
- une présence partout

Mais tu acceptes aussi une dépendance :
- à un fournisseur
- à son interface
- à ses changements de conditions
- à sa manière de traiter tes données et tes métadonnées

Si tu veux plus de contrôle, tu as plusieurs niveaux possibles :
- **auto-héberger** une partie de ton système avec des outils comme Immich
- choisir un fournisseur davantage orienté confidentialité
- garder une architecture mixte au lieu de tout centraliser chez le même acteur

Une option à connaître dans cette logique est [Internxt](https://internxt.com/), qui se positionne comme alternative cloud européenne orientée confidentialité. Ce n'est pas une raison pour tout migrer automatiquement. C'est surtout un rappel utile : organiser ton savoir et tes fichiers, c'est aussi choisir où ils vivent et à quel point tu restes libre d'en sortir.

### [MoviePrint](https://www.movieprint.org/)

MoviePrint génère des planches contact à partir de vidéos — idéal pour cataloguer visuellement ta vidéothèque :

- **Extraction automatique** de captures à intervalles réguliers
- **Planches personnalisables** — nombre de colonnes, marges, en-têtes
- **Export en image** haute résolution
- **Utile pour** : cataloguer des tutoriels, repérer des scènes, documenter du contenu vidéo

---

## Bonnes pratiques

1. **Vide ton Inbox chaque vendredi** — 15 minutes suffisent
2. **Un fichier = un emplacement** — pas de doublons dans 3 dossiers
3. **Archive plutôt que supprimer** — le stockage est bon marché, tes données non
4. **Automatise ce qui peut l'être** — renommage en lot, tri par date, déplacement automatique
5. **Revois ta structure tous les 3 mois** — adapte-la à tes projets actuels

### Références du chapitre (pour aller plus loin)

<a id="ref-knowledge-management"></a>1) **Knowledge management (tacite -> explicite)** — Nonaka (1994), *A Dynamic Theory of Organizational Knowledge Creation* — [Organization Science (INFORMS)](https://doi.org/10.1287/orsc.5.1.14)

<a id="ref-cognitive-offloading"></a>2) **Cognitive offloading / mémoire externe** — Risko & Gilbert (2016), *Cognitive Offloading* — [Trends in Cognitive Sciences (ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S1364661316300714)

### Approfondissement des concepts techniques

<a id="concept-knowledge-management"></a>#### Gestion des connaissances (knowledge management)
L'objectif n'est pas “des dossiers propres”. L'objectif est de rendre le savoir transmissible et actionnable : standards de nommage, lieux stables, métadonnées et routines d'entretien.
Source scientifique : [1](#ref-knowledge-management)

<a id="concept-cognitive-offloading"></a>#### Mémoire externe (cognitive offloading) et décisions externalisées
Une bonne organisation te permet de ne plus “recalculer” où vivent les choses. Tu externalises des micro-décisions (où ranger, comment nommer, comment retrouver) dans des conventions stables.
Source scientifique : [2](#ref-cognitive-offloading)
