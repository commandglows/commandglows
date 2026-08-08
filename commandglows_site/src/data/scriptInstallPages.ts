import type { Language } from '@/types'

export interface ScriptInstallPageContent {
	slug: 'termux' | 'dotfiles' | 'shipglows'
	name: string
	kicker: string
	title: string
	description: string
	command: string
	rawScriptUrl: string
	githubUrl: string
	githubLabel: string
	accent: 'cyan' | 'magenta' | 'green'
	visualLabel: string
	terminalLines: string[]
	fitTitle: string
	fit: string[]
	installedTitle: string
	installed: string[]
	excludedTitle: string
	excluded: string[]
	linksTitle: string
	links: Array<{ label: string; href: string }>
	copyLabel: string
	copiedLabel: string
	rawScriptLabel: string
	installNote: string
	installVariants?: InstallVariant[]
}

export interface InstallVariant {
	id: string
	platform: 'unix' | 'windows' | 'termux'
	mode: 'local' | 'full'
	command: string
	note: string
	available: boolean
}

type ScriptPageKey = ScriptInstallPageContent['slug']

const pages: Record<ScriptPageKey, Record<Language, ScriptInstallPageContent>> = {
	termux: {
		en: {
			slug: 'termux',
			name: 'Termux Script',
			kicker: 'Android terminal setup',
			title: 'A light Termux setup for Markdown, notes, and quick edits.',
			description:
				'Install the mobile dotfiles profile without cloning the repository. It keeps Termux focused on text work: Neovim for Markdown, Nerd Font icons, shell helpers, Mosh, tmux, Ranger, and local tunnel commands.',
			command: 'curl -fsSL https://www.commandglows.com/termux-script | sh',
			rawScriptUrl: '/termux-script',
			githubUrl: 'https://github.com/dianedef/dotfiles',
			githubLabel: 'Dotfiles repository',
			accent: 'cyan',
			visualLabel: 'mobile profile',
			terminalLines: [
				'Préparation de l’installation Termux...',
				'1/6 Installation des paquets Termux',
				'4/6 Installation des tunnels ShipGlows',
				'Installation Termux terminée.',
			],
			fitTitle: 'Best for',
			fit: ['Markdown files on Android', 'quick terminal edits', 'SSH sessions that need Mosh', 'a readable mobile Neovim profile'],
			installedTitle: 'Installed',
			installed: ['MyNeovimTermux', 'JetBrainsMono Nerd Font', 'Starship, Zoxide, Ranger', 'Mosh, tmux, ShipGlows local tunnels', 'termux-theme with the thermux command'],
			excludedTitle: 'Intentionally skipped',
			excluded: ['Node.js and web development stack', 'MCP and AI agents', 'Copilot, Claude, Codex, OpenCode', 'heavy LSP and auto-build tooling'],
			linksTitle: 'Useful links',
			links: [
				{ label: 'Termux theme previewer', href: '/termux-themes' },
				{ label: 'Termux customization guide', href: '/blog/termux-customization' },
			],
			copyLabel: 'Copy command',
			copiedLabel: 'Copied',
			rawScriptLabel: 'Open raw script',
			installNote: 'Run from inside Termux. After installation, close Termux fully and reopen it so the font and terminal properties reload.',
		},
		fr: {
			slug: 'termux',
			name: 'Script Termux',
			kicker: 'Configuration terminal Android',
			title: 'Une config Termux légère pour le Markdown, les notes et les petites éditions.',
			description:
				'Installe le profil mobile des dotfiles sans cloner le dépôt. Termux reste concentré sur le texte: Neovim pour Markdown, icônes Nerd Font, helpers shell, Mosh, tmux, Ranger et tunnels locaux.',
			command: 'curl -fsSL https://www.commandglows.com/termux-script | sh',
			rawScriptUrl: '/termux-script',
			githubUrl: 'https://github.com/dianedef/dotfiles',
			githubLabel: 'Dépôt dotfiles',
			accent: 'cyan',
			visualLabel: 'profil mobile',
			terminalLines: [
				'Préparation de l’installation Termux...',
				'1/6 Installation des paquets Termux',
				'4/6 Installation des tunnels ShipGlows',
				'Installation Termux terminée.',
			],
			fitTitle: 'Idéal pour',
			fit: ['fichiers Markdown sur Android', 'petites éditions dans le terminal', 'sessions SSH avec Mosh', 'profil Neovim lisible sur mobile'],
			installedTitle: 'Installé',
			installed: ['MyNeovimTermux', 'JetBrainsMono Nerd Font', 'Starship, Zoxide, Ranger', 'Mosh, tmux, tunnels locaux ShipGlows', 'termux-theme avec la commande thermux'],
			excludedTitle: 'Exclu volontairement',
			excluded: ['Node.js et stack web', 'MCP et agents IA', 'Copilot, Claude, Codex, OpenCode', 'LSP lourds et tooling de build automatique'],
			linksTitle: 'Liens utiles',
			links: [
				{ label: 'Prévisualisateur de thèmes Termux', href: '/fr/termux-themes' },
				{ label: 'Guide de personnalisation Termux', href: '/fr/blog/termux-personnalisation' },
			],
			copyLabel: 'Copier la commande',
			copiedLabel: 'Copié',
			rawScriptLabel: 'Ouvrir le script brut',
			installNote: 'À lancer dans Termux. Après installation, fermez complètement Termux puis rouvrez-le pour recharger la police et les propriétés du terminal.',
		},
	},
	dotfiles: {
		en: {
			slug: 'dotfiles',
			name: 'Dotfiles Script',
			kicker: 'Personal workstation setup',
			title: 'Install the dotfiles profile without cloning first.',
			description:
				'Bootstrap the main dotfiles repository, update it safely, and run the real installer. It targets the current user profile: editor config, shell helpers, terminal tooling, and user-local binaries when system rights are limited.',
			command: 'curl -fsSL https://www.commandglows.com/dotfiles-script | sh',
			rawScriptUrl: '/dotfiles-script',
			githubUrl: 'https://github.com/dianedef/dotfiles',
			githubLabel: 'Dotfiles repository',
			accent: 'magenta',
			visualLabel: 'user profile',
			terminalLines: [
				'Préparation de l’installation dotfiles...',
				'Mise à jour du dépôt dotfiles...',
				'Starting dotfiles installation...',
				'User-local paths configured',
			],
			fitTitle: 'Best for',
			fit: ['Linux workstations', 'Codespaces-style environments', 'user-level shell and editor setup', 'reproducible dotfiles updates'],
			installedTitle: 'Installed by the profile',
			installed: ['Neovim configuration', 'Starship, Zoxide, FZF, Ranger', 'shell aliases and PATH setup', 'optional user-local CLI tools', 'config symlinks with backups'],
			excludedTitle: 'Boundary',
			excluded: ['ShipGlows system setup still uses its own root installer', 'system services are not silently enabled from user mode', 'private secrets are not created by the bootstrap'],
			linksTitle: 'Useful links',
			links: [
				{ label: 'Termux mobile profile', href: '/termux' },
				{ label: 'ShipGlows installer', href: '/shipglows' },
			],
			copyLabel: 'Copy command',
			copiedLabel: 'Copied',
			rawScriptLabel: 'Open raw script',
			installNote: 'The bootstrap clones or updates ~/dotfiles, stashes local dirty changes before updating, then runs dotfiles/install.sh.',
		},
		fr: {
			slug: 'dotfiles',
			name: 'Script Dotfiles',
			kicker: 'Configuration poste utilisateur',
			title: 'Installe les dotfiles sans commencer par cloner le dépôt.',
			description:
				'Bootstrappe le dépôt dotfiles principal, le met à jour proprement, puis lance le vrai installateur. La cible reste le profil utilisateur: config éditeur, helpers shell, outils terminal et binaires user-local quand les droits système sont limités.',
			command: 'curl -fsSL https://www.commandglows.com/dotfiles-script | sh',
			rawScriptUrl: '/dotfiles-script',
			githubUrl: 'https://github.com/dianedef/dotfiles',
			githubLabel: 'Dépôt dotfiles',
			accent: 'magenta',
			visualLabel: 'profil utilisateur',
			terminalLines: [
				'Préparation de l’installation dotfiles...',
				'Mise à jour du dépôt dotfiles...',
				'Starting dotfiles installation...',
				'User-local paths configured',
			],
			fitTitle: 'Idéal pour',
			fit: ['postes Linux', 'environnements type Codespaces', 'configuration shell et éditeur utilisateur', 'mise à jour reproductible des dotfiles'],
			installedTitle: 'Installé par le profil',
			installed: ['configuration Neovim', 'Starship, Zoxide, FZF, Ranger', 'alias shell et PATH', 'CLI optionnelles en user-local', 'symlinks de config avec sauvegardes'],
			excludedTitle: 'Limite claire',
			excluded: ['ShipGlows garde son installateur système root séparé', 'les services système ne sont pas activés silencieusement en mode utilisateur', 'les secrets privés ne sont pas créés par le bootstrap'],
			linksTitle: 'Liens utiles',
			links: [
				{ label: 'Profil mobile Termux', href: '/fr/termux' },
				{ label: 'Installateur ShipGlows', href: '/fr/shipglows' },
			],
			copyLabel: 'Copier la commande',
			copiedLabel: 'Copié',
			rawScriptLabel: 'Ouvrir le script brut',
			installNote: 'Le bootstrap clone ou met à jour ~/dotfiles, stash les changements locaux avant update, puis lance dotfiles/install.sh.',
		},
	},
	shipglows: {
		en: {
			slug: 'shipglows',
			name: 'ShipGlows Script',
			kicker: 'Local or server agent workflow setup',
			title: 'Install the right ShipGlows layer for this machine.',
			description:
				'The bootstrap detects Termux and root automatically, or asks whether you want the local tunnel setup or the complete Ubuntu server layer. Native Windows downloads the public repository and supports both the local tunnel and a full Astro/Python/Flutter DevServer without WSL. Full Windows setup prepares Git, GitHub CLI, Node LTS, pnpm and uv; Flutter Web remains an optional larger download.',
			command: 'curl -fsSL https://www.commandglows.com/shipglows-script | sh',
			rawScriptUrl: '/shipglows-script',
			githubUrl: 'https://github.com/commandglows/shipglows',
			githubLabel: 'ShipGlows repository',
			accent: 'green',
			visualLabel: 'local or full',
			terminalLines: [
				'Préparation de l’installation ShipGlows...',
				'Mode d’installation: local | full',
				'Téléchargement de ShipGlows...',
				'Lancement de l’installateur adapté',
			],
			fitTitle: 'Best for',
			fit: ['Android Termux and local tunnel clients', 'Ubuntu servers that run active projects', 'AI-assisted product work', 'fresh-agent handoffs'],
			installedTitle: 'Installed',
			installed: ['local mode: tunnel and remote-login commands', 'full mode: ShipGlows CLI, server tooling and wrappers', 'Claude/Codex skill symlinks when selected', 'local project tracking data'],
			excludedTitle: 'Important boundary',
				excluded: ['the Windows path may request UAC permission to add OpenSSH Client', 'Windows full is a local development runtime, not public hosting', 'the bootstrap never asks for or stores a GitHub token'],
			linksTitle: 'Useful links',
			links: [
				{ label: 'ShipGlows public docs', href: 'https://github.com/commandglows/shipglows' },
				{ label: 'Dotfiles installer', href: '/dotfiles' },
			],
			copyLabel: 'Copy command',
			copiedLabel: 'Copied',
			rawScriptLabel: 'Open raw script',
			installNote: 'Run the copied command without sudo. Termux selects local mode and uses pkg without sudo, root selects full mode, and other interactive shells ask. On Debian/Ubuntu local mode, a one-time sudo confirmation may be requested only when Linux system prerequisites are missing; no sudo is used when they are already present. A non-interactive local run with missing prerequisites stops before cloning and prints the exact install commands. On native Windows without WSL, the copied command asks whether you want SSH tunnels or the recommended local DevServer before downloading files. Windows may show a UAC confirmation. For automation, pass -InstallMode local or -InstallMode full to PowerShell.',
			installVariants: [
				{
					id: 'unix-local',
					platform: 'unix',
					mode: 'local',
					command: 'curl -fsSL https://www.commandglows.com/shipglows-script | SHIPGLOWS_INSTALL_MODE=local sh',
					note: 'Unix local: the copied command stays sudo-free; on Debian/Ubuntu, explicit sudo consent is requested only when required system packages are missing.',
					available: true,
				},
				{
					id: 'unix-full',
					platform: 'unix',
					mode: 'full',
					command: 'curl -fsSL https://www.commandglows.com/shipglows-script | sudo env SHIPGLOWS_INSTALL_MODE=full sh',
					note: 'Unix full: installe la couche serveur complète sur Ubuntu avec les privilèges root.',
					available: true,
				},
				{
					id: 'windows-local',
					platform: 'windows',
					mode: 'local',
					command: "$installer = Join-Path $env:TEMP 'shipglows-install.ps1'\ncurl.exe -fsSL 'https://www.commandglows.com/shipglows-script?format=powershell' -o $installer\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer",
					note: 'Windows: the installer asks whether you want SSH tunnels or the recommended local DevServer. A UAC confirmation may appear.',
					available: true,
				},
				{
					id: 'windows-full',
					platform: 'windows',
					mode: 'full',
					command: "$installer = Join-Path $env:TEMP 'shipglows-install.ps1'\ncurl.exe -fsSL 'https://www.commandglows.com/shipglows-script?format=powershell' -o $installer\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer",
					note: 'Windows: choose Local DevServer at the prompt to clone and run projects without WSL or an automatic tunnel. It prepares Git, GitHub CLI, Node LTS, pnpm and uv, then asks before downloading Flutter Web.',
					available: true,
				},
				{
					id: 'termux-local',
					platform: 'termux',
					mode: 'local',
					command: 'curl -fsSL https://www.commandglows.com/shipglows-script | SHIPGLOWS_INSTALL_MODE=local sh',
					note: 'Termux local: utilise le home Android courant et n’appelle jamais sudo.',
					available: true,
				},
				{
					id: 'termux-full',
					platform: 'termux',
					mode: 'full',
					command: '',
					note: 'Termux ne supporte pas le mode full/remote. Utilise le mode local.',
					available: false,
				},
			],
		},
		fr: {
			slug: 'shipglows',
			name: 'Script ShipGlows',
			kicker: 'Setup local ou serveur pour workflows agents',
			title: 'Installe la bonne couche ShipGlows pour cette machine.',
			description:
				'Le bootstrap détecte automatiquement Termux et root, ou demande si tu veux la configuration locale des tunnels ou la couche serveur Ubuntu complète. Sur Windows, il télécharge le dépôt public sans Git et propose un DevServer Astro/Python/Flutter sans WSL. Le mode complet prépare Git, GitHub CLI, Node LTS, pnpm et uv ; Flutter Web reste un téléchargement optionnel plus lourd.',
			command: 'curl -fsSL https://www.commandglows.com/shipglows-script | sh',
			rawScriptUrl: '/shipglows-script',
			githubUrl: 'https://github.com/commandglows/shipglows',
			githubLabel: 'Dépôt ShipGlows',
			accent: 'green',
			visualLabel: 'local ou complet',
			terminalLines: [
				'Préparation de l’installation ShipGlows...',
				'Mode d’installation: local | full',
				'Téléchargement de ShipGlows...',
				'Lancement de l’installateur adapté',
			],
			fitTitle: 'Idéal pour',
			fit: ['Android Termux et clients de tunnels locaux', 'serveurs Ubuntu qui font tourner des projets actifs', 'travail produit assisté par IA', 'handoffs vers agents frais'],
			installedTitle: 'Installé',
			installed: ['mode local: tunnels et commandes de login distant', 'mode complet: CLI ShipGlows, outillage serveur et wrappers', 'symlinks de skills Claude/Codex si sélectionnés', 'tracking local des projets'],
			excludedTitle: 'Limite importante',
			excluded: ['le parcours Windows peut demander une confirmation UAC pour ajouter OpenSSH Client', 'le mode complet demande toujours root sur un serveur supporté', 'le bootstrap ne demande et ne stocke aucun token GitHub'],
			linksTitle: 'Liens utiles',
			links: [
				{ label: 'Docs publiques ShipGlows', href: 'https://github.com/commandglows/shipglows' },
				{ label: 'Installateur dotfiles', href: '/fr/dotfiles' },
			],
			copyLabel: 'Copier la commande',
			copiedLabel: 'Copié',
			rawScriptLabel: 'Ouvrir le script brut',
			installNote: 'Lance la commande copiée sans sudo. Termux choisit le mode local et utilise pkg sans sudo, root choisit le mode complet, et les autres shells interactifs demandent. En mode local sur Debian/Ubuntu, une confirmation sudo unique peut être demandée uniquement si des prérequis système Linux manquent ; aucun sudo n’est utilisé s’ils sont déjà présents. Une exécution locale non interactive avec des prérequis manquants s’arrête avant le clonage et affiche les commandes d’installation exactes. Sur Windows natif sans WSL, la commande copiée demande si vous voulez les tunnels SSH ou le DevServer local recommandé avant de télécharger les fichiers. Windows peut afficher une confirmation UAC. En automatisation, passez -InstallMode local ou -InstallMode full à PowerShell.',
			installVariants: [
				{
					id: 'unix-local',
					platform: 'unix',
					mode: 'local',
					command: 'curl -fsSL https://www.commandglows.com/shipglows-script | SHIPGLOWS_INSTALL_MODE=local sh',
					note: 'Unix local : la commande copiée reste sans sudo ; sur Debian/Ubuntu, un consentement sudo explicite est demandé uniquement si des paquets système requis manquent.',
					available: true,
				},
				{
					id: 'unix-full',
					platform: 'unix',
					mode: 'full',
					command: 'curl -fsSL https://www.commandglows.com/shipglows-script | sudo env SHIPGLOWS_INSTALL_MODE=full sh',
					note: 'Unix full : installe la couche serveur complète sur Ubuntu avec les privilèges root.',
					available: true,
				},
				{
					id: 'windows-local',
					platform: 'windows',
					mode: 'local',
					command: "$installer = Join-Path $env:TEMP 'shipglows-install.ps1'\ncurl.exe -fsSL 'https://www.commandglows.com/shipglows-script?format=powershell' -o $installer\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer",
					note: 'Windows : l’installateur demande si vous voulez les tunnels SSH ou le DevServer local recommandé. Une confirmation UAC peut apparaître.',
					available: true,
				},
				{
					id: 'windows-full',
					platform: 'windows',
					mode: 'full',
					command: "$installer = Join-Path $env:TEMP 'shipglows-install.ps1'\ncurl.exe -fsSL 'https://www.commandglows.com/shipglows-script?format=powershell' -o $installer\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer",
					note: 'Windows : choisissez DevServer local à l’invite pour cloner et lancer des projets sans WSL ni tunnel automatique. Il prépare Git, GitHub CLI, Node LTS, pnpm et uv, puis demande avant de télécharger Flutter Web.',
					available: true,
				},
				{
					id: 'termux-local',
					platform: 'termux',
					mode: 'local',
					command: 'curl -fsSL https://www.commandglows.com/shipglows-script | SHIPGLOWS_INSTALL_MODE=local sh',
					note: 'Termux local : utilise le home Android courant et n’appelle jamais sudo.',
					available: true,
				},
				{
					id: 'termux-full',
					platform: 'termux',
					mode: 'full',
					command: '',
					note: 'Termux ne supporte pas le mode full/remote. Utilise le mode local.',
					available: false,
				},
			],
		},
	},
}

export function getScriptInstallPage(slug: ScriptPageKey, lang: Language) {
	return pages[slug][lang]
}
