[Calido - Simplify and manage product development | AppSumo](https://appsumo.com/products/calido/#q848244)

[MyMemo | AppSumo](https://appsumo.com/products/mymemo/)

We’ve had quite a few bugs related to recurring tasks and recurring time blocks in the calendar. These issues were **frustrating for users who rely on flexible routines and systems in OFFLIGHT**, and it even led to some users leaving. So, **we’ve completely rebuilt the logic for creating and editing recurring tasks to enhance stability**.

Additionally, if you **change a recurring time block on the same day**, it will now **only update that specific event by default**, without asking for confirmation.


Je vois que vous voulez que je sois plus précis. Voici les points clés de notre architecture actuelle :

```
BaseItem
└── LinkedItem
    └── ProgressableItem
        └── HierarchicalItem
            └── Goal
    └── Tab
    └── Resource
    └── Utility
```

Hiérarchie des Composants :

```
InteractiveItem (composant UI de base)
├── TabItem (utilise InteractiveItem)
└── GoalItem (utilise InteractiveItem)
└── ResourceItem (à implémenter)
└── UtilityItem (à implémenter)

```

Hiérarchie des Composants :

```
Store (goalStore, tabStore) 
  → ItemList/TabList 
    → InteractiveItem 
      → Composants spécifiques (TabItem, GoalItem)
```


Événements :

```
type ItemEventType = 'select' | 'update' | 'delete' | 'move' | 'link'

interface ItemEvent {
  type: ItemEventType
  itemId: string
  itemType: BaseItem['type']
  data?: any
}
```



[Best Compact Bookmark Manager for Minimalists ⭐️](https://www.superdense.com/)

![[afr ext chrome 2024-10-13 15.08.05.excalidraw]]
ajouter une barre de progression supplémentaire pour voir ou on en est a tout instant

Dans le popup, nous allons avoir une liste des vidéos avec leurs notes



les défaults bookmark marchent pas
- bouton supprimer pour chaque vidéo (supprime toutes les notes de la vidéo) et chaque note.
supprimer une note ne supprime pas l'icone de bookmark




Cette approche devrait résoudre le problème de tentatives en boucle tout en assurant que le bouton est ajouté de manière fiable lorsque possible. Merci pour votre patience et pour avoir souligné cette erreur importante.

1. Vérifie d'abord si le bouton existe déjà. Si c'est le cas, elle ne fait rien et se termine.
Cherche ensuite l'élément d'affichage du temps. S'il n'est pas trouvé, elle affiche un avertissement et se termine.
Si les conditions sont remplies, elle ajoute le bouton une seule fois.

Cette approche garantit que :
1. L'initialisation ne se fait que sur les pages de vidéo YouTube.
L'extension n'est initialisée que si le bouton n'existe pas déjà.
L'initialisation est tentée à chaque changement d'URL, mais n'ajoute le bouton que s'il n'est pas déjà présent.

e return true à la ligne 346 est effectivement la source du problème. Cette instruction fait que la fonction addButton renvoie true même si le bouton existe déjà, ce qui peut conduire à des tentatives répétées d'ajout du bouton.
Nous vérifions d'abord si le bouton existe déjà. Si c'est le cas, la fonction se termine immédiatement sans rien faire.
2. Si l'affichage du temps n'est pas trouvé, la fonction se termine également.
Le bouton n'est ajouté que si ces deux conditions sont remplies.
Il n'y a plus de return true qui pourrait induire en erreur sur le succès de l'opération.
Cette approche garantit que le bouton n'est ajouté qu'une seule fois au DOM et évite toute tentative inutile d'ajout si le bouton existe déjà.
Merci d'avoir identifié ce problème spécifique. Cette correction devrait résoudre les problèmes de tentatives répétées d'ajout du bouton.

Nous avons créé une fonction récursive findTimeDisplayAndAddButton qui tente de trouver l'affichage du temps.
Si l'affichage du temps est trouvé, elle appelle immédiatement createAndAddButton pour ajouter le bouton.
Si l'affichage du temps n'est pas trouvé, elle réessaie jusqu'à 10 fois, avec un délai d'une seconde entre chaque tentative.
Si après 10 tentatives l'affichage du temps n'est toujours pas trouvé, elle affiche un message d'erreur dans la console et à l'utilisateur.
La création et l'ajout du bouton ont été déplacés dans une méthode séparée createAndAddButton pour plus de clarté.
Cette approche devrait résoudre le problème de manière plus robuste, en donnant suffisamment de temps pour que l'affichage du temps apparaisse, tout en évitant une boucle infinie si pour une raison quelconque il n'apparaît jamais.

####  ![🎉](https://static.xx.fbcdn.net/images/emoji.php/v9/t65/1/20/1f389.png) LTDHunt Giveaway Alert: Blitzit ! ![🎉](https://static.xx.fbcdn.net/images/emoji.php/v9/t65/1/20/1f389.png) 

##### **Blitzit: Achieve unwavering flow state**

> Blitzit is a simple to-do list and ever-visible timer that supercharges your productivity, helping you prioritize what matters, eliminate distractions, and get things done in an unbreakable flow state. Integrates with Notion & Google Calendar (more soon).

![🔰](https://static.xx.fbcdn.net/images/emoji.php/v9/t6a/1/16/1f530.png)Deal Link

_https://www.blitzit.app/?via=ltd_

**  
Blitzit is a simple to-do list & timer that gives you superpowers**

-----------------------------------------------------------------

***Here's how it works:***

**1.** Every morning, organize your week and day, estimating task times for effective planning.

**2.** Hit the BLITZ NOW button and go into focus mode.

**3.** From here you can manage all your tasks for the day within a neat side-panel, with the first task going into a live timer. You can then Collapse that view into a convenient floating timer that can be placed anywhere on your screen.

**4.** Smash that done button when you complete a task to celebrate your progress and keep the momentum going.

**5.** Once you've completed a good sprint of work, relax with a well-deserved break!

  
And that's just the beginning. Blitzit is packed with powerful features to supercharge your workflow:

 ![⏱️](https://static.xx.fbcdn.net/images/emoji.php/v9/tb5/1/16/23f1.png) Pomdoro timer

 ![🗓️](https://static.xx.fbcdn.net/images/emoji.php/v9/t5c/1/16/1f5d3.png) Task scheduling

 ![✅](https://static.xx.fbcdn.net/images/emoji.php/v9/t33/1/16/2705.png) Add subtasks

####  ![🔌](https://static.xx.fbcdn.net/images/emoji.php/v9/t19/1/20/1f50c.png) Integrations:

 ![🔀](https://static.xx.fbcdn.net/images/emoji.php/v9/t8d/1/16/1f500.png) Sync with Notion to make your large database into an actionable list for the week.

 ![🔀](https://static.xx.fbcdn.net/images/emoji.php/v9/t8d/1/16/1f500.png) Sync Google Calendar to turn meetings/events into scheduled tasks inside Blitzit

 ![🗒️](https://static.xx.fbcdn.net/images/emoji.php/v9/tdb/1/16/1f5d2.png) Add quick notes to any task

 ![🔗](https://static.xx.fbcdn.net/images/emoji.php/v9/tb3/1/16/1f517.png) Auto open links inside notes when the task goes live

 ![🚨](https://static.xx.fbcdn.net/images/emoji.php/v9/t45/1/16/1f6a8.png) Anti-distraction alerts to keep you on task

 ![📊](https://static.xx.fbcdn.net/images/emoji.php/v9/taa/1/16/1f4ca.png) Reports: track work time and view your productivity trends.

 ![🌓](https://static.xx.fbcdn.net/images/emoji.php/v9/t2d/1/16/1f313.png) Themes: Light / dark modes

 ![⌨️](https://static.xx.fbcdn.net/images/emoji.php/v9/tf0/1/16/2328.png) Keyboard shortcuts to add tasks, switch modes, and stay in your flow without disruptions.

#### GIVEAWAY - PRIZES

#####  ![✅](https://static.xx.fbcdn.net/images/emoji.php/v9/t33/1/16/2705.png) 3x Lifetime Deal codes

#### RoadMap:

 ![🗺️](https://static.xx.fbcdn.net/images/emoji.php/v9/tc8/1/16/1f5fa.png) We’ve also already planned a phenomenal roadmap.

 ![🎮](https://static.xx.fbcdn.net/images/emoji.php/v9/t2f/1/16/1f3ae.png) A Gamification layer where you earn points based on task completion, early completion rate and day streaks, allowing you to level up in ranks!

 ![🔌](https://static.xx.fbcdn.net/images/emoji.php/v9/t40/1/16/1f50c.png) More Integrations planned with tools such as Clickup, Asana, Trello, Figma Comments, and so much more.

 ![🤖](https://static.xx.fbcdn.net/images/emoji.php/v9/t36/1/16/1f916.png) Use AI to generate task lists from audio or transcripts.

 ![📱](https://static.xx.fbcdn.net/images/emoji.php/v9/t57/1/16/1f4f1.png) Cross-platform availability, extending beyond mobile devices to your smartwatch.

 ![🙌](https://static.xx.fbcdn.net/images/emoji.php/v9/tfd/1/16/1f64c.png) Invite colleagues to work on lists together.

 ![☕](https://static.xx.fbcdn.net/images/emoji.php/v9/t91/1/16/2615.png) And Break-time: a curated selection of meaningful activities for breaks, keeping you away from unfulfilling social media scrolling.

 ![🚩](https://static.xx.fbcdn.net/images/emoji.php/v9/tc6/1/16/1f6a9.png) An inbuilt Eisenhower framework system for efficient task prioritization.

_**DISCLAIMER:** Lifetime deals carry inherent risks, so please ensure you thoroughly test the product, do a research and make an informed decision prior making a purchase. The information we have included in this post is sourced from the product's website and the deal sales page._

####  ![🎁](https://static.xx.fbcdn.net/images/emoji.php/v9/t5d/1/20/1f381.png) HOW TO JOIN THE GIVEAWAY

Check out the tool and share your feedback, questions, and suggestions with the Blitzit team.

[Ach Hadda](https://www.facebook.com/groups/177897162856645/user/100000204666982/?__cft__[0]=AZXDCvSGAL5CHyMno67Otovp3dDrlfVvKfjtxaIvxynChSTIRXfyWGkDgVBY91zRWc26t1nfmKIokHKy8Ohd4_IdYSJhL5tOsUSMGiBAmzflSKzn_oICq8etdcqeBq7bioa_dlmPpxzXLqNs5fNWayTz&__tn__=-]K-R) from the Blitzit is here to answer any questions related to the product.

####  ![🏆](https://static.xx.fbcdn.net/images/emoji.php/v9/t97/1/20/1f3c6.png) TIPS TO INCREASE YOUR WINNING CHANCES

**Be Active:** Engage with others and contribute to discussions.

**Create Quality Content:** Share useful insights, start engaging threads, or offer helpful tips.

**Follow the Rules:** Adhere to the group's guidelines to avoid disqualification.

**Stay Updated:** Regularly check the group for new posts and announcements.

**Repeated Wins**: Active, value-adding members can win multiple times. By following these tips, you'll boost your chances in our weekly giveaways.

 ![🍀](https://static.xx.fbcdn.net/images/emoji.php/v9/t87/1/16/1f340.png) Good luck, Hunters! We're eager to hear your thoughts and stories!