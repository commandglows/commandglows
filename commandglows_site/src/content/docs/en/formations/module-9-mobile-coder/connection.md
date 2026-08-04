---
title: "SSH vs Mosh Connection"
description: "Why SSH is required for AI coding tools on mobile."
sidebar:
  label: "Connection"
  order: 3
---

## The scroll problem

When you use **Mosh** with OpenCode/KiloCode from Termux, **scrolling doesn't work**.

## Why it happens

Mosh doesn't support the **terminal alternate screen buffer** correctly. AI tools use this buffer for their dynamic interface. Mosh mishandles the DEC/CSI escape sequences.

## SSH vs Mosh

| Situation | Protocol | Reason |
|-----------|----------|--------|
| AI coding (OpenCode/KiloCode) | **SSH** | Working scroll wheel |
| File navigation | Mosh | Network tolerance |
| Long mobile sessions | Mosh | No disconnection |
| Debugging | **SSH** | Full TUI |

## Daily workflow

```bash
# SSH for AI tools (mandatory)
ssh dev

# Then on server:
opencode    # ✅ Full TUI (SSH only)
kilocode    # ✅ Full TUI (SSH only)
claude      # Chat CLI
codex       # Chat CLI
```

## Navigation without scroll

If stuck in Mosh without scroll:

```bash
Ctrl-w [    # Enter copy mode
Ctrl-u/d    # Page up/down
q           # Exit
```

## Recommended aliases

```bash
# In ~/.bashrc
alias dev='ssh -t dev "tmux attach -t mobile || tmux new -s mobile"'
alias dev-tui='ssh -t dev "opencode"'  # Pure SSH for TUI
alias m='mosh dev'  # Navigation only
```