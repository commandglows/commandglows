---
title: "Mobile workflow"
description: "Complete workflow for coding from mobile with SSH and tmux."
sidebar:
  label: "Workflow"
  order: 5
---

## tmux architecture

```
mobile session
├── Window 1: code
│   ├── Pane 1: nvim (editing)
│   └── Pane 2: opencode (via SSH)
├── Window 2: navigation
│   └── fzf + grep
└── Window 3: monitoring
    └── pm2 logs, system info
```

## Startup script

```bash
# ~/bin/mobile-dev.sh
#!/bin/bash
tmux new-session -d -s mobile \; \
  split-window -h -t mobile \; \
  send-keys -t 0 'nvim' Enter \; \
  send-keys -t 1 'bash' Enter \; \
  attach-session -t mobile
```

## Git workflow (mobile)

```bash
git pull                    # Sync first
git checkout -b feature/x     # Feature branch
git add . && git commit -m "fix: mobile"  # Quick commit
git push -u origin feature/x
```

## Essential aliases

```bash
alias md='tmux attach -t mobile'    # Attach session
alias gs='git status'
alias gp='git push'
alias re='source ~/.bashrc'       # Reload shell
```

## Mobile tips

- `Ctrl-w z` to zoom (better visibility)
- Copy mode (`Ctrl-w [`) for scroll without mouse
- Ranger for visual file navigation
- FZF for quick file search

## Server monitoring

```bash
pm2 list      # See processes
pm2 logs      # Live logs
htop          # System monitor (SSH only!)
```

## Summary

1. **Termux** = lightweight terminal client
2. **SSH** = required for AI tools (TUI)
3. **Mosh** = for file navigation (no TUI)
4. **tmux** = persistent sessions
5. **All AI tools run on the server**