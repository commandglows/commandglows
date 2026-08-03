---
translationKey: "termux-themes"
title: "114 Termux themes with live preview: find yours in one click"
description: "Browse and preview all 114 color themes available for Termux. Interactive terminal preview, full palette display and one-click copy."
contents: [
  "Interactive previewer for 114 Termux themes",
  "The most popular themes explained",
  "How to install a theme in 30 seconds"
]
author: "Diane"
authorImage: "/images/WinGlowz.png"
authorImageAlt: "Diane's avatar"
pubDate: 2026-03-23
cardImage: "/images/WinGlowz.png"
cardImageAlt: "Termux theme preview"
readTime: 8
tags: ["termux", "android", "terminal", "themes", "colors", "customization"]
---

Changing themes in Termux is currently painful: long press on the background, "Style" menu, and a long list of names... **with zero preview**. You have to apply each theme blindly to see what it looks like.

We solved this problem. Here's an interactive previewer for all **114 themes** from the official Termux:Styling repository.

---

## Theme Previewer

Select a theme from the list to instantly see how it renders in a simulated terminal. Click **"Copy colors.properties"** to copy the full configuration.

**[Open the interactive previewer \u2192](/termux-themes)**

---

## Most popular themes

### Nord
Arctic palette with cool blue tones. Very pleasant for long coding sessions, with soft contrast that doesn't strain the eyes.

### Dracula
The classic purple/pink on dark background. Vivid and contrasted colors, perfect if you like a terminal that pops.

### Catppuccin
Available in 4 variants (Latte, Frapp\u00e9, Macchiato, Mocha), from lightest to darkest. Soft pastel colors, very trendy.

### Gruvbox
Warm retro tones with oranges and yellows. Available in dark and light, plus 6 Material variants with different contrast levels (hard, medium, soft).

### Tokyo Night
Inspired by Tokyo neons. Deep blues and soft purples. Available in Dark and Day versions.

### Solarized
The pioneer of terminal themes, created by Ethan Schoonover. Scientifically optimized palette for readability. Available in dark and light.

### Ros\u00e9 Pine
Elegant palette with rosy tones. Three variants: Ros\u00e9 Pine (dark), Moon (darker), Dawn (light).

---

## How to install a theme

### Method 1: Copy-paste (30 seconds)

1. Choose a theme in the previewer above
2. Click **"Copy colors.properties"**
3. In Termux, create the file:

```bash
mkdir -p ~/.termux
nano ~/.termux/colors.properties
# Paste the copied content, then Ctrl+X, Y, Enter
termux-reload-settings
```

### Method 2: Termux:Styling (app)

1. Install **Termux:Styling** from F-Droid
2. Long press on terminal > "Style"
3. Choose a theme (no preview, unfortunately)

### Method 3: Dotfiles (recommended)

Version your theme in your dotfiles and symlink it:

```bash
# In your dotfiles repo
mkdir -p dotfiles/termux
# Paste your theme into dotfiles/termux/colors.properties

# Symlink
ln -sf ~/dotfiles/termux/colors.properties ~/.termux/colors.properties
termux-reload-settings
```

For the complete customization guide (properties, fonts, dotfiles), check our [complete Termux customization guide](/en/blog/termux-customization/).

---

## Our Termux dotfiles (open source)

Want a ready-to-go setup? Our dotfiles include optimized Termux config, Neovim, Starship, Nerd Fonts and AI coding agents \u2014 all installed with one command.

**[github.com/dianedef/dotfiles](https://github.com/dianedef/dotfiles)** \u2014 `bash dotfiles/termux.sh` and you're set.

For deploying projects on a server, check out **[ShipGlows](https://github.com/dianedef/ShipGlows)** \u2014 dev environment management with PM2, Caddy and automatic HTTPS.

---

## Going further

These themes are just the tip of the iceberg. To master your mobile terminal and supercharge your productivity, check out our complete training: Starship prompt, Neovim, keyboard shortcuts, and much more.
