---
title: "Éditeurs mobile"
description: "Configuration de Neovim et workflow pour l'édition depuis mobile."
sidebar:
  label: "Éditeurs"
  order: 4
---

## Neovim (recommandé)

Neovim s'installe via `pkg install neovim`. La configuration MyNeovimTermux est optimisée pour le mobile.

### Plugins mobilité

```lua
-- Touche Esc facile sur tactile
vim.keymap.set('i', ';j', '<Esc>', { noremap = true })
vim.keymap.set('i', ';k', '<Esc>', { noremap = true })
```

## Ranger (file manager)

Navigation visuelle avec raccourcis clavier:

```bash
ranger    # Alias 'r'
```

## tmux configuration

Ctrl-W comme préfixe (facile à tapoter):

```tmux
set -g prefix C-w
setw -g mode-keys vi
set -g history-limit 100000
set -g mouse on
```

## Navigation panes

```bash
Ctrl-w h/j/k/l    # Navigation panes
Ctrl-w |          # Split vertical
Ctrl-w -          # Split horizontal
Ctrl-w z          # Zoom current pane
```

## tmux session persistante

```bash
# Attach ou créer
tmux attach -t mobile || tmux new -s mobile

# Architecture conseillée
# Window 1: nvim | terminal
# Window 2: navigation (fzf/grep)
# Window 3: monitoring (logs serveur)
```