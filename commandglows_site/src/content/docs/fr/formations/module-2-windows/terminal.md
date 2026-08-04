---
title: "Terminal & Ligne de Commande"
description: "Sache quand la CLI vaut vraiment le coup sur Windows, pars sur la bonne base, et garde un stack terminal simple mais rentable."
sidebar:
  label: "Terminal"
  order: 6
---

Le terminal n'est pas une religion. C'est un levier. Il devient utile quand il te fait gagner du temps, de la répétabilité<sup>[1](#concept-cognitive-offloading)</sup>, ou du contrôle.

> Le bon usage du terminal n'est pas de tout faire en CLI. C'est de l'utiliser là où la souris devient lente, répétitive ou fragile.

## Le vrai sujet : franchir le bon seuil

Beaucoup de gens rejettent le terminal parce qu'ils imaginent qu'il faut tout apprendre d'un coup. À l'inverse, certains l'adoptent comme une posture et compliquent des tâches qui iraient très bien en interface graphique.

La bonne logique est plus simple<sup>[2](#concept-cognitive-load)</sup> :
- GUI pour le ponctuel, le visuel et l'évident
- CLI pour le répétitif, le massif, le scriptable et le reproductible

## Le decision framework CommandGlows

Avant de passer par le terminal, pose-toi quatre questions :

1. **Est-ce que je fais cette opération une fois ou souvent ?**
2. **Est-ce que je traite 3 éléments ou 300 ?**
3. **Ai-je besoin d'un résultat reproductible ou juste d'un geste ponctuel ?**
4. **La souris me fait-elle gagner du temps, ou me force-t-elle à répéter la même suite d'actions ?**

Si la tâche est<sup>[3](#concept-task-switching-cost)</sup> :
- répétitive
- volumineuse
- textuelle
- ou destinée à être rejouée

alors le terminal commence souvent à être le meilleur outil.

## La bonne base Windows

### 1. Windows Terminal

**Windows Terminal** reste la base la plus saine pour la majorité des utilisateurs Windows.

Pourquoi :
- onglets
- panneaux divisés
- profils multiples
- palette de commandes
- bonne intégration Windows

Je ne recommanderais pas de commencer ailleurs sauf besoin spécifique.

### 2. PowerShell 7, pas CMD

Le vrai shell de départ aujourd'hui, c'est **PowerShell 7**.

Pourquoi :
- plus moderne
- meilleur confort
- plus cohérent pour les scripts
- meilleur avenir que `cmd`

`CMD` peut encore servir pour de très vieilles habitudes ou quelques commandes simples, mais ce n'est plus la base à enseigner en premier.

Donc :
- **Windows Terminal** pour l'enveloppe
- **PowerShell 7** pour le shell principal

## Quand WSL devient utile

**WSL** est excellent, mais seulement si tu as une vraie raison.

Je le recommande si :
- tu utilises souvent des outils Linux
- tu fais du développement web ou backend qui dépend fortement de l'écosystème Linux
- tu veux retrouver un environnement proche d'un serveur ou d'une machine Unix

Je ne le recommande pas comme premier pas si ton besoin est seulement :
- naviguer dans des dossiers
- lancer quelques commandes de base
- faire un peu de recherche de fichiers ou de texte

Donc :
- **PowerShell 7** d'abord
- **WSL** quand ton workflow le justifie vraiment

## Les usages terminal qui paient le plus vite

Tu n'as pas besoin de devenir expert pour obtenir un vrai retour.

Les premiers cas où la CLI paie vite sont souvent :
- chercher du texte dans beaucoup de fichiers
- trouver rapidement des fichiers
- renommer ou déplacer en masse
- installer ou mettre à jour plusieurs outils
- enchaîner quelques commandes que tu veux rejouer

Autrement dit, la CLI devient rentable dès que le travail a une structure répétable.

## Le petit stack moderne qui mérite vraiment sa place

Tu n'as pas besoin de vingt utilitaires.

### Les plus rentables

| Outil | Pourquoi le garder |
|-------|--------------------|
| **ripgrep (`rg`)** | Recherche texte ultra-rapide |
| **fd** | Recherche de fichiers plus simple que les commandes classiques |
| **bat** | Lecture de fichiers plus lisible |
| **zoxide** | Navigation plus rapide entre dossiers fréquents |
| **fzf** | Filtrage flou interactif quand tu veux chercher plus vite |

### Ceux qui sont plus optionnels

| Outil | Quand il devient pertinent |
|-------|----------------------------|
| **eza** | Si tu veux une meilleure lecture de l'arborescence et du listing |

Le bon ordre d'adoption est simple :
- `rg`
- `fd`
- `zoxide`
- puis le reste si tu en sens le besoin

## Installation : garde la base simple

Si tu veux installer ces outils, **Scoop** reste une bonne couche secondaire pour les outils CLI.

Mais n'oublie pas la hiérarchie générale du module :
- `winget` pour la base logicielle globale
- `Scoop` surtout pour enrichir l'environnement terminal

## Les alternatives à Windows Terminal

Il existe d'autres émulateurs :
- **WezTerm**
- **Alacritty**
- **Tabby**
- **Hyper**

Mais je ne les recommande pas comme point de départ pour la majorité.

Ils deviennent intéressants si tu veux :
- une config plus poussée
- un style particulier
- un besoin précis autour du SSH, du multiplexage ou de l'esthétique

Sinon, rester sur **Windows Terminal** évite de complexifier inutilement.

## Ce qu'il faut éviter

- adopter la CLI comme identité au lieu de l'utiliser comme levier
- installer trop d'outils avant d'avoir un vrai usage
- passer à WSL sans raison claire
- compliquer en terminal une tâche purement visuelle faite une fois

## Workflow recommandé

**Minimaliste** :
- Windows Terminal
- PowerShell 7
- quelques commandes utiles

**Pragmatique** :
- `rg`, `fd`, `zoxide`
- usage terminal pour la recherche, le batch et les installs
- scripts ou commandes sauvegardées quand une tâche revient

**Système personnel** :
- PowerShell 7 comme base
- WSL si besoin réel
- petit stack CLI stable et maîtrisé

:::note[Exercice pratique]
Repère une tâche que tu fais souvent à la souris :

1. chercher un fichier
2. chercher du texte
3. renommer un lot
4. installer plusieurs outils

Choisis-en une seule et apprends la version terminal. Si elle te fait gagner du temps deux fois de suite, elle mérite d'entrer dans ton système. Sinon, reste en GUI sans culpabilité.
:::

### Références du chapitre (pour aller plus loin)

<a id="ref-cognitive-offloading"></a>1) **Cognitive offloading (externaliser pour mieux penser)** — Evan F. Risko & Sam J. Gilbert (2016), *Cognitive Offloading* — [Trends in Cognitive Sciences, Cell Press](https://www.sciencedirect.com/science/article/pii/S1364661316300468)

<a id="ref-cognitive-load"></a>2) **Charge cognitive (working memory / charge mentale)** — Fred Paas & Jeroen J. G. van Merriënboer (2020), *Cognitive-Load Theory: Methods to Manage Working Memory Load in the Learning of Complex Tasks* — [Current Directions in Psychological Science, SAGE](https://journals.sagepub.com/doi/10.1177/0963721420922183)

<a id="ref-task-switching"></a>3) **Coûts du changement de tâche (task switching)** — Joshua S. Rubinstein, David E. Meyer & Jeffrey E. Evans (2001), *Executive Control of Cognitive Processes in Task Switching* — [Journal of Experimental Psychology: Human Perception and Performance, APA](https://psycnet.apa.org/record/2001-06771-013)

<a id="ref-windows-terminal"></a>4) **Windows Terminal (documentation officielle)** — Microsoft Learn — [Windows Terminal](https://learn.microsoft.com/windows/terminal/)

### Approfondissement des concepts techniques

<a id="concept-cognitive-offloading"></a>#### Cognitive offloading (répétabilité)
Une commande sauvegardée, un script, ou une procédure réutilisable externalise une partie du pilotage: tu n'as plus à “tenir” la séquence complète en mémoire à chaque fois.
Source scientifique : [1](#ref-cognitive-offloading)

<a id="concept-cognitive-load"></a>#### Charge cognitive (quand la GUI devient lente)
Quand une tâche implique trop de petites décisions, clics et exceptions, ta mémoire de travail se retrouve mobilisée par le “pilotage” au lieu du résultat. Une bonne CLI réduit souvent cette charge parasite.
Source scientifique : [2](#ref-cognitive-load)

<a id="concept-task-switching-cost"></a>#### Coûts du changement de tâche (répéter une séquence)
Plus tu enchaînes des micro-étapes et des allers-retours, plus tu paies des coûts de reprise (où en étais-je, quel est le prochain pas). Les workflows reproductibles limitent ces redémarrages.
Source scientifique : [3](#ref-task-switching)
