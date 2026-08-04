---
title: "Capturer & Collecter"
description: "Outils et méthodes pour archiver le web, enregistrer ton écran, gérer tes médias et ne rien perdre."
sidebar:
  label: "Capturer"
  order: 2
---

La capture est la première étape du PKM. Si tu ne captures pas, tu oublies. Et ce que tu oublies ne peut ni t'inspirer ni te servir plus tard.

> Capture d'abord, organise ensuite. Le pire ennemi de la capture, c'est le perfectionnisme organisationnel.

Capturer, c'est mettre en place une **mémoire externe** : tu déplaces l'information hors de ta tête pour la rendre retrouvable et réutilisable<sup>[1](#concept-cognitive-offloading)</sup>. Mais capture ≠ apprentissage : si tu veux retenir, il faudra revenir et pratiquer le **rappel actif** (retrieval practice)<sup>[2](#concept-retrieval-practice)</sup>.

## Le vrai sujet : où va ce que tu captures ?

Le piège classique du PKM, c'est d'empiler les outils de capture sans décider **où la matière va vivre ensuite**.

Avant même de choisir une extension, un scraper ou un outil d'archivage, pose-toi cette question :
- est-ce que je veux surtout **stocker des références**
- **écrire et relier des notes**
- ou construire une **mémoire avancée** de mon activité numérique

### Stack minimum viable PKM

Pour beaucoup de gens, le meilleur point de départ n'est pas un système compliqué. C'est un trio simple :

- **Obsidian** si tu veux un vrai espace de notes reliées, des backlinks, un graph local, et une base souple pour penser
- **Karakeep** si tu veux sauvegarder des liens, images, notes courtes et références web de manière retrouvable
- **Monolith** si tu veux archiver certaines pages web de façon durable, en un seul fichier

Ce trio couvre déjà l'essentiel :
- la **référence**
- la **note**
- l'**archive**

### Si tu préfères penser en blocs plutôt qu'en pages

**Logseq** reste une très bonne alternative à Obsidian si tu préfères :
- l'outlining
- les blocs reliés entre eux
- une logique plus quotidienne / journalière
- une approche locale et graphe-first

Autrement dit :
- **Obsidian** si tu veux un système très flexible orienté notes + backlinks
- **Logseq** si tu veux un système plus naturellement structuré en blocs et journaux

Le point important ici n'est pas de "choisir le meilleur outil absolu". C'est de choisir un outil dans lequel tu auras envie de revenir tous les jours.

### Ce qui est avancé, pas obligatoire

Des outils comme **Screenpipe** deviennent intéressants quand tu veux aller plus loin :
- enregistrer ton activité écran de manière locale
- retrouver des informations vues mais non capturées à la main
- créer une forme de mémoire contextuelle plus profonde

Mais ce n'est pas un point de départ. C'est une couche avancée.

Donc :
- **Obsidian / Logseq** pour la pensée et les liens
- **Karakeep** pour la collecte retrouvable
- **Monolith** pour l'archive durable
- **Screenpipe** seulement si tu veux une mémoire de travail augmentée

## Ce qui manque souvent dans un PKM débutant

Beaucoup de systèmes échouent non pas parce qu'ils ne capturent pas assez, mais parce qu'ils capturent sans logique de destination.

Si tu veux éviter la surcharge :
- garde **un outil principal de notes**
- garde **un outil principal de collecte**
- n'ajoute des couches supplémentaires que si un vrai problème apparaît

Le but n'est pas de construire un musée du web. Le but est de récupérer ce qui pourra réellement être retrouvé, relié, relu et réutilisé.

## Archivage web

### [Monolith](https://github.com/Y2Z/monolith)

Monolith sauvegarde une page web complète en un seul fichier HTML — images, CSS et scripts inclus. Pas de dépendance externe, pas de lien cassé.

| Avantage | Détail |
|----------|--------|
| **Fichier unique** | Tout est embarqué dans un seul .html |
| **Hors-ligne** | Fonctionne sans connexion après sauvegarde |
| **Ligne de commande** | Automatisable dans tes scripts |
| **Fidélité** | Rendu quasi identique à la page originale |

### [Webscape](https://webscape.co.za/)

Webscape est un hub central pour organiser tout ce que tu captures :

- **Collections** pour catégoriser l'information par thème ou projet
- **Workspaces** pour séparer tes différents contextes de travail
- **Recherche full-text** dans tout ton contenu sauvegardé
- **Commandes rapides** — crée un événement Google, envoie un message LinkedIn, le tout sans quitter l'outil

### [Karakeep](https://karakeep.app/)

Karakeep, anciennement **Hoarder**, est aujourd'hui la recommandation plus juste si tu veux un outil de bookmarking auto-hébergeable qui va au-delà du simple signet :

- **Sauvegarde automatique** du contenu complet des pages
- **Recherche full-text** dans tout ce que tu as sauvegardé
- **Tags et collections** pour organiser par thème
- **API ouverte** pour intégrer dans ton workflow

### Quand Karakeep devient le bon choix

Karakeep est pertinent si :
- tu captures beaucoup de liens
- tu veux les retrouver sans dépendre de ta mémoire
- tu aimes l'idée d'un système auto-hébergé ou plus contrôlable

En revanche, si ton besoin principal est de **penser**, de **relier des idées** et de **produire des notes durables**, le cœur du système doit rester Obsidian ou Logseq. Karakeep joue plutôt le rôle d'**inbox de référence**.

---

## Enregistrement d'écran

### [Screenpipe](https://screenpi.pe/)

Screenpipe enregistre en continu tout ce qui se passe sur ton écran et le rend recherchable. C'est une mémoire visuelle de ton travail.

- **Capture continue** — tout est enregistré en arrière-plan
- **OCR intégré** — le texte à l'écran est reconnu et indexé
- **Recherche temporelle** — retrouve ce que tu faisais à n'importe quel moment
- **Local uniquement** — tes données restent sur ta machine

### Quand ne pas utiliser Screenpipe

Screenpipe est impressionnant, mais il ne faut pas le traiter comme un outil par défaut.

Je le recommanderais surtout si :
- tu travailles sur beaucoup d'informations fugitives
- tu rates souvent des détails vus à l'écran
- tu veux une mémoire de contexte plus profonde

Je ne le recommanderais pas en premier si :
- ton système de notes est encore chaotique
- tu n'as pas encore d'habitude simple de capture
- tu risques de créer une couche de données supplémentaire que tu ne reliras jamais

---

## Compression et outils médias

Avant de stocker, compresse. Un fichier plus léger, c'est un disque qui respire.

| Outil | Type | Usage |
|-------|------|-------|
| [FFmpeg](https://www.ffmpeg.org/) | Vidéo/audio | Compression, conversion, extraction de pistes |
| [ImageMagick](https://imagemagick.org/) | Images | Redimensionnement, conversion en lot |
| [7-Zip](https://www.7-zip.org/) | Archives | Compression maximale, format ouvert |

---

## Lecteurs de médias

### [Thorium Reader](https://thorium.edrlab.org/en/)

Thorium Reader est un lecteur d'ebooks open source qui supporte EPUB, PDF et audiobooks :

- **Interface épurée** pour une lecture sans distraction
- **Annotations et surlignage** exportables
- **Catalogue OPDS** pour accéder à des bibliothèques en ligne
- **Accessibilité** — synthèse vocale, personnalisation typographique

---

## Gestion de photos

### [Tonfotos](https://tonfotos.com/)

Tonfotos organise ta photothèque avec reconnaissance faciale et géolocalisation, le tout en local :

- **Reconnaissance faciale** pour retrouver les photos d'une personne
- **Timeline** chronologique automatique
- **Pas de cloud** — tout reste sur ton disque
- **Détection de doublons** pour libérer de l'espace

---

## Organisation des fichiers numériques

### Principes de base

1. **Un dossier = un projet ou un domaine** — pas de dossier "Divers" fourre-tout
2. **Convention de nommage** : `AAAA-MM-JJ_description_v1.ext`
3. **Inbox unique** : un seul dossier de réception, vidé chaque semaine
4. **3 niveaux max** de profondeur dans l'arborescence
5. **Archive ≠ supprime** : déplace dans un dossier Archive plutôt que de supprimer

### Gestion des actifs numériques

Pour les créatifs et les collectionneurs d'information :

- **Sépare les sources des productions** — matière première vs contenu fini
- **Versionne tes fichiers importants** — `_v1`, `_v2` ou mieux, un dépôt Git
- **Tagge les métadonnées** quand c'est possible — ça facilite la recherche future
- **Sauvegarde 3-2-1** : 3 copies, 2 supports différents, 1 hors-site

### Références du chapitre (pour aller plus loin)

<a id="ref-cognitive-offloading"></a>1) **Cognitive offloading / mémoire externe** — Risko & Gilbert (2016), *Cognitive Offloading* — [Trends in Cognitive Sciences (ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S1364661316300714)

<a id="ref-extended-mind"></a>2) **Extended mind / cognition étendue** — Clark & Chalmers (1998), *The Extended Mind* — [paper (consc.net)](https://consc.net/papers/extended.html)

<a id="ref-retrieval-practice"></a>3) **Retrieval practice / test-enhanced learning** — Roediger & Karpicke (2006), *Test-Enhanced Learning: Taking Memory Tests Improves Long-Term Retention* — [Psychological Science (SAGE)](https://journals.sagepub.com/doi/10.1111/j.1467-9280.2006.01693.x)

### Approfondissement des concepts techniques

<a id="concept-cognitive-offloading"></a>#### Cognitive offloading (mémoire externe opérationnelle)
Tu “offloades” quand tu poses une information dans un support fiable (note, capture, fichier, lien) pour ne plus avoir à la maintenir activement en mémoire. La valeur vient quand cet artefact est **retrouvable** et **réinjectable** dans un travail futur.
Source scientifique : [1](#ref-cognitive-offloading)

<a id="concept-extended-mind"></a>#### Extended mind (cognition étendue)
Certains outils jouent le rôle de composant cognitif externe : ils ne font pas que stocker, ils participent à ta capacité à raisonner et à agir (à condition que l'accès soit fluide et fiable).
Source scientifique : [2](#ref-extended-mind)

<a id="concept-retrieval-practice"></a>#### Retrieval practice (rappel actif)
Capturer ne suffit pas à apprendre. Pour consolider, tu dois te forcer à retrouver l'idée, la reformuler, l'appliquer ou l'expliquer, puis corriger avec la source.
Source scientifique : [3](#ref-retrieval-practice)
