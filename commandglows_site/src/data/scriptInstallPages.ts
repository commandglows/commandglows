import type { Language } from '@/types'

export interface ScriptInstallPageContent {
	slug: 'termux'
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
}

export function getScriptInstallPage(slug: ScriptPageKey, lang: Language) {
	return pages[slug][lang]
}
