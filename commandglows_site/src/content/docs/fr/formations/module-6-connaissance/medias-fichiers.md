---
title: "Opérations sur Médias & Fichiers"
description: "Choisis les bons outils pour renommer, convertir, compresser, réorganiser ou extraire tes fichiers sans transformer chaque tâche répétitive en corvée."
sidebar:
  label: "Médias & Fichiers"
  order: 7
---

Un bon PKM ne vit pas seulement dans les notes. Il repose aussi sur une couche plus ingrate, mais très réelle :
- fichiers
- exports
- scans
- images
- vidéos
- archives

> Si chaque opération sur fichier te coûte 20 clics, ton système finit par se dégrader, même si tes idées sont bien rangées.

Cette couche “fichiers” est une partie de ta **mémoire externe** : si elle est trop coûteuse à maintenir, tu éviteras d'y revenir<sup>[1](#concept-cognitive-offloading)</sup>. Bien gérée, elle devient un actif de **gestion des connaissances** (réutilisable, transmissible, retrouvable)<sup>[2](#concept-knowledge-management)</sup>.

## Le vrai sujet : réduire les opérations manuelles répétées

Cette leçon ne sert pas à collectionner des utilitaires. Elle sert à répondre à une question plus simple :

**quelle friction de fichier ou de média revient assez souvent pour mériter un outil ou un script ?**

Les frictions les plus courantes sont :
- renommer en masse
- convertir des formats
- réorganiser des PDF
- compresser ou nettoyer des médias
- manipuler des données tabulaires
- explorer une archive ou un lot de fichiers sans tout ouvrir à la main

## Le decision framework CommandGlows

Avant d'ajouter un outil, pose-toi quatre questions :

1. **Est-ce une tâche ponctuelle ou récurrente ?**
2. **Est-ce que je manipule 3 fichiers ou 300 ?**
3. **Ai-je besoin d'une interface visuelle ou d'un script reproductible ?**
4. **Le vrai problème est-il la conversion, le renommage, la compression, la recherche ou la réorganisation ?**

Ce cadre mène souvent à une règle simple :
- **ponctuel et visuel** → GUI
- **récurrent ou volumineux** → CLI ou script

## Commence par les opérations les plus rentables

Les tâches qui méritent le plus vite un vrai outil sont souvent :
- renommer un grand lot
- convertir des images ou vidéos
- reconstruire un PDF
- rendre un scan cherchable
- traiter un CSV trop gros pour Excel

Ce ne sont pas des gestes "glamour", mais ce sont eux qui empêchent ton système documentaire de devenir pénible.

## Renommage en lot

Le renommage est souvent le premier vrai gain de productivité côté fichiers.

### Outils crédibles

