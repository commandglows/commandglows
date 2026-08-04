/**
 * Route Definitions and Path Generation
 * 
 * This module defines the static route mappings between English and French
 * URL paths, and provides utilities for generating localized paths and
 * Astro static paths for build-time route generation.
 * 
 * Route structure:
 * - Each route has an English and French version
 * - English uses no prefix (e.g., /products)
 * - French uses /fr prefix (e.g., /fr/produits)
 * 
 * @module utils/routing
 */

import type { Language } from '@/types'

/**
 * Type definition for bilingual route entries.
 * Each route has an English path segment and its French translation.
 */
interface RouteDefinition {
  en: string
  fr: string
}

/**
 * Master route configuration mapping route keys to localized paths.
 * 
 * Add new routes here when creating new pages. The key is used in code
 * to reference routes, while the values are the actual URL segments.
 * 
 * Note: Empty strings represent the root/home page for each locale.
 */
export const ROUTES: Record<string, RouteDefinition> = {
  index: {
    en: '',        // / (root)
    fr: ''         // /fr (French root)
  },
  products: {
    en: 'products',
    fr: 'produits'
  },
  windowsMastery: {
    en: 'windows-mastery',
    fr: 'maitrise-windows'
  },
  testimonials: {
    en: 'testimonials',
    fr: 'temoignages'
  },
  recommendations: {
    en: 'recommendations',
    fr: 'recommandations'
  },
  contact: {
    en: 'contact',
    fr: 'contact'  // Same in both languages
  },
  blog: {
    en: 'blog',
    fr: 'blog'
  },
  roadmap: {
    en: 'roadmap',
    fr: 'roadmap'
  },
  services: {
    en: 'services',
    fr: 'services'
  },
  about: {
    en: 'about',
    fr: 'a-propos'
  },
  welcome: {
    en: 'welcome-to-docs',
    fr: 'bienvenue'
  },
  disclaimer: {
    en: 'disclaimer',
    fr: 'non-responsabilite'
  },
  copyright: {
    en: 'copyright',
    fr: 'droits'
  },
  terms: {
    en: 'terms',
    fr: 'cgu'
  },
  privacy: {
    en: 'privacy',
    fr: 'confidentialite'
  },
  legal: {
    en: 'legal',
    fr: 'mentions-legales'
  },
  signin: {
    en: 'signin',
    fr: 'signin'
  }
}

/**
 * Generates static path definitions for Astro's getStaticPaths().
 * 
 * Creates path entries for both English and French versions of a route,
 * used by Astro at build time to generate static pages for each locale.
 * 
 * @param routeKey - The key from ROUTES to generate paths for
 * @returns Array of path definitions with params and props for Astro
 */
export function generateStaticPaths(routeKey: keyof typeof ROUTES) {
  const route = ROUTES[routeKey]
  return [
    {
      // English: no lang prefix in URL
      params: { lang: undefined, [routeKey]: route.en },
      props: { lang: 'en' as Language }
    },
    {
      // French: /fr prefix in URL
      params: { lang: 'fr', [routeKey]: route.fr },
      props: { lang: 'fr' as Language }
    }
  ]
}

/**
 * Generates a localized URL path for a given route and language.
 * 
 * Examples:
 * - getLocalizedPath('en', 'products') → '/products'
 * - getLocalizedPath('fr', 'products') → '/fr/produits'
 * - getLocalizedPath('en', 'index') → '/'
 * - getLocalizedPath('fr', 'index') → '/fr'
 * 
 * @param lang - Target language for the path
 * @param routeKey - The route key from ROUTES
 * @returns The fully formed localized URL path
 */
export function getLocalizedPath(lang: Language, routeKey: keyof typeof ROUTES): string {
  const route = ROUTES[routeKey]
  const prefix = lang === 'fr' ? '/fr' : ''
  const path = route[lang]
  // Handle empty paths (root routes) - avoid double slashes
  return path ? `${prefix}/${path}` : prefix || '/'
}
