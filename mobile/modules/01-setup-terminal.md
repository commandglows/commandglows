# Setup terminal mobile

Comment configurer Termux et un environnement de développement complet sur mobile.

## Installation Termux (Android)

1. Installer Termux depuis F-Droid (plus fiable que Play Store)
2. Mettre à jour les paquets:

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

**Note**: Termux utilise une configuration ALLÉGÉE - pas de Node.js, pas de stack web, pas d'agents IA. Tout tourne sur le serveur.

## Outils d'IA sur serveur

### Attention importante

Les outils d'IA comme **Claude, OpenCode, KiloCode, Codex, Aider** ne s'installent **pas sur Termux**. Ils tournent uniquement sur votre serveur (Hetzner, etc.).

Depuis Termux, vous vous connectez au serveur qui exécute ces outils:

```bash
# SSH vers serveur ou Mosh (mais bloqué scroll avec TUI)
ssh user@hetzner-server

# Puis sur le serveur:
opencode    # ✅ TUI fonctionnel (en SSH)
kilocode    # ✅ TUI fonctionnel (en SSH)  
codex       # ✅ TUI fonctionnel (en SSH)
claude      # Chat en ligne de commande (fonctionne partout)
aider       # Chat avec modèles (fonctionne partout)
```

### Pourquoi SSH obligatoire pour TUI

- OpenCode/KiloCode utilisent l'alternate screen pour leur interface
- Mosh ne supporte pas correctement ce mode
- **Solution**: Utilisez SSH quand vous voulez coder avec ces outils

## Configuration SSH

Générer une clé SSH:

```bash
ssh-keygen -t ed25519 -C "mobile@$(date +%Y%m%d)"
cat ~/.ssh/id_ed25519.pub  # L'ajouter sur le serveur
```

Configurer `~/.ssh/config`:

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
# Debian/Ubuntu
sudo apt install mosh

# Ouvrir les ports UDP 60000-61000
sudo ufw allow 60000:61000/udp

# Vérifier
mosh user@yourserver
```

## Optimisations mobilité

### Ce qui est installé (light)

- ✅ Neovim config MyNeovimTermux (markdown + plugins légers)
- ✅ Ranger, fzf, ripgrep, fd (navigation fichiers)
- ✅ Starship, Zoxide (shell)
- ✅ SSH, Mosh, tmux (connexion persistante)
- ✅ ShipGlows local tunnels (urls/tunnel)

### Ce qui est sauté (serveur uniquement)

- ❌ Node.js/js/ts stack
- ❌ MCP (Model Context Protocol)
- ❌ Agents IA: Claude, Codex, OpenCode, KiloCode, Aider, Copilot
- ❌ Mason, LSP lourds, Treesitter auto-installé
- ❌ Build tools lourds (gradle, flutter, etc.)

### Pourquoi cette limitation

Termux est conçu pour la **mobilité et la légèreté**. Les outils IA lourds tournent sur le serveur Hetzner, pas sur mobile.

## Aliases utiles

```bash
# ~/.bashrc
alias s='ssh dev'
alias m='mosh dev'
alias t='tmux attach -t mobile || tmux new -s mobile'
alias ll='ls -la'
alias gs='git status'
```

### Fichier hosts

Éditer `/etc/hosts` ou utiliser SSH config pour des noms courts.

### Gestion batterie

Utiliser `screen` au lieu de `tmux` pour sessions légères, ou configurer:

```bash
# ~/.tmux.conf
set -g history-limit 50000
set -g destroy-unattached off
```