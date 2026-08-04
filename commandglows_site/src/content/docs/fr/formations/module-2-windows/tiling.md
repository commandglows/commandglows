---
title: "Gestion des Fenêtres & Tiling"
description: "Organise tes fenêtres efficacement avec le tiling et les outils de gestion de fenêtres Windows"
sidebar:
  label: "Tiling"
  order: 7
---

> Un écran bien organisé, c'est un esprit bien organisé. Le tiling transforme ton bureau en espace de travail structuré.

## Pourquoi la gestion des fenêtres compte

Combien de fois par jour fais-tu Alt+Tab<sup>[2](#concept-task-switching-cost)</sup> pour retrouver une fenêtre perdue ? Combien de fois redimensionnes-tu manuellement deux fenêtres côte à côte ? Ces micro-interruptions<sup>[1](#concept-attention-residue)</sup> cassent ta concentration.

Le **tiling** (disposition automatique des fenêtres) résout ce problème. Chaque fenêtre a sa place, visible et accessible, sans chevauchement<sup>[3](#concept-visual-clutter)</sup>.

## FancyZones : la référence sur Windows

FancyZones fait partie de **Microsoft PowerToys**, un ensemble d'utilitaires gratuits de Microsoft. C'est de loin la meilleure solution de tiling sur Windows.

### Installation

```powershell
winget install Microsoft.PowerToys
```

### Créer tes zones

1. Ouvre les paramètres PowerToys > FancyZones
2. Clique sur **Lancer l'éditeur de disposition**
3. Choisis un modèle ou crée une disposition personnalisée
4. Définis tes zones en les dessinant sur l'écran

### Dispositions recommandées

**Pour un écran large (ultrawide ou 27"+) :**
- 3 colonnes : principale au centre (50%), secondaires sur les côtés (25% chacune)

**Pour un écran standard (24") :**
- 2 colonnes égales pour le travail côte à côte
- 1 grande + 2 empilées pour le focus avec références

**Pour du multi-écran :**
- Écran principal : 2-3 zones de travail
- Écran secondaire : communication + monitoring

### Utilisation au quotidien

| Action | Comment |
|--------|---------|
| Placer dans une zone | Maintiens `Shift` en déplaçant la fenêtre |
| Changer de zone au clavier | `Win + Ctrl + Alt + Flèches` |
| Switcher de disposition | Configure un raccourci dans les paramètres |

**Astuce** : crée plusieurs dispositions et bascule entre elles selon ton activité. Une disposition pour le code, une pour la rédaction, une pour la communication.

## AquaSnap : améliorer le snap natif

Si tu trouves FancyZones trop complexe, AquaSnap est une alternative plus simple qui améliore le comportement de snap natif de Windows.

**Ce qu'il ajoute :**
- Snap sur les coins (quarts d'écran)
- Fenêtres aimantées qui se collent entre elles
- Redimensionnement simultané de fenêtres adjacentes
- Fenêtres toujours au premier plan (épingle)
- Transparence des fenêtres inactives

## Autres outils

| Outil | Approche | Idéal pour |
|-------|---------|------------|
| **WindowGrid** | Grille overlay au clic droit | Placement précis sans configuration |
| **MaxTo** | Régions prédéfinies par écran | Multi-écran avancé |
| **Divvy** | Grille de placement rapide | Simplicité, raccourci unique |
| **GlazeWM** | Vrai tiling manager automatique | Utilisateurs venant de Linux (i3/sway) |
| **Komorebi** | Tiling manager scriptable | Power users qui veulent un i3 sur Windows |

## Quel niveau de gestion des fenêtres te faut-il vraiment ?

Le piège classique, c'est de chercher "le meilleur outil" trop tôt. En pratique, il vaut mieux choisir ton **niveau de complexité**.

### Niveau 1 : le snap natif de Windows

Si ton besoin est simplement de mettre deux ou trois fenêtres côte à côte sans réfléchir, reste sur le natif :
- `Win + Gauche/Droite`
- `Win + Z`
- bureaux virtuels

C'est suffisant pour beaucoup de gens. Si tu n'as pas encore atteint les limites de ces gestes, inutile d'ajouter une couche d'outil.

### Niveau 2 : FancyZones comme recommandation par défaut

Dès que tu veux des zones répétables, une vraie logique d'écran, ou plusieurs dispositions selon le contexte, **FancyZones** devient le meilleur point d'entrée.

C'est notre recommandation centrale parce que :
- c'est stable
- c'est maintenu
- c'est intégré à PowerToys
- cela apporte une vraie structure sans t'obliger à transformer tout ton poste

### Niveau 3 : outils intermédiaires pour besoins précis

Si FancyZones ne colle pas exactement à ton besoin, il y a des alternatives utiles :
- **AquaSnap** si tu veux surtout améliorer le snap natif
- **WindowGrid** si tu veux du placement très précis sans grosse configuration
- **MaxTo** si tu veux un poste multi-écran très structuré

Ces outils sont intéressants quand ton problème est concret et identifié. Ils le sont beaucoup moins si tu veux juste "plus de puissance" par principe.

### Niveau 4 : vrais tiling managers pour profils avancés

Si tu viens de Linux, de i3, de Sway ou de Hyprland, tu vas naturellement regarder **GlazeWM** ou **Komorebi**.

Ils deviennent pertinents si :
- tu veux une logique de tiling plus automatique
- tu acceptes de configurer ton environnement
- tu supportes une compatibilité parfois moins lisse avec certaines apps Windows

Autrement dit :
- **natif** si ton besoin est simple
- **FancyZones** pour la majorité des utilisateurs sérieux
- **AquaSnap / WindowGrid / MaxTo** pour des cas intermédiaires ciblés
- **GlazeWM / Komorebi** seulement si tu veux vraiment importer une culture Linux du tiling dans Windows

## Tiling automatique vs manuel

Sur Linux, les tiling window managers (i3, Sway, Hyper) gèrent **automatiquement** la position de chaque fenêtre. Tu ouvres une app, elle prend sa place. Tu en ouvres une deuxième, l'espace se divise.

Sur Windows, ce niveau d'automatisation est plus difficile à atteindre. **GlazeWM** et **Komorebi** s'en approchent, mais ils demandent de la configuration et peuvent entrer en conflit avec certaines applications.

Si tu viens d'un environnement comme **Hyprland**, il faut le dire sans ambiguïté : il n'existe pas d'équivalent parfait sur Windows. Tu peux retrouver une partie de la logique avec FancyZones, AquaSnap, GlazeWM ou Komorebi, mais pas le même niveau de contrôle global ni la même intégration profonde au système.

**Notre recommandation** : commence par FancyZones. C'est le meilleur équilibre entre puissance et stabilité. Si tu veux aller plus loin, teste GlazeWM.

## Workflow clavier complet

L'objectif ultime : ne jamais toucher la souris pour organiser tes fenêtres. Voici un workflow type :

1. **Lancer une app** : `Alt + Espace` (via ton lanceur) > tape le nom > Entrée
2. **Placer la fenêtre** : `Win + Ctrl + Alt + Flèche` pour l'envoyer dans une zone
3. **Basculer entre fenêtres** : `Alt + Tab` ou mieux, des raccourcis dédiés par app
4. **Changer de bureau** : `Win + Ctrl + Gauche/Droite`
5. **Maximiser/restaurer** : `Win + Haut`

### Raccourcis natifs à connaître

| Action | Raccourci |
|--------|-----------|
| Snap gauche / droite | `Win + Gauche/Droite` |
| Snap quart d'écran | `Win + Gauche` puis `Win + Haut/Bas` |
| Maximiser | `Win + Haut` |
| Minimiser | `Win + Bas` |
| Minimiser tout | `Win + D` |
| Déplacer vers un autre écran | `Win + Shift + Gauche/Droite` |

## Par où commencer

1. Installe **PowerToys** et active FancyZones
2. Crée **2 dispositions** : une pour le focus, une pour le multitâche
3. Force-toi à utiliser `Shift + drag` pendant une semaine
4. Ajoute progressivement les raccourcis clavier
5. Quand c'est devenu naturel, explore GlazeWM si tu veux aller plus loin

## Ressources officielles

- [Microsoft PowerToys](https://github.com/microsoft/PowerToys) - FancyZones et PowerToys Run dans le même ensemble.
- [AquaSnap](https://www.nurgo-software.com/products/aquasnap) - l'alternative plus simple au tiling natif.
- [WindowGrid](https://windowgrid.net/) - la grille précise au clic droit.
- [MaxTo](https://maxto.net/) - les régions prédéfinies par écran.
- [Divvy](https://mizage.com/divvy/) - la gestion de fenêtres par grille.
- [GlazeWM](https://glazewm.com/) - le tiling automatique façon i3 sur Windows.
- [Komorebi](https://github.com/LGUG2Z/komorebi) - l'autre gestionnaire de tiling scriptable pour Windows.

## Références du chapitre (pour aller plus loin)

<a id="ref-attention-residue"></a>1) **Résidu d'attention (attention residue)** — Sophie Leroy (2009), *Why is it so hard to do my work? The challenge of attention residue when switching between work tasks* — [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0749597809000399)

<a id="ref-task-switching"></a>2) **Coûts du changement de tâche (task switching)** — Joshua S. Rubinstein, David E. Meyer & Jeffrey E. Evans (2001), *Executive Control of Cognitive Processes in Task Switching* — [Journal of Experimental Psychology: Human Perception and Performance, APA](https://psycnet.apa.org/record/2001-06771-013)

<a id="ref-visual-clutter"></a>3) **Clutter visuel (mesure et impact sur l’attention)** — Ruth Rosenholtz, Yuanzhen Li, Joanna Mansfield & Zhenlan Jin (2007), *Measuring visual clutter* — [Journal of Vision](https://jov.arvojournals.org/article.aspx?articleid=2121507)

<a id="ref-powertoys-fancyzones"></a>4) **FancyZones (documentation officielle)** — Microsoft PowerToys — [FancyZones utility](https://learn.microsoft.com/windows/powertoys/fancyzones)

<a id="ref-windows-snap"></a>5) **Snap (raccourcis natifs)** — Microsoft Support — [Snap your windows](https://support.microsoft.com/windows/snap-your-windows-9acb0e3a-9dcd-48c6-9a69-b62e6f209aa1)

## Approfondissement des concepts techniques

<a id="concept-attention-residue"></a>#### Résidu d’attention (micro-interruptions)
Chaque interruption te laisse souvent avec un “reste” mental du contexte précédent. Structurer l’espace de travail réduit la part de reprise nécessaire quand tu reviens à la tâche.
Source scientifique : [1](#ref-attention-residue)

<a id="concept-task-switching-cost"></a>#### Coûts du changement de tâche (Alt+Tab)
Basculer entre fenêtres et contextes a un coût: il faut retrouver l’état, la prochaine action, et reconstituer le fil. Moins de bascules et plus de placements reproductibles diminuent ce coût.
Source scientifique : [2](#ref-task-switching)

<a id="concept-visual-clutter"></a>#### Clutter visuel (chevauchement, “fenêtres perdues”)
Le désordre visuel augmente la difficulté de recherche et de sélection. Le tiling réduit le chevauchement et rend la scène plus “lisible”, ce qui aide à retrouver vite la bonne fenêtre.
Source scientifique : [3](#ref-visual-clutter)
