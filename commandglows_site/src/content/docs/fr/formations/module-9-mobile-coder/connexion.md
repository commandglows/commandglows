---
title: "Connexion SSH vs Mosh"
description: "Pourquoi SSH est obligatoire pour coder avec les outils IA depuis mobile."
sidebar:
  label: "Connexion"
  order: 3
---

## Le problème du scroll

Quand tu utilises **Mosh** avec OpenCode/KiloCode depuis Termux, **le scroll ne marche pas**.

## Pourquoi ça arrive

Mosh ne supporte pas le **terminal alternate screen buffer**. Les outils IA (OpenCode, KiloCode, htop) utilisent ce buffer pour leur interface dynamique. Mosh gère mal les séquences d'échappement.

## SSH vs Mosh

| Situation | Protocole | Pourquoi |
|-----------|-----------|----------|
| Codage TUI (OpenCode/KiloCode) | **SSH** | Scroll molette fonctionnel |
| Navigation fichiers | Mosh | Tolérance réseau |
| Session longue mobile | Mosh | Pas de déconnexion |
| Débogage intensif | **SSH** | TUI complet |

## Workflow quotidien

```bash
# SSH pour coder (obligatoire pour TUI)
ssh dev

# Puis sur le serveur:
opencode    # ✅ TUI fonctionnel (en SSH)
kilocode    # ✅ TUI fonctionnel (en SSH)
claude      # Chat CLI
codex       # Chat CLI
```

## Navigation sans scroll

Si tu es en Mosh et que le scroll ne marche pas:

```bash
Ctrl-w [    # Mode copy
Ctrl-u/d    # Page up/down
q           # Quitter
```

## Aliases recommandés

```bash
# Dans ~/.bashrc Termux
alias dev='ssh -t dev "tmux attach -t mobile || tmux new -s mobile"'
alias dev-tui='ssh -t dev "opencode"'  # SSH pur pour TUI
alias m='mosh dev'  # Navigation uniquement
```