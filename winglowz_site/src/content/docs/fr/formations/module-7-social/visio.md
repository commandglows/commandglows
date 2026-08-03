---
title: "Reunions & Visioconference"
description: "Reduis les reunions inutiles, ameliore la qualite de tes visios et automatise la prise de notes avec des outils IA."
sidebar:
  label: "Reunions & Visio"
  order: 3
---

Le probleme des reunions n'est pas seulement leur nombre. C'est qu'elles deviennent souvent le mecanisme par defaut pour reparer une communication mal preparee.
En visio, il y a aussi une fatigue specifique (nonverbal overload) qui s'accumule vite.<sup>[1](#concept-video-meeting-fatigue)</sup> Et chaque reunion placee en reaction cree une interruption structurelle dans la journee.<sup>[2](#concept-interruptions)</sup>

Une reunion utile est une **escalade** :
- quand l'asynchrone ne suffit plus
- quand une decision bloque
- quand un alignement collectif doit etre produit maintenant

> Une bonne reunion ne sert pas a "faire avancer les choses" en general. Elle sert a debloquer, trancher ou synchroniser ce que l'ecrit ne regle pas assez vite.

## Quand une reunion est justifiee

- il faut prendre une decision avec plusieurs parties prenantes
- il faut arbitrer entre plusieurs options en temps reel
- il y a une tension ou une ambiguite que l'ecrit aggrave
- il faut produire un alignement immediat

## Quand elle ne l'est probablement pas

- simple partage d'information
- revue passive d'un document
- status update sans decision a prendre
- sujet qui aurait pu etre clarifie par un message, une note ou une video courte

Si la reunion sert surtout a lire ensemble quelque chose qui aurait pu etre envoye avant, ce n'est pas une reunion necessaire. C'est une dette de preparation.

## Le decision framework CommandGlows

Avant de planifier, pose-toi quatre questions :

1. **Le but peut-il etre atteint autrement ?** document, Loom, commentaire, email
2. **Quelle decision ou sortie concrete doit exister a la fin ?**
3. **Qui est vraiment requis ?**
4. **Peut-on faire plus court ?** 15 ou 25 minutes au lieu de 30 ou 60

L'outil **[Should It Be a Meeting](https://shoulditbeameeting.com/)** propose un questionnaire interactif pour trancher. Regle CommandGlows : si l'objectif peut etre atteint par une video Loom de 2 minutes, ce n'est pas une reunion.

## Le vrai objectif

Le vrai objectif n'est pas d'avoir des reunions "plus agreables". C'est :
- moins de reunions par defaut
- moins de participants inutiles
- plus de decisions explicites
- des actions qui sortent vraiment de la reunion

## La couche planification

Si une reunion est legitime, la planification doit rester legere.

