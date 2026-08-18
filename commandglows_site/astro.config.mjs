import { defineConfig } from "astro/config";
import mdx from '@astrojs/mdx';
import sitemap from "@astrojs/sitemap";
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import clerk from '@clerk/astro';
import icon from "astro-icon";
import { fileURLToPath } from 'url';
import path from 'path';
import remarkDirective from 'remark-directive';
import { remarkDocAsides } from './src/utils/remark-doc-asides.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  site: "https://www.commandglows.com",
  output: "server",
  adapter: vercel({
    webAnalytics: {
      enabled: true,
    },
    functionPerRoute: false,
    edgeMiddleware: false
  }),
  server: {
    host: true,
    port: parseInt(process.env.PORT) || 3011
  },
  build: {
    inlineStylesheets: "auto"
  },
  legacy: {
    collectionsBackwardsCompat: true
  },
  markdown: {
    remarkPlugins: [remarkDirective, remarkDocAsides],
  },
  vite: {
    resolve: {
      alias: {
        '~': path.resolve(__dirname, './src'),
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@layouts': path.resolve(__dirname, './src/layouts'),
        '@lib': path.resolve(__dirname, './src/lib'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@styles': path.resolve(__dirname, './src/assets/styles'),
        '@scripts': path.resolve(__dirname, './src/assets/scripts'),
        '@assets': path.resolve(__dirname, './src/assets'),
        '@images': path.resolve(__dirname, './src/assets/images'),
        'nanoid/non-secure': 'nanoid/non-secure/index.js'
      },
      dedupe: ['react', 'react-dom'],
    },
    cacheDir: '.vite'
  },
  cacheDir: '.astro',
  integrations: [
    mdx(),
    icon({
      include: {
        heroicons: ["*"],
        "phosphor-icons": ["*"]
      }
    }),
    sitemap({
      filter: (page) => {
        const pathname = new URL(page).pathname
        const excludedPaths = new Set([
          '/shipglows',
          '/fr/shipglows',
          '/dotfiles',
          '/fr/dotfiles',
          '/shipglowz',
          '/fr/shipglowz',
        ])
        return !excludedPaths.has(pathname)
          && !/^(?:\/(?:account|admin|dashboard|purchase|signin))(?:\/|$)/.test(pathname)
      },
      i18n: {
        defaultLocale: "en",
        locales: {
          en: "en",
          fr: "fr"
        }
      }
    }),
    react({
      include: ['**/components/react/**', '**/components/ui/**', '**/components/admin/**'],
    }),
    clerk(),
  ],
});
