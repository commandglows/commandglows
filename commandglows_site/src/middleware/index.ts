import { clerkMiddleware } from '@clerk/astro/server';
import { initializeSiteAuth, siteProvider } from '../lib/auth/siteAuth';
import { sequence } from 'astro:middleware';
import type { APIContext, MiddlewareHandler, MiddlewareNext } from 'astro';
import { corsMiddleware } from './cors';
import { shouldBypassClerkMiddleware } from './authRouting';
import { i18nMiddleware } from './i18n';

const legacyRedirects = new Map<string, string>([
  ['/products/obsidian-plugins', '/products/flowzsuite-obsidian'],
  ['/fr/produits/obsidian-plugins', '/fr/produits/flowzsuite-obsidian'],
  ['/products/chrome-extensions', '/products/replayglowz-extension'],
  ['/fr/produits/chrome-extensions', '/fr/produits/replayglowz-extension'],
  ['/products/productivity-suite', '/products/commandglows'],
  ['/fr/produits/productivity-suite', '/fr/produits/commandglows'],
  ['/fr/blog/termux-customization', '/fr/blog/termux-personnalisation'],
  ['/fr/blog/termux-themes-preview', '/fr/blog/termux-themes'],
  ['/fr/blog/commandglows-android-keyboard', '/fr/blog/clavier-commandglows-android'],
  ['/blog/termux-personnalisation', '/blog/termux-customization'],
  ['/blog/termux-themes', '/blog/termux-themes-preview'],
  ['/blog/clavier-commandglows-android', '/blog/commandglows-android-keyboard'],
  ['/fr/blog/post-4', '/fr/blog'],
]);

function getLegacyRedirect(pathname: string): string | null {
  if (legacyRedirects.has(pathname)) {
    return legacyRedirects.get(pathname) ?? null;
  }

  const headshotMatch = pathname.match(/^\/professional-headshot-([1-5])\.png$/);
  if (headshotMatch) {
    return `/images/headshots/professional-headshot-${headshotMatch[1]}.png`;
  }

  if (pathname.startsWith('/Welcome/')) {
    return '/en/formations';
  }

  if (pathname.endsWith('.md') || pathname.endsWith('.mdx')) {
    return pathname.replace(/\.(md|mdx)$/, '');
  }

  return null;
}

const appMiddleware = async (context: APIContext, next: MiddlewareNext): Promise<Response> => {
  const url = new URL(context.request.url);
  if (context.locals.siteAuth?.().unavailable && !url.pathname.startsWith('/api/auth/') && url.pathname !== '/account/link-existing') {
    return new Response('Account verification is temporarily unavailable. Please reload this page to retry.', { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '30' } });
  }
  const legacyRedirect = getLegacyRedirect(url.pathname);

  if (legacyRedirect) {
    return context.redirect(legacyRedirect, 301);
  }

  if (url.pathname.startsWith('/api/')) {
    return corsMiddleware(context, next) as Promise<Response>;
  }

  return i18nMiddleware(context, next) as Promise<Response>;
};

const CLERK_PROTECTED_PATH_PREFIXES = [
  '/account',
  '/dashboard',
  '/purchase/success',
  '/signin',
  '/fr/signin',
  '/api/bridge',
  '/api/clerk',
  '/api/features',
  '/api/checkout',
  '/api/admin',
  '/api/auth',
];

function shouldUseClerkMiddleware(pathname: string): boolean {
  const normalizedPathname = pathname.length > 1 && pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname;

  return CLERK_PROTECTED_PATH_PREFIXES.some((basePath) =>
    normalizedPathname === basePath || normalizedPathname.startsWith(`${basePath}/`)
  );
}

let clerkAwareMiddleware: MiddlewareHandler | null = null;

function getClerkAwareMiddleware(): MiddlewareHandler {
  clerkAwareMiddleware ??= sequence(
    clerkMiddleware(),
    async (context, next) => {
      await initializeSiteAuth(context);
      return appMiddleware(context, next);
    },
  );

  return clerkAwareMiddleware;
}

const authenticateRequest = async (context: APIContext, next: MiddlewareNext): Promise<Response> => {
  context.locals.siteAuth = () => ({ userId: null, provider: siteProvider() });
  const url = new URL(context.request.url);

  if (shouldBypassClerkMiddleware(url.pathname)) {
    return appMiddleware(context, next);
  }

  if (!shouldUseClerkMiddleware(url.pathname)) {
    return appMiddleware(context, next);
  }

  if (siteProvider() === 'auth0' && !['/api/auth/link', '/account/link-existing'].includes(url.pathname.replace(/\/$/, ''))) {
    await initializeSiteAuth(context);
    return appMiddleware(context, next);
  }
  const response = await getClerkAwareMiddleware()(context, next);
  if (!response) throw new Error('auth_response_missing');
  return response;
};

export const onRequest: MiddlewareHandler = async (context, next) => {
  try {
    const response = await authenticateRequest(context, next)
    if (shouldUseClerkMiddleware(context.url.pathname)) {
      const headers = new Headers(response.headers)
      headers.set('Cache-Control', 'no-store')
      const vary = headers.get('Vary')
      headers.set('Vary', vary ? `${vary}, Cookie` : 'Cookie')
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
    }
    return response
  } catch {
    return new Response('Authentication is temporarily unavailable. Please retry.', { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '30' } })
  }
};
