---
translationKey: "tty-basics"
title: "Mon premier article de blog"
description: "Description de mon premier article de blog"
contents: ["Introduction", "Contenu principal", "Conclusion"]
author: "Jacob"
authorImage: "/images/CommandGlows.png"
authorImageAlt: "Avatar de l'auteur"
pubDate: 2024-02-06
cardImage: "/images/CommandGlows.png"
cardImageAlt: "Image de couverture de l'article"
readTime: 5
---


Le terme TTY signifie Teletypewriter (Téléscripteur en français). C'est un concept qui a beaucoup évolué, passant d'une machine physique imposante à une abstraction logicielle dans nos ordinateurs modernes.
Pour bien comprendre, il faut séparer son histoire de son utilité actuelle.
1. L'origine historique (Le matériel)
Dans les années 60 et 70, avant l'invention des moniteurs vidéo, les informaticiens utilisaient des téléscripteurs pour communiquer avec les ordinateurs centraux (mainframes).
 * Le fonctionnement : C'était une sorte de machine à écrire électrique reliée à l'ordinateur.
 * L'interaction : Vous tapiez une commande sur le clavier, l'ordinateur la recevait, et il renvoyait la réponse qui s'imprimait directement sur un rouleau de papier.
2. Le TTY moderne (L'abstraction logicielle)
Aujourd'hui, même si nous avons des écrans et des interfaces graphiques, le système d'exploitation (comme Linux ou Android/Termux) utilise toujours le concept de TTY pour gérer les entrées et sorties de texte.
On distingue généralement trois formes :
 * Les Consoles Virtuelles (TTY1, TTY2...) : Sur un PC Linux, si vous faites Ctrl + Alt + F1, vous quittez votre bureau graphique pour arriver sur un écran noir plein de texte. C'est un TTY "pur" géré directement par le noyau.
 * Les Pseudo-Terminaux (PTS) : C'est ce que vous utilisez 99% du temps. Quand vous ouvrez l'application Termux ou un terminal sous Windows/Mac, le système crée un "faux" TTY (un émulateur) pour que les programmes croient qu'ils parlent à un vrai terminal physique.
 * Le mode RTT/TTY (Accessibilité) : Sur smartphone, vous verrez parfois une option TTY dans les réglages d'appel. Cela permet aux personnes sourdes ou malentendantes de taper du texte qui est converti en voix (ou vice versa) pendant un appel.
3. Pourquoi c'est important pour Termux ?
Quand vous lancez un outil comme Gum, celui-ci a besoin de savoir s'il est "dans un TTY".
Si vous essayez de lancer une commande via un script automatisé ou un environnement restreint qui n'émule pas correctement un terminal, Gum dira souvent "not a tty". Cela signifie qu'il ne trouve pas de "clavier" ou d' "écran" interactif pour afficher ses menus et ses boutons.
Résumé des différences
| Terme | Ce que c'est réellement |
|---|---|
| TTY | L'interface de communication (le "tuyau" entre vous et le système). |
| Terminal | L'environnement (physique autrefois, logiciel aujourd'hui) qui affiche le texte. |
| Shell | Le programme (comme Bash ou Zsh) qui interprète vos commandes à l'intérieur du TTY. |
Voulez-vous savoir comment vérifier le nom du TTY que vous utilisez actuellement dans Termux ? (Il suffit de taper la commande tty).