**[Rallly](https://rallly.co/)** est l'alternative open source a Doodle : interface epuree, aucune inscription requise pour les participants, votes en temps reel sur les creneaux proposes. Disponible en SaaS ou self-hosted pour un meilleur controle des donnees.

## La couche plateforme

La plupart du temps, le bon choix n'est pas la plateforme "la plus innovante". C'est la plus simple pour tes interlocuteurs.

| Outil | Point fort | Prix |
|-------|-----------|------|
| **Google Meet / Zoom / Teams** | Outils standards, simples a deployer, assez universels | Variable |

Quand tu choisis une plateforme de visio, cherche d'abord la simplicite de deploiement, la compatibilite avec tes interlocuteurs et la stabilite technique.

## La couche notes et suivi

Une reunion sans sortie claire recree du travail plus tard. C'est la que les notetakers IA deviennent utiles.

Les assistants IA rejoignent ou accompagnent tes calls, transcrivent et extraient automatiquement decisions, resumes et actions.

| Outil | Specialite | Privacy | Prix |
|-------|-----------|---------|------|
| **[Otter.ai](https://otter.ai/)** | Transcription temps reel, integrations larges, adoption generaliste | Standard | Freemium |
| **[tl;dv](https://tldv.io/)** | Sales coaching, insights cross-meeting, posture europeenne | Elevee (EU) | Freemium |
| **[Fireflies.ai](https://fireflies.ai/)** | Recherche et interrogation de tes meetings en langage naturel | Standard | Freemium |
| **[Superpowered](https://superpowered.me/)** | Pas de bot, pas d'enregistrement, transcription depuis l'audio de ton appareil | Maximale | Payant |

:::tip[Choisis selon ton besoin]
- **Generaliste** : Otter.ai
- **Sales & coaching** : tl;dv
- **Insights avances** : Fireflies.ai
- **Confidentialite critique** : Superpowered
:::

## Ce qu'il faut eviter

- planifier une reunion sans sortie attendue
- inviter trop de monde "au cas ou"
- utiliser 60 minutes comme duree par defaut
- tenir la reunion pour partager un contexte qui aurait du arriver avant
- finir sans owner ni prochaine action

## Coordination multi-fuseaux

**Timezone Checker** permet de visualiser d'un coup d'oeil les heures locales de tes collaborateurs et de trouver des creneaux corrects sans allers-retours inutiles.

## Workflow recommande

**Minimaliste** : Should It Be a Meeting + Google Meet ou Zoom + notes humaines propres. Suffisant si tu as peu de calls mais trop de mauvaises habitudes.

**Pragmatique** : Rallly + Meet ou Zoom + Otter.ai ou tl;dv + Timezone Checker. Bon compromis pour equipes distribuees.

**Confidentiel / exigeant** : Rallly + Zoom/Meet/Teams + Superpowered. A privilegier quand tu veux limiter les bots et l'enregistrement.

## Bonnes pratiques

**Avant** : agenda partage, sortie attendue explicite, pre-reads distribues, notetaker configure si besoin.

**Pendant** : commencer a l'heure, suivre l'agenda, prendre des decisions, noter les action items avec responsable et deadline.

**Apres** : notes partagees rapidement, actions sorties vers le gestionnaire de taches, owners notifies.

:::note[Exercice pratique]
Pendant 2 semaines, trace tous tes meetings :

1. pourquoi ils existaient
2. quelle decision en est sortie
3. combien de personnes etaient vraiment utiles
4. lesquels auraient pu etre un message async ou une note

Objectif : reduire le volume, mais surtout augmenter la densite de decision par reunion.
:::

### References du chapitre (pour aller plus loin)

<a id="ref-video-meeting-fatigue"></a>1) **Fatigue en visioconference (Zoom fatigue)** — Jeremy N. Bailenson (2021), *Nonverbal Overload: A Theoretical Argument for the Causes of Zoom Fatigue* — [APA TMB](https://tmb.apaopen.org/pub/nonverbal-overload)

<a id="ref-interruptions"></a>2) **Interruptions et cout de reprise** — Gloria Mark, Daniela Gudith, Ulrich Klocke (2008), *The Cost of Interrupted Work: More Speed and Stress* — [PDF UCI](https://www.ics.uci.edu/~gmark/chi08-mark.pdf)

### Approfondissement des concepts techniques

<a id="concept-video-meeting-fatigue"></a>#### Fatigue en visioconference (nonverbal overload)
La visio ajoute une surcharge de signaux non verbaux (regard, self-view, cadrage, immobilite) qui peut rendre les calls plus epuisants qu'en presentiel. Le point systeme: reduire duree/frequence, couper la camera quand c'est OK, et clarifier la sortie attendue.
Source scientifique : [1](#ref-video-meeting-fatigue)

<a id="concept-interruptions"></a>#### Interruptions et cout de reprise
Une reunion mal placee ne coute pas seulement sa duree: elle coupe une session de travail et impose un cout de reprise. Le point systeme: faire des reunions une "escalade", et proteger des blocs sans calls.
Source scientifique : [2](#ref-interruptions)
