---
title: "Code on Mobile — Introduction"
description: "Develop from your phone with Termux, SSH, and Mosh: setup, server connection, and workflow to code with AI tools from anywhere."
sidebar:
  label: "Introduction"
  order: 1
---

Working from a phone isn't just a backup solution. It's a **discreet productivity** system that lets you progress from anywhere without a bag or laptop.

> When you have only a touchscreen, you become clearer, more concise, more direct.

## The real topic

This module shows you how to:
- Configure Termux for optimized server access
- Understand why SSH ≠ Mosh for AI coding tools
- Use OpenCode/KiloCode from your phone
- Structure your workflow for mobility

## Architecture

```
[Your phone]           [Your Hetzner server]
┌─────────────────┐        ┌──────────────────────┐
│  Termux (app)   │        │  Linux Server        │
│                 │        │                      │
│  ┌───────────┐  │   SSH  │  ┌────────────────┐  │
│  │ Terminal  │─────────→│  │ SSH daemon     │  │
│  └───────────┘  │        │  └────────────────┘  │
│                 │        │          │           │
│  ┌───────────┐  │   Mosh │  ┌────────────────┐  │
│  │   Mosh    │─────────→│  │ Mosh daemon    │  │
│  └───────────┘  │        │  └────────────────┘  │
└─────────────────┘        └──────────────────────┘
```

## What's installed where

- **Termux**: lightweight terminal client
- **SSH/Mosh**: tunnels to your server
- **Server**: runs `opencode`, `kilocode`, `claude`, `nvim`, `tmux`

## Module outline

1. Termux setup (lightweight configuration)
2. SSH vs Mosh (the alternate screen problem)
3. Editors (Neovim, Ranger)
4. Workflow (tmux sessions, git, AI tools)

---

:::note[What you'll get]
- Configuration templates ready to use
- SSH/Mosh troubleshooting guide
- Mobile-optimized tmux workflow
- Real-world use cases from 6 months of mobile coding
:::