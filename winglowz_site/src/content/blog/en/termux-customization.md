---
translationKey: "termux-customization"
title: "Customize Termux: the complete guide to transforming your Android terminal"
description: "Learn how to fully customize Termux: colors, themes, extra keys, fullscreen, cursor, fonts and dotfiles management. The reference guide for mobile developers."
contents: [
  "All termux.properties options explained",
  "How to change terminal colors with colors.properties",
  "Installing Nerd Fonts for icons",
  "Managing your config with dotfiles and symlinks"
]
author: "Diane"
authorImage: "/images/CommandGlows.png"
authorImageAlt: "Diane's avatar"
pubDate: 2026-03-23
cardImage: "/images/CommandGlows.png"
cardImageAlt: "Customizing Termux on Android"
readTime: 15
tags: ["termux", "android", "terminal", "customization", "productivity", "mobile development"]
---

Termux is the most powerful terminal emulator on Android. But out of the box, it looks... plain. The good news? Everything is customizable. This guide covers **every available configuration option**.

## Where is the configuration?

Termux uses two files in `~/.termux/`:

| File | Purpose |
|------|---------|
| `termux.properties` | Terminal behavior (keyboard, appearance, shortcuts) |
| `colors.properties` | Terminal colors (16-color palette + background + foreground) |
| `font.ttf` | Custom font |

After every change, apply settings:

```bash
termux-reload-settings
```

Or fully restart the Termux app.

---

## termux.properties: all options

### Appearance

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `fullscreen` | `true`/`false` | `false` | Hides Android status and navigation bars |
| `use-fullscreen-workaround` | `true`/`false` | `false` | Fixes display bugs in fullscreen mode |
| `use-black-ui` | `true`/`false` | `false` | Forces dark theme for drawer and dialogs |
| `night-mode` | `true`/`false`/`system` | `system` | Follows Android dark mode |
| `terminal-margin-horizontal` | 0\u2013100 dp | `3` | Left/right margin |
| `terminal-margin-vertical` | 0\u2013100 dp | `0` | Top/bottom margin |
| `terminal-toolbar-height` | 0.4\u20133.0 | `1.0` | Toolbar height scale |
| `terminal-cursor-style` | `block`/`underline`/`bar` | `block` | Cursor style |
| `terminal-cursor-blink-rate` | 0+ ms | `0` | Blink speed (0 = no blink) |
| `terminal-transcript-rows` | integer | auto | Scrollback buffer size |

**Example** \u2014 immersive terminal:
```properties
fullscreen = true
use-fullscreen-workaround = true
use-black-ui = true
terminal-cursor-style = underline
```

### Keyboard & Extra Keys

The **extra keys bar** is the double row above the keyboard showing ESC, CTRL, ALT, arrows, etc.

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `extra-keys` | JSON array | 2 rows | Defines which keys are shown |
| `extra-keys-style` | `default` | `default` | Key style |
| `extra-keys-text-all-caps` | `true`/`false` | `true` | Auto-capitalize key labels |
| `hide-soft-keyboard-on-startup` | `true`/`false` | `false` | Hide keyboard on start |
| `soft-keyboard-toggle-behaviour` | `show/hide`/`enable/disable` | `show/hide` | Keyboard toggle behavior |
| `enforce-char-based-input` | `true`/`false` | `false` | Force character-by-character input |
| `ctrl-space-workaround` | `true`/`false` | `false` | Fixes Ctrl+Space on some devices |

**Completely hide the bar** (if you have a physical keyboard):
```properties
extra-keys = [[]]
```

**Minimalist single row**:
```properties
extra-keys = [['ESC','/','-','HOME','UP','END','PGUP']]
```

**Custom two rows**:
```properties
extra-keys = [['ESC','|','/','-','HOME','UP','END'],['TAB','CTRL','ALT','LEFT','DOWN','RIGHT','ENTER']]
```

**Tip**: Toggle the bar anytime with **Volume Up + K**.

### Session Shortcuts

Termux sessions are like terminal tabs. Manage them via the drawer (swipe from left) or these **physical keyboard** shortcuts:

| Property | Default | Description |
|----------|---------|-------------|
| `shortcut.create-session` | `ctrl + t` | New session |
| `shortcut.next-session` | `ctrl + 2` | Next session |
| `shortcut.previous-session` | `ctrl + 1` | Previous session |
| `shortcut.rename-session` | `ctrl + n` | Rename session |
| `disable-hardware-keyboard-shortcuts` | `false` | Disable all physical keyboard shortcuts |

### Behavior

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `back-key` | `back`/`escape` | `back` | Android back button = app back or Escape key |
| `volume-keys` | `virtual`/`volume` | `virtual` | Volume keys = system volume or terminal shortcuts |
| `bell-character` | `vibrate`/`beep`/`ignore` | `vibrate` | Terminal bell behavior |
| `terminal-onclick-url-open` | `true`/`false` | `false` | Open URLs by clicking on them |
| `disable-terminal-session-change-toast` | `true`/`false` | `false` | Disable session change notification |

### System

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `allow-external-apps` | `true`/`false` | `true` | Allow Termux to launch Android apps |
| `default-working-directory` | path | `~` | Startup directory |
| `delete-tmpdir-files-older-than-x-days-on-exit` | -1 to 100000 | `3` | Auto-cleanup temp files |
| `run-termux-am-socket-server` | `true`/`false` | `true` | Android communication server |
| `disable-file-share-receiver` | `true`/`false` | `false` | Disable file share receiver |
| `disable-file-view-receiver` | `true`/`false` | `false` | Disable file view receiver |

