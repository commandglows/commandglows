---
title: "Rendre le Web Accessible"
description: "Réduis la friction du web : navigateur propre, RSS, lecture plus calme et accès rapide au contenu qui compte."
sidebar:
  label: "Web Accessible"
  order: 2
---

Le problème du web n'est pas seulement la quantité d'information. C'est la friction : pubs, trackers, feeds infinis, onglets ouverts partout, mauvaises interfaces, et trop de chemins inutiles entre toi et le contenu utile.

> Rendre le web accessible, ce n'est pas tout rendre visible. C'est enlever tout ce qui te sépare du bon contenu.

Et “accessible” ne veut pas seulement dire “plus confortable pour toi”. Si tu produis ou partages du contenu, l'accessibilité web est aussi une exigence de base (structure, navigation, contrastes, focus clavier). Les standards WCAG donnent un cadre concret<sup>[1](#concept-wcag)</sup>.

## Le vrai sujet

Un web bien configuré doit te permettre de :
- atteindre vite ce que tu cherches
- lire dans de bonnes conditions
- suivre des sources sans subir les plateformes
- garder peu d'onglets, peu de bruit, peu de détours

## Le decision framework CommandGlows

Quand tu touches à ton navigateur ou à tes flux web, pose-toi trois questions :

1. **Est-ce que cela réduit ou augmente la friction ?**
2. **Est-ce que cela me rapproche du contenu ou du feed ?**
3. **Est-ce que cela mérite d'être toujours visible, ou seulement accessible quand j'en ai besoin ?**

Cette logique conduit a trois couches utiles :

- **Couche 1 : nettoyage** — bloquer le bruit, limiter les distractions
- **Couche 2 : accès** — raccourcis, signets, profils, organisation simple
- **Couche 3 : suivi** — RSS, lecture differée, flux choisis

## Ce qu'il faut éviter

- utiliser la page d'accueil du navigateur comme portail de distraction
- garder 80 onglets "pour plus tard"
- suivre des sites importants uniquement via réseaux sociaux
- empiler des extensions sans logique
- confondre accessibilite avec surcharge permanente

## Accessibilité (au sens WCAG) : une friction invisible

Quand une page est mal structurée, mal contrastée, ou impossible à naviguer au clavier, tu ajoutes une friction cognitive qui ne se voit pas tout de suite, mais qui se paye à chaque lecture.

Le bon cadre mental est le même que pour ton web “calme” :
- rendre le contenu **perceptible** et lisible
- rendre l’interface **opérable** (clavier, focus, navigation)
- rendre le parcours **compréhensible**
- rendre le tout **robuste** (compatible avec les technologies d’assistance)

