---
title: "Editors on mobile"
description: "Neovim and tmux configuration for mobile development."
sidebar:
  label: "Editors"
  order: 4
---

## Neovim (recommended)

Neovim installs via `pkg install neovim`. MyNeovimTermux config is optimized for mobile.

### Mobile-friendly settings

```lua
-- Easy Escape key on touchscreen
vim.keymap.set('i', ';j', '<Esc>', { noremap = true })
vim.keymap.set('i', ';k', '<Esc>', { noremap = true })
```

## Ranger (file manager)

Visual file navigation with keyboard shortcuts:

```bash
ranger    # Alias 'r'
```

## tmux configuration

Ctrl-W as prefix (easy to tap):

```tmux
set -g prefix C-w
setw -g mode-keys vi
set -g history-limit 100000
set -g mouse on
```

## Pane navigation

```bash
Ctrl-w h/j/k/l    # Move between panes
Ctrl-w |          # Split vertical
Ctrl-w -          # Split horizontal
Ctrl-w z          # Zoom current pane
```

## Persistent tmux session

```bash
# Attach or create
tmux attach -t mobile 2>/dev/null || tmux new -s mobile

# Recommended layout:
# Window 1: nvim | opencode
# Window 2: fzf/grep
# Window 3: pm2 logs, server monitoring
```