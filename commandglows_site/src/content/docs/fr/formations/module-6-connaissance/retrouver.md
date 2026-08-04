---
title: "Retrouver & Rechercher"
description: "Construis une recherche multi-couche pour retrouver notes, fichiers, références et informations dispersées sans dépendre uniquement de ta mémoire."
sidebar:
  label: "Retrouver"
  order: 5
---

Toute ta base de connaissances perd une grande partie de sa valeur si tu ne peux pas retrouver ce dont tu as besoin rapidement.

> Le meilleur classement du monde ne suffit pas si récupérer une information reste lent, fragile ou dépend d'un mot-clé parfait.

## Le vrai sujet : retrieval, pas seulement recherche texte

Retrouver ne veut pas dire seulement taper un mot dans une boîte.

Dans un système PKM solide, on retrouve de plusieurs manières :
- par **recherche directe**
- par **contexte**
- par **liens**
- par **accès rapide**

En cognition, la récupération dépend fortement des **indices de rappel** (cues) disponibles au moment où tu cherches<sup>[1](#concept-retrieval-cues)</sup>. Un bon PKM fabrique ces indices (liens, noms, tags, contexte) et réduit le coût d'accès, ce qui rend la réutilisation plus fréquente et plus robuste<sup>[2](#concept-cognitive-offloading)</sup>.

Si ton système dépend uniquement d'une recherche textuelle parfaite, il reste fragile.

## Le decision framework CommandGlows

Quand tu ne retrouves pas quelque chose, pose-toi quatre questions :

1. **Est-ce que je cherche une note, un fichier, un lien, ou une information dispersée entre plusieurs apps ?**
2. **Est-ce que je connais le mot-clé exact, ou seulement le contexte ?**
3. **Le problème vient-il de la recherche, de l'organisation, ou du mauvais endroit de stockage ?**
4. **Ai-je besoin d'un moteur de recherche, d'un lanceur, ou d'un réseau de notes liées ?**

Ce cadre évite de confondre :
- un problème de retrieval
- avec un problème de capture
- ou avec un problème d'organisation

## Les 4 couches de retrieval qui comptent vraiment

### 1. Recherche dans les notes

Tu veux retrouver :
- une idée
- une note
- une synthèse
- un lien conceptuel

Le cœur ici reste :
- **Obsidian** ou **Logseq** pour les notes
- plus les **backlinks** et parfois le **graph** pour repartir d'une idée connexe

Le vrai gain du PKM n'est pas seulement de retrouver par titre. C'est aussi de remonter par relations.

### 2. Recherche dans les références web

Tu veux retrouver :
- un article sauvegardé
- une vidéo
- une ressource web
- un lien important

Le bon centre ici reste :
- **Karakeep**

Parce que son rôle est justement de rendre tes références retrouvables sans dépendre de ta mémoire.

### 3. Recherche dans les fichiers locaux

Tu veux retrouver :
- un document
- un PDF
- un export
- un fichier texte ou bureautique

Sur Windows, les deux couches les plus utiles restent :
- **Everything** pour les noms de fichiers
- **AnyTXT Searcher** pour la recherche dans le contenu

Autrement dit :
- **Everything** quand tu sais à peu près ce que tu cherches
- **AnyTXT** quand tu te souviens du contenu, pas du nom du fichier

### 4. Recherche unifiée entre apps

Tu veux retrouver quelque chose mais tu ne sais plus si c'était :
- dans un mail
- dans un doc
- dans une app cloud
- dans un navigateur
- dans un dossier local

C'est là qu'un outil de recherche unifiée devient pertinent.

## Curiosity : la recommandation actuelle la plus solide pour la recherche unifiée

Aujourd'hui, **Curiosity** est la recommandation la plus défendable dans cette couche.

Pourquoi :
- recherche locale et cloud dans une seule interface
- recherche dans fichiers, emails, apps, navigateurs et autres sources connectées
- raccourci global
- approche orientée retrieval rapide

Il devient utile si :
- ton travail vit dans plusieurs apps en parallèle
- tu perds du temps à te demander où l'information se trouve
- tu veux une couche de recherche transversale sans tout réorganiser ailleurs

Le bon usage n'est pas :
- "je n'organise plus rien, je chercherai plus tard"

Le bon usage est :
- organisation correcte
- plus une recherche transversale vraiment bonne

## Ce que je recommande moins ici

### Findr

`Findr` ne me paraît plus être la recommandation la plus solide pour cette leçon aujourd'hui. Je ne le garderais plus comme outil principal du cours sur cette couche.

### Les lanceurs redondants

Les lanceurs restent utiles, mais ils ne doivent pas brouiller cette leçon.

Pour la couche "lancer vite", le cours a déjà une page dédiée à **Flow Launcher**. Ici, le sujet principal est plutôt :
- retrouver
- pas seulement lancer

Donc je garde l'idée du lanceur comme couche secondaire, mais sans en faire le centre.

## Lanceurs : couche secondaire, mais utile

Un lanceur reste rentable si tu veux :
- ouvrir vite une app
- accéder rapidement à un fichier récent
- réduire quelques clics fréquents

### Option crédible

**ueli** reste une option valable comme lanceur clavier simple et actuel.

Mais la hiérarchie du cours reste :
- **Flow Launcher** pour la couche lanceur/workflow Windows
- `ueli` comme alternative crédible, pas comme centre de cette page

## Recherche dans le navigateur

Une partie du retrieval quotidien passe encore par :
- les favoris
- l'historique
- les onglets ouverts

Tu peux déjà couvrir beaucoup de besoins avec :
- les fonctions natives du navigateur
- **Quick Commands** dans Vivaldi
- la recherche d'historique / signets
- les capacités connectées d'un outil comme Curiosity

Le bon réflexe est de ne pas installer une extension de plus si le navigateur ou ta couche unifiée sait déjà couvrir le besoin.

## Minimum viable retrieval

Si tu veux un système simple et robuste, couvre d'abord ces 4 cas :

- **retrouver une note liée** → Obsidian ou Logseq
- **retrouver une référence web** → Karakeep
- **retrouver un fichier local** → Everything + AnyTXT si besoin
- **retrouver une information dispersée entre apps** → Curiosity

Si ces 4 cas sont couverts, ton PKM devient déjà beaucoup plus fiable.

## Ce qu'il faut éviter

- tout miser sur un mot-clé parfait
- installer plusieurs outils qui font presque la même chose
- compenser une mauvaise organisation par toujours plus d'indexation
- confondre accès rapide et vrai retrieval

## Workflow recommandé

**Minimaliste** :
- notes recherchables
- Everything
- un système de références clair

**Pragmatique** :
- backlinks dans l'outil de notes
- Karakeep pour les références
- Everything + AnyTXT pour les fichiers

**Système personnel** :
- retrieval multi-couche
- Curiosity pour la recherche transversale
- lanceur secondaire si besoin d'accès rapide

:::note[Exercice pratique]
Prends 4 choses que tu as cherchées récemment :

1. une note
2. un lien
3. un fichier
4. une information que tu ne savais plus situer

Pour chacune, demande-toi :
- dans quelle couche aurais-je dû la retrouver ?
- qu'est-ce qui a ralenti la récupération ?

Si tu utilises le même outil pour tout, ou si tu ne sais jamais où chercher, ton problème n'est pas la mémoire. C'est l'architecture de retrieval.
:::

### Références du chapitre (pour aller plus loin)

<a id="ref-encoding-specificity"></a>1) **Indices de rappel / encoding specificity** — Tulving & Thomson (1973), *Encoding specificity and retrieval processes in episodic memory* — [Psychological Review (APA)](https://doi.org/10.1037/h0020071)

<a id="ref-cognitive-offloading"></a>2) **Cognitive offloading / mémoire externe** — Risko & Gilbert (2016), *Cognitive Offloading* — [Trends in Cognitive Sciences (ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S1364661316300714)

<a id="ref-retrieval-practice"></a>3) **Retrieval practice / test-enhanced learning** — Roediger & Karpicke (2006), *Test-Enhanced Learning: Taking Memory Tests Improves Long-Term Retention* — [Psychological Science (SAGE)](https://journals.sagepub.com/doi/10.1111/j.1467-9280.2006.01693.x)

### Approfondissement des concepts techniques

<a id="concept-retrieval-cues"></a>#### Indices de rappel (retrieval cues) et “encoding specificity”
On retrouve mieux quand les indices disponibles au moment de la recherche ressemblent à ceux présents au moment de l'encodage. D'où l'intérêt des liens, du contexte, des titres stables et des métadonnées : ils créent des points d'entrée multiples.
Source scientifique : [1](#ref-encoding-specificity)

<a id="concept-cognitive-offloading"></a>#### Mémoire externe (cognitive offloading)
Un PKM réduit la charge de “garder en tête” en externalisant l'information dans des artefacts recherchables (notes, liens, fichiers). Moins tu dépends d'un mot-clé parfait dans ta mémoire, plus la récupération devient fiable.
Source scientifique : [2](#ref-cognitive-offloading)

<a id="concept-retrieval-practice"></a>#### Retrieval practice (rappel actif)
Quand tu réutilises tes notes (écrire, expliquer, décider), tu fais une forme de rappel actif. Plus ton système rend cette réutilisation facile, plus tu convertis de l'information stockée en connaissance utilisable.
Source scientifique : [3](#ref-retrieval-practice)
