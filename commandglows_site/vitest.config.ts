import { defineConfig } from 'vitest/config'
import path from 'path'
import dotenv from 'dotenv'

// Charger les variables d'environnement de test
dotenv.config({ path: '.env.test' })

// Polyfill pour TextEncoder/TextDecoder
if (typeof globalThis.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util')
  globalThis.TextEncoder = TextEncoder
  globalThis.TextDecoder = TextDecoder
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 120000,   // 120 secondes pour les tests
    hookTimeout: 180000,   // 180 secondes pour les hooks
    teardownTimeout: 60000, // 60 secondes pour le teardown
    setupFiles: ['./tests/setup-server.ts'],
    include: ['./tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['./tests/auth/e2e/**/*'],
    pool: 'threads',
    sequence: {
      shuffle: false,
      concurrent: false
    },
    retry: 2,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.d.ts',
      ],
    },
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL || '',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
      PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL || '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    },
    onConsoleLog(log) {
      // Ignorer les avertissements d'Astro sur les routes dynamiques
      if (log.includes('[router]') || log.includes('dynamic SSR route')) {
        return false;
      }
      // Ignorer les statistiques invalides pendant les tests
      if (log.includes('Statistiques invalides:')) {
        return false;
      }
      return undefined;
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    },
  },
}); 
