/**
 * Internationalization (i18n) Utility Functions
 * 
 * This module provides helper functions for working with translations
 * and localized content throughout the application. It uses dynamic
 * imports to load translation files on demand, reducing initial bundle size.
 * 
 * Key concepts:
 * - Language: 'en' or 'fr' locale codes
 * - Translation: Key-value object with translated strings
 * - Routes: URL path translations (e.g., 'products' -> 'produits')
 * 
 * @module utils/i18n
 */

import type { Language, Translation } from '@/types/i18n';
import { getSiteUrl } from '@/constants';

/**
 * Extracts the current language from a URL pathname.
 * 
 * Language detection is based on the first path segment:
 * - /fr/... → 'fr'
 * - /products/... → 'en' (default for non-locale segments)
 * 
 * @param url - The URL object to extract language from
 * @returns The detected language code ('en' or 'fr')
 */
export function getLangFromUrl(url: URL): Language {
  const [, lang] = url.pathname.split('/');
  return lang === 'fr' ? 'fr' : 'en';
}

/**
 * Loads common UI translations for the specified language.
 * 
 * UI translations include shared strings used across multiple pages
 * like button labels, navigation text, and common messages.
 * 
 * @param lang - The language code to load translations for
 * @returns Promise with the UI translation object
 */
export async function useUI(lang: Language): Promise<Translation> {
  const translations = await import(`../i18n/${lang}/ui.json`);
  return translations.default;
}

/**
 * Loads page-specific translations for the specified language.
 * 
 * Each page can have its own translation file with content specific
 * to that page. Falls back to empty object if file doesn't exist.
 * 
 * @param lang - The language code to load translations for
 * @param page - The page name (matches filename without extension)
 * @returns Promise with the page translation object, or empty object on error
 */
export async function useTranslations(lang: Language, page: string): Promise<Translation> {
  try {
    const translations = await import(`../i18n/${lang}/${page}.json`);
    return translations.default;
  } catch (error) {
    console.error(`Erreur lors du chargement des traductions pour ${lang}/${page}:`, error);
    return {} as Translation;
  }
}

/**
 * Loads route translations for URL path localization.
 * 
 * Route translations map English route names to their localized equivalents:
 * e.g., { 'products': 'produits', 'about': 'a-propos' }
 * 
 * @param lang - The language code to load routes for
 * @returns Promise with route name mappings
 */
export async function useRoutes(lang: Language): Promise<Record<string, string>> {
  const routes = await import(`../i18n/${lang}/routes.json`);
  return routes.default;
}

/**
 * Generates a localized URL path from an English path.
 * 
 * Translates each path segment using the route translations for the
 * target language. Adds the locale prefix for non-English languages.
 * 
 * Examples:
 * - getLocalizedPath('fr', '/products') → '/fr/produits'
 * - getLocalizedPath('en', '/products') → '/products'
 * 
 * @param lang - Target language for the path
 * @param path - The English path to translate
 * @returns Promise with the localized path string
 */
export async function getLocalizedPath(lang: Language, path: string): Promise<string> {
  const routes = await useRoutes(lang);
  const segments = path.split('/').filter(Boolean);
  
  if (segments.length === 0) return '/';

  // Translate each path segment using route mappings
  const localizedSegments = segments.map(segment => {
    return routes[segment] || segment;
  });

  // Add /fr prefix for French, no prefix for English (default locale)
  return lang === 'en'
    ? `/${localizedSegments.join('/')}` 
    : `/fr/${localizedSegments.join('/')}`;
}

/**
 * Converts a localized path back to the default English route segments.
 *
 * Route maps are authored from English to each localized variant. Hreflang
 * generation needs the inverse when it starts on a French URL.
 */
export async function getDefaultLocalePath(lang: Language, path: string): Promise<string> {
  if (lang === 'en') return path || '/';

  const routes = await useRoutes(lang);
  const defaultRoutes = Object.fromEntries(
    Object.entries(routes).map(([defaultSegment, localizedSegment]) => [localizedSegment, defaultSegment]),
  );
  const segments = path.split('/').filter(Boolean);

  return segments.length === 0
    ? '/'
    : `/${segments.map((segment) => defaultRoutes[segment] || segment).join('/')}`;
}

/**
 * Generates alternate link tags for SEO (hreflang).
 * 
 * These links tell search engines about translated versions of the page,
 * improving international SEO and helping users find content in their
 * preferred language.
 * 
 * @param currentPath - The current page path (English version)
 * @returns Promise with array of alternate link objects for HTML head
 */
export async function getAlternateLinks(currentPath: string): Promise<Array<{href: string, hreflang: string}>> {
  const enPath = await getLocalizedPath('en', currentPath);
  const frPath = await getLocalizedPath('fr', currentPath);

  return [
    { href: getSiteUrl(enPath), hreflang: 'en' },
    { href: getSiteUrl(frPath), hreflang: 'fr' }
  ];
}

/**
 * Loads complete page metadata including translations and SEO links.
 * 
 * Combines page-specific meta translations with alternate language links
 * for comprehensive SEO metadata.
 * 
 * @param lang - Current page language
 * @param page - Page name for loading translations
 * @returns Promise with meta translations and alternate links
 */
export async function getPageMeta(lang: Language, page: string): Promise<Translation & { alternateLinks: Array<{href: string, hreflang: string}> }> {
  const meta = await useTranslations(lang, 'meta');
  return {
    ...meta,
    alternateLinks: await getAlternateLinks(page)
  };
}

/**
 * Gets the current locale from URL (alias for getLangFromUrl).
 * 
 * Provided for semantic clarity when the calling context is about
 * locales rather than languages.
 * 
 * @param url - The URL object to extract locale from
 * @returns The current locale code ('en' or 'fr')
 */
export function getCurrentLocale(url: URL): Language {
  const [, lang] = url.pathname.split('/');
  return lang === "fr" ? "fr" : "en";
} 
