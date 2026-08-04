#!/usr/bin/env node
// Script to fetch all termux-styling color schemes and generate termux-themes.ts
// Run: node fetch-termux-themes.mjs

const BASE_URL = 'https://raw.githubusercontent.com/termux/termux-styling/master/app/src/main/assets/colors/';

const THEME_FILES = [
  'argonaut', 'base16-3024-dark', 'base16-3024-light', 'base16-apathy-dark', 'base16-apathy-light',
  'base16-ashes-dark', 'base16-ashes-light', 'base16-atelierdune-dark', 'base16-atelierdune-light',
  'base16-atelierforest-dark', 'base16-atelierforest-light', 'base16-atelierheath-dark', 'base16-atelierheath-light',
  'base16-atelierlakeside-dark', 'base16-atelierlakeside-light', 'base16-atelierseaside-dark', 'base16-atelierseaside-light',
  'base16-bespin-dark', 'base16-bespin-light', 'base16-brewer-dark', 'base16-brewer-light',
  'base16-bright-dark', 'base16-bright-light', 'base16-chalk-dark', 'base16-chalk-light',
  'base16-codeschool-dark', 'base16-codeschool-light', 'base16-colors-dark', 'base16-colors-light',
  'base16-default-dark', 'base16-default-light', 'base16-eighties-dark', 'base16-eighties-light',
  'base16-embers-dark', 'base16-embers-light', 'base16-flat-dark', 'base16-flat-light',
  'base16-google-dark', 'base16-google-light', 'base16-grayscale-dark', 'base16-grayscale-light',
  'base16-greenscreen-dark', 'base16-greenscreen-light', 'base16-harmonic16-dark', 'base16-harmonic16-light',
  'base16-isotope-dark', 'base16-isotope-light', 'base16-londontube-dark', 'base16-londontube-light',
  'base16-marrakesh-dark', 'base16-marrakesh-light', 'base16-materia', 'base16-mocha-dark', 'base16-mocha-light',
  'base16-monokai-dark', 'base16-monokai-light', 'base16-ocean-dark', 'base16-ocean-light',
  'base16-one-dark', 'base16-one-light', 'base16-paraiso-dark', 'base16-paraiso-light',
  'base16-railscasts-dark', 'base16-railscasts-light', 'base16-shapeshifter-dark', 'base16-shapeshifter-light',
  'base16-snazzy', 'base16-solarized-dark', 'base16-solarized-light', 'base16-summerfruit-dark', 'base16-summerfruit-light',
  'base16-tomorrow-dark', 'base16-tomorrow-light', 'base16-twilight-dark', 'base16-twilight-light',
  'black-on-white', 'catppuccin-frappe', 'catppuccin-latte', 'catppuccin-macchiato', 'catppuccin-mocha',
  'dracula', 'e-ink', 'e-ink-color', 'gnometerm', 'gnometerm-new', 'gotham',
  'gruvbox-dark', 'gruvbox-light', 'gruvbox-material-dark-hard', 'gruvbox-material-dark-medium',
  'gruvbox-material-dark-soft', 'gruvbox-material-light-hard', 'gruvbox-material-light-medium', 'gruvbox-material-light-soft',
  'iceberg', 'material', 'nancy', 'neon', 'nord',
  'rosé-pine', 'rosé-pine-dawn', 'rosé-pine-moon',
  'rydgel', 'smyck', 'solarized-dark', 'solarized-light', 'spacemacs',
  'tokyonight-dark', 'tokyonight-day', 'tomorrow-night', 'ubuntu', 'white-on-black', 'wild-cherry', 'zenburn'
];

const POPULAR = new Set([
  'nord', 'dracula', 'catppuccin-mocha', 'catppuccin-frappe', 'catppuccin-macchiato', 'catppuccin-latte',
  'gruvbox-dark', 'gruvbox-light', 'tokyonight-dark', 'tokyonight-day',
  'solarized-dark', 'solarized-light', 'material', 'ubuntu',
  'rosé-pine', 'rosé-pine-dawn', 'rosé-pine-moon', 'iceberg'
]);

