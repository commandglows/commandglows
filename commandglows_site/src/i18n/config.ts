/**
 * Internationalization Configuration
 * 
 * Central configuration for the application's multilingual support.
 * This file defines supported locales, default language, and route
 * translations between languages.
 * 
 * URL strategy:
 * - English (default): No prefix (e.g., /products)
 * - French: /fr prefix (e.g., /fr/produits)
 * 
 * When adding a new page, add its route translation to both 'en' and 'fr'
 * objects in the routes configuration below.
 * 
 * @module i18n/config
 */

import type { Language } from '@/types'

/** The default/fallback locale when none is detected */
export const defaultLocale = 'en'

/** All supported locale codes */
export const locales: Language[] = ['en', 'fr']

/** 
 * Whether to show the default locale in URLs.
 * When false (default), English URLs have no prefix: /products
 * When true, all locales have prefixes: /en/products, /fr/produits
 */
export const showDefaultLocale = false

/**
 * Type for route translation maps.
 * Maps English route segments to their localized equivalents.
 */
type RouteMap = {
  [key: string]: string
}

/**
 * Route translations for each supported locale.
 * 
 * Keys are the canonical route names (usually English).
 * Values are the URL-safe path segments for each language.
 * 
 * Example usage:
 * - routes.en['products'] → 'products' (used in /products)
 * - routes.fr['products'] → 'produits' (used in /fr/produits)
 */
export const routes: {
  en: RouteMap
  fr: RouteMap
} = {
  en: {
    'products': 'products',
    'about': 'about',
    'contact': 'contact',
    'blog': 'blog',
    'roadmap': 'roadmap',
    'services': 'services',
    'privacy': 'privacy',
    'terms': 'terms',
    'disclaimer': 'disclaimer',
    'copyright': 'copyright',
    'legal': 'legal',
    'landing': 'landing',
    'cgv': 'cgv',
    'signin': 'signin'
  },
  fr: {
    'products': 'produits',
    'about': 'a-propos',
    'contact': 'contact',        // Same in both languages
    'blog': 'blog',              // Same in both languages
    'roadmap': 'roadmap',        // Same in both languages
    'services': 'services',      // Same in both languages
    'privacy': 'confidentialite',
    'terms': 'cgu',
    'disclaimer': 'non-responsabilite',
    'copyright': 'droits',
    'legal': 'mentions-legales',
    'landing': 'landing',
    'cgv': 'cgv',
    'signin': 'signin'
  }
}