| Outil | Usage |
|-------|-------|
| [PowerRename](https://learn.microsoft.com/en-us/windows/powertoys/powerrename) | Le bon choix par défaut sur Windows si tu veux renommer vite depuis l'Explorateur |
| [Bulk Rename Utility](https://www.bulkrenameutility.co.uk/) | Pour les cas plus lourds, plus techniques, avec beaucoup d'options |

Le bon choix est souvent :
- **PowerRename** si tu veux quelque chose de simple et intégré
- **Bulk Rename Utility** si tu as des règles complexes, beaucoup de variantes, ou un besoin très poussé

## Conversion et compression en lot

Quand un traitement revient souvent, il faut arrêter de le faire fichier par fichier.

### Outils de base solides

| Outil | Rôle |
|-------|------|
| [FFmpeg](https://ffmpeg.org/) | Conversion, extraction et compression audio/vidéo |
| [ImageMagick](https://imagemagick.org/) | Conversion, redimensionnement et traitement d'images en lot |
| [Pandoc](https://pandoc.org/) | Conversion de documents et formats texte |

Ces outils deviennent pertinents si :
- tu répètes souvent la même opération
- tu veux un résultat scriptable
- tu préfères une commande fiable à 20 manipulations manuelles

Le bon réflexe n'est pas de tout apprendre d'un coup. C'est de sauver 2 ou 3 commandes qui reviennent souvent.

## PDF : nettoyer, réorganiser, rendre cherchable

Les PDF sont souvent le format le plus pénible et le plus fréquent dans un système personnel.

### Outils à garder

| Outil | Usage |
|-------|-------|
| [Stirling PDF](https://stirlingpdf.io/) | Boîte à outils large pour fusionner, extraire, convertir, signer ou nettoyer |
| [PDF Arranger](https://github.com/pdfarranger/pdfarranger) | Réorganisation visuelle de pages |
| [OCRmyPDF](https://ocrmypdf.readthedocs.io/) | Rendre un scan cherchable |

La bonne logique :
- **PDF Arranger** si tu veux recomposer rapidement
- **OCRmyPDF** si tu veux retrouver plus tard
- **Stirling PDF** si tu veux un atelier PDF plus complet

## CSV et données tabulaires

Quand un CSV devient trop gros ou trop sale pour Excel, il faut changer d'approche.

### Outil à connaître

[qsv](https://github.com/dathere/qsv) est une option très crédible si tu manipules régulièrement des fichiers CSV lourds ou répétitifs.

Il devient utile si tu veux :
- filtrer
- trier
- dédupliquer
- produire des stats rapides
- enchaîner des transformations sans casser le fichier à la main

Ce n'est pas un outil grand public. Mais pour quelqu'un qui manipule des exports, des datasets ou des tableaux opérationnels, le gain est réel.

## Texte brut et petites transformations

Toutes les opérations sur texte ne méritent pas Word, Google Docs ou un éditeur plus lourd.

### Outil léger à connaître

[Text Edit Plus](https://vovsoft.com/blog/text-edit-plus-full-feature-list/) peut être intéressant si ton besoin réel est de manipuler du texte brut rapidement sur Windows :
- nettoyer ou reformater des lignes
- faire du rechercher/remplacer avancé
- comparer deux versions
- convertir des encodages
- préparer un export simple

Je ne le placerais pas au centre du cours, parce que ce n'est ni un vrai traitement de texte, ni un standard de collaboration. En revanche, c'est une option cohérente si ton problème est :
- ouvrir vite
- corriger vite
- transformer vite
- puis repartir

Autrement dit : un bon petit atelier de texte utilitaire, pas une suite d'ecriture complete.

## Images, captures et petits traitements visuels

Toutes les tâches image ne méritent pas Photoshop.

### Outils utiles selon le besoin

| Outil | Usage |
|-------|-------|
| [ShareX](https://getsharex.com/) | Captures, annotations, partage rapide |
| [XnConvert](https://www.xnview.com/en/xnconvert/) | Conversion et traitement d'images en lot |
| [Magic Copy](https://chromewebstore.google.com/detail/magic-copy/nnifclicibdhgakebbnbfmomniihfmkg) | Extraction rapide d'un sujet depuis une image web quand tu veux aller vite |

La bonne question n'est pas "quel éditeur image est le meilleur ?" mais :
- ai-je besoin d'éditer
- de capturer
- ou juste d'extraire / convertir rapidement

## Photothèque et actifs visuels

Les photos et vidéos personnelles ou de travail ne relèvent pas de la "capture PKM" au sens strict. Elles relèvent surtout de :
- l'organisation d'actifs
- la déduplication
- la consultation rapide
- la récupération plus tard

Autrement dit, leur bonne place est ici, comme couche de gestion de fichiers, pas dans `capturer.md`.

### Quand un outil dédié devient utile

Si tu as une vraie photothèque dispersée entre :
- disque local
- disques externes
- NAS
- smartphone

alors un outil comme [Tonfotos](https://tonfotos.com/) peut devenir pertinent.

Son intérêt moderne est simple :
- navigation par dates, événements, personnes et lieux
- détection de doublons
- logique locale plutôt que cloud imposé

Je ne le recommanderais pas comme outil universel du cours. Je le recommanderais si ton problème est vraiment :
- retrouver des photos ou vidéos dans un gros volume
- maintenir un archive personnelle ou familiale consultable
- éviter qu'une masse de médias se transforme en vrac inutilisable

Le bon réflexe reste le même :
- si ton problème est ponctuel, reste simple
- si ton volume devient structurel, prends un outil dédié

## Archives et accès sélectif

Parfois, le problème n'est pas le fichier, mais le conteneur.

[Cloudzip](https://github.com/ozkatz/cloudzip) devient intéressant si tu manipules de grosses archives distantes et que tu veux :
- lister leur contenu
- extraire seulement quelques fichiers
- éviter de télécharger tout le zip

Ce n'est pas un outil pour tout le monde. Mais si tu touches à des archives lourdes sur du stockage distant, le gain est très concret.

## La bonne progression

### Niveau 1 : visuel et simple

- PowerRename
- PDF Arranger
- ShareX

### Niveau 2 : traitement régulier

- XnConvert
- Stirling PDF
- quelques commandes FFmpeg ou ImageMagick

### Niveau 3 : travail plus technique

- qsv
- OCRmyPDF
- Cloudzip
- scripts réutilisables

## Ce qu'il faut éviter

- installer 10 outils avant d'avoir identifié une friction récurrente
- traiter à la main une tâche faite déjà chaque semaine
- choisir la CLI uniquement pour se sentir plus avancé
- choisir une GUI quand le vrai besoin est la répétabilité

## Workflow recommandé

**Minimaliste** :
- un outil de renommage
- un outil PDF
- un outil de capture

**Pragmatique** :
- GUI pour le ponctuel
- CLI pour le récurrent
- quelques scripts ou commandes sauvegardés

**Système personnel** :
- pipeline léger pour PDF, images, audio/vidéo et CSV
- conventions de nommage stables
- opérations répétitives progressivement automatisées

:::note[Exercice pratique]
Repère une opération de fichiers que tu as déjà faite au moins 3 fois ce mois-ci :

1. nomme la friction exacte
2. décide si elle doit être résolue par GUI ou CLI
3. choisis un seul outil
4. sauvegarde la procédure ou la commande

Le bon signe n'est pas d'avoir plus d'outils. C'est de ne plus refaire la même corvée à la main.
:::

### Références du chapitre (pour aller plus loin)

<a id="ref-cognitive-offloading"></a>1) **Cognitive offloading / mémoire externe** — Risko & Gilbert (2016), *Cognitive Offloading* — [Trends in Cognitive Sciences (ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S1364661316300714)

<a id="ref-knowledge-management"></a>2) **Knowledge management (tacite -> explicite)** — Nonaka (1994), *A Dynamic Theory of Organizational Knowledge Creation* — [Organization Science (INFORMS)](https://doi.org/10.1287/orsc.5.1.14)

### Approfondissement des concepts techniques

<a id="concept-cognitive-offloading"></a>#### Mémoire externe (cognitive offloading) et friction d'accès
Plus le coût d'accès (clics, conversion, renommage, recherche) est élevé, plus tu repousses l'usage de ta mémoire externe. Réduire la friction rend le système utilisable au quotidien.
Source scientifique : [1](#ref-cognitive-offloading)

<a id="concept-knowledge-management"></a>#### Gestion des connaissances par les fichiers
Une convention de nommage, une structure simple et des exports propres transforment des “fichiers” en artefacts de connaissance (réutilisables, partageables, auditables).
Source scientifique : [2](#ref-knowledge-management)