function categorize(name) {
  if (POPULAR.has(name)) return 'popular';
  if (name.startsWith('base16-')) {
    if (name.endsWith('-light')) return 'light';
    return 'dark';
  }
  const lightNames = ['black-on-white', 'catppuccin-latte', 'e-ink', 'e-ink-color',
    'gruvbox-light', 'gruvbox-material-light-hard', 'gruvbox-material-light-medium', 'gruvbox-material-light-soft',
    'solarized-light', 'tokyonight-day', 'rosé-pine-dawn', 'white-on-black'];
  // white-on-black is actually dark but the name is confusing - let's keep it dark
  if (name === 'white-on-black') return 'dark';
  if (lightNames.includes(name) || name.includes('-light')) return 'light';
  return 'dark';
}

function prettifyName(name) {
  return name
    .replace(/^base16-/, 'Base16 ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace('Rosé', 'Rosé');
}

function parseProperties(text) {
  const colors = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, value] = trimmed.split('=').map(s => s.trim());
    if (key && value) {
      colors[key] = value.toLowerCase();
    }
  }
  return colors;
}

async function fetchTheme(name) {
  const encodedName = encodeURIComponent(name);
  const url = `${BASE_URL}${encodedName}.properties`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} for ${name}`);
    const text = await res.text();
    const colors = parseProperties(text);
    return {
      id: name,
      name: prettifyName(name),
      category: categorize(name),
      colors
    };
  } catch (e) {
    console.error(`Failed: ${name} - ${e.message}`);
    return null;
  }
}

async function main() {
  console.log(`Fetching ${THEME_FILES.length} themes...`);

  // Batch fetch (10 at a time)
  const themes = [];
  for (let i = 0; i < THEME_FILES.length; i += 10) {
    const batch = THEME_FILES.slice(i, i + 10);
    const results = await Promise.all(batch.map(fetchTheme));
    themes.push(...results.filter(Boolean));
    console.log(`  ${themes.length}/${THEME_FILES.length} done`);
  }

  // Sort: popular first, then alphabetical
  themes.sort((a, b) => {
    if (a.category === 'popular' && b.category !== 'popular') return -1;
    if (b.category === 'popular' && a.category !== 'popular') return 1;
    return a.name.localeCompare(b.name);
  });

  // Generate TS
  let ts = `// Auto-generated from termux/termux-styling repo
// ${themes.length} themes extracted on ${new Date().toISOString().split('T')[0]}

export interface TermuxTheme {
  id: string
  name: string
  category: 'popular' | 'dark' | 'light'
  colors: {
    foreground: string
    background: string
    cursor: string
    color0: string
    color1: string
    color2: string
    color3: string
    color4: string
    color5: string
    color6: string
    color7: string
    color8: string
    color9: string
    color10: string
    color11: string
    color12: string
    color13: string
    color14: string
    color15: string
  }
}

export const termuxThemes: TermuxTheme[] = [\n`;

  for (const theme of themes) {
    const c = theme.colors;
    ts += `  {
    id: "${theme.id}",
    name: "${theme.name}",
    category: "${theme.category}",
    colors: {
      foreground: "${c.foreground || c.color7 || '#ffffff'}",
      background: "${c.background || c.color0 || '#000000'}",
      cursor: "${c.cursor || c.foreground || c.color7 || '#ffffff'}",
      color0: "${c.color0 || '#000000'}",
      color1: "${c.color1 || '#cc0000'}",
      color2: "${c.color2 || '#00cc00'}",
      color3: "${c.color3 || '#cccc00'}",
      color4: "${c.color4 || '#0000cc'}",
      color5: "${c.color5 || '#cc00cc'}",
      color6: "${c.color6 || '#00cccc'}",
      color7: "${c.color7 || '#cccccc'}",
      color8: "${c.color8 || '#666666'}",
      color9: "${c.color9 || '#ff0000'}",
      color10: "${c.color10 || '#00ff00'}",
      color11: "${c.color11 || '#ffff00'}",
      color12: "${c.color12 || '#0000ff'}",
      color13: "${c.color13 || '#ff00ff'}",
      color14: "${c.color14 || '#00ffff'}",
      color15: "${c.color15 || '#ffffff'}",
    },
  },\n`;
  }

  ts += `]\n`;

  const fs = await import('fs');
  fs.writeFileSync(new URL('./termux-themes.ts', import.meta.url), ts);
  console.log(`\nGenerated termux-themes.ts with ${themes.length} themes`);
}

main();
