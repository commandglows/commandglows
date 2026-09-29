**Oui, plusieurs pistes utiles — surtout pour enrichir l’interaction système autour de la grille.** J’ai parcouru la liste et vérifié les sources des principaux candidats. C’est un catalogue d’applications, pas une sélection de composants directement intégrables.

**Pour notre contrôle du desktop**

| Outil présent dans la liste | Ce qui nous intéresse | Ce qu’on pourrait en tirer |
|---|---|---|
| [AutoHotkey](https://github.com/AutoHotkey/AutoHotkey) | Automatisation Windows, raccourcis et macros | Expérimenter différentes commandes clavier et séquences d’actions avant de décider du moteur définitif de CommandGlows. |
| [ZoomIt](https://learn.microsoft.com/en-us/sysinternals/downloads/zoomit) | Zoom d’écran activable au clavier, navigation et annotation | **Explorer une loupe pendant l’affinement récursif**, pour viser les petites cibles sans multiplier les subdivisions. C’est une proposition d’interaction, pas une fonction de grille de ZoomIt. |
| [Carnac](https://github.com/Code52/carnac) | Affichage à l’écran des touches utilisées | Inspirer le retour visuel pendant l’apprentissage : touche reçue, action déclenchée. Utile aussi pour nos démonstrations. |
| [Keypirinha](https://keypirinha.com/) | Lancement d’applications, recherche d’éléments, bascule vers une application par son nom | Une interaction complémentaire : **désigner par son nom quand on sait quoi chercher, viser spatialement quand on voit la cible**. |

**La meilleure piste pour la grille elle-même est toutefois hors de cette liste : [Mousemaster](https://github.com/petoncle/mousemaster).** Il mérite une comparaison approfondie avec Neru : grille à étiquettes, grille récursive, hints sur les contrôles, mouvement continu, sélection d’écran et configuration utilisable d’une seule main. Il propose même une configuration inspirée de Neru.

Cela nous donne des variantes concrètes à comparer, sans décider maintenant :

- **Grille à une touche par case**, réappliquée dans la zone sélectionnée.
- **Découpage par directions ou quadrants**, avec moins de touches à mémoriser.
- **Grille puis déplacement fin**, pour terminer la visée.
- **Grille avec grossissement local**, pour améliorer la précision visuelle.

La question intéressante sera : *quelle combinaison minimise à la fois les frappes, la recherche visuelle et les erreurs ?* Pas seulement laquelle atteint une coordonnée en théorie.

**Pour CommandGlows au-delà de la grille**

| Outil | Possibilité concrète | Nature de l’intérêt |
|---|---|---|
| [CopyQ](https://hluk.github.io/CopyQ/) | Historique du presse-papiers, recherche, transformations et collage dans une autre application ; exclusions configurables | Référence fonctionnelle pour les commandes de texte et de collage. |
| [Everything](https://www.voidtools.com/support/everything/sdk/) | Retrouver rapidement un fichier depuis une commande globale | **Vraie piste d’intégration** : SDK disponible, mais Everything doit fonctionner en arrière-plan. |
| [EarTrumpet](https://github.com/File-New-Project/EarTrumpet) | Volume par application, changement de périphérique de sortie, raccourcis | Référence pour des commandes système audio telles que « baisser cette application » ou « changer de sortie ». |

**Pour les autres projets**

- **ContentGlows : [ShareX](https://getsharex.com/)** pour étudier le parcours capture → annotation → traitement → export. Tes captures montrent d’ailleurs que tu l’utilises déjà.
- **Fonctions audio desktop : [EarTrumpet](https://github.com/File-New-Project/EarTrumpet)** pour son interaction avec les applications et périphériques Windows.
- **Outillage ShipGlows : [CommandTrayHost](https://github.com/rexdf/CommandTrayHost)** comme référence de supervision de programmes en zone de notification ; **[Process Monitor](https://learn.microsoft.com/en-us/sysinternals/downloads/procmon)** comme outil de diagnostic des accès fichiers, registre et processus.

**Je prioriserais maintenant Neru + Mousemaster pour l’exploration des grilles, et ZoomIt pour la question du grossissement.** Everything, CopyQ et EarTrumpet constituent un second ensemble intéressant pour élargir les commandes système de CommandGlows.

Ce sont des pistes vérifiées dans la documentation, pas encore des intégrations validées : aucun outil installé, aucun test interactif ni audit de réutilisation du code effectué.
