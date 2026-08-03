---
title: "Setup Termux"
description: "Installation et configuration de Termux pour un terminal mobile efficace."
sidebar:
  label: "Setup"
  order: 2
---

## Installation Termux

1. Installer **Termux** depuis **F-Droid** (pas Play Store)
2. Ouvrir et mettre à jour:

```bash
pkg update && pkg upgrade
```

## Packages essentiels

```bash
pkg install \
  openssh \
  git \
  tmux \
  neovim \
  ripgrep \
  fd \
  fzf \
  ranger \
  starship \
  zoxide \
  mosh
```

## Configuration SSH

Générer une clé SSH:

```bash
ssh-keygen -t ed25519 -C "mobile@$(date +%Y%m%d)"
cat ~/.ssh/id_ed25519.pub
```

Ajouter la clé sur ton serveur, puis configurer `~/.ssh/config`:

```ssh-config
Host dev
  HostName your-server.com
  User youruser
  Port 22
  ForwardAgent yes
  ServerAliveInterval 60
```

## Configuration Mosh

Sur le serveur, installer Mosh:

```bash
sudo apt install mosh
sudo ufw allow 60000:61000/udp
```

## Ce qui est installé (light)

- ✅ Neovim config (config MyNeovimTermux)
- ✅ Ranger, fzf, ripgrep, fd (navigation)
- ✅ Starship, Zoxide (shell)
- ✅ SSH, Mosh, tmux (connexion)
- ✅ ShipGlows local tunnels

## Ce qui est sauté (important)

- ❌ Node.js/js/ts stack
- ❌ MCP (Model Context Protocol)
- ❌ Agents IA: Claude, OpenCode, KiloCode, Codex, Aider
- ❌ Build tools lourds

> Tous les outils IA tournent sur ton serveur, pas sur mobile.