---
artifact: documentation
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlowz"
created: "2026-06-12"
updated: "2026-06-12"
status: "reviewed"
source_skill: "sf-docs"
scope: "custom_action_buttons"
owner: "Diane"
confidence: "high"
risk_level: "medium"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Flutter app"
  - "Windows desktop bridge"
  - "macOS desktop bridge"
  - "Linux desktop bridge"
depends_on:
  - "shipglows_data/workflow/specs/custom-action-buttons-and-command-macros.md"
  - "shipglows_data/technical/winglowz_app/context-function-tree.md"
evidence:
  - "winglowz_app/lib/features/custom_action_buttons/domain/custom_action_buttons.dart"
  - "winglowz_app/lib/features/snippets/presentation/custom_action_buttons_panel.dart"
  - "winglowz_app/lib/features/custom_action_buttons/application/custom_action_button_runner.dart"
supersedes: []
next_step: "/sf-docs update"
---

# Boutons personnalisés et actions WinGlowz

## Vue d’ensemble

Cette fonctionnalité permet d’avoir une barre d’action personnalisable avec des boutons typés.
Un **bouton personnalisé** est un objet UI : titre, icône, rangée, ordre et action liée.
Un **snippet** reste une entrée texte (trigger + contenu) réutilisable, pas un conteneur UI.

## Où créer une barre de boutons

- Ouvrir la page `Actions`.
- Utiliser le formulaire `Nouveau bouton` pour définir titre, icône, rangée, type d’action et valeur.
- La section `Barre d’action` prévisualise la barre globale scrollable.
- Activer `Barre d’action Android IME` depuis `Actions` ou `Settings > Keyboard`.
- La liste `Boutons personnalisés` permet d’éditer, supprimer et exécuter un bouton existant.
- `Snippets > Boutons` renvoie vers `Actions` pour éviter deux surfaces concurrentes.

## Cas d’usage réels

- Je veux lancer une action clavier rapide sans retaper une expression.
  - Créer un bouton de type `desktop key sequence` avec une expression de touches.
- Je veux garder mes snippets texte favoris mais déclenchés avec un clic unique.
  - Créer un bouton de type `insert text` et coller votre snippet dans la valeur.
- Je veux garder une commande de raccourci (copier/coller/media) dans une zone visuelle constante.
  - Créer un bouton de type `clipboard command` ou `media command` depuis la liste.
- Je veux réutiliser une expression clavier WinGlowz déjà connue.
  - Créer un bouton `keyboard expression` pour partager le même contrat de parsing que le clavier Android.

## Exemple : envoyer `Ctrl+W` puis `N` pour changer de fenêtre

Le scénario demandé (`Ctrl W N`) s’écrit en deux étapes dans le modèle `desktop key sequence`:

1. `Ctrl+W`
2. `N`

Le runner interprète chaque étape au format texte borné (`modifier+key` ou touche seule) et exécute la séquence uniquement si le host desktop actif la supporte.

Exemple de chaîne valide:

```text
Ctrl+W, N
```

Conseils:

- Utiliser `Ctrl`, `Alt`, `Shift`, `Meta`, `Cmd` selon la plateforme.
- Utiliser `,` (virgule) comme séparateur entre actions successives.
- Vérifier que la case d’exécution affiche une confirmation de support avant d’attendre un résultat fiable.

## Où se place le stockage et l’exécution

- Les boutons sont stockés dans le domaine `custom_action_buttons`.
- L’exécution app passe par `CustomActionButtonRunner` et un runner de livraison desktop borné.
- La synchronisation Android passe par une projection IME filtrée : texte, expression clavier WinGlowz, presse-papiers et média peuvent être envoyés au clavier; les séquences desktop et macros restent hors IME.
- En champ privé, mot de passe, OTP ou contexte sensible, l’IME supprime les actions sensibles avant rendu.

## Différence avec les actions de corners

- Les corners de clavier et la bibliothèque de boutons partagent le même but produit (accéder rapidement à des actions), mais ils sont aujourd’hui deux surfaces distinctes.
- `Bouton` ≠ `corner` :
  - un corner est configuré dans `Settings > Keyboard > Corner shortcuts`;
  - un bouton est configuré dans `Actions`.
- L’état de compatibilité par surface reste explicite : si un host ne supporte pas une action, on affiche une limite plutôt qu’un succès fictif.

## Modèles d’action supportés en V1

- `insert text`
- `keyboard expression` (langage WinGlowz)
- `desktop key sequence`
- `clipboard command`
- `media command`
- `macro` (stockage prévu, exécution dépendante du host)

## Bonnes limites à rappeler

- Aucune commande système/shell libre n’est autorisée.
- Aucune chaîne sensible n’est loguée en clair.
- Les actions non supportées sur la surface courante doivent rester non bloquantes et clairement expliquées.

## Types d’actions V1, avec exemples

### `insert text`

Insère du texte brut ou du contenu basé sur un snippet (`trigger` + `content`).

- Exemple: `Bonjour`, `Merci de patienter`, `Ctrl+W N` (copié/traité comme texte si choisi ici, pas comme séquence).

### `keyboard expression`

Expression textuelle déjà utilisée côté clavier Android (format d’expression WinGlowz).

- Utile pour partager une logique d’action entre raccourci clavier et bouton.
- Exemple: expression de type `JA:` (texte), ou commandes natives existantes.

### `desktop key sequence`

Séquence bornée de touches pour Windows/macOS/Linux desktop (hors IME).

- Exemple 1: `Ctrl+W, N`
- Exemple 2: `Ctrl+Shift+T`

### `clipboard command`

Commande intégrée de type copier/couper/coller.

- Exemple: `copy` -> copie la sélection courante via le flux de commande borné.
- Exemple: `paste` -> colle via `Ctrl+V` ou équivalent hôte.

### `media command`

Commande média courte et explicite (ex. play/pause).

- Exemple: `play_pause`

### `macro`

Action typée stockée, prête à être activée quand un hôte d’exécution dédié sera implémenté.

- Exemple: commande nommée côté backend (`macro:focus_task`) sans exécution libre non maîtrisée.