---

## colors.properties: terminal colors

This is where it gets interesting. The `~/.termux/colors.properties` file controls **the entire color palette** of your terminal.

### How it works

Your terminal uses **16 standard ANSI colors**. When a program (git, npm, Claude Code, vim...) wants to display colored text, it uses an ANSI code referencing one of these 16 colors:

| Color | Property | Used for |
|-------|----------|----------|
| Black | `color0` / `color8` (bright) | Secondary background, muted text |
| Red | `color1` / `color9` | Errors, git deletions, failures |
| Green | `color2` / `color10` | Success, git additions, confirmations |
| Yellow | `color3` / `color11` | Warnings, modified files |
| Blue | `color4` / `color12` | Titles, directories, links |
| Magenta | `color5` / `color13` | Keywords, accents |
| Cyan | `color6` / `color14` | Info, parameters, strings |
| White | `color7` / `color15` | Primary light text |

Plus three special properties:
- **`foreground`** \u2014 default text color
- **`background`** \u2014 background color
- **`cursor`** \u2014 cursor color

### Example: Nord theme

```properties
foreground=#d8dee9
background=#2e3440
cursor=#d8dee9

color0=#3b4252
color1=#bf616a
color2=#a3be8c
color3=#ebcb8b
color4=#81a1c1
color5=#b48ead
color6=#88c0d0
color7=#e5e8f0

color8=#4c566a
color9=#bf616a
color10=#a3be8c
color11=#ebcb8b
color12=#81a1c1
color13=#b48ead
color14=#8fbcbb
color15=#eceff4
```

### Choose a theme

Browse and preview all **114 themes** in our interactive tool \u2192 [Termux Theme Previewer](/en/blog/termux-themes-preview/)

Three ways to install a theme:

1. **Manually** \u2014 paste into `~/.termux/colors.properties`
2. **Termux:Styling** \u2014 F-Droid app with built-in selector (no preview though)
3. **Dotfiles** \u2014 versioned file + symlink (recommended for developers)

---

## Custom fonts

Termux uses a single font file: `~/.termux/font.ttf`. To change it:

```bash
# Download JetBrainsMono Nerd Font (with icons)
curl -fsSL "https://github.com/ryanoasis/nerd-fonts/releases/download/v3.2.1/JetBrainsMono.zip" -o font.zip
unzip -q font.zip "JetBrainsMonoNerdFont-Regular.ttf"
cp JetBrainsMonoNerdFont-Regular.ttf ~/.termux/font.ttf
termux-reload-settings
```

**Nerd Fonts** add icons to your terminal (folders, git, languages...), essential for tools like Starship, Neovim, or Yazi.

Alternative: install **Termux:Styling** from F-Droid for a visual font picker.

---

## Managing config with dotfiles

The best approach for developers: version your Termux configuration in a dotfiles repo and symlink it.

### Recommended structure

```
dotfiles/
\u251c\u2500\u2500 termux/
\u2502   \u251c\u2500\u2500 termux.properties
\u2502   \u2514\u2500\u2500 colors.properties
\u251c\u2500\u2500 dotfiles/
\u2502   \u2514\u2500\u2500 termux.sh
\u2514\u2500\u2500 ...
```

### In your install script

```bash
mkdir -p "$HOME/.termux"
ln -sf "$HOME/dotfiles/termux/termux.properties" "$HOME/.termux/termux.properties"
ln -sf "$HOME/dotfiles/termux/colors.properties" "$HOME/.termux/colors.properties"
termux-reload-settings
```

Benefits:
- Git-versioned configuration
- Reproducible on any new device
- Shareable with your team

---

## Recommended complete configuration

Here's our optimized config for mobile development:

```properties
# ~/.termux/termux.properties

# Immersive appearance
fullscreen = true
use-fullscreen-workaround = true
use-black-ui = true
terminal-cursor-style = underline

# Hide extra keys bar (physical keyboard)
extra-keys = [[]]

# Behavior
terminal-onclick-url-open = true
disable-terminal-session-change-toast = true
back-key = escape
```

---

## Our Termux dotfiles (open source)

We use this exact configuration daily. Our dotfiles repo includes:
- Optimized `termux.properties` for mobile development
- Automatic install script with symlinks
- Neovim, Starship, Zoxide, Nerd Fonts \u2014 all preconfigured
- AI coding agents setup (LLM CLI, Shell-GPT)

**[github.com/dianedef/dotfiles](https://github.com/dianedef/dotfiles)** \u2014 clone, run `bash dotfiles/termux.sh`, done.

---

## ShipGlows \u2014 server dev environments

If you develop on a server (VPS, Codespace), ShipGlows automates everything: isolation with Flox, process management with PM2, HTTPS with Caddy, SSH tunnels and public URLs via DuckDNS.

**[github.com/dianedef/ShipGlows](https://github.com/dianedef/ShipGlows)** \u2014 an interactive CLI to deploy and manage your dev environments.

---

## 🎯 Training: Code on Mobile

Want to go further? [Module IX of the CommandGlows Training](/en/formations/module-9-mobile-coder/) teaches you how to:

- Configure Termux for optimized server access
- Understand why SSH ≠ Mosh for AI coding tools
- Use OpenCode/KiloCode from your phone
- Structure your workflow for mobility

:::note[The bonus]
The first module is free — includes ready-to-use config templates.
:::
