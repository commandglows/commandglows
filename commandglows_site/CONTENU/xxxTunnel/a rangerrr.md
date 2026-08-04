---
tags: Rédaction
u_interne: ""
u_externe: ""
datePublié: ""
imageNameKey: ""
_priorité: ""
---
![](vivaldi_TbpHTDNUYp.png)
learn touch typing https://www.youtube.com/watch?v=QjQv7poplVc
[Learn Touch Typing Free - TypingClub](https://www.typingclub.com/)
[Touch Typing Practice Online](https://www.typingstudy.com/)
[Typing Lessons - Learn To Type And Improve Typing Speed Free - Typing.com](https://www.typing.com/student/lessons)

A note on being in the flow state: While knowing how to get into the zone is important and an awesome feeling, knowing when to NOT being in the zone is equally as important. Think of it this way: The flow state is you thinking in complete and perfect intuition. No reflective thinking, no outside influence, no intrusive thoughts, just putting code to the virtual paper. This is GREAT for solving logical problems and generally doing anything that you can do *intuitively*. However, in programming, there's also domains where intuition is a horrible guide. Implementation planning, prototyping and structural design benefit greatly from reflective/rational thinking, which is basically turned off when you're in flow state. For anyone who's interested in the topic, "Thinking Fast and Slow" by Daniel Kahneman is a great book (and a must read in my opinion) that explores this topic in great detail.

minialist phone app
[HabitLab - Chrome Web Store](https://chromewebstore.google.com/detail/habitlab/obghclocpdgcekcognpkblghkedcpdgd)
![](Pasted%20image%2020250203162815.png)

[Speechify Text to Speech Voice Reader - Chrome Web Store](https://chromewebstore.google.com/detail/speechify-text-to-speech/ljflmlehinmoeknoonhibbjpldiijjmm)

[Vocal | AppSumo](https://appsumo.com/products/marketplace-vocal/)

[FocusFox - Chrome Web Store](https://chromewebstore.google.com/detail/focusfox/knbdgliejcpphfbehgoannkgphpbmncj)

# Fabric - Un framework open source pour travailler main dans la main avec l'IA

Depuis que l’IA a débarqué dans nos vies, il est maintenant possible de lui déléguer une grande partie de nos tâches fastidieuses et chronophages, ce qui nous permet de nous concentrer sur l’essentiel. Des outils comme ChatGPT ont évidemment démocratisé l’accès à cette technologie, mais ses capacités vont bien au-delà d’un simple agent conversationnel.

En effet, l’IA peut devenir un véritable assistant personnel pour booster à la fois notre **créativité** et notre **productivité**. Perso, je ne peux plus m’en passer, et que vous soyez développeur, designer, écrivain ou entrepreneur, il existe de nombreuses façons de l’intégrer dans vos workflows. Génération de code, création de visuels, rédaction et correction de texte, analyse de données, relecture de contrats, automatisation de tâches… La liste est infinie pour peu que vous ayez un peu d’imagination.

C’est là qu’entre en scène le projet open-source [Fabric](https://github.com/danielmiessler/fabric) qui permet justement de créer des workflows basés sur l’IA totalement sur-mesure en combinant différents modèles et différentes APIs. Comme ça vous pourrez concevoir vos propres assistants adaptés à vos propres besoins.

Concrètement, Fabric fonctionne comme un framework avec différents composants réutilisables :

- Des **Patterns** qui sont des templates de prompts répondant à un besoin précis (ex : résumer un article, extraire les idées clés d’une vidéo, etc).
- Des **Stitches** qui permettent d’enchaîner plusieurs Patterns pour créer des workflows avancés.
- Un serveur central appelé **Mill** qui héberge et sert les Patterns.
- Des apps clientes appelées **Looms** qui invoquent les Patterns via des APIs.

Plutôt que d’utiliser des services IA fermés, Fabric vous donne le contrôle total sur vos workflows. Comme ça, vous pouvez héberger vous-même les différents composants et garder vos données en local. Le tout étant bien sûr basé sur des standards ouverts et interopérables.

  
L’idée pour les gens derrière Fabric, c’est de rendre l’intégration de l’IA aussi simple que l’utilisation de commandes Unix. Par exemple, pour résumer le contenu d’une page web avec l’IA, il vous suffit de chaîner les deux commandes suivantes :

`curl https://example.com | fabric --pattern summarize`

Vous pouvez même créer des aliases pour vos patterns les plus utilisés. Par exemple pour analyser un article :

`alias analyze="fabric --pattern analyze" cat article.txt | analyze`

Bien sûr, tout ceci nécessite un peu de pratique et de changements dans vos habitudes de travail mais une fois les bons réflexes pris, le gain de temps sera considérable.

Certains craignent que l’IA nous mette tous au chomage mais je pense au contraire qu’elle va surtout nous aider à torcher rapidement les tâches ingrates pour nous permettre d’être plus créatifs et de bosser sur les sujets de fond avec plus de valeur ajoutée.

Si ça vous dit d’essayer Fabric, [la doc est ici.](https://github.com/danielmiessler/fabric)
# Gum - Un outil pour écrire des scripts en un clin d'oeil

Voici un outil fantastique nommé **Gum** qui va vous permettre d’écrire des scripts Shell et de gérer vos _dotfiles_ en quelques lignes de code seulement, et après l’avoir testé, je suis sûr que vous ne pourrez plus vous en passer.

Voici un exemple de ce qu’il est possible de faire avec Gum :

![](https://korben.info/decouvrez-gum-outil-ecrire-scripts-dotfiles/68747470733a2f2f73747566662e636861726d2e73682f67756d2f64656d6f2e676966.gif)

Et voici le code associé :

```bash
#!/bin/bash

gum style --border normal --margin "1" --padding "1 2" --border-foreground 212 "Hello, there! Welcome to $(gum style --foreground 212 'Gum')."
NAME=$(gum input --placeholder "What is your name?")

echo -e "Well, it is nice to meet you, $(gum style --foreground 212 "$NAME")."

sleep 2; clear

echo -e "Can you tell me a $(gum style --italic --foreground 99 'secret')?\n"

gum write --placeholder "I'll keep it to myself, I promise!" > /dev/null # we keep the secret to ourselves

clear; echo "What should I do with this information?"; sleep 1

READ="Read"; THINK="Think"; DISCARD="Discard"
ACTIONS=$(gum choose --cursor-prefix "[ ] " --selected-prefix "[✓] " --no-limit "$READ" "$THINK" "$DISCARD")

clear; echo "One moment, please."

grep -q "$READ" <<< "$ACTIONS" && gum spin -s line --title "Reading the secret..." -- sleep 1
grep -q "$THINK" <<< "$ACTIONS" && gum spin -s pulse --title "Thinking about your secret..." -- sleep 1
grep -q "$DISCARD" <<< "$ACTIONS" && gum spin -s monkey --title " Discarding your secret..." -- sleep 2

sleep 1; clear

echo "What's your favorite $(gum style --foreground 212 "Gum") flavor?"
GUM=$(echo -e "Cherry\nGrape\nLime\nOrange" | gum filter)
echo "I'll keep that in mind!"

sleep 1; clear

echo "Do you like $(gum style --foreground "#04B575" "Bubble Gum?")"
sleep 1

CHOICE=$(gum choose --item.foreground 250 "Yes" "No" "It's complicated")

[[ "$CHOICE" == "Yes" ]] && echo "I thought so, $(gum style --bold "Bubble Gum") is the best." || echo "I'm sorry to hear that."

sleep 1

gum spin --title "Chewing some $(gum style --foreground "#04B575" "$GUM") bubble gum..." -- sleep 5

clear

NICE_MEETING_YOU=$(gum style --height 5 --width 25 --padding '1 3' --border double --border-foreground 57 "Well, it was nice meeting you, $(gum style --foreground 212 "$NAME"). Hope to see you soon!")
CHEW_BUBBLE_GUM=$(gum style --width 25 --padding '1 3' --border double --border-foreground 212 "Don't forget to chew some $(gum style --foreground "#04B575" "$GUM") bubble gum.")
gum join --horizontal "$NICE_MEETING_YOU" "$CHEW_BUBBLE_GUM"
```

Pour l’installer, vous pouvez le faire soit avec un gestionnaire de paquets ou en le téléchargeant directement. Des **packages** sont d’ailleurs disponibles pour Debian, RPM et Alpine, ainsi que des **binaires** pour Linux, macOS (_brew install gum_), Windows (_scoop install charm-gum_), FreeBSD, OpenBSD et NetBSD.

Et si vous préférez, vous pouvez même l’installer à l’aide de Go. Personnellement, j’adore le côté flexible de Gum : il peut être intégré dans des scripts et adapté à votre convenance grâce aux options de configuration et aux variables d’environnement, ce qui vous permet par exemple de personnaliser la couleur du curseur ou la largeur de l’affichage.

La [documentation](https://github.com/charmbracelet/gum) est très complète à ce sujet.

Ainsi, la commande “`gum input`” permet de demander une entrée à l’utilisateur, tandis que “`gum write`” fonctionne pour une entrée multi-ligne.

Envie de filtrer une liste de valeurs en utilisant la correspondance floue ? Gum est là pour ça avec “`gum filter`”. Et si vous avez besoin d’aide pour choisir une option à partir d’une liste de choix, “`gum choose`” sera votre meilleur allié.

Même la commande “`gum confirm`” rend la vie plus simple en demandant si une action doit être effectuée ou non. J’apprécie également énormément l’option “`gum file`”, qui me permet de sélectionner un fichier directement depuis l’arborescence des fichiers, et la commande “`gum spin`” ne manque pas de me rappeler que Gum travaille fort fort fort pour moi en affichant un _spinner_ (vous savez, le petit cercle qui tourne pour vous faire patienter) pendant qu’une commande ou un script s’exécute.

Voici un autre exemple de code :

```bash
#!/bin/sh
TYPE=$(gum choose "fix" "feat" "docs" "style" "refactor" "test" "chore" "revert")
SCOPE=$(gum input --placeholder "scope")

# Since the scope is optional, wrap it in parentheses if it has a value.
test -n "$SCOPE" && SCOPE="($SCOPE)"

# Pre-populate the input with the type(scope): so that the user may change it
SUMMARY=$(gum input --value "$TYPE$SCOPE: " --placeholder "Summary of this change")
DESCRIPTION=$(gum write --placeholder "Details of this change (CTRL+D to finish)")

# Commit these changes
gum confirm "Commit changes?" && git commit -m "$SUMMARY" -m "$DESCRIPTION"
```

Et le rendu dans le terminal :

![](https://korben.info/decouvrez-gum-outil-ecrire-scripts-dotfiles/68747470733a2f2f73747566662e636861726d2e73682f67756d2f636f6d6d69745f322e676966.gif)

Outre ces commandes de base, Gum propose également une panoplie d’options pour s’adapter à vos besoins spécifiques. Les différents types de _spinner_ incluent ligne, point, minidot, saut, impulsion, points, globe, lune, un singe (!), mètre et même un hamburger. La commande de tableau est très pratique pour sélectionner des données tabulaires, tandis que le style et la mise en page sont personnalisables à loisir pour combiner texte de manière verticale ou horizontale, ou encore pour traiter et formater les paragraphes. Pour plus d’informations sur les modèles, pensez encore une fois à consulter la documentation.

Mais ce qui fait vraiment la force de Gum, c’est sa capacité à être intégré à diverses tâches du quotidien. Qui n’a jamais souhaité écrire un message de commit en un instant, ouvrir des fichiers dans son éditeur de texte préféré, se connecter à une session TMUX, sélectionner un hash de commit dans son historique Git, choisir des mots de passe avec [Skate](https://github.com/charmbracelet/skate), ou encore supprimer des branches en deux temps trois mouvements ?

Un tour d’horizon des [exemples](https://github.com/charmbracelet/gum/tree/main/examples) du répertoire Gum vous convaincra d’autant plus de l’intérêt de cet outil.

[Gum est à découvrir ici !](https://github.com/charmbracelet/gum)
# TranslucentTB - Donnez un nouveau style à votre barre Windows


Envie de donner un petit coup de fraîcheur à votre interface Windows sans avoir à vendre un rein ? Alors voici une petite merveille qui va relooker gratuitement votre barre des tâches.

**[TranslucentTB](https://apps.microsoft.com/detail/9pf4kz2vn4w9?hl=en-US&gl=FR)**, c’est un utilitaire minimaliste qui ne consomme que quelques mégaoctets de RAM et pratiquement aucun CPU et va vous permettre de personnaliser l’apparence de votre barre des tâches avec une panoplie d’effets visuels dignes des meilleures interfaces science-fiction des années 80.

Commençons par explorer les différents états disponibles pour votre barre des tâches :

- **Normal** : Le look Windows classique, comme si rien ne s’était passé (mais qui veut ça, franchement ?)
- **Opaque** : Une barre teintée sans transparence, parfaite pour les puristes
- **Clear** : Une barre légèrement teintée avec un effet de transparence subtil
- **Blur** : Un effet de flou élégant (exclusif à Windows 10 et Windows 11 build 22000)
- **Acrylic** : L’effet star inspiré du Fluent Design de Microsoft, qui donne un aspect moderne et sophistiqué

![](https://korben.info/translucenttb-personnalisation-barre-taches-windows/SCR-20241213-noqb-1024x256.webp)

Mais ce n’est pas tout ! TranslucentTB propose également des modes dynamiques qui s’adaptent à votre utilisation :

- Changement d’apparence quand une fenêtre est visible
- Transformation automatique lors de la maximisation d’une fenêtre
- Effets spéciaux à l’ouverture du menu Démarrer
- Personnalisation lors de l’utilisation de la recherche
- Animation spéciale pour le mode Task View

Le **sélecteur de couleurs avancé** intégré mérite une standing ovation. Non seulement il propose une prévisualisation en temps réel (fini les mauvaises surprises), mais il permet aussi de jouer avec l’opacité pour obtenir exactement l’effet souhaité.

![](https://korben.info/translucenttb-personnalisation-barre-taches-windows/SCR-20241213-npod-1024x365.webp)

TranslucentTB fait ami-ami avec d’autres outils de personnalisation populaires comme **RoundedTB** et **ExplorerPatcher** et l’installation est aussi simple qu’un clic sur le Microsoft Store. Et si vous êtes plus du genre à fuir le Store comme la peste, pas de panique : une version portable est disponible sur [GitHub](https://github.com/TranslucentTB/TranslucentTB).

Pour le démarrage automatique, il suffit de cocher l’option “Open at boot” dans le menu contextuel. Si jamais cette option fait sa rebelle et reste grisée, voici un petit tour de magie avec le registre Windows :

```fallback
Windows Registry Editor Version 5.00
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System]
"EnableFullTrustStartupTasks"=dword:00000002
"EnableUwpStartupTasks"=dword:00000002
"SupportFullTrustStartupTasks"=dword:00000001
"SupportUwpStartupTasks"=dword:00000001
```

![](https://korben.info/translucenttb-personnalisation-barre-taches-windows/SCR-20241213-nplr-1024x384.webp)

Certains antivirus un peu trop zélés pourraient lever un sourcil suspicieux face à TranslucentTB. Mais rassurez-vous : avec plus de 10 millions de téléchargements et un code source ouvert examiné par la communauté, vous pouvez dormir sur vos deux oreilles.

TranslucentTB est la preuve qu’on peut faire des merveilles avec peu de ressources. C’est l’accessoire parfait pour donner un coup de jeune à votre Windows sans avoir besoin d’un doctorat en informatique. Simple, léger et terriblement efficace : que demander de plus ?

Merci à Lorenper pour nous avoir fait découvrir cette perle rare !

[Découvrez TranslucentTB](https://translucenttb.github.io/)

[Source](https://translucenttb.github.io/)
# Homedale - L'outil qu'il vous faut pour analyser les réseaux Wi-Fi

Le 27 décembre 2023par Korben -

1. [Outils-Services](https://korben.info/categories/outils-services/ "Voir tous les articles de la catégorie Outils-Services")
2. [Logiciels-Utiles](https://korben.info/categories/outils-services/logiciels-utiles/ "Voir tous les articles de la sous-catégorie Logiciels-Utiles")

Si vous cherchez un moyen simple et agréable d’analyser la qualité des réseaux Wi-Fi autour de vous, afin d’améliorer votre connexion ou tout simplement leur portée en les déplaçant, j’ai l’outil qu’il vous faut.

Cela s’appelle Homedale, et c’est un freeware (gratuit donc) disponible pour macOS et Windows que [vous pouvez récupérer ici](https://www.the-sz.com/products/homedale/). Une fois lancé, il scanne l’ensemble des réseaux Wi-Fi qui vous entourent et affiche la force de leur signal. Ensuite, pour chacun des réseaux Wi-Fi détectés, Homedale fournit une multitude d’informations utiles.

![](https://korben.info/analyse-reseaux-wifi-avec-homedale-outil-indispensable/SCR-20231208-jjn-copie-6-1024x538.webp)

Non seulement vous verrez la force du signal exprimée en dBm (unité mesurant la puissance du signal Wi-Fi en décibels par rapport à un milliwatt, où des valeurs plus élevées indiquent un signal plus fort), mais l’application affiche également d’autres données pertinentes telles que le canal utilisé par chaque réseau, ce qui est crucial pour éviter par exemple les interférences avec le Wi-Fi des voisins.

![](https://korben.info/analyse-reseaux-wifi-avec-homedale-outil-indispensable/SCR-20231208-jk9-copie-4-1024x538.webp)

Une autre caractéristique notable de Homedale est sa capacité à vous montrer les normes Wi-Fi (comme 802.11g, 802.11n, etc.) utilisées par chaque réseau. Cette information est particulièrement utile pour identifier les réseaux qui pourraient nécessiter une mise à jour matériel pour améliorer les performances. Vous pourrez également voir un graphique en temps réel de la force du signal, ce qui est extrêmement utile pour déplacer physiquement votre routeur ou votre appareil afin d’obtenir la meilleure réception possible.

![](https://korben.info/analyse-reseaux-wifi-avec-homedale-outil-indispensable/SCR-20231208-jm0-copie-5-1024x538.webp)

De plus, vous apprécierez la possibilité d’exporter les données collectées sous forme de fichier CSV pour une analyse plus approfondie avec vos propres outils. Homedale est également équipé d’une fonctionnalité de géolocalisation qui, lorsque disponible, peut vous aider à localiser physiquement les réseaux Wi-Fi sur une carte. Cela peut être particulièrement intéressant pour les professionnels effectuant des audits de réseau ou pour ceux qui cherchent simplement à optimiser la couverture Wi-Fi dans de grands espaces.

Bref, si ça vous dit d’essayer, [Homedale c’est par ici](https://www.the-sz.com/products/homedale/).
# Hack - La police conçue pour le code source

Le 13 février 2024par Korben -

1. [Developpement](https://korben.info/categories/developpement/ "Voir tous les articles de la catégorie Developpement")
2. [Outils-Dev](https://korben.info/categories/developpement/outils-dev/ "Voir tous les articles de la sous-catégorie Outils-Dev")

Y’a pas si longtemps, je vous ai présenté la police de caractères [Luciole](https://korben.info/luciole-police-caracteres-accessible-malvoyants.html) qui permet de donner beaucoup de lisibilités aux personnes mal voyantes.

Et bien dans le même esprit, je vous fais découvrir aujourd’hui **Hack**. Cette police de caractère libre au nom dénué d’originalité a été conçue pour soulager les petits neuneuils des développeurs qui aiment coder jusqu’au bout de la nuit. Hack intègre des versions gras, italique, regular…etc. avec un support de toutes les langues et tous les glyphes possibles y compris le cyrillique, le grec…etc.

![](https://korben.info/police-de-caractere-hack-optimisee-pour-le-code-source/SCR-20240115-kfh-1024x737.webp)

Son design améliore la lisibilité du code, avec du contraste, une bonne hauteur des lettres, un zéro rempli pour ne pas le confondre avec le 0 majuscule, un bon espacement…etc. Tout est dans la subtilité, ça se touche beaucoup la nouille typographique, mais vous devriez quand même l’essayer, car ça ne peut être que plus confortable que ce bon vieil Arial que vous collez partout.

![](https://korben.info/police-de-caractere-hack-optimisee-pour-le-code-source/SCR-20240115-ki3.webp)

Vous pouvez [la télécharger ici](https://sourcefoundry.org/hack/) et même la tester [dans le playground ici](https://sourcefoundry.org/hack/playground.html) selon votre langage de dev préféré et le style de votre IDE (mode sombre, clair…etc.)

# Dopez Windows 11 avec BloatyNosy Nue

Le 28 novembre 2024par Korben -

1. [Tutoriels-Diy](https://korben.info/categories/tutoriels-diy/ "Voir tous les articles de la catégorie Tutoriels-Diy")
2. [Optimisation-Systeme](https://korben.info/categories/tutoriels-diy/optimisation-systeme/ "Voir tous les articles de la sous-catégorie Optimisation-Systeme")

Vous venez d’installer le tout nouveau Windows 11, et vous vous dites que COMÊME (lol) ça pourrait être mieux sans toutes ces applications de merde pré-installées par Microsoft qui bouffe de la mémoire en arrière-plan.

Pas de stress les cousin(e)s, aujourd’hui je vais vous présenter **BloatyNosy Nue**, l’outil qui va sauver votre journée et transformer votre PC en un véritable paradis !

BloatyNosy c’est le super-héros qui simplifie tout le paramétrage de Windows 11 en les regroupant au sein de la même interface. Comme ça, clic clic clic, vous allez pouvoir désactiver et supprimer les fonctionnalités inutiles en un instant !

![](https://korben.info/domptez-windows-11-avec-bloatynosy/SCR-20240217-grg.webp)

Mais alors, qu’est-ce qui rend cette nouvelle version si spéciale ? Hé bien figurez-vous que BloatyNosy est revenu à ses racines, en mode plus léger, plus efficace et plus rapide que jamais ! Fini les trucs compliqués, on revient aux basiques avec une simple application .exe que n’importe qui peut comprendre.

Cette nouvelle version, baptisée “Nue” (et pas “New”, petit clin d’œil des devs 😉), reprend là où la version 0.85 s’était arrêtée, mais avec une toute nouvelle interface qui déchire. Et devinez quoi ? Elle fonctionne aussi bien sur Windows 11 que sur Windows 10 (même si certains paramètres ne sont disponibles que pour Windows 11).

- **Du natif pur jus** : Fini les applications web qui rament, on est sur du solide !
- **Retour aux sources** : Efficace et ultra simple à utiliser
- **Zéro prise de tête** : Pas d’IA ni de Copilot qui viennent foutre le bordel
- **Focus sur l’essentiel** : Que ce dont vous avez vraiment besoin, rien de plus

Et ce n’est pas fini ! L’équipe nous prépare des traductions dans plein de langues différentes pour que tout le monde puisse en profiter. D’ailleurs, si vous avez des idées de fonctionnalités que vous aimeriez retrouver de l’ancien BloatyNosy, n’hésitez pas à les proposer !

Pour débuter avec BloatyNosy Nue, rien de plus simple : après l’avoir installé, laissez-vous guider par l’interface ultra intuitive pour personnaliser votre système comme vous le voulez. Que vous préfériez tout gérer vous-même ou laisser l’application faire le boulot, BloatyNosy s’adapte à votre style !

Vous pouvez télécharger BloatyNosy Nue directement depuis [la page GitHub officielle](https://github.com/builtbybel/Bloatynosy). C’est gratuit, c’est open source, et c’est fait avec amour pour la communauté !

Un grand merci à Lorenper pour sa contribution à cet article !

_Article initialement publié le 2 juillet 2023 et mis à jour le 28 novembre 2024_.

# Éliminez les publicités de Windows 11 avec OFGB (Oh Frick Go Back)

Le 2 mai 2024par Korben -

1. [Outils-Services](https://korben.info/categories/outils-services/ "Voir tous les articles de la catégorie Outils-Services")
2. [Logiciels-Utiles](https://korben.info/categories/outils-services/logiciels-utiles/ "Voir tous les articles de la sous-catégorie Logiciels-Utiles")

Vous savez, ce bon vieux **Windows 11**, c’est vraiment un super OS ^^… Mais ces satanées pubs qui s’incrustent partout, ça commence à être bien relou. Vous ouvrez le menu Démarrer pour lancer un programme, et PAF ! Une pub sauvage apparaît ! Vous farfouillez dans l’explorateur de fichiers, et re-PAF ! Encore une pub ! C’est à se taper la tête contre les murs (non, ne faites pas ça ^^).

Mais attendez, ne sortez pas encore vos tronçonneuses pour détruire de rage votre PC car je vous ai dégoté un petit outil qui va nous sortir de cette misère : **OFGB**, pour “Oh Frick Go Back”.

Ce p’tit logiciel magique, c’est la solution qui va exaucer votre vœu de retrouver un Windows tout beau, tout propre, sans pubs qui viennent vous casser les bonbons. Et en plus, c’est gratuit et open-source !

Avec OFGB, on peut donc virer les pubs qui pullulent un peu partout :

- Les “suggestions” lourdingues dans le menu Démarrer ✅
- Les conseils pas si “Life-Changing” que ça dans les paramètres ✅
- Les pubs qui squattent l’écran de verrouillage ✅
- Et même ces satanés “conseils” dans l’explorateur de fichiers ✅

Bref, ce truc est une vraie cure de détox pour Windows !

Alors comment faire ? Et bien vous allez sur le GitHub [du projet juste ici](https://github.com/xM4ddy/OFGB/releases/tag/v0.2), vous téléchargez le .exe qui va bien et vous lancez “OFGB-Deps.exe” (si Windows râle avec un message chelou, dites-lui d’aller se faire cuire un œuf et cliquez sur “Exécuter quand même”)

Et là, la magie opèrera ! Vous aurez une interface toute simple avec des cases à cocher pour activer/désactiver les différentes options publicitaires.

![](https://korben.info/eliminez-publicites-windows-11-avec-ofgb/68747470733a2f2f692e6962622e636f2f5034795866586e2f6f666762462e706e67.webp)

Et si un jour Microsoft décide de rajouter de nouvelles pubs dans des endroits encore inexplorés de Windows, y’a des chances que le développeur d’OFGB (un certain xMaddy, qui a l’air bien sympathique) mette à jour son bébé pour contrer ces nouvelles invasions publicitaires.

Ah et j’oubliais, vu qu’OFGB est open-source, si vous avez des compétences en développement et que vous voulez mettre la main à la pâte pour améliorer le machin, y’a moyen de contribuer !

	[Source](https://twitter.com/nixcraft/status/1786042010769760367)

# SoundSwitch - Un switcher audio super rapide pour Windows

Le 14 juillet 2023par Korben -

1. [Outils-Services](https://korben.info/categories/outils-services/ "Voir tous les articles de la catégorie Outils-Services")
2. [Logiciels-Utiles](https://korben.info/categories/outils-services/logiciels-utiles/ "Voir tous les articles de la sous-catégorie Logiciels-Utiles")

Il y a quelque temps, j’ai découvert un programme qui risque de changer votre vie en tant qu’utilisateur Windows. Cela s’appelle SoundSwitch et c’est un petit outil magique qui permet de passer rapidement d’un périphérique audio à un autre à l’aide de raccourcis clavier.

Pour activer SoundSwitch, il suffit d’utiliser le raccourci par défaut. Plus besoin de naviguer à travers plusieurs écrans pénibles pour modifier vos paramètres audio.

Après avoir configuré SoundSwitch, vous pouvez donc utiliser les touches de raccourci suivantes :

🔊 Pour faire défiler les appareils de lecture, appuyez sur **Ctrl + Alt + F11** ou double-cliquez sur l’icône de SoundSwitch dans la barre d’état système.

🎙 Pour faire défiler les appareils d’enregistrement, appuyez sur **Ctrl + Alt + F7**.

🔇 Pour couper le microphone par défaut, appuyez sur **Ctrl + Alt + M**.

Pour les mordus de jeux vidéo, c’est un vrai bonheur. Imaginez-vous en pleine partie et devant basculer le son d’un casque à des haut-parleurs ou inversement. Vous n’avez pas vraiment le temps de vous perdre dans les paramètres du système. SoundSwitch vous offre cette fluidité avec une simple combinaison de touches. Et c’est pareil pour changer de périphérique d’enregistrement (genre votre micro)

Et il ne s’arrête pas là, car SoundSwitch parle également plusieurs langues, dont l’anglais, le français, l’allemand, l’espagnol, le portugais, l’italien et le chinois. Et si vous voulez l’avoir dans votre langue maternelle, vous pouvez même contribuer au projet pour aider à sa traduction.

SoundSwitch propose différents types de notifications pour vous signaler le changement de périphérique. L’affichage par défaut, recommandé pour les gamers, utilise une popup personnalisée toujours visible.

![](https://korben.info/soundswitch-commutateur-audio-rapide-windows/68747470733a2f2f736f756e647377697463682e6161666c616c6f2e6d652f696d672f707265766965772e6769663f763d3230313931313234.gif)

Parmi les autres notifications, il y a la bulle d’aide de Windows, celle que l’on connaît bien depuis notre rencontre avec Clippy, l’assistant de Microsoft. Dans le cas de Windows 7, cette bulle apparaît à côté de l’icône de la barre d’état système. Pour Windows 10, elle s’agrémente d’une animation glissant depuis le coin droit de l’écran.

Pour ne pas déranger les autres utilisateurs, SoundSwitch propose également de jouer un son plutôt discret pour signaler le changement de périphérique. Vous pouvez même spécifier le son de votre choix ! Et bien sûr, vous pouvez opter pour une notification silencieuse si vous le désirez.

Pour configurer SoundSwitch, faites un clic droit sur l’icône dans la barre des tâches et sélectionnez “Paramètres”. Vous pourrez alors choisir les périphériques audio à basculer et choisir les combinaisons de touches qui vous arrangeront le plus. N’oubliez pas de cocher la case “_Démarrer automatiquement avec Windows_” pour profiter de cette merveille à chaque démarrage de votre ordinateur.

Le développeur Jeroen Pelgrims et d’autres contributeurs passionnés méritent tout votre soutien alors si vous trouvez Soundswitch utile, n’hésitez pas à faire un don sur le site officiel.

SoundSwitch n’attend que vous et est à [découvrir ici](https://soundswitch.aaflalo.me/).
# Boostez votre PC avec Windows Memory Cleaner !

Le 7 novembre 2023par Korben -

1. [Tutoriels-Diy](https://korben.info/categories/tutoriels-diy/ "Voir tous les articles de la catégorie Tutoriels-Diy")
2. [Optimisation-Systeme](https://korben.info/categories/tutoriels-diy/optimisation-systeme/ "Voir tous les articles de la sous-catégorie Optimisation-Systeme")

**La mémoire RAM** est une ressource précieuse dans nos ordinateurs. Et parfois, les applications et les processus sont un peu trop gourmands et peuvent rendre votre machine aussi lente qu’un escargot sous tranquillisants.

Il est donc temps de LIBÉRER la mémoire de votre PC Windows et ainsi améliorer, au moins temporairement, ses performances. Et pour ça, je vous présente aujourd’hui ce nettoyeur de RAM gratuit pour Windows nommé de manière très originale **Windows Memory Cleaner**.

Cet outil tire parti des **fonctionnalités natives de Windows** pour optimiser la mémoire et éviter les ralentissements de votre PC et surtout, il est portable, donc vous pouvez l’utiliser rapidement sans installer quoi que ce soit.

![](https://korben.info/windows-memory-cleaner-optimiser-ram-gratuit-ameliorer-performances/SCR-20231004-jhm.webp)

![](https://korben.info/windows-memory-cleaner-optimiser-ram-gratuit-ameliorer-performances/SCR-20231004-jic.webp)

Le logiciel vous permet de **personnaliser les processus à ignorer**, en utilisant des raccourcis clavier et des paramètres pour la gestion des notifications et le démarrage automatique au lancement de Windows. L’interface est minimaliste et offre plusieurs fonctionnalités elles que l’**optimisation automatique** toutes les X heures, le nettoyage de diverses zones de mémoire (c’est vous qui choisissez), et une prise en charge **multilingue**.

La meilleure façon de découvrir cette merveille est de vous rendre sur la [page Github](https://github.com/IgorMundstein/WinMemoryCleaner) du projet et de l’essayer par vous-même. Vous allez kiffer !

Bon nettoyage de printemps de votre mémoire RAM !
[Adeus - L'assistant IA DIY qui vous accompagne partout | Projets maker | Le site de Korben](https://korben.info/adeus-ia-personnelle-open-source-respect-vie-privee.html)
[theme.park - A collection of themes/skins for your favorite apps!](https://theme-park.dev/)
# System Examiner - Un des meilleurs outils gratuits pour diagnostiquer votre ordinateur

Le 17 juillet 2023par Korben -

1. [Outils-Services](https://korben.info/categories/outils-services/ "Voir tous les articles de la catégorie Outils-Services")
2. [Logiciels-Utiles](https://korben.info/categories/outils-services/logiciels-utiles/ "Voir tous les articles de la sous-catégorie Logiciels-Utiles")

En tant qu’amateur de technologie et fin connaisseur des secrets de l’informatique, vous apprécierez surement cette découvert qui risque de vous sauver à de maintes occasions : System Examiner. Il s’agit d’une application gratuite, conçue pour dresser un rapport complet sur votre système Windows, le tout en un clin d’œil.

Imaginez un médecin capable de diagnostiquer instantanément votre ordinateur, révélant ses forces et faiblesses, décelant les erreurs et problèmes potentiels, et mettant à jour les moindres détails des logiciels et matériels installés. System Examiner est ce docteur qui vous permettra de diagnostiquer les erreurs Windows, mais également de connaître les spécificités du matériel de votre PC et bien plus encore. C’est vraiment l’outil idéal pour les dépanneurs.

D’ailleurs, si vous vous êtes déjà demandé si l’ordinateur d’occasion que vous avez acheté d’occaz était doté d’une version authentique de Windows, System Examiner saura vous donner la réponse. Sa réactivité et sa facilité d’utilisation en font un partenaire précieux pour inventorier et vérifier les PC d’occasion.

![](https://korben.info/system-examiner-meilleur-outil-gratuit-diagnostiquer-ordinateur/system_examiner_screenshot1.webp)

Maintenant que je vous ai titillé les neurones, entrons dans les détails de ce soft. System Examiner vous permet de tester les composants matériels essentiels de votre ordinateur, tels que le processeur, la RAM et le disque dur du système. Il dresse une liste exhaustive des programmes qui se lancent automatiquement, ainsi que des logiciels Windows installés, des pilotes de périphériques tiers et des services système.

L’équipe derrière System Examiner a intégré une fonction d’automatisation via des paramètres en ligne de commande pour faciliter la tâche des professionnels en support technique. Et pour ne rien gâcher, cette application est compatible avec le mode sombre de Windows (parce qu’on sait tous que les yeux de l’informaticien en ont besoin) et ne nécessite pas de droits d’administration.

Comment utiliser System Examiner ?

Rien de plus simple: une fois téléchargé et installé, il vous suffit de le lancer et de cliquer sur le gros bouton pour obtenir un rapport complet et détaillé de votre système. En cas de besoin, il est facile de désinstaller System Examiner depuis le panneau de configuration, comme pour n’importe quelle application Windows.

Cerise sur le gâteau : System Examiner est aussi disponible en version portable et peut tourner en ligne de commande. Par exemple pour générer un rapport via la CLI, c’est comme ça :

```fallback
SystemExaminer.exe /AutoCreate /AutoClose /Filename=report
```

Il ne vous reste plus qu’à être [les premiers à tester ce truc](https://systemexaminer.com/).

# Hide What You Dislike - L'extension Chrome pour filtrer tout ce qui vous déplait

Le 20 août 2024par Korben -

1. [Outils-Services](https://korben.info/categories/outils-services/ "Voir tous les articles de la catégorie Outils-Services")
2. [Applications-Web](https://korben.info/categories/outils-services/applications-web/ "Voir tous les articles de la sous-catégorie Applications-Web")

Si vous en avez assez de tomber constamment sur du contenu qui ne vous plait pas lors de vos séances de surf, sachez que vous allez pouvoir **filtrer** facilement les éléments indésirables grâce à cette extension Chrome…

Il s’agit de **Hide What You Dislike** qui permet de **masquer** en un clin d’œil tout ce qui vous tape sur les nerfs quand vous naviguez. Lien, image, texte, rien ne lui résiste ! Vous repérez un truc qui vous gonfle ? Hop, un clic droit et l’option magique “Hide entries with this link” apparaît pour le virer à tout jamais. Pratique, non ?

  
“_Mais si je me plante et que je masque un truc que je voulais garder ?_”.

Pas de panique, les développeurs ont pensé à tout ! Direction les options de l’extension où vous retrouverez la liste de tous les éléments cachés. Suffit de cliquer sur la petite croix rouge et hop, le contenu banni réapparaît comme par magie. **Bef, vous gardez le contrôle**!

Côté performances, elle est optimisée pour gérer des centaines de filtres sans ralentir votre navigation. Concrêtement, vous pouvez atteindre exactement le même résultat avec n’importe quel bloqueur de pub, mais avec cette extension, c’est beaucoup plus simple à faire.

Prenons l’exemple de YouTube. Son option native de blocage de chaîne ne fonctionne que sur les vidéos suggérées et pas sur les résultats de recherche. Et impossible de bloquer par mots-clés. Alors si voulez masquer toutes les vidéos qui mentionnent “Hanouna” dans le titre, avec YouTube, c’est mort mais avec Hide What You Dislike, c’est fastoche !

Voilà, c’est **gratuit**, c’est **personnalisable** à l’infini et [c’est dispo ici](https://www.hidewhatyoudislike.com/). Que demander de plus ?

Ah si, j’oubliais un détail qui a son importance… cette extension ne vous tracke pas ! Pas de pistage, pas d’analytics, tout est local par défaut. Et si vous vous connectez via Google pour sauvegarder vos filtres dans le cloud, seul le nom de domaine et le filtre sont transmis. Votre vie privée reste privée, comme il se doit.

# LockHunter - Débloquez efficacement vos fichiers sous Windows

Le 16 juillet 2023par Korben -

1. [Outils-Services](https://korben.info/categories/outils-services/ "Voir tous les articles de la catégorie Outils-Services")
2. [Logiciels-Utiles](https://korben.info/categories/outils-services/logiciels-utiles/ "Voir tous les articles de la sous-catégorie Logiciels-Utiles")

L’autre jour, j’ai rencontré sous Windows un problème avec un fichier que je ne pouvais pas supprimer. Il était bloqué par un processus inconnu, et je ne savais pas ce qui coinçait. C’est alors que j’ai découvert un petit bijou d’utilitaire appelé _LockHunter_ qui a résolu mon problème en un clin d’œil. Dans cet article, je vais vous présenter cet outil indispensable et comment l’utiliser pour débloquer vos fichiers et dossiers sous Windows.

La première chose que j’ai aimé avec LockHunter, c’est sa simplicité. Pas besoin de chercher partout comment l’utiliser, il suffit de faire un clic droit sur le fichier ou le dossier bloqué et de choisir « **What is locking this file?** ».

Miracle, le programme se lance et vous affiche toutes les informations nécessaires sur le processus en cours qui verrouille votre fichier ou dossier. Ensuite, jusque-là, rien de très étonnant par rapport à d’autres soft comme Unlocker dont je vous ai déjà parlé et qui est sûrement le plus connu.

![](https://korben.info/lockhunter-debloquez-efficacement-vos-fichiers-sous-windows/mainScreenshotFull.webp)

Je ne vais pas forcement comparer ces outils, mais plutôt vous montrer les fonctionnalités de LockHunter. Lorsque vous avez sélectionné un fichier, vous avez plusieurs options à disposition. La première est le bouton « Unlock It! » qui tente de fermer les processus en cours utilisant votre fichier ou dossier. Si cela fonctionne, vous aurez comme retour un message qui vous indiquera : “_The file has been unlocked successfully!_”.

L’option suivante est le bouton « Delete It! », qui permet de forcer la suppression du fichier ou du dossier bloqué. Ce que j’aime avec cette option, c’est qu’elle place les fichiers supprimés dans la corbeille de Windows, ce qui vous laisse la possibilité de les restaurer en cas de suppression accidentelle. Un vrai plus pour les personnes comme moi qui sont parfois un peu trop promptes à supprimer les fichiers sans trop réfléchir.

Enfin, le bouton « _Other_ » contient plusieurs options intéressantes. La première, « _Delete At Next System Restart_ », permet de supprimer le fichier ou le dossier bloqué au prochain redémarrage du système d’exploitation. Cela peut être utile en cas d’impossibilité de le supprimer autrement. Les options « _Unlock & Rename_ » et « _Unlock & Copy_ » permettent respectivement de déverrouiller, renommer ou copier le fichier ou le dossier en question.

Une autre fonctionnalité que j’apprécie avec LockHunter est sa capacité à supprimer les processus bloquants directement depuis le disque dur. Cela peut être utile, car parfois les logiciels malveillants verrouillent vos fichiers à des fins obscures.

Pour conclure, je tiens à dire que LockHunter est devenu pour moi un outil indispensable dans ma trousse à logiciels Windows. Il est simple, gratuit, et surtout très efficace pour débloquer n’importe quel fichier ou dossier bloqué. Si vous avez déjà rencontré ce genre de problèmes, je vous conseille vivement d’adopter cet utilitaire et de l’avoir toujours à portée de main.

À découvrir ici : [https://lockhunter.com](https://lockhunter.com/)

"don't make me think about the wrong thing". You should give all of your energy to creativity work, and every requirement and processing around that should just flow naturally, effortlessly, mindlessly.
You've got a really sophisticated piece of machinery, that some of the smartest engineers in the world have worked on, and that's why you should take the responsability fo this power. You should have everything at your fingertip, everything should be accessed really easily.

With Winflows you've got something really powerful in your hands, but it never feels like you are fighting with it, you always feel like everything is right at your fingertips. 
### 
it's an introduction to productivity and Windows, it assumes no pior knowledge, you can come really fresh, everything is starting really at the base we're gonna go slowly to every single piece to give you a good lay of the land of what windows has to offer


## 
 
If you've ever hoped for a more organized and stress-free way to tackle your workload, the Getting Things Done (GTD) method could be just what you're looking for! This week, we’ll explore the core principles of GTD and share some tips on how to weave them into your daily routine for a more focused and productive life.

So, what is GTD?
Getting Things Done is a personal productivity system crafted to help you capture, clarify, organize, and manage all those tasks, ideas, and commitments that swirl around in your mind. The main idea behind GTD is quite straightforward: your brain is meant for having ideas, not holding onto them. By transferring everything out of your head and into a reliable external system, you can free up mental space to focus on what really matters—getting things done!

GTD includes five essential steps:
📝 Capture: Gather everything that grabs your attention into a trusted system.

🔍️ Clarify: Process what you've collected and figure out what it means.

🗄️ Organize: Place everything in its proper home.

🪩 Reflect: Take time to regularly review and refresh your system.

👋 Engage: Take action on your tasks.

Let’s review each step and explore how you can integrate them into your daily routine this fall.

Capture 

The first step is to gather all those thoughts buzzing around in your mind. This includes tasks, ideas, commitments, and anything else occupying mental space. Use a mix of digital and physical tools to capture these items.

For example, while commuting to work, you might suddenly remember that you need to buy groceries, call your dentist, and brainstorm ideas for a project. Make sure to quickly jot these down in your favorite capture tool.

Clarify 

Once you’ve captured everything, it's time to process each item. Ask yourself:

Is it actionable?

If yes, what's the next step?

If no, is it trash, reference material, or something for later?

For instance, with “buy groceries,” the next step might be “make a grocery list.” As for “call dentist,” it could be “find the dentist's phone number.”

Organize 
Now, it’s time to file each item where it belongs:

Next Actions: A list of immediate, concrete next steps

Projects: Multi-step outcomes you want to achieve

Waiting For: Items you're waiting on others to complete

Calendar: Date-specific tasks and appointments

Someday/Maybe: Ideas or tasks for the future

For example, “make grocery list” would go on your Next Actions list, while “plan summer vacation” might fall under Projects.

Reflect 
Make it a habit to regularly review your lists to keep track of your commitments. A weekly review is essential for maintaining your system. During this time:

Clear all your inboxes

Review your Next Actions, Projects, and Waiting For lists

Update your Someday/Maybe list

Imagine it’s Sunday evening, and you’re conducting your weekly review. You notice “research new laptop” on your Someday/Maybe list. You decide it’s time to take action, so you move it to your Projects list and add “compare laptop models” to your Next Actions.

Engage 
With your system set up, you can confidently decide what to work on at any moment. Trust your lists and focus on the task in front of you, without the nagging worry of what you might be forgetting.

 
Fresh new spaces from California
Earlier this year, we embarked on a trip to uncover the hidden beauty of California’s most serene spots—Point Reyes, the Baker Hike, and the enchanting Cypress Tree Tunnel. With the help of an amazing videographer, we captured the magic of these locations—the light filtering through ancient trees, the quiet nature, and the waves crashing against rugged cliffs.

Our goal was to bring these breathtaking moments to life on LifeAt, creating a virtual escape where you can find focus and tranquility. Take a moment to explore these captivating spaces, and let the natural beauty inspire your next deep work session. Let us know what you think about this partnership!

SoBrief is the world's largest book summary platform, containing 73,530+ thorough book summaries with audio narration. AI-powered book curation. Supports 40 languages. 100% free to read. No signup is required. Only $4.99/mo for listening. [SoBrief.com: FREE AI Book Summary & Audio](https://sobrief.com/?ref=producthunt)


## Get some assistance !
Your personalized local AI that stores your digital activity. Ask it what you have done and seen on your laptop. Be productive by generating content, code, or solutions using the memory of your activity on the laptop.
[Remind AI](https://www.recallmemory.io/)
  
I'm excited to introduce reMind, an open-source project I've been developing for the past nine months. reMind is a digital memory assistant that captures screen content, uses Al for indexing and retrieval, and stores everything locally for privacy. While it offers functionality similar to Apple's Intelligence and Microsoft's Recall solutions, reMind stands out by being fully open-source and customizable. What sets reMind apart is its integration of Open-Source technologies. I've combined Ollama for local AI, Meta's Llama 3.1 for language processing, and Nomic AI for embeddings models, all wrapped in a sleek interface built with OpenWebUI and Python. This unique blend allows for a powerful yet user-friendly experience. Imagine easily recalling solutions to past technical issues, recreating code snippets you saw online, or quickly summarizing your week's work for team meetings. reMind makes your entire digital life searchable and accessible, boosting productivity and enhancing your digital experiences. We've already had some collaborations and received over 200 stars, even before officially launching Remind, and I'm proud of that!



Sticky notes on every page Sticky is an app that lets you take your sticky notes everywhere with you. This app offers the simplest and very physical-like sticky notes experience on your browser.

https://youtu.be/BHLhbr9oV1Y
Instead of juggling multiple apps and tabs, ScreenHint lets you capture a piece of your screen, turning it in to a snapshot that hovers over your other windows. It can help you keep focused, remember something important, or stay inspired while you work.


[Sukha – Focused Co-Working](https://www.thesukha.co/)
We're a focus app that uses co-working to help you get more done. If you've ever wanted more energy, motivation or just a way to block out distractions, Sukha is the co-working website where productivity-minded people focus together.
[Shimmer | #1 ADHD Coaching Platform for Adults | Expert & Affordable](https://www.shimmer.care/)
Meet the #1 ADHD Coaching Platform’s newest experience — Body Doubling for ADHD. We’ve infused the 6 ADHD motivators to supercharge a popular co-working strategy for getting things done.

[Netflix AutoSkip - Chrome Web Store](https://chromewebstore.google.com/detail/netflix-autoskip/ccneeceepbhmgaonnhcbhbmhfomnpnfh?ref=producthunt)
USE AUDIO
	[AudioPen Prime](https://audiopen.ai/prime)
		L'outil AudioPen est un assistant personnel qui convertit des notes vocales informelles en texte clair et prêt à partager. Il est utilisé pour créer des notes de réunion, des mémos, des courriels, des articles et bien plus.
		- AudioPen est un outil qui convertit les notes vocales en texte clair et prêt à partager.
		- Il est utilisé pour créer des notes de réunion, des mémos, des courriels, des articles et bien plus.
		- Les utilisateurs apprécient l'outil pour sa simplicité et sa précision.
		- AudioPen est recommandé par des utilisateurs tels que Mark Pereyra, Earl 1, Gus Silber, Cathy, Otis Frampton, et d'autres.
		- Les utilisateurs apprécient l'outil pour son utilité dans leur travail créatif et pour son aide dans la prise de notes.
	BetterDictation (Mac only for now)
	

[Playbook.com | Organize your creative files | Sign up for free storage](https://www.playbook.com/?ref=blog.alexanderfyoung.com)
[Binaural sounds to improve focus and boost your productivity.](https://app.spaces.fm/green-forest)
health tracking 
	[Guava Tags](https://guavahealth.com/guava-tags)

[Le SALARIAT rend les gens COMPLÈTEMENT FOUS - YouTube](https://www.youtube.com/watch?v=tzC_Uf1jhug)

[Ne travaille PAS sur ton business à plein temps : voici pourquoi - YouTube](https://www.youtube.com/watch?v=hsejtC-29cY) → transcrire


collecter et ranger ce qui pourrait servir plus tard et ne consommer QUE ce qui va servir maintenant !
[How to have the most productive two weeks of your life - YouTube](https://www.youtube.com/watch?v=_0SSytDC_Mo&list=WL&index=137)


[(324) Joe Mazzulla and Dr. Leah Lagos: How to Create the Conditions for Championships - YouTube](https://www.youtube.com/watch?v=EJRhBLNXH_0)
[5 USEFUL Productivity Apps For Mac with Windows Alternatives - YouTube](https://www.youtube.com/watch?v=ZCR5yPKbJms)

[The ultimate goal setting & goal making system: And why you need to STOP making New Year Resolutions - YouTube](https://www.youtube.com/watch?v=2EgdIpa3FLM&list=WL&index=78)
Structure, standardize and automate at every opportunity

![|178](a%20rangerrr-20240825002549835.webp)

[![/blog/why-using-neovim-data-engineer-and-writer-2023/weel-too-busy.png](https://www.ssp.sh/blog/why-using-neovim-data-engineer-and-writer-2023/weel-too-busy.png "/blog/why-using-neovim-data-engineer-and-writer-2023/weel-too-busy.png")](https://www.ssp.sh/blog/why-using-neovim-data-engineer-and-writer-2023/weel-too-busy.png "/blog/why-using-neovim-data-engineer-and-writer-2023/weel-too-busy.png")

Are you too busy to improve | Image from [steenschledermann](https://steenschledermann.wordpress.com/2014/05/17/square-or-round-wheels/)

[00:08](https://www.youtube.com/watch?v=JsT3KPYJFl4&t=8#t=8.29)  



## Typing fast
In this video https://youtu.be/bbV1bn_0onk?t=202 he explains that changing keyboard meant typing twice as slow as usual, reminding us that typing speed is a huge part of productivity, and there are many ways to enhance it by working your finger speed on


by switching keyboard for a layout meant for productivity. It takes times but it can lead to valuable result since keyboard haven’t been designed for speed, they were [designed for writing machine](https://youtu.be/wPGmZXAQRyw?t=123), and kept as is when we switched to computers because the public was already too used to it. But this is not a layout adapted for speed, other layouts are much more adapted to the form of the hand for example
[Monkeytype | A minimalistic, customizable typing test](https://monkeytype.com/)
[TypeRacer - Play Typing Games and Race Friends](https://play.typeracer.com/)
[Typing Practice for Programmers | SpeedCoder](https://www.speedcoder.net/)
splitkey keyboard
[Lily58 Pro — KeyHive](https://keyhive.xyz/shop/lily58)


## Your network is your net worth
The power of meaningful connections
Creating genuine connections has become an increasingly important skill to have these days. Here’s why they matter:

❇️ Diverse perspectives: Every new connection brings a unique worldview, challenging your assumptions and broadening your horizons.

❇️ Opportunities: Your network can lead to unexpected opportunities, from job offers to collaborative projects that’ll help deepen your understanding of your career or academic interests.

❇️ Support system: A strong network provides emotional support and encouragement during your reinvention journey. Remember - strive towards a goal of offering your support to the connections that may need it. They’ll likely remember your kindness and pay it forward, or be open to offering a favor when you may need one later.

❇️ Knowledge exchange: Connecting with others allows for the exchange of ideas, skills, and insights. By building a collaborative mindset, you can help gain expertise and expand your understanding of the world.

 
Strategies for building authentic relationships
Building meaningful connections doesn’t have to feel daunting; it’s all about being genuine and open to new experiences. Think of it as nurturing a garden—each interaction is a seed that can grow into a beautiful relationship with a little care and attention.

Ready to expand your network? Here are some strategies to help you cultivate your new connections:

💭 Be Curious: Approach interactions with genuine interest. Ask thoughtful questions and listen actively.

🤩 Offer Value: Think about how you can help others. Generosity builds strong relationships.

📨 Follow Up: After meeting someone new, follow up within 24 hrs with a personalized message or invitation to connect further.

As you make new connections, don’t forget to nurture your existing relationships by scheduling regular catch-ups with mentors or colleagues, celebrating others' successes, and sharing valuable resources that might benefit your network.

Share your experience with us! We'd love to hear about the connections you make and how they contribute to your reinvention journey.

## 
[How to install chocolatey in Windows - YouTube](https://www.youtube.com/watch?v=-5WLKu_J_AE&list=WL&index=478)


[AutoHotkey Classes, Functions, Scope, Super Global & Global Variables - YouTube](https://www.youtube.com/watch?v=2jVkEoHCYEk&list=WL&index=327&t=6s)

how do I choose software : has to had been updated recently or have and historic of relatively frequent updates

# Small Steps to Big Wins The Two-Minute Rule

We can see you are running a tight ship here. Every hour of your day is accounted for; every waking moment is fully occupied. You try to wake up earlier, and you continuously turn in late. Yet it seems like all those delicate plates in the air could come crashing down any minute. Does your frustration not keep mounting as the tasks still keep piling on? You think, “What more can I possibly do?” 

Let us help you calm down and take a deep breath as you step into 2024. We have a magic formula for you: the incredible “two-minute rule.”

This brilliant hack is the ideal solution for all those productivity enthusiasts out there who wish to stay ahead of the game. It may not appear to be such a big deal by the sound of it, but it is sure to become your ultimate tip for stress and [time management](https://www.blitzit.app/blog/10-proven-time-management-strategies-for-2024) this year.

So read on to uncover this secret recipe to success as we explain this outstanding rule!

  

## So, What Exactly is the Two-Minute Rule?

![Two-Minute Rule](https://framerusercontent.com/images/LvMnFKVMoB8JGybftGlTvGo95g.png)

Before 2001, nobody really knew about it or thought of it. It was In his brilliant productivity book, [“Getting Things Done,](https://gettingthingsdone.com/)” that David Allen first came up with this simple yet powerful hack called the “Two-Minute Rule.” 

Simply put, the rule says that if a job can be completed within two minutes, it should be taken on instantly. You may wonder what the big deal is about that. How does this make for such a brilliant tip? 

Let us break it down for you.

  

## Why is This Rule so Effective?

![](https://framerusercontent.com/images/CRSLR5yc2nSxfon1YgByXjDSjA.png)

Let us say that when you are working on a schedule, the small tasks that may appear insignificant at first but still need to be completed, keep adding up. You may not pay them much attention, but these tasks build on your subconscious, adding to stress. 

Here, the trick is that when you are faced with a small task, ask yourself the question: can this task be completed within two minutes? If the answer is a yes, get to it straight away. Do not postpone it. Move on only once you have ticked that box.

Once you start taking care of the little tasks, as soon as they arise, you are helping get some load off your head. 

So, respond to that short email as soon as it enters your inbox. Or make those tiny edits needed to those almost completed documents the moment you spot them. You may have been planning on sending brief messages of thanks to coworkers. Or maybe you have been wanting to congratulate friends on their achievements. Well, go ahead. Do it now!

These seemingly insignificant actions are in fact the building blocks of a more organized and well-oiled work life. Take care of them without delay. Do not hold back! And you might find yourself ahead of the clock! 

  

## How Does it Help in the Bigger Picture?

![](https://framerusercontent.com/images/NKMHnmjwWzhTzM7MkyXE5uzKgJE.png)

The rule may be simple, but it surely is extremely effective. Let us see why.

- The two-minute rule will make sure you overcome [procrastination](https://www.mcleanhospital.org/essential/procrastination#:~:text=The%20issue%20can%20be%20linked,even%20linked%20to%20physical%20illness.) that will make you delay seemingly insignificant but important tasks.
    
- After completing the smaller tasks, your mind is uncluttered to better handle the bigger challenges.
    
- You will get into the habit of making decisions really fast.
    
- Following the two-minute rule will allow you to master the time management skill.
    
- Most importantly, your productivity will surely get a boost as you gather small accomplishments throughout the day. These quickly completed tasks will give you a rewarding sense of achievement. When on such a high, you will feel you can conquer the world!
    

## Use a Productivity App to Manage Your Day

![](https://framerusercontent.com/images/L3bvKU0pf8KOU7nIwsgRBdKWkUc.png)

But wait, there is more; things get exciting here. Innovation in technology has come up with absolute marvels, and productivity apps are no different. Today, there is a lot we expect technology to do for us, and [Blitzit](https://www.blitzit.app/) has risen to the challenge.

With its innovative features, it can help you manage your workday efficiently. 

  

### 1. The Floating Task Timer:

![](https://framerusercontent.com/images/4Toyk1xwKQ61YilDxNOod0oD1Y.png)

Time is the real deal, the money in the bank. And what better way to keep you aware of the ticking clock than by having a timer right in front of you, on your desktop, ticking away to keep you focused on the task at hand? Blitzit’s floating task timer does just that.

  

### 2. The Blitz Tower:

![](https://framerusercontent.com/images/Sah2xdXJjrUQfIkR8t7W6O8U0s.png)

This tower has the day’s tasks lined up for you. It lets you see at a glance what your schedule looks like, and if it gets too distracting, you can simply slide it off the screen and focus on the full screen instead. Keeping the two-minute rule in mind, you can better assess which tasks can be ticked off first to shrink that formidable-looking tower down!

  

### 3. Quick Notes and Checkbox Experience:

![](https://framerusercontent.com/images/E0VNvJjrcblTgxPoEqsJYNw0Y.png)

The Two-Minute Rule encourages immediacy. Blitzit's quick notes feature works wonders in that respect. As soon as an idea strikes, you are just a click away from jotting it down. And then ticking that box makes the experience more rewarding.

  

### 4. Break Time:

![](https://framerusercontent.com/images/UTZWn7sxSHus6euVHdBfSsMnSY.png)

When [taking a quick break from work](https://www.blitzit.app/blog/the-pomodoro-technique-a-comprehensive-guide-to-boosting-productivity-and-learning), you won't need to worry about wasting it away mindlessly. With Blitzit, you can pre-determine the work you might want to think over or mull over ideas you had at the back of your head. Blitzit will keep you on track all the way!

  

### 5. Recurring Task Reminders:

![](https://framerusercontent.com/images/97OiEi3EM5UZyoior7lJ59KNM.png)

If a task happens to slip your notice, the recurring reminders will make sure to bring it back to your attention till you finally get it done. With Blitzit, no two-minute opportunity will slip by you unnoticed.

This app is a brilliant motivator to help you keep going. It will make sure you keep ticking away the insignificant-looking small tasks while helping you get the job done. 

  

## Final Word

There is no denying the magic of the Two-Minute Rule, and there is no wonder it has shot to such fame. It is a game-changer for individuals across varied fields. The results it has brought are nothing short of remarkable.

The brilliance of this rule lies in its simplicity. It is a straightforward and immediate call to action. If a task can be wrapped up in two minutes or less, do it now. There, done and dusted!

So, this new year, let this straightforward approach make you break away from procrastination. Respond to tasks swiftly and decisively that might otherwise linger on your to-do lists for a long, long time.

With the Blitzit app as your partner, this continuous chain of small wins will set the tone for a rewarding and productive new year!



## The Dopamine Effect When Breaking Down Tasks into Subtasks
	
In today's fast-paced world, maintaining high levels of productivity can be a challenge. Between juggling multiple responsibilities and constantly shifting priorities, it’s easy to feel overwhelmed. But what if there was a simple, science-backed way to enhance your productivity and stay motivated throughout the day? Enter the concept of breaking down tasks into subtasks and the powerful role of dopamine in this process.

### Understanding Dopamine

Dopamine is often referred to as the "feel-good" neurotransmitter. It plays a crucial role in how we feel pleasure, think, and plan. It's involved in reward, motivation, memory, attention, and even regulating body movements. When dopamine is released in large amounts, it creates feelings of pleasure and reward, which motivates you to repeat a specific behavior. On the flip side, low levels of dopamine are linked to decreased motivation and enthusiasm for things that would typically excite most people.

### The Power of Subtasks

Breaking down larger tasks into smaller, manageable subtasks can significantly boost your productivity. Here’s why:

1. **Micro Rewards**: Each time you complete a subtask, your brain releases a small amount of dopamine. These micro rewards create a sense of achievement and satisfaction, encouraging you to continue working towards completing the larger task. This is akin to crossing off items on a to-do list; each check mark gives a little jolt of pleasure.
	
2. **Increased Motivation**: The constant release of dopamine as you complete subtasks keeps your motivation levels high. Instead of feeling daunted by a massive project, you feel empowered as you tick off each smaller, manageable piece. This continuous cycle of achievement helps maintain momentum.
	
3. **Improved Focus**: When tasks are broken down into subtasks, it’s easier to focus on one thing at a time. This reduces the cognitive load and prevents you from feelings of overwhelmed, allowing you to concentrate better and work more efficiently.
	
4. **Better Time Management**: Subtasks help in planning and managing time more effectively. With a clear roadmap of what needs to be done and when, you can allocate your time wisely and avoid the pitfalls of procrastination.

### How to Implement Subtasks in Your Workflow

1. **Identify the Big Picture**: Start by understanding the overall goal or project. What is it that you want to achieve?
	
2. **Break It Down**: Divide the main task into smaller, more manageable subtasks. Make sure each subtask is specific and actionable.
	
3. **Prioritize**: Determine the order in which tasks need to be completed. Which subtasks are dependent on others? Which ones are most critical?
	
4. **Set Milestones**: Create milestones for key stages of the project. This not only helps in tracking progress but also provides additional motivation as you reach each milestone.
	
5. **Track and Reflect**: Use tools like Notion and Blitzit to track your progress. Reflect on what you’ve accomplished at the end of each day to reinforce the sense of achievement and boost dopamine release.

The great news is that if you already use Notion for your overall planning and project management, Blitzit now has a new integration with Notion allowing you to convert Notion database items into actionable tasks and subtasks. Further more with Blitzit you can turn tasks into focus sessions using countdown timers to achieve flow-state. We've created an [article with a video](https://www.blitzit.app/help-center/notion-integration) on how it works.

### Conclusion

Harnessing the power of dopamine through the strategic breakdown of tasks into subtasks is a game-changer for productivity. By creating a series of small wins throughout your workday, you keep your motivation levels high, maintain focus, and manage your time more effectively. Start breaking down your tasks today and experience the boost in productivity and satisfaction that comes with it. Remember, every small step counts and every completed subtask brings you one step closer to your ultimate goal.

**Ready to supercharge your productivity?** [Try Blitzit today!](https://www.blitzit.app/)

Blitzit is a personal productivity tool designed to keep you focused and get more done. Featuring an ever-visible to-do list panel that can collapse into a floating countdown timer, Blitzit helps you stay on task. Packed with features like Pomodoro timers, productivity reports, task scheduling, notes, and much more, Blitzit boosts your ability to focus and prioritize, helping you win back your precious time.

Explore Blitzit’s powerful features including list categories, task reminders, time tracking, recurring tasks, integrations with Google Calendar and Notion, and many more. Plus, exciting features are on the way, such as a mobile app, more integrations, public gamification, light mode, a break time library, AI task generation, and assistant. [See our roadmap](https://www.blitzit.app/#roadmap) for more details.

Discover the difference Blitzit can make in your workflow and start achieving your goals more efficiently today!
[00:20](https://www.youtube.com/watch?v=p-AMooYPO1Y&t=21#t=20.52)  

[Elite dangerous Autohotkey script PIPs management - YouTube](https://www.youtube.com/watch?v=om91syXxfSA&list=WL&index=312)

[AutoHotkey - AHK - My fav scripts - YouTube](https://www.youtube.com/watch?v=l4wm4dObhF4&list=WL&index=249)
[AutoHotKey + SuperMemo = SM on steroids - YouTube](https://www.youtube.com/watch?v=mhjvL8ER2S0&list=WL&index=296)

[00:04](https://www.youtube.com/watch?v=n_9-QkD-zJ4&t=5#t=4.95)  many uses of autohotkey

[00:04](https://www.youtube.com/watch?v=IzdVbPnKU_c&t=5#t=4.97)  

[00:09](https://www.youtube.com/watch?v=0v8MlP2nS_M&t=10#t=10.00)  
[00:03](https://www.youtube.com/watch?v=V5cUsgcdTCM&t=4#t=3.99)  
[00:10](https://www.youtube.com/watch?v=Cqr9ckeh704&t=10#t=10.07)  
[00:15](https://www.youtube.com/watch?v=A9u9n2u8RMc&t=15#t=15.48)  
[00:14](https://www.youtube.com/watch?v=khjlf8YCcKU&t=14#t=14.41)  
[00:12](https://www.youtube.com/watch?v=d1oZOVVmOhw&t=13#t=12.52)  
[00:10](https://www.youtube.com/watch?v=dmgl_bT9_vc&t=11#t=10.92)  
[00:31](https://www.youtube.com/watch?v=KYDqL_Bt_iw&t=32#t=32.00)  
[00:03](https://www.youtube.com/watch?v=ywixnApXe2A&t=4#t=3.74)  
[5 Levels of Productivity - YouTube](https://www.youtube.com/watch?v=Vex6uSmUtqI)
[7 Easy Tips to 10x Your Productivity - YouTube](https://www.youtube.com/watch?v=rxLiHWxqW4Q&list=PL8hhAZzwVh8BYPvwut0uYBrsC4h137rAp&index=1&t=3s)
have a master folder for project creation

[00:30](https://www.youtube.com/watch?v=r_UecfKz7FA&t=30#t=30.23)  

xyplorer X pour supprimer, Alt S pour double panneau, etc

[How to Combine Multiple Internet Connections - Speedify](https://speedify.com/blog/combining-internet-connections/how-to-combine-multiple-internet-connections/)
[Amazon.com: Peeps CarbonKlean Glasses Cleaner - for Eyeglasses, Reading Glasses, and More - Lens Cleaner With Carbon Microfiber Tech - Injected Black - 1 Count (Pack of 1) : Health & Household](https://www.amazon.com/Peeps-Eyeglass-Cleaner-Eyeglasses-Sunglasses/dp/B019M9NEAW)

Whether it’s being productive, staying in touch, or just plain having fun, Windows 10 has lots of little tricks and shortcuts that can help you achieve more.

## **Common Shortcuts for text**

* **Ctrl + D →** Duplicate
* **Ctrl + A** → Select everything
* **Maj + Arrow Key**  Select Text
* **End → + Arrow Key**  Select Text to the end of the line
* ← **+ Arrow Key**  Select Text to the end of the line
* **Maj + Ctrl + Arrow Key**  Select Text Word By Word
* **Ctrl + Arrow Key**  Jump Text Word By Word
* **Ctrl + Delete Key**  Delete Word
* Select text + **Ctrl + B  Bold**
* Select text + **Ctrl + I**  _Italic_
* Select text + **Ctrl + I**  Underline

## **Use Multiple Virtual Desktops in Windows 10**

* **Add a desktop**
	* Open up the Task View pane by clicking the **Task View button**, or by pressing the **Windows Key + Tab**
	* Click **New Desktop**.
* **Switch between desktops**
	
	* Open the **Task View** pane and click on the desktop you would like to switch to.
	* You can also quickly switch between desktops with the keyboard shortcuts **Windows key + Ctrl + Left Arrow** and **Windows key + Ctrl + Right Arrow**
* **Move windows between desktops:**
	
	* Open the **Task View** pane and hover your cursor over the desktop containing the window that you want to move, the windows on the selected desktop will pop up
		* Find the window that you want to move, **right-click** it, select **Move to**, and choose the desktop you want to move the window to
		* You can also drag and drop windows to the desired desktop
* **Close desktops:**
	
	* Open the Task View pane, hover over the desktop that you want to close, and click the small **X** that appears in the top-right corner
	* You can also close desktops with the keyboard shortcut **Windows Key + Ctrl + F4**

## **Common Browser shortcuts**

* **Ctrl + Maj + E**  Extensions
* **Ctrl + T**  New Tab
* **Ctrl + Maj + T**  New Window
* **Ctrl + Maj + Z**  Re-open Closed Tab

## **Notion shortcuts**

* **Ctrl + Maj + ArrowKeys**  Move bullet ↑↓
* **Ctrl + P**  Search
* **Ctrl + Z**  Undo
* **Ctrl + Y**  Redo
* **Ctrl + D**  Duplicate element
* **Ctrl + X**  Delete Element / Cut Element
* **Ctrl + Maj + P**  Move To
* **Maj + /**  New bloc
* **Maj + / +** Color name (+”background”)  Color the words/background of a block
* More on the official page  [Learn the shortcuts](https://www.notion.so/66e28cec810548c3a4061513126766b0?pvs=21)

## **Use Emojis**

Emojis aren’t just for your phone anymore! The new emoji keyboard in Windows 10 lets you express yourself like never before. To use it:

1. During text entry, type **Windows logo key** + **. (period)**. The emoji keyboard will appear.
2. Select an emoji with the mouse, or keep typing to search through the available emojis for one you like.

![https://s3.us-west-2.amazonaws.com/secure.notion-static.com/45f2da27-ae7d-4cf0-8abe-e4741a995b21/cb2595f2-f45a-80dd-85fb-54e862c2ee8c.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAT73L2G45EIPT3X45%2F20220524%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20220524T162032Z&X-Amz-Expires=86400&X-Amz-Signature=48564ef6e0a168f6f3687be3eba66389592a97c40bb2854e0f8cf198f13dd763&X-Amz-SignedHeaders=host&response-content-disposition=filename %3D"cb2595f2-f45a-80dd-85fb-54e862c2ee8c.png"&x-id=GetObject](https://s3.us-west-2.amazonaws.com/secure.notion-static.com/45f2da27-ae7d-4cf0-8abe-e4741a995b21/cb2595f2-f45a-80dd-85fb-54e862c2ee8c.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAT73L2G45EIPT3X45%2F20220524%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20220524T162032Z&X-Amz-Expires=86400&X-Amz-Signature=48564ef6e0a168f6f3687be3eba66389592a97c40bb2854e0f8cf198f13dd763&X-Amz-SignedHeaders=host&response-content-disposition=filename%20%3D%22cb2595f2-f45a-80dd-85fb-54e862c2ee8c.png%22&x-id=GetObject)

## **Type All the Symbols like a pro**

Sometimes you need to type a character that isn’t on your keyboard, like an em-dash (—) or the copyright symbol (©). If you have a numeric keypad on your keyboard, you don’t have to find one and copy and paste, you can just do it!

1. Hold down the **Alt key** on your keyboard
2. With the **Alt key** held down, type the four-digit code on the numeric keypad for the character you want. (Include the leading 0 if that’s required)**Note:** This only works on the numeric keypad. This won’t work on the row of numbers at the top of the keyboard
3. Release the **Alt** key

## **Travel The world**

If you find yourself typing characters used more frequently in other languages, you can always install keyboards for other languages and switch among them easily. For more details about this, see [Manage the input and display language settings in Windows 10](https://support.microsoft.com/en-us/windows/manage-the-input-and-display-language-settings-in-windows-12a10cb4-8626-9b77-0ccb-5013e0c7c7a2).

![https://s3.us-west-2.amazonaws.com/secure.notion-static.com/1947cee1-88b2-4324-8baf-435eff1fd802/1f598baa-8ed8-8ec6-cf98-eed8650e2556.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAT73L2G45EIPT3X45%2F20220524%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20220524T162046Z&X-Amz-Expires=86400&X-Amz-Signature=b513d78da204848c058c041b72e5b543d9df0713740faab5d4616d010ea1d034&X-Amz-SignedHeaders=host&response-content-disposition=filename %3D"1f598baa-8ed8-8ec6-cf98-eed8650e2556.png"&x-id=GetObject](https://s3.us-west-2.amazonaws.com/secure.notion-static.com/1947cee1-88b2-4324-8baf-435eff1fd802/1f598baa-8ed8-8ec6-cf98-eed8650e2556.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAT73L2G45EIPT3X45%2F20220524%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20220524T162046Z&X-Amz-Expires=86400&X-Amz-Signature=b513d78da204848c058c041b72e5b543d9df0713740faab5d4616d010ea1d034&X-Amz-SignedHeaders=host&response-content-disposition=filename%20%3D%221f598baa-8ed8-8ec6-cf98-eed8650e2556.png%22&x-id=GetObject)

## **Accented Maj : Keyboard shortcuts**

To make the keyboard shortcut, you must :

* Keep the `alt` key pressed and type the ASCII code composed of 4 digits
* Then release the `alt` key
* And finally hit the `ENTRER` key

![Untitled](https://s3-us-west-2.amazonaws.com/secure.notion-static.com/ea2faef0-bae5-411a-a592-eba5924434fa/Untitled.png)

alterner les sessions créatives et techniques

### News Feed Eradicator

That's my Facebook for work 🧠

A lot of times when I go to Facebook to do a thing, I end up caught on the first (then the second, the the third….) post, I'm sure that happens to you too sometimes ? 👀

This poses 3 problems: It takes my time and derives me for my original work it messes my energy flow, I might be focused on something very specific for example writing an article, and now my brain is all over the place with all of the news informations, emojis, memes and incentives to answer. I loose my work energy flow to go in another, more social one, then have to go back to what I was doing, which might not seems like it but is a huge productivity loss especially if it happens everyday. Switching energy moods takes energy, so we might as well do it the lesser possible 🙂 It happens a lot of time that I don't remember what I needed to do in Facebook in the first place, after this new infos & scrolling… Which is really frustrating and tells a lot about how I can be easily deconcentrated and how bad this is for productive work Do you have the same experience with social medias ? Do you keep notifications on, how do you manage this ?

I'm sharing my facebook feed, hoping it could resolve this problem for you too 🙂 Stack :

* Many element of the website UI that I never use are removed with Click to Remove (install here [https://chrome.google.com/.../jcgpghgjhhahcefnfpbncdmhhdd](https://chrome.google.com/.../jcgpghgjhhahcefnfpbncdmhhdd)…)
* The whole news feed eradicated (and a beautiful quote that I really resonate with !), but you can still access notifications posts, posts in groups… (App is News Feed Eradicator Install it here [https://chrome.google.com/.../fjcldmjmjhkklehbacihaiopjkl](https://chrome.google.com/.../fjcldmjmjhkklehbacihaiopjkl)… )

### Communicate Better

## **Be Sure to Use Your Favorite Mobile App on the Web too**

* [Messenger app](https://www.notion.so/d866487d761a4187a7ba75dc3587e409?pvs=21)
* [Whatsapp Web](https://www.notion.so/30340d7f13bd4c9286cf52cfb4649feb?pvs=21)
* With [Pushbullet](https://www.notion.so/7fb1aa33865d46958d520846104eb439?pvs=21) you can send and reveice sms from your computer, now Winwdows also support this, (see [Send Text Messages from Windows 10 with the Your Phone App](https://www.groovypost.com/howto/send-sms-text-messages-from-windows-10-your-phone-app/) )
* It is impersonal to text and video chat is intrusive. Maybe we should just stick to voicemail, you can leave voice messages on [Yac](https://www.yac.com/) that teammates can listen to from their computers or phones. If needed, you can add a screen share

[Franz](https://www.notion.so/228c463597094d338ca89b035a420d84?pvs=21)

,

[Ferdi](https://www.notion.so/23c409587a8e4f208a30089828e6f2cf?pvs=21)

and other apps you can find on the

[Browse better](https://www.notion.so/7672cdbf59694e2b8738f24c618a5db1?pvs=21)

page, can be a solution to have all messengers-related tools in one place, separated from other browsing

## **Share With other**

* To share big files see [Manage files better](https://www.notion.so/aef87435376a4c01b9fbab20592c12e1?pvs=21)
* GIF are a great way to quickly show something on a screen. [Make GIFs !](https://www.notion.so/760c1d32ba854808ae16dff89edb9cc1?pvs=21)
* For fun, [Bitmoji](https://www.notion.so/59f415c784ea4b8888ce692ac0b55b39?pvs=21) are cool to share, GIFs from [GIPHY – Be Animated](https://www.notion.so/6fe8f48b590c4f239cada9234894a8d5?pvs=21) too
* Easily send **personalized videos / images** with [Dubb](https://dubb.com/?utm_source=AppSumo), [Nexweave](https://www.notion.so/12c650f731fa4b93ad6902139b7062eb?pvs=21), [WOXO](https://woxo.tech/)
* [Capsulelink | Group, save and send links as one.](https://www.notion.so/624f63da015c4152ae53ac6779279f4a?pvs=21)
* Generate formatted bibliographies, citations, and works cited automatically with  [MyBib – A New FREE APA, Harvard, & MLA Citation Generator](https://www.notion.so/3811445ccc10417789970eaf37ba0704?pvs=21)
* [Twitter Lists](https://www.notion.so/c0dff7f7f9954a1b87789deed86a94db?pvs=21) helps you separate your subscriptions. Think about doing Facebook friends lists to share to different audiences too
* [Twizzle](https://twizzle.app/) helps you focus on message and tweeting

## **Make How-To’s**

Create tutos wwith image and instructions generated automatically :

* [Minerva | Simple How-To guides for the Internet](https://www.minervaknows.com/)
* [Tango | Create beautiful step-by-step guides with screenshots, in seconds](https://www.tango.us/)

## **Work together**

* Online whiteboard with no sign-up : [Witeboard](https://witeboard.com/)
* [Office Editing for Docs, Sheets & Slides](https://chrome.google.com/webstore/detail/office-editing-for-docs-s/gbkeegbaiigmenfmjfclcdgdpimamgkj?__hstc=20629287.a51a184b1f4b68b5a109abeccb174b23.1628192355924.1630000442296.1630011805805.80&__hssc=20629287.1.1630011805805&__hsfp=4043529008) lets you easily drop Microsoft Office files into Google Drive to view and edit them without needing the software installed on your hard drive, for those times when you and your coworkers are working on computers with different operating systems, or want to collaborate on a live document together
* Maybe [Ask the help of an expert](https://clarity.fm/) ?
* You can [Find an associate](https://www.ideasvoice.com/en/home)

## **Write correctly**

![http://desktopenhanced627bd841da6f5.cloud.bunnyroute.com/wp-content/uploads/2022/05/image-822x1024.png](http://desktopenhanced627bd841da6f5.cloud.bunnyroute.com/wp-content/uploads/2022/05/image-822x1024.png)

* [ProWritingAid](https://prowritingaid.com/en/Account/Register?rafid=XboDgggae?hl=en)*) is another smart Chrome extension for checking the grammar, spelling, and clarity of your blog posts, web pages, and articles. Like the other tools on this list, it works with Google Docs and any text editor in your browser. It will catch any errors you make as you write and suggest corrections.
* If you’re not a native english speaker, you should check your grammer and spelling before turning in an essay or sending a work email… you can use [Grammarly: Free Online Writing Assistant](https://www.notion.so/9aca943a171f4f879021deca59db4ca7?pvs=21)
* [LanguageTool](https://chrome.google.com/webstore/detail/grammar-and-spell-checker/oldceeleldhonbafppcapldpdifcinji) is a useful Chrome extension for checking the existing text on a website and checking the grammar of your work as you write. It works in Google Docs and any website where there’s an active text box. It also works for different languages, so if you’re aiming to write for different markets and regions, you’ll most definitely want to add this tool to your arsenal.
* If you prefer to use a website on a case by case basis, use [Online Spell Checker](https://www.notion.so/31596df7e5cd49389ba6f1441b0fb5d8?pvs=21) and also it works for 18 languages !

## **Write faster**

* [PhraseExpress – Text Expander](https://www.notion.so/6724a877298f43df93a5518442fc44bf?pvs=21) is an advanced tool for making snippets, shortcuts & template so you don’t have to always type your adress, your email signature, etc… It syncs across devices and team.
* [aText – Text template, shortcut, expansion for Mac and Windows](https://www.notion.so/76dd86defc5a427e810091bff8d2b5cf?pvs=21) is an alternative much cheaper (4,99$/year), and very efficient.
* There is an alterntive now on Appsumo which looks great so don’t miss it !  [typedesk | Exclusive Offer from AppSumo](https://www.notion.so/51ee1e6e9cc9463dac9981c2da2ff17f?pvs=21)
* [Wordtune](https://chrome.google.com/webstore/detail/wordtune-ai-powered-writi/nllcnknpjnininklegdoijpljgdjkijc) is an AI-powered Chrome extension that provides several alternatives to what’s currently on the page. No matter what tool you’re using — whether it’s Google Docs, Outlook, or another text editor — you can highlight the sentence or phrase you’d like to rewrite, and Wordtune will provide several alternatives. After that, you only have to choose the one you like best.

## **Calendar**

* [Smarty is the fastest way to schedule](https://www.smarty.ai/?trackID=95db4cfc-e1af-4123-b0e2-29318e43a595)
* [Reclaim.ai](https://reclaim.ai/), a scheduling assistant for Google Calendar, lets you set windows for certain “habits” (lunch, writing, exercise), then automatically shuffles those personal time blocks around as meetings get added to your calendar. Others merely see that you’re busy. [web]
* [Lightpad](https://lightpad.ai/) views the calendar as a kind of spiral staircase that you can scroll through, with dots that signify each day’s agenda
* [Akiflow](https://akiflow.com/) centralize you calendar and ads
* [Vimcal – Superhuman for Calendar](https://www.producthunt.com/posts/vimcal)
	* Vimcal is the world’s fastest calendar, beautifully designed for people who work remotely and live in their calendars. It comes fully-featured with timezone conversion, booking links, keyboard shortcuts, and everything else a modern calendar app should have.

## **Hacks**

* [Calligraphr – Draw your own fonts.](https://www.notion.so/51c1c313726c4757b6a2f017ed766dad?pvs=21)
* Learn languages with [Language Reactor](https://www.notion.so/78c81fe01e1b4c3fb47509e7fa5aa214?pvs=21) on Netflix or [LingvoTV](https://lingvo.tv/)
* [CaptionPop](https://www.captionpop.com/?nl=en)
* [Difree](https://chrome.google.com/webstore/detail/difree-distraction-free-t/dbcgoeihoopigakembbkkoobelpmpcnh) quickly opens a new tab for a clean and neutral text editor that auto-saves while you’re working if you need a break from where you normally write. Sometimes it’s hard to free yourself of distractions to write productively, especially if you’re writing online.
* [[Krisp.ai](http://krisp.ai/) | Noise cancellation in online meetings]([](https://www.notion.so/3c9b5617a82b43509bd39e27cba60e02?pvs=21)[https://www.notion.so/Krisp-ai-Noise-cancellation-in-online-meetings-3c9b5617a82b43509bd39e27cba60e02](https://www.notion.so/Krisp-ai-Noise-cancellation-in-online-meetings-3c9b5617a82b43509bd39e27cba60e02)) is an AI-powered app that removes background noise and echo from meetings leaving only human voice. You need it if you work in public spaces.
* Create an avatar [Create an online avatar for free](https://en.xavatar.io/#generateur)
* Quickly make amaizong profile pictures [Free Profile Picture Maker](https://pfpmaker.com/results)
* [DataMask](https://www.notion.so/610e3b1b66bf40ab8ec63e95d461725c?pvs=21) to blur info on screenshots or videos
* [Papier](https://chrome.google.com/webstore/detail/papier/eojkaafbejkilbbgmcgpaenaoandggae?hl=en) turns your New Tab page into a handy, Chrome-based notepad for quickly jotting down ideas that are then saved locally to your Chrome browser, without any need to mess with accounts, logins, or syncing. Papier is a simple tool with some bare bones formatting, but it comes in pretty handy if you don’t want to go through the trouble of switching between Chrome and a dedicated notepad or word processing app.
* [Customize & track your social media links with Switchy](https://www.notion.so/9747fc0a000e4f62b08e607112e43472?pvs=21)
* Did you ever write a giant insightful message somewhere and inadvertedly close the tab or loose focus and lost all of it ? How does it feel ? Ahah, it will never happen again with [Typio Form Recovery](https://chrome.google.com/webstore/detail/typio-form-recovery/djkbihbnjhkjahbhjaadbepppbpoedaa/related)

## **Simplify & clean**

* Protect your privacy and security by deleting your accounts of website you won’t use anymore thanks to [Just Delete Me](https://www.notion.so/daf755e75cc24a179bfdc35a1bad4bd6?pvs=21) , a directory of direct links to delete your account from web services.
* I you want[Ultra Button](https://www.notion.so/5ac8c0e351d14612ba5d868f488dfd15?pvs=21) is a good tool for Chrome
* [minimal](https://www.notion.so/adbb632bb25346e086610e182acf4a7c?pvs=21) allows you to do what [Click to Remove Element](https://www.notion.so/e896f35807be4616b36b4b943ba2d969?pvs=21) can also do, without you involved : an minimalist interface for Gmail, Facebook, and other popular websites. Sometimes you just need a clear view to work flawlessly.
* [Tokimeki Unfollow](https://www.notion.so/4c68935fab024223bf41f0510418b31e?pvs=21)  will offer you a methodical way of proceeding to gradually remove from your timeline the accounts that are cluttering you. You need a little time in front of you and do it in several times if necessary. Forget the automated tools for massive unfollos here we are in haute couture and refined sorting by hand.
* [Decreased Productivity](https://www.notion.so/d5abfe27859a499faf06c26fba9789e8?pvs=21) lets you remove what’s on web pages except for text &/ images
* [Adblock Plus | The world’s #1 free ad blocker](https://www.notion.so/16c94f9905014ba6a6fe3cd8fc96169f?pvs=21)

### TImeboxing

* Capturé sur : [https://lifehacker.com/make-your-days-more-productive-by-timeboxing-1832508849?utm_source=lifehacker_newsletter&utm_medium=email&utm_campaign=2019-02-11](https://lifehacker.com/make-your-days-more-productive-by-timeboxing-1832508849?utm_source=lifehacker_newsletter&utm_medium=email&utm_campaign=2019-02-11) time boxing

Il y a des tonnes de piratages qui prétendent vous rendre plus productif. Maintenant, il s’est avéré qu’un des meilleurs était: le Timeboxing.L'idée derrière le hack est simple. Chaque fois que vous devez faire quelque chose, mettez-le sur votre calendrier. L'idée est que, plutôt que de simplement créer une liste de tâches, vous choisissez en fait une "boîte à heure" qui vous laisse prendre le temps nécessaire pour mener à bien cette tâche.C'est quelque chose que je fais personnellement depuis des années. L'expert en productivité, Marc Zao-Sanders, a récemment examiné 100 des hacks de productivité les plus populaires et a également trouvé que la boxe à temps était la plus utile. Les résultats de son étude ont récemment été publiés dans le Harvard Business Review .Il n'est pas difficile de voir comment la pratique peut réussir.Avec les listes de tâches traditionnelles, vous créez souvent une liste sans vous préoccuper de la durée de chaque tâche. Le résultat final est une liste de tâches quotidienne qui est plus que probablement un peu irréaliste en matière d'exécution. Par exemple, vous pouvez avoir huit heures disponibles dans votre journée, mais votre liste de tâches à effectuer peut contenir 14 heures de travail. Vous allez échouer.En plaçant des éléments sur un calendrier, vous vous obligez à réfléchir au temps que prendra une tâche. Vous bloquez également l'heure sur votre calendrier pour pouvoir le faire, afin de ne pas vous retrouver dans une situation où vous êtes réservé aux réunions toute la journée et que vous ne pouvez pas gérer ce que vous avez personnellement planifié d'accomplir.Vous vous forcez également à prévoir du temps pour les choses difficiles. Les listes de tâches traditionnelles présentent le problème de nous permettre de sélectionner les éléments que nous voulons accomplir en premier. Dans la plupart des cas, nous allons d’abord nous tourner vers les articles les plus faciles et les plus rapides. Bien qu'il y ait certainement quelque chose à dire à ce sujet, si vous continuez à éviter les tâches qui nécessitent un engagement plus long, vous ne les accomplirez jamais.En faisant du timeboxing, vous créez une liste de tâches en même temps que vous créez un plan exécutable (basé sur le temps réel dont vous disposez) pour le terminer.

### Un Imbécile Qui Marche Va Toujours plus Loin Que Deux Intello Assis à Discuter

la productivité c'est une question d'énergie
On confond souvent l’efficacité avec l’hyper-activité. On croit souvent que les personnes les plus efficaces sont les plus occupées, courent sans cesse d’un endroit à un autre, et ne se donnent aucun répit.C’est faux. Ces gens-là donnent (ou se donnent) l’illusion de l’efficacité. Ils sont les victimes d’un besoin maladif de ne pas rester inactif. Et se perdent en détails inutiles, en tâches complexes qui n’apportent aucun résultat.Ils polluent leur esprit avec du bruit, au lieu de prendre le temps de se concentrer sur l’essentiel. Ils se plaignent souvent d’être surchargés de travail, alors qu’ils n’arrivent finalement à obtenir que des résultats médiocres.Etre efficace, c’est être capable d’obtenir des résultats. C’est tout. L’hyper-activité n’a rien n’a voir avec l’efficacité.On est souvent plus efficace lorsqu’on réfléchit avant de passer à l’action. Lorsqu’on élimine ou qu’on délègue ce qui nous demande une dépense d’énergie et de temps trop importante par rapport aux résultats escomptés. Bref, on est plus efficace lorsqu’on se concentre sur l’essentiel.Notre éducation nous joue encore des tours sur ce point là. Notre société considère le temps comme l’échelle de mesure de la valeur d’un travail. On est payé au mois. A l’heure. On travaille “à temps plein” ou “à mi-temps”.Cette vision nous amène facilement à considérer que l’on est efficace à partir du moment où l’on est occupé. Dans la plupart des emplois, on est payé au même prix, qu’on effectue une tâche en une heure ou en cinq.Oubliez-donc ce que vous avez appris : le temps n’est pas un outil de mesure adéquat. Au lieu de compter les heures pendant lesquelles vous travaillez, comptez les résultats que vous avez obtenus, ou les tâches que vous avez menées à bien.Par exemple, si vous écrivez un livre, fixez-vous un objectif quotidien en nombre de pages, pas en heures de travail. Si vous démarchez des clients au téléphone, fixez-vous un objectif en nombre de prospects contactés chaque semaine, et pas en temps passé au téléphone. Si vous cherchez un emploi, fixez-vous un objectif en nombre de CV envoyés par jour, et non pas en temps passé.Vous finirez vite par trouver le moyen d’obtenir les mêmes résultats, plus rapidement. Vous serez alors capable de réviser vos objectifs à la hausse. Ou de prendre le temps de faire autre [chose.Au](http://chose.Au) lieu d’être occupé, vous serez devenu efficace.

abondance est un problème

Ce n’est pas de l’information supplémentaire dont vous avez besoin. Car s’il suffisait d’en savoir plus, quiconque disposant d’une connexion internet vivrait dans un palais doré, aurait une santé de fer et serait pleinement heureux ! Vous avez juste besoin d’une nouvelle vision, d’une nouvelle approche et d’un nouveau plan d’action, détaillé et tangible. Il temps d’adopter des nouveaux comportements et de nouvelles habitudes pour cesser de vous saborder. Il est temps de vous ouvrir au succès business. Appliquez immédiatement à votre entreprise les exercices et les principes éprouvés présentés dans ce livre, et vous obtiendrez des résultats tangibles et durables que vous désirez.

Quand je vous dis “Entrepreneur productif” - quelle image vous vient en tête ?

Quelqu’un qui se lève aux aurores et qui travaille tard dans la nuit ?

Qui est connecté 24h/24 et 7j/7 ?

Qui passe ses journées à abattre une to-do list interminable, à répondre à des mails, à passer des appels ?

C’est un problème… car personne n’a envie de vivre comme ça !

Heureusement, la vraie productivité ce n’est pas courir dans tous les sens sans réfléchir.

Quand j’entends “Entrepreneur productif”, je pense à ça :

3 heures bloquées sans interruption.

Une tâche claire à accomplir.

Un bon café.

Une playlist Spotify.

Téléphone éteint.

Aucune distraction.

En quelques heures à ce rythme, je peux accomplir beaucoup plus de résultats qu’en une semaine entière d’action frénétique.

---

L’explication se trouve dans le livre Deep Work de Cal Newport : à mesure que la technologie progresse, deux choses se passent :

Il devient plus difficile de se concentrer (car les distractions sont toujours plus nombreuses)

La créativité est toujours plus récompensée (car nos créations font levier sur les nouvelles technologies et peuvent toucher plus de monde)

Par créativité, j’entends toutes les tâches qui vous demandent d’inventer quelque chose de nouveau :

Créer une vidéo YouTube

Concevoir une nouvelle campagne marketing pour votre site ecommerce

Préparer une proposition commerciale pour un client potentiel

Coder une nouvelle fonctionnalité dans une application

Trouver un business model innovant

Identifier une niche sous-exploitée

Toutes ces activités créatives ont une chose en commun : elles demandent de vous concentrer sur une longue période de temps pour :

Maîtriser des “compétences profondes”

Trouver une nouvelle solution à un problème

L’opportunité vient de là : la concentration est de plus en plus précieuse… mais de moins en moins de gens en sont capables.

Logiquement, ça veut dire que développer votre capacité à vous concentrer va avoir un énorme retour sur investissement dans les années à venir.

Par exemple, l’email que vous lisez va toucher des dizaines de milliers d’abonnés. Même en travaillant 12 heures par jour, 7j/7, je ne pourrais jamais parler directement à autant de monde en une année entière !

Le levier technologique est tel que notre créativité devient plus importante que le nombre d’heures travaillées.

---

En développant votre capacité de concentration, vous pouvez être productif ET zen.

D’ailleurs, c’est devenu indispensable.

Pensez-vous que l’entrepreneur qui travaille frénétiquement 12 heures par jour est créatif ?

Probablement pas.

Il essaie de résoudre ses problèmes par la force brute de “plus d’heures travaillées”, mais il va tôt ou tard réaliser qu’il n’y a jamais assez d’heures dans la journée.

C’est comme ça qu’on en arrive au burn-out et qu’on finit par jeter l’éponge.

Souvent, il y a une solution créative qui permet de contourner le problème.

Par exemple, si vous voulez trouver plus de clients, la solution “gros bourrin” est de faire plus de rencontres, d’appels, de rendez-vous, de relances…

La solution créative est de créer une proposition de valeur naturellement attractive pour vos clients ou créer du contenu qui devient viral parmi vos clients cibles.

[A Revolutionary New Time Management System Designed For The 21st Century. — Carl Pullein](https://www.carlpullein.com/blog/a-revolutionary-new-time-management-system-designed-for-the-21st-century/1/5/2020)

What's Microproductivity? The Small Habit That Will Lead You To Big Wins

* [Pourquoi les “méthodes de productivité” ne marchent jamais pour vous (et que faire à la place) - deforesd@gmail.com - Gmail](https://mail.google.com/mail/u/1/#inbox/FMfcgxwKjwzbHxlhrvrKGFLMkpppRFTj)
* Quand j’ai commencé mon business, je faisais des plans fantasmagoriques. Je planifiais mes 5 prochains produits et je projetais mes revenus sur 3 ans (alors que je n’avais pas encore de clients). Ne riez pas - c'est ce que j’avais appris en école de commerce. 🤦‍♂️ Rapidement je me suis rendu compte que ça n'avait aucun sens : Je n’avais pas les informations pour prendre des décisions utiles (comment savoir quelle stratégie va marcher avant d’avoir commencé ?) J’avais des doutes permanents ( “Est-ce que j’ai choisi la bonne stratégie ? Ou est-ce que je devrais faire de la pub Facebook ? Des webinaires ? De l’affiliation ?”) Le monde changeait trop vite. Mon plan était périmé avant même de l’avoir mis en application (2020 a dû mettre une sacrée claque à ceux qui font des plans le long terme ![😱](https://mail.google.com/mail/e/1f631)). Pire du pire : je passais plus de temps à planifier qu’à travailler !
* malgré tout le temps perdu à planifier), je me retrouvais à improviser mes tâches au jour le jour. Autant dire que je n’étais pas efficace au quotidien : Je passais du temps sur des choses “urgentes mais non importantes” - et les fondamentaux qui faisaient vraiment avancer mon business (comme créer du contenu et faire des ventes) passaient à la trappe J’avais l’impression de crouler sous les tâches à faire, sans savoir par quoi commencer Je n’avais aucune vision de mon futur Je passais d’une stratégie à l’autre au gré de l’inspiration du moment, sans jamais assez persévérer pour décoller Quelle frustration !
* la méthode des plans de 90 jours. L’idée est simple à décrire : faites un plan pour les 90 prochains jours. Engagez-vous à le suivre. Dans 90 jours, mesurez les résultats et faites un nouveau plan. Les bénéfices se sont fait sentir immédiatement : A tout moment, j’ai assez d'informations pour prendre une décision sur les 90 prochains jours (même si je ne suis jamais vraiment capable de me projeter sur 1 an). Et si je me trompe, ça n’est pas si grave ! Je n’ai perdu que quelques semaines, j’ai appris quelque chose et je peux repartir dans une autre direction Je me suis engagé sur 90 jours. Ce point est crucial, car je n’ai plus besoin de douter. Une fois que j’ai fait mon travail de réflexion en profondeur, j’arrête de questionner mon plan. Tous les doutes, les nouvelles tactiques à la mode et les idées annexes vont dans un dossier : “À considérer pour le prochain Plan”. C’est incroyablement libérateur. Chaque lundi, je crée un plan pour la semaine basé sur mon plan de 90 jours. Et chaque matin, je choisis mes tâches selon le plan de la semaine. Donc je sais toujours exactement quoi faire en priorité.
* Les plans de 90 jours jouent sur un biais cognitif majeur de l’esprit humain : Nous avons soif de satisfaction immédiate. C’est pour ça que c’est aussi difficile de mettre de côté pour notre retraite ou de suivre un plan de musculation sur 1 an : c’est trop loin ! Le plan de 90 jours vous donne la sensation d’avancer chaque jour (et même chaque heure) de travail.
* . À chaque fois que je termine une tâche, je reçois un shot de dopamine, ce fameux neurotransmetteur qui signale à notre cerveau la sensation de “récompense”. C’est la dopamine qui fait que nous créons des addictions, que ce soit à la cocaïne, aux machines à sous ou à consulter notre téléphone dès que nous avons une notification. Cette même hormone est relâchée dans mon cerveau dès que je barre une tâche de mon plan de 90 jours. Imaginez si vous étiez accro à accomplir des choses importantes dans votre business ! Vous seriez une fusée en trajectoire directe vers la lune.
* Bien souvent, nos journées se terminent tard car nous perdons du temps dans des réunions, des emails, des tâches techniques ou des projets annexes qui ne servent pas nos priorités. Quand vous identifiez ce qui est vraiment essentiel et vous concentrez dessus, vous pouvez faire plus de progrès en quelques heures que la majorité des gens en font pendant une journée entière. Votre temps de repos est important pour retrouver l’énergie de faire ces tâches essentielles : créer, décider, inspirer, vendre… Donc il faut travailler moins que la moyenne des gens - mais stratégiquement investir vos heures dans les bonnes tâches. La plupart des méthodes de productivité ne prennent pas en compte la psychologie humaine. Et c’est pour ça qu’elles échouent. À quoi bon une super méthode avec des outils de pointe et des diagrammes compliqués si vous l’abandonnez au bout de 3 semaines ? Pire : la plupart des méthodes ne prennent pas en compte que les choses changent très vite sur internet - donc un système rigide est voué à l’échec. Sans parler des distractions permanentes qui tambourinent sur le cerveau de n’importe quel entrepreneur du web. Dans ces conditions, c’est un miracle que nous puissions accomplir quoi que ce soit !

### L'outil Concret The Daily Notes

The Daily Note is the first thing you'll see when you open your database: an empty page with today's date at the top.

So what to do? Start writing!

What about structure?

The bullet form of the notes, with the possibility of indenting and un-indenting, provides some structure, but organizing further according to some hierarchy or template is not necessary, to begin with.

Structure, connections, patterns will emerge bottom-up: and every day is a new iteration!

The magic of networked thought starts with…

\[\[Page references\]\]

Putting words or phrases (even emojis!) in between a pair of square brackets creates a bidirectional link to a newly created page.

When you enter the page by clicking on the link, you will see, at the bottom of the page, all the places where that page was referenced.

Say you create the page \[\[sleep\]\] in various contexts: when you journal in the morning, when you read an article about sleep hygiene, when you plan for your next road trip. All these references will appear in their original context at the bottom of the \[\[sleep\]\] page.

Here's a challenge for you try this week. Each lesson moving forward will include a new challenge of increasing complexity.

Challenge I

Start a daily journal practice of writing \[\[Morning pages\]\] (or any other tag) in your Daily Notes.

[The Study Efficacy of Time Management Training on Increase Academic Time Management of Students - ScienceDirect](https://www.sciencedirect.com/science/article/pii/S1877042813015905)

Mesurer pour progresser Pourquoi utiliser un logiciel de time tracking ? Le quotidien d’un entrepreneur est composé de centaines de choses différentes à faire, plus ou moins importantes, urgentes ou nécessaires pour le développement de son activité. A cela viennent s’ajouter les distractions liées au contexte, au matériel utilisé et aux clients.

Du coup, il est difficile de gagner du temps.

Sans un minimum d’organisation, de routines, d’outils pour vos To Do List et d'un minuteur en ligne, vous aurez vite tendance à perdre pied. Comme je l’explique souvent dans mes articles, prendre le contrôle de votre temps est vital dans votre activité.

En maîtrisant votre temps, vous maîtrisez vos dépenses (le temps, c’est de l’argent), vos différents projets professionnels et votre vie personnelle. Vous permettez un équilibre favorable à la réussite de vos actions sur le long terme.

Suivre son temps peut paraître un peu extrême au début. Surtout pour un cerveau droit qui préfère être libre et créatif. Mais, justement, dans la liberté et la créativité, il y a aussi des possibilités de perte de contrôle. Il est important de ne pas laisser les choses sans encadrement.

En suivant votre temps avec ces outils, vous aurez une vue concrète au fil du temps sur les différentes actions réalisées.

C’est une piste sérieuse pour optimiser vos journées en trouvant les tâches à automatiser, à sous-traiter ou à supprimer en fonction de leur importance et des gains générés. Vous vous concentrerez sur l’essentiel et gagnerez du temps libre.

Si j’ai eu beaucoup de mal à commencer à suivre mon temps, je dois reconnaître que, maintenant, je trouve cette action indispensable. Je préfère suivre mon temps que fuir ma liberté.

J'espère que ces outils vous aideront à optimiser vos journées et vous dégageront du temps libre. Vous pouvez compléter cette liste avec vos outils favoris dans les commentaires.

Bonne découverte.

[Es-tu un HIBOU ?!

**Selon l'Inserm** (Institut national de la santé et de la recherche médicale), presque toutes les fonctions biologiques humaines sont soumises au **rythme circadien** imposé par ce que l'on appelle **« l'horloge interne »**.

**Le « rythme circadien », c'est ça :**

**En fin de journée**

, la tension artérielle augmente, le corps commence à sécréter de la mélatonine qui favorise l'endormissement et le système digestif se met en pause.

**Pendant la nuit**

, la température corporelle baisse, les organes sont moins actifs et la mémoire se consolide. Entre 2 et 4 heures du matin, la mélatonine atteint son pic de sécrétion, ce qui favorise le sommeil profond.

**Au réveil**

, la température corporelle est au plus bas et augmente graduellement au fil de la journée. En milieu de matinée, le taux de testostérone est au plus haut, le niveau d'éveil et d'attention est maximal et chute durant l'après-midi.

**Maintenant imagine** que toutes tes journées puissent se dérouler en harmonie avec ton horloge interne et que chaque action puisse être effectuée de manière optimale au moment idéal…

Tu te réveilles en forme, reposé et prêt à dévorer la journée qui t'attend

Tu débutes ta journée par des actions énergisantes et vertueuses sur le long terme

Tu profites de ton plein potentiel intellectuel en travaillant aux moments opportuns

Tu utilises le sport pour gagner de l'énergie et non pour en dépenser

Tu termines ta journée de manière optimale avec le sentiment du devoir accompli

Tu peux même exploiter l'énergie des autres aux moments où tu en as le moins

**C’est ce que je vis au quotidien :** mes journées sont réglées comme du papier à musique et ça fait 10 ans que j’en optimise chaque aspect.

* *J’appelle ça le **[**Power Day**](https://a3mailer.jmcorda.com/index.php/r/40f4d34515288720224f4bc89?ct=YTo1OntzOjY6InNvdXJjZSI7YToyOntpOjA7czoxNDoiY2FtcGFpZ24uZXZlbnQiO2k6MTtpOjgwMzt9czo1OiJlbWFpbCI7aTo1ODk7czo0OiJzdGF0IjtzOjIyOiI1ZmUyMGNlZTQ1NzRmMTgzODIwNjY0IjtzOjQ6ImxlYWQiO2k6OTA4Mjg7czo3OiJjaGFubmVsIjthOjE6e3M6NToiZW1haWwiO2k6NTg5O319&).
* So'rganiser
* Réaliser une carte mentale vous aide à créer, extraire, organiser et présenter des idées ou des flux de données. Un Mind Mapping est également une manière simple de générer des nouvelles idées ou de cartographier une réflexion et les différents cheminements de vos idées.
* Avec une carte mentale on obtient ainsi une vision d'ensemble sous la forme d'une structure plus facile à assimiler, à comprendre et à partager.
* Dans le domaine du Web les utilisations de Mind Mapping sont fréquentes et variées. On peut par exemple utiliser des cartes mentales pour gérer l'architecture d'information d'un site Internet, son arborescence etc. On peut se servir également d'un logiciel de Mind Mapping pour trouver un nom d'entreprise, un concept de site, des idées de contenu autour d'une thématique, développer une stratégie de référencement etc.
* Ces outils vous permettront d'organiser votre pensée et de trouver des nouvelles pistes pouvant créer une façon de faire ou de voir sous un angle différent et originale.

### On Procrastine Naturellement Ce Qui Ne Fait Pas Parti de Nos Valeurs

Est-ce qu’il t’arrive de procrastiner ?

Je te rassure, c’est complètement normal. Ça nous arrive à tous.

Le seul problème, c’est que si on procrastine trop longtemps, on perd trop de temps.

Et tu sais bien que si on perd du temps, on perd de l’argent.

Je veux donc te donner TROIS SOLUTIONS efficaces pour limiter les dégâts.

* *Solution #1 - Remplir au moins trois tâches importantes

Il s’agit de déterminer trois tâches qui devront absolument être réalisées dans la journée.

Elles ne doivent pas demander trop de réflexion.

Elles pourraient même être réalisées de façon quasi-automatique. Par exemple, répondre à des e-mails, s’occuper de tâches administratives, etc.

* *Solution #2 - Faire du kiff

La seconde option consiste à sauver ce qui peut être sauvé.

Tu dois donc t’occuper des tâches qui ne sont pas urgentes… mais que tu seras quand même fier d’avoir accompli à la fin de la journée (ranger des dossiers, consommer une formation en mode “Netflix”…).

* *Solution #3 - Accepter ta perte

Le sentiment de perte est l’un des plus difficiles à accepter pour l’être humain.

Mais il faut parfois admettre que la journée est gâchée… Dans ce cas, il faut juste assumer de ne rien faire.

Fait la différence entre “persévérance” et “obstination improductive.”

### Atteindre Ses Objectifs

The key is to set SMART goals. Here, SMART is more than an adjective. It stands for:

**S**pecific

**M**easurable

**A**chievable

**R**ealistic

**T**ime-bound

LE TABLEAUX DES HABITUDES

il utilise le biais de cohérence et d'engagement pour te faire remplir tes journées comme tu l'aimerais

les app mystrike et calm l'utilisent aussi

### Méthodes

For Working Smarter, Not Harder

Classer ses documents et en finir avec le fouillis numérique contreproductif

méthode de classement des documents

Il y a de ce quelques temps, de nombreux fichiers étaient éparpillés le bureau numérique de mon ordinateur, ce qui rendait facile la recherche des fichiers que j'utilise le plus. Du moins, j'y croyais. Tandis que je devais respecter des délais serrés, je me suis rendu compte que trouver ce fichier vital parmi le fouillis de mon bureau virtuel était un travail fastidieux. Mais un bureau virtuel ne sert-il pas justement à y mettre des dossiers et des fichiers ?

Ben en fait, non. Mon approche de recherche et de gestion de fichiers entravait ma capacité à travailler. Bien sûr, il n’a fallu que quelques instants pour analyser visuellement les fichiers, en particulier ceux que j’avais mémorisés. Un jour, j'ai tout simplement manqué d'espace. J'avais besoin d'une nouvelle méthode de classement de mes documents. Mais laquelle ?

La méthode de classement des documents: Desktop Zero

La méthode du Desktop zéro fonctionne comme la fameuse Inbox zéro : elle apporte un sens de l'ordre surprenant. En finir avec le fouillis est un souffle de pixels frais. Récupérer de précieux espaces de travail me permet de me sentir mieux organisé et de garder le contrôle. Je maintiens mes fichiers et mes dossiers organisés pour m'aider à trouver rapidement ce dont j'ai besoin, quand j'en ai besoin.

Il s’avère que cela va plus loin que la simple organisation de fichiers. Des études montrent que les personnes travaillant dans des environnements de travail moins encombrés sont plus heureuses et plus productives. Mettre en place une méthode de classement des documents pour un Desktop zéro m'a également aidé lorsque que je faisais souvent des présentations à des clients. Avec le logo de la société comme image de bureau virtuel, un bureau exempt d’encombrement a aidé mon public à se concentrer sur ce que je présentais (et moi, à cacher les coulisses de mon travail).

méthode de classement des documents

Ce n’est pas pour tout le monde. Certaines personnes aiment trouver ces fichiers importants à l’endroit où elles les ont laissés : à des endroits pratiques, toujours visibles (même derrière les fenêtres). L'esprit du desktop zéro est plus important que la réalisation même du classement de dossiers.

Comment ça marche

Pendant plusieurs semaines, j'ai eu du mal à choisir une méthode de classement de mes documents. A un moment donné, je me suis dit, je vais faire table rase. Et bien que la technique spécifique demande du travail, à ma grande surprise, elle a fonctionné. Voici comment :

* Créez un dossier sur votre bureau nommé «Archive du bureau».Déplacez tout ce qui se trouve sur votre bureau virtuel dans le dossier « Archive du bureau ».Au cours des cinq prochains jours, vous constaterez probablement que vous avez besoin de certains de ces fichiers. Lorsque vous le faites, replacez-les sur le [bureau.Au](http://bureau.Au) bout de cinq jours, organisez ce qui reste du dossier « Archive du bureau» dans le dossier de votre choix.Répétez la procédure à chaque fois que votre bureau commence à paraître trop encombré pour plus de confort.

Stratégies pour organiser ces autres fichiers

méthode de classement des documents

Alors, que faites-vous avec les fichiers qui restent dans le dossier «Archive du bureau» ? Si ils ne sont pas assez importantes pour une utilisation hebdomadaire, classez-les. Mais où ?

Organiser par client

Si vous travaillez pour une entreprise avec des clients (externes ou internes), une stratégie évidente et facile pour organiser votre travail est de créer un dossier par client. À l'intérieur de celui-ci, créez des dossiers par projet. Et – cerise sur le gâteau - à l'intérieur de chaque dossier de projet, je suggère de créer un dossier de versions.

Des modifications et des changements surviennent tout le temps. Les projets sont mis à jour. Les sites Web et les prospectus bénéficient de remaniements et d´un rafraîchissement. La possibilité de recommencer à zéro tout en revoyant d'anciens travaux est essentielle pour faire avancer un projet.

* Client -> Projet -> Version -> (Fichiers)Organiser par type

Si votre compte d'utilisateur contient des dossiers pour des films, des images, des documents, etc., je vous conseille de les exploiter. Besoin d'un graphique ? Besoin d'une vidéo ? Vous saurez où chercher.

* Images -> Espace et astronomie -> (fichiers)Documents -> Banking -> (fichiers)Films -> Horreur -> (fichiers)Organiser par date

Si vous n'avez pas le temps pour une autre approche, essayez de classer vos fichiers en fonction de la date. Pour ce faire, utilisez la méthode de classement de dossier Desktop zéro, mais créez un nouveau dossier «Archive du bureau» avec une date, par exemple. “Archives 2016-01-01” et “Archives 2016-01-07”, etc.

Cela peut paraître moins utile, mais cela prend moins de temps que de réfléchir à la place de chaque fichier dans l’univers de votre système d´organisation.

Organiser par sujet

Aujourd'hui, beaucoup d'entre nous ont plusieurs rôles dans un même emploi : rédacteur, codeur, présentateur, concepteur, gestionnaire et mentor, pour n'en nommer que quelques-uns. Comme vous pouvez le deviner, vous devriez essayer de créer un dossier pour chaque, subdivisé en projets avec des dates. Par exemple :

* Tutoriels -> Desktop Zero, Jan 2016 -> (fichiers)Vidéos -> Appli d´onboarding, février 2016 -> (fichiers)Mail -> Newsletter, mars 2016 -> (fichiers)Organiser par objectif

Qu'essayez-vous de faire ? Dans quel but ? Rappelez-vous en quoi consiste la vue d'ensemble de votre travail (ou de votre vie personnelle) en triant les fichiers dans des dossiers d'objectifs tels que :

* Inside Sales -> Transformations -> Brochure, Mai 2016Support informatique -> Analytics -> Tableau de board, Juin 2016Amélioration de la communication -> Suite d’outils pour les C-level -> Présentation trimestrielle, juillet 2016Santé -> Vacances -> Tahoe, août 2016Utiliser un logiciel pour vous aider

Laissez les ordinateurs gérer le travail difficile. Ils sont bons dans ce domaine, quand ils sont configurés correctement.

Hazel

méthode de classement des documents

Hazel by Noodlesoft est un excellent outil pour garder votre bureau virtuel bien rangé. Par exemple, tout fichier «ajouté aujourd'hui» est déplacé vers un dossier nommé DT2. Utilisez ce dossier pour trier les fichiers par type et par date. Ensuite, organisez périodiquement les fichiers de DT2 comme décrit ci-dessus.

Mots-clé

méthode de classement des documents

Les dossiers intelligents et les mots-clés sont une fonctionnalité souvent négligée du MacOS. Ils fonctionnent essentiellement comme une fonctionnalité de "recherche enregistrée", et vous pouvez définir les filtres pour tous les noms de fichiers que vous voulez. Vous pouvez même le configurer pour rechercher des types de fichiers et des applications spécifiques.

En vous inspirant d'une idée de tableau de calendrier éditorial Trello, créez des étiquettes comme «Actif», «En attente» et «Archivé» pour la plupart de vos fichiers de projet. Par exemple, une recherche rapide dans le système des fichiers «Actifs» montre tout ce que vous avez sous ce label.

Aller de l'avant

Des années se sont écoulées depuis la première fois que j´ai éprouvé le besoin d’éliminer, ou tout au moins de gérer, l’encombrement de mon bureau virtuel. Et il n’a pas fallu autant d’efforts que je le craignais pour garder les choses en ordre. Je n’ai pas ressenti le manque d’avoir des fichiers à portée de main car ils sont restés organisés avec les fichiers associés.

Cette méthode de classement de dossier en mode Desktop zéro ne fonctionne peut-être pas pour tout le monde, et je vous suggère d'explorer vos propres solutions. Vous pourriez être surpris par le gain de productivité, ou par une dose de santé mentale que vous ne saviez même pas que vous aviez perdue.

* Une myriade de méthodes d'organisation pour vos projets personnelsmethode-organisation-travailRegarder Netflix ou écrire une nouvelle? Sortir avec des amis ou réseauter sur Linkedin? Dormir ou coder? Pas facile de se décider (ou alors, c’est très facile: Netflix, sortir, dormir).Les 35 heures de travail hebdomadaire paraissent s’allonger encore et toujours; certaines études montrent que 24% des actifs travaillent même en moyenne 52 heures par semaine.Le temps nous glisse entre les doigts, et notre énergie s’échappe avec lui. Difficile dans ces conditions d’investir du temps dans un projet personnel malgré notre envie, sans avoir de bonnes méthodes d’organisation du travail. Des recherches ont pourtant montré qu’avoir des projets personnels améliore la performance au travail, favorise la créativité, l’inspiration et contribue à notre [bien-être.Et](http://xn--bien-tre-o1a.Et) si vous aviez une méthode d’organisation du travail et de gestion de votre temps qui vous permette de mener à bien un projet personnel, alors que vous n’avez le temps de rien? Ç'a été ma mission ces dernières années, jonglant entre mon travail - que j’adore - et des projets parallèles qui me tiennent à coeur.Voici les 6 étapes de ma méthode d’organisation pour faire en sorte de réaliser vos projets personnels même si vous n’avez pas le temps.Inspirez vous de la méthode d’organisation préférée des startupsmethode-organisation-travail-1L’image ci-dessus provient d’Eric Ries, l’homme qui a rendu célèbre la théorie du développement de produit lean, un concept clef pour les meilleures startups et entreprises SaaS.Lorsque je commence un nouveau projet, j’ai l’habitude d’imaginer ce dernier six mois plus tard à un stade de développement avancé que je pense raisonnable. Mais l’approche la plus efficace, c’est une méthode d’organisation lean.Voici un extrait du Harvard Business Review:Au lieu de s’embarquer dans des mois de planification et de recherche, les entrepreneurs lean partent du principe que tout ce qu’ils ont sous la main le premier jour, ce n’est rien de plus qu’un ensemble d’hypothèses non vérifiées - des paris, en somme. “Lean” signifie apprendre aussi vite que possible, et définir la prochaine étape à partir de ce que vous avez appris dans l’étape précédente. Et si votre projet ne concerne pas la création d’une startup dans votre temps libre, pas de soucis: utiliser la méthode lean d’organisation du travail est compatible avec n’importe quel projet personnel.En voici les grandes étapes:Prenez votre super idée.Débroussaillez votre idée pour en avoir une vision claire.Élaborez une sorte de prototype, pour avoir un premier retour d’expérience.Mesurez et analysez.Apprenez.Alimentez votre idée avec les leçons apprises et recommencez le [http://cycle.Et](http://cycle.Et) voici en prime les grandes étapes d’un projet parallèle pour-de-vrai que je suis entrain de mener:Je souhaite monétiser mon site en vendant des livres blancs sur le marketing.Est-ce que des personnes seront intéressés pour acheter mes livres blancs?Créer une landing page (Unbounce) et implémenter un système de paiement (Gumroad) pour un livre blanc sur le marketing qui n’existe pas encore.Mesurer le nombre de pré-commandes.Apprendre, en analysant l’idée initiale et l’intérêt des visiteurs, si c’est une bonne idée de projet parallèle pour générer des revenus.Décider quelle est la prochaine étape (peut-être que ça sera “Fonce”, ou alors “Fais un nouveau test!”).Créez votre propre RoadmapGrâce au développement Lean, vous avez désormais une super idée qui en plus a été validée par des données objectives! Vous êtes une source d’inspiration pour vos proches :)Cela n’en reste pas moins un grand défi: un projet parallèle qui vous demandera sans doute plus de temps que la réserve de temps dont vous disposez. Ce qui rend la prochaine étape encore plus stratégique dans votre méthode d’organisation: après avoir définitivement fait votre choix sur le projet, tracez le cheminement de sa réalisation.En termes techniques, on parle de “roadmap” ou feuille de route.Vous commencez par visualiser votre objectif dans un futur proche, puis vous déroulez toutes les étapes nécessaires pour l’atteindre en revenant en arrière “jusqu’à aujourd’hui” (c’est un retour vers le présent). Pour ma part, l’une des méthodes d’organisation du travail qui m’a le plus aidé pour gérer mes différents projets est une approche Agile, qui n’est qu’une manière élégante de décrire “une approche qui permet d’avancer rapidement”. A partir de la définition des principes d’Agile découlent tout un tas de stratégies. Voici trois outils qui m’ont beaucoup aidé pour gérer mes projets:1. KanbanLa méthode d’organisation Kanban vise à se concentrer exclusivement sur le travail en cours. Une fois qu’une tâche est complétée, vous passez à la suivante à partir du haut de la liste de backlog.1. ScrumScrum est une méthode d’organisation qui divise un projet en “tronçons” qui sont autant d’itérations, et qui correspondent à des intervalles de temps dont la durée est fixée. Cela permet à l’équipe d’envoyer en production des actualisations de manière très régulière.1. SprintsUn concept de Scrum, le sprint est une courte période (idéalement moins de 4 semaines) pendant laquelle vous vous concentrez exclusivement sur une partie du projet et incluant la mise en production de cette [partie.Je](http://partie.Je) suis un grand admirateur de ces trois méthodes d’organisation, et j’ai utilisé Kanban en particulier pour mes derniers projets personnels.Trello est un outil idéal pour gérer vos projets suivant la méthode Kanban, je l’utilise pour gérer mes projets et accompagner leur avancement. Par exemple, un de mes projets concerne la publication tous les mois d’un contenu sur mon blog ainsi que l’envoi d’une newsletter. Une fois planifié sur Trello, c’est (presque) comme si c’était fait!methode-organisation-travail-2J’ai ajouté toutes mes idées de contenus dans la colonne de gauche avec une date de publication sur mon calendrier Trello afin de recevoir un email quand l’échéance approche. La colonne du milieu contient toutes sortes d’idées que je souhaite tester sur le blog (je dois encore appliquer la méthode lean pour chacune de ces idées!).J’ai créé la troisième colonne en intégrant IFTTT, Pocket et Trello afin que tous les articles que j’ajoute en favoris soient enregistrés dans une colonne sur mon tableau Trello pour un envoi ultérieur dans ma newsletter.Arrêtez de manger des grenouilles vivantesmethode-organisation-travail-3“Mangez une grenouille vivante en vous levant, rien de pire ne vous arrivera le reste de la journée !.” - Mark TwainLa fameuse citation de Mark Twain est devenue un grand principe pour améliorer ma productivité et mon workflow quotidien. Elle signifie qu’il faut se concentrer dès le matin sur les tâches les plus rebutantes ou difficiles, celles que l’on a le moins envie de réaliser. Cependant, je ne suis pas sûr que cela s’applique pour l’organisation des projets personnels. Moins il y a de “grosses grenouilles”, mieux c’est. Personnellement, je ressens une certaine appréhension si je dois affronter une tâche très ardue. Je suis moins excité à l’idée de commencer. Je me sens un peu submergé et cela m’empêche d’avancer, même si mes craintes sont peut-être infondées et la tâche peut prendre moins de temps que je ne le pense.C’est pourquoi j’essaye de me passer le plus possible des “grosses grenouilles”. À la place, j’ai un tas de “petites grenouilles”.En bref, divisez vos grandes tâches en de plus petites tâches. Je pense que n’importe quelle tâche peut être découpée en de plus petites tâches, et ce plusieurs fois, jusqu’à ce que cela corresponde à votre motivation ou votre temps libre.Par exemple, si vous devez écrire un article de blog, commencez par écrire le titre. Si vous souhaitez coder une application, choisissez d’abord un bon livre sur le sujet (old school!). Si vous voulez sculpter un canoë en bois, faites d’abord de la place dans votre garage pour y stocker le tronc.Multipliez-vous grâce à l’automationDans cette optimisation de mes méthodes d’organisation du travail, un des moments les plus “Wahou!” a été quand j’ai découvert l’existence d’un outil qui pouvait programmer mes messages sur les réseaux sociaux (j’ai tellement adoré que je travaille pour eux maintenant).Est-ce qu’il n’y aurait pas quelque chose que vous faites aujourd’hui, et qui pourrait être automatisé ou optimisé grâce à la technologie?C’est une question un peu tordue, “vous ignorez ce que vous ne savez pas encore”. Pour prendre conscience de ces opportunités, cela vaut la peine de se tourner vers quelques sites de référence.IFTTT et ZapierCes deux services connectent des applications entre elles, pour qu’une action quelque part (par exemple, la publication d’un tweet) déclenche une action autre part (par exemple, insérer le tweet en question dans un tableur).Un avantage très appréciable de l’utilisation d’IFTTT et Zapier réside dans la découverte de nouveaux outils. IFTTT m’a permis de découvrir Buffer, Evernote et Pocket. Zapier m’a également permis de connaître de nombreux outils.Tout cela grâce à leur page listant toutes les services connectés - IFTTT les appelle des channels, Zapiers des zaps.methode-organisation-travail-4methode-organisation-travail-5Encore aujourd’hui, je m’aperçois que IFTTT est connecté à Medium, et je ne peux m’empêcher de commencer à imaginer toutes les manières cool d’intégrer Medium dans mes méthodes d’organisation. Par exemple, en créant des brouillons d’articles directement à partir de mes notes sur Evernote (génial, je vais essayer!).Planification de Tweets, réseaux sociaux, alertes… ouf!Voici un résumé de quelques tactiques d’organisation:Réseaux sociaux (pour faire connaître votre projet)Voici un moyen sympa de gagner du temps: vous souhaitez maintenir une présence constante et quotidienne sur les réseaux sociaux, mais vous n’avez que les samedi après-midi pour vous dédier à ce projet.Paf, problème résolu! Les principaux outils de gestion des réseaux sociaux offrent des fonctionnalités de planification des posts, afin de publier sur Twitter, Facebook, Pinterest et autres que vous soyez ou non connecté.J’utilise Buffer pour la planification de mes publications. J’adore leur système de file d’attente des posts, très intuitif et utile. Hootsuite, Sprout Social, et Meet Edgar sont d’autres alternatives très utilisées également.Rappels d'événements (pour ne rien rater)Dans le même esprit que la découpe de grandes tâches en activités plus petites, et la création de la feuille de route de votre projet, la gestion d’un calendrier et d’événements peut devenir une pierre angulaire de vos méthodes d’organisation du travail. Il y a un tas d’outils super qui peuvent vous aider.En utilisant les dates d’échéance sur Trello, vous recevrez des emails de rappel lorsque la date fatidique approche.Gmail dispose d’un outil calendrier très soigné qui affiche de petites notifications d’événements en bas à droite, très utile lorsque vous êtes en train de chatter sur Hangout au moment où vous devez basculer sur une autre tâche.Alertes et notifications (suivez les tendances)L’une des occupations qui me fait perdre un temps précieux consiste à errer sur le web sans but, même si je me justifie en me disant que je suis à la recherche de quelque tendance ou nouveauté. Mais il est beaucoup plus simple que les articles et les idées viennent à moi!Google Alerts est un classique du genre, en vous permettant de dénicher pour vous et de vous envoyer des articles par email, s’ils contiennent les mots-clefs que vous choisissez.Dans la même veine et tout aussi efficace, il y a Nuzzel, qui vous envoie un email quotidiennement avec les news les plus partagés par vos amis sur Twitter et Facebook. Mon petit conseil pour intégrer cette méthode d’organisation dans vos projets: créez un nouveau compte Twitter et Facebook, et suivez uniquement les personnes importantes par rapport à votre projet en cours. Puis connectez vos 2 comptes avec Nuzzel. Voilà! Des news personnalisées et ciblées juste pour votre projet.Jamais d’échéance!(et autres conseils bizarres à propos des objectifs)À la longue, j’ai remarqué que les astuces qui s’appliquent pour les projets personnels parallèles ne sont pas les même que pour votre travail. En réalité, la plupart du temps c’est même l’inverse.Les projets réalisés en parallèle suivent une méthode d’organisation du travail bien différente que le travail “ordinaire”. Ils ciblent une partie différente de votre cerveau et se fondent dans notre vie de tous les jours de manière bien particulière. De fait, ils obéissent à leurs propres [règles.Ma](http://xn--rgles-4ra.Ma) première règle #1: Si vous ne respectez pas votre échéance, pas de soucis.C’est pour moi la règle la plus importante: pardonnez-vous! Ne respirez pas au rythme des échéances. Votre supérieur qui vous met la pression, c’est vous. Donc pas si vous ne voulez pas vous stresser, pas de problème. Je me remémore régulièrement ce principe. Je définis une liste annuelle d’objectifs, dont beaucoup deviennent des projets. Et sauf erreur, je ne les complète pas tous. L’an dernier, j’en ai mené à terme 33%.Pas grave!methode-organisation-travail-6Les projets personnels doivent vous amuser, trop de pression vis à vis du respect des délais pourrait vous faire perdre l’envie de les [réaliser.Et](http://xn--raliser-bya.Et) vous?Quels sont vos projets en cours? Dîtes nous en plus sur la manière dont vous gérez vos projets et vos méthodes d’organisation en laissant un commentaire. Vous pouvez aussi me retrouver sur Twitter. Racontez-moi tout!

### Aaa

Vous faites, peut-être, partie de ces personnes qui ont débuté leur activité le cœur battant, avec l’espoir d’obtenir des gros résultats rapidement.

Et finalement, vous faites face à une réalité qui se montre plus rebelle que prévue.

A force de travailler dur sans obtenir les résultats espérés, vous finissez par voir votre motivation décroître et vous commencez même à douter de votre capacité à y parvenir.

Cette sensation, nous sommes beaucoup à l’avoir connue. Elle nous donne envie, souvent, de tout arrêter.

Ce qui est dingue, c’est que cela arrive souvent quand on n’est pas loin d’arriver à notre but.

Croyez-nous, cela nous est arrivé à nous aussi et à d’autres amis entrepreneurs.

Mais en continuant d’y croire et en posant des actions persévérantes, nous avons fini par atteindre certains grands objectifs.

Vous aussi, vous êtes près du but… Et cette réussite est à votre portée. Il vous suffit seulement de donner un coup de pouce au destin et d’enraciner la croyance positive de votre réussite dans votre subconscient.

App android organisation et chronométrage : TImeTune, Boosted, Clockify, Forest

Différencier le temps passé sur l'ordinateur et le travail effectué. On peut passer 4h sur internet et il n'en sort rien à part de la connaissance. Posez vous toujours la question : qu'est ce que vous avez produit aujourd'hui qu'est ce que vous avez créé ? pour gagner de l'argent il faut passer de consommateur à producteur

SOyez conscient que quand on est face à son ordinateur c'est trop tard déjà. Car on a aucun recul. Et ca flingue la plupart des gens. La plupart des gens s'assoient face à leur ordinateur et se disent :" bon qu'est ce que je vais faire aujourd"hui et ça fonctionne pas. C'est logique en même temps vos yeux sont a 40cm de l'écran comment voulez vous avoir du recul

Avant même de s'asseoire devant votre ordi vous devez savoir quel sont vos objectifs. Allez prendre l'air, amusez-vous avec votre chien… puis posez vous à une table et définissez vos objectifs.

C'est un truc que vous devez faire

* Ce qui fonctionne très bien, c'est à la fin de la journée définir ses objectifs pour le lendemain. Se définir un objectif.
* Allez y travailler puis vous allez vous rendre compte qu'au bout d'un moment vous avez le cerveau en compote, vous passez de vos emails à facebook sans ligne directrice et vous êtes plus du tout productif(ve). Ca veut dire quoi ? Ca veut dire qu'il faut recommencer, vous lever faut faire un tour, défocalisez votre attention et définir qu'est ce que vous allez faire sur votre business, qu'est ce qui va vous permettre d'avancer sur votre ordinateur aujourd'hui ou cette semaine?
* l'idée c'est de prendre du recul pour définir vos priorités. Faut pas oublier que vous êtes un être vivant, vous n'êtes pas une machine

###

[https://www.arte.tv/fr/videos/086742-001-A/on-verra-demain-excursion-en-procrasti-nation/](https://www.arte.tv/fr/videos/086742-001-A/on-verra-demain-excursion-en-procrasti-nation/)

théorie du lapin pris dans les phare comme un enfant face à un écran : hypnotisé et sans recul. On doit planifier hors de l'écran, puis executer

Si j'avais 6h pour couper un arbre je commencerai par passer 4h à affuter ma hache.

C'est reculer pour mieux sauter

Efficacité : réduire l'effort sur les démarrage

Techniques des templates avec des traits et esaces blancs, dupliquer ces documents

### Imaginer Tout Ce Que Vous Pourriez Faire Si Vous Pouviez Diminuler le Temps Que Vous Consacrez Pas 2, 5 Ou 10 ?

De ne plus avoir ce problème de lutter contre soit-même et contre la procrastination ?

On parle beaucoup de temps mais y'a la notion d'effort et d'énergie

C'est important de prendre du plaisir dans ce qu'on fait

Y'a beaucoup d'entrepreneur qui jouent à l'entrepreneur. Comme si tu donnais une caisse enregistreuse à ton enfant, il va la mettre sur son étagère il va tout bien ranger, il va s'amuser avec ça toute la journée. Mais jamais il va aller déclarer son entreprise à la chambre de commerce, et y'a beaucoup d'indépendant, peut-être tu te reconnais dans cette définition et si c'est le cas t'es pas le seul, même la majorité des gens, la plupart du temps ils jouent à l'entrepreneur c'est à dire tu fais bien les choses, tu réponds bien là.

Réduire son activité pour que la plupart du temps on fait de la création pureOn va devoir se concentrer sur des actions qui nous apportent directement de l'argent

Aujourd'hui est ce que tu arrives rarement à faire ce que tu avais prévu dans les temps ? Tu te fixes un objectif, ça marche quelque jour et puis après quoi qu'il arrive à chaque fois c'est la même histoire tu baisses les bras tu n'y arrives pas ou tu as juste pas envie de le faire il te manque de l'énergie et donc tout le efforts d'avant sont mis à la poubelle et tu vas arrêter de suivre ton programme et y'a une période pendant laquelle tu vas être démotivé jusqu'au prochain objectif… C'est un peu un cycle sans fin qu'on va avoir besoin d'interrompre.

Peut être aussi que tu as plein de techniques marketing, tu sais ce qu'il faut faire mais il te manque d'être capable de t'organiser,pour pouvoir mettre en pratique ces méthodes là et tout ce que tu as appris tous les jours

Ca sert à rien d'avoir toutes ces idées et ces méthodologies si on les mets pas en place parce qu'on a un problème d'organisation qui nous empêche d'avoir les mêmes résultats que les autres qui ont accès à ces méthodes-là.

peut être que parfois même tu culpabilises de ne pas être à la hauteur. C'est le cycle infernal de la procrastination, on se dit "wah j'ai compris je vais faire un super truc je sais exactement comment le faire suffit que je travaille tant d'heure et que je fasse ça le mardi et ça le jeudi.." et puis au bout de quelques jours quelques semaines ça dépend, tu abandonnes.

Le pire c'est même pas le manque de résultat c'est ce sentiment de ne pas avoir été à la hauteur des objectifs qu'on s'était fixé, même pas en terme de vente mais par rapport à soit-même. On peut appeler ça l'autodiscipline mais on peut travailler beaucoup plus intelligemment qu'en se forçant

Peut-être aussi que tu manques souvent d'énergie en plus de manque du temps. Tous les gens qui parlent d'efficacité, par exemple les bouquins de productivité, parlent toujours de temps et oublient l'énergie. Peut-être que pour toi le problème n'est pas le manque de temps mais le manque d'énergie et d'envie

Si aujourd'hui tu débute dans ton activité, tu as peut-être même l'impression d'être déjà overbooké, de frôler le burn-out alors que t'as pas encore beaucoup de clients. Qu'est ce que ce sera quand tu en aura beaucoup plus ? Est-ce que tu seras prêt à tenir le coup ? Est-ce que ce sera même une vie qui vaudra le coup d'être vécue ? Le fait de mettre 10x plus d'effort tous les jours..

Alors si on a pas de méthode d'organisation c'est ce qui va se passer.

Peut-être qu'aussi parfois tu tombes dans le cercle de la motivation. Tu te lèves un matin, t'es overmotivé, tu as l'impression que tu vas pouvoir déplacer des montagnes, que tu vas pouvoir faire plein de trucs et effectivement les premiers jours ça marche et puis 2 à 3 jours après ça retombe et systèmatiquement, après une période de motivation, tu as une période de démotivation dans laquelle ça te demande un effort intense et énorme de te mettre au travail tous les jours.

Et quand tu voies des gens qui arrivent à créer deux, trois, autre fois plus de choses que ce que tu arrives à créer qui ont même pas l'impression d'être fatigué, pour qui ça paraît facile et tu te demandes parfois comment est-ce que font ces gens-là.

Aujourd'hui si tu t'es posé ces 2 questions y'a deux options : soit continuer sur la même voix et vivre un petit peu une vie de misère, ne pas avoir la capacité à être vraiment fier de soit d'avoir fait le travail qu'on s'attend à faire tous les jours, on va frôler le burn-out avec la dose de travail, et puis la recherche de motivation qui est comme une drogue à laquelle on est shooté pendant quelques jours ou semaines et puis c'est la descente infernale on retombe et on a besoin encore d'une dose et puis d'une autre dose… Et on arrive jamais à garder la motivation, à ne pas procrastiner pendant des périodes longues finalement. Donc la première option est de ne rien faire mais tu sais qu'il n'y à pas un truc qui va arriver par chance et régler le problème… Ca n'existe pas!

La deuxième option ça va être d'essayer de nouvelles méthodes d'organisation, radicalement différentes de ce que tu fais aujourd'hui, qui marchent pour d'autres gens mais dont on ne parle pas car la plupart sont totalement méconnues. Selon tu as besoin ce sont des méthodes différentes pour s'organiser, qui ne reposent pas sur la motivation, qui ne demande pas ça.

C'est quasiment hérétique de dire ça car y'a toutes ces vidéos de motivation, comment se donner la pêche le matin, être un warrier 24/24 on voue quasiment un culte à cette performance-là tout le monde ne parle que de ça. Moi je suis convaincue LA grosse découverte qui va complétement changer votre façon de travailler c'est que la motivation c'est une humeur donc y'a des jours ou t'es heureux, il y a des jours où tu es triste il y a des jours où tu as envie de déplacer des montagnes c'est l'humeur. Le meilleur ça fonctionne comme les saisons et selon la psychologie des gens ça dépend il y a même les gens borderline ceux qui ont des différences de saison extrême qui passe de l'un à l'autre violemment. Et même pour les gens qui n'ont aucun problème psychologique il y a toujours un cycle on n'a jamais la même humeur tous les jours c'est toujours une surprise un petit peu le matin avec quelle humeur est-ce que tu vas te réveiller finalement c'est pareil que quand tu ouvre ta fenêtre le matin c'est toujours la surprise de voir est-ce qu'il va pleuvoir ou est-ce qu'il va faire beau et finalement on n'a pas de contrôle sur la météo et on doit aussi lâcher prise sur la motivation c'est-à-dire qu'on doit commencer à accepter notre humeur du jour comme on accepte le temps qu'il fait et finalement plutôt que d'essayer de changer son humeur, changer sa façon de travailler pour qu'elle puisse être adapté à toutes les humeurs que tu sois motivé ou que tu ne le sois pas. Construire une maison finalement ça revient à faire exactement la même chose parce que on peut être un fou qui se balade dehors à poil en slip dans son jardin qui fait des incantations pour changer la météo on le prendrait pour un fou qui essaie de changer la météo pour que sa journée se passe bien mais le mieux c'est de construire une maison parce que la maison elle sait pas de changer la météo LA MAISON permet de bien vivre quelle que soit la météo la maison te permet quand elle est bien construite quand il pleut d'être à l'abri de la pluie quand il fait froid dehors d'être bien chauffé à l'intérieur dans une maison bien isolée avec le chauffage central et quand il fait beau de profiter du beau temps c'est un balcon et des terrasses qui sont fait pour ça finalement la maison c'est un peu un outil un accessoire qui permet quand on a fait le constat qu'on ne peut pas changer le temps qu'il fait sa demande évidemment de lâcher prise par rapport à ça d'accepter le fait que la météo à change tous les jours. Donc finalement comme la motivation c'est comme la météo on peut se construire un système de travail qui soit comme une maison qui nous permet de travailler bien tous les jours qu'on soit motivé ou qu'on ne le soit pas point la base c'est ça et c'est ce qui va changer votre efficacité et moi je suis un petit peu contre le nouveau puritanisme qui consiste à dire il faut se forcer s'auto-discipliner je trouve ça mauvais et malsain après on est pas tous d'accord chacun à sa psychologie moi j'ai jamais réussi à marcher par la force aussi parce que j'ai un tempérament plutôt très libre j'aime pas qu'on me dis ce qu'il faut que je fasse jamais même pas me forcer moi-même je préfère prendre du plaisir c'est d'ailleurs pour ça que j'ai choisi d'être entrepreneur point finalement on peut s'organiser pour ne plus dépendre de la motivation. J'aimerais que tu te poses la question quel est le pourcentage de ton travail effectif qui t'apporte véritablement de l'argent. Pour la plupart des gens c'est de l'ordre de 20 % ça veut dire qu'il y a 80 pourcents de temps en temps de travail qu'il faudra complètement modifier va éliminer on a l'impression qu'on ne peut pas le changer mais je mais je vais te montrer qu'on peut vraiment changer tout ça point il faut dans contraire un système qui ne dépendent pas de la motivation ensuite il faut arrêter de jouer à l'entrepreneur puis il faut se concentrer se centrer sur les 20 % qui amène le plus de résultats et le reste le mettre sur pause le condensé lui systématiser le délégué enfin bref faire autre chose avec point mais le problème c'est que tu sais peut-être pas comment faire concrètement. On s'imagine que les gens qui ont des vrais résultats ont une capacité de travail hors du commun en vérité c'est une question d'organisation. Souvent les gens qu'on rencontre qui n'ont pas de résultats on se demande sur quoi il bosse il bosse tout le temps et on comprend même pas sur quoi. En vérité ce n'est pas une question de capacité de travail mais bien de méthode. Comme disait Bill Gates pour faire quelque chose de compliqué je prendrai un feignant car il trouvera un moyen facile de le faire virgule alors pour créer un empire il faut systématiser les choses de la même manière que quelqu'un de feignant trouvera un moyen facile de faire quelque chose de compliqué. Il y a rien de technique de philosophie coup de compliqué il suffit de comprendre tous les trucs et les astuces et de les appliquer dans la vie de tous les jours.

Des dizaines et des dizaines de AC de tactique d'astuces si tu fais de la prestation de service par exemple ça va beaucoup de servir car c'est un métier qui demande beaucoup beaucoup d'organisation prends tu veux pouvoir explorer de nouvelle manière de travailler point ça paraît dingue mais tu vas voir que si tu arrives à réduire ton temps de travail de 80 % tu vas pouvoir travailler beaucoup plus tu vas pouvoir faire jusqu'à 5 fois le même travail dans la même période en dépensant pas une minute de plus et en mettant pas plus d'énergie alors simplement c'est pour les gens qui sont un peu ouvert à des idées à radical. Ça prend à contre-pied absolument tout ce qu'on voit ailleurs sur l'efficacité et l'organisation. Il suffit d'appliquer une liste de méthode simple poinçonner tu dis tout les études scientifiques publiées depuis des années là dessus on voit que c'est juste le contraire de ce que les gens font la plupart des gens, qui marche le mieux point tout organisé en fonction du niveau d'énergie y a tout en jeu ça va te donner un nouveau défi on va chronométrer les tâches et ça ça va diviser par deux le temps de travail. Évidemment pas tout le monde y a des gens qui vont pouvoir le / un peu plus et d'autres un peu moins parce qu'on fait tous une activité différente mais tu vas avoir un exercice. Avoir des espaces thématiques en fonction du travail que tu fais ça c'est quelque chose de radical pour la plupart des gens qui rend le travail tellement plus simple tellement attrayant ensuite on va transformer la succession des activités qu'on fait pendant une journée point beaucoup de gens thriller tâche par urgences nous on va les trier par rentabilité et il y a quelque chose à faire tous les matins qui te permet automatiquement de gagner beaucoup plus. Ensuite on va parler du problème des proches et des interruptions c'est-à-dire quand tu es à la maison comme la plupart des indépendant tu es souvent interrompu par tes proches par ta famille il y a des choses à savoir là-dessus. Aussi par rapport aux notifications aux email et des choses à savoir là-dessus. Contrairement à ce qu'on pourrait croire il s'agit surtout pas d'essayer de travailler le moins possible il s'agit au contraire d'avoir le plus gros revenu par heure de travail. Fais le calcul combien tu gagnes aujourd'hui par heure de travail en moyenne c'est-à-dire tu prends les revenus du mois tu divisent par heure travailler.

C'est pas forcément travailler le moins possible moi je l'ai fait pendant des années ça travailler le moins possible et au final c'est vrai que tu arrives à travailler 5h par semaine mais tu vois un peu ton travail comme l'ennemi comme la chose à réduire et du coup j'ai trouvé ça au bout d'un moment même si ça m'a libéré de tellement de temps un peu malsain et après je me suis mis à essayer d'améliorer mon revenu moyen par heure et tu vas voir qu'on peut le double et triple x 5 ça veut pas dire forcément que tu vas gagner plus ça veut dire que tu fais ce que tu veux de ton emploi du temps mais tes heures sont extrêmement productive. Dans quel ordre exercice on va parler des procédures on va parler aussi alors sa deuxième partie de protéger sa passion tu sais le contraire de lutter contre procrastination de l'autodiscipline c'est la passion et quand on fait un truc par passion on voit pas le temps passer c'est facile de démarrer c'est facile à faire le problème c'est quand on gagne sa vie avec sa passion au bout d'un moment c'est plus une passion et on est encore obligé de se forcer à nouveau quand on gagne sa vie avec sa passion au bout d'un moment c'est plus une passion et on est encore obligé de se forcer à nouveau tu vois mais il y a tellement des moyens simple pour protéger et entretenir sa passion de la même façon qu'on entretient un feu de bois. Sur les braises quand il y a plus de flammes ou bien en rajoutant des des des bus dedans quand le feu commence à mourir donc là moi j'ai des astuces et des techniques pour ça tu vas voir ça change tout tout tout tout tout ensuite on va apprendre à ne pas se tue à la tâche on va apprendre à il y a 3 ans il y a trois façons de travailler on va apprendre à les combiner ça c'est vrai pour n'importe quelle activité souvent ça va te permettre aussi de prendre des décisions qui sont bien c'est pas seulement l'efficacité c'est aussi les décisions que tu prends on va parler aussi élimine quasiment complètement peut-être à 95 % la nécessité d'avoir des aller retour d'e-mail tu sais tu poses une question il te répond sur pose une question et tu réponds pas tu as le truc c'est ça te prend tellement de temps ce genre de truc moi on peut vraiment éliminé ça purement et simplement on va parler aussi d'autres astuces pour l'e-mail je vais te donner aussi ah oui pour le support client s'il y a des gens qui te contacter le support client. Ensuite on va parler aussi de à oui alors ça c'est je peux pas te l'expliquer dans les détails maintenant mais c'est tout à mécanisme si on le comprend on ne procrastine plus c'est-à-dire que la procrastination n'existe plus sans qu'on ait eu à se forcer c'est juste une modification de la séquence dans laquelle on fait son travail moi j'ai énormément travaillé là-dessus j'ai fait des grandes découvertes sur les séquences de travail et je l'ai partagé avec toi pour que tu n'aies plus jamais le sentiment de finalement. Son téléphone et puis on va parler enfin des routine mensuel des routines bimestriel et des hauts et des routines va des routine avec qui ce qui arrive une fois par an une deux fois par an 3 fois par en fait tu vas le voir il essaie de se sortir des choses de la tête pour plus jamais avoir à penser merde il faut que je fasse ça dans deux mois faut que je fasse ça dans un mois que tu puisses mais vraiment coupé tu vois mais ratiboiser ton temps de travail surtout l'énergie les niveaux d'énergie que tu mets dans ton travail t'organiser mieux et enfin avoir quelque chose de structurer et de Saint souvent en matière d'efficacité on improvise ça veut dire qu'on va se renseigner on va apprendre des choses sur la vente sur le marketing mais l'efficacité c'est un peu le truc qu'on laisse pour après tu vois alors que le fait d'avoir régler ça dès le début ça te permettrait justement d'avoir l'esprit libre d'avoir beaucoup plus de temps et beaucoup plus d'énergie pour te concentrer justement sur la vente sur la création de produits la création de contenu une semaine peut-être tu étais journée était semaine de travail ne rompe absolument plus rien à voir tu vas commencer à reprendre un plaisir fou dans ce que tu fais et à terme l'objectif c'est que tu vas tu travailles juste beau soit beaucoup moins soit tu travailles au tendon beaucoup plus d'accord donc soit inversé semaine et weekend soit des enfers 5 fois plus dans le même temps si tu veux voir beaucoup plus que ça mais il y a beaucoup de gens pas avec ces méthodes un jour c'est en un jour je fais le contenu d'une semaine le contenu d'une semaine il y a beaucoup de gens qui font même pas une formation par mois qui font le même métier que moi qui font pas autant que moi je suis en une semaine on a moi mais faut savoir que le contenu dans une semaine parler d'autres formations avant sur les choses plus appliquer à mon business en particulier là ce que je vais te montrer aujourd'hui c'est vraiment sur l'efficacité au sens large donc c'est à la fois pour les prestataires de services à la fois pour n'importe qui. Force animale la force préhistorique pour moi c'est un truc de prehistoric ça pourquoi parce que ça sert à rien de foncer dans un mur s'il y a une porte à côté l'astuce l'intelligence sont toujours supérieur à la force regarde que je prends j'ai dû le prendre je vais le prendre pour aller à la dix millionième fois là c'est l'exemple des mineurs de charbon si c'était la force la pénibilité se forcer travailler dur qui donnait les meilleurs résultats les mineurs de charbon ça serait eux qui habiterait les beaux quartiers où les gens qui travaille en usine mais c'est pas le cas regarde si tu classe les gens que tu connais tu fais une liste de gens que tu connais tu classe par combien d'heures il travaille ou combien il travaille et après ok quelle est la pénibilité de leur travail tu les classes par pénibilité de travail et ensuite je regarde combien il gagne souvent la liste de combien quelle est la pénibilité de leur travail tu les classes par pénibilité de travail et ensuite je regarde combien il gagne souvent la liste de Combien gagne va être même parfois inversement proportionnel mais jamais corrélées avec la pénibilité qu'ils mettent dans leur travail. Donc tu veux plus non plus avoir ce sentiment de ne pas être à la hauteur tu sais quand tu as des choses que tu sais que tu dois faire et que tu n'as pas fait imagine-toi comment tu te sentiras quand tu auras plus ça. On va travailler beaucoup sur l'envie et sur les niveaux d'énergie parce que souvent c'est pas le temps qui manque même si il manque aussi on va apprendre à réduire le temps de travail c'est même l'objectif un des objectifs principal de la formation mais on va aussi parler de d'énergie et tu sais parfois on a le temps mais on a juste pas envie de le faire on a juste pas l'énergie pour le faire et tous les gens qui nous propose des méthodes d'efficacité ne parle que du temps et de gestion du temps mais c'est souvent pas le temps le problème. Moitié des cas c'est pas le temps c'est juste l'énergie et l'envie imagine quand aura résolu c'est ces problèmes là comment tu te sentiras alors le truc c'est ça se voir qu'est-ce que tu pourrais devenir quand tu auras mis tout ça en place il y a pas quelqu'un c'était peut-être le déclic c'était peut-être la clé qui t'empêche de venir ce que tu voulais devenir qu'est-ce que c'est pour le faire dans la vie réelle de de tous les jours à partir d'aujourd'hui combien est-ce que tu pourrais gagner en plus combien de vente est-ce que tu pourras faire en plus si tu arrivé à faire tout ce que tu t'étais préviens pas en plus tu prends ton programme actuel tout ce que tu avais décidé de faire si tu l'avais toujours fait quelles seraient tes résultats aujourd'hui combien ce que tu gagneras en plus combien la plupart du temps c'est même pas qu'on a des mauvaises méthode quand on gagne pas assez c'est qu'on avait prévu de faire des trucs et qu'on ne les fait pas. Et forcément on a pas les bons résultats. C'est tellement dommage de voir son travail comme un sacrifice à l'heure qui ça pourrait être le plus grand plaisir de tes semaines il y a vraiment des méthodes pour transformer le travail en plaisir tu sais avec des mini défi mais la dynamique du jeu. Il est pas très éloigné finalement de la dynamique du travail c'est pareil c'est hier qu'on fait un truc et toi on pousse un peu dans un machin enfin on doit être intelligent doit parfois au sujet de la porte mais surtout que l'intelligence de il est pas très éloigné finalement de la dynamique du travail c'est pareil on fait un truc et tu vois on pousse un peu dans un machin on doit être intelligent on doit pas utiliser de l'intelligence de l'agilité des bonnes idées pour obtenir un résultat. Et le travail finalement c'est pas très différent du jeu et moi j'aimerais t'aider à retrouver du plaisir dans le travail si le jeu peut nous rendre heureux alors le travail aussi

'il suffit d'appliquer une liste de méthode simple guider par la science en tu vas voir comment s'organiser les plages horaires les places de travail avec le nombre de minutes exact il faut complètement transformer la succession des choses qu'on fait dans sa journée trier ses tâches pas rentabilité point

Un bon système c'est un système qui te demande pas de motivation.

Dans lequel te propose d'apprendre à neutraliser la procrastination alors c'est la procrastination c'est ce qui consiste à remettre les tâches à plus tard tu sais tu dois faire un truc aujourd'hui et puis tu le remets à demain puis demain tu l'auras mais après demain il y a des gens comme ça qui arrive pas à s'en sortir que jamais à faire ce qu'ils avaient prévu jamais à passer à l'action jamais à tenir le résolution juste à cause de ça alors que c'est tellement facile d'en venir à bout et c'est tellement dommage. Peut-être de mettre sur pause pour aller chercher ça est-ce que tu vas prendre aujourd'hui c'est dans la suite de son enregistrement comment neutraliser la procrastination alors imagine ce qui se passerait si tu pouvais diviser instantanément par 3 ou 4 mm par 5 mm par 10 et 10 ans juste par trois ou quatre les cas où tu procrastine si tu disais juste par trois ou quatre enlever la plupart qu'est-ce que ça représenterait pour toi en terme de gain à la fin du mois et de fierté aussi de pouvoir te dire je suis fier de moi j'ai fait ce que je voulais faire. S'appellent les journées thématiques alors ça demande d'être un petit peu ouvert ouvert d'esprit parce que sa demande de travail est très différemment de ce qu'on fait d'habitude tu sais que ça c'est ma grande idée en efficacité c'est le plus important finalement quand on a compris ça on a déjà compris beaucoup de choses et c'est la base de beaucoup des méthodes et des techniques que je vais te montrer d'ailleurs dans les lien qui sont dans la description c'est que l'ennemi numéro 1 ce n'est pas le travail c'est-à-dire c'est pas le travail qui est le plus dur c'est les démarrage le meilleur exemple pour illustrer ça le premier c'est celui de la personne qui décide d'aller courir dans la rue tous les jours tous les jours d'aller faire d'aller faire un jogging d'aller courir dehors le plus dur c'est pas une fois que tu as fait son pas je sais pas si tu cours ou pas mais quand tu as fait ça en parle quand tu as déjà couru 1 km faire un pas de plus souffert sans pâte plus même c'est pas très dur tu vois qu'est-ce que tu es déjà sur ta lancée suffit de faire un pas de plus de mettre la jambe devant l'autre le plus difficile dans toute l'histoire je parle pas le plus pénible pour le corps mais le plus difficile psychologiquement là où il faut vraiment faire un effort pour 6 m c'est pas mettre un pas devant l'autre quand tu en as fait 100 McDo les forcer le démarrage c'est-à-dire mettre tes fringues de sport sortir de la maison faire le premier pas pour ton physiquement c'est pas le plus dur c'est pas dur de mettre des fringues de sport et de faire un pas mais psychologiquement c'est là il y a une différence fondamentale entre la difficulté la difficulté physique est la difficulté psychologique et la difficulté psychologique tu regardes tous les cas où tu procrastine c'est systématiquement le démarrage et c'est rarement d'ailleurs la chose la plus pénible démarrage pour qu'après tous détende que tu sois sur la lancée et que tu mettes un pas devant l'autre l'autre exemple que j'utilise aussi beaucoup plus en détail dans les lits en dessous c'est l'exemple de la voiture

‌Démarrer tu dors tu sais si tu as déjà essayé de démarrer ta voiture en hiver quand il fait très froid c'est ça galère un peu et tout bon il y en a besoin d'énergie pour faire démarrer la voiture de beaucoup d'énergie c'est la raison pour laquelle on a une batterie dans la voiture à l'époque il y avait une manivelle elle fallait à tourner la manivelle et qu'on part ça à l'énergie qu'il faut quand la voiture est lancée à 100 km heure faire un mètre 2 + faire 5 m 10 m de plus tu pourrais même couper le contact que la voiture elle les frais les 10 m et j'en ferai encore plus parce qu'elle est juste sur sa lancée donc ce qui a été difficile ce qui a demandé de l'effort pour pour la voiture ça n'est pas de faire un mètre de plus quand on est à 100 km heure c'est de démarrer le moteur et quand on fait du sport c'est exactement pareil et quand tu prends du recul regarde toutes les choses que tu as remis à plus tard mets-moi jour d'hui où cette semaine là dans les 7 derniers jours c'est souvent le problème de démarrage te dire que le démarrage t'a demandé beaucoup trop d'efforts tu es d'accord avec moi des fortes Sico logique c'était le démarrage que tu vois là c'est des problèmes c'était le démarrage et si finalement tu avais pu être anesthesie ou s'il y avait une procédure pour que tu puisses est tu vis pas le démarrage décompte mettait directement sur la lancée c'est comme si tu avais déjà fait 100 m il suffisait de mettre un pas devant l'autre ça serait beaucoup plus facile tu es d'accord avec moi le problème c'est que ça existe pas et qu'on peut pas faire les choses comme ça pourtant il y a des façons de s'organiser qui permet de réduire voir d'éliminer la plupart des démarrage point je vais prendre l'exemple de quelqu'un qui fait des vidéos. Imagine tu veux publier une vidéo tous les jours mais c'est très dur tous les jours tu dois te motiver à aller filmer est allé déjà trouvé les idées ensuite démarrer le fils de l'enregistrement suite te mettre au montage et à chaque fois que tu démarres un nouveau truc il y a un risque que tu le fasses pas stedia le matin tu te lèves faut trouver les idées de sujets bon il y a déjà un risque que tu le fasses pas ensuite si tu l'as quand même fait il va falloir sortir tout le matos pour filmer en face de la caméra multiplie les risques finalement parler par le nombre d'interruption c'est à chaque fois qu'il y a un redémarrage d'une activité différente Steyer recherche d'idées enregistrement montage à chaque fois qu'il y a ça il y a un risque de procrastiner tu es d'accord avec moi puisque il y a un démarrage c'est là où il y a le plus gros risque c'est rare que tu abandonnes une vidéo en plein milieu d'une vidéo tu es en train de parler depuis 10 minutes et tu abandonnes you tu as pas arrêté quoi tu vois tu continues sur la lancée là où le risque est grand c'est autour du démarrage maintenant si on arrivait à résoudre ce problème c'est-à-dire utiliser justement le principe de la lancer c'est-à-dire plutôt que faire une vidéo tous les jours et tous les jours avoir 3 4 5 démarrage pour trouver les idées un démarrage pour faire le montage un démarrage pour trouver les textes la mise en ligne les descriptions non tu fais quoi la suite stevia le lundi par exemple tu trouves les idées pour toute la semaine mais quand tu as trouvé les idées pour une vidéo c'était déjà à ta table avec ton papier ton crayon c'est pas plus dur de préparer pour une vidéo de plus et quand on a déjà fait deux c'est pas beaucoup plus dur d'en faire une troisième d'affilée à la suite et quand on a fait 4 et cetera pareil tes vidéos tu peux les films et à la suite selon équipe de vidéo mais si c'est des vidéos parler face caméra tu peux changer juste de chemise et les enchaîner. et du coup qu'on a plus d'interruption est de la même façon alors après Lille et sa demande aussi de dès que tu as terminé une tâche tu fais le début de la prochaine ça ira parents tu veux écrire des articles tu ne finit jamais un article sans avoir écrit la première phrase du prochain ou tu ne finit jamais le plan de ta vidéo lire les sujets tout ça le plan de ce que tu m'as raconté sans écrire au moins la première ligne de la vidéo d'après et finalement tu peux organiser journée autour de thématique qui ne demande qu'un seul démarrage ou un le matin et un l'après-midi mets une journée thématique dans lesquels fait la préparation une journée thématique dans laquelle tu fais l'enregistrement une journée ça c'est pour les gens qui font de la vidéo mais tu vois bien que ça s'applique à beaucoup beaucoup d'activités et ça c'est juste un petit exemple d'utilisation de l'astuce au lieu de la France lieu de la force du recul et se demander pourquoi est-ce que je vois pas le faire qu'est-ce que tu refais Syco logiquement pour moi et comment est-ce que je pourrais te simplifier ça et du coup chaque interruption qu'on enlève c'est un démarrage qu'on enlève et chaque démarrage qu'on enlève c'est un risque remettre à plus tard qu'on a aussi enlever et quand on commence à avoir séjourné travail comme ça tu changes tu changes ça n'a absolument plus rien à voir tu comprends bien en plus pour la création de contenu quand on travaille comme ça on a pris de l'avance et quand on prend de l'avance on a moins d'anxiété parce qu'on doit pas finir dans la minute et tout tu vois pas ce qu'on a d'un côté le programme de production et d'un côté le programme de diffusion travailler de la même manière quel que soit son activité alors si tu veux appliquer ça et si tu veux des cours si tu veux vraiment devenir efficace et réfléchir à ton organisation finalement de façon complètement différente de ce qu'on fait d'habitude d'habitude on parle juste 2 minutes et c'est complètement débile parce que le problème c'est pas le temps faire déjà avant même de résoudre l'histoire du temps donc il va te manquer pour devenir efficace et d'avoir plein de méthode comme celle-ci plein des dizaines et des dizaines et des dizaines et des dizaines de Agde efficacité des méthodes pour ne plus être dépendant de la motivation pour ne plus avoir à utiliser la force contre toi-même et reprendre du plaisir

Mettez le temps moyen d'un événement par défaut à 30 minutes soyez extrêmement vigilant à vos temps de transport bloqué dans vos calendriers vos créneaux non professionnel planifier toute votre journée dans votre calendrier réserver vous chaque jour des créneaux dédié à un travail solitaire tous les dimanches soirs 30 minutes pour passer en revue la semaine passée 30 minutes pour passer en revue la semaine à venir

Écrivez tout ce que vous avez à faire à la ligne c'est une tâche prend moins de 2 minutes fait la immédiatement. Prenez l'approche 1-3-5 (niveau de priorité)

La méthode getting things done écrire toutes les choses qu'on a à faire sur le papier pour les visualiser et décharger son cerveau sa mémoire pour avoir ensuite une mémoire de travail libre est prête à se concentrer ensuite clarifier les différentes actions et les priorités ensuite mettre des rappels où il faut et rassembler les informations par

Commencer quelque chose fait une seule tâche même si c'est pas parfait écrivez 3 mots et ensuite par effet boule de neige ça va vous entraîner

Méthode zéro Mbox virer tous vos e-mails. On sentir libéré

Lisez vos mails à la fin de la matinée et la fin de la journée ne commencez surtout pas par ça

Enregistrer des template dans gmail

Si ça va durer moins de 2 minutes faites-le maintenant

Inbox pause boomerang sorted strict

Regrouper vos

tâche par l'eau ou par journée

Savoir dire non connaître les raccourcis clavier

Alfred créneau Trello dash line

réserver des créneaux dédié dans votre calendrier fixé veux des deadline atteignable commencer par la tâche la plus difficile

Hacks d'efficacité extrême

### Organisation

Dans un monde submergés d'informations et de possibilités, ce qui fait la différence entre celui qui réussit, et celui qui stagne ou se laisse dicter son destin par d'autres, c'est notre capacité à agir avec discerner, à concentrer notre énergie sur les tâches qui nous font avancer le plus efficacement possible.

Savoir organiser son temps, son énergie, ses facultés d'attention et d'actions en direction d'un but valide et atteignable, offrira la mesure de vos succès.

Cette capacité demande un recul certain et une capacité à voir ce qui est utile pour faire croître son activité, et ce qui l'est moins ou qui ne l'est pas du tout.

Une fois cet horizon posé il faut agir et franchir les étapes de notre business plan une à une.

Pour cela, un environnement minimaliste et dénué de toute distraction est indispensable. Se concentrer sur l'essentiel n'est possible que si votre mental dispose suffisamment de mémoire et d'espace libre.

Voyons comment décharger votre mental de ce qui le ralentit, et le charger en temps libre orienté efficacité pour élargir votre champs des possibles !

Les emails

Pour réduire votre charge mentale, desinscrivez-vous de toutes les newsletters qui n'ont pas un rapport direct sur la valeur que vous produisez. Préférez un abonnement au fil RSS des magazines et associations que vous suivez, qui seront réunis en un fil d'actualité consultables à tout moment dans des applications comme Inoreader.. Ne conservez dans vos mails que les communications à caractère important professionnel et personnel, épargnez-vous les offres commerciales et les promotions et offres, ce sera ça en moins de mail qu'ils faut quotidiennement ouvrir, lire, supprimer… Normalement il y a toujours en bas, à la fin de l'infolettre, un lien "Désinscription", c'est prévu par la loi. S'il n'est pas présent, signalez simplement le logiciel comme spam ou voyez si vous pouvez vous désinscrire directement sur le site du vendeur.

Cela réduira drastiquement votre temps passé sur votre boite mail, et surtout cela ménagera votre force décisionnelle, que vous devez conserver pour les tâches qui vous apporte réellement.

### Tips

_“Kickstart your day by doing something that makes you feel accomplished (i.e. make your bed or clean something). Listen to music or podcasts — staying in silence at home while you’re working (or not) can make you feel depressed. After your work day, you’ll need a routine to replace your commute. For example, you could clean your desk or your mug. Also, during these strange times, clean your phone, keyboard and other devices with wipes when you wash your hands.“_

* Julie, Design

_“Get up an hour before you start working and normalize your day by doing tasks as you would before work in an office. Eat breakfast, have coffee, relax or clean.”_

* Aaron, Community

_“Keep your work zone clean as an office.“_

* Rado, Engineering

_“Schedule a break where you go outside for a walk or sit in another room reading a book. It’s essential to schedule time away from the screen doing something nice for yourself.”_

* Abadesi, Maker Outreach

_“If you have the space, move around your home throughout the day. I rotate between my desk, my couch and the kitchen table to mix it up. If you’re near a window in your designated ‘spots,’ even better.”_

* Taylor, Editorial

_“Know when to log off. WFH can be hard to detach from work because you're always connected and you don't have any travel time between home and work, and this is amplified further if you work with teammates across multiple time zones. Set yourself breaks during the day and a time you plan to finish work and stick to it. Having a normal routine helps you not feeling like your home is your workplace 24 hours a day.”_

* Dan, Design

_“Get dressed for WFH. It creates some psychological thing where you're in the mood to be productive. If you work in your pajamas you're going to work like your in your pajamas.“_

* David, Engineering

_“I find it helpful to set a specific area to work and when I'm not in that area, I'm not working”_

* Lanre, Sales

_“Use music to reset your mood. If you are musically inclined, working remotely can provide an excellent opportunity to play some music at random points of the day. For instance if I need to clear my mind in between different types of activities to reset my mood - singing (for me) can be a great way to hit reset. For someone else this might be playing a musical instrument or even just listening to a favourite song. A five minute outlet can stimulate creative thinking and relieve stress by taking your mind away from the immediate task before moving on to another. This is much easier to do at home than in an office environment.”_

* Emily, OperationsWe also polled the community for their

[_unconventional_ tips](http://links.producthunt.com/lnk/BAAAALWObOkAAAYr2FoAAAd_FNgAAAAIijYAAAAAAAYklQBeciEkVxGXEHMgTLeo5iGt78oOawAF1QU/4/y5UxfksSHPkDvNiPn7wsPQ/aHR0cHM6Ly93d3cucHJvZHVjdGh1bnQuY29tL21ha2Vycy8xLW1ha2Vycy9kaXNjdXNzaW9uLzEzMjM1LXdoYXQtdW5jb252ZW50aW9uYWwtdGlwcy1kby15b3UtaGF2ZS1mb3ItcmVtb3RlLXdvcmtpbmc_dXRtX2NhbXBhaWduPTQzNThfMjAyMC0wMy0xNyZ1dG1fbWVkaXVtPWVtYWlsJnV0bV9zb3VyY2U9UHJvZHVjdCtIdW50JnV0bV90ZXJtPWVkaXRvcmlhbA)

on remote working. What do you think of stretching routines, barista lessons, and one song on repeat?

[All the WFH tips here](http://links.producthunt.com/lnk/BAAAALWObOkAAAYr2FoAAAd_FNgAAAAIijYAAAAAAAYklQBeciEkVxGXEHMgTLeo5iGt78oOawAF1QU/5/f9E2YX7XhU6blXIACtQ_rQ/aHR0cHM6Ly93d3cucHJvZHVjdGh1bnQuY29tL21ha2Vycy8xLW1ha2Vycy9kaXNjdXNzaW9uLzEzMjM1LXdoYXQtdW5jb252ZW50aW9uYWwtdGlwcy1kby15b3UtaGF2ZS1mb3ItcmVtb3RlLXdvcmtpbmc_dXRtX2NhbXBhaWduPTQzNThfMjAyMC0wMy0xNyZ1dG1fbWVkaXVtPWVtYWlsJnV0bV9zb3VyY2U9UHJvZHVjdCtIdW50JnV0bV90ZXJtPWVkaXRvcmlhbA)

.

[https://mail.google.com/mail/e/1f448](https://mail.google.com/mail/e/1f448)

### Les Outils

planifier son business avec des outils gratuits diagrammes de Gantt sur Excel. Le diagramme de Gantt est un outil indispensable pour organiser la gestion d’un projet et suivre sa réalisation. Il va permettre de représenter visuellement les différentes tâches, leur avancement, leur durée et les jalons nécessaires pour réaliser un projet. Surtout, ces outils sont pensés pour simplifier la collaboration avec votre équipe. Ils vous aideront à éviter les erreurs classiques sur un diagramme de Gantt, en permettant :

D’avoir la date du jour sur votre planning D’avoir un statut visuel attribué à vos tâches D’améliorer la lisibilité de votre diagramme D’inclure, simplifier et partager les changements avec l’ensemble des collaborateurs concernés J’espère que vous ferez de belles découvertes. N’hésitez pas à compléter cette liste en suggérant vos outils favoris dans les commentaires, s’ils ne figurent pas dans cet article.

**Learning** how [fighter pilots make fast and accurate decisions](https://click.convertkit-mail.com/68ug6m3z5vi8hegknoio/9qhzhnhg3d2zzwt9/aHR0cHM6Ly9mcy5ibG9nLzIwMjEvMDMvb29kYS1sb29wLz91dG1fc291cmNlPWRhdmlkaGF1c2VyLmNvbSZ1dG1fbWVkaXVtPWVtYWlsJnV0bV9jYW1wYWlnbj13ZWVrbHlfbmV3c2xldHRlcg==) under great pressure and time constraints. The most extreme situations are a great place to learn the systems that work.

“**The OODA Loop is a four-step process for making effective decisions in high-stakes situations. It involves collecting relevant information, recognizing potential biases, deciding, and acting, then repeating the process with new information.**”

Observe. Orient. Decide. Act.

There are three key benefits that make this work. Deliberate speed. Comfort with uncertainty. Unpredictability. Just like checklists work, this framework seems to work.

**Agree** [news is a total waste of your time](https://click.convertkit-mail.com/68ug6m3z5vi8hegknoio/3ohphkhq93d44gsr/aHR0cHM6Ly93d3cubmF0ZWxpYXNvbi5jb20vYmxvZy9uZXdzLXdhc3RlLXRpbWU_dXRtX3NvdXJjZT1kYXZpZGhhdXNlci5jb20mdXRtX21lZGl1bT1lbWFpbCZ1dG1fY2FtcGFpZ249d2Vla2x5X25ld3NsZXR0ZXI=) and may actually be toxic. I cut out all news more than six years ago, and my life is better for it.

“**Television news is pure entertainment. It’s not possible for a news channel to run 24 hours a day and have truly important global events to report constantly throughout that time.**”

News has only gotten worse in recent years, more partisan, more divisive and less useful. Just remove it and your life will be better.

Jean Si vous publiez des articles ou des vidéos, si vous écrivez un livre, si vous créez des produits d’information… vous êtes dans le business des idées. Vous vendez des idées. Contrairement à un ouvrier ou à un artisan, ce que vous fabriquez ne gagne pas en valeur parce que vous y avez passé plus de temps. Si vous prenez 30 heures pour peaufiner une sauce au poivre, elle sera certainement meilleure que si vous l’aviez préparée en 25 secondes. Au contraire, une idée qui met 30 heures à accoucher est souvent tordue. Alambiquée. Les meilleures idées vous tombent dessus, souvent au moment où vous y pensez le moins, en 2 secondes et-demi. Dans le business des idées, le temps ne fait rien à l’affaire. S’il vous faut 30 heures pour rédiger une simple page, c’est que vos idées sont mauvaises. Elles manquent de clarté. Et sont probablement indigestes. Le problème, pour trouver de bonnes idées, ce n’est pas le temps dont on dispose. C’est la liberté d’esprit. La capacité à prendre du recul. L’ouverture. On a tendance à calquer le modèle de l’industrie du XIXè siècle à tous les secteurs d’activité. Une école, même, ressemble à une usine. Tout y est : la production de bacheliers “en gros”, rangés par classes, la cloche qui marque la fin du temps de travail, les salles qui ressemblent davantage à un banc de production qu’à un lieu destiné à apprendre… Dans l’entreprise, c’est la même chose. Le seul problème, c’est que vous n’allez pas forcément passer votre vie dans une usine. Il se peut que vous gagniez votre vie en fournissant des services, ou en vendant vos idées. Et comme les idées ne se fabriquent pas comme les voitures, il est nécessaire d’oublier les règles et les présupposés qu’on nous inculque depuis l’école jusqu’à l’entreprise. On n’est pas plus efficace quand on travaille plus. On est plus efficace quand on est capable de produire de bonnes idées facilement. D’entrer dans un “flux créatif”, et de prendre du recul. La liberté d’esprit, le dégagement de tout ce qui encombre la paix intérieure, l’absence de stress, ce sont les conditions parfaites pour produire les meilleures idées. Parce que les concepts géniaux ne vous tomberont jamais sur le nez si votre esprit est encombré : “je dois terminer ce projet pour demain, je n’aurai jamais le temps” ; “Je devais rappeler Machin à 3 heures, vite, mon téléphone !” ; etc… Se libérer du poids des engagements, des choses qui nous encombrent, et du stress produit par l’environnement urbain, ce n’est pas seulement profitable. C’est indispensable pour produire des idées. C’est tout simplement vital, autant pour vous que pour moi. La grande question, c’est celle de savoir pourquoi on nous apprend exactement l’inverse à l’école… et en entreprise. J'ai aussi enregistré ça : [VIDÉOS DE VENTE : LA NOUVELLE FAÇON](https://marketingnaturel.us18.list-manage.com/track/click?u=7ccd39ba3fd881234096f49d6&id=b7ebd8fa5a&e=c98c6189dd) On m’a souvent reproché de donner des objectifs irréalistes. “Gagner sa vie avec 50 visiteurs par jour”, “Monter un business rentable en 60 jours”, “Doubler les revenus de son site en 5 jours”. Pourtant, tous ces objectifs, non seulement je les atteint moi-même, mais je les ai largement dépassés, et je suis loin d’être le seul à l’avoir fait. Parce que c’est tellement simple que ça semble évident : Si on vend un produit à 50€, avec un taux de transformation de 2%, ce qui est loin d’être hors de portée, on gagne 50€ par jour avec 50 visiteurs, soit 1500€ par mois. Si je crée une vidéo de formation en deux jours, que je passe une journée à rédiger une page de vente, et une autre journée à créer une campagne Adwords, puis que je l’affine pendant 2 semaines, j’ai créé un business rentable en moins de 30 jours. Je l’ai fait, et pas qu’une fois. Des dizaines de milliers d’entrepreneurs l’ont fait aussi. Le problème, ce ne sont pas ces objectifs. Le problème, c’est la certitude partagée par le plus grand nombre, qui consiste à croire qu’on ne peut pas gagner sa vie honnêtement sans travailler pour quelqu’un d’autre ou créer une entreprise traditionnelle. C’est la certitude, inculquée par l’école, par la famille, par les partis politiques, par les journaux, par la télévision, par notre environnement, qu’il n’est pas possible de gagner sa vie sans aller au bureau ou à l’usine à moins d’avoir de la chance. A moins de gagner au loto. Il est difficile de s’en défaire, parce qu’on nous la matraque en permanence, depuis le berceau jusqu’au bureau. La conséquence de ce lavage de cerveau, c’est qu’on ose plus sortir du carcan. Pire, on se sent coupable. Souvent de façon inconsciente, d’ailleurs. Je ne compte plus les lecteurs qui m’ont raconté la même histoire d’un conjoint ou d’un parent qui les freine : “Range ton ordinateur et trouve un vrai boulot” ; “Laisse tomber tes trucs sur internet : je t’ai pris rendez-vous au Pôle Emploi”. Quand on a passé 5, 10 ou 25 ans à faire un métier que l’on déteste, pour un patron qu’on vomît, on ne peut plus accepter qu’il soit possible de faire autrement. De la même façon qu’un couple qui se dispute tous les jours pense plus difficilement à la rupture après avoir passé 10 ou 20 années ensemble. Parce qu’il faudrait accepter l’idée qu’on s’est trompé pendant aussi longtemps. Alors on continue à subir, parce que c’est moins douloureux. C’est la raison pour laquelle ceux qui proposent un mode de vie indépendant s’en prennent tellement dans la tronche. Et c’est aussi l’une des raisons pour lesquelles j’ai désactivé les commentaires sur ce blog. Pourtant, je comprends parfaitement la haine de ceux qui viennent la communiquer sur ce blog, ou par email. C’est la même haine que celle des vieux couples qui se battent et s’insultent tous les jours, mais n’osent pas divorcer parce qu’ils sont restés tellement de temps ensemble… Pour ceux qui osent, pourtant, une autre vie est possible… Il m’est arrivé à deux reprises d’augmenter mes ventes en augmentant mes prix. Bien sûr, ce n’est pas seulement le prix qui a changé. Mais l’offre. Si vos clients hésitent, ce n’est pas forcément à cause du prix. Ça peut être à cause de la façon dont l’offre est présentée ou packagée. La prochaine fois que vous testez une nouvelle version de votre page de vente, essayez ceci : 1Modifiez votre offre pour doubler sa valeur perçue. Ajoutez des éléments. Ajoutez des supports. Mettez-vous dans la peau de votre client pour vous demander ce qui peut bien manquer à votre produit. 2Augmentez le prix en conséquence. 3Testez votre nouvelle offre en y envoyant 10% ou 20% de votre trafic (Utilisez un outil d’A/B testing pour comparer les résultats). 4Recommencez, jusqu’à trouver l’offre parfaite. Ce qui compte ici, ce n’est plus votre taux de transformation. C’est votre revenu moyen par visiteur. Parce que si votre produit coûte trois fois plus cher, et que vous en vendez deux fois moins, vous gagnez 66% de plus. Et si votre produit coûte dix fois plus cher et que vous en vendez cinq fois moins, vous doublez vos revenus. Faites le calcul avec votre propre produit, vous serez probablement étonné… ous pensez depuis des mois à créer votre propre produit ? Vous avez raison : La bonne nouvelle, c’est qu’il est simple comme bonjour de créer un produit qui cartonne, à condition d’éviter les erreurs qui vous empêchent d’atteindre la rentabilité. J’explique tout, en 3 étapes simples : Etape 1 – Trouvez un concept irrésistible avec la méthode du génie de la lampe : La plupart des gens commencent par foncer tête baissée dans la création d’un produit… puis se demandent comment ils vont bien pouvoir faire pour le vendre. Vous êtes peut-être passé par là, et ce n’est pas étonnant : c’est l’erreur qui empêche 90% des entrepreneurs d’atteindre la rentabilité. Cette fois-ci, vous allez commencer par trouver un concept irrésistible pour vos clients. Au lieu de vous lancer dans la création d’un produit dont vous avez envie, ou que votre grand-mère trouverait “plutôt sympa”. Il suffit de vous mettre dans la peau de votre client moyen, et d’imaginer qu’un génie vous demande quel est le voeu qu’il peut exaucer pour vous. Ne pensez même pas à ce que vous savez faire. Ne pensez même pas à ce que vous pourriez proposer à votre client. Ne pensez même pas à vous. Pensez à lui. Partez de ses problèmes. Mettez-vous dans sa tête. Pas dans la vôtre. — Quel est le premier problème qui viendrait à l’esprit de votre client si un génie lui proposait d’exaucer un seul voeu ? — Quel est son problème le plus pénible, le plus urgent, le plus insupportable ? — Quel est le problème qui l’empêche de dormir ? Si vous n’arrivez pas à trouver une réponse à cette question, posez-la directement à vos clients. Proposez un sondage, envoyez une newsletter, interrogez-les sur Twitter ou Facebook… Et une fois que vous avez trouvé la réponse, vous avez déjà le concept de votre produit : Votre futur produit, c’est tout simplement la solution la plus facile et la plus rapide qui puisse exister pour mettre fin à ce problème. Le génie de la lampe, c’est vous. C’est vous qui allez exaucer le voeu le plus cher à vos clients. Même si, pour l’instant, vous ne savez pas encore comment vous allez bien pouvoir faire pour le concrétiser, vous avez entre les mains LE concept irrésistible. LA solution pour laquelle vos clients sont prêts à échanger non pas 20€, mais peut-être les revenus d’une semaine de travail. Ou d’un mois. Alors même si vous ne savez pas encore comment vous allez leur permettre de résoudre ce problème, même si vous paniquez un peu (et c’est bien normal), vous avez tout le temps pour vous creuser la tête, et remuer ciel et terre s’il le faut pour leur fournir cette solution. Parce que le jeu en vaut la chandelle. Vous partez avec une avance énorme : vous, vous allez vendre un produit que les gens veulent. Une solution à la recherche de laquelle ils ont peut-être déjà dépensé des milliers d’euros, sans succès. Une solution à la recherche de laquelle ils ont passé des mois ou des années, et ont échoué. Vous, vous allez leur apporter sur un plateau. Votre produit, vos clients le VEULENT. Et l’achèteront, parce qu’il n’y a rien d’autre dont ils ont davantage besoin. Ils sont prêts à INVESTIR. A fournir un EFFORT EXCEPTIONNEL pour l’obtenir. Alors qu’un “produit sympa”, vos clients le trouveront peut-être “plutôt pas mal”… et l’achèteront uniquement s’ils ont quelques euros à perdre… mais pas plus. Et ça fait toute la différence : vous partez avec une longueur d’avance qui ne se mesure plus en kilomètres mais en années-lumière. Reste à savoir comment rendre ce produit palpable. Comment concrétiser votre solution. Et c’est ce que vous allez voir tout de suite : Etape 2 – Transformez une solution rêvée en un produit concret et palpable : Souvenez-vous : vos clients ont un problème pénible et urgent. Votre job : leur donner une solution facile et rapide. Soit exactement l’inverse. Commencez donc par choisir le format le plus facile et le plus rapide pour obtenir une solution : Est-ce un service en ligne ? Un guide pratique ? Une formation ? Si vous vendrez des informations, vous pouvez mélanger les supports pour créer un “système”, une “méthode” ou un “kit”, qui contient à la fois des fichiers audio, vidéo et pdf, par exemple. C’est le meilleur moyen d’aider vos clients à se concentrer sur la valeur de la solution plutôt que celle du contenant. Parce que si l’on est prêt à investir les revenus d’une ou deux semaines de travail pour résoudre un problème pénible, on n’est pas forcément prêt à le faire pour acheter un bête fichier PDF, ou un bête fichier vidéo. Une fois que vous avez choisi le format, créez le moyen le plus facile et le plus rapide possible pour obtenir une solution : — Au lieu de fabriquer un produit exhaustif, créez un produit simple à utiliser. Jetez tout ce qui ne sert à rien, tout ce qui ne permet pas d’avancer concrètement vers la solution. — Au lieu de diviser un guide par chapitres, organisez-le en “journées”, “étapes” ou “actions”. Proposez un cheminement depuis le problème jusqu’à la solution. — Au lieu de de détailler des concepts et des idées, proposez des actions. — Au lieu d’expliquer, montrez. Limitez la théorie aux seuls endroits où elle est indispensable à comprendre pour être capable de passer à l’acte. Inutile de connaître l’histoire de l’informatique pour savoir envoyer un email, par exemple… — Utilisez un langage simple, compréhensible par un enfant. Les termes techniques, complexes ou anglophones ne sont utilisés que s’ils sont indispensables. Ils sont systématiquement “traduits” en langage simple. Souvenez-vous : votre objectif ce n’est pas de “faire comprendre”. C’est de donner une solution concrète et palpable, le plus facilement possible, et le plus rapidement possible. Un médecin ne vous vend pas le Vidal quand vous avez la grippe. Il vous donne un médicament. De la même façon, vous n’allez pas vendre un cours de html à un entrepreneur qui a besoin de trouver des clients sur le web. Vous n’allez pas vendre un traité en 3 tomes sur la diététique à une personne qui a besoin de perdre du poids. Ce que vous allez leur vendre, ce sont des solutions concrètes, rapides, étape par étape, faciles à appliquer. Votre job, c’est de retirer de la pénibilité et du temps. Trouvez des raccourcis. Proposez des outils clés-en-main plutôt que de détailler une procédure complexe. Donnez des exemples “à recopier”. Bref, vous avez compris. Etape 3 – Faites appel à des intervenants extérieurs : Souvenez-vous, vous aviez défini votre concept non pas en fonction de ce que vous savez faire, mais en fonction de ce dont vos clients ont besoin. Et par conséquent, vous n’avez pas forcément toutes les compétences nécessaires pour les aider… La bonne nouvelle, c’est que vous pouvez créer un produit de qualité exceptionnelle sans rien y connaître au sujet… C’est simple : au lieu d’être un expert, vous êtes un journaliste. Vous compilez les conseils des pros. Vous les organisez de façon pratique, étape par étape. Vous les rendez faciles à comprendre. Vous pouvez faire appel à des intervenants extérieurs pour un chapitre, comme pour la totalité de votre produit. A une condition : que vous transformiez la matière première fournie par vos intervenants en solutions concrètes. Parce qu’il ne s’agit pas de vendre à vos clients une suite d’interviews ou d’avis d’experts. Il s’agit de leur vendre une solution clés-en-mains. Un exemple ? Eben Pagan, un formateur américain au marketing, aidait un débutant à créer une solution au problème suivant : entrer à l’université d’Harvard quand on n’a pas le profil classique. Le créateur du produit n’avait jamais mis les pieds à Harvard. Il était aussi compétent pour conseiller ses clients que je le serais pour enseigner le tricot au club du 3è âge… La solution ? Utiliser les réseaux sociaux pour trouver 10 ou 12 étudiants d’Harvard au profil de loosers, qui ont pourtant réussi à intégrer l’école prestigieuse malgré un passé scolaire désastreux. Et les rencontrer pour leur demander comment ils ont fait. Quels ont été les raccourcis, les astuces, les stratégies qui leur ont permis d’entrer à Harvard. Puis, de transformer cette “matière première” en une suite d’actions étape-par-étape. Le résultat, ça aurait pu être un produit du type : “Comment ils ont hacké Harvard” : les 12 cancres admis dans l’école la plus prestigieuse des Etats-Unis dévoilent comment ils ont réussi à convaincre les examinateurs les plus coriaces au monde, et comment vous pouvez le faire aussi. » Imaginez-vous dans la peau d’un postulant à Harvard qui passe sur une page web qui présenterait ce produit : vous ne POUVEZ PAS VOUS PERMETTRE de ne pas l’acheter. Pourtant, l’auteur n’a jamais mis les pieds dans l’école en question… Vous pouvez faire la même chose, quelle que soit votre thématique. Appuyez-vous sur les témoignages de ceux qui ont résolu le problème de vos clients pour leur proposer le produit qu’ils ne peuvent PAS SE PERMETTRE de ne pas acheter. Voici un article que j’avais écrit en 2011, à là grande époque des blogs, et avant la montée de YouTube. C’est amusant de voir comment les mêmes choses s’appliquent aux plateformes d’aujourd’hui… Voici cet article : Il y a trois siècles à l’échelle du web, les portails et les sites perso régnaient en maîtres. Puis les forums les ont détrônés. Avant que les blogs ne les remplacent. A leur tour, les réseaux sociaux ont gagné du terrain face aux blogs. En 2010, l’internaute moyen passait déjà 10% de son temps sur Facebook. C’est une constante : les plateformes changent. Demain, les mots WordPress et Facebook seront des souvenirs du bon vieux temps. Des reliques. Comme le sont en 2011 Multimania, Caramail, iFrance, et déjà Myspace. Alors, votre site a t-il un avenir ? Rien n’est moins sûr. De la même façon que les internautes ont délaissé les forums au profit des blogs, ils en viendront à oublier votre site et les autres. Pour une autre plateforme. Pour un autre support. Par contre, votre message, lui, est plein d’avenir. Vos idées. Votre ligne éditoriale. Votre approche. À condition de ne pas les enfermer dans la soute d’un navire qui va et vient au gré des vagues, et qui se dirige dangereusement vers un iceberg. A condition de libérer vos contenus, et de ne plus limiter leur publication à votre seul blog. Pourquoi bloguez-vous? Pour accumuler un maximum de visiteurs sur votre site? Certainement pas. Vous bloguez peut-être pour partager vos idées. Ou vos découvertes. Vous bloguez peut-être pour gagner votre vie. Ou arrondir vos fins de mois. Vous bloguez peut-être pour faire connaître votre PME, et trouver des clients. Vous bloguez peut-être pour démarrer des discussions, et débattre sur un sujet qui vous tient à coeur. La seule certitude, c’est que vous ne bloguez pas seulement pour qu’on visite votre site. Vos pages vues par jour ne sont pas une fin en soi. Vous ne cherchez pas l’audience pour l’audience, mais pour faire connaître votre message. Alors pourquoi se limiter à un blog ? Pourquoi enfermer vos contenus dans une plateforme figée ? En proposant vos articles sur d’autres sites, non seulement vous libérez vos contenus, mais vous touchez aussi des publics nouveaux. Qui n’auraient jamais entendu parler de votre message ni de votre nom si vous ne l’aviez pas fait. En un mot, vous vous ouvrez au monde. Parce qu’il ne s’agit pas d’abandonner votre blog. Au contraire. Il s’agit d’être présent partout : à la fois chez vous, chez les autres, et dans les « lieux publics » comme les sites collaboratifs. Il s’agit de dissocier votre contenu de son support. Reste le problème de la monétisation. Si vous gagnez votre vie en affichant des bannières publicitaires sur votre blog, il vous sera bien difficile de libérer vos contenus sans perdre de revenus. A moins que vous n’en profitiez comme d’une aubaine pour créer (enfin) votre première ligne de produits. Formations, guides pratiques, outils en ligne, logiciels… Non seulement vous allez probablement décupler vos revenus (c’est ce qui se passe en général quand un blogueur abandonne Adsense pour vendre ses propres créations à ses lecteurs), mais vous allez enfin vivre de « votre bébé ». De votre produit à vous. Plutôt que de publicités que vous ne contrôlez pas, et que vos lecteurs vous reprochent souvent. Si vous avez lancé votre activité, vous êtes forcément tombé, à un moment ou un autre, dans l’un de ces 2 pièges. On y est tous passés, et moi le premier. Aujourd’hui, si votre business peine à décoller, c’est probablement que l’un de ces pièges vous freine encore… et qu’il est temps de vous en sortir pour de bon : Piège n°1 : Etre esclave de l’avis des autres Arrondir les angles d’une vidéo incisive, par peur des réactions de votre audience dans les commentaires, c’est être esclave de l’avis des autres. Remettre à plus tard, ou annuler carrément le lancement d’un produit ou d’une promotion, par peur de paraître “trop commercial”, c’est être esclave de l’avis des autres. Passer davantage d’heures à écouter ce que les autres disent sur vous, sur les réseaux sociaux… que le temps que vous utilisez pour créer des contenus, c’est être esclave de l’avis des autres. Le risque, c’est de limiter vos objectifs, de limiter ce que vous croyez possible d’accomplir, à ce que la moyenne en pense. Le risque, c’est de perdre la flamme. Et de vous enfermer dans le confort de la médiocrité. Si votre objectif, c’est d’obtenir des résultats moyens, souciez-vous de l’avis de la moyenne. Par contre, si votre objectif, c’est d’obtenir des résultats exceptionnels… souciez-vous de l’avis des gens exceptionnels. Et ignorez tout le reste. C’est moins confortable, parce qu’on aime souvent avoir la validation des autres avant de prendre une décision ou de lancer un projet. Or, réussir, ça commence par avoir confiance en soi. Quoi qu’en pensent les autres. Piège n°2 : Utiliser de fausses excuses pour ne pas passer à l’action tout de suite Croire qu’il faut “tout savoir” sur le business avant de lancer votre activité, c’est utiliser de fausses excuses pour ne pas passer à l’action tout de suite. Passer 10 fois plus de temps à apprendre qu’à mettre en pratique, c’est utiliser de fausses excuses pour ne pas passer à l’action tout de suite. L’information ne sert à rien si elle reste à l’état virtuel. Attendre d’avoir plus de temps libre, attendre d’avoir plus d’argent de côté, attendre l’été ou l’arrivée des extra terrestres pour lancer votre activité ou tel projet, c’est utiliser de fausses excuses pour ne pas passer à l’action tout de suite. Tout le monde a ses excuses. Celles que vous avez aujourd’hui seront remplacées par celles que vous trouverez demain… Quand j’explique que je travaille sur le web, et que je voyage souvent, beaucoup de gens me disent “J’aimerais bien faire la même chose si je pouvais“… ou encore “Ah, si au moins j’avais plus de temps” ; “Ah, si au moins je n’avais pas ce crédit à rembourser” ; ”Ah, si au moins ceci, cela, ou autre chose…”. Il y a toujours un “Si au moins”. La vérité, c’est qu’il y aura toujours des “Si au moins…”. Et ceux de demain seront peut-être encore plus importants que ceux qui vous limitent aujourd’hui. Au boulot ! Si vous passer à l’action, quoi qu’en pensent les autres, quelles que soient vos imperfections, et quelle que soit votre situation actuelle, vous multipliez vos chances de réussite par 1000. Ce dont vous croyez avoir le plus besoin, que ce soit la validation des autres, le temps libre ou l’argent, c’est au contraire ce qui vous limite. Ce qui vous empêche de passer à l’action aujourd’hui. Vous disposez déjà de tout ce dont vous avez besoin. Quelle que soit votre situation, et quoi qu’en pensent les autres. Quand on comprend ça, on part avec des kilomètres d’avance… Au fil des ans, j’ai amélioré mon efficacité à l’extrême, jusqu’à obtenir ces résultats : — Je travaille seul (sauf sous-traitance ponctuelle sur des projets précis, et traitement du support-clients), et je réalise un CA supérieur à beaucoup de PME de 5 à 10 employés… — Je travaille 4 à 5 fois moins longtemps chaque semaine qu’un salarié aux 35 heures… On me demande souvent comment je fais : c’est beaucoup plus simple que vous pouvez l’imaginer… Quand on est payé à l’heure ou au mois, il est naturellement inutile de travailler son efficacité. On regarde l’horloge, et on attend la fin de la journée, comme on attendait la fin des cours à l’école… Le problème que vivent beaucoup d’indépendants, c’est qu’ils reproduisent le même schéma une fois qu’ils travaillent pour eux… alors qu’en appliquant ces règles simples, ils pourraient abattre tout seuls le travail d’une équipe de 10 salariés, tout en gagnant du temps : Règle 1 : devenez un fondamentaliste de la concentration L’idée, c’est de ne se concentrer que sur une seule tâche à la fois, et d’y canaliser toute son énergie, à 3000%. L’objectif est d’atteindre un état hypnotique, dans lequel on n’entend plus rien de ce qui se passe autour de soi, dans lequel on ne remarque plus rien de ce qui bouge autour de soi, et dans lequel on est canalisé à 3000% sur la tâche en question. Ca vient facilement, avec un peu d’entraînement : La première étape : coupez le téléphone, et éteignez les notifications de tous vos appareils. La deuxième étape : expliquez à vos proches que lorsque vous travaillez, vous n’acceptez pas d’être dérangé, quelque soit le prétexte, même urgent. Ne tolérez aucune dérogation, aucune exception. Votre temps de travail, c’est votre temps à vous. Point. Vous pouvez acheter une lumière rouge comme celles qu’on trouve dans les radios, par exemple, et l’allumer pour indiquer à ceux qui vivent avec vous que vous êtes occupé. Règle n°2 : chronométrez tout Cela fait exactement 5 minutes et 6 secondes que je travaille sur cet article, rédaction du plan inclus. Je le sais, parce que j’utilise un chronomètre, et que je mesure la durée de chacune de mes tâches. Pourquoi ? D’abord parce qu’en sachant qu’une tâche est chronométrée, on avance plus vite. C’est étrange, mais c’est pourtant flagrant : essayez, vous serez surpris… Ensuite, parce que je définis un temps limite pour chacune de mes tâches. Chaque action est comme un jeu : l’objectif, c’est de battre la montre… Règle n°3 : fixez-vous des défis, battez vos records, et faites-en une passion Si la dernière page de vente que j’ai créée a été rédigée en 2h50, la prochaine le sera en 2h30. Parce que si c’est possible en 2h50, c’est forcément possible aussi en 2h30. En se fixant ce genre de défis, on identifie tout de suite, naturellement, les postes chronophages. On les élimine, on les remplace par des alternatives plus rapides, ou on les automatise. En transformant ce petit jeu en passion, on devient efficace en l’espace d’une semaine. Règle n°4 : supprimez les tâches qui ne valent pas votre temps Calculez le revenu que vous générez en une heure moyenne de travail, en divisant votre bénéfice mensuel par le nombre d’heures pendant lesquelles vous travaillez. Vous obtenez votre productivité horaire moyenne, c’est à dire l’argent que vous générez en étant assis pendant une heure devant votre ordinateur. Et vous avez deux façon de l’augmenter : travailler plus rapidement, ou travailler davantage sur ce qui rapporte le plus (et moins sur ce qui rapporte moins…). Le choix le plus efficace consiste à faire les deux à la fois : réduire son temps de travail tout en supprimant les tâches qui n’apportent pas assez. Listez chacune des tâches que vous avez chronométrées, et calculez leur rentabilité moyenne par minute. Vous allez forcément identifier les actions qui plombent votre productivité horaire moyenne… Il vous reste à les supprimer, à les simplifier, à les automatiser ou à les sous-traiter. Règle n°5 : Commencez par le plus difficile Commencez toujours vos journées par “LA tâche rébarbative”, celle que vous décaliez de jour en jour depuis des semaines. Organisez vos journées de travail en commençant par le plus rébarbatif, jusqu’au plus agréable. Et si toutes vos tâches de la journée vous enchantent, commencez par accomplir une autre action, profondément rébarbative, que vous aviez planifié pour un autre jour. En vous imposant cette règle, et en la suivant tous les jours, sans exception, vous allez aussi gagner en liberté d’esprit, parce que vous aurez supprimé de vos idées ces “tâches noires” qui envahissaient vos pensées. Règle n°6 : Séparez le boulot du reste La première chose à faire après le petit dej’ : abattre TOUTES les tâches de la journée. Et ne pas s’arrêter tant qu’elles ne sont pas accomplies intégralement, quitte à déjeuner à 15 heures. Ne planifiez jamais de rendez-vous ni d’activités extérieures au travail le matin, ou à une heure à laquelle vous savez que vous n’aurez pas encore terminé votre journée. Abattez tout, d’un coup, en bloc. Le résultat ? Vous avez l’esprit libre tout le reste de la journée. Et quand vous allez éteindrez votre ordinateur, vous allez vous sentir véritablement accompli, libre, et détendu. Comparez ça à ce que vivent les gens qui mélangent boulot et loisirs : ils vérifient frénétiquement leurs emails chaque 10 minutes sur leur iPhone au restaurant, n’arrivent à sortir la tête du travail à aucun moment de leurs journées, se pourrissent les weekends, ne peuvent pas se détendre en ayant véritablement l’esprit libre… et travaillent, du coup, davantage que vous. J’oubliais : contrairement à ces gens là, vous, vous prenez des vrais week-ends. Vous n’allumez pas une seule fois votre ordinateur pendant 2 jours par semaine. Sans exception aucune. Règle n°7 : Visualisez la fin de la tâche en cours Lorsque vous accomplissez une tâche, la seule chose qui doit vous occuper l’esprit -à part ce sur quoi vous travaillezc’est ce que vous allez faire et ressentir une fois que vous aurez terminé. Pensez à l’article que vous rédigez une fois qu’il sera achevé, et que vous aurez appuyé sur le bouton “publier”. Gardez en tête l’image de ce bouton pendant toute la durée de la rédaction. En focalisant votre attention sur l’accomplissement de la tâche, plutôt que sur sa difficulté, votre énergie est focalisée sur la fin, plutôt que sur le chemin. Du coup, vous cesserez de vous arrêter à chaque difficulté pour “traînasser”, et vous gagnerez encore en rapidité. Règle n°8 : Ne tolérez rien qui ne soit pas simple Refusez la complexité, dans tous les domaines : — L’organisation de vos dossiers — Votre système de gestion des tâches — Les logiciels que vous utilisez — L’organisation de la pièce dans laquelle vous travaillez — Les procédures et méthodes que vous suivez Si ce n’est pas simple, changez d’outil, ou simplifiez-le. Règle n°9 : Utilisez des procédures et des modèles Transformez toutes vos actions récurrentes en systèmes étape par étape, détaillés dans des fichiers texte. Vous n’aurez plus besoin de réfléchir à chaque étape : vous économisez de l’énergie et du temps. Créez un modèle à chaque fois que vous accomplissez une tâche pour la première fois, et que vous devrez la reproduire à l’avenir : réponses-type aux questions que l’on vous pose le plus souvent par e-mail, listes de structures de titres pour vos vidéos, etc… Règle n°10 : Installez des habitudes Il est toujours plus facile d’effectuer une tâche qu’on a déjà répétée déjà 100 fois, plutôt que de l’accomplir pour la première fois. Ecrire un article pour la première fois, c’est difficile. La 100è fois, c’est devenu naturel, instinctif, et facile. Créer un produit d’information pour la première fois, c’est difficile. La 20è fois, c’est devenu naturel, instinctif et facile. Définissez une régularité fixe pour chaque action qui est supposée se répéter à l’avenir. Et transformez ces actions en habitudes. A votre tour ! S’il est difficile pour vous de faire le tri parmi les idées de produits qui vous passent par la tête, si vous ne savez pas comment évaluer la viabilité de vos projets, alors ce qui suit va vous aider… Beaucoup d’entrepreneurs se lancent tête baissée dans la création d’un produit, avant même d’avoir la moindre idée de ses chances de succès… Ce qu’il leur faut, c’est une méthode simple pour faire le tri entre le bon grain et l’ivraie. Et la méthode que vous allez découvrir est probablement la plus simple et la plus efficace qui soit. Après l’avoir découverte, vous pourrez filtrer vos idées, et les trier, de celle qui a le plus de chances d’être rentable à celle qui en a le moins. Le problème, c’est que la plupart des entrepreneurs travaillent autrement. Une bonne partie d’entre-eux sont trop entreprenants : dès qu’une idée leur passe par la tête, ils la mettent en application. Avant même d’estimer sa rentabilité future. Avant même de se poser quelques questions simples. Certains sont capables de travailler comme une fourmi pendant des mois, pour enfin se rendre compte de l’évidence : leur projet est voué à l’échec. Une évidence qu’ils auraient pu constater avant de verser des litres de sueur… L’autre partie des entrepreneurs sont frileux. Ils ne se lanceront jamais dans la réalisation d’un projet s’ils n’ont pas l’absolue certitude de sa rentabilité. Du coup, ils copient ce qui fonctionne chez les autres. A la lettre. Sans réaliser, à aucun moment, que la copie ne vaut presque jamais l’original, et que leur stratégie est aussi une voie rapide vers l’échec. Il existe une autre méthode, qui est si simple qu’elle peut vous sembler stupide. Essayez-la, et vous changerez d’avis… La voici : 1Notez le revenu minimal que vous jugez acceptable. C’est la somme mensuelle en-dessous de laquelle vous abandonneriez le projet. Par exemple, 1000€. 2Calculez combien de visiteurs qualifiés sont nécessaires sur votre page de vente pour obtenir ce revenu. Faites le calcul avec un taux de transformation moitié-moins élevé que celui que vous obtenez habituellement avec produit au tarif proche. Par exemple, si mon produit coûte 20€ et que mon taux de transformation est de 1%, j’ai besoin de 1660 visiteurs par jour pour gagner 1000€ par mois avec ce produit. 3Listez toutes les sources de trafic envisagées, notez combien de visiteurs elles peuvent vous rapporter chaque jour. Puis divisez les chiffres par deux par sécurité. Par exemple : — Votre site — Vos vidéos — Vos mailings Basez-vous sur votre expérience et vos chiffres actuels pour établir l’estimation. 4Si vous ne parvenez pas à atteindre le nombre de visiteurs nécessaires, trouvez d’autres façons de drainer du trafic qualifié. Réfléchissez aux opérations de promotion que vous pourrez lancer. Si, au contraire, le nombre de visiteurs nécessaire est atteint, vous pouvez foncer. Le test est fiable : vous avez non seulement divisé votre taux de transformation par deux, mais aussi divisé vos estimations de trafic par deux : votre marge d’erreur est abyssale. Des lecteurs et clients me demandent parfois ce que je pense de leur idée de produit. Quand je leur dis que je n’y crois pas, parce qu’il leur faudra 4500 visiteurs par jour pour gagner 500€, il font grise mine, et refusent de l’entendre. Jusqu’à ce qu’ils fassent le test par eux-mêmes… avec de vrais clients. Et qu’ils constatent leur échec… après plusieurs semaines de travail acharné. En prenant 3 minutes pour calculer combien de visiteurs sont nécessaires pour générer des revenus acceptables, et si vous avez les ressources nécessaires pour obtenir ce trafic facilement et rapidement, vous multipliez vos chances de succès par 100. Essayez ! Si créez des vidéos ou si vous écrivez, il y a forcément des jours où vous rentrez bredouille de la chasse aux idées de sujets. Pourtant, la meilleure source d’inspiration se trouve juste devant vos yeux. Regardez bien… Vous ne la voyez pas encore ? Pas de panique, j’explique tout… Une bonne partie de vos contenus a déçu votre audience. Ils ne vous l’ont pas dit, mais vous l’avez bien remarqué : les commentaires sont inexistants, et leur circulation sur les réseaux sociaux aussi. Tout les créateurs en ont fait l’expérience, et moi le premier. Le problème, c’est qu’on part souvent d’une excellente idée, puis on l’exprime mal. On ne choisit pas les bons exemples. Ou pire, on la traite de façon aussi ennuyeuse qu’un documentaire sur la photosynthèse du plancton programmé à 3 heures du matin sur Arte. Et ce n’est pas la faute du sujet. Parce que vous pouvez transformer un concept clairement chiant en une explication simple, ludique et sexy. Et si vous avez pour ambition d’apprendre des choses à votre audience, c’est tout simplement… votre job. Expliquer le calcul des amortissements ou la TVA intra-communautaire avec des exemples aussi clairs qu’un ciel de printemps, enseigner la grammaire allemande avec des métaphores aussi parlantes qu’une fable de La Fontaine, c’est votre boulot. Vos contenus qui n’ont jamais décollé sont une manne. Une manne d’idées pour les prochains. Parce que ce ne sont pas les toujours sujets qu’il faut blâmer. C’est parfois vous. Si d’autres arrivent à scotcher leur audience en parlant du calcul des intérêts composés ou des bases de la physique quantique, vous n’avez aucune excuse. Et moi non plus. Reprenez les sujets de vos pires contenus. De vos flops. Et trouvez un autre angle. Un exemple parlant. Une métaphore éclairante. Une approche étonnante. Bref, transformez vos échecs en réussites. Vous avez besoin de 10 minutes, pas plus : listez vos vidéos ou vos articles par nombre de commentaires ou de likes, les moins aimés en premier. Vous avez devant vos yeux (au moins) 25 idées de contenus, qui pourraient bien être les meilleurs que vous n’ayez jamais eues… mais que vous n’avez pas encore su exploiter correctement. Au boulot ! Vous avez forcément vécu le syndrome de la page blanche : vous avez un article, un mailing ou le chapitre d’un guide à créer, mais vous n’arrivez pas à vous y mettre. Vous ne pouvez pas lancer la machine. Vous restez bloqué à la première phrase. Quelle que soit la tâche, le problème est toujours le même : le plus difficile, c’est de commencer. Dans les lignes qui suivent, vous allez découvrir une méthode qui peut vous simplifier la vie, aussi bien pour écrire que pour accomplir toutes vos tâches quotidiennes. Il s’agit d’utiliser des « démarreurs » et des procédures détaillées. Les démarreurs sont des modèles qui simplifient la rédaction de la première phrase d’un article. Ou l’exécution de la première partie d’une tâche. Il s’agit, en d’autres termes, de remplacer une manivelle de 2CV par un démarreur électrique. Voici comment faire : 1Listez toutes les tâches dont le démarrage est pénible Si vous écrivez, il peut s’agir de la rédaction d’un article ou d’une newsletter. Si vous créez des produits d’information, il peut s’agir de la préparation d’un nouveau module, ou encore d’un argumentaire. 2Listez au-moins 10 démarreurs par type de tâche Pour les tâches de rédaction, listez des modèles de phrases d’introduction, comme celles-ci : « Si vous …., alors … » « Vous avez forcément vécu… » « Souvenez-vous de la dernière fois que… » Etc… *Créez une liste de démarreurs comme ceux-ci pour vos articles, une liste pour les chapitres de vos guides pratiques, une liste pour vos vidéos de formation…8 Le résultat ? Vous n’allez plus jamais revivre le syndrome de la page blanche, et vous aller gagner du temps que vous pourrez utiliser pour rédiger encore davantage. 3Créez une liste de procédures pour chaque tache répétitive Même si vous savez parfaitement comment rédiger un article ou envoyer un mailing, prenez le temps de rédiger des procédures détaillées pour ce type de tâches. Par exemple : 1Rédaction du plan 2Rédaction du titre 3Rédaction des sous-titres 4Rédaction du contenu 5Relecture immédiate 6Relecture le lendemain L’avantage des procédures détaillées, c’est qu’elles permettent de concentrer son attention sur une « micro-tâche » à la fois. Ce qui rend la tâche globale plus facile à accomplir, morceau par morceau. D’ailleurs, en rédigeant vos procédures, vous allez probablement constater que vous pouvez améliorer facilement votre efficacité en modifiant ou en améliorant telle ou telle étape. Une fois vos procédures rédigées, vous pouvez aller encore beaucoup plus loin… et établir une liste de démarreurs pour chacune de leurs étapes. Essayez : vous serez surpris de vos résultats ! Vous vendez un produit, et vous avez de bonnes raisons de croire qu’il est la solution parfaite aux problèmes de vos clients… Pourtant, ils ne veulent rien entendre ? Le problème, c’est peut-être que vos raisons ne sont pas forcément les leurs. Cherchez-vous le point sensible de vos clients ? Si on a déjà essayé de vous vendre un ordinateur en insistant sur sa puissance, alors que vous recherchiez un PC au design élégant, vos raisons n’étaient pas les mêmes que celles du vendeur. Votre point sensible, ce n’était pas la technique, mais l’esthétique. Et de la même façon, vos clients n’ont pas forcément les mêmes raisons d’acheter que vous. Un thérapeute expliquait qu’il avait développé plusieurs dizaines d’arguments pour convaincre une femme de renoncer à ses projets de suicide. Rien n’y faisait, jusqu’à ce qu’il découvre son point sensible : La patiente était une militante végétarienne, à tendances extrêmes. La raison qui l’a convaincue de changer d’état d’esprit ? Une fois partie, plus personne ne dirait à ses enfants de ne pas manger de viande… Adaptez votre produit en fonction des véritables attentes de vos clients Si vos clientes n’achètent pas vos sacs à main, ce n’est pas forcément à cause de leur qualité. C’est peut-être parce qu’on ne voit pas assez qu’ils sont chers, et qu’ils perdent par conséquent leur utilité en tant qu’emblème de prestige. Si vos clients n’achètent pas votre livre, ce n’est pas forcément à cause de la qualité des informations qu’on y trouve. C’est peut-être parce qu’il est trop épais, ou qu’il semble trop compliqué à lire. Si vos clients n’achètent pas votre appli, ce n’est pas forcément à cause de ses fonctionnalités. C’est peut-être à cause de son look. Le créateur d’un produit l’apprécie souvent pour des raisons différentes de celles pour lesquelles les clients l’achètent. C’est sa création. Son « bébé ». Il est fier des éléments sur lesquels il a passé le plus de temps… et qui sont parfois invisibles pour le client. A vous de jouer ! Trouvez les véritables points sensibles de vos clients, trouvez les vraies raisons pour lesquelles ils achètent, et vous les convaincrez plus facilement. La plupart des gens se trompent quand ils essayent de dépasser leur limites, et voici pourquoi. Si vous essayez de booster vos résultats, d’augmenter le chiffre d’affaires de votre entreprise, de convaincre votre DRH de vous permettre d’évoluer, ou même d’améliorer vos performances sportives ou scolaires… l’obstacle n’est pas forcément celui que vous croyez. Et voici pourquoi. Avant le 6 mai 1954, les coureurs pensaient qu’il était physiquement impossible de battre le record d’un mille en 4 minutes (environ 1,6 km). Personne n’avait jamais parcouru cette distance en si peu de temps, et tout le monde pensait que c’était impossible. Des médecins affirmaient qu’il s’agissait d’une limite physique, infranchissable. Or, le 6 mai 1954, Roger Bannister a battu le record. Juste après, 16 autres coureurs ont parcouru un mille en moins de 4 minutes, démontrant que la limite n’était pas physique, mais mentale. Parce qu’on est incapable d’accomplir ce que l’on croit impossible. Un autre exemple ? Dans son livre Maximum Achievement, Bryan Tracy raconte l’histoire d’un étudiant qui entre à l’université après avoir passé un test. Le résultat de ce test indique qu’il fait partie du « 99th percentile », c’est-à-dire que ses compétences intellectuelles sont supérieures à 99% des étudiants testés. Le problème ? L’étudiant avait mal lu son évaluation, et avait compris que son QI était de 99… soit en-dessous de la moyenne de la population. Du coup, parce qu’il était convaincu d’avoir une intelligence médiocre, les résultats de son premier semestre étaient catastrophiques. Jusqu’à ce qu’il se rende compte de son erreur et qu’il réalise qu’il était doué d’une intelligence rare… La conséquence ? Immédiatement, ses résultats sont passés d’un niveau médiocre à un niveau exceptionnel. Simplement en changeant de convictions sur ce dont il était capable d’accomplir. La limite n’était pas intellectuelle : elle était mentale. Parce qu’encore une fois, on est incapable d’accomplir ce que l’on croit impossible. Il vous est probablement déjà arrivé, comme à moi, de dépasser une limite qui semblait infranchissable, puis ensuite de la considérer non plus comme une barrière haute, mais comme une barrière basse. Comme le minimum acceptable. Par exemple, lorsque vous atteignez un niveau de rémunération que vous pensiez impossible à obtenir, vous vous y habituez vite, et il devient impensable de revenir en arrière. La barrière s’est transformée en minimum acceptable, et ce niveau de revenus ou de CA vous semble désormais naturel. Vous êtes convaincu qu’il serait tout à fait possible de l’atteindre à nouveau si vous repartiez de zéro aujourd’hui. Cette limite n’était pas liée à vos compétences : elle était mentale. Parce qu’encore une fois, on est incapable d’accomplir ce que l’on croit impossible. Passez en revue tous les domaines dans lesquels vous pensez qu’il est impossible de vous dépasser. Il est terrifiant de constater que la plupart du temps, la limite est aussi mentale. Et uniquement mentale. Souvenez-vous simplement de l’histoire du coureur et de celle de l’étudiant la prochaine fois que vous voudrez battre un record personnel. Parce que la tâche est probablement plus facile à accomplir que ce que vous pensez. Le taux de transformation d’un argumentaire, c’est le pourcentage des gens qui l’ont vu qui ont acheté le produit. Il existe une formule simple pour booster votre taux de transformation et vendre plus. Elle a été mise au point par un groupe de marketeurs américains, il y a quelques années. Cette formule est tellement puissante qu’elle peut vous permettre de doubler votre taux de transformation, avec quelques actions simples. Elle vous permet d’identifier tout de suite les éléments qui posent problème dans votre argumentaire, et ceux qu’il vous faut ajouter à votre page de vente pour compenser ses faiblesses. Cette formule, la voici, adaptée en français : Taux de transformation = Motivation + Valeur perçue + (Incentive – Friction) – Anxiété Ca vous semble compliqué ? Pas de panique : dans quelques minutes, ça vous paraîtra évident… J’explique tout : La motivation, c’est la mesure du besoin de vos clients : Plus vos clients sont désespérés de trouver une solution rapidement, plus les conséquences de leur problème sont pénibles, plus ils sont motivés pour acheter. Un exemple ? Votre degré de motivation pour acheter un médicament quand vous souffrez est excessivement élevé (vous êtes désespéré, vous avez besoin d’une solution rapidement, et les conséquences du problème sont pénibles)… Au contraire, votre degré de motivation pour acheter un objet de déco ou un accessoire d’habillement est bas (vous n’en avez pas vraiment besoin, il n’existe aucune conséquence grave au fait de ne pas acheter…). Plus vous proposez des produits qui apportent une solution à un problème grave et urgent, plus vous augmentez le facteur “Motivation”. Et c’est le facteur dont le coefficient est le plus élevé. Celui dont l’influence la plus importante sur votre taux de transformation. La valeur perçue, c’est la valeur que représente votre produit pour le client : Une carte au trésor a davantage de valeur pour la solution qu’elle présente que pour le papier sur lequel elle est dessinée… C’est la raison pour laquelle vous devriez cesser de vendre des supports, et commencer à vendre des solutions: — Vous ne vendez pas une vidéo de préparation aux entretiens d’embauche (valeur perçue : pas plus de 30€), vous vendez la solution pour décrocher un job (valeur perçue : l’équivalent de plusieurs années de salaire)… — Vous ne vendez pas une formation à la création d’entreprise (valeur perçue : 500€ maximum), vous vendez la solution pour lancer une entreprise rentable sur le long terme en un minimum de temps (valeur perçue : l’équivalent de plusieurs années de bénéfices)… Etc… Plus le client voit de valeur dans votre produit, plus il devient susceptible d’acheter. Et la première chose à faire pour augmenter cette valeur, c’est de lui présenter des solutions. Et pas un vulgaire support. La valeur perçue, c’est le deuxième facteur le plus important dans notre formule. Pensez-y ! L’incentive, c’est ce qui pousse le client à acheter maintenant. Et la friction, c’est ce qui l’en empêche : Plus votre offre crée de friction, plus il devient nécessaire de compenser cette friction avec une incentive forte. Voici des exemples de friction : vous n’acceptez pas tous les modes de paiement, il faut remplir un (long) formulaire avant de pouvoir acheter, la page de vente est remplie de liens qui emmènent sur d’autres pages, etc… Voici des exemples d’incentive : vous proposez un prix réduit pour les 2 prochains jours ou les 30 prochains clients, vous offrez tel ou tel bonus pour un achat immédiat, etc… L’anxiété, c’est ce qui pousse le client à émettre des doutes : Pour réduire son anxiété, vous pouvez lui proposer un essai gratuit, une garantie de remboursement en cas d’insatisfaction, une liste de vos clients célèbres ou des journaux qui ont parlé de vous… Réduire l’anxiété de vos clients, c’est presque aussi important pour votre taux de transformation (coeff 2) que de démontrer la valeur de votre produit (coeff 3)… Comment doubler votre taux de transformation en utilisant cette formule ? 1Commencez par étudier la motivation de vos clients : votre produit s’adresse t-il vraiment aux bons clients ? Peut-être devez-vous recentrer votre offre vers un groupe de personnes qui ont vraiment besoin d’une solution immédiate ? 2Continuez en améliorant la façon dont vous démontrez la valeur de votre produit : présentez-vous un bête support (un livre, un dvd…), ou de vraies solutions dont les conséquences positives sont chiffrées ? Listez-vous vraiment tout ce que votre produit va changer dans la vie de votre client ? L’idéal, c’est qu’on imagine un prix bien supérieur au tarif réel avant d’arriver à la ligne qui indique le prix. 3Réduisez la friction en simplifiant le processus d’achat, en évitant de demander des informations inutiles à vos clients, et en réservant les formulaires complexes pour la phase qui suit l’achat. Retirez tous les liens inutiles de vos pages de vente, et faites en sorte qu’il soit simple comme bonjour d’acheter votre produit. 4Augmentez l’incentive en proposant des offres limitées, et/ou en ajoutant un bonus. Donnez-leur une raison d’acheter maintenant, et pas plus tard. J’en parle en détail dans la formation “Créez votre produit en 1 weekend” : votre objectif, c’est de rendre insupportable l’idée de ne pas acheter tout de suite. 5Réduisez l’anxiété en affichant des preuves qui rassurent vos clients, des logos de partenaires connus, une garantie… Réduisez le risque perçu par vos clients ! En suivant chacune de ces étapes simples, vous pouvez certainement doubler leur taux de transformation. Au boulot ! Personne, dans aucun domaine, n’obtient des résultats exceptionnels en copiant ce que fait la moyenne. La moyenne est par définition limitée à des résultats moyens. Si tu veux vivre une vie exceptionnelle, il va falloir choisir d’organiser ta vie à l’inverse de ce que fait la moyenne. Si tu veux avoir une activité qui donne des résultats exceptionnels, il va falloir procéder à l’inverse de ce que fait la moyenne. Ça semble évident, et pourtant, à chaque fois qu’on se lance dans un nouveau projet, on cherche d’abord à savoir comment fait la moyenne pour pouvoir la copier. Et quand on a un souci, on va demander des conseils à la moyenne. Alors que dans 100% des domaines, c’est toujours une toute petite minorité qui obtient des résultats exceptionnels. Jamais la moyenne, par définition. Et cette toute petite minorité, elle a toujours les mêmes caractéristiques : 1Ses résultats sont exponentiellement supérieurs à ceux obtenus par la moyenne. Pas deux fois plus. Pas trois fois plus. Mais dix ou cent fois plus. 2Elle fait souvent des choix qui sont à l’inverse de ceux faits par la moyenne. C’est vrai pour tout, des revenus d’un indépendant jusqu’au bonheur : Une toute petite minorité avec des résultats exponentiellement supérieurs aux autres, qui a fait des choix radicalement différents pour y arriver. La stratégie la plus logique, elle consiste à juste ignorer ce que fait la moyenne. A ignorer aussi les conseils qu’elle donne. Pour s’intéresser uniquement à la façon dont la petite minorité qui réussit vraiment procède. Le souci, c’est qu’on aime bien la moyenne. Parce que la moyenne rassure. Et elle permet de moins de sentir seul. Mais elle n’a jamais aidé personne à devenir exceptionnel. Dans beaucoup de séries télé et films policiers, l’enquêteur pose « la » question fatidique quand il est déjà sur le pied de la porte, et qu’il s’apprête à partir : « Merci pour le café. Bonne journée ! … Ah, au fait, j’oubliais ! Juste une question de routine : vous étiez chez vous la nuit du meurtre ? » Si étonnant que ça puisse paraître, cette simple technique peut vous aider à vendre. Voici comment : Quand on essaye de convaincre, l’une des pires erreurs consiste à donner trop d’importance à la décision du client. À en faire le centre de son argumentaire. Par exemple, un mauvais vendeur ne vous parlera que de l’acte d’achat : « Si vous achetez tout de suite, je vous donne ceci en cadeau. Vous pensez peut-être que c’est cher, mais je vous garantis que votre effort financier sera rentabilisé rapidement. » Un bon vendeur présupposera l’acte d’achat, et vous considérera comme déjà convaincu : « Voici votre nouvelle voiture. Comment est-ce que vos collègues vont réagir quand vous allez la garer devant le bureau ? » Un mauvais vendeur utilise 90% de son temps de parole pour vous parler du contrat, du prix, et de votre décision. Un bon vendeur utilise 90% de son temps de parole pour vous parler des bénéfices du produit, et pour vous faire imaginer ce que vous allez ressentir quand vous allez le posséder. Le contrat, le prix, la décision, elles sont comme la question fatidique de Columbo : « Ah, au fait, j’oubliais, j’ai encore une place pour les livraisons de cette semaine. » En focalisant la discussion sur l’acte d’achat, le mauvais vendeur incite son client à développer des résistances. À se demander s’il prend vraiment la bonne décision. À trouver des objections. À peser le pour et le contre. En focalisant la discussion sur l’utilisation du produit, le bon vendeur incite son client à considérer la décision comme acquise. Comme faisant déjà partie du passé. La signature du contrat, ce n’est que la régularisation administrative de l’envie du client de posséder le produit. Aidez vos clients à concentrer leur attention sur la façon dont ils vont vivre avec votre produit, plutôt que de les aider à développer des résistances. Au lieu que vous leur réclamiez une signature, ce sont eux qui vous réclameront le contrat.

Voici une méthode (quasi) infaillible pour faire 100 000 vues sur Youtube : Créez une vidéo avec le titre : "Vidéo de motivation en français". Les gens se jetteront dessus comme des chacals. Mais vraiment, quel est l’impact de ce genre de vidéos ? Elles vous donnent un petit boost de motivation, qui redescend après quelques heures… et vous vous retrouvez à errer sur YouTube à la recherche de votre prochaine dose. Ca soulève quand même la question : Comment rester motivé pour travailler chaque jour sur votre projet, quand personne ne vous y force, et quand les résultats se font attendre ? Hier, on a vu la puissance des plans de 90 jours pour atteindre des résultats exponentiels. Encore faut-il avoir la discipline d’implémenter votre plan pendant 90 jours ! Clairement, vous doper à la vidéo motivationnelle au quotidien n’est pas une solution de long terme. Alors comment faire ? Pour trouver une solution, il faut se demander pourquoi c’est aussi difficile de se motiver. Et la réponse est simple : Travailler, c’est dur. Vous devez faire des efforts immédiats pour un bénéfice futur… qui en plus n’est pas garanti. Sur le moment, il est tellement plus facile de s’évader avec des vidéos YouTube ou son flux Instagram… Vu comme ça, c’est presque surprenant que quiconqueréussisse à travailler sans avoir un patron qui leur met la pression. Le problème, c’est que notre ADN est optimisé pour une vie de chasseur-cueilleur. Nous ne sommes pas conçus pour prendre des décisions de long terme. A l’époque il n’y avait pas de congélateur. Ca ne servait à rien de tuer 3 mammouths "pour plus tard" si votre tribu ne peut en manger qu’un et le reste va pourrir sur place. Alors la stratégie rationnelle est de faire le strict minimum pour survivre aujourd’hui et demain - et conserver votre énergie pour la prochaine chasse. Ça explique pourquoi : • C’est aussi dur de faire un régime (car l’homme préhistorique mange tout ce qu’il peut trouver, et plus c’est calorique, mieux c’est !) • La pression sociale est aussi efficace (car pour un homme préhistorique, se faire exclure de la tribu est équivalent à une condamnation à mort) • Il est dur de se motiver à travailler sur un objectif de long terme… • … mais quand vous avez une deadline (ou un examen) qui approche, vous êtes soudainement capable de travailler non-stop Heureusement l’être humain est équipé d’une faculté quasi-magique pour lutter contre ce paradoxe… La preuve : vous êtes en train de lire cet email, sur un téléphone ou un ordinateur. Cet appareil (et la chaîne logistique qui l’a mis entre vos mains) est le résultat de siècles d’avancement technologique porté par des êtres humains qui ont sacrifié le plaisir temporaire pour améliorer le futur. C’est donc possible - mais comment ? La réponse tient en un mot : "imagination". Ne voyez pas ça dans le sens des films Disney sur le pouvoir de l’imagination… Ou pire, dans le sens de "la loi de l’attraction"… Mais plutôt comme notre capacité à nous projeter dans le futur - et à visualiser ces scénarios comme s’ils étaient présents. Par exemple, si notre chasseur-cueilleur traverse un hiver difficile, il commencera peut-être à jouer au jeu du "et si ?"… "Et si l’hiver prochain est pire ?" "Et si les bisons ne reviennent pas ?" "Et si nos provisions ne durent pas jusqu’au printemps ?" Tout d’un coup, il sent une anxiété bien réelle dans le creux de son estomac. Il regarde ses enfants jouer avec des bouts de bois et il se demande s’il pourra les nourrir jusqu’à l’an prochain. Et peut-être qu’il décide d’attraper un animal… sans le manger tout de suite. Peut-être qu’il se constitue un petit troupeau pour être sûr d’avoir de quoi survivre plus tard. (Et invente l’élevage au passage). Cette citation est attribuée à Mark Twain : "Je suis un vieil homme et j’ai connu beaucoup d’ennuis, mais la plupart ne sont jamais arrivés". C’est vrai qu’imaginer des problèmes futurs peut nous causer beaucoup de douleur, parfois inutile. Mais c’est aussi ce qui nous permet de faire des provisions pour l’hiver, d’écrire des livres et de construire des entreprises. Tout bon marketeur sait que ce qui motive un prospect à agir est l’émotion, pas la raison. C’est aussi valable pour vous et moi. Pour rester motivé, il faut vous "auto-marketer". Pour prendre un exemple, pourquoi est-ce que je passe ma matinée à vous écrire ce mail ? Mon plan de la semaine dit : "1. Ecrire emails vente Formation 90 j"… Mais qu’est-ce qui me pousse à obéir à ce bout de papier ? N’aurait-il pas été plus facile de m’asseoir sur mon canapé et d’ouvrir Netflix ? Quelle différence est-ce que ça va faire, une journée de plus ou de moins ? Bien sûr, une journée fait une grosse différence. Je sais que si je ne travaille pas ce matin, il sera encore plus dur de travailler demain. Et je vois la pente infernale, vers la procrastination, le projet en retard, le business qui vacille. Je me vois au bord du gouffre, à cours d’argent, à la recherche de n’importe quel emploi qui paie mes factures. Est-ce que ces scénarios vont se produire ? C’est plus qu’improbable qu’on en arrive à ce point. Mais pour un instant, dans ma tête, ils se sont produits. J’ai ressenti la terreur de l’échec. La honte de décevoir les gens. L’amertume d’avoir laissé l’opportunité d’une vie me filer entre les doigts. Ces émotions sont bien réelles - même si le scénario qui les a suscité sont imaginaires. Et d’un autre côté, je peux voir la formation lancée avec succès. Je me vois prendre mon café le matin et compter les ventes faites pendant la nuit. Je vois comment cette pierre construit l’édifice que représente mon business. Je vois le jour où j’ai mis assez d’argent de côté pour ne plus jamais avoir à m’inquiéter. Je vois la naissance de mon premier enfant, et j’ai la confiance que son futur est assuré. Et c’est pour toutes ces raisons que je me suis mis à travailler ce matin. Même si personne ne me force. Même si je n’en ai pas besoin pour survivre aujourd’hui, et demain, et l’année prochaine. Même si mon travail est parfois stressant, parfois frustrant et souvent épuisant… Je suis sûr que vous avez déjà une imagination bien active. Votre imagination est votre feu intérieur - et comme vous le savez depuis que vous êtes gamin : c’est dangereux de jouer avec le feu. Vos émotions peuvent vous pousser vers l’avant et vous aider à pulvériser tous les obstacles sur votre chemin… ou elles peuvent vous paralyser sur place. Est-ce que la force de votre imagination vous motive au quotidien ? Ou est-ce qu’elle vous rend anxieux, distrait et frustré de ne pas avancer plus vite ? Ou peut-être que c’est un peu des deux ? Le secret de la motivation, c’est d’utiliser votre imagination pour aligner vos émotions quotidiennes avec vos objectifs de long terme. La volonté, c’est comme l’inspiration : ça va et ça vient. Un jour vous arrivez à vous forcer, le lendemain c’est trop dur… Vous ne pouvez pas compter dessus. Ce qu’il vous faut, c’est un système qui aligne tous les aspects de votre vie et de votre travail, pour avancer naturellement vers votre objectif chaque jour. En pratique, ce genre de système combine des exercices de visualisation, une réflexion poussée sur vos valeurs et des routines de conditionnement pour installer les bonnes habitudes. Je vous explique comment élaborer ce type de système dansLa Méthode des 90 jours. Il y a deux jours, je vous posais la question suivante : "Comment multiplier vos résultats par x10 (sans multiplier vos heures) ?" Et la réponse était celle de Nassim Taleb : "Utilisez la sagesse et le courage pour gagner de l’argent, pas le travail". La sagesse, c’est prendre de meilleures décisions, choisir des projets plus stratégiques, et identifier les opportunités exponentielles. (C’est ce dont on a parlé hier). Le courage est parfaitement défini par cette citation du président américain Franklin D. Roosevelt :

"Le courage, ce n’est pas l’absence de peur, c’est le jugement que quelque chose d’autre est plus important que la peur". Vous pouvez remplacer le mot peur par n’importe quelle douleur de court terme : anxiété, doute, difficulté à démarrer, résistance créative, perfectionniste, procrastination… Le courage est au somment de notre hiérarchie de la productivité car souvent, les tâches les plus importantes sont aussi celles qui sont les plus terrifiantes. Refaire le design de votre site web ne fait pas peur. Mais ça n’a pas non plus beaucoup d’impact. Lancer votre chaîne YouTube, ça fait peur. Et si vos vidéos ne sont pas bonnes ? Et personne ne vous regarde ? Et si les gens se moquent de vous ? Ca demande beaucoup de courage de créer et publier quelque chose de créatif chaque semaine, surtout quand vous n’avez pas encore de retours positifs. C’est la même chose si vous devez appeler des clients potentiels et leur vendre vos services. Ou écrire une page de vente pour votre produit. Ou lancer une idée un peu folle, au lieu de choisir un business copié-collé. Avez-vous le courage de faire les actions difficiles, mais dont le succès de votre business dépend ? Si vous n’avez pas cette pièce du puzzle, vous allez échouer. Même si votre idée est bonne, et même si vous travaillez beaucoup d’heures. La bonne nouvelle, c’est que personne n’est né avec ce courage. C’est une habitude et, comme toute habitude, vous pouvez la développer. Si vous voulez commencer aujourd’hui, vous pouvez rejoindre ma formation La Méthode des 90 jours - pour :

1. Rester motivé en connectant vos actions du jour à votre vision de long terme
2. Identifier les tâches les plus importantes et éliminer les distractions
3. Utiliser votre anxiété de manière productive pour avancer plus vite - et ne plus procrastiner Cliquez ici pour accéder à La Méthode des 90 jours dès maintenant - et commencer à voir des résultats avant ce soir. A demain, Stan PS : si vous avez des questions sur la formation, vous pouvez simplement répondre à cet email et vous aurez une réponse personnelle, de ma part ou de celle d’un membre de mon équipe :)

Plus le combat est difficile plus la victoire est belle Poser sur un papier le pourquoi vous voulez gagner ce combat et comment faire pour y arriver Garder ce papier avec vous Pourquoi écrire ? Pour évaluer le problème en se forçant à y réfléchir sous tous les angles et graver dans le marbre nos raisons et obligations qui pourront être mise à mal par nos émotions quotidiennes

### Aaaa

a
* mind mapping
* Le cerveau est l'outil principal de l'humain.
* Mais comment l'utiliser de manière optimale ?
* Le Mind Mapping est un outil créé par Tony Buzan pour aider chaque personne à mieux utiliser leur cerveau.
* Nous avons préparé trois vidéos sur le sujet :
* [https://la-semaine.com/sl/ss880.92o5/temoignages-mindmapping18](https://la-semaine.com/sl/ss880.92o5/temoignages-mindmapping18)
* (il faut être connecté au site pour voir les vidéos)
* Voici les vidéos que vous trouverez sur cette page :
* Témoignage d'une professionnelle de l'immobilier sur comment elle utilise le Mind Mapping avec ses clients (en compagnie de François Chevigne et Nicolas Lisiak)
* Mon retour d'expérience sur comment je m'entraîne pour le championnat du monde de Mind Mapping
* L'interview d'un entrepreneur qui nous raconte comment le Mind Mapping a sauvé sa scolarité (disponible jeudi)
* Belle journée à vous !
* Jérôme
* À partir de l’adresse [https://mail.google.com/mail/u/0/?hl=fr#inbox/FMfcgxvzLrQPkdVcZkwmsFkMrggwcVKp](https://mail.google.com/mail/u/0/?hl=fr#inbox/FMfcgxvzLrQPkdVcZkwmsFkMrggwcVKp)

Chère Diane,

En ce début d’année, nous formulons un seul vœu :

nous vous souhaitons de faire de la place.

En prenant une pause, en étant attentifs, en faisant un pas de côté, en ralentissant quelques instants, nous formons des espaces disponibles pour accueillir l’essentiel : la joie, la beauté, les émotions, la réalité. Car nous sommes conditionnés pour remplir : notre cerveau, notre frigo, notre agenda, notre garde-robe… ce qui peut nous conduire à un faux-plein, dépourvu de sens.

Nous vous souhaitons donc des vides pour pouvoir faire le plein de ce qui est important.

Explorer les mécanismes de notre cerveau

Et si, pour faire de la place, l’attention était la clé ? Les moments de bonheur dans nos vies ne sont-ils pas tout simplement des moments de pleine attention ?

Jean-Philippe Lachaux, célèbre chercheur en neurosciences cognitives, mène une action sur le long terme pour promouvoir la maîtrise douce de l'attention comme une valeur dans notre société.

Pourquoi ? Parce que si notre attention nous échappe constamment, nous risquons bien de passer à côté de notre vie. Et aussi parce qu’elle est un bien précieux, qui nous appartient, et que les géants du numérique se disputent à notre insu !

L’idée est donc de mieux comprendre les mécanismes de notre cerveau pour décider, instant après instant, vers quoi nous dirigeons notre attention : je fais ceci ou cela car je l’ai décidé, pas parce que des forces extérieures ou intérieures m’ont incité à le faire de façon automatique.

Nous vous proposons donc un parcours en 12 séances pour explorer les mécanismes du cerveau qui nous empêchent de nous concentrer, et retrouver le plaisir d’être aux commandes, comme lorsqu’on guide un cerf-volant.

Une histoire de corail

Pour terminer, voici le fruit d’un super travail d’équipe entre écriture, enregistrement, graphisme et animation. Une petite histoire sur le corail, qui nous apprend que pratiquer la méditation, loin d’être un acte égoïste ou isolé, est aussi un acte généreux et qui relie.

A bientôt,

petit bambou

Vu que les outils que je partage sont fondés sur la psychologie de l’attention, de l’intérêt et des besoins humains, tu pourras en bénéficier pour l’ensemble de carrière.

a un peu de théorie mais surtout des exercices, des plans d’actions, des conseils à appliquer immédiatement.

[Comment Créer une Page de Vente qui Convertit [Modèle + Exemples]](https://antoinebm.com/ecrire-une-page-de-vente/)

[Speechnotes | Éditeur de texte professionnel en ligne à reconnaissance vocale](https://speechnotes.co/fr/)

[Voice Notepad - Speech to Text with Google Speech Recognition](https://dictation.io/speech)

### → Créer Une Routine En Béton Pour Enclencher le Mode Autopilote (Hacks Pour Programmer Ton Subconscient à la réussite)

Routine du matin : Se préparer pour la journée Routine de travail : Productivité Routine du soir : Se vider la tête

J’ai pendant longtemps pensé qu’avoir une routine était vraiment chiant, pas excitant.

Et puis j’ai essayé.

Je suis devenu :

Plus productif

Plus organisé

Moins stressé

Plus motivé

Le but de la routine est de mettre son cerveau en mode auto pilote et de lui laisser faire le gros du travail.

Ainsi tu vas pouvoir libérer ta créativité et te concentrer sur ce qui est vraiment important.

Ton subconscient va s’occuper du reste.

Alors comment créer une routine efficace ?

Dans un premier temps il est important de la scindée en trois parties :

Matin Journée

Soir

Ensuite, c’est à toi de la remplir en fonction de tes objectifs et tes envies.

ROUTINE DU MATIN : SE PRÉPARER POUR LA JOURNÉE

Rien de plus important que la routine du matin pour bien commencer ta journée.

Celle-ci commence au réveil et se termine lorsque tu commences à travailler.

1 - Se lever tous les matins (tôt) à la même heure pour améliorer la qualité de ton sommeil et ne pas être en retard pour ta routine matinale.

Respecte ton horloge biologique.

Tu vas voir ton énergie augmentée si tu te couches et te lève à la même heure tous les jours.

2 - Bouger : La première chose que je fais au réveil est une activité sportive (course, exercices, yoga.. Peu importe).

Le but est de réveiller ton corps. C’est plus puissant qu’un café.

J’écoute souvent un podcast ou un livre audio à ce moment-là.

3 - Méditer : Penses ce que tu veux de cette pratique.

Je le fais régulièrement et il n’y a rien de mieux pour se vider la tête dés le matin et repartir à zéro pour la journée.

Les avantages de la méditation ont été également prouvés par des milliers d’études sur le sujet.

Pour varier le type de méditation, tu peux aussi faire de la visualisation. Mais j’en parlerai plus en détail dans la routine du soir.

4 - Relire tes objectifs : Idéal pour te rappeler la raison pour laquelle tu te lèves le matin et surtout ancrer ces objectifs dans ton cerveau.

5 - Une bonne douche et un bon café : Maintenant t’es prêt à bosser.

PS : Rajoute ce que tu veux dans cette routine matinale (écriture, lecture, affirmations ..).

Essayes plusieurs routines jusqu’à trouver celle qui te correspond le mieux.

ROUTINE DU TRAVAIL : PRODUCTIVITÉ

Pour augmenter ta productivité, il faut mettre en place une routine au travail.

Il existe des centaines de méthodes : pomodoro, sprints …etc.

Ici je vais te donner la mienne qui fonctionne à merveille.

1 - Fais une to do

Une to do list va t’éviter de perdre des heures à réfléchir entre deux tâches.

Tu vas aussi éviter de perdre du temps à bosser sur des choses qui ne sont pas importantes.

Alors fais une to do avant de travailler (la veille au soir de préférence).

2 - 3 x 90 minutes :

Travailles sur trois sprints de 90 min avec une pause entre chaque.

9h - 10h30 11h - 12h30 13h30 - 15h

Je n’invente rien, il a été prouvé que 90 min est la durée maximale pour rester concentré sur une tâche.

Plus d'infos ici :
[Why Working in 90-Minute Intervals Is Powerful for Your Body and Job, According to Science | Inc.com](https://www.inc.com/wanda-thibodeaux/why-working-in-90-minute-intervals-is-powerful-for-your-body-and-job-according-t.html)

Utradian rhythms have been made famous primarily through sleep study. The "father of
sleep", sleep researcher Nathaniel Kleitman, figured out that people go through ultradian
cycles whenever they get some shuteye. It was Kleitman who discovered rapid eye
movement (REM) and proposed that sleep included active brain processes. But Kleitman
also discovered that a Basic Rest Activity Cycle (BRAC) is present when people are awake,
too. Generally, these daily ultradian cycles involve alternating periods of high-frequency
brain activity (about 90 minutes) followed by lower-frequency brain activity (about 20
minutes). Scientists think that it's a delicate balance of potassium and sodium that
ultimately controls these cycles. They also know that brain cells use sodium and potassium
ions for electrical signals, and that your sodium and potassium levels are involved in the
osmosis process that transports other chemicals in and out of your brain cells.

3 - Coupe-toi du monde

Durant ces sprints, il est important d’éviter toutes distractions.

Téléphone en mode avion

Applications bloquées sur ton ordi (j’utilise

[@heyfocusapp](https://twitter.com/heyfocusapp)

)

Suis ta to do list

4 - Travailles dans le bon ordre

Commence par les tâches les plus complexes (et les plus chiantes)

Finis par les tâches cool et créatives.

Le cerveau fonctionne ainsi alors utilise le correctement.

ROUTINE DU SOIR : SE VIDER LA TÊTE

La vie n’est pas une routine non plus donc on va y aller tranquille pour le soir.

Pour moi il y a trois choses importantes à faire tous les jours en fin de journée.

1 - Faire une to do pour le lendemain.

En fin de journée, prends quelques minutes pour faire ta to do du lendemain

Ça t’évitera d’être perdu devant ton écran quand tu devras commencer à bosser le lendemain.

Et surtout ça va te permettre de te vider la tête.

2 - Visualisation

Négliger la puissance de la visualisation, c’est vraiment passer à côté d’un hack incroyable.

La visualisation est le fait de se poser, fermer les yeux et d’imaginer posséder un objet, être dans la maison de vos rêves ou accomplir l’un de vos objectifs.

Vous faites croire à votre cerveau que vous avez accomplie celui-ci et il sera alors plus simple pour vous de briser vos barrières mentales et atteindre vos objectifs.

Je vous ai partagé la réussite de

[@parmooonx](https://twitter.com/parmooonx)

qui a fait 1 M$ en 8 minutes.

Voilà une partie de son histoire :
Key Point #3: Do Not Underestimate the Power of
the Law of Attraction
You may have heard the saying, "Speak it into existence" or you have read
the famous book, "The Secret" by Rhonda Byrne. If so, you may be familiar
with the theory of the Law of Attraction.
The Law of Attraction is a simple concept speak into the universe, a truth
that you may not currently be experiencing, constantly visualize and feel all
the emotions associated with that truth and eventually, the universe will
work in your favor to acquire such truth.
For examples, I can speak the truth that I will make $100,000 by the end of
2020. With constant visualization, feeling, and hard work, eventually, the
universe will align that truth into my life and will allow me to achieve it.
The key here is that you have to feel and be passionate about that truth.
Simply stating it and going about your daily life will not make that truth
happen.
Mariee understood this very well and used it to her advantage. In her
Youtube vlogs, she spoke 3 truths that later came to fruition. Here first truth
was to buy a Jeep Wranger (an SUV she always wanted). The second truth
was to buy a bigger warehouse that would meet the demands of her
business. And her third truth was to become a millionaire in 2020.

Et c’est pas la seule.

Ici @Jonfook que je suis depuis ses débuts. Il a créé une page pour visualiser ces objectifs de revenus mensuels.

Si son revenu augmente, il débloque accès à une nouvelle moto :

[](https://t.co/X2xLlCdvF2?amp=1)[http://bit.ly/3xWh8vk](http://bit.ly/3xWh8vk)

Bref c’est puissant et ça fonctionne.

Alors chaque soir avant d’aller te coucher, visualise la réussite de tes objectifs.

Imagine-toi dans 5 ans, avec tous tes objectifs atteints.

Tu peux le faire matin et soir si tu le souhaites.

Le but est de passer un message clair à ton cerveau :

C’est possible.

3 - Repose ton cerveau

Entre la fin de ton travail et le moment d’aller te coucher : régale-toi.

Fais tout ce que tu veux, mais surtout : Ne travaille pas.

C’est bien de reposer son cerveau de temps en temps pour être plus efficace et ne pas se cramer en quelques mois.

Que ce soit ce Thread ou les deux précédents, ils ne sont là que pour te guider.

À toi d’adapter à tes besoins et tes objectifs.

Tu n'es pas obligé de tout appliquer à la lettre.

J’aurai vraiment rêvé avoir ce type de process à mes débuts alors faites-en bon usage !

Et si vous voulez en apprendre plus sur le sujet, je vous conseille ces deux livres :

The miracle Morning - Hal Elrod

The Secret - Rhonda Byrne

Un process étape par étape pour définir tes objectifs :

Cours terme

Moyen terme

Long terme

Prêt à réaliser tes rêves dans 5 ans ?

Pourquoi définir des objectifs ?

Si tu veux un jour réaliser tes rêves, tu peux :

Croiser les doigt et espérer y arriver.

Définir un plan à suivre pour les concrétiser.

À ton avis, quelle stratégie fonctionne le mieux ?

Si tu veux gravir l’Himalaya.

2 options :

1 - Te rendre au pied de la montagne et tenter de trouver ton chemin vers le sommet.

2 - Suivre un plan d’entrainement spécifique à l’alpinisme, gravir plusieurs fois de plus petits sommets avant de tenter l’Himalaya avec un guide.

Le premier va probablement finir dans une crevasse ou manquer d’oxygène.

Le deuxième a de grandes chances d’avoir son selfie au sommet.

Voilà toute l’importance de définir des objectifs :

Transformer tes plus grands rêves en petites étape facilement atteignables.

Il existe trois type d’objectifs :

* Court terme (3 et 6 mois) : Facilement atteignable
* Moyen terme (1 an / 3 ans) : En dehors de ta zone de confort / Difficile à atteindre
* Long terme (5 ans) : Très loin de ta zone de confort / Impossible

1 - Définis tes objectifs long terme (5 ans)

Si tes objectifs ne sont pas claires. Demande à un de tes proches de jouer le jeux et te poser les questions ci-dessous :

Scenario : Tu n’as pas vu cette personne pendant 5 ans, on est en 2026 et tu as atteins tous tes objectifs.

Je t'ai pas vu depuis cinq ans ; quoi de neuf ? Quelle est ta situation professionnelle ? Où vis-tu ? Comment vont tes finances ? Comment va ta famille ? Tu as changé physiquement. Quel sport fais-tu ? Qu’as-tu appris de nouveau ? Comment occupes-tu ton temps libre ?

Quelle est ta journée type ? Es-tu heureux ? Pourquoi ?

→ Si tu n’as personne à qui demander, DM une des personnes qui a aimé ce tweet et posez-vous les questions mutuellement.

Maintenant il est temps de passer à l'étape suivante et de trouver ton « why » .

2 - Trouver ton « Why »

Difficile d’atteindre tes objectifs sans une raison profonde.

Alors remplis ce texte à trou pour chacun de tes objectifs long terme, par domaine (finance / santé…) :

"… [Contribution], afin que … [Impact]."

Je te donnes un exemple ci-dessous

3 - Mets tes objectifs sur papiers

Maintenant que tu as tes objectifs long terme et ton "why".

Il est temps de les écrire.

Crée un compte Notion et duplique ce template. Tu n’auras qu’à le remplir avec tes objectifs.

Il est important de remplir ce template dans l’ordre :

=> 5 ans / 3 ans / 1 an / 6 mois / 3 mois.

Ou parfois je le fais dans cet ordre :

=> 5 ans / 3 mois / 6 mois / 1 an / 3 ans

Cela afin de commencer par la vue d’ensemble et découper celle-ci en petites étapes.

4 - Maintenant écrit pour chaque objectif long terme (5 ans), un résumé en une phrase, en suivant ce modèle :

Action : Courir Spécifique : Le marathon de Boston Temporel : le 21 avril 2026

La phrase ressemblera donc à ceci :

"Courir le marathon de Boston le 21 avril 2026"

Pourquoi ?

Car ces phrases, tu vas les apprendre par coeur et te les répéter tous les jours jusqu’à ce qu’elles soient ancrées dans ton cerveau.

Le but est de faire comprendre à ton subconscient, la direction dans laquelle tu te diriges.

5 - Suivi de tes objectifs

Duplique ce template :

[](https://t.co/bontvv7Ww8?amp=1)[http://bit.ly/3hFtmTq](http://bit.ly/3hFtmTq)

Et mets tes objectifs à court terme dans le tableau pour te motiver à les atteindre.

Renouvelle les tous les 3 mois.

=> Tu peux aussi diviser en objectifs mensuels et/ou hebdomadaire.

6 - Trouve-toi un binôme

Pour ne rien lâcher, il est important de trouver une personne qui tiendra compte de tes avancés.

Une personne avec qui tu vas partager tes objectifs.

Tu seras obligé de te bouger car cette personne sera là pour te le rappeler si tu abandonnes.

Tu peux aussi le faire publiquement pour augmenter la pression et être sûr de vraiment faire le maximum pour y arriver.

Je l’ai fait en Avril et je vous fais confiance pour me le rappeler en temps voulu

Voilà, vous avez tout en mains pour définir vos propres objectifs.

Si vous voulez en apprendre plus sur les objectifs, je vous conseille ces deux livres :

Goals - Brian Tracy

Start With Why - Simon Sinek

### Créer des Habitudes Pour Atteindre Tes Objectifs.

* Définir l'objectif à moyen, long et très long terme.
* Chiffrer les objectifs

Avoir des objectifs, c’est bien.

Mais maintenant il faut se donner les moyens de les atteindre

Ici on va éliminer tes mauvaises habitudes pour en créer de nouvelles.

Pourquoi créer des habitudes ?

Selon une étude de la Duke University, les habitudes représentent environ 40 % de nos actions quotidiennes.

Il est donc nécessaire d'utiliser ces 40% pour transformer la personne que tu es, en la personne que tu souhaites devenir dans 5 ans.

Par exemple :

Si tu te lèves tous les jours à 6h pendant un an. Alors on pourra dire de toi que tu es un lève-tôt.

Tu n’as fait que répéter une habitude tous les jours et tu es devenu une personne que tu n’étais pas auparavant.

C’est là, tout le pouvoir d’une habitude.

Ce principe s’applique dans tous les domaines.

Tu veux devenir sportif ? Entraine-toi 45 min par jour.

Tu veux parler anglais ? Fais 1h de Duolingo par jour.

Tu veux jouer d’un instrument ? Fais 1h de solfège par jour.

Rien de plus simple.

Un trait de ma personnalité que je souhaite changer.

Une nouvelle habitude simple à intégrer dans mon quotidien.

Je suis devenu la personne que je voulais être.

Ici on va :

1 - Analyser tes habitudes

2Créer de bonnes habitudes 3 - Remplacer tes mauvaises habitudes 4 - Créer une nouvelle routine 5 - Éviter les erreurs

1 - Analyse tes habitudes.

Prends un carnet et attends demain matin.

Du réveil au coucher, tu vas noter toutes tes habitudes et les catégoriser :

Bien - Neutre - Mauvaise

Exemple :

Scroller sur Instagram au réveil : mauvaise Faire 30 min de sport : Bien Douche : Neutre

2 - Crée de nouvelles habitudes pour atteindre tes objectifs

Reprend ta liste d’objectifs que tu as définis grâce au Thread précédent.

Puis crée une habitude par objectif moyen terme (1 an) qui serviront à atteindre tes objectifs long terme (5 ans).

Objectif sportif : Finir le 10km de Paris en moins de 50min en septembre 2022. Habitude : Courir 3 fois par semaine

Objectif pro : Atteindre 2000€ de revenu passif avec le SEO & Affiliation en septembre 2022. Habitude : écrire 2000 mots et obtenir un domaine référent par jour.

Ces habitudes te permettront d’atteindre tes objectifs à 1 an.

Ce qui te rapprochera considérablement de tes objectifs à 5 ans.

Tu devras donc les renouveler chaque année pour les adapter à tes objectifs N+2.

3 - Remplace tes mauvaises habitudes

Reprend la liste que tu as créé dans la première étape et remplace toutes les mauvaises habitudes par de nouvelles habitudes en corrélation avec tes objectifs.

Mauvaise habitude : Scroll 30 minute dans mon lit le matin.

Nouvelle habitude : Mettre mon téléphone à 2 mètres du lit pour me forcer à me lever.

4 - Crée ta routine

Maintenant que tu as toutes tes habitudes, il est temps de les ordonner.

Crées toi un Agenda Google et mets en place une belle routine hebdomadaire.

7h30 - 9h : Routine du matin 9-11h : écrire 2000 mots 11h-12h : Mettre les articles en ligne 13h-15h : Rechercher des opportunités de liens 15h-16h : Mettre 4 articles en ligne sur mon PBN 16h-17h30 : Suivre la formation 17h30 - 22h : Routine du soir

5 - Conseils avant de commencer

a - Commence petit

Pour ne pas te décourager dés le début, ne vois pas trop grand. Sois patient.

Par exemple :

Cours 3 fois 20 min par semaine le premier mois.

3 fois 30 min le deuxième mois.

3 fois 45 min le troisième mois

etc…

b - Ne loupe jamais 2 fois à la suite une habitude

Il y a une règle d’or soulignée par James Clear :

Si tu loupes une fois, pas grave.

2 fois, tu peux mettre en péril une habitude.

Alors même si tu ne peux pas courir 30 min. Mets tout de même tes baskets et cours 2 min.

c - 21/90

Il te faut 21 jours pour créer une habitude et 90 jours pour l’ancrer solidement dans ton cerveau.

Alors lance-toi un premier défi de 21 jours, puis 90 jours.

Après 90 jours, tu es devenu une nouvelle personne.

d - 80/20

Supprime l’inutile.

Tu veux atteindre 2000€ par mois dans un an :

Quelles sont les tâches qui te rapportent 80% de ton CA ?

Concentre-toi sur celles-ci.

Oublie les petites tâches inutiles.

Tu souhaites approfondir le sujet ? Lis l'un des deux livres suivants :

Atomic Habits - James Clear

The Power of Habit - Charles Duhigg

Ce thread est terminé.

Maintenant tu as définis tes objectifs et créé les habitudes qui vont t’aider à les atteindre.

### - [**'Time Moves Too Quickly!'**](https://email.mg2.substack.com/c/eJxVkkuPmzAQxz9NuCXyg0d84FCRzTbbQrXdNN3NBRkzJAaDKTbJwqevk6iHSuMZ6T8PW_6N4BZOepjiXhvr3Vxupx7iDq5GgbUweKOBIZdlvA4x833qe2Xsl3gdrD1p8moAaLlUsR1G8PqxUFJwK3V366CIssA7xyLigglRceZXVcWYQBxznyFYQ1QUFX7cy8dSQicghgsMk-7AU_HZ2t4s6JcF2Trjpum1UtPKjIWxXDQroVun9-5Y2cKy1RcwS6v18s8oRaOmBd1a3UC3oBuYXrAgh-mdqGZXaz-rn4Js8zpnyVWKZzaXW9Yfk12Y7Z9oOqefWS3MrlXn0mnp_gP92O9INn9MmbxK_p7NboYUXw_y-z69pnODd04X9CDv-m1egqfj721dPqtLIV_YampP23yufnY1KppvyVvKji2imyRNlmP1esob9MaV8VNR_PJkTBAhyEchjgJKyYqsRIFRsF4jXjBS-pisLiOvg1MbLHzUnsh_f-INcaG7Wo-DSyrecnVnWYxGdmDMvcSxyl1sx07aKYeOFwrKB0b72IY72PwEHQxuS8qc2xiHPiNhFJIIY_LA5jgHOKIUh5Hn3lBq19XF_1D9BXT40F4)

#### Your Thoughts Are Forming Tight Fences around Your Feelings.

![https://cdn.substack.com/image/fetch/w_2480,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F8d8e71a8-7553-4081-8453-55f536e1aa9c_1240x1126.png](https://cdn.substack.com/image/fetch/w_2480,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F8d8e71a8-7553-4081-8453-55f536e1aa9c_1240x1126.png)

#### **From The Faraway, Nearby (1937) by Georgia O’Keeffe**

_Today I tried to write something great and I failed. I tried reading old columns for inspiration, but when I came across on this letter about the problem of time passing too quickly, I wanted to reprint the whole thing._

_I’ve been feeling rushed for weeks now. Each day feels extremely short and packed full of annoying interruptions and unforeseen hassles. I’m trying to exercise more, sleep more, drink less, write more — and I’m succeeding, mostly. But I feel like my whole family is burned out. My oldest daughter has too much homework. My younger daughter seems grumpy. My husband has too much on his plate. We’re all kind of snippy and out of sorts._

_Somehow reading this mournful letter relaxed me. It’s strange how much it helps to remember that everything is temporary, you don’t own anything, and you can’t control what comes next. It’s the constant effort to control our circumstances, to think our way toward some imaginary solution, that make us anxious and unhappy._

_I wrote this column a year before I was diagnosed with cancer. I had no idea how dark things were about to get. But letting go of control and learning to feel more and connect with the present moment definitely prepared me for that ride._

**Dear Polly,**

**There’s this concept in physics called “entropy,” which is essentially a measure of the overall messiness of a thermodynamic system, and there’s a fairly important physical law that states that the entropy of a given system can never decrease. Which is weird, because it’s one of the (very) few things in all of physics that requires a particular direction for how time can move. When I first heard about this, I couldn’t believe it — entropy, the slow increase in chaos, the reason that eggs will never spontaneously reform themselves after breaking, will _always_ increase, and this very fact sets time marching forward, inexorably.**

**I’m 35 years old. I have a job in the sciences that is really rewarding, if not really the exact job that I’ll want to have forever, but it’s exciting and important right now. I got married last year to someone who is perfect for me (we even had a reading from one of your columns at our wedding!), and we just got a cat who is nervous and sweet and doesn’t want to be held. I have really good friends, and I volunteer, and I talk openly and honestly about my feelings and I cook and clean and exercise. I am 35 and I am happy, I think. But, see, throughout all of this, I can’t help but think about how time slowly eats up the life that I have, turning the raw, beautiful potential of the future into the hollow sadness of memories in the past, forced through a focal point of the present that is gone too quickly. I am haunted by entropy even as I am in what I think might be the best years of my entire life.**

**I think, growing up, we’re taught that the most important thing is to _cherish_ life, _cherish_ being young and vibrant and active, _cherish_ the time you have, _cherish_ the people around you. And I took this to heart and spend a lot of time being present in any given moment, thinking about how wonderful it is to have this. It’s sometimes annoying, I think, for my partner, and my friends, to always have me trying to remind them of just how special it is that we’re wherever we are, a quiet bar, or a back patio on a warm evening, or a friend’s house for brunch, or whatever, because they can tell in my voice that I am so terrified that this is going to end at some point and it’ll just be a memory. Being told that life is precious, and that all I can do is work hard and love deeply in the time that I have, has made me realize that time is a quiet thief.**

**It eats at me. Time goes too quickly, and we have the capacity to just waste it without thinking. I can be looking at my phone and suddenly it’s 3 p.m. and that was one afternoon I had and now I won’t have it ever again, it’s lost. The internet, and really the whole modern world, wants to constantly remind us that time is passing, a fact that’s making my heart beat fast even just writing this. I lie in bed, thinking about just how privileged I am, thinking about just how nice I have it that this is my current major worry, but also I am terrified that time keeps continuing, that I’m just getting older and older, and everyone is getting older and older, and that time is just marching us all into the ocean.**

**Is this just how it’s going to be, for the rest of my life? Is it possible to forget that time will take everything from us? How do you hold on to something precious if it’s just smoke?**

**Paralyzed in the Present**

Dear Paralyzed in the Present,

“Time goes too quickly” is a belief system. Like all belief systems, the more you believe that it’s true, the more true it becomes. You encounter manifestations of this core belief everywhere. You take neutral events and information and sensations and treat it all as data that supports your central hypothesis. When you spend a few hours with friends, you’re determined to cherish the experience, but you annoy everyone with your frantic cherishing and your proclamations of each moment’s value. You spend a weekend away from home, and you lament how quickly it flew by. Instead of questioning the brevity of scheduled outings with friends (why don’t humans who get along spend full days together instead of two or three hours here and there?) or the absurdity of how few vacation days most Americans get every year (shouldn’t every weekend be a long weekend?), you go back to your guiding principle: Time moves too quickly.

You’re pretty sure that you can _feel_ time moving too quickly, but in fact, you’re just _thinking_ that. Your thoughts are structured by your belief system. Your thoughts form tight fences around your feelings. You say that you’re open and you feel your feelings (and I trust that you’re making an effort on that front!), but your thoughts are always elbowing in and fucking everything up by throwing your belief system — TIME MOVES TOO QUICKLY! — onto the table like a rotting fish, sometimes even when company is present.

You used the word “think” nine times in your letter, including the phrases “I am happy, I think” and “I can’t help but think” and “I lie in bed, thinking” and “Time goes too quickly, and we have the capacity to just waste it without thinking.” Not only do you believe that _thinking_ is the key to cherishing the present more, but you also believe, at some level, that _you_ might just be able to _solve the problem of time._ So even as you keep collecting data that supports your hypothesis that time moves too quickly, you’re also trying to figure out the math on HOW TO STOP IT.

This means that you spend the most enjoyable hours of your week like Dorothy in _The Wizard of Oz_, panicking as the sand slips through the hourglass, frantically imagining the return of the Wicked Witch. This is how human beings behave when they’re trained, from a young age, to think about feelings instead of actually feeling them. Thought has replaced feeling so thoroughly that we can’t tell them apart anymore.

Meanwhile, why the fuck doesn’t Dorothy herself do something, instead of just batting her gigantic, watery eyes at the goddamn sand in the hourglass? Couldn’t she look around for a Swiss Army knife, or jimmy the lock with a nail file, or fashion a rope ladder out of some witch robes and throw them out the window? Dorothy, like you, is a cat who is nervous and sweet and doesn’t want to be held. (But can you blame her? Auntie Em is a disordered control freak, custom-made to torture a little dreamer like Dorothy.)

You have a bad habit of thinking yourself in tight circles instead of feeling. Thinking — particularly that puzzle-solving type of thinking — speeds up time. (This is why I play Tetris on planes.) Feeling slows down time. This is known as Havrilesky’s Time-Feeling Theorem, and I would send you the formula for it, but I fear it’s far beyond your intellectual purview, so you might just have to take a leap of faith, which is another way to slow down time (See also: Van Halen’s Got My Back Against the Time Machine Theory of Faith-Based Hurdling).

But mostly what you’re battling right now is your age: 35 years old, the ideal moment to begin your first major existential crisis. In fact, I read the last line of your question — “Is this just how it’s going to be, for the rest of my life?” — out loud, to my husband, right before bed, and of course we laughed and laughed for a long time, and then I said I might just write back with one word, “YES,” and call it a day. Which probably sounds absurdly callous to those of you who still picture me getting a carefully pre-selected pile of letters from my diligent assistant and then somberly typing out wise responses at my pristine desk in my minimalist office. (“Here, take a little of my enormous strength, young dove!” I say to my flock, Jesus-like, before retiring to my meditation den for Reiki healing and chia-seed-paste smoothies with hemp boba.) But no. I am just your average tool who has slowly learned to accept that her time on this planet is limited.

Acceptance can look callous (or stoical, or numb) before you’ve accepted what you need to accept. As someone who’s currently caught in an exquisite spiderweb of fearful, anxious thoughts about rapidly growing older and then disappearing, you will tell yourself a story about how this soldier is a stoic, or that old lady is in denial, or this Buddhist isn’t feeling enough, or that advice lady is a merciless, crusty old dick. But really, some of these people have simply made peace with WHAT IS. Time, by definition, does not move _too quickly_. Time moves at exactly the pace it _should_ move. To believe otherwise is to imagine, arrogantly, that you know better than “God,” or some other spiritual patriarch, or Mother Nature (who is verifiably vengeful and off her rocker, but I think we can surmise that she is, nonetheless, just a _teensy_ bit smarter than you, silly mortal!).

I kid! The point is, time moves how it moves. Time is relative and subjective. (Think of Einstein, if that helps.) Time speeds up and slows down, depending on what’s happening, and depending on whether or not you’re struggling to corral your thoughts with your feelings, or you’re letting your feelings corral your thoughts. Personally, I try as hard as I can not to corral. I let my thoughts and feelings dance together. Sometimes my thoughts lead, and things get a little stompy and repetitive. Sometimes my feelings lead, and things get a little too wild. It’s a balance.

Speaking of which: After laughing heartily (or callously or smugly or with Zen-like serenity, depending on who’s watching), my husband and I talked about how funny it is that we’re already so fucking old and we’re just going to get older and older and older until we die. We talked about our many ailments, which will mostly only get worse from here. We talked about how scary and painful it gets when someone physically dies.

Naturally, that part of the conversation was lighthearted and fun, because entropy is something we’ve talked about a lot and have struggled very hard to accept (mostly, almost, so far, for now, kind of). But _then_ my husband started to bring up other things that could happen, the kinds of things that I actively choose not to think about, ever, primarily because I cannot think of these things and continue to function. I am wired badly. These aren’t minor, everyday things, to be clear. They aren’t things I have any specific reason to fear, beyond being an animal with bad wiring. But I can’t even tiptoe up to these things or hint at them without my Catholic, superstitious, fearful animal self howling and scratching at the door to get out, go somewhere, anywhere else.

I most certainly cannot think of these things late at night. Or in the middle of the night. Or while I’m a little sick. No way.

The point is, when it comes to accepting hard, constant, unchanging truths — and once we’ve done that, moving on to higher-level equations, which always seem to include infinite terrifying variables! — we all have our hard limits. Our minds forever approach acceptance but never really reach it. Goddamn, I’m smart.

So this is what I’d suggest: Stare directly at the sand in the hourglass, and try to relax as you do it. Ask the question, “Is this just how it’s going to be, for the rest of my life?” and answer it, “Yes.” Do this repeatedly, but try to slowly bring in some other feelings: “I am here. This minute will last a long time. This moment is not rushing out of my grasp. Time moves at the speed it moves. There are mysteries in the world that I will never understand, no matter how hard I try, and that’s as it should be.” When you’re with other people, instead of saying “Look you guys, let’s cherish this! CHERISH THIS, GODDAMN IT!,” try to slow down and watch and listen instead. Practice putting your thoughts aside and breathing in the good moment. Watch someone’s lips as they speak. Notice your breathing. Each glorious minute can last an hour when you savor every tiny detail, like an artist, with your heart. Keep your scurrying, nervous-cat mind out of the picture. Tolerate being held until you actually _want_ to be held.

If there is terror associated with time (like a fear of the unknown, a fear of death, other dark things that feel murky and overwhelming), you’ll want to examine some of the details of what that terror might be, but I also want to leave some room for sidestepping some of that terror as needed. Respect your limits. But try to take the FEELING door into this exercise. Notice when your thoughts bust in and trumpet your belief system (“Time moves too quickly!) and guide them out the door, and shut it. Hold your anxious cat, and pet it. Pet your goddamn cat, man, even as its eyes start to dilate (signaling attack!) and its head starts to twitch (oh, Christ, no!) and its rabbity feet start doing those sharp-clawed rabbity kicks designed to eviscerate your flesh. Squeeze the little motherfucker and pet the shit out of the motherfucker and BREATHE.

I have a friend who held her giant cat like a baby from the moment it was born. The cat eventually weighed maybe 40 pounds, enormous. Her cat would struggle to get away, but she would kiss his face and talk in a high voice about her baby. That cat was mean, but he was also the most loving animal in the universe. One night, I came home and cried (I was 25 years old and I came home and cried a lot) and the cat came into my room and pressed his face against my face and accepted belly rubs and then — I’m not kidding — ran his claws through my hair, combing it gently.

Memories are not sad and hollow. It makes me happy just thinking about that amazing cat, who was not my cat, and is dead now. I loved that dusty, hairball-filled apartment, with its gigantic windows, and I love that 25-year-old freak of a girl who cried every night on her giant bed (at least she had a big bed — smart move, girl!) and wrote the saddest songs on her guitar. Sadness is not hollow.

The future does not have endless raw, beautiful potential, either. Things could get worse suddenly instead of just slowly getting worse and worse. I know that’s triggering (it fucks me up, too! That’s my hard limit!) but an important part of reckoning with your late-30s and early-40s existential crises involves accepting that not everyone is living on the same exact timeline. We do our best to survive, is all. We are not guaranteed a certain number of years. We get what we get, and we don’t throw a fit.

Facing that is hard, but the more you do it (somewhat ironically), the less you panic about the here and now, and you start to FEEL the here and now instead. I know, because I felt like you do now a few years ago. I was panicked over how quickly the years were racing by. And I figured out that by breathing and connecting to the moment — not while meditating, just while walking or doing the dishes or writing — I could slow down the day. When you feel connected to yourself, and connected to others, that feeling stretches out the moment instead of condensing it, reducing it, diminishing it. And sometimes it can help to force yourself to consider how unpredictable and sad life can be. (Again, respect your wiring! Respect your limits! Embrace denial as needed! Take breaks!) It’s paradoxical, I know, but sometimes looking straight at the ugly truth will free you from your anxious, circling thoughts and allow you to live in a more relaxed, present way.

My husband said that I should tell you that once someone dies (both of his parents have been dead for over 20 years), you’ll feel differently about time. I told him, “That falls into the category of things that people often say, because they are very true, but they are not a gift to anyone else nonetheless.” But he does have a point: When you add up your remaining time on Earth (as you seem to do repeatedly), that’s some imaginary, unhelpful math. Because you don’t know how much time you’ll get. And strangely enough, converting that constant (the exact number of years you have left) into an unknown variable can feel relaxing. Similarly: Because you can’t make the sand STOP, trying to STOP THE SAND with your mind actually seems to speed it up. But watching the sand fall, and _feeling it_ seems to slow it down: I am here, I am old, anything could happen, I do not own this cat, this cat will die, I do not own the future, I will die, I am sad, this world is not mine, I am a squatter, I am temporary, I own nothing and no one. When you accept the exact, unchangeable speed of time, time slows to a crawl.

You will not own what you think you will own. You will borrow it. That is raw and beautiful, right now. It’s not sad and hollow. This natural world is as it should be. (Footnote: It’s the motherfuckers who don’t believe in time at all, who can’t feel, who can’t stand to notice that they’re old and they’ll die someday, who fuck this planet the hardest. The natural world is being destroyed by people trying to STOP THE SAND with their money. _That_ is beyond sad and hollow!)

See how many terrors will come up when you stare at the sand? It’s not for the faint of heart. But in the words of noted astrophysicist David Lee Roth:

_I get up, and nothin’ gets me downYou got it tough, I’ve seen the toughest aroundAnd I know, baby, just how you feelYou got to roll with the punches and get to what’s real_

Roll with the punches. That really is all you can do. You’re a squatter, and this moment belongs to you, but just barely.

Don’t look at your memories and immediately say, “I can barely feel that! It’s hollow and empty, it doesn’t belong to me!” Try to connect with your past feelings, and the past will come alive for you. Don’t fixate on the future, making it seem more raw and beautiful and full of potential than the present. Live where you are.

Don’t let your thoughts poison your experience. Practice acceptance. Let the world in. You will be disappointed, often. Your cat will struggle to break free. You’ll stumble on something transcendent only to quote David Lee Roth seconds later. That’s how you were meant to live! That is perfection. You will honor whatever comes your way. It’s all precious and it’s all just smoke. It is all glorious and scary and sad and exactly as it should be. Train your eyes to recognize that. Train your heart to let it all in. Hug your anxious cat in spite of everything. Stare at the sand and welcome the witch.

Polly

---

_Thanks for reading Ask Polly! Do you have any good ways of slowing down time when you’re stressed? What makes you feel less panicked about aging and mortality? Let’s discuss in the comments. Send your letters to askpolly at [protonmail.com](http://protonmail.com). Your support is enormously appreciated!_

### Planning a New Month - Katie Yvonne

I love being able to see a new month roll in and watch smugly as the 1st of the month comes and I’m feeling totally organised. Planning a month is something that I’m sure **most** of us do without even knowing it. Even the most unorganised people usually know what’s going on the new month. Maybe you haven’t gathered from my blog yet but I am a **very** organised person.

Some might say I’m too organised. I can’t help it. I’m a sucker for structure and predictability. Even as a little girl I loved looking through my Mom’s wall calendar and checking out what was going on that month. In this post, I take you through how I like to plan my month out.

#### **review The Last month.**

The first thing I do is have a look at the last month and review what went on. This process is a lot like the one I use for my [yearly audit](https://www.katieyvonne.co.uk/2020-life-audit/). These are the kinds of questions that I ask when reviewing my month. What am I really proud of from the last month? What changes could make in the next month? How could I get closer to my goals in the next month? Is there a part of my routine I need to review?

That’s just a few examples of the questions I ask when I review my month but you could add anything else that may help you out. One of the best things about monthly reviews is that you can really shape them to **your** needs. So, sit down and have a good look at the month that’s just passed. Try not to be too critical because you don’t want to put yourself down. Be kind, critical and realistic. If last month was hectic at work and that meant your side hustle suffered a little then don’t beat yourself up.

These things happen and it’s why I believe monthly reviews are so important. They give context to your month. Don’t write off a month as crappy because it didn’t go exactly how you had planned. Look at what happened, if it was unavoidable – drop it. If it was avoidable – make a plan that ensures it doesn’t happen again. [MuchelleB](https://www.youtube.com/user/muchelleb) has some amazing videos on auditing and viewing your life so check her out for a little more inspo.

#### **plan Important Days in Your diary.**

Even with being as organised as I am, I am totally crap with dates. Which is why I need to be organised if I’m honest. Sometimes I’ll get a notification that it’s someone’s birthday and a pang of guilt hits me because I forgot. This is why planning important dates in my diary **ahead of time** is so vital for me. Anything like birthdays, events, assignment due dates, bills etc go in my planners so that I can visually see when they are.

Doing this means I also get to plan ahead **for** those days. I like to buy cards and gifts early on so that I have them ready. Just so this way I don’t have to faff at a later date to buy someone something. If I have a meal planned then I might have a look at the menu and choose what I want. Or maybe I’ll plan an outfit for an event. Of course, these are optional depending on how organised you like being but they can help loads!

Getting myself prepped for these days really makes me feel so much calmer about the month ahead. Grab a cuppa and make sure every important date is in your planner. As someone who has suffered from anxiety, this has helped me a lot. I mentioned before that I love predictability so knowing what is going on takes away some of that anxiety.

#### **set Aside Days for You to Keep Yourself in check.**

Every month I set out a few days that centre around things that are important to me. These days help keep me on track to achieve my goals and they help to ensure that I’m looking after myself properly. Every month I have a shopping and meal prep day where I plan (most of) my meals for the month ahead. I also have a side hustle day where I plan everything that needs to be done concerning my blog, social media, podcast etc. This helps me to know what I need to do during the month ahead. I’ve also introduced a university planning day where I set out everything I need to do in the next months regarding modules and my dissertation.

Again, this is a really personalisable process! You can set out a day where you have a big clean-up, or where you make products for your business, literally anything that can help you. I do realise, however, that spending a whole day on something can be a little unrealistic if we have other priorities but even if you just spend a few hours working on something, that’s still a success. I can usually plan out a month of blog and social media content in a day **and** organise other things surrounding my side hustle. This benefits me as the bulk of my work on this project is done in **one** day.

#### **set Goals and Intentions for the month.**

Setting intentions may seem like a pretty woo-woo thing to do but it is a **life-changer**. I like to have little goals and intentions in place for when the new month rolls in so that I have something to focus on. Going into a new month knowing exactly what I want out of it. These monthly goals don’t have to be huge, they could be as simple as cooking a meal from scratch once a week or trying to read a whole book. It doesn’t have to be something that puts loads of pressure on. Try to set yourself goals that actually have some actionable qualities to them. I speak a little bit more about this in [this blog post](https://www.katieyvonne.co.uk/setting-actionable-goals/) so if you need a hand with setting goals that you can smash, definitely read that!

Set out some time in your day to plan what intentions you’d like to set for this month. Getting intentional has been something that helped me loads on my self-development journey. It forces me to really **think** about who I want to be and how I can be that person. I sometimes like to give my months little themes. So, January has the theme of organising so I get to plan out most of my year in that month. In June, I like to have a decluttering month to make sure I haven’t cluttered my space. You get the picture.

**♡ How do you plan for a new month?**

“If you don’t like the road you’re walking, pave another one” – Dolly Parton.

Until next time,

###

orga hebdo journaliere a 3mois (objectif mensuel obj journalier)

decouper et sous decouper projet pour sevoir évoluer

objectifs sous objectifs checkpoints

les batailles se gagnent pas sur le champ de bataille mais dans la preparation

todo list avec 2a3 taches /jour max

block de tvl de 4h (2h min)

lister ce qu'on a fait (on ne peut pas optimiser ce que l'on mesure pas)

* productivité

ello Diane,

Les 4 D de la productivité

Comment ne pas se noyer sous la multitude de tâches à abattre ?

Que ce soit du côté personnel avec toujours plus d’administratif, du côté professionnel avec toujours plus de demandes, on peut parfois rester bloqué devant la montagne à gravir…

Pendant mes 10 années de carrière dans le développement, j’ai souvent eu ce sentiment d’être dépassé par les évènements.

Cette situation a atteint son apogée pendant mes expériences de Lead Developer !

Des demandes incessantes, une quantité astronomique de sujets à gérer en parallèle. Comment travailler dans l’urgence constante ?

Le mythe du multitâche

Tu as bien lu, le multitâche est un mythe. Une vision robotisée de la réalité dans le seul but de faire grimper la productivité…

On te fait croire que tu as un super pouvoir pour justifier la performance attendue.

Je n’ai jamais aimé faire deux choses à la fois.

Personnellement, je pense que c’est prendre le risque de ne pas donner 100% de ton focus à une des deux tâches.

Si on pouvait parler aux hommes préhistoriques, ils nous auraient expliqué que c’est totalement débile de vouloir chasser un cerf pendant qu’un dent de sabre (Smilodon pour les fans de l’Âge de Glace) te poursuit !

Existe-t-il un secret pour débloquer sa productivité ?

Je ne crois pas aux grands mystères, aux légendes, mais je crois aux systèmes. Des systèmes que l’on peut tester, éprouver et améliorer.

Prenons un peu de recul…

Et si c’était juste un problème de perception ? Et si le problème était le manque d’outils de décision plutôt que le nombre de tâches en entrée ?

Là, ça devient intéressant !

Les fameux 4 D de la productivité

Les 4 D, c’est un système simple et efficace. Tu peux t’en servir dans tous les domaines.

1 méthode, 4 piliers :

Do Delegate Drop Delay

Do

Le Do rassemble les tâches urgentes et importantes que tu dois faire absolument. Ce sont les tâches que seul toi peux traiter, pas question de les déléguer. Et tu dois t’en occuper maintenant !

Exemples :

Déclarer tes revenus si l’échéance est demain Déployer un fix de sécurité sur un bug de production Écrire mon mail privé de demain :) Ne pas oublier d’aller jeter un oeil à la promotion sur la Captain Academy (c’est par ici) …

Delegate

Le Delegate rassemble les tâches moins importantes qui peuvent être faites par d’autres personnes.

Il y a toujours des tâches qui ne sont pas bloquantes ou d’une importance cruciale.

Si tu travailles en équipe, tu peux les déléguer (même si tu n’es pas lead dev). Il suffit de trouver une personne qui accepte de s’en occuper.

Exemples :

Saisir les notes de frais, pas urgent, je peux déléguer à mon comptable Changer la couleur d’une icône, ou l’agencement de l’écran de connexion, pas urgent mais “cool”, je peux déléguer à un collègue …

Drop

Le Drop rassemble toutes les tâches non importantes. Tu peux carrément les supprimer. Il ne faut pas avoir de scrupules, ton temps est la chose la plus précieuse.

Exemples :

Répondre à un email de recruteur te proposant du Java alors que tu développes seulement en Go Répondre à une enquête utilisateur te permettant d’accéder à une vraie fausse réduction sur ton forfait mobile Les tâches non importantes ne respectant pas le principe de Pareto (80/20) Passer 2 heures à négocier quelque chose d’une valeur de 10 euros …

Defer

Le Defer rassemble toutes les tâches que tu n’as pas pu catégoriser dans les 3 premiers D. Si une tâche n’est pas assez importante pour que tu la fasses toi-même et maintenant, qu’il est impossible de la déléguer et que tu ne peux pas te permettre de la supprimer, alors tu peux la repousser.

Exemples :

Faire ta déclaration de revenus (3 mois avant l’échéance) Changer de forfait téléphonique alors que tu es encore engagé Les demandes “nice-to-have” du service marketing (désolé les marketeurs ^^) Tester Deno pour prouver que c’est 100 fois mieux que Node.js :) Regarder la saison 2 de Stranger Things …

Pour savoir si un modèle est efficace, il faut le tester

Plie-toi à l’exercice, prends la liste de tes tâches et essaie de les catégoriser, tu verras, tu peux libérer pas mal de temps.

Ce système m’a permis de rester “laser-focus” dans les moments les plus stressants de ma carrière. Il est simple et accessible.

Maintenant, c’est à toi de jouer !

A demain,

Captain Dev

le but c'est la qualité de ton attention. Pour ça tu dois dégager tout ce qui l'inhibe et prends ton énergie en backstage, donc écris ce à quoi tu penses, fais en premier ces choses qui t'angoissent, c'est la seule manière d'être la meilleure version de soi même et d'arriver le plus efficacement et rapidement à ses fins : avoir une qualité de flu neuronal optimal.

réspirer est la clé du contrôle de soit, car les émotions proviennent du corps; qui se bloque à certains endroit pour ensuite exploser à d'autre, le flow énergétique est comme une rivière : si le terrain est trop penché elle devient torentielle, si on la bloque alors l'eau s'accumule et va déborder (frustration) puis exploser en cassant l'écluse (crises de larmes, de colère ou d'angoisse)

[Superhuman](https://superhuman.com/reserve?email=themallette%40gmail.com&name=Diane%20Defores&first=Diane&source=outreach_210412&via=thanks)

### Construire des Systèmes

* Etablissez un système de récompenses dans lequel votre audace est récompensée

C'est en partie sur ce fondement bouddhiste que repose le programme 30 jours /30 rencontres. L'objectif ? Vous permettre en 30 jours de vaincre votre timidité, vos anxiétés sociales et développer votre aisance sociale tout en rencontrant 1 femme par jour. Le tout de maniere progressive, encadrée et apaisante. Lors de votre prochaine approche, amusez-vous à tout faire pour foirer 'interaction: augmenter votre bégaiement, adopter une voix plus aigüe, ne pas la regarder une seule fois dans les yeux, … Bref, touchez là où ça fait mal. Evidemment, il est impossible de se detacher entierement de la performance mais nous pouvons tenter au maximum d'alléger notre sac à dos de ce poids inutile. Evidemment, il est impossible de se détacher entiėrement de la performance mais nous pouvons tenter au maximum d'alleger notre sac a dos de ce poids inutile.

Le perfectionnisme est une manifestation de la peur. Et la peur est la meilleure ennemie de la créativité. Caption Original Oubliez de penser à la réussite car elle vous enferme dans la performance, vous devenez stressé et finissez paradoxalement par avoir de moins bons résultats. Cette anxiété de performance ne s'applique pas uniquement à l'approche dans la rue, elle s'applique aux études, au monde professionnel, au sexe (- Vais-je réussir à la satisfaire ? -) et peut vous pourrir la vie. La tentative, peu importe 'issue, vous rend plus fort. Inspirons-nous un peu plus des enseignements de Buddha sur l'égo et adoptons le ballécouillisme » dans notre recherche d'interactions sociales. Comme Tyler Durden, pourquoi ne pas même aller jusqu'à provoquer le rejet ? Titiller cet égo qui nous empoisonne l'existence et qui nous empêche de pleinement profiter de la multitude d'expériences qu'est prêt à offrir ce monde.

Reprogramme-toi! Comment s'en sortir ? Fort heureusement, grâce à la plasticité de votre cerveau, cette même plasticité qui a entrainé le dérėglement du circuit de la récompense, votre matière grise peut être reprogrammée. Tu trouveras programme complet pour atteindre l'abstinence un pornographique en trente jours, écrit par deux psychologues Pour en finir avec la pornographie Evidence based», disponible sur le site des Philogynes.

### Aaaa

[**](https://l.facebook.com/l.php?u=https%3A%2F%2Fsmartwindows.app%2F%3Ffbclid%3DIwAR377S1-o31GVD3oCzw_YQd06Gr0Un-wRL3y8KnMyUnjNzCanrz8cBUzGOc&h=AT04_SDW7BfLm4vmsrYUb8JfQ5OK1MeIPBpbB-81xk8FC-pPL6XQaGVV9GU16ROYjYsJTdvRt1VSocqJqq6TB5T0Ab_HZF4-unjOgf73M4UNqdUWIZFoeHyFptaJAhp0LuUz4-y5qOEXW7azOpOK&__tn__=-UK-R&c%5B0%5D=AT1PwdCQBgzTcIzs0DeYuyfVaiyj4ueh6iKcXzK2lPYNF-AWTdYBv-6hoVFBTt1_NUORFNreThRj5jqFekZW3iJ2EUaK1BcfGuaMpE-lnjyhiljqYeeiFJRGcyDxSQSXKD825yizXIUgofFfN8v5_vQHZJ3XA8ESe9GNHxME0fH70cnWgJXMr2LrGUx-tdWLVSO4tOiw0MPuyuy3FA)[https://smartwindows.app/**](https://smartwindows.app/**)

[Accueil2.0](https://passiondapprendre.com/)

Au réveil faire dix minutes dehors en méditation ou marche pour gagner en clarté et détermination

Un entrepreneur c’est quelqu’un qui créé des systèmes

va falloir un grand tempsd’apprentissage et d’adaptation le temps que tu découvres les pratiques et que tu les essaies jusqu’à trouver celle qui te correspondent et les intégrer dans une routine, une structure qui fonctionne bien pour toi. y’a pas de règles universelle

* Meilleurs outils desktop qui vont tuer ta procrastination
	
	stoop email
	

### 1. [Putler](https://antoinebm.us17.list-manage.com/track/click?u=cfd9db7382ea1e308d7bd2410&id=1bcf83101e&e=372789d9e6)

	
    Impossible de savoir si tu t’améliores si tu ne mesures pas tes résultats.
    
    Podia te donne quelques chiffres de ventes, mais il manque une fonction centrale : de vrais graphiques avec les chiffres de vente mois par mois.
    
    Bien sûr, tu peux exporter tes ventes et générer des graphiques sur Excel.
    
    Mais c’est technique et fastidieux, et la plupart du temps, tu préfèreras naviguer à vue.
    
    La solution s’appelle [Putler](https://antoinebm.us17.list-manage.com/track/click?u=cfd9db7382ea1e308d7bd2410&id=8c6f0eeee5&e=372789d9e6).
    
    **Cet outil en ligne se connecte directement à ton compte Stripe et PayPal, et compte chaque nouvelle vente.**
    
    Il te sort instantanément de jolis graphiques qui te permettent de suivre ta progression jour après jour, mois après mois, ou année après année.
    
    Indispensable pour tracker ta progression, connaître tes meilleurs mois et améliorer ton business.
    

### 2. [iA Writer](https://antoinebm.us17.list-manage.com/track/click?u=cfd9db7382ea1e308d7bd2410&id=fd599ab6b6&e=372789d9e6)

	
    Avant, je rédigeais mes emails directement dans le logiciel d’email de mon Mac.
    
    Le souci, c’est que pour ça, je devais commencer par ouvrir mon logiciel d’email, et je voyais tous les mails du jour apparaître.
    
    Et alors que je n’avais même pas commencé à travailler, je me retrouvais à gérer des problèmes secondaires.
    
    Alors j’ai cherché une app de rédaction, et j’ai choisi [iA Writer](https://antoinebm.us17.list-manage.com/track/click?u=cfd9db7382ea1e308d7bd2410&id=af9b0cc9e3&e=372789d9e6), une app dispo sur Mac, Windows, iOS et Android.
    
    **Dans cette app, aucune distraction : la seule chose qui compte, c’est le texte que tu es en train d’écrire.**
    
    Avec le raccourci clavier cmd+D, tu actives le _mode Focus_, qui centre la ligne que tu es en train de taper, et fait disparaître le reste.
    
    Une fois que j’ai fini de taper mon email sur iPad, j’utilise un raccourci pour le transformer en rich text, l’envoyer en 1 clic sur MailChimp, puis ouvrir l’app Mailchimp afin de le programmer pour le lendemain.
    
    C’est facile, propre et rapide.
    

### 3. [Antidote](https://antoinebm.us17.list-manage.com/track/click?u=cfd9db7382ea1e308d7bd2410&id=93388a6de3&e=372789d9e6)

	
    **Antidote, c’est une version améliorée de ma mère.**
    
    J’ai arrêté de recevoir ses appels horrifiés à la suite d’emails envoyés contenant des fautes d’orthographe monstrueuses.
    
    Parce que tu peux écrire l’article le plus poignant, le plus inspirant…
    
    S’il est truffé de fautes, tes lecteurs ne verront que ça.
    
    **Antidote scanne ton texte, repère 90% des fautes et les corrige pour toi.**
    
    Bien sûr, il lui arrive de faire des erreurs, et tu devras vérifier chaque faute une à une.
    
    Mais si tu ne l’utilises pas encore, il deviendra très vite un indispensable.
    
    Antidote s’intègre aux principaux éditeurs de texte sur Windows et Mac, et dispose d’une [version web](https://antoinebm.us17.list-manage.com/track/click?u=cfd9db7382ea1e308d7bd2410&id=a6fad8fd28&e=372789d9e6), indispensable si tu travailles sur iPad.
    

### 4. [Iconfinder](https://antoinebm.us17.list-manage.com/track/click?u=cfd9db7382ea1e308d7bd2410&id=884c420fda&e=372789d9e6) Et [The Noun Project](https://antoinebm.us17.list-manage.com/track/click?u=cfd9db7382ea1e308d7bd2410&id=5b1fe670bc&e=372789d9e6)

	
    Pas besoin d’être graphiste pour obtenir des logos sympas, des formes pour tes miniatures YouTube ou des illustrations pour ton site web.
    
    **Il existe des banques de visuels dans lesquels tu peux te servir dès que tu en as besoin.**
    
    [Iconfinder](https://antoinebm.us17.list-manage.com/track/click?u=cfd9db7382ea1e308d7bd2410&id=f055e1de31&e=372789d9e6) propose des visuels colorés et élaborés, gratuits et payants.
    
    C’est là-dessus que je trouve les visuels de mes formations, par exemple.
    
    [The Noun Project](https://antoinebm.us17.list-manage.com/track/click?u=cfd9db7382ea1e308d7bd2410&id=15d07beb1a&e=372789d9e6) contient des milliers d’icônes vectorielles de toute sorte, toutes gratuites.
    
    Tout le monde pensera que tu as des talents de graphiste, même si comme moi, tu ne sais pas tenir un crayon à l’endroit.
    

### 5. [Bodyguard](https://antoinebm.us17.list-manage.com/track/click?u=cfd9db7382ea1e308d7bd2410&id=4b8112545b&e=372789d9e6)

	
    **Tu reçois souvent des insultes et des commentaires débiles sur YouTube ?**
    
    _Welcome to the club !_
    
    Bonne nouvelle : il existe une app qui t’en débarrasse. C’est complètement gratuit, et ça s’appelle [Bodyguard](https://antoinebm.us17.list-manage.com/track/click?u=cfd9db7382ea1e308d7bd2410&id=9e03ce798f&e=372789d9e6).
    
    Il suffit de l’installer sur ton téléphone et de te connecter avec on compte YouTube, et les commentaires haineux n’auront même pas le temps d’être affichés.
    
    Ils disparaissent dans le néant et le vide intersidéral. Comme les capacités intellectuelles de leurs auteurs.
    
    C’est très bon. Et tu devrais l’utiliser.
    
    **Un bon artisan travaille avec de bons outils.**
    
    Il les choisit pour leur efficacité et le plaisir qu’il a à travailler avec.
    
    Alors même si tu ne travailles pas avec un marteau ou un crayon, mais plutôt avec un ordinateur…
    
    Les outils comptent. Et certains valent la peine d’être essayés.
    
    Si tu en connais d’autres, n’hésite pas à me les donner en réponse à cet email.
    
    À demain,
    
    Antoine
    
    PS : Cet email contient trois liens d’affiliations (Podia, Mailchimp et Putler). Je ne recommande que des outils que j’utilise et que j’aime.
    
* how to turn your phone into a productivity machine - katie yvonne
	
	Let’s be real, most of us would be lost without our phones. I know I definitely would be. When it comes to productivity, my phone used to slow me down quite a bit. I would be on social media for hours on end. Then I’d be playing Candy Crush until I’d lost all my lives. And then I’d go on YouTube and get stuck in a rabbit hole of watching people declutter their house. I’m sure most of you can relate to this. At this point, I thought it was my **phone’s** fault which it obviously wasn’t. It was my fault because I failed to set myself boundaries. So, here are a few of the things I did to turn my phone into a productivity machine that helped me get stuff done!
	

### **delete Or Limit Time-wasting apps.**

	
    We all have those apps on our phones that we kind of use to make the time go faster. Whether it’s Candy Crush, Pinterest or anything that just distracts us for some time. The best thing to do these apps is to put a time limit on them! I limit all social media to one hour a day. Any games I have I put a limit on them of 20 minutes. I’m pretty sure there’s a way to do this on all phones. When I’ve reached my limit, my phone tells me. This way, I know that I’ve had my time on the app and it’s time to come off it now.
    
    Alternatively, if you have no self-control, you can delete the app. I recently had to delete [TikTok](https://vm.tiktok.com/q1wXRh/) off my phone because I was spending way too much time on there and it was impacting my productivity. Now, I just redownload it when I have some free time and delete it again after. It seems like a bit of a faff to do this but it’s worth it for me. Self-discipline is **so** important in life and this process definitely teaches you this.
    

### **plan On Your phone.**

	
    While I love my paper planners, I don’t always carry them around with me so when I need to put something in them this can be a problem. One thing I do constantly have on me, however, is my phone. Google Calendar is THE best calendar app that I’ve ever used because of how easy it is to navigate. Of course, you can use whatever calendar app you like but definitely use one that’s simple. Set up your notifications for your calendar so you can get reminded before things happen. Using a calendar on my phone has really helped me be more productive.
    
    I also have my Notion app on my phone which has my [**life dashboard](https://www.youtube.com/watch?v=7okYWoGS8Js&t=94s)** on it so that I can keep up to date with my goals, projects etc. If I’ve made progress with a project that I’m doing I can update my life dash. There are loads you can use on your phone to keep yourself organised such as lists, to-do lists, habit trackers, brain dumps etc. Use these apps to your advantage and get planned up!
    

### **keep It Tidy + Spruce it up.**

	
    A tidy space equals a tidy mind, right? [Keeping your phone tidy](https://www.katieyvonne.co.uk/new-years-declutter/) will mean that it’s easier to use. Every month I go through and delete apps that I haven’t used, photos that I no longer need or messages that I no longer need to keep. I get my inboxes all to zero. And move any new apps I’ve downloaded into an appropriate folder. Making sure that my phone is organised and tidy makes it **much** easier to use. Each to their own but seeing phones that have no apps in folders makes me shudder.
    
    My phone is probably the thing I look at most all day so it’s important to me that it projects positivity into my daily life. I do this by having an inspiring photo as my lock screen and home screen. Every time I look at my phone I see these two things so this helps keep me motivated and positive. Sometimes my wallpaper is a photo of me + a loved one, a place I’d like to visit or a quote that keeps me going.
    

### **turn Off notifications.**

	
    I won’t talk too much about this because I have a [whole post](https://www.katieyvonne.co.uk/i-turned-my-notifications-off-and-the-world-didnt-end/) about it on my blog. What I will say though is that turning off my notifications is one of the best things that I’ve done for my productivity and also personal growth. I still interact and engage on my apps but I’m not totally consumed by what’s going on on Twitter. When we think of phones hindering our productivity our minds likely go to social media right away. Turning off my notifications has really made me more present in everyday life.
    

### Here is a Little Checklist I Made for You to Use to Help You Make Your Phone Super productive…

	
    **♡ How does your phone help you be productive?**
    
    “Discipline is the bridge between goals and accomplishment” – Jim Rohn.
    
    Until next time,
    
* learning to love Monday - katie yvonne
	
	Monday…amirite? It seems as though biologically bred into us to hate this day. Even though poor Monday has done nothing wrong. For ages, I hated Mondays. It signified having to go to school again. For lots of you, it may mean the start of your workweek. Or maybe the start of the school run again. No more lie-ins. No more lazy days. Back to life, back to reality. I actually think that Monday has a bad rep and I’m out to change that. While in school I **hated** Monday, I started giving this dreaded day more love when I started college and it turned into my favourite day. In this post, I’m going to let you know how I did that.
	

### **make Monday One of Your Favourite days.**

	
    When you constantly grumble about how you hate Mondays, then guess what? You’re not going to enjoy them. It’s just a simple fact. Most of the time, we see things how we want to see them. So, if you’re thinking of Monday as the worst day of the week, it probably will be. But if you flip that on its head and think of Monday as a day that you love and that is super productive and positive, then it will be that instead. My problem with Monday used to be that I just instantly woke up and hated the day. Like, how stupid is that? I’m going to let a socially constructed way of measuring time make me feel that bad after just waking up? **Nope**.
    
    Start seeing it as a positive day. Full of new opportunities, chances and moments for you to relish in. I understand I sound like a ball of cringe however believe me. Dressing Monday up as your favourite day of the week will help you enjoy them. Fake it til you make it, people. When you get past the idea that this is simply another day of the week it gets much easier to treat it like that. All Monday is, is another day for you to smash your goals and get shiz done. Nothing more, nothing less.
    

### **give Monday a meaning.**

	
    Attach an event or activity to Monday. It may be your day to bake, do Pilates, clean your room etc. Importantly, when you give Monday a specific task to go with it then the Monday blues begin to disappear. There are always little things that you can do in order to make Monday’s a little more fun and useful. It’s no longer mundane Monday, it’s the day you get to make that new peanut butter cookie recipe you found on [Pinterest](https://www.pinterest.co.uk/katieyvonne_x) or do that new yoga flow you saw on YouTube by [BohoBeautiful](https://www.youtube.com/channel/UCWN2FPlvg9r-LnUyepH9IaQ).
    
    Certainly, if you work full-time then this may be difficult but there are ways around it like make Mondays the day you do have a candlelit bath with a bath bomb etc. At the moment, I’m in university until quite late on Monday so I’ve turned it into Murder Monday. Once I’ve gotten in from uni, I grab some food and have a shower. Then I sit down with a cuppa, my candles on and a good old crime documentary (hence the name, Murder Monday). This gives Monday a relaxing vibe for me after the week as started.
    

### **try Not to Sleep in.**

	
    Although I understand I’m going against every human instinct when I say do not hit snooze on Mondays, under any circumstance. After a weekend of absent alarms and lay-ins, it can be difficult to roll out of bed bright and early and full of positivity. However, I can almost guarantee that if you just hop out of bed when your alarm goes off that you will skip that morning grogginess phase. Once you start doing this for a few days, the pain of being warm and toasty for the next nine minutes before your alarm blares again is not sorely missed, I promise.
    
    One of the best things I ever did was **stop** having a lie-in on the weekend. I read somewhere that getting up at different times every day of the week can negatively impact your sleep cycle. So, getting up at the same time every day works for me. But, if that’s not for you then it’s not for you! Have your lie-in if you **really** want it.
    

### **stick Some Music on.**

	
    This makes my Mondays. I put [this](https://open.spotify.com/playlist/2n8PFQdgJVEoh1IVbiFXD3?si=vusrS9GCSjC1IP_vT0oRew) playlist on, have a little boogie around my bedroom and it just sets me up for a good day. Whether it’s Taylor Swift or Metallica that gets you hyped up then you should try this. If you were to look into my bedroom window on a morning then you’d see me with my headphones on with my brush in hand acting like I’m performing the Burlesque soundtrack to Madison Square Garden.
    
    Remember however if you’re playing your music out loud be aware of neighbours or people you live with because they may not share your enthusiasm for the morning. A little gets the blood a-flowing and the good vibes a-going. I just find that this is a really good way to get me feeling good about the day.
    

### **be prepared.**

	
    _inserts photo of Scar on a cliff edge with hyenas singing around him_. [Planning](https://www.katieyvonne.co.uk/three-year-plan/) is one hundred per cent the best way to ensure that your Monday is as stress-free as humanly possible. It saves time, worrying and energy. Get your outfit set out, chose your makeup/skincare products for the day ahead, pack your bag etc. This can be a little bit of a faff the night before but it is ultimately worth it. You can wake up with a smug look on your face because all you have to do is use the stuff you already have laid out.
    
    Whatever you can do that means your Monday will be easier to cope with is good. I love planning my outfit the night before because it saves me ripping my drawers apart to put something decent together. Honestly, doing whatever you can just to make that Monday morning seem a little less stressful will make Monday go way up in your expectations.
    
    **♡ How do you feel about Monday’s?**
    
    “Okay, it’s Monday but who said Mondays have to suck? Be a rebel and have a great day anyway” – Kimberly Jiménez.
    
    Until next time,
    

[On Productivity - From the Desk of Alicia Kennedy](https://www.aliciakennedy.news/p/on-productivity?s=r)

le pouvoir de l’orgnisation : la différence ntre une bibliothèque rangée et des livres ou des feuillles partout ?? Hein ??

###

Tout comme Rome, votre propre empire ne sera pas construit en un jour, et c'est en fait une bonne chose. En fait, travailler votre travail habituel puis profiter de votre disponibilité après les heures de travail peut conduire à de gros résultats et adopter seulement [**cinq habitudes facil**[https://entrepreneurshandbook.co/five-after-hours-habits-to-help-you-build-a-tiny-empire-quietly-d0ec0de3b13d**es**](https://entrepreneurshandbook.co/five-after-hours-habits-to-help-you-build-a-tiny-empire-quietly-d0ec0de3b13d**es**)]

Et si la raison pour laquelle les travailleurs à distance sont plus productifs avait moins à voir avec l'emplacement et plus à voir avec le retard de la correspondance ? Dans un article fascinant, Amir Salihefendic explique comment ** [augmentation de la productivité communication asynchrones] et pourquoi les lieux de travail devraient l'adopter. [How Asynchronous Communication Is Transforming Work | Doist](https://blog.doist.com/asynchronous-communication/?utm_source=as-klaviyo&utm_medium=email&utm_campaign=Monthly%20Newsletter%20%28June%202021%29%20-%20List%201%20-%20Active%20%28RAaq4q%29&_ke=eyJrbF9jb21wYW55X2lkIjogIkt0cDRaRyIsICJrbF9lbWFpbCI6ICJkZWZvcmVzZEBnbWFpbC5jb20ifQ%3D%3D)

En livrant des produits biologiques parfaitement bons mais « moches » à prix réduit directement aux consommateurs, Misfits Market a changé le jeu de l'épicerie. Dans [** ** [How I Built a $1 Billion Start-Up Called Misfits Market - YouTube](https://www.youtube.com/watch?v=2kpS5-C-gM4&utm_source=as-klaviyo&utm_medium=email&utm_campaign=Monthly%20Newsletter%20%28June%202021%29%20-%20List%201%20-%20Active%20%28RAaq4q%29&_ke=eyJrbF9jb21wYW55X2lkIjogIkt0cDRaRyIsICJrbF9lbWFpbCI6ICJkZWZvcmVzZEBnbWFpbC5jb20ifQ%3D%3D)cette vidéo inspirante] , savoir comment son fondateur, âgé de 29 ans Abhi Ramesh a construit son innovant, 1 $ bi société llion.

Decision fatigue is _real_, and that’s why [**Untools**] [Tools for better thinking | Untools](https://untools.co/?utm_source=as-klaviyo&utm_medium=email&utm_campaign=Monthly%20Digest%20%28Mar%202021%29%20-%20Engaged%20Segment%20%28Wqhder%29&_ke=eyJrbF9jb21wYW55X2lkIjogIkt0cDRaRyIsICJrbF9lbWFpbCI6ICJkZWZvcmVzZEBnbWFpbC5jb20ifQ%3D%3D) is so cool—it compiles a collection of problem-solving and decision-making tools to help you approach your challenges from a new point of view. (Now you don't have to switch bodies with someone else _Freaky Friday_\-style.)Can't seem to remember where you left your crystal ball? Not to worry—[**The Future Today Institute's 14th Annual Tech Trends Report**](https://u5631833.ct.sendgrid.net/ls/click?upn=QckAi43gccKOAyYrCyAJcr-2B3BMFKJWqo1q303uqybBcX1BQ1jFkZAQkOPC1kU4tOUB35MbnqH4W0fnbpo2kUZlRd54RIUG9bQ6KCHAR9iQOfomQ-2FPwlxVrstx0BlIwSyNHxfMOC6aHllaxeQWFOkx76MgaOEvJAfqGYypnULOzVO2b83N5C6fK9K6T6FNTwiLAMMNpkrzfanH8RKy51PeQgDZUG1aF4TZWJuodKViDROovAxupJr-2FQhA8oI4UpoMP8jM-2BympBVKpm2gIMkEfzTM10thIWiHe3-2BGZfBEq49rJi9Hn9xoZ-2FlWRYCpfjzTPYuqxUt-2F65VclZwtWGddIxnagrANIihGwkmrdwJyiFMo-3DoiwR_UJWqrhniF-2FxOdx7HCGY1a7L1f819Cbnfy3Pk11ISc4Ex1GR5tYpN78Ra5lS86Ki81eTqiWmbZo7GYFRn-2FRNjcZSjQmK4dKSDWD57aity8iuaM0rS-2FvzxLuLVYZvt7PqZwRCQUXt2mSahp3sjoPESYBxvkj45-2Fbp2ZJbAjxvC0WWbQOK2Mh771jW-2FE8O4x80Jr-2Bd2Uh2JaVe1fx9Qam3dHfB-2FQnEHLZGz8M13EWzo9dnmYcUUjO1-2FQn5D1Or0ddQacmxWdXLowFdT0TJF1xB-2BXG-2BBIFG73zNnyW-2Fj6kvI-2F02BGubVq48OFiFSKSbiPH0Wxw-2BQfNHN5-2BfJv0YplsoZkh3Sa6o7Fvp98CWrVeklMS9mAWVcLbib2djV8LQPVo77ovZOCeMfWDrPulaek2RZkw-3D-3D) analyzed nearly 500 tech and science trends so that your strategic plans for the future can be informed, and your business can thrive in an ever-changing world.Okay, look, stealing is bad, but just this once we’re going to… _encourage it_. In his article, [**12 Things I Stole From People More Successful Than Me**](https://u5631833.ct.sendgrid.net/ls/click?upn=cIwtvI42Nq0bIRIwhSS5IrPu-2B9hvKsxy7hnGD-2BumOG99ia-2FZhHXvAQemKOcNpwyVGPaU4d4EFqSgKlxBYp9p6pdZbDSLSG9o-2BpPkXomTXvUz5alrqogDIA1t3ap7S4gpqJsUqph87T4aQ6wAheNzdQQaN4ba5xWYnWxXlM1x1O0LhOqqa3TB4JHUhcLEys4qTBtnibq5KrIb0RmzIy-2BrSfs-2F4riwiTL6GykY9qj0ObLKvXvW-2FL9wT8J3XJ7yPfI1B1wcwKnwSpBQuYAlDkQ7o0qaKfFHcx5NAmwYhFC1NmHgPdKHusARX4V6xD74ROX7VrZ0vPTBWFxknQI-2F2GzyqvyGbu8OGGLLI6S57pzgKdmdz-2BkEe7CjdJ6qnckobxI1EFzo2sl117lY7-2FUCZzRblrJE8LCMIl6yF-2FWASdOd80yZYaRNrOGb4MYiTXRzDt0RIcgy_UJWqrhniF-2FxOdx7HCGY1a7L1f819Cbnfy3Pk11ISc4Ex1GR5tYpN78Ra5lS86Ki81eTqiWmbZo7GYFRn-2FRNjcZSjQmK4dKSDWD57aity8iuaM0rS-2FvzxLuLVYZvt7PqZwRCQUXt2mSahp3sjoPESYBxvkj45-2Fbp2ZJbAjxvC0WWbQOK2Mh771jW-2FE8O4x80Jr-2Bd2Uh2JaVe1fx9Qam3dHcUB5YZreybHI2s84xbA6CZ-2FL9N5U0dNbBev5lnKahJVRyPSl4J2QYznygFeSGrxRAPQBQlmyvQcCVK-2FWP1TjM4BrKQq73yb6gGy0AGbJqT0IUYIvwPLgo8f0r-2F2JzGqQwkmqemmVz25sigakOHIu8pxQfyGDzwpP9gqheGfdE4glFpeb1dh2xddItU7zxPOOA-3D-3D), Vincent Carlos shares what he’s learned from icons like Ben Franklin and Kobe Bryant.

Plus tu fais des choses plus t'as besoin de savoir faire le tri et de méthodes de travail de systèmes d'organisation
![](a%20rangerrr-20240703205714546.webp)

###

* **10x Your Focus with a Start Here Page**

How do you feel when you see your "to do" list? For me, it was Overwhelm + Anxiety = Analysis Paralysis. Here's what went through my mind:

* Which tasks are the most important?
* I spent so much time on my annual and quarterly plans. Uhhh…where and what are they again?
* My team would be on one system (Wrike). My personal tasks were on a separate Kanban software. And then I'd "simplify**"** everything with pencil and paper.

Can you relate to any of these?I created a solution that works for me. It's a command center that I call my Start page.First, it contains my outcomes from Quarterly down to daily. Each section can be hidden so you don't feel information overload. There's also a Kanban board that filters my tasks.I've always had elements of these in different systems. The problem is that task managers are rigid; you have to do things their way. Well, I discovered tool called Notion a while back. Its superpower is its flexibility.The software has allowed me to execute things the way I've always wanted to. 1. I created a quick video where I walk you through how it works. 2. I created a template that you can easily duplicate into your own [Notion](http://sptr.eocampaign1.com/f/a/A29cq6tTOMgKgpIYzutlgA~~/AAAHUQA~/RgRivyZDP0UgZDMxMGY1YzJhMWE0YjRlOTQyNDNkZjVkNTA2MWI4MGVEFmh0dHBzOi8vd3d3Lm5vdGlvbi5zby9XBXNwY2V1Qgpg2UOh3GDti_TaUhJkZWZvcmVzZEBnbWFpbC5jb21YBAAAFt0~). [View the Template](http://sptr.eocampaign1.com/f/a/qOXuctGrlXiGBI3TIZ-ddg~~/AAAHUQA~/RgRivyZDP0UgMmMzNzQzYjQxMDc0Y2NiNGQ0NTkxZTNkYzhjMGIxNTZEQWh0dHBzOi8vd3d3Lm5vdGlvbi5zby9TdGFydC1IZXJlLWNjYjhmNTE3NmI0NDRhMWViZTdjM2MyMzIyNzg5Y2NlVwVzcGNldUIKYNlDodxg7Yv02lISZGVmb3Jlc2RAZ21haWwuY29tWAQAABbd) (_Notion is free by the way for single users_)The end result?Focus. I know what I'm supposed to be doing each day.I know that my daily -> weekly -> monthly -> quarterly tasks are all connected.I hope this helps you. Try it out and let me know what you think. **Marketing Powerups** _Quick marketing tactics you can implement_**#1. Double Down On Your Position**

Atoms is a D2C company that focuses on shoes.Their Unique Selling Proposition is that they offer shoes in 1/4 sizes. For some people, the whole and half sizes aren't a good enough fit. By offering 1/4 sizes, people can ensure a better fit. The biggest objection they have is their **cost**. At $129, some people consider them unaffordable. Rather than ignore the issue, they double down on it.I saw a similar from them on Facebook.Some takeaways:

* Validate their concerns - $129 IS a lot of money
* They explain why they can't lower their price point. They explain what you'd be sacrificing **IF** they were to lower the price point.
* And finally, they double down on their position. They're never going to lower the price. You get what you pay for. If you want cheap shit, then go elsewhere

Money is a sensitive topic. People can be triggered if they sense any judgement or arrogance. So Atoms crushes it by taking a "matter of fact" position.**#2. Take Advantage of Small Holidays**

Everyone loves a good sale. The most common time to do a sale is to do it based around a Holiday. It's not even July yet and the 4th of July sales are already flooding my inbox.

So, how do you stand out when everyone's slamming the inbox?

You don't -

**"When they zig, you zag"**

**Instead of promoting on the major holidays, find an obscure Holiday around your niche.**

[Tushy](http://sptr.eocampaign1.com/f/a/WBK8OBykpkPhxuCQFDSy5Q~~/AAAHUQA~/RgRivyZDP0UgNDI2MmZlMzBlYmMwZmVjMjM2ZDc3MWJkOTcyYmU5ZmREF2h0dHBzOi8vaGVsbG90dXNoeS5jb20vVwVzcGNldUIKYNlDodxg7Yv02lISZGVmb3Jlc2RAZ21haWwuY29tWAQAABbd)

is a D2C Bidet company. (

**Note:**

The domain is hellotushy. Tushy dot com is uhhh…not safe for work)

They're known for their cheeky marketing. Did you know that 6/9 is National Sex Day? I had no idea. But they saw that as an opportunity to promote their bidets.

I got an email from them on June 9th. They had my complete attention because it's a "normal" day to the rest of the world.

There's no way they'd stand out to me on Black Friday. There are too many emails.

You should spend some time looking at this list of

[Holidays](http://sptr.eocampaign1.com/f/a/1wGSplXI6RGcHH9g-kUqAQ~~/AAAHUQA~/RgRivyZDP0UgYzQwYzNiMDBmNTlhNmQ1ZDM1YWFjYWFkMzQwOTFjODFEKGh0dHBzOi8vbmF0aW9uYWx0b2RheS5jb20vanVseS1ob2xpZGF5cy9XBXNwY2V1Qgpg2UOh3GDti_TaUhJkZWZvcmVzZEBnbWFpbC5jb21YBAAAFt0~)

. There's literally a celebration everyday. Hallmark has been putting in work for decades.

**Some random ideas:**

Sell plants? Earth Day Campaign

Skincare? July 3rd is National Stay Out of the Sun Day. 30% off all SPF sunblocks!

Own a bakery or candy shop? The 3rd Saturday of October is the "Sweetest day"

You can make a holiday up if you want. It's our company's birthday. Here's 25% off!Talk soon,Charlesp.s. My email cadence is no longer once a week like it used to be. It'll probably be once or twice a month going forward. I'm trying to focus as much as possible to get my other projects off the ground. And the blog / email newsletter is what I'm choosing to sacrifice. Regardless, I'm grateful that we're still in touch.

— Simplifiez, simplifiez, et simplifiez. Un processus n’a pas besoin d’être complexe pour être efficace. Passez en revue votre organisation chaque mois : éliminez l’inutile et simplifiez tout le reste. — Dématérialisez, automatisez et sous-traitez tout ce qui peut l’être. Si votre business continue à tourner quand vous dormez, vous avez gagné. — Ne vendez jamais votre temps, mais un produit reproductible sans effort, qui ne vous demande pas de travailler plus si vous avez davantage de clients.

y'a un ordre pour faire les choses si c'est difficile, c'est pourquoi tu ne l'as pas encore fait, et c'est la raison pour laquelle tu n'as pas le résultat que tu aimrais, fais le

* ✓ La Loi de Pareto (principe des 80/20) expliquée en termes simples…

pareto c'est un mec en italie qui s'est rendu compte que 80% des terres appartenaient à 20% de gens. ca rappelle la répartition des richesses dans le monde

regarde ton placard a vetement : y'a 20% des vetements que tu portes 80% du temps ! Ya plein de vetements que t'as pas mis depuis de smois

20% de tes accessoires de cuisine tu les utilises 80% du temps

regarde ton répertoire téléphonique : y'a une minorité avec laquelle tu discute 80% du temps

20% des produits d'une entreprise amènent 80% des revenus. C'est vrai aussi dans la nature : pour le nombre de fruits sur les branches d'un arbre etc

donc y'a p as de raison que ce soit pas vrai pour l'efficacité et souventg on se rend compte que 20% du temps de travail amène 80 % des résultmatrs, même 10% dans beaucoup de cas. Donc y'a pas d'heure moyenne de travail c'est pas égal on peut pas comparer y'a des heures qui sont extremement productives et des heures qui servent quasi a rien. Et ce qui sert c'est le travail de création

Donc la clef c'est de concentrer la dessus et que 80

Connaissez-vous la meilleure façon de cacher un cadavre ? Réponse : sur la 2ème page de Google.

Cette blague, très répandue dans le monde des référenceurs, repose sur un constat presque choquant :

**seulement 0,78 % des internautes cliquent sur des résultats se trouvant sur la 2e page de résultats de Google**

.

La 2e page de résultats de Google : merci, au revoir, donc. Bonjour la première page, alors ? Oui, mais pas n’importe où.

**Si possible, parmi les 5 premiers résultats de recherche, qui concentrent près de 70 % des clics**

.

Pas facile, tout ça. Obtenir du trafic et être bien positionné sur Google n’est pas simple, je ne vais pas vous mentir.

Mais attendez, j’ai quand même deux bonnes nouvelles. La première :

**91 % des pages web ne recevront jamais aucun trafic de Google**

.

Vous avez dit surprenant ? Si vous parvenez à faire votre trou parmi les 9 % de pages web qui reçoivent du trafic, vous ferez en quelque sorte partie d’une élite : celle qui met tout en œuvre pour être trouvée.

* routine et planning : est ce qu'ils ne devraient pas être la même chose ?

pour un entrepreneur ca marche pas le planning figé et les deux jours de congés par semaine.

* Commencer un business en ligne devenir entrepreneur va changer votre vie

Je vais te donner mes astuces :

Première astuce : instaures-toi une ROUTINE

Que tu sois dans le salariat ou entrepreneur, il te faut une routine pour performer.

Ma routine : Réveil 6h30, douche, sport et travail de 8h à 13h

1h de repas et pause

14-19h travail puis repos de 19h à 22H et souvent 1 ou 2h de formation de 22H à minuit.

(12H par jour de travail ?!?)

Et oui. Mais si je vais ça c'est parceque ça me plaît et surtout car je sais ce qu'il y a derrière tout ce travail.

Astuce numéro 2 : Reste focus

Travailler 10 heures par jour ne sert à rien si tu n'es pas focus.

Coupe ton téléphone, coupe facebook, instagram et reste concentré.

Et c'est vrai que c'est de plus en plus dur ! Tout est fait pour nous voler "notre temps de cerveau disponible"

Astuce numéro 3 : Prend soin de toi

Mange bien, fait du sport et médite.

Ton corps est ton meilleur outil de travail (plus que le dernier mac ou le dernier iphone)

Astuce numéro 4: Fais-toi plaisir

Il y a quelques mois… j'ai failli tout arrêter. Pour une raison très simple.

Je travaillais beaucoup, l'argent rentrait… mais je ne profitais de rien du tout.

0 dépense. 0 sortie. 0 plaisir.

A quoi bon faire tout ça si c'est pour ne pas profiter?

pouvez très certainement gagner beaucoup plus d'argent aujourd'hui en travaillant

si vous avez des reves enfoui

beaucoup moins et il conclut par derrière pour faire partie des nouveaux bien heureux vous devez apprendre un nouveau lexique redéfinir votre destination à l'aide d'une boussole pour un monde inhabituel inventer de **nouvelles règles jeté par dessus bord la** notion de réussite telle que nous

l'avons trop longtemps reconnue plus rien ne doit être comme avant fin du

on peut se multiplier

Morning routine corda

###

![](a%20rangerrr-20240703210312664.webp)

### Travailler 4 Jours En Étant Payé 5, C'est Possible - Madame Figaro

[https://madame.lefigaro.fr/business/travailler-4-jours-en-etant-paye-5-cest-possible-070220-179540](https://madame.lefigaro.fr/business/travailler-4-jours-en-etant-paye-5-cest-possible-070220-179540)

```
  Travailler 4 jours payés 5 : les entreprises et les salariés qui l'ont testé sont séduits. Carlina Teteris/Getty Images
```

![https://s3-us-west-2.amazonaws.com/secure.notion-static.com/a4c1de2c-394e-4811-9bdc-31cb3c91abf0/travailler-4-jours-payes-5.jpg](https://s3-us-west-2.amazonaws.com/secure.notion-static.com/a4c1de2c-394e-4811-9bdc-31cb3c91abf0/travailler-4-jours-payes-5.jpg)

Travailler moins, gagner autant, produire plus. L'équation fait rêver au moins autant qu'elle semble insoluble. C'est pourtant le pari que s'est lancé la direction de Welcome to the Jungle il y a quelques mois. «On s'intéresse à l'équilibre vie pro - vie perso, mais on estimait que les RTT et les congés payés n'étaient pas une solution suffisante», explique Jérémy Clédat, fondateur du portail de recherche d'emploi et d'informations sur le travail. Pour lui, la vraie question, c'est celle du rythme de travail. En juin 2019, les 100 salariés de l'entreprise ont donc vu leur temps de travail réduit pour un test de 6 mois. «[On ne passe pas au 4/5e](https://madame.lefigaro.fr/business/tout-ce-quil-faut-savoir-avant-de-demander-un-4-5e-040517-132090) mais au 4/4e. On estime que c'est ce qui doit être le rythme normal, donc il était clair dès le départ qu'on ne touchait pas aux salaires», précise le chef d'entreprise. Avant de parvenir à cette décision, la direction de Welcome to the Jungle a fait appel à un cabinet de conseil, un neuroscientifique, un _data scientist_ et une spécialiste des rythmes de travail, tous chargés de mesurer précisément l'impact de la semaine de 4 jours.

Qui, selon leurs conclusions… est dans un premier temps négatif. «Un mois après le début du test, on a constaté une baisse de performance globale de 20%. On a travaillé pour résoudre ça et, six mois plus tard, on était au-dessus de notre niveau quand on travaillait 5 jours.» Pari réussi : une charte, signée par les représentants du personnel, entérine ce nouveau rythme de travail. Qui ne repose que sur une organisation efficace, à en croire Jérémy Clédat.

**À lire aussi »** [Travailler moins pour vivre mieux : c’est possible, elles l’ont fait](https://madame.lefigaro.fr/business/transformer-son-travail-pour-ne-plus-le-subir-elles-ont-cree-une-vie-sur-mesure-261119-168097)

### Hiérarchiser les Projets et Organiser Son Temps

«Il y a deux grands axes pour que ça fonctionne, explique Jérémy Clédat : mieux gérer son temps, [en éliminant les réunions inutiles](https://madame.lefigaro.fr/business/comment-ces-dirigeantes-sont-sorties-de-lenfer-des-dix-reunions-par-jour-121119-167896), par exemple, et prioriser les projets pour faire des choix vraiment profitables à l'entreprise.» Les équipes de Love Radius, une société de vente de porte-bébés dont les bureaux se trouvent à Toulon et Paris, adopte la même stratégie chaque année de mai à septembre. «Lancer un recrutement, ajouter une traduction sur le site ou mettre à jour des présentations de produits… Toutes ces petites choses, qui ne sont pas urgentes, sont repoussées à septembre», explique Olivier Sâles, le cofondateur de l'entreprise. Place aux priorités donc… et à la concentration. Car assumer la même charge de travail avec une journée en moins demande un peu de rigueur. «Les journées sont plus intenses, les gens ne sont pas là pour multiplier les pauses cigarette ou le _small talk_ avec leurs collègues. Chacun se concentre et avance le plus efficacement possible.» Sans risque de surcharge, assure Olivier Sâles : il ne s'agit pas de travailler plus, mais plus intelligemment. «La clé, c'est que chacun ait la volonté de chercher les actions inutiles, qui nous font perdre du temps. Mais compresser son travail ne veut pas dire être sous pression. On peut travailler mieux sans être plus fatigué.»

**À lire aussi »** [To-do list du futur : les meilleures applications pour s’organiser au travail](https://madame.lefigaro.fr/business/to-do-list-du-futur-les-meilleures-applications-pour-sorganiser-121119-167898)

Dans ce système, faut-il [faire des heures supplémentaires](https://madame.lefigaro.fr/business/faire-des-heures-supplementaires-est-mauvais-pour-la-carriere-professionnelle-160818-150102), le matin ou le soir, pour tenir le rythme? «Pour les métiers en échange permanent avec l’extérieur, comme les équipes commerciales, avoir 20% de temps en moins a un certain impact, admet Jérémy Clédat, de Welcome to the Jungle. On n'a vu personne allonger ses heures de travail, mais certains ont réduit leurs pauses. Je ne pense pas que ce soit gênant.» D'où l'importance de former les équipes à l'efficacité professionnelle et à une gestion autonome de leur temps.

**À lire aussi »** [À quelle heure finissent ces femmes qui réussissent ?](https://madame.lefigaro.fr/business/carriere-a-quelle-heure-finissent-le-travail-les-femmes-qui-reussissent-famille-enfants-191018-151359)

### En Vidéo, Un Quart des Français En État D'hyper Stress au Travail

### Plus D'autonomie, plus de Bien-être

Pour le bien-être psychique de tous, explique Jérémy Clédat : «L'un des sujets les plus intéressants identifiés par le neuroscientifique qui nous a accompagnés, c'est que la semaine de 4 jours rend chacun maître de son agenda et que cela a un impact direct sur l'estime de soi.» Un troisième jour de congé pousse chacun à hiérarchiser, à faire des choix en conscience et à utiliser son temps au mieux. Mais le management a un rôle à jouer pour éviter la surchauffe. «Au lieu de viser un objectif sans deadline claire, on le décompose en petites tâches intermédiaires, définies avec le salarié, et dont on peut suivre l'avancée sur une semaine», explique Olivier Sâles. Une vision pragmatique et à court terme qui évite de se perdre dans un amas de tâches toutes aussi urgentes les unes que les autres.

«Pour certaines professions, travailler 4 jours est aussi un moyen de lutter contre la pénibilité», souligne Susana Mendes, secrétaire générale d'Yprema. Cette société de recyclage de matériaux de construction, 100 salariés aujourd'hui, a adopté la semaine de 4 jours dès 1997 pour la quasi-totalité de ses métiers. À commencer par les équipes de production, qui exercent le travail le plus pénible physiquement. «Elles sont passées de 8h à 8h45 de travail quotidien, et les pauses ont été conservées. De cette façon, les salariés ont presque autant de temps de repos que de travail et s'épargnent le déplacement une fois par semaine», explique Susana Mendes. Du temps précieux pour [s'occuper des tâches domestiques](https://madame.lefigaro.fr/societe/inegalites-travail-invisible-comment-les-taches-domestiques-maintiennent-les-femmes-dans-precarite-010419-164432)… et vraiment profiter de ses week-ends.

### Confiance Mutuelle

Chez Welcome to the Jungle, le week-end commence le jeudi soir pour 76 salariés sur 100 : leurs collègues ont préféré s'absenter le mercredi. Si la plupart [déconnecte pour de bon](https://madame.lefigaro.fr/business/arianna-huffington-au-travail-il-devient-essentiel-de-prendre-soin-de-sa-sante-mentale-121119-167905), un tiers des salariés continue de travailler pendant leur journée de repos, ne serait-ce qu'une heure ou deux, pour répondre à leurs emails, explique Jérémy Clédat. «Notre organisation est flexible : si vous ne voulez pas travailler une seule minute sur votre journée de congé, l'entreprise doit le permettre. Mais si vous voulez vous avancer un peu ou boucler un dossier, libre à vous de le faire.» Pour le chef d'entreprise, qui accepte par ailleurs [le télétravail](https://madame.lefigaro.fr/business/5-arguments-qui-pesent-pour-negocier-une-journee-de-teletravail-120219-163654) complet, une semaine de 4 jours ne répond pas seulement au besoin de temps libre : elle replace aussi la confiance mutuelle au cœur du rapport employeur-employé. Le premier s'engage à aménager la charge de travail et à fixer des objectifs raisonnables, le second, à faire le nécessaire pour les remplir.

«Si on a pu passer à 4 jours, c'est parce que nos salariés étaient engagés pour offrir un service de qualité», abonde Olivier Sâles, de Love Radius. Et l'équipe du SAV peut fonctionner le vendredi matin et avoir accès aux mails sans que cela soit vécu comme une intrusion. En l'occurrence, les salariés du fabriquant de porte-bébés ont signé un avenant qui les dispense de présence le vendredi : ils ne sont donc pas exactement en congé, et sont couverts en cas d'accident du travail. Un système flexible où chacun s'adapte en permanence, qui repose tout entier sur la confiance de l'employeur en ses salariés. «Nous sommes 20 salariés, tout le monde se connaît et cela facilite les choses, admet Olivier Sâles. Je ne sais pas si ce serait aussi facile dans un grand groupe.»

### 21 Tips for Building the Perfect Home Office

As more and more teams shift to remote or flexible work from home (WFH), 65% of [FlexJobs survey](https://www.flexjobs.com/blog/post/flexjobs-2018-annual-survey-workers-believe-flexible-remote-job-can-help-save-money-reduce-stress-more/) respondents say they’re more productive working remotely than in a traditional office space. They share WFH means fewer distractions, less commute stress, less overall noise, a more personal space and even more comfortable clothes. The best part? You can wear your PJs all day!

PJs aside, there are several strategies to stay productive when working from home, starting with how to best set up your home office. That’s why we’ve put together a list of tips and ideas to help you choose a perfect place and proper equipment for remote work. If you want to build a more comfortable home office space, check out the blog post now, or add it to your bookmarks to read it later.

In this post:

### How to Choose the Right Equipment for Your Home Office

The first step in building a comfortable office is getting comfortable equipment. You’ll spend long hours at your desk and your computer; the right equipment can make the difference in improving productivity and comfort.

Here are a few life hacks for choosing home office equipment.

#### 1. Invest in a Comfortable Chair

A comfortable chair is the heart of a productive home office. You’ll spend nearly half your day on it. Investing in a good one will make a notable difference to your work life.

Selecting the right chair can be a challenge. Prices can range from a basic chair priced around $50 to a high-end Aeron chair setting you back at least $1,000.

To find the right fit, pay attention to back, thigh and arm support. Also consider the material options and warranties offered, if any.

You can find lots of ideas for a home office chair on Pinterest

#### 2. Use a Second Monitor

A second monitor is the closest you can get to a productivity superpower. An additional screen makes so many tasks easier — coding, designing, writing and researching. It also makes multi-tasking more approachable.

If you don’t like juggling windows, a second monitor should at the top of your wish list. For best results, buy the same model as your current setup so you have the same screen fidelity and experience.

Two screens double productivity!

#### 3. Don’t Forget Mice and Keyboards

The humble mouse and keyboard are often ignored for larger, flashier equipment. Yet, they play a crucial part in improving productivity and comfort.

For keyboards, try using mechanical keyboards. These have mechanical, clicky keys that give a lot of feedback. While they might be noisy, they offer unparalleled typing comfort. Writers and coders will especially love them.

For mice, choose something larger that fits your hand comfortably. Gaming mice are particularly comfortable and accurate, though they do tend to be on the pricier side. Avoid small travel mice — they’re uncomfortable for extended use.

#### 4. Consider Buying a Standing Desk

[There is a growing body of research](http://www.mayoclinic.org/healthy-lifestyle/adult-health/expert-answers/sitting/faq-20058005) that show that sitting for extended periods of time is bad for your health. This explains why the new generation of workers are embracing standing desks.

A standing desk is exactly what you think: a tall desk where you work standing up. Most of these desks are height adjustable (i.e. you can lower/raise the height as needed). Some more expensive versions can even be converted into conventional sit-down desks on the fly.

A standing desk won’t magically transform your health, but it will improve productivity, focus and heart health.

If you think your house has enough furniture or you’re not inclined to to buy a standing desk, consider trying a standing desk extender. These desk extenders can also be adjusted by height and are often cheaper. They also allow you to turn any surface into a standing desk. It’s quite convenient when creating a home office for the first time: you can try different places to find the one that works best for you.

Matt is working at a standing desk

#### 5. Follow Ergonomic Rules

Minimize the damage sitting for long hours causes to your body by following ergonomic rules. Set up your home workspace in such a way that your back and neck are straight and your arms are parallel to the floor. Avoid slouching or keeping your arms at odd angles.

Use the [ergotron workspace planner](http://www.ergotron.com/tools/workspace-planner) to help you set up your workspace. This tool will tell you exactly where to keep your monitor, keyboard, chair and desk based on your height.

For example, this is the recommended layout for a 6’0” person.

#### 6. Add Some Green Plants

A few green plants will not only add a dash of color to your office space but also increase happiness and reduce stress. In fact, even a few plants can increase productivity by as much as 15%, [according to one study](https://www.theguardian.com/money/2014/aug/31/plants-offices-workers-productive-minimalist-employees).

Instead of choosing just any green plants, pick something that is easy to maintain and helps improve air quality. The spider plant, dracaena, ficus and Boston fern are particularly well known for their air filtering qualities.

Dracaena

#### 7. Wire Management Goes a long way

You wouldn’t really want to come to work in an office that’s covered in jumbled cables and cords.

Basic wire management can go a long way towards improving your office aesthetic. It’s also fairly cost efficient as well — you’ll just need a few clamps and zip ties to manage messy wires. Here’s [a great article from Lifehacker](http://lifehacker.com/179911/hack-attack-the-cordless-workspace-sort-of) on managing wires with some cheap tools.

#### 8. Make Sure You Have High-speed Internet

Running an online store makes it imperative you have a solid home internet connection. If your service is subpar, consider changing to an alternative internet provider or buying and installing a Wi-Fi router before setting up a home office. It’s easy to get distracted when slow internet connection disrupts your workflow all the time.

For better WiFi signal strength, place your router high off the ground and in the center of your house. Make sure there is no clutter around it, as well as any devices or appliances that can cause signal disruption. For example, microwaves or home phone sets.

Check your internet speed with specialized services like [Speedtest](https://www.speedtest.net/), [Fast.com](https://fast.com/), or [SpeedOf.Me](https://speedof.me/). For more accurate results, do multiple tests and do them when no one in your home network is downloading or sharing files or doing video streaming and video chats.

It’s okay if the results are about 5-10 Mbps off than promised by your provider. If the results are way lower than advertised, connect your provider and check your network for unauthorized devices. Here’s [how you can find out if someone is stealing your Wi-Fi and what you should do about it](https://lifehacker.com/how-can-i-find-out-if-someone-s-stealing-my-wi-fi-5738123).

### How to Set Up a Home Office Space

Your office space is more than the equipment in it; it’s a combination of the decor, lighting and overall aesthetic.

#### 1. Choose Workspace according to Your Needs

When choosing a place for your home office, think about how you’re going to use it. Will you make conference calls? Will clients come over to your place? Do you need to keep kids or pets away from your workspace? Do you need a place for storage?

Keep in mind that working out of two or three places of your house can be way less productive than working from one place. (It doesn’t apply if you need, say, the garage for storage.)

Appropriate temperature control and fresh air are also important to consider when you set up home office. It’s impossible to concentrate when working in a stuffy room, so make sure your working space is well-ventilated.

The EPA recommends keeping indoor humidity [between 30 and 50%](https://www.epa.gov/indoor-air-quality-iaq/care-your-air-guide-indoor-air-quality#improving). While the [World Health Organization’s](https://www.bbc.com/news/magazine-12606943) recommendation for temperature is 64 °F (18 °C) for healthy adults who are appropriately dressed. For people with respiratory concerns or allergies it should be no less than 61 °F (16 °C ). For the sick, disabled, very old or very young, a minimum of 68 °F (20 °C ).

#### 2. Get Natural light

The first rule of building a comfortable office is to get plenty of natural light.

Why natural light? A recent study found that adults who get natural light sleep better ([46 minutes more](https://news.northwestern.edu/stories/2014/08/natural-light-in-the-office-boosts-health) than those who don’t get natural light). Another study found that 40% of workplaces with natural light experience [3%-40% improvements in productivity](http://www.eco-business.com/opinion/why-natural-light-matters-in-the-workplace/).

Plus, natural light just feels better! So, make sure to position your desk and chair in a well-lit room.

#### 3. Install Ambient Lights

Natural light is good, but what if you like working after dark or live in an area with limited natural light?

Here is where ambient lighting comes in.

Try placing a few cheap rope LED lights around your workspace. Affix them such that they follow the edges of your desk, bathing it in soft light. [Refer to this article](http://lifehacker.com/397415/set-up-cheap-ambient-lighting-with-rope-lights) to learn more about these rope lights.

Additionally, place a high-quality desk/floor lamp near your workspace. Buy something with a dash of design flair (say, a brass lamp) to add some warmth and personality to the space.

Choose a flexible table lamp

#### 4. Install F.lux on All Computers

At normal brightness, a computer screen has a dominant blue light component (i.e. “cold light”). This is the same as natural sunlight. Which is why a bright screen feels welcoming in the morning.

As the sun fades over the day, the amount of blue light it emits decreases. Late evening sunlight has a predominantly red light component (i.e. “warm light”).

However, when you keep the same level of screen brightness after dark, you fool your body’s circadian rhythm into thinking that it’s still daylight, thanks to the blue light component. This causes eye strain, stress and sleep disorders.

The solution is to use a free tool like [F.lux](https://justgetflux.com/).

F.lux automatically changes the color temperature of your screen over the day. It makes the screen “cold” in the morning and “warm” in the evening. For example, this is the recommended screen color for a Thinkpad laptop through the day:

Recommended screen color for a Thinkpad laptop

This ensures that your circadian rhythm doesn’t get disrupted and your eyes adjust better to the change in daylight over time.

#### 5. Keep Space and Equipment for Brainstorming

Your best ideas will often come away from the desk. Maintaining space inside your office for brainstorming is a good way to get the creative juices flowing.

How you create this space is a personal preference. Some might prefer a relaxing couch while others might want a simple standing desk and a whiteboard.

At the very least, try to have a place to keep ideas (such as a pinboard) and easy access to pens, notebooks, etc.

Source: [www.smashingmagazine.com](http://www.smashingmagazine.com)

#### 6. Add Some Personality and Warmth with Decor

One of the best parts about a home office is that you can totally dictate its decor per your tastes. Good decor won’t just make your office space feel more inviting, it’ll also improve productivity.

Even science supports this idea! A warm, welcoming environment improves productivity, [per this study](http://dergipark.ulakbim.gov.tr/jbef/article/viewFile/5000075821/5000070122). [Another employee survey](https://www.cuinsight.com/how-incorporating-art-into-workplace-design-can-affect-employee-wellness-job-performance-and-best-represent-your-brand.html) found that 83% of respondents said artwork was “important” to their work environment.

When choosing colors, [follow color psychology](https://en.wikipedia.org/wiki/Color_psychology) and pick an energy inducing color, such as shades of yellow, orange and red. Avoid dark, dull colors — they can make you feel less energetic.

Orange increases productivity, trust us!

#### 7. Clean Your home Office Regularly

When you create a home office, you have to keep lots of things in mind: equipment, office hours, tasks and calls, balancing your work and family time. It’s easy to forget about cleaning, especially when you’re used to traditional office space being cleaned for you.

Schedule some time for tidying up and regularly clean your office equipment and the room itself. Don’t forget to clean all surfaces and use special solutions like wipes, sprays, and sanitizers.

### How to Deal with Distractions

One of the biggest challenges of working from home is maintaining focus and energy. It’s easy to slack off when there is no one to supervise you.

There are a few hacks you can use to make dealing with distractions easier.

#### 1. Segregate Work and Living Areas

The idea of working in your PJs from your bed sounds great on paper. In reality, doing so will impact your productivity negatively.

The brain tends to associate certain spaces with certain tasks. Think of how you automatically feel like working out when you’re at the gym, or how you feel relaxed and at ease in your living room.

This is why it’s important to keep your work and living areas physically separate. Your office should be in a room as far away as possible from the place where you sleep. This will help your brain associate the office area with work and productivity.

#### 2. Use a Separate Computer for Work

Two reasons why you should buy separate computers for work and personal use:

* You can claim your work computer as a business expense in your taxes
* You can customize the work computer and eliminate distracting apps and software

It’s hard to get work done when you’re using the same computer for creating spreadsheets as you do for playing video games or watching Netflix.

This is the same principle as separating work and office areas. Your brain associates your work computer with “work”, improving productivity. The lack of distracting software and documents helps as well.

Separate computers for work and fun won’t let you feel the temptation of watching Netflix at work

#### 3. Maintain Office Hours

While working from home gives you the freedom to work anytime you want, you’ll still want to maintain regular office hours if you want to maximize productivity.

Working for a fixed period of time every day helps give your day routine and structure. You automatically shift into “work mode” when you’re within your “office hours”.

Besides improving productivity, it’s good for your work-life balance as well. Being an e-commerce entrepreneur is stressful. Being able to switch off after your office hours will help you relax. This also means that you get time to spend with your family or pursuing a hobby.

Figure out the best way to track time in your home office. For some people a clock on the wall is enough, others prefer [Pomodoro timers](https://en.wikipedia.org/wiki/Pomodoro_Technique) or use alarms on their phones. Whatever method you choose, it should help you stay focused, as well as make time for resting.

#### 4. Come to an Agreement with Family Members

If your family members aren’t used to you working at home, ask them not to disturb you. You can put some sign on your door to let your family know when you’re on an important task or call. Also, avoid working in the sitting room and similar areas to minimize distractions.

In case your spouse or partner also works from home, alternate care for kids, elders and pets with them. If each of you creates a home office for the first time, it might be a good idea to inform your clients and/or colleagues that you need some time to balance family and work time and get used to new conditions.

Make the most of your kids’ naps: basically, it’s an hour or two of uninterrupted focus for you. Schedule calls or tasks that require your full attention while your children are napping.

Sometimes children can’t help stopping by your working space. In this case, ask them to help you with some easy tasks, for example, with packaging.

#### 5. Keep Your Office in a “ready” State

Keeping your office in a “ready” state essentially means that you have all the necessary equipment to get to work when you walk into the office each morning.

Some ways to keep this “ready” state are:

* Create a to-do list the night before. This way, you know exactly what to do the moment you walk into the office.
* Keep a clean work environment, so you don’t waste time de-cluttering before getting down to work. Use drawers, baskets, or shelf organizers to keep your workspace clean.
* Keep everything you need within arms’ reach. This way, you minimize distractions and keep yourself focused on work.
* Have a switched on computer, so you don’t have to wait for the startup process

Understand that you’re at your most productive when you first start work. If you waste this time on mundane tasks — cleaning the office area, figuring out your to-do list — you’ll waste this prime productivity.

#### 6. Use Special Apps

Building a home office space requires not only equipment and gadgets, but some apps too. Here are some of the app that can help you stay productive:

* [Serene](https://sereneapp.com/) to avoid distracting websites and apps and silence your phone
* [TomatoTimer](https://tomato-timer.com/) for time management
* [Daywise](https://getdaywise.com/) to control phone notifications
* [Zapier](https://www.ecwid.com/apps/featured/zapier) to automate repetitive tasks
* [Trello](https://trello.com/en-US) to organize to-dos and projects
* [Eye Care 20 20 20](https://apps.apple.com/us/app/eye-care-20-20-20/id967901219) to look after your eyes when working on a computer
* [StretchClock](https://www.stretchclock.com/download/) to provide relief from constant sitting

There are lots of Pomodoro timers that can help you concentrate on your tasks

### Time to Build a Home Office

Being able to work from home is one of the best things about running an e-commerce business. Not only do you get to decide your own work hours, but you can also design your office space exactly as per your needs.

There are a few simple tricks you can use to build a more comfortable and productive home office. Choosing the right decor, installing ambient lighting and maintaining a clean office environment will help you get more done.

Do you have any tips and tricks for maximizing productivity at your home office? Share them with us below!

### TickTick: Todo List, Checklist and Task Manager App for Android, iPhone and Web

[https://ticktick.com/home](https://ticktick.com/home)

Join millions of people to capture ideas, organize life, and do something creative everyday.

Whether there is a work-related task or a personal goal, TickTick is here to help you manage all your to-dos.

#### Get Reminded Anytime, Anywhere

Set a reminder to ease your mind off worrying about missing deadlines from now on.

With five different calendar views, you can check and handle your schedules in a more convenient way.

### S'organiser Comme Une Machine Pour Vivre Comme Un Humain

### Cette Application Traduit Vos Appels En Temps Réel Dans plus de 30 Langues

Communiquer avec des personnes à l’étranger n’est pas toujours évident. En dehors du décalage horaire, la langue peut parfois être un frein. L’anglais n’étant pas forcément maîtrisé par tous, il est parfois difficile de communiquer avec des personnes ne parlant pas notre langue natale ! LingvaNex est une entreprise qui souhaite faire disparaître la barrière de la langue et faciliter les échanges dans le monde. Elle propose diverses applications autour de la traduction, dont [Phone Call Translator](https://lingvanex.com/products/phone-call-translator/), un traducteur vocal en temps réel.

### Des Conversations Traduites En Temps Réel

Phone Call Translator est une application mobile, disponible sur iOS et Android qui traduit automatiquement ce que vous dites ainsi que votre interlocuteur, grâce à l’intelligence artificielle ! Plus de 30 langues sont disponibles comme l’anglais, le français, le suédois ou encore le portugais. Avec cette application, vous pouvez facilement résoudre vos problèmes commerciaux, échanger rapidement avec vos amis à l’étranger ou tout simplement contacter des hôtels, des restaurants ou louer une voiture lors de vos voyages à l’étranger.

Au moment de l’appel, vous parlez dans votre langue maternelle et l’application traduit votre conversation dans la langue de votre interlocuteur et inversement.

### Comment Utiliser Phone Call Translator ?

Le fonctionnement de l’application est très simple. Une fois téléchargée, créez votre compte. Ensuite, sélectionnez votre langue et celle de la personne que vous souhaitez appeler. Entrez le numéro de la personne, avec l’indicateur de son pays et passez l’appel ! Lorsque vous parlerez, vos paroles seront traduites en temps réel via l’application, à l’oral, mais également à l’écrit sur l’application. Sur l’écran, vous verrez apparaître ce que vous dites, et la traduction pour votre interlocuteur.

Phone Call Translator permet ainsi de passer des appels dans le monde entier et via tous les appareils, même les lignes fixes. Côté prix, un appel coûte 0,18 dollars par minute. Tous les détails de la conversation sont privés, LingVanex ne stocke aucune information.

Un outil pratique qui évite les incompréhensions et facilite les échanges dans le monde entier !

### Qu'est Ce Que Je Peux Faire En 5min Qui Va Changer Mon Biz what is the One Thing

### Pirate Ta Flemme

### Des Outils Pour les Entrepreneurs Énervés

### Going outside

Le remède à la mauvaise humeur peut être aussi simple que de sortir. Des chercheurs de l'Université de Regina ont récemment découvert que passer seulement cinq minutes dans la nature est assez long pour aider à changer l'humeur d'une personne. Il a récemment publié ses conclusions dans le Journal of Positive Psychology. Dans l'ensemble, les chercheurs ont découvert que s'éloigner et se reposer quelques minutes peut aider à gérer une situation négative plus facilement. Les plus grands avantages ; cependant, venez quand vous passez ces quelques minutes à l'extérieur. [https://lifehacker.com/fix-your-bad-mood-with-a-selfless-act-1820606457](https://lifehacker.com/fix-your-bad-mood-with-a-selfless-act-1820606457) Réparez votre mauvaise humeur avec un acte altruiste Un seul trajet matinal suffit à rassembler mille ressentiments bouillonnants. Les gens poussent… Lire la suite Les chercheurs ont mené deux tests distincts où les participants ont été invités à s'asseoir dans une pièce ou à l'extérieur pendant différentes périodes de temps, le tout sans appareils électroniques pour les occuper. Alors que les émotions négatives étaient réduites dans les deux situations après seulement quelques minutes, être dans la nature avait tendance à inspirer des émotions positives. « Il y a deux points importants à retenir ; le premier que je souligne à tous mes étudiants ces jours-ci - lorsque vous avez besoin d'un coup de pouce émotionnel, le moyen le plus rapide et le plus simple est de passer quelques minutes avec la nature », a déclaré Katherine D. Arbuthnott, l'un des auteurs de l'étude à PsyPost. Son deuxième point à retenir de l'étude est qu'il est important que les espaces extérieurs soient maintenus pour la santé émotionnelle et le bien-être du public dans son ensemble. La recherche n'est pas vraiment bouleversante. Nous savons tous que nous avons besoin de pauses, et il va de soi que faire cela à l'extérieur où vous regardez probablement quelque chose de joli et prendre l'air serait mieux que de rester assis à votre bureau. Cela dit, combien d'entre nous marchent vraiment dehors quand nous sommes de mauvaise humeur ? À droite. Dans l'ensemble, faire une pause lorsque vous rencontrez des problèmes avec quelque chose est toujours une bonne idée. le problème. Vidéo récente de LifehackerVOIR PLUS >

### A

Ce que nous faisons le matin peut établir notre humeur pour le reste de la journée, donc une grande partie de nos conseils de réveil se résume à faire ce dont vous avez réellement besoin et que vous voulez faire. Ce qui signifie qu'il est temps d'affronter cette petite boîte qui ne cesse de vous interrompre pour vous dire quoi penser. Ton téléphone. N'oubliez pas qu'il existe toute une industrie qui gagne plus d'argent à mesure que vous vous souciez de ce qu'il y a sur votre téléphone. Si vous vérifiez votre téléphone dès le matin, vous tomberez dans leur terrier de lapin. [https://lifehacker.com/your-notifications-are-lying-to-you-1829334172](https://lifehacker.com/your-notifications-are-lying-to-you-1829334172) Vos notifications vous mentent Ding ! Cela nécessite votre attention en ce moment, semblent dire les notifications. Boing ! C'est peut-être un… Lire sur [lifehacker.com](http://lifehacker.com/) Alors, attendez de vérifier votre téléphone. C'est à vous de décider comment vous commencez votre journée, mais je suggère humblement que "quelles conneries ai-je manqué pendant que je dormais?" ne sont pas des informations dont vous avez besoin pendant que vous vous réveillez. Twitter sera toujours là après le petit-déjeuner. Ainsi fonctionneront les e-mails. Janelle Monáe comprend. Elle a déclaré à Fast Company : « Par exemple, quand je me lève, la première chose que je fais est de ne pas regarder mon téléphone. La première chose que je fais est de prendre au moins 10 respirations profondes. Commencez la journée comme vous le souhaitez. Activer Ne pas déranger Les appareils Android et iOS vous permettent tous deux de définir une fenêtre de temps où ils ne vous dérangeront pas avec des notifications. Au lieu de régler cette fenêtre pour qu'elle expire au moment où vous vous réveillez, réglez-la sur une demi-heure plus tard. Ou une heure plus tard. Laissez votre téléphone branché Si vous avez l'habitude de ranger votre téléphone dans votre poche de pyjama pendant votre matinée, envisagez de ne pas le faire. Répétez ou arrêtez votre alarme (si votre alarme est sur votre téléphone), puis posez-la. Si cela rendait vraiment votre matinée meilleure d'effectuer une tâche spécifique sur votre téléphone, comme mettre sur la liste de lecture du matin parfaite, faites exactement cela, puis rallumez votre téléphone. Prendre le petit déjeuner Ou ne prenez pas de petit-déjeuner, si c'est votre préférence. Mais réfléchissez à ce que vous voulez faire avant de vous laisser entraîner par votre téléphone. Brossez-vous les dents, habillez-vous et faites du café, peut-être. Cuire un œuf au four grille-pain. Si vous vous ennuyez, vous pourriez lire un livre. Regarde par la fenêtre. Laissez votre cerveau trouver ses propres pensées matinales paresseuses, au lieu de les lire sur un écran.

### A

Les guépards sont les mammifères terrestres les plus rapides au monde. Ces sprinters félins peuvent accélérer de 0 à 60 miles par heure en trois secondes chrono. La vitesse explosive leur permet d'abattre une antilope, mais lorsqu'ils ne chassent pas, les guépards dépensent le moins d'énergie possible. En fait, les chercheurs ont découvert que les guépards brûlaient environ 2 000 calories par jour, soit la même chose qu'un homme de taille moyenne. "Je suppose que les humains et les guépards se reposent beaucoup pour compenser les activités à haute énergie", a déclaré le biologiste Johnny Wilson à National Geographic. Les guépards travaillent dur pour capturer leur proie, mais ils compensent rapidement chaque rafale en se cachant, en attendant et en se reposant. De toute évidence, ils n'ont pas de startups à gérer, mais je ne peux m'empêcher de faire un parallèle entre ces grands félins et les fondateurs modernes. En relation: Bill Gates révèle sa mesure ultime du succès – et comment Warren Buffett l'a aidé à le réaliser Au début de mon parcours entrepreneurial de 12 ans, j'étais l'anti-guépard. Je pensais que le succès exigeait des journées de travail de 16 heures. Je construisais, grandissais et bousculais constamment. Au fil des ans, j'ai appris qu'être occupé et réussir n'étaient pas la même chose. Pourtant, beaucoup d'entre nous passent toute la journée à sprinter, au point d'être stressés et épuisés. Selon Joseph Bienvenu, psychiatre et directeur de la Clinique des troubles anxieux de l'hôpital Johns Hopkins, l'occupation est devenue un problème de santé généralisé : « La détresse émotionnelle due à une surcharge de travail se manifeste par des difficultés à se concentrer et à se concentrer, de l'impatience et de l'irritabilité, des difficultés à dormir suffisamment et une fatigue mentale et physique. » Au fur et à mesure que j'ai créé mon entreprise, JotForm, j'ai appris que lorsque nous savons équilibrer le travail avec le repos réparateur, notre productivité peut monter en flèche - et nous pourrions même attraper plus d'antilopes. Les racines de l'activité sont profondes. Les érudits pensent qu'Homère a écrit l'Odyssée vers la fin du VIIIe siècle av. Dans le livre 9 de ce poème épique, Ulysse décrit l'île des mangeurs de lotus, où les indigènes passent leurs journées à se prélasser et à manger le fruit enivrant du lotus. Une fois que l'équipage d'Ulysse essaie le fruit, ils oublient la maison et aspirent à vivre leurs journées sur l'île idyllique. Finalement, Ulysse ramène ses hommes au navire et les enferme pour rompre le sort. Parlez d'une parabole de la paresse. Il semble que même les philosophes grecs appréciaient l'industrie, et oui, l'activité. Aujourd'hui, tout le monde, des fondateurs aux entraîneurs de football, méprise tout ce qui implique de la complaisance. Nous nous efforçons toujours d'en faire plus, de nous améliorer et de rester constamment en mouvement. Inconsciemment, nous évaluons même la valeur des gens en fonction du nombre d'heures qu'ils travaillent ou de leur degré de « demande ». Nous accordons une grande importance à l'activité par-dessus tout. À un certain moment, cependant, nous devons faire un choix : voulons-nous être occupés ou voulons-nous avoir un impact ? Rien n'est plus précieux que le temps. C'est cliché, mais c'est vrai. Échapper au culte du « occupé » signifie prendre du temps pour se reposer – et cela nous oblige à prendre du recul et à réévaluer ce qui compte le plus. J'aimerais partager comment j'ai appris à rejeter le rythme effréné de la culture startup, et comment vous pouvez aussi. Commencez petit et faites des pauses. L'activité nous prive d'heures précieuses : pour penser, jouer, explorer, entretenir des relations - et se reposer. « Il existe un moyen simple de gagner du temps : en faire moins », a écrit la journaliste Elizabeth Evitts Dickinson dans John Hopkins Health Review. « Et pourtant, ces deux mots sont peut-être l'appel à l'action le plus difficile. Faire moins signifie comprendre vos priorités et les défendre constamment contre les empiètements du statu quo, qui dicte que l'activité - et la richesse et la valeur matérielles - sont les meilleures. " Comme le dit Dickinson, il n'est pas facile de renverser notre conditionnement mental. Faire moins n'est pas aussi simple qu'il y paraît. C'est pourquoi je recommande de commencer petit. Prenez d'abord le temps de découvrir vos heures de pointe, puis faites des pauses tout au long de la journée. Non seulement vous vous sentirez mieux, mais ces courtes périodes de repos peuvent en fait améliorer la qualité de votre travail. En fait, des pauses régulières peuvent éviter la fatigue décisionnelle, restaurer la motivation, augmenter la productivité et la créativité et consolider les souvenirs. Des pauses qui impliquent même cinq minutes de mouvement peuvent également améliorer notre santé et notre bien-être. Prendre le temps de prendre un café ou de discuter avec un membre de l'équipe est loin de « ne rien faire », mais c'est un moyen important de sortir du tapis roulant métaphorique et de rétablir vos priorités. En relation: Ces 5 stratégies de soulagement du stress fonctionnent même pour les entrepreneurs les plus occupés Réservez du temps pour la réflexion. Certains des plus grands fondateurs, innovateurs et créateurs ont réservé une bonne partie du temps juste pour réfléchir. Par exemple, le fondateur de Microsoft, Bill Gates, a d'abord suivi des semaines de réflexion en solo - sept jours passés à lire, élaborer des stratégies et réfléchir - avant que l'idée ne se répande dans l'entreprise. Aujourd'hui, Gates attribue à ces semaines la génération de certaines des meilleures innovations de Microsoft. D'autres fondateurs, comme Mike Karnjanaprakorn de Skillshare, ont maintenant mis en œuvre cette pratique. Tout comme Mark Zuckerberg et Tim Ferriss. Même les gens qui ne peuvent pas prendre une semaine entière pour réfléchir

### A

// Cet article est le premier d’un cours dédié à la productivité.

Il s’agit d’une introduction à notre formation complète, pour apprendre à mieux gérer son temps et à gagner en productivité.

Voici le programme de la semaine :

– Nous parlerons d’une technique utilisée par les mentors pour organiser leur calendrier

– Nous vous enverrons une petite surprise vidéo sur le thème de la productivité

– Nous évoquerons notre addiction aux écrans et les notifications qui nous interrompent constamment

J’ajoute qu’un exercice académique pensé pour vous permettre de progresser est proposé à la fin de cet article (et de chacun des articles à venir).

Bonne lecture ! //

Voici le plan de ce cours :

I. Pas de méthode miracle pour la productivité II. Connais-toi toi-même III. Un exercice à faire

Quand on s’intéresse un peu au domaine de la productivité, on constate que :

Les formateurs nous vendent des méthodes miracles, souvent pompées de formateurs américains

Les conférenciers nous racontent l’approche unique, utilisée par les plus grands dirigeants de la planète, qui va nous permettre d’être ultra-efficaces

Les auteurs nous expliquent les dernières recherches scientifiques qu’il faut absolument lire sur le sujet

etc

Personnellement, j’ai consommé beaucoup de contenus sur la productivité, « les 10 astuces pour être aussi efficace que Steve Jobs », et testé de nombreuses méthodes différentes :

J’ai essayé de me lever à 5 heures du matin et mettre en place une morning routine à base de Yoga, smoothies, méditation et journal de gratitude

J’ai essayé la fameuse méthode GTD : Getting Things Done

J’ai essayé d’utiliser la technique des pomodoros

J’ai essayé une dizaine d’outils de gestionnaire de tâches et de prises de note différents

Pourtant, cela ne m’a pas permis de devenir une personne extrêmement productive. Je n’arrive toujours pas à faire en 1 heure, ce qui me prend habituellement 2 heures de temps.

Pas de méthode miracle pour la productivité

S’il y a bien une conviction que l’on a chez LiveMentor (et que je partage à titre individuel), c’est qu’il n’existe pas de formule miracle, peu importe le domaine.

La productivité n’y échappe pas.

Il n’existe pas de recette unique de productivité qui va permette à n’importe qui de devenir instantanément 10x plus productif.

Tout comme il n’existe pas de méthode qui va permettre de faire décoller n’importe quel projet.

Pourtant, c’est exactement ce que l’on nous vend en permanence et les discours auxquels nous sommes exposés.

Si l’on prend le temps d’étudier ce domaine, on constate qu’il existe un très grand nombre de méthodes :

La méthode SMART (Spécifique, Mesurable, Assignable, Réaliste, délimité dans le Temps) : qui permet de transformer une idée en un plan d’action concret

La méthode MOSCOW : qui permet de hiérarchiser ses tâches

La méthode du batching : qui consiste à diviser sa journée en gros blocs de temps, que l’on va décomposer en tâches spécifiques, pour éviter de passer constamment d’une tâche à l’autre. Il y a un « coût » au fait de se plonger dans une tâche, pour ensuite en sortir

La méthode GTD (certainement la plus connue) : qui a pour objectif de réduire le stress du trop-plein d’informations et de tâches, en organisant ses idées dans un système « hors » de sa tête

La plupart sont valables et s’appuient sur de véritables recherches scientifiques. Le problème, c’est que l’on essaie d’appliquer une méthode toute-faite à un problème complexe : soi-même. On plaque une formule générale sur :

Nos problématiques uniques

Notre personnalité unique

Nos forces et faiblesses uniques

Nos objectifs uniques

Notre projet unique

Comme si la même clef pouvait ouvrir toutes les portes !

Forcément, les chances que ces méthodes marchent sur nous, sont assez faibles. La suite, vous la connaissez : on finit par se sentir coupable et se juger inférieur aux autres…

Connais-toi toi-même

Ce cher Socrate, toujours aussi pertinent, 2 millénaires plus tard !

Attention, cela ne veut pas dire que ces méthodes ne sont pas utiles et qu’elles ne peuvent pas fonctionner !

Pour qu’une méthode fonctionne pour soi, il faut qu’elle soit adaptée à nos caractéristiques uniques. Chaque porte nécessite une clef spécifique.

Par exemple, si vous n’êtes pas du matin et si vous vous sentez plus productif la nuit tombée, cela ne servira à rien de vous forcer à vous lever tôt parce que vous venez de le lire dans un livre de développement personnel.

C’est pour cela qu’il ne sert à rien de culpabiliser si on échoue à mettre en place une méthode en particulier.

Surtout, c’est pour cela qu’il faut passer du temps à s’interroger sur ses forces et faiblesses. Afin de trouver ce qui fonctionne le mieux pour soi, et créer ses propres routines et techniques de productivité.

Au début de cet article, je disais avoir essayé plusieurs méthodes de productivité, qui n’ont jamais réellement porté leurs fruits.

En revanche, le fait d’en avoir testé une grande quantité m’a permis de mieux me connaître. J’ai pu picorer certaines choses dans chaque méthode, pour finalement réussir à me créer mes propres routines.

Avec le temps, j’ai découvert que :

J’arrive à lire entre 1 heure et 2 heures par jour, que je découpe en plusieurs morceaux : je me lève un peu plus tôt le matin pour lire (environ 30 minutes plus tôt que prévu), je lis dans les transports en commun et je me réserve du temps pour lire tous les soirs avant de dormir

Je suis productif et créatif le matin. J’essaie donc d’organiser mon calendrier pour caser mes tâches les plus difficiles et importantes le matin, quand je suis frais mentalement

J’ai du mal à me concentrer en début d’après-midi. Alors je m’arrange pour faire des tâches moins gourmandes en énergie, comme la gestion de mes emails

J’arrive bien à me concentrer quand j’écoute de la musique sans paroles

J’ai besoin de séquencer mon travail et d’anticiper mes tâches à l’avance car j’ai du mal à travailler pendant plusieurs heures sur la même chose sans m’arrêter

Je mets mon téléphone en mode avion pour ne pas être interrompu par les notifications

Bien entendu, tout ceci est très personnel et me correspond à moi !

Rien ne me dit que cela ne va pas évoluer dans quelques mois ou années. Mais l’important est de toujours chercher à s’améliorer.

Un exercice pour finir

Pour terminer, j’aimerais te proposer un exercice académique très important, qui va t’aider à te poser les bonnes questions et à faire ton introspection personnelle.

Écris-moi en commentaires de cet article, les 3 principales difficultés que tu rencontres aujourd’hui, au niveau de ta productivité : ce qui te bloque, ce qui t’empêche d’avancer et d’être efficace.

N’hésite pas à interagir dans les commentaires avec d’autres élèves qui partagent des problématiques similaires. Les élèves qui progressent le plus sont ceux qui échangent et se nourrissent des expériences des autres !

Vous avez trouvé une faute d’orthographe dans cet article ? Vous pouvez nous en faire part en sélectionnant le texte en question et en appuyant sur Ctrl + Entrée .

### Z

Ceci est la partie 6 de cette série. Voici des liens vers les parties précédentes: [1], [2], [3], [4], [5]

Dans mon dernier courrier électronique, je vous ai montré comment j'avais aidé Karen à créer un cadre de réussite. Elle s'est fixée un objectif SMART, créé une feuille de route et des jalons, et mis au point de nouvelles routines quotidiennes pour atteindre son objectif.

Karen a maintenant un départ beaucoup plus solide que jamais. Nous devons juste nous assurer qu'elle ne glisse pas au fil des mois!

Comment fait-on cela?

Chaque objectif est guidé par un élan. C'est pourquoi, au début, les choses se sentent mieux - tout est frais et nouveau et vous vous sentez motivé pour le réaliser. Mais, cette énergie se dissipe peu à peu au fil du temps et des distractions vous gênent… à moins que vous ne trouviez le moyen de maintenir cet élan.

Et la meilleure façon de le faire est de toujours vous assurer que vous avez progressé. Vous devez continuer à avancer.

Le progrès signifie que vous savez que vous vous améliorez. Plus vous voyez clairement votre amélioration, plus vous obtenez de la motivation. Il vous faut donc un moyen de mesurer vos progrès - une boucle de rétroaction peut vous aider.

Une boucle de rétroaction est un cycle qui vous aide à obtenir des informations sur vos performances à chaque fois que vous essayez de progresser. La rétroaction est ce qui vous dit ce qui a mal tourné ou ce qui s'est bien passé.

Sans boucle de rétroaction, vous ne pouvez pas dire si vous allez bien. Vous ne pouvez pas dire ce qui va bien et ce qui ne va pas. Vous ne pouvez pas dire ce que vous devez changer.

Une bonne boucle de rétroaction fait partie de la compétence d'apprentissage fondamentale que nous enseignons à Lifehack. Trois facteurs clés rendent une boucle de rétroaction efficace:

Cohérent --- Obtenir la même qualité de feedback à chaque fois.

Rapide --- Les commentaires rapides sont importants car plus il faut attendre longtemps pour obtenir des commentaires, plus il faudra de temps pour améliorer les compétences.

Précis - Des commentaires reflétant votre performance avec précision.

Les résolutions du nouvel an sont un exemple de mauvaise boucle de rétroaction. Ils ont seulement un cycle d'un an. Un an pour vous évaluer est beaucoup trop long. Combien de chances avez-vous?

Développer une bonne boucle de rétroaction est une compétence très importante. Dans notre Masterclass Lifehack Ultimate Transformation, il faut une leçon complète pour bien la comprendre.

Comment cela peut-il aider Karen? Pour elle, la clé était un retour plus rapide. Pour créer un retour rapide, vous devez décomposer les compétences que vous souhaitez améliorer en de plus petites parties.

L'objectif de Karen était de planifier et de présenter sa première proposition de campagne marketing à ses directeurs marketing d'ici avril; et ce qu’elle avait prévu de faire, c’est notamment parler avec assurance d’un auditoire en direct et améliorer ses compétences en matière de présentation visuelle.

Alors, pour aider Karen, nous avons créé une courte boucle de commentaires basée sur son objectif SMART et sa feuille de route:

Avec ses exercices de cartes aide-mémoire, elle pouvait compter le nombre de cartes qu’elle avait pu passer en 30 minutes et enregistrer le nombre d’erreurs qu’elle commettait à chaque fois. Plus elle pratiquait, plus il était facile de parler de mémoire - plus de cartes, moins d'erreurs.

Karen a même décidé de tenir un journal de ses progrès et de noter ses difficultés pour réfléchir à ses progrès au fil du temps.

Tous ces éléments lui ont donné l’élan quotidien pour faire des progrès, créant une boucle de rétroaction très rapide pour rester motivée.

Avec cette configuration complète, Karen était maintenant sur le point de réussir avec sa résolution du nouvel an.

Imaginez que vous puissiez le faire avec tous les autres objectifs et décisions de votre vie, cela changerait grandement la donne! Eh bien, c'est exactement ce dont je vais parler dans le prochain courriel, restez à l'écoute!

### Vidéo Motivation Atony Nevo

vidéo je vais partager quelque chose d'essentiel qui fait en sorte que malheureusement et les milliers de personnes qui vont regarder cette vidéo qui vont échouer ou en tout cas qui n'atteindront jamais les objectifs qu'ils se sont fixés dans leur vie surtout s'ils ont des objectifs qui sont différents de la moyenne si tu veux des résultats importants si tu as des objectifs importants tu le sais tu vas devoir faire également des actions qui sont différentes à la majorité des gens est aujourd'hui malheureusement voilà il suffit de regarder les chiffres pour voir le nombre de personnes qui réussit par rapport au nombre de personnes qui aimerait réussir et tu vas te rends compte que l'écart il est tout simplement énorme le but c'est de comprendre qu'est ce que font ces gens que les autres ne font pas et qui fait en sorte qu' ils peuvent atteindre dans leur vie des résultats importants aujourd'hui on n'a pas c'est pas comme si on avait un exemple sous les yeux tu en as énormément il y en a énormément c'est à dire qu'il ya énormément de personnes qui n'avaient rien non rien et qui vont connaître des ascensions dans leur vie fulgurante qui vont devenir je sais pas moi champion niveau sportif ou qui vont devenir de très grands entrepreneurs ou qui vont avoir des résultats très importants dans différents domaines d exemple tu peux en avoir partout sous les yeux la question tu dois te poser c'est pourquoi pas moi pourquoi pas moi la première chose c'est que tu dois forcément y croire parce que si tu y crois pas c'est marc tu peux faire tout ce que tu veux c'est à l'intérieur de toi une petite voix qui dit tu n'y arriveras pas malheureusement toutes les actions que tu vas faire dans ta vie ça sera cohérent avec tes croyances les plus profondes citons sita croyances la plus profonde c'est je n'y arrive pas ça va être très compliqué donc on va parler d'un facteur dans cette vidéo est essentielle mais ça c'est la première chose et si tu sais tu as un actuellement fous toi devant une glace tous les matins et rentrer toit dans la tête des informations qui vont te porter vers le haut des croyances des identités que tu te donne toi même tu peut les changer c'est ce qu'il ya de beau avec ça tu peux les modifier tu peux tu inséré dans la tête les phrases que tu désires les croyances que tu désires des choses qui vont te porter vers le haut et non malheureusement qui vont limiter toutes les possibilités que tu peux avoir dans ta vie parce que crois-moi des possibilités temps m'a énormément et absolument aucune limite à ce que tu peux accomplir eymétois sous les yeux toute la journée les gens justement qu'ils ont accompli ce que tu veux accomplir et qui potentiellement était avant dans la même situation que toi ça va permettre à ton esprit au fur et à mesure de voir que ya aucune différence entre cette personne et toi et que donc si cette personne n'a été capable de le faire tu est également capable de le faire alors le facteur essentiel que je veux partager il est très simple et en même temps il est extrêmement compliqué et c'est pour ça que malheureusement il ya énormément de personnes des millions et des millions de personnes qui voudraient avoir tel ou tel type de résultat qui ne les aurons jamais dans leur vie parce qu'ils vont pas être capable de se priver de tout un tas de choses dans leur vie on va dire quotidienne dans le moment présent de perdre un petit peu de liberté pour avoir sur le long terme une grande liberté et tu vas comprendre tout de suite pourquoi pourquoi je te dis ça ton cerveau c'est une tête chercheuse à bonheur c'est une tête chercheuse abdallah bonheur il veut envoyer un poney des sortes de shoot de dopamine tu bois toute la journée et tu as plein plein de choses sous les yeux toute la journée qui t'envoient tu bois des micros chou de dopamine et plus tu vas dans ces petites choses l'un plus tu es addict entre guillemets c'est un petit peu comme une drogue tu commence demain harris est née chez pas tu bouffes un rail de coke tu recommences demain tu recommences après demain tu vas avoir besoin de ta dose parce que tu as besoin de l'effet qui vient derrière tu vois ce rail de coke là et tu vas devenir addict justement à cet effet exactement comme tu prends ton portable t'as pas besoin d'aller sur instagram sur snapsy à tout je ne sais quoi mais c'est automatique tu bois tu prends ton portable et tuba sur instagram tu sais même pas quoi foutre mais tu vas sur instagram est potentiellement tu vas commencer à perdre de précieuses minutes tu netflix tube waka une nouvelle série tu dis ouais c'est super je me tapais cette série il ya cinq saisons en plus ça va être de l'arbre bon ok c'est peut-être super ça va divertir mais c'est pas ce qui va et tu le sais est apporté des résultats importants sur le long terme la question à se poser c'est comment tu peux faire en sorte d'amener des choses dans ta vie qui vont de mener également des shoots de dopamine mais des choses dans ta vie qui vont faire en sorte que tu as évolué que tu va grandir et que potentiellement tu vas donc accomplir les objectifs que tu t'es fixé dans ta vie peu importe la grandeur des objectifs en question et pour ça tu vas devoir accepter de perdre de la liberté dans tout un tas de moments dans ta vie pour comme je te le disais à gagner une énorme liberté par la suite pas une liberté éphémère si tu veux faire toujours ce que tu veux malheureusement ton cerveau va pas te diriger vers les actions les plus porteuses et les actions qui vont te faire évoluer en tout cas atteindre les objectifs que tu t'es fixé surtout comme je te le disais si c'est des objectifs que tu as important dans ta vie la discipline que tu va amener dans ta vie de manière personnelle et quotidienne c'est ça qui va transformer les choses et pour ramener ça il faut accepter de perdre une certaine liberté dans le moment présent c'est à dire au lieu de regarder ma série préférée là maintenant tout de suite j'écris des choses qui sont tout de suite important pour moi je me mets à faire ça aujourd'hui et je me mets à faire ça demain et après demain et après demain et je répète ça jusqu'à que j'atteins l'objectif que je me suis fixé et quand je vais atteindre cet objectif je sais pertinemment que je vais être heureux je sais pertinemment que ça va m'apporter des résultats conséquents et je sais pertinemment que je serai fier de moi beaucoup plus fier que si j'ai bouffé 12 saisons que la nouvelle série qui vient de sortir tu vois sur netflix ça veut pas dire ça coupait tout et moments de bonheur ça veut pas dire tout couper tout et moment de shoot un petit peu de dopamine éphémère qui t'apporte strictement rien dans ta vie parce que forcément tu as besoin d'un petit peu de ça ça veut dire malheureusement que plus tu vas aller vers ça plus il difficile d'aller vers l'essentiel et combien ce que je te dis plus tu vas versa plus ça va être difficile dans ta vie d'être disciplinés d'être productif et d'aller vers l'essentiel parce que ton cerveau il dira toujours un meilleur il ya le nouveau d'épisodes qui est sorti en a eu un nouveau là etc sur instagram en quelqu'un vient de te laisser un commentaire sur facebook au t1 nouveau audio sur what's up etc etc etc tous ces trucs du quotidien qui clignote qui te défonces littéralement parce que au passage des entreprises comme instagram ils sont plus maligne que toi ils sont plus maligne que moi ils sont plus maligne que tout le monde tu vois ce type d'entreprise qui savent exactement comment envoyer ses shoots de dopamine et ils savent exactement comment te rendre complètement addict justement un réseau comme ça plusieurs fois massa mark plusieurs fois en ce moment je je je supprime instagram pendant plusieurs jours parce que ça me bouffe du temps temps en temps je le télécharge pour regarder un petit peu les messages que j'ai et je vais le regarder un jour deux jours et je vais le supprimer de nouveaux alors oui pendant quelques jours j'aurais loupé plein de pages aura loupé des trucs marrants genre a loupé des messages comme en envoyer mais tout ça ça me permet d'amener cette discipline dans ma vie qui me permet de changer ma vie qui me permet surtout d'avoir les résultats que je veux avoir dans ma vie et plein de fois coup devient plein de fois dans ma vie je me fais défoncer en trimestre tu vois et je perds cette discipline avec tous les trucs qui clignote ça m'arrive encore aujourd'hui et à chaque fois j'essaye de me réveiller je me dis mais qu'est ce tu es en train de foot qu'est ce t'as foutu ta journée aujourd'hui qu'est ce que tu as fait ta journée au parc voit la gaspiller du temps aller à droite à gauche verts s'y faire ça et au final il n'y a rien de concret qui réalisé à la fin mars a par exemple un exemple que je te donne ça c'est mon roman cela on l'a vendu 20 mille sua est sorti aujourd'hui on a vendu déjà entre cinq et dix mille je pense et c'est un des trucs le plus dont je suis le plus fier dans ma vie mais crois moi dans l'instant présent où j'étais en train d'écrire ça mon cerveau il suggérait de faire autre chose de gaspiller du temps de parler à du monde tran ligne sur les réseaux de regarder une série parce que c'est plus simple c'est plus divertissant et tu as envie toujours de ce truc qui quitta même ton petit plaisir tu vois le truc c'est que plus tu arrives à te priver de ça plus tu arrives à faire des choses comme ça par exemple où tu vas écrire tous les jours sans avoir de résultats j'ai écrit tous les jours pendant une période de temps pour écrire ce roman et j'ai pas eu de résultat tu vois ça m'apportait pas grand chose sur le coup mais je savais par contre que tous les jours je tapote j'étais en train de poser une brique une brique qui au final avait constitué un mur et qu'à la fin on ce mur a été construit je savais pertinemment que j'aurais été fier de moi et de ce que je mettais entre guillemets imposé à savoir une privation de plaisirs éphémères au quotidien une privation entre guillemets de liberté pour me dire peu importe ce qui se passe dans la journée qu'il vente qu'il pleuve qui est une tornade qu'on m'appelle qui a une urgence que je reçois plein de coups de téléphone peu importe tous les matins je vais dans un café j'écris 2500 mots et qu'importe ce qui se passe tu vois je tiens ça et je le fais tous les jours jusqu'à que ce roman il est terminé et ça c'est le genre de choses tu vois qui m'a permis de changer ma vie et qui m'a permis de changer les résultats que j'ai pu avoir ces dernières années là en ce moment en train de voir pour créer différentes champ je vais créer une académie de la filiation grosse academy sur lequel je partageais toutes les opportunités en affiliation et je vais former des milliers de personnes sur toutes les stratégies au niveau de la filiation de ce que je peux faire aujourd'hui est ce que j'ai fait auparavant si je regarde la montagne de tarf qui m'attend pour créer justement cette académie hu forcément tu vois poser mon cul sur un canapé c'est plus simple si je me discipline pas moi même et que je m'impose pas dans mon quotidien de me dire ok demain matin tu vas faire si ça tu va tourner trois vidéos temps à fait ça malheureusement cette académie elle ne pourra pas naître elle ne pourra pas être créés parce que ça demande tellement de travail de concentration de focus et d'attention que ça va me demander de répéter tout un tas de jours à tout un tas d'actions justement pour créer cette académie c'est académie en question cette discipline que tu mets dans ta vie qui tu enlèves un petit peu de liberté je te la corde dans ton quotidien elle permet de t'accorder ensuite une grande liberté mais pas une liberté fait mr en liberté de si je sais pas moi demain par exemple tu as 2 semaines de vacances studieuses génial chez ans je suis en vacances en en deux semaines passent team de liberté la liberté 2 vict a pu choisir par la suite tu poses des actions aujourd'hui qu'ils construisent demain qui construisent ta vie qui construisent ton futur ça veut pas dire comme je te dit de couper de toute chose crois moi en deux trois quatre heures par jour extrêmement focus sur une action que tu va répéter quotidiennement en quelques semaines quelques mois tu peux avoir des résultats qui sont extrêmement importants et tu pourras avoir des résultats qui seront largement supérieur à la moyenne parce que je que je suis en train de t'expliquer l'un la majorité des gens n'arrivent pas à l'implémenter et tu sais pourquoi parce qu'il se laisse le choix il se laisse le choix de le faire ou ne pas le faire et si tu te laisse le choix de le faire ou de ne pas le faire si demain par exemple tu veux tu veux commencer la course à pied parce que tu sais pertinemment tu vas te sentir bien là par exemple il est 6h30 il ya trois heures j'ai fait une séance de sport et je me sens bien d'avoir fait cette séance de sport je me suis pas laissé le choix de faire ses séances de sport et crois moi j'avais pas super envie de la faire tu vois j'étais devant mon ordi j'étais en train de faire des trucs voilà je serais bien resté tu vois si sur ma chaise ou assis sur mon canapé je me suis pas laissé le choix et c'est le fait que je me sois pas laissé le choix que en ce moment trois heures après je me sens dans une meilleure énergie dans une meilleure forme parce que j'ai fait mais une heure de sport et je me sens vraiment bien et longue si j'ai donc si j'ai vraiment un conseil d'abonnés ne te laisse pas le choix ne te laisse pas le choix quand je travaillais pour un patron par exemple avant et que j'avais aucune discipline pour moi même je devais me lever à 6 heures du matin pour aller ainsi miné des dindes est ce que j'avais envie de le faire maintenant tu vois est ce que je le faisais oui je le veux et je le faisais parce qu'il fallait que je sois sur mon lieu de travail à 6 heures tu vois je n'avais pas le choix et les gens accordent plus de discipline à quelqu'un extérieur qu'à eux-mêmes accorde la même discipline pour des choses comme ça que tu es obligé de faire que pour tes projets à toi pour ton avenir à toi pour tes résultats à toi parce que c'est ça qui fait la différence qu'est ce que tu peux faire actuellement surtout dans cette période un petit peu compliqué qu'on peut le vivre un peu tous ce que tu peux faire actuellement c'est planifier les choses commençaient à planifier les choses et te dire ok j cet objectif qui est important dans ma vie c'est quoi la steppe one c'est quoi la première étape que je peux mettre en place dès demain que je vais pouvoir répéter avec une étape 2 le lendemain avec une étape 3 avec une étape 4 avec une étape 5 et peut-être que ça va te prendre six mois ok peut-être que ça va prendre dix mois peut-être que ça va te prendre un nom en hockey mais crois moi quand tu auras terminé ça tu seras fière de toi tu seras potentiellement fier de tes résultats ça je n'ai pas de le garantir et tu peux pas en avoir la certitude non plus parce que des fois tu vas travailler longtemps sur des projets qui vont potentiellement pâte apporté de résultats à première vue dis toi toujours que c'est à première vue parce que qu importe ce que tu fais ça tu apportes des résultats tu apprends tu grandis tu évolues il faut que tu vois également ce facteur là et plus tu forces ton cerveau à dire c'est moi qui ai m de toi c'est pas toi qui est maître de moi c'est pas toi qui vas me distraire toute la journée par tous qui clignotent à côté c'est moi qui suis maître de moi même je choisis mes actions et tous les jours je choisis des actions qui me font grandir et tous les jours je choisis des actions qui sont cohérentes dans la direction des objectifs que je me suis fixé et des résultats que je veux atteindre dans ma vie ça je te dis honnêtement c'est pas facile sinon tout le monde de réussir tout le monde le ferait ce type de choses c'est extrêmement dur et tu sais pourquoi parce que plus on avance dans le temps plus il ya deux choses qui clignotent et plus les choses qui clignotent elles sont de plus en plus maligne et plus elles sont en train littéralement te défoncer le cerveau et faire en sorte que pour toi ça 2 un très très compliqué de se concentrer sur l'essentiel parce qu'il ya tellement de choses qui peut envoyer comme ça des petits shoots de dopamine et tu deviens tellement addict à ces petits chocs de dopamine que ça devient très dur pour toi voilà de faire l'essentiel de faire l'essentiel si tu n'es pas capable malheureusement de te concentrer sur l'essentiel il y a peu de chance je veux pas dire y'a aucune chance il ya des exceptions il ya peu de chances que tu réussis je te le dis honnêtement et il ya peu de chances que tu atteindre les objectifs que talent ta vie surtout si c'est des objectifs qui sont plus importants ou qui sont entre guillemets non traditionnels non ordinaire pour que tu as cette discipline dans ta vie ça passe par de la planification savoir exactement demain matin quand tu vas te lever qu'est ce que tu vas faire mettre également des rituels quotidiens en place le matin qu'est ce que tu fais ce que tu ouvres instagram ou est-ce que tu commences à réfléchir à ta journée peut-être tu visualise peut-être tu fais une séance de méditation tu commencé à écrire des choses intéressantes ce que tu vas faire dès le matin va programmer également une partie du reste de ta journée tu peux lever dans le stress tu peux lever voilà avec des émotions toxiques en faisant des choses quitte apporterait 1 qui au contraire apporte beaucoup de limites dans ta vie où tu peux de lever en mettant des routines en place pareil qui vont te porter vers le haut je t'en reparle orange j'ai utilisé beaucoup de routine dans ma vie je te parlerai dans d'autres vidéos abonne toi à cette chaîne youtube n'hésite pas à me laisser un commentaire je vais essayer de répondre à tous les premiers commentaires qui seront laissés la première heure de publication de cette vidéo balance - l'énorme pouce juste en dessous et fais toi ce cadeau fais toi ce cadeau qui va te permettre au final d'atteindre ce que tu veux dans ta vie ce que vraiment a envie de manifester en termes de résultats et ne laisse pas tout ce qui clignote autour de toi littéralement te bouffer tout ton temps parce que ça tu peux la cumuler tout au long de ta vie mais si tu passes par exemple une heure par jour sur instagram et moi ça m'est arrivé plein de fois de passer une heure par jour sur instagram si je regarde en arrière je me dis ok qu'est ce que ça m'a apporté cette heure sur instagram j'ai passé le schéma mots des centaines d'heures sur instagram même des milliers d'heures qu'est-ce que ça m'a apporté de concret que dalle la réponse c'est rien rien du tout par contre toutes les choses que moi j'ai décidé de faire vraiment ça ça m'a apporté des résultats qui peuvent être littéralement conséquent prends soin de toi et ta famille mais moi un énorme pouces partage cette vidéo et quant à moi je te dis à très bientôt dans une prochaine vidéo je vais essayer d'être un petit peu plus présent sur cette chaîne donc à beaune toi et active la

### Matrice D'eisenhower

sur votre todo il ne devrait y avoir que les choses les moins importantes que vous ne voulez pas oublier pour plus tard

[https://pandaplanner.com/](https://pandaplanner.com/)

partir du principe qu'il est plus facile et agrable de chiller que de bosser, donc organiser sa vie pour bosser et faire les tâches ingrates le plus facilement possible, et cacher les loisirs, qu'on aura aucun mal à aller chercher!

* LA PSYCHOLOGIE DE LA VOLONTÉ

### Routines et Habitudes

Le plan

Il s’agit de commencer à tester une nouvelle habitude au début de chaque mois, et de s’y tenir, quotidiennement, au moins pendant 30 jours.

Si au bout de 30 jours, elle est soutenable, et elle a porté des fruits, on pourra la garder. Sinon, on passera à la suivante.

C’est une méthode simple. Son efficacité est pourtant redoutable, parce qu’elle n’engage pas sur plus d’un mois, et qu’elle est ludique.

Au bout de 30 jours, l’habitude est ancrée, et elle ne demande plus vraiment d’efforts. Elle devient naturelle.

Les habitudes que j’ai prises en utilisant cette méthode

Depuis quelques années, j’ai “upgradé” ma vie et mon business grâce à une série de petits défis mensuels.

— J’ai pris l’habitude d’écrire tous les jours. En essayant des rythmes différents : d’abord deux pages, puis trois, puis cinq. C’est devenu une habitude naturelle, qui ne me demande plus vraiment d’efforts. Au contraire, c’est devenu un besoin.

— J’ai pris l’habitude de lire plusieurs livres chaque semaine. Et j’ai appris davantage en un an de lecture qu’en quatre années d’études.

— J’ai pris l’habitude de me déconnecter du flux d’informations, pour gagner en sérénité : j’ai réduit ma consultation des réseaux sociaux et des sites d’info, j’ai abandonné la télévision et limité les messageries instantanées.inimum.

— J’ai essayé plusieurs méthodes d’organisation et d’efficacité pendant un mois à chaque fois (GTD, Zen to Done, et une méthode basée sur les écrits de Brian Tracy), jusqu’à élaborer la mienne, adaptée à mon cas précis.

— Ces petits défis mensuels m’ont aussi permis par le passé de perdre 10kg en deux mois en prenant de nouvelles habitudes alimentaires, et de révolutionner la façon dont j’organise mon business en simplifiant un petit aspect de mon organisation chaque jour.

A chaque fois, un défi de 30 jours a été le point de départ d’un changement global. Ces habitudes sont devenues naturelles au fil des jours : elles ne me demandaient plus d’efforts particuliers bien avant la fin du premier mois.

Pourquoi tester une habitude à chaque fois

Si vous commencez demain à prendre trois résolutions mensuelles que vous comptez mener de front, vous avez toutes les chances d’échouer, parce que ça va vous demander trop d’efforts en même temps.

L’idée, c’est vraiment de changer une habitude à la fois, en commençant par des choses simples.

Essayez, vous serez surpris des résultats !

### Leon de Lifehack

Hi there, Have you always wanted to accomplish something but till now, you haven't gotten started or it's just been put on hold?

It may be a pipe dream, a goal, or a target that you gave yourself to reach within a certain time frame.

Yet you never quite got started because well, life got in the way…

You have work to focus on, a family or loves ones to care for and prioritise…you have responsibilities and commitments that always seem to take precedence.

And after a while, maybe even years later, you still find yourself feeling unsettled and unhappy because you never got to fulfil those goals you initially had.

You also feel like you're not able to because you're limited by all these existing circumstances that life has handed to you…

Is this where you're at in life right now?

Is there something bigger, something more that you'd like to do in an area of your life, but feel like you can't at this moment for whatever reason?

If you're feeling this way, then I want to first assure you that you're not alone.

Almost everyone would have experienced this at some point in their lives, because humans are made to grow, to mature and to develop into 'better' versions of themselves.

Take the evolution theory for example, it shows how humans evolve through time to adapt, survive, and thrive better on Earth.

Same goes for everyone. We have different goals, dreams, and aspirations, but they all lead to the same outcome - becoming better than what we were before. Whether it's in terms of happiness, wealth, love etc.

So why is it that some of us have a harder time moving ahead?

To break free from our limitations, we've got to take a step back and gain a fresh perspective on just what limitations really are.

On the surface, limitations are things that prevent you from doing something, but if you dig deeper, you'll find that limitations are the things that keep you constrained inside a loop.

They keep you stuck facing the same problems, having the same choices, and taking the same actions over and over, and over again.

Limitations define your current circumstances, which also means that it defines the quality of your life.

So if you want to improve the quality of your life, then you've got to be able to break free from the limitations that keep you living the same loop everyday, month, and year.

Some of you may say that hey, the limitations that I'm facing, are out of my control!

They seem like your current reality…an outcome that happens to you. So you tend to accept this reality around us by default.

But here’s another insight that we’ve found from people who consistently make breakthroughs… and it's that your reality is derived from your perception.

It's not reality that's important, but rather, how you see it. Being able to control how you look at things is the key to breaking free, and creating the success that you want.

Shaping your perception is so powerful that just a small change in perspective can completely change everything--from your motivation, outlook, self esteem to your limitations!

So all limitations really start from your mind.

This is good news because, that means you can learn how to take control of the way you view your limitations, and push your way out of your current circumstances to get back on track with better-ing yourself.

Now that you know your limitations start from your mind, you can move on to asking why…

Why do you want to break free of your limitations?

What will breaking free help you to achieve?

If limitations are your obstacles, then they're stopping you from achieving something on the other side.

But what is that something exactly? And why is it meaningful to you?

I'll leave you with these questions to carefully ponder on, because in tomorrow's email, I'm going to make you dig deeper into those limitations that you've been holding on to.

Cheers,

Leon

Hi there, Have you thought about the questions I posed to you yesterday?

Everything that you've ever achieved, and want to accomplish comes from you - your mind.

You set the limits and expectations for what you want in life, which is why I mentioned yesterday, that the first step to breaking free from your limitations, is to learn how to control and change your perception of your current situation.

With this in mind, you can now actively take charge of your circumstances to build and create new opportunities.

So how do you begin?

Think of being at the beach, where you can see the tides coming in. When the tide is against you, it feels like an uphill battle. But when the tide is with you, like when you're surfing, suddenly there's this invisible force - a momentum that pushes you along and you're able to ride the waves smoothly, like how that momentum pushes you towards your goal.

So part of taking charge of your circumstances is to systematically turn the tides in your favor.

That means actively and strategically building up momentum for yourself, to propel you where you want to go.

But first, you have to know what you want. You need to know where you’re going in order to set the right goals and the right actions to start getting there, right?

Next, you also need to see things in terms of Trends.

Do you believe that a big change requires some sort of big, dramatic decision?

Well that's not always the case…

The truth is, that change, especially big change, almost never happens as a sudden, one-off result. They don’t happen in a sudden impulsive decision, because those almost never turn out well.

The outcomes that do succeed, are a result of a build up of underlying factors that probably started a long time ago.

Think of the last major decision you made. The seeds that culminated in it, were probably planted months or maybe even a year before, am I right? You can say that those seeds began a new life trend that started gaining momentum as you put more actions into it. And this really is how your life works.

It's a series of trends. And a trend is a direction of change - it's always moving forward.

But the thing about trends is that they’re either going up or down, and some are moving faster than others, but they’re always moving.

Another thing about trends is that you don’t notice the change happening at the time. The vast majority of change happens behind the scenes, and builds up over time. It’s not until it passes a critical point when it suddenly becomes apparent.

Real change comes from where your trends are taking you. Because a trend is like a river, once it builds up momentum, it becomes a force of its own, and nothing can stop it from reaching its destination.

So the secret to turning the tides to your favor, is to control your trends.

But a trend doesn’t start with your actions.

Like your limitations, it starts from your perspective - how you see the thing you’re trying to change. So once you change your perspective, believe it or not, you’ve already started creating a new trend.

You'll start doing things differently, and soon enough it'll become automatic. Slowly at first, but over time, these will build up into a completely new you in that part of your life.

So since trends are realized over time, this means that it's important to start now, because big change is like a snowball. It accumulates from lots of consistent actions.

The upside to viewing change in terms of trends, is that you can start enjoying the change immediately. And the change doesn’t stop, as long as the trend keeps building up. It'll continue to grow and get bigger and bigger…

The biggest difference between those who experience breakthroughs and those who don't, is that the ones who see breakthroughs go through a total shift in mindset. They realize a need to see things differently, and as a result, they're able to act differently which leads to successful outcomes.

Once you've experienced that shift in perspective, you're halfway through the journey of breaking free from your current situation.

Tomorrow, I'll show you how to journey through the second half of your breakthrough.

Cheers,

Leon

Hi there, Over the years as a life coach, I've found that many people fail to accomplish their goals, or find themselves giving up halfway because they were chasing after goals that were not aligned to what they really want - their purpose.

I often ask my clients to describe in a sentence or two, what they want to achieve, what their goals are, or what makes them happy in life.

But not everyone is able to confidently spell it out. Some struggle to describe what they envision, some have no idea at all what the outcome looks like…

What about you?

Have you found your purpose? Do you know why you want to break free from your current circumstances?

In the past few days, I've been showing you how to shift your mindset, so you're confident to take control of your circumstances again. But that is only half the journey…

In order to experience your breakthrough, you need to know what it is that you're going to be moving towards next. You need the right set of goals that align to your why.

Otherwise, it's likely you'll encounter setbacks and failures again. But before I show you how to set the right goals, let's go deeper into what it means to have a purpose.

Purpose is what differentiates the motivated from the demotivated, the achievers from the underachievers, and the happy from the unhappy.

And Purpose is sustained by two things: Having Meaning, and Forward Movement.

With these two as a foundation, you’ll have a power source that will feed you motivational energy indefinitely.

So, how do you do these two things?

Having Meaning is simple. Just ask yourself a question: Why?

Why are you pursuing a certain goal?

If the reason is vague or unclear, then your motivational energy will be the same. While motivation provides you energy to do something, that energy needs to be focused somewhere.

So without meaning, there is no direction for your energy to be focused on. And you'll eventually find yourself losing focus and motivation, which is why some give up halfway or find themselves stuck.

Yet, having a meaningful objective doesn’t mean you have to change the world or create A huge impact on society. The secret to meaningful work is simple: it should contribute value to something or someone that matters to you.

Next, is gaining Forward Movement. In short, this means to just keep moving. As mentioned previously about trends, it's all about forward movement. Like a snowball, motivation from having progress creates momentum. So to keep this up, you have to keep moving.

And the good news is, your progress doesn’t have to be huge for you to recognize it. Small amounts of progress can be just as motivating, as long as they keep coming.

Creating a simple progress indicator like checklists or milestones, are a great way to visualize your small (and big) wins. They trigger your brain to recognize and acknowledge them, giving you small boosts of motivational energy.

To go into deeper detail on how to set and hit your goals, I recommend you to check out this article:

How to Reinvent Yourself And Redefine Your Future

Once you've got clear and concise goals set out, it will be so much easier for you to step out of your present situation and move ahead again.

Of course, it's always easier said than done. There's still the possibility of encountering setbacks along the way no matter how much you plan things out. But learning how to accept and overcome fears and failure along the way will make you stronger each time.

And I share more about this tomorrow, so stay tuned.

Cheers,

Leon

Hi there, Failure. Defeat. The end. These are just some of the words that we think about when our lives come crashing down on us.

It's true that when we're faced with setbacks and failure, we often find ourselves lost in that moment…where everything around us is suddenly blocked out because in that moment, all we can think about, is the failure or 'mess' we've found ourselves in.

But failure has a purpose. There’s a reason that we fail in life, a reason why we're met with these challenges. It's just that when we’re in the midst of the pain, we oftentimes can’t see that bigger picture.

Perhaps in the situation that you're in right now, whilst trying to break free from the limitations, you're also overwhelmed by fear, uncertainty and might be on the verge of giving up, because of the constant failures that seem to come your way.

But let's not look at failure for all it's negative connotation, unhappiness or challenges that it brings you.

Instead let's accept the failure that life has dealt us with, but do not dwell in it. Because failure helps to build and breed a foundation for a future filled with success. It’s through our failures that we make deeper insights into life.

And then there's fear that often comes hand in hand with failure.

Why do we fear?

Usually, it's caused by the anticipation of some sort of negative experience or outcome, or of the unknown. Because you're not entirely sure what may happen, you don't know how to prepare yourself, and that's where the fear kicks in!

Unfortunately, fear can end up constraining you by keeping you within your comfort zone. It can cause you to avoid things that hold the risk of failure…rather than face your problems, and it's also the source of anxiety and stress.

Fear also pushes you to focus on external objects. When you're afraid, you may start to compare yourself with others as a reflection of your self worth. You may also latch onto other people or things in order to get a sense of security.

As I've shared in the last few days, your perception of things can shape outcomes differently. Your limitations, your trends… and yes, your fears… they all start from your perspective!

Once you learn to accept failure, and understand that it's a lesson that you can learn in life to grow, you'll find yourself moving away from that failure and onto something new.

What went wrong? What could you have done differently? Can you avoid making the same mistakes in the future?

By reflecting on what happened, you can find new opportunities within those failures to get yourself going on a new path.

It's the same with fear. At the end of the day, it's defined by yourself, and that's why different people have different fears. But deep down, fear is caused by something missing inside of you - an inner strength that is lacking within you.

What is it?

It's the lack of having a strong purpose.

A strong purpose is the strength of intention behind taking an action. It means knowing why you're doing something and how meaningful that "why" is to you. So the stronger your purpose, the less power fear has over you.

Remember, we all have our fears, and go through different degrees of failure in life because that's how we know we're growing and moving forward for the better in life.

Right now, if you've been following the emails over the past few days, and are ready to do more to break free from your limitations, then check out this special offer that I have for you:

Enroll in The Lifehack Ultimate Transformation Course

Tomorrow, I'll share more about this course so stay tuned!

Cheers,

### La Vitesse D'exécution Est 1000 Fois Supérieure à la Perfection.

le perfectionnisme vous tuera

J'ai fait cette erreur.

J'ai perdu un temps fou.

Et le pire ?

Je me suis condamné à des progrès épouvantablement lents.

Le genre de lenteur qui se compte en longues années, alors que 6 à 9 mois auraient suffi…

Et si vous ne voulez pas suivre le même chemin que moi à mes débuts, LISEZ la phrase qui suit, et apprenez-la PAR COEUR :

La vitesse d'exécution est 1000 fois supérieure à la perfection.

Une anecdote pour montrer cette idée apparemment contre-intuitive.

Un professeur de céramique a divisé sa classe en deux groupes en début d'année.

La consigne pour le premier groupe était : "Vous serez noté uniquement sur la quantité de céramiques produites." La consigne pour le second était : "Vous serez noté uniquement sur la qualité des céramiques produites."

À la fin de l'année, le professeur apporta une balance pour peser l'ensemble des créations du groupe "quantité" : 50 livres de productions ont obtenu la note A, 40 livres la note B.

Dans le même temps, le groupe "qualité" n'avait qu'un seul projet à réaliser (qui a obtenu la note A).

Mais la chose vraiment étonnante, c'est que les céramiques du premier groupe étaient de bien meilleure qualité que celle du second groupe.

Pendant que les élèves "quantité" produisaient à tour de bras, et apprenaient de leurs erreurs, les élèves "qualité" sont restés enfermés dans la théorie et des idéaux. La différence de niveau entre les deux groupes était devenue gigantesque en l'espace de quelques mois… (source : Art and Fear - 2001)

Que faut-il en retenir pour votre apprentissage du chinois ?

* Focalisez-vous sur l'acquisition de masse (l'un des 2 pilliers de la future Méthode CHINOIS COURANT™)
* Gardez un niveau de correction acceptable, au moins 80% à 90% du temps (mais inutile d'être parfait).
* Et quand votre niveau de correction est juste à plus de 90% du temps, ralentissez un peu. Parce que c'est seulement à ce moment-là que vous pouvez attaquer les formes et les constructions les plus rares, ainsi que les exceptions (jamais avant !)

[à suivre…]

### Optimisez Votre Espace de Travail Pour Gagner En Productivité - La Mine Aux Infos

[https://lamineauxinfos.fr/entreprise/optimisez-votre-espace-de-travail-pour-gagner-en-productivite/](https://lamineauxinfos.fr/entreprise/optimisez-votre-espace-de-travail-pour-gagner-en-productivite/)

Vous passez sans doute une grande partie de votre temps à travailler dans un bureau ou à votre domicile.

Savez-vous que la façon dont votre espace est organisé et optimisé influe sur votre stress ? Il en va de même pour votre créativité et productivité, elles sont en relation directe avec l’état de votre environnement.

Quand vous évoluez dans un bureau bien ordonnée et décoré selon vos goûts la qualité de votre production s’améliore.

Voici quelques conseils pour vous aider à faire de votre lieu de travail un endroit plaisant exempt de distractions indues.

```
## **Choisir une bonne table et un bon fauteuil de bureau**
```

Le choix du bureau est essentiel pour que votre travail soit positivement impacté. Il faut prendre le temps d’en trouver un qui soit bien adapté à votre activité. Vous pouvez aussi acheter séparément des tréteaux et un plateau de bureau design (voir le [catalogue Brico Dépôt](https://www.cataloguemate.fr/brico-depot/)).

Essayez de vous orienter vers quelque chose de pratique et ergonomique. Laissez tomber les anciens secrétaires en bois massif qui sont certes très élégants mais qui ont l’inconvénient majeur d’être lourds et difficiles à déplacer.

Si vous passez de longues heures sur votre chaise (plus de 4 heures par jours), vous devez vraiment investir dans un fauteuil adapté ayant un dossier qui reste en contact permanent avec le dos. Faire autrement peut vous causer une lombalgie (voir article sur [les lombalgies](https://www.doctissimo.fr/html/sante/encyclopedie/sa_1585_lombalg.htm))

Une fois que vous avez installé votre bureau avec un bon fauteuil vous pouvez décorer votre espace de travail selon vos goûts. Ne surchargez pas trop afin de ne pas être trop distrait lorsque vous travaillez.

```
## **N’accumulez pas trop d’objets et de babioles**
```

Regardez autour de vous et voyez si vous n’avez pas accumulé trop d’objets et de babioles qui ne vous servent pas dans votre travail.

Travailler au milieu d’un bric-à-brac nuit, consciemment ou inconsciemment, à la concentration et à la productivité.

Évaluez l’importance de chaque objet qui se trouve sur votre bureau et établissez une hiérarchie. Avez-vous vraiment besoin du gros dossier qui se trouve en bout de table ? N’y a-t-il pas trop de documents qui traînent un peu partout plutôt que d’être rangés dans le meuble d’archivage ?

Posez-vous deux minutes, observez et débarrassez-vous du superflu, ça ira beaucoup mieux !

```
## **Faites briller votre espace de travail**
```

Faire briller son espace de travail peut être associé à une corvée, mais en réalité, sans être maniaque, évoluer dans un bureau propre contribue grandement à la productivité.

Épousseter l’écran et nettoyer ordinateur ne prend que quelques minutes et constitue déjà un premier pas.

Prenez cinq minutes avant de quitter les lieux le soir pour passer un coup de chiffon et dépoussiérer. Vous verrez qu’en arrivant le matin dans un espace propre vous vous sentirez beaucoup mieux et d’attaque pour débuter votre journée.

```
## **Ayez des meubles de stockage adaptés**
```

Pour être plus productif et efficace, ayez des meubles de stockage qui soient adaptés à votre activité. Vous en trouverez de pas chers et fonctionnels sur le catalogue Brico Dépôt. Hiérarchisez, ensuite, les tiroirs en fonction de leur importance. Placez, par exemple, les fournitures dont vous avez régulièrement besoin en haut. Vous pouvez aussi vous munir de dossiers colorés pour égayer vos tiroirs.

Ces recommandations organisationnelles semblent plutôt simples, mais vous verrez qu’en les appliquant vous allez gagner du temps et augmenter votre productivité.

### Pourquoi Retardataires Tergiverser

_**PDF:** Nous avons fait un PDF fantaisie de ce poste pour l' impression et la visualisation hors ligne. [Achetez - le ici.](https://gum.co/wbw-proc1) (Ou voir un [aperçu](https://28oa9i1t08037ue3m1l0i861-wpengine.netdna-ssl.com/wp-content/uploads/2016/02/why-procrastinators-procrastinate-preview.pdf) .)_

---

**pro-cras-ti-na-tion** | prəˌkrastənāSHən, Pro- |noml'action de retarder ou remettretard quelque chose: _votre premier conseil est d'éviter la procrastination_ .

Qui aurait pensé que, après des décennies de lutte avec la procrastination, le dictionnaire, de tous les lieux, détiendrait la solution.

_Procrastination à éviter._ Donc , élégant dans sa simplicité.

Alors que nous sommes ici, nous allons rendre les gens obèses que éviter de trop manger, les personnes déprimées éviter l'apathie, et quelqu'un s'il vous plaît dire les baleines échouées qu'ils devraient éviter d'être hors de l'océan.

Non, « éviter la procrastination » est seulement un bon conseil pour procrastinators-les faux gens qui sont comme, « Je vais totalement sur Facebook quelques fois par jour au travail je suis un procrastinator! » Les mêmes personnes qui vont dire à un vrai procrastinator quelque chose comme, « Il suffit de ne pas remettre à plus tard et vous serez très bien. »

La seule chose que le dictionnaire, ni procrastination faux comprendre est que ni pour un vrai procrastination, la procrastination est pas en option, il est quelque chose qu'ils ne savent pas comment ne pas faire.

Au collège, la liberté personnelle soudaine débridée a été un désastre pour moi, je ne faisais rien, jamais, pour une raison quelconque. La seule exception était que je devais la main dans les journaux de temps en temps. Je ferais ceux de la veille, jusqu'à ce que je compris que je pouvais les faire à travers la nuit, et je l'ai fait qu'ils étaient dus jusqu'à ce que je compris que je pouvais les commencer tôt le matin le jour. Ce comportement a atteint un niveau de caricature quand je ne pouvais pas commencer à écrire ma thèse haut de 90 pages jusqu'à 72 heures avant l'échéance, une expérience qui a pris fin avec moi dans l'apprentissage du bureau du médecin du campus que le manque de sucre dans le sang était la raison pour laquelle mes mains avaient disparu engourdi et recroquevillé contre ma volonté. (Je l'ai fait obtenir la thèse en non, il n'a pas été bon.)

Même ce poste a pris beaucoup plus que ce qu'elle devrait avoir, parce que je passé un tas d'heures à faire des choses comme voir [cette image](http://upload.wikimedia.org/wikipedia/commons/d/d5/Jock,_the_Gorilla_(2).jpg) assis sur mon bureau à partir d' [un poste précédent](https://www.waitbutwhy.com/2013/10/the-primate-awards.html) , l' ouvrir, regarder pendant une longue réflexion de temps sur la façon facile qu'il pouvait battre moi dans un combat, se demandant alors s'il pouvait battre un tigre dans un combat, puis se demander qui gagnerait entre un lion et un tigre, et googler alors que et lire à ce sujet pendant un certain temps (le tigre gagnerait). J'ai des problèmes.

Pour comprendre pourquoi procrastination tergiverser tant, nous allons commencer par la compréhension d' un _non_ le cerveau de -procrastinator:

![https://4.bp.blogspot.com/-dID9_Fb3jsQ/Upvh1rjLxYI/AAAAAAAAGb8/fVhfjlj3Pks/s640/NP+brain.png](https://4.bp.blogspot.com/-dID9_Fb3jsQ/Upvh1rjLxYI/AAAAAAAAGb8/fVhfjlj3Pks/s640/NP+brain.png)

Assez normal, non? Maintenant, regardons le cerveau d'un procrastinator:

![https://1.bp.blogspot.com/-S6ryaE6HuZg/Upvh2oS7q9I/AAAAAAAAGcI/R2-QDRd6A7o/s640/P+brain.png](https://1.bp.blogspot.com/-S6ryaE6HuZg/Upvh2oS7q9I/AAAAAAAAGcI/R2-QDRd6A7o/s640/P+brain.png)

Avis quelque chose de différent?

Il semble que la prise de décision rationnelle Maker dans le cerveau de la procrastination coexiste avec un animal-Instant Gratification Singe.

Ce serait bien mignonne, même, si la prise de décision rationnelle Maker connaissait la première chose sur la façon de posséder un singe. Mais malheureusement, il ne faisait pas partie de sa formation et il a laissé complètement sans défense comme le singe, il est impossible pour lui de faire son travail.

![https://2.bp.blogspot.com/-Itw_OLDmScQ/Upvh0zdThcI/AAAAAAAAGbc/oTJBvQsSgaA/s640/IGM+RDM+interacting+1.png](https://2.bp.blogspot.com/-Itw_OLDmScQ/Upvh0zdThcI/AAAAAAAAGbc/oTJBvQsSgaA/s640/IGM+RDM+interacting+1.png)

![https://1.bp.blogspot.com/-TUld_HzbZP8/Upvh1CFYvBI/AAAAAAAAGbo/i3VQRZ3zPjU/s640/IGM+RDM+interacting+2.png](https://1.bp.blogspot.com/-TUld_HzbZP8/Upvh1CFYvBI/AAAAAAAAGbo/i3VQRZ3zPjU/s640/IGM+RDM+interacting+2.png)

![https://3.bp.blogspot.com/-VG-qHIJJeM4/Upvh1QrCVkI/AAAAAAAAGcE/XwQWbOsUIok/s640/IGM+RDM+interacting+3.png](https://3.bp.blogspot.com/-VG-qHIJJeM4/Upvh1QrCVkI/AAAAAAAAGcE/XwQWbOsUIok/s640/IGM+RDM+interacting+3.png)

![https://2.bp.blogspot.com/-CLsCpHveOY0/Upvh1oFtMNI/AAAAAAAAGcA/Bu92QWsX0dQ/s640/IGM+RDM+interacting+4.png](https://2.bp.blogspot.com/-CLsCpHveOY0/Upvh1oFtMNI/AAAAAAAAGcA/Bu92QWsX0dQ/s640/IGM+RDM+interacting+4.png)

Le fait est, Instant Gratification Monkey est la dernière créature qui devrait être responsable des décisions qu'il pense _que_ sur le présent, sans tenir compte des leçons du passé et sans tenir compte du futur tout à fait, et il se porte tout à maximiser la facilité et le plaisir de le moment actuel. Il ne comprend pas la prise de décision rationnelle Maker mieux que Rational Décideur lui-pourquoi nous comprend continuer à faire cela jogging, il pense que , quand nous pourrions arrêter, ce qui se sentirait mieux. Pourquoi devrions - nous pratiquer cet instrument quand il est pas amusant? Pourquoi devrions - nous jamais utiliser un ordinateur pour le travail lorsque l'Internet est assis en attente là pour jouer avec? Il pense que les humains sont fous.

Dans le monde du singe, il a tout compris, si vous mangez quand vous avez faim, dormir quand vous êtes fatigué, et ne faites rien difficile, vous êtes un singe assez réussi. Le problème de la procrastination est qu'il arrive à vivre dans le monde humain, ce qui rend le singe un Gratification instantané de navigateur hautement qualifiés. Pendant ce temps, la prise de décision rationnelle Maker, qui a été formé pour prendre des décisions rationnelles, de ne pas faire face à la concurrence sur les contrôles, ne sait pas comment mettre en place un moyen efficace de lutte-il se sent plus en plus mal sur lui-même plus il échoue et plus la procrastination souffrante dont la tête est-il en lui engueule.

C'est le bordel. Et avec le singe en charge, la procrastination se trouve passé beaucoup de temps dans un endroit appelé Playground sombre. [**1**](https://waitbutwhy.com/2013/10/why-procrastinators-procrastinate.html#)

The Dark Playground est un lieu tous les procrastinator connaît bien. Il est un endroit où les activités de loisirs se produisent à des moments où les activités de loisirs ne sont pas censées se produire. Le plaisir que vous avez dans la cour sombre est pas vraiment amusant parce qu'il est tout à fait imméritée et l'air est rempli de culpabilité, l' anxiété, la haine de soi, et la crainte. Parfois , la prise de décision rationnelle Maker met son pied vers le bas et refuse de vous laisser perdre du temps à faire des choses de loisirs normales, et depuis l'instant Gratification Singe sûr que l' enfer ne va pas vous laisser travailler, vous vous trouvez dans un Purgatoire bizarre d'activités étranges où tout le monde perd. [**2**](https://waitbutwhy.com/2013/10/why-procrastinators-procrastinate.html#)

![https://3.bp.blogspot.com/-vg18-8Nm9yg/Upvh006UpSI/AAAAAAAAGbg/y0zGXUVInlE/s640/Dark+Playground.png](https://3.bp.blogspot.com/-vg18-8Nm9yg/Upvh006UpSI/AAAAAAAAGbg/y0zGXUVInlE/s640/Dark+Playground.png)

Et les pauvres Rational Décideur seulement mopes, en essayant de comprendre comment il a laissé l' être humain , il est censé être responsable de la fin ici à _nouveau_ .

![https://2.bp.blogspot.com/-O5AMv0YQtp0/Upvh01cqxrI/AAAAAAAAGbk/y--K1EAAmTo/s640/Dark+Playground+people.png](https://2.bp.blogspot.com/-O5AMv0YQtp0/Upvh01cqxrI/AAAAAAAAGbk/y--K1EAAmTo/s640/Dark+Playground+people.png)

Compte tenu de cette situation, comment le gérer procrastinator jamais à accomplir quelque chose?

Comme il se trouve, il y a une chose qui fait peur la merde hors de l'instantané Gratification Singe:

![https://4.bp.blogspot.com/-MlSCOooBXFE/Upvh3lkFkhI/AAAAAAAAGck/ItaOXl_J2rU/s640/PM.png](https://4.bp.blogspot.com/-MlSCOooBXFE/Upvh3lkFkhI/AAAAAAAAGck/ItaOXl_J2rU/s640/PM.png)

Le monstre de panique est en sommeil la plupart du temps, mais il se réveille soudainement quand un délai est trop près ou quand il y a risque d'embarras public, une catastrophe de carrière, ou une autre conséquence effrayant.

![https://1.bp.blogspot.com/-bRsO0-Gbt5I/Upvh2hIjDJI/AAAAAAAAGcs/Bs_y-0os0aY/s640/PM+Scare+1.png](https://1.bp.blogspot.com/-bRsO0-Gbt5I/Upvh2hIjDJI/AAAAAAAAGcs/Bs_y-0os0aY/s640/PM+Scare+1.png)

![https://2.bp.blogspot.com/-m06IHIKx56Q/Upvh284PRiI/AAAAAAAAGcg/Dki558dQ1O4/s640/PM+Scare+2.png](https://2.bp.blogspot.com/-m06IHIKx56Q/Upvh284PRiI/AAAAAAAAGcg/Dki558dQ1O4/s640/PM+Scare+2.png)

![https://4.bp.blogspot.com/-Jjn22OLAd2E/Upvh3ICJbGI/AAAAAAAAGcY/fe37M2hsFiU/s640/PM+Scare+3.png](https://4.bp.blogspot.com/-Jjn22OLAd2E/Upvh3ICJbGI/AAAAAAAAGcY/fe37M2hsFiU/s640/PM+Scare+3.png)

Instant Gratification Singe, normalement inébranlables, est terrifié par le monstre de panique. Sinon, comment pourriez-vous expliquer la même personne qui ne peut pas écrire phrase d'introduction d'un document sur une période de deux semaines ayant soudainement la possibilité de rester debout toute la nuit l'épuisement, les combats, et d'écrire huit pages? Sinon, pourquoi serait une personne extraordinairement paresseux commencer une routine d'entraînement rigoureux autre qu'une panique monstre Freakout à devenir moins attrayant?

Et ce sont les chanceux procrastinators-il y a des gens qui ne répondent même pas au monstre de panique, et dans les moments les plus désespérés, ils finissent par courir l'arbre avec le singe, entrer dans un état d'arrêt auto-annihilation.

Tout à fait une foule que nous sommes.

Bien sûr, cela est aucun moyen de vivre. Même pour la procrastination qui ne parvient, à terme, faire avancer les choses et rester membre compétent de la société, quelque chose doit changer. Voici les principales raisons pour lesquelles:

**1) Il est désagréable.** Beaucoup trop de temps précieux de la procrastination est passé peiner dans la cour sombre, le temps qui aurait pu profiter le satisfaire, les loisirs bien méritée si les choses avaient été faites sur un calendrier plus logique. Et la panique est pas amusant pour tout le monde.

**2) Le procrastinator se vend finalement court.** Il finit par sous - performants et ne parvient pas à atteindre son potentiel, qui ronge lui au fil du temps et le remplit avec regret et la haine de soi.

**3) La Have-To-Dos peut arriver, mais pas le Want-To-Dos.** Même si la procrastination est dans le type de carrière où le Monster Panic est régulièrement présent et il est capable de se réaliser au travail, les autres choses dans la vie qui sont importantes pour lui-mettre en forme, la cuisson des repas élaborés, apprendre à jouer de la guitare , écrire un livre, la lecture, ou même faire un commutateur jamais carrière audacieux se produire parce que le Monster Panic ne soit pas habituellement impliqué dans ces choses. Les entreprises comme les développer nos expériences, rendre notre vie plus riche, et nous apporter beaucoup de bonheur et pour la plupart procrastination, ils sont laissés dans la poussière.

Alors comment un procrastinator améliorer et devenir plus heureux? **Voir la partie 2, [Comment faire pour battre procrastination](https://www.waitbutwhy.com/2013/11/how-to-beat-procrastination.html) .**

---

![https://28oa9i1t08037ue3m1l0i861-wpengine.netdna-ssl.com/wp-content/uploads/2015/01/PDF-Gray-v2.png](https://28oa9i1t08037ue3m1l0i861-wpengine.netdna-ssl.com/wp-content/uploads/2015/01/PDF-Gray-v2.png)

[**Mon TED Talk sur la procrastination**](https://www.ted.com/talks/tim_urban_inside_the_mind_of_a_master_procrastinator)

Si vous êtes en attente Mais pourquoi, inscrivez - vous pour l' [**attente mais pourquoi la liste e - mail**](https://waitbutwhy.com/2013/10/why-procrastinators-procrastinate.html#) et nous vous enverrons les nouveaux messages juste quand ils sortent.

Si vous souhaitez un soutien Attendez Mais pourquoi, [**voici notre Patreon**](https://www.patreon.com/waitbutwhy) .

---

**Deux postes de SMAM connexes:**

[**Pourquoi vous ne devriez pas attention à ce que pensent les autres](https://waitbutwhy.com/2014/06/taming-mammoth-let-peoples-opinions-run-life.html) .** Une lutte différente passe dansautre partie de votre cerveau. Rencontrez le mammouth.

[**Une religion pour la non - croyants](https://waitbutwhy.com/2014/10/religion-for-the-nonreligious.html) .** Un regard encore plus profond à l'accord avec le singe et les autres animaux dans votre cerveau.

**Alors qu'ils anéantissent votre vie, vous pourriez aussi bien des câlins avec eux:**

![https://28oa9i1t08037ue3m1l0i861-wpengine.netdna-ssl.com/wp-content/uploads/2013/11/plushies-ad-for-post.jpg](https://28oa9i1t08037ue3m1l0i861-wpengine.netdna-ssl.com/wp-content/uploads/2013/11/plushies-ad-for-post.jpg)
