---
translationKey: "termux-themes"
title: "114 th\u00e8mes Termux avec pr\u00e9visualisation : trouvez le v\u00f4tre en un clic"
description: "Parcourez et pr\u00e9visualisez les 114 th\u00e8mes de couleurs disponibles pour Termux. Faux terminal interactif, palette compl\u00e8te et copie en un clic."
contents: [
  "Pr\u00e9visualisateur interactif de 114 th\u00e8mes Termux",
  "Les th\u00e8mes les plus populaires expliqu\u00e9s",
  "Comment installer un th\u00e8me en 30 secondes"
]
author: "Diane"
authorImage: "/images/CommandGlows.png"
authorImageAlt: "Avatar de Diane"
pubDate: 2026-03-23
cardImage: "/images/CommandGlows.png"
cardImageAlt: "Pr\u00e9visualisation des th\u00e8mes Termux"
readTime: 8
tags: ["termux", "android", "terminal", "th\u00e8mes", "couleurs", "personnalisation"]
---

Changer de th\u00e8me dans Termux, c'est actuellement p\u00e9nible : appui long sur le fond, menu "Style", et une longue liste de noms... **sans aucune pr\u00e9visualisation**. Vous devez appliquer chaque th\u00e8me \u00e0 l'aveugle pour voir \u00e0 quoi il ressemble.

On a r\u00e9solu ce probl\u00e8me. Voici un pr\u00e9visualisateur interactif des **114 th\u00e8mes** du repo officiel Termux:Styling.

---

## Pr\u00e9visualisateur de th\u00e8mes

S\u00e9lectionnez un th\u00e8me dans la liste pour voir instantan\u00e9ment son rendu dans un faux terminal. Cliquez sur **"Copier colors.properties"** pour copier la configuration compl\u00e8te.

**[Ouvrir le pr\u00e9visualisateur interactif \u2192](/fr/termux-themes)**

---

## Les th\u00e8mes les plus populaires

### Nord
Palette arctique aux tons bleus froids. Tr\u00e8s agr\u00e9able pour les longues sessions de code, avec un contraste doux qui ne fatigue pas les yeux.

### Dracula
Le classique violet/rose sur fond sombre. Couleurs vives et contrast\u00e9es, id\u00e9al si vous aimez un terminal qui "pop".

### Catppuccin
D\u00e9clin\u00e9 en 4 variantes (Latte, Frapp\u00e9, Macchiato, Mocha), du plus clair au plus sombre. Couleurs pastelles et douces, tr\u00e8s tendance.

### Gruvbox
Tons chauds et r\u00e9tro avec des oranges et des jaunes. Existe en dark et light, plus 6 variantes Material avec diff\u00e9rents niveaux de contraste (hard, medium, soft).

### Tokyo Night
Inspir\u00e9 des n\u00e9ons de Tokyo. Bleus profonds et violets doux. Existe en version Dark et Day.

### Solarized
Le pionnier des th\u00e8mes de terminal, cr\u00e9\u00e9 par Ethan Schoonover. Palette scientifiquement optimis\u00e9e pour la lisibilit\u00e9. Existe en dark et light.

### Ros\u00e9 Pine
Palette \u00e9l\u00e9gante aux tons ros\u00e9s. Trois variantes : Ros\u00e9 Pine (dark), Moon (plus sombre), Dawn (light).

---

## Comment installer un th\u00e8me

### M\u00e9thode 1 : Copier-coller (30 secondes)

1. Choisissez un th\u00e8me dans le pr\u00e9visualisateur ci-dessus
2. Cliquez **"Copier colors.properties"**
3. Dans Termux, cr\u00e9ez le fichier :

```bash
mkdir -p ~/.termux
nano ~/.termux/colors.properties
# Collez le contenu copi\u00e9, puis Ctrl+X, Y, Enter
termux-reload-settings
```

### M\u00e9thode 2 : Termux:Styling (app)

1. Installez **Termux:Styling** depuis F-Droid
2. Appui long sur le terminal > "Style"
3. Choisissez un th\u00e8me (sans pr\u00e9visualisation, h\u00e9las)

### M\u00e9thode 3 : Dotfiles (recommand\u00e9)

Versionnez votre th\u00e8me dans vos dotfiles et symlinkez-le :

```bash
# Dans votre repo dotfiles
mkdir -p dotfiles/termux
# Collez votre th\u00e8me dans dotfiles/termux/colors.properties

# Symlink
ln -sf ~/dotfiles/termux/colors.properties ~/.termux/colors.properties
termux-reload-settings
```

Pour le guide complet de personnalisation (properties, polices, dotfiles), consultez notre [guide complet de personnalisation Termux](/fr/blog/termux-personnalisation/).

---

## Nos dotfiles Termux (open source)

Envie d'un setup pr\u00eat \u00e0 l'emploi ? Nos dotfiles incluent la config Termux optimis\u00e9e, Neovim, Starship, Nerd Fonts et des AI coding agents — tout install\u00e9 en une commande.

**[github.com/dianedef/dotfiles](https://github.com/dianedef/dotfiles)** — `bash dotfiles/termux.sh` et c'est parti.

Pour d\u00e9ployer vos projets sur un serveur, d\u00e9couvrez **[ShipGlows](https://github.com/dianedef/ShipGlows)** — gestion d'environnements de dev avec PM2, Caddy et HTTPS automatique.

---

## Pour aller plus loin

Ces th\u00e8mes ne sont que la partie visible. Pour ma\u00eetriser votre terminal mobile et d\u00e9cupler votre productivit\u00e9, d\u00e9couvrez notre formation compl\u00e8te : prompt Starship, Neovim, raccourcis clavier, et bien plus.
