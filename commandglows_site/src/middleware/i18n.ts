/**
 * Internationalization (i18n) Middleware
 * 
 * Handles locale detection and URL-based routing for the multilingual site.
 * Supports English (default) and French locales, with URL prefix-based
 * locale detection (e.g., /fr/produits for French).
 * 
 * Key responsibilities:
 * - Detect current locale from URL path
 * - Set locale in Astro locals for page components
 * - Handle route translations between languages
 * - Redirect to localized versions of routes
 * 
 * URL patterns:
 * - /products → English (default locale, no prefix)
 * - /fr/produits → French (with /fr prefix and translated route)
 * 
 * @module middleware/i18n
 */

import type { MiddlewareHandler } from 'astro'
import { defaultLocale, locales, routes } from '../i18n/config'
import type { Language } from '../types'

/**
 * i18n middleware for locale detection and route translation.
 * 
 * Detection algorithm:
 * 1. Check if first URL segment is a known locale code
 * 2. If yes, use that locale; if no, use default (English)
 * 3. Store locale in locals for page components to access
 * 
 * Route handling:
 * - Checks if current path matches a translated route
 * - Redirects English routes to French equivalents when on /fr prefix
 * - Allows routes to pass through when properly matched
 */
export const i18nMiddleware: MiddlewareHandler = async ({ url, locals, redirect }, next) => {
  const pathname = url.pathname
  const typedLocals = locals as App.Locals & { lang?: Language }

  // Root path uses default locale
  if (pathname === '/') {
    typedLocals.lang = defaultLocale
    return next()
  }

  // Parse URL segments to detect locale prefix
  const segments = pathname.split('/').filter(Boolean)
  const firstSegment = segments[0]

  // Determine locale: check if first segment is a valid locale code
  let currentLang = defaultLocale as Language
  if (locales.includes(firstSegment as Language)) {
    currentLang = firstSegment as Language
  }

  // Make locale available to all page components via locals
  typedLocals.lang = currentLang

  // Handle dynamic routes with parameters (e.g., [...blog_slug].astro)
  if (segments.length > 1) {
    const routeBase = segments[1].split('_')[0] // Extract 'blog' from 'blog_slug'
    
    if (currentLang === 'fr') {
      // Check if we have a French translation for this route
      const frRoute = routes.fr[routeBase]
      if (frRoute) {
        return next()
      }
      
      // If on French prefix but using English route name, redirect to French
      if (Object.keys(routes.en).includes(routeBase)) {
        const enRoute = routeBase
        const frRoute = routes.fr[enRoute]
        if (frRoute) {
          return redirect(`/fr/${frRoute}${segments.slice(2).join('/')}`)
        }
      }
    } else {
      // For English routes, verify the route exists
      const enRoute = routes.en[routeBase]
      if (enRoute) {
        return next()
      }
    }
  }

  // Handle static routes (single segment after locale prefix)
  if (currentLang === 'fr') {
    const pathWithoutLang = '/' + segments.slice(1).join('/')
    
    // Check if current path matches a French route
    const routeExists = Object.values(routes.fr).some(fr => pathWithoutLang === `/${fr}`)
    if (routeExists) {
      return next()
    }

    // Redirect English route names to French equivalents
    const enRoute = Object.entries(routes.fr).find(([en]) => pathWithoutLang === `/${en}`)
    if (enRoute) {
      return redirect(`/fr/${enRoute[1]}`)
    }
  } else {
    // English routes (no prefix)
    const routeExists = Object.values(routes.en).some(en => pathname === `/${en}`)
    if (routeExists) {
      return next()
    }

    // Redirect French route names used without /fr prefix
    const frRoute = Object.entries(routes.fr).find(([, fr]) => pathname === `/fr/${fr}`)
    if (frRoute) {
      return redirect(`/${frRoute[0]}`)
    }
  }

  // No redirect needed, continue to page
  return next()
} 
