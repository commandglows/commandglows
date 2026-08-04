/**
 * CORS (Cross-Origin Resource Sharing) Middleware
 * 
 * Enables cross-origin requests to API endpoints by adding appropriate
 * CORS headers to responses. This is essential for:
 * - Frontend-backend separation in development
 * - Third-party integrations calling our API
 * - Browser-based API clients
 * 
 * Security Note: In production, Access-Control-Allow-Origin should be
 * restricted to specific trusted domains rather than using wildcards.
 * 
 * @module middleware/cors
 */

import type { MiddlewareHandler } from 'astro'

/**
 * CORS header configuration for API responses.
 * 
 * - Allow-Origin: Reflected only for configured trusted origins
 * - Allow-Methods: Standard REST methods plus OPTIONS for preflight
 * - Allow-Headers: Common headers needed for API authentication
 * - Allow-Credentials: Enables cookie-based auth across origins
 */
const DEFAULT_ALLOWED_HEADERS = 'Content-Type, Authorization, Accept'

function parseOrigin(value: string | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) {
    return null
  }

  try {
    return new URL(trimmed).origin
  } catch {
    return null
  }
}

function splitOrigins(value: string | undefined): string[] {
  return value?.split(',').map((origin) => origin.trim()).filter(Boolean) ?? []
}

function getAllowedCorsOrigins(): string[] {
  const origins = [
    import.meta.env.SITE,
    import.meta.env.PUBLIC_SITE_URL,
    ...splitOrigins(import.meta.env.SUITE_API_ALLOWED_ORIGINS),
  ]

  if (import.meta.env.DEV) {
    origins.push('http://localhost:3011', 'http://localhost:4321')
  }

  return Array.from(
    new Set(
      origins
        .map((origin) => parseOrigin(origin))
        .filter((origin): origin is string => origin != null),
    ),
  )
}

function getCorsOrigin(request: Request): string | null {
  const requestOrigin = parseOrigin(request.headers.get('Origin') ?? undefined)
  const allowedOrigins = getAllowedCorsOrigins()

  if (requestOrigin) {
    return allowedOrigins.includes(requestOrigin) ? requestOrigin : null
  }

  return allowedOrigins[0] ?? null
}

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = getCorsOrigin(request)
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': DEFAULT_ALLOWED_HEADERS,
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  }

  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin
  }

  return headers
}

/**
 * CORS middleware that handles preflight requests and adds headers to responses.
 * 
 * Preflight handling: Browsers send OPTIONS requests before certain cross-origin
 * requests (those with custom headers or methods other than GET/POST). We must
 * respond with 204 No Content and the CORS headers to allow the actual request.
 * 
 * For actual requests, we pass through to the next handler and then add CORS
 * headers to the response, ensuring cross-origin clients can read the data.
 */
export const corsMiddleware: MiddlewareHandler = async (context, next) => {
  const corsHeaders = getCorsHeaders(context.request)

  // Handle preflight OPTIONS requests immediately
  if (context.request.method === 'OPTIONS') {
    if (context.request.headers.has('Origin') && !corsHeaders['Access-Control-Allow-Origin']) {
      return new Response(null, { status: 403 })
    }

    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  // Process the actual request through remaining handlers
  const response = await next()

  // Clone response headers and add CORS headers
  const responseHeaders = new Headers(response.headers)
  Object.entries(corsHeaders).forEach(([key, value]) => {
    responseHeaders.set(key, value)
  })

  // Return new response with CORS headers added
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders
  })
}