Ce sont les principes POUR de WCAG<sup>[2](#concept-pour)</sup>.

## La couche nettoyage

Commence par enlever le bruit structurel.

Extensions qui restent defensables :
- **[uBlock Origin](https://ublockorigin.com/)** pour pubs et trackers
- **[Dark Reader](https://darkreader.org/)** si le confort visuel t'aide vraiment
- **[Bitwarden](https://bitwarden.com/)** pour sortir les mots de passe de ta tete et des notes improvisées

Le bon principe : peu d'extensions, mais des extensions qui retirent de la friction au lieu d'en rajouter.

## La couche accès

Le navigateur doit te donner un accès rapide, pas une surface de stockage chaotique.

Règles simples :
- garde seulement 5 à 8 favoris vraiment utiles
- sépare travail et perso par profils
- épingle les outils centraux
- transforme les recherches fréquentes en mots-clés ou raccourcis

Si tu ouvres toujours les mêmes choses pour les mêmes contextes, le problème n'est pas ta mémoire. C'est l'absence de raccourcis.

## La couche onglets

Un onglet ouvert n'est pas un système fiable.

Tu as trois options saines :
- lire maintenant
- sauvegarder dans une vraie couche de lecture ou d'archive
- fermer

Pour les utilisateurs Firefox, **[Tab Stash](https://addons.mozilla.org/en-US/firefox/addon/tab-stash/)** reste une option propre pour vider sans perdre.

## La couche RSS

Le RSS reste le meilleur moyen de suivre le web sans algorithmes.

Il faut simplement mieux choisir l'outil principal.

### Recommandation principale : [Inoreader](https://www.inoreader.com/)

Inoreader est aujourd'hui la recommandation la plus solide si tu veux un vrai lecteur RSS polyvalent :
- lecture web propre
- dossiers, tags et règles
- newsletters et feeds dans le même système
- assez simple pour commencer, assez puissant pour durer

### Alternative très valable : [Feedly](https://feedly.com/news-reader)

Feedly reste excellent si tu veux :
- une interface très accessible
- une expérience plus "reader" que "power user"
- une veille un peu plus professionnelle ensuite

### Feedboard : option secondaire

**[Feedboard](https://feedboard.app/)** existe toujours et peut plaire si tu aimes la logique de dashboard en colonnes. Mais je ne le recommanderais plus comme choix principal pour cette leçon.

## La couche lecture

Quand tu tombes sur un bon contenu, il faut ensuite pouvoir le lire calmement.

Selon ton besoin :
- **RSS reader** pour suivre les sources
- **Reader / read-later** pour lire plus tard
- **bookmark manager** pour archiver

Le mauvais système consiste à tout garder dans les onglets.

## Quel navigateur choisir

Le bon navigateur n'est pas le plus "puissant" sur le papier. C'est celui dans lequel ton système reste simple.

- **[Firefox](https://www.mozilla.org/firefox/)** si tu privilégies la vie privée, les containers et un environnement plus sobre
- **[Vivaldi](https://vivaldi.com/)** si tu veux un navigateur très configurable avec beaucoup d'outils intégrés
- **[Brave](https://brave.com/)** si tu veux du Chromium rapide avec blocage integre et peu de setup

La vraie question est : lequel te permet le moins de bricolage pour obtenir un web calme ?

### Références du chapitre (pour aller plus loin)

<a id="ref-wcag-22"></a>1) **WCAG 2.2 (standard)** — W3C (2023), *Web Content Accessibility Guidelines (WCAG) 2.2* — [W3C TR](https://www.w3.org/TR/WCAG22/)

<a id="ref-wai-understanding-intro"></a>2) **Comprendre WCAG (intro)** — W3C WAI, *Introduction to Understanding WCAG 2.2* — [W3C WAI](https://www.w3.org/WAI/WCAG22/Understanding/intro)

<a id="ref-mdn-understanding-wcag"></a>3) **Guide pratico-technique** — MDN, *Understanding the Web Content Accessibility Guidelines (WCAG)* — [MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Understanding_WCAG)

### Approfondissement des concepts techniques

<a id="concept-wcag"></a>#### WCAG (Web Content Accessibility Guidelines)
WCAG fournit un standard testable pour rendre le contenu web accessible. Même sans objectif “légal”, suivre WCAG réduit la friction de lecture et de navigation et améliore la qualité globale.
Sources : [1](#ref-wcag-22), [2](#ref-wai-understanding-intro)

<a id="concept-pour"></a>#### POUR (Perceptible, Operable, Understandable, Robust)
POUR est une synthèse utile des exigences WCAG : rendre le contenu perceptible, l’interface opérable, le parcours compréhensible, et le tout robuste pour différents appareils et technologies d’assistance.
Source : [1](#ref-wcag-22)

## Workflow recommandé

**Minimaliste** :
- un navigateur bien réglé
- uBlock Origin
- quelques favoris propres
- un lecteur RSS

**Pragmatique** :
- profils séparés
- raccourcis de recherche
- RSS + outil de lecture
- discipline stricte sur les onglets

**Power user calme** :
- Firefox ou Vivaldi
- Inoreader ou Feedly
- couche lecture / archive distincte
- zéro feed natif non choisi

## Règles simples

1. ton navigateur doit ouvrir sur quelque chose de neutre
2. les flux choisis battent les plateformes algorithmiques
3. un onglet n'est pas une note
4. ce que tu utilises souvent doit être à un clic ou une commande

:::note[Exercice pratique]
Pendant une semaine :

1. nettoie ta page d'accueil et tes favoris
2. supprime ou désactive les extensions faibles
3. choisis un lecteur RSS principal
4. force-toi à fermer ou sauvegarder chaque onglet au lieu de l'accumuler
:::
