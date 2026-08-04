---
title: "Setup Termux"
description: "Install Termux and create an optimized mobile terminal configuration."
sidebar:
  label: "Setup"
  order: 2
---

## Install Termux

1. Install **Termux** from **F-Droid** (more reliable than Play Store)
2. Open and update:

```bash
pkg update && pkg upgrade
```

## Essential packages

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

## SSH configuration

Generate an SSH key:

```bash
ssh-keygen -t ed25519 -C "mobile@$(date +%Y%m%d)"
cat ~/.ssh/id_ed25519.pub
```

Add the key to your server, then configure `~/.ssh/config`:

```ssh-config
Host dev
  HostName your-server.com
  User youruser
  Port 22
  ForwardAgent yes
  ServerAliveInterval 60
```

## Mosh configuration (server side)

```bash
sudo apt install mosh
sudo ufw allow 60000:61000/udp
```

## What gets installed (light)

- ✅ Neovim config (MyNeovimTermux)
- ✅ Ranger, fzf, ripgrep, fd (file navigation)
- ✅ Starship, Zoxide (shell)
- ✅ SSH, Mosh, tmux (connection)

## What's skipped (intentionally)

- ❌ Node.js/js/ts stack
- ❌ MCP (Model Context Protocol)
- ❌ AI agents: Claude, OpenCode, KiloCode, Codex, Aider
- ❌ Heavy build tools

> All AI tools run on your server, not on mobile.