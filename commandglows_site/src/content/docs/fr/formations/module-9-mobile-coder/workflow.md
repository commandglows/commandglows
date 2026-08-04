---
title: "Workflow mobile"
description: "Workflow complet pour coder depuis mobile avec SSH et tmux."
sidebar:
  label: "Workflow"
  order: 5
---

## Architecture tmux

```
Session mobile
├── Window 1: code
│   ├── Pane 1: nvim (édition)
│   └── Pane 2: opencode (via SSH)
├── Window 2: navigation
│   └── fzf + grep
└── Window 3: monitoring
    └── pm2 logs, system info
```

## Script de démarrage

```bash
# ~/bin/mobile-dev.sh
#!/bin/bash
tmux new-session -d -s mobile \; \
  split-window -h -t mobile \; \
  send-keys -t 0 'nvim' Enter \; \
  send-keys -t 1 'bash' Enter \; \
  attach-session -t mobile
```

## Git workflow mobile

```bash
git pull                    # Sync avant de commencer
git checkout -b feature/x   # Feature branch
git add . && git commit -m "fix: mobile"  # Commit rapide
git push -u origin feature/x
```

## Commandes essentielles

```bash
alias md='tmux attach -t mobile'    # Attach session
alias gs='git status'
alias gp='git push'
alias re='source ~/.bashrc'       # Reload shell
```

## Astuces mobilité

- `Ctrl-w z` pour zoomer (meilleure visibilité)
- Mode copy (`Ctrl-w [`) pour navigation sans souris
- Rangers pour navigation fichiers visuelle
- FZF pour recherche rapide

## Monitoring serveur

```bash
pm2 list      # Voir les processus
pm2 logs      # Logs temps réel
htop          # Monitoring (en SSH seulement!)
```

## Résumé

1. **Termux** = client terminal léger
2. **SSH** = pour coder avec les outils IA (TUI)
3. **Mosh** = pour navigation mobile (pas de TUI)
4. **tmux** = sessions persistantes
5. **Tous les outils IA tournent sur le serveur**