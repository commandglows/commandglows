---
title: "Automatisation"
description: "Automatise tes tâches répétitives sur Windows avec des macros, scripts et lanceurs"
sidebar:
  label: "Automatisation"
  order: 5
---

> Si tu fais la même chose plus de trois fois, c'est le moment d'automatiser.

## Repérer les bonnes opportunités d'automatisation

Le piège classique, c'est de vouloir automatiser ce qui est impressionnant plutôt que ce qui est réellement coûteux. Une bonne automatisation ne commence pas par un outil. Elle commence par un irritant clair.

Cherche d'abord les tâches qui ont au moins plusieurs de ces caractéristiques :
- elles reviennent souvent
- elles suivent presque toujours les mêmes étapes
- elles te font perdre de l'attention plus que de l'intelligence
- elles génèrent des erreurs quand tu les fais fatigué ou trop vite
- elles te donnent la sensation de faire du travail, alors que tu exécutes surtout une routine<sup>[2](#concept-habit-formation)</sup>

Les meilleurs quick wins sont souvent très simples :
- ouvrir toujours les mêmes apps au début de la journée
- insérer les mêmes réponses ou structures de messages
- renommer des fichiers selon un motif récurrent
- extraire toujours les mêmes champs depuis des emails ou PDF
- naviguer toujours dans la même suite d'écrans pour accomplir une action

Le bon réflexe est donc le suivant :
1. note la tâche répétitive exacte
2. décris ses étapes réelles, pas la version idéalisée
3. demande-toi si elle est stable ou si elle change tout le temps
4. choisis ensuite le bon niveau d'automatisation

Tous les problèmes ne demandent pas le même outil :
- une routine visuelle simple peut commencer avec un enregistreur de macros
- une logique personnelle et durable justifie AutoHotkey
- un workflow web répétitif peut passer par Automa
- un processus métier plus lourd peut relever du RPA<sup>[3](#concept-automation-bias)</sup>

L'objectif n'est pas de "faire de l'automatisation". L'objectif est de retirer du travail mécanique de ton système pour garder ton attention sur ce qui demande vraiment ton jugement.

## Enregistreurs de macros

Le principe est simple : tu enregistres une séquence d'actions (clics, frappes clavier), puis tu la rejoues à volonté. Pas besoin de savoir coder.

### Outils recommandés

| Outil | Complexité | Points forts |
|-------|-----------|-------------|
| **TinyTask** | Très simple | Fichier unique, pas d'installation, idéal pour des macros rapides |
| **Jitbit Macro Recorder** | Moyenne | Interface claire, édition des étapes après enregistrement |
| **Pulover's Macro Creator** | Avancée | Génère du code AutoHotkey, pont vers l'automatisation avancée |

**Cas d'usage typiques** : remplir un formulaire récurrent, renommer des fichiers en série, envoyer un message type, effectuer une routine de tests.

### Limites des enregistreurs

Les macros enregistrées sont fragiles. Si une fenêtre change de position ou si un bouton est déplacé, la macro échoue. Pour des automatisations robustes, il faut passer au scripting.

### Quand une macro suffit, et quand il faut passer au script

Une macro enregistrée suffit très bien si :
- les étapes sont toujours exactement les mêmes
- l'interface change peu
- tu veux un gain rapide sans investissement technique
- l'échec occasionnel n'a pas de coût important

Exemples :
- ouvrir une même série de menus
- faire une petite routine de test
- reproduire une suite de clics très stable

En revanche, il faut passer au script dès que :
- les fenêtres ne sont pas toujours au même endroit
- il faut gérer des conditions ou des variantes
- tu veux lancer plusieurs actions intelligemment, pas seulement rejouer un film
- l'automatisation devient importante pour ton travail réel

Autrement dit :
- la macro enregistrée est un bon point de départ
- le script est le bon outil quand tu veux de la solidité, de la logique et de la longévité

Si tu sens que tu passes ton temps à "réparer" une macro plutôt qu'à gagner du temps grâce à elle, c'est généralement le signal qu'il faut passer à AutoHotkey ou à une autre forme d'automatisation plus robuste.

## AutoHotkey : l'automatisation sans limites

AutoHotkey (AHK) est un langage de scripting conçu pour Windows. Il te permet de créer des raccourcis<sup>[1](#concept-implementation-intentions)</sup>, remapper des touches, automatiser des tâches et même créer des interfaces graphiques.

Ce point est important : **AutoHotkey n'est pas seulement un text expander**. C'est un véritable couteau suisse d'automatisation pour Windows. Si tu veux transformer ton système en atelier sur mesure, c'est probablement l'un des outils les plus puissants à apprendre.

### Exemples concrets

**Remapper une touche :**
```txt
; Transformer Caps Lock en touche Echap
CapsLock::Esc
```

**Créer un raccourci de texte :**
```txt
; Taper "@@" insère ton adresse mail
::@@::ton.email@exemple.com
```

**Lancer une app avec un raccourci :**
```txt
; Win + N ouvre le Bloc-notes
#n::Run, notepad.exe
```

**Raccourci pour un texte multiligne :**
```txt
; Ctrl + Shift + S insère une signature
^+s::
SendInput, Cordialement,{Enter}Ton Nom{Enter}Ton Poste
return
```

### Ce que AutoHotkey peut faire en vrai

Au-delà des hotstrings, AHK peut te servir à :
- créer des **hotkeys** système sur mesure
- **remapper** entièrement ton clavier
- lancer des apps, fichiers, URLs ou recherches
- enchaîner plusieurs actions dans une **macro**
- détecter des fenêtres, changer le focus, envoyer des touches au bon programme
- automatiser du texte, mais aussi des clics, menus, boîtes de dialogue et comportements répétitifs
- afficher de petites **interfaces graphiques** ou boîtes de saisie
- construire des workflows personnels impossibles à obtenir avec les options Windows natives

Autrement dit, AHK peut couvrir :
- le text expansion
- l'automatisation clavier
- les macros de productivité
- une partie du window management
- beaucoup de glue logic entre tes outils

### Par où commencer avec AHK

1. Installe AutoHotkey v2 depuis le site officiel
2. Crée un fichier `.ahk` avec le Bloc-notes
3. Écris ton premier script (commence par un remapping simple)
4. Double-clique sur le fichier pour l'exécuter
5. Place tes scripts essentiels dans le dossier Démarrage pour qu'ils se lancent automatiquement

## Snippet managers : réutiliser ton texte au lieu de le retaper

Un snippet manager n'est pas un clipboard manager. Son but n'est pas de mémoriser ce que tu viens de copier, mais de te permettre d'insérer instantanément des blocs de texte que tu réutilises souvent.

Exemples typiques :
- signatures email
- réponses SAV
- messages de prospection
- prompts IA
- structures de comptes rendus
- liens et ressources fréquentes

La façon la plus simple d'obtenir ce comportement sur Windows est souvent d'utiliser **AutoHotkey** comme expandeur de texte, surtout si tu veux aussi aller plus loin dans l'automatisation.

Exemple :

```txt
; Taper /sig insère une signature complète
::/sig::Cordialement,{Enter}Ton Nom{Enter}CommandGlows
```

Pour des besoins plus avancés, tu peux aussi regarder des outils dédiés comme **Beeftext** ou **PhraseExpress**. L'important est moins l'outil que le réflexe : tout texte que tu retapes souvent devrait probablement devenir un snippet.

### Quel outil choisir ?

| Outil | Meilleur usage | Profil |
|-------|----------------|--------|
| **AutoHotkey** | Snippets + hotkeys + macros + scripts | Utilisateur Windows qui veut un vrai levier long terme |
| **Trigr** | Hotkeys visuels + macros + text expansion | Utilisateur Windows qui veut une passerelle no-code avant le scripting |
| **QuickTextPaste** | Raccourcis texte + lancement rapide de commandes/programmes | Bon compromis si tu veux gagner du temps sans entrer tout de suite dans le scripting |
| **Beeftext** | Text expansion simple, local, open source | Bon choix si tu veux juste des snippets propres sans usine à gaz |
| **PhraseExpress** | Bibliothèque de snippets très avancée, formulaires, déclencheurs multiples, organisation poussée | Plutôt pour profils intensifs ou besoins pro/équipe, avec plus de richesse mais aussi plus de complexité |

**Notre lecture** :
- si tu veux un outil simple et gratuit pour remplacer du texte partout, **Beeftext** est très propre
- si tu veux combiner hotkeys visuels, macros et text expansion sans écrire de scripts tout de suite, **Trigr** mérite un test comme passerelle no-code récente
- si tu veux aussi attacher certains snippets à des raccourcis clavier ou lancer quelques actions simples sans écrire de scripts, **QuickTextPaste** est une bonne passerelle
- si tu veux un système riche de templates et de fonctions avancées, **PhraseExpress** est extrêmement puissant
- si tu veux apprendre un outil qui déborde largement le text expansion, **AutoHotkey** a le plus fort potentiel de levier

Trigr est surtout intéressant quand tu n'es pas encore prêt à maintenir des scripts AutoHotkey, mais que tu ressens déjà le besoin de plusieurs couches à la fois : hotkeys globales, macros simples et textes réutilisables. Traite-le comme un outil à évaluer, pas comme un remplacement de la méthode. La vraie question reste la même : quelle action répétée coûte assez d'attention pour mériter un déclencheur ?

## Automatisation navigateur

### Automa

Automa est une extension navigateur qui te permet d'automatiser des workflows web via une interface visuelle par blocs. Pas de code nécessaire.

**Ce que tu peux faire :**
- Remplir des formulaires automatiquement
- Extraire des données de pages web (scraping léger)
- Enchaîner des actions sur plusieurs pages
- Planifier des exécutions récurrentes

### Browser Automation Studio (BAS)

BAS est plus puissant qu'Automa mais aussi plus complexe. Il gère les proxies, les profils multiples et les scénarios avancés. À réserver aux cas où Automa ne suffit plus.

### Parsio

Parsio est utile quand ton vrai problème n'est plus "ouvrir un email", mais **extraire toujours les mêmes informations** de messages, pièces jointes ou documents.

Cas typiques :
- récupérer automatiquement des données depuis des confirmations de commande
- extraire des champs depuis des PDF reçus par email
- envoyer ensuite ces données vers Google Sheets, Zapier, Make ou un autre workflow

Ce n'est pas un outil de focus. C'est un outil de suppression du travail manuel répétitif. Et c'est précisément pour cela qu'il a de la valeur : chaque copier-coller administratif évité te rend du temps et de l'attention.

## Lanceurs d'applications

Ouvrir une app en passant par le menu Démarrer, c'est lent. Un lanceur te permet de taper quelques lettres et de lancer n'importe quoi instantanément.

### Comparatif des lanceurs

| Lanceur | Vitesse | Fonctions extras | Open-source |
|---------|---------|-----------------|-------------|
| **Flow Launcher** | Rapide | Plugins, calculatrice, recherche web | Oui |
| **Listary** | Très rapide | Intégration Explorateur, recherche fichiers | Non (freemium) |
| **Wox** | Rapide | Plugins, thèmes | Oui |
| **PowerToys Run** | Rapide | Intégré à PowerToys, pas d'installation séparée | Oui |

**Notre recommandation** : Flow Launcher pour sa communauté active et ses plugins, ou PowerToys Run si tu utilises déjà PowerToys.

### Comment choisir ton lanceur

Tous les lanceurs ne répondent pas au même besoin :
- **Flow Launcher** : le meilleur point d'entrée si tu veux un lanceur moderne, extensible et encore vivant
- **PowerToys Run** : très bon choix si tu veux quelque chose de simple, propre et déjà intégré à ton setup Windows
- **Listary** : particulièrement intéressant si ton vrai problème est moins le lancement d'apps que la navigation rapide dans les fichiers et l'Explorateur

Tu peux aussi rencontrer des outils plus anciens comme **Wox** ou **Find and Run Robot**. Ils restent intéressants à connaître comme références ou alternatives secondaires, mais nous ne les mettons pas au centre du cours :
- **Wox** a compté historiquement, mais il est aujourd'hui moins convaincant face à Flow Launcher
- **Find and Run Robot** reste un bon vieux lanceur pour certains power users, mais c'est davantage un outil vétéran qu'une recommandation premium moderne

### Raccourci universel

Configure ton lanceur sur `Alt + Espace`. C'est le standard de facto. Tu appuies, tu tapes, tu valides — trois gestes pour ouvrir n'importe quoi.

### Penser en séquences de lancement, pas seulement en apps isolées

Le vrai gain ne vient pas seulement du fait d'ouvrir une application plus vite. Il vient du fait de **reconstituer un contexte de travail complet** en quelques secondes.

Exemples de séquences utiles :
- **Routine du matin** : email, calendrier, tâches, note du jour
- **Session d'écriture** : éditeur, navigateur minimal, musique, dossier projet
- **Session client** : CRM, drive, messagerie, réunion, note de suivi
- **Session veille** : navigateur avec bons onglets, lecteur différé, outil de capture

À partir du moment où tu ouvres souvent le même ensemble d'outils, tu ne devrais plus le reconstruire manuellement tous les jours.

Tu peux lancer ce type de séquence de plusieurs façons :
- avec un launcher et quelques favoris bien pensés
- avec un script AutoHotkey
- avec des raccourcis vers des dossiers, pages web ou apps spécifiques
- avec un navigateur capable d'ouvrir un workspace ou une session préparée

Le principe à retenir est simple : plus ton démarrage de session est propre, plus tu réduis la friction d'entrée dans le vrai travail.

## Lancer des programmes au démarrage

Pour qu'un programme ou un script se lance automatiquement :

1. Appuie sur `Win + R`, tape `shell:startup`, valide
2. Colle un **raccourci** (pas le fichier original) de ton programme dans ce dossier
3. C'est tout. Au prochain démarrage, il sera lancé automatiquement.

Pour la gestion plus fine des applications qui se lancent au démarrage, vois aussi le chapitre [Ergonomie](./ergonomie), qui couvre le tri des apps de boot via le Gestionnaire des tâches.

## Introduction au RPA

Le RPA (Robotic Process Automation) pousse l'automatisation au niveau professionnel. Au lieu d'automatiser une seule tâche, tu automatises des processus entiers.

**OpenIAP** est une plateforme open-source de RPA qui permet de :
- Orchestrer des workflows entre plusieurs applications
- Gérer des files d'attente de tâches
- Intégrer des robots logiciels avec des APIs

C'est un sujet avancé, mais si tu travailles avec des processus répétitifs à grande échelle, ça vaut le détour.

## Ressources officielles

- [AutoHotkey](https://www.autohotkey.com/) - le socle pour les hotkeys, hotstrings et scripts Windows.
- [Trigr](https://usetrigr.com/) - outil Windows positionné sur les hotkeys visuels, les macros et le text expansion sans scripting.
- [QuickTextPaste](https://www.softwareok.com/?seite=Microsoft/QuickTextPaste) - le petit outil léger pour coller du texte ou lancer des commandes via raccourci.
- [Beeftext](https://beeftext.org/) - une solution simple et locale pour le text expansion.
- [PhraseExpress](https://www.phraseexpress.com/) - une bibliothèque de snippets plus avancée pour les usages intensifs.
- [Flow Launcher](https://www.flowlauncher.com/) - le lanceur recommandé pour aller vite au clavier.
- [Microsoft PowerToys](https://github.com/microsoft/PowerToys) - utile si tu veux aussi PowerToys Run dans le même outil.
- [Listary](https://www.listary.com/) - très bon si tu navigues beaucoup dans l'Explorateur et les fichiers.
- [Wox](https://github.com/Wox-launcher/Wox) - alternative historique aujourd'hui plutôt secondaire.
- [Find and Run Robot](https://www.donationcoder.com/Software/Mouser/findrun/index.html) - lanceur vétéran encore intéressant pour certains profils avancés.

## Références du chapitre (pour aller plus loin)

<a id="ref-implementation-intentions"></a>1) **Implementation intentions (plans “si-alors”)** — Peter M. Gollwitzer (1999), *Implementation intentions: Strong effects of simple plans* — [American Psychologist, APA](https://psycnet.apa.org/record/1999-10179-001)

<a id="ref-habit-formation"></a>2) **Formation d’habitudes (habit formation)** — Phillippa Lally et al. (2010), *How are habits formed: Modelling habit formation in the real world* — [European Journal of Social Psychology, Wiley](https://onlinelibrary.wiley.com/doi/10.1002/ejsp.674)

<a id="ref-automation-misuse"></a>3) **Automatisation: misuse / disuse / complacency** — Raja Parasuraman & Victor Riley (1997), *Humans and Automation: Use, Misuse, Disuse, Abuse* — [Human Factors](https://journals.sagepub.com/doi/10.1518/001872097778543886)

<a id="ref-autohotkey-docs"></a>4) **AutoHotkey (documentation officielle)** — [AutoHotkey Documentation](https://www.autohotkey.com/docs/)

<a id="ref-windows-startup-folder"></a>5) **Démarrage automatique (Startup folder)** — Microsoft Support — [Add an app to run automatically at startup in Windows](https://support.microsoft.com/windows/add-an-app-to-run-automatically-at-startup-in-windows-0f7b75b5-62c5-4a4f-a8c4-1c8f24321d86)

## Approfondissement des concepts techniques

<a id="concept-implementation-intentions"></a>#### Implementation intentions (hotkeys, règles, déclencheurs)
Les plans “si-alors” (ex: “si j’ouvre un projet, alors je lance tel set d’apps”) transforment une intention vague en déclencheur concret. C’est exactement la logique des raccourcis, hotstrings, routines de démarrage et automatisations légères.
Source scientifique : [1](#ref-implementation-intentions)

<a id="concept-habit-formation"></a>#### Formation d’habitudes (routines)
Quand une séquence est stable et répétée, elle devient plus automatique et coûte moins d’effort. L’automatisation a souvent le plus d’impact quand elle “stabilise” une routine qui revient réellement.
Source scientifique : [2](#ref-habit-formation)

<a id="concept-automation-bias"></a>#### Automation bias / complacency (RPA)
Plus une automatisation paraît fiable, plus on peut relâcher sa vigilance (surveillance moindre, détection d’erreur plus tardive). En RPA, la bonne pratique est de garder des garde-fous: logs, contrôles, et points d’arrêt.
Source scientifique : [3](#ref-automation-misuse)
