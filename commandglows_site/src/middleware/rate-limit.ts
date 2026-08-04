/**
 * Rate Limiting Middleware
 * 
 * Protects authentication endpoints from brute force and abuse by limiting
 * the number of requests per IP address within a sliding time window.
 * 
 * Current implementation uses an in-memory Map for tracking, which works
 * for single-server deployments. For production with multiple servers,
 * consider using Redis or another distributed cache.
 * 
 * Security considerations:
 * - Only applied to /api/auth/* routes (where brute force is a concern)
 * - Uses X-Forwarded-For header for proxy/load balancer setups
 * - Returns 429 Too Many Requests with Retry-After header when limit exceeded
 * 
 * @module middleware/rate-limit
 */

import type { MiddlewareHandler } from 'astro'
import type { APIContext, MiddlewareNext } from 'astro'

/**
 * In-memory storage for rate limit tracking.
 * 
 * Maps client IP to request count and window start time.
 * Note: This resets on server restart and doesn't scale across instances.
 * For production, use Redis or a similar distributed cache.
 */
const attempts = new Map<string, { count: number; timestamp: number }>()

// Rate limit configuration
const WINDOW_MS = 15 * 60 * 1000  // 15-minute sliding window
const MAX_ATTEMPTS = 5            // Maximum attempts per window

/**
 * Extracts the client IP address from the request.
 * 
 * Checks X-Forwarded-For header first (set by proxies/load balancers),
 * then falls back to 'unknown' if not available.
 * 
 * Note: X-Forwarded-For can be spoofed. In production behind a trusted
 * proxy, ensure the proxy overwrites this header to prevent spoofing.
 * 
 * @param request - The incoming HTTP request
 * @returns The client IP address or 'unknown'
 */
function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded ? forwarded.split(',')[0] : 'unknown'
}

/**
 * Removes expired entries from the attempts map to prevent memory leaks.
 * 
 * Called on each request to clean up entries older than the window period.
 * In production with high traffic, consider running this on a timer instead.
 */
function cleanupOldAttempts() {
  const now = Date.now()
  for (const [key, data] of attempts.entries()) {
    if (now - data.timestamp > WINDOW_MS) {
      attempts.delete(key)
    }
  }
}

/**
 * Rate limiting middleware for authentication endpoints.
 * 
 * Algorithm: Sliding window counter
 * - Each IP gets a counter and timestamp for window start
 * - Counter resets when window expires
 * - Request blocked if counter exceeds MAX_ATTEMPTS
 * 
 * Response headers include rate limit info for client handling:
 * - X-RateLimit-Limit: Maximum allowed requests
 * - X-RateLimit-Remaining: Requests left in current window
 * - X-RateLimit-Reset: Unix timestamp when window resets
 */
export const onRequest: MiddlewareHandler = async (context: APIContext, next: MiddlewareNext) => {
  const { request } = context

  // Only rate limit authentication endpoints where brute force is a concern
  const isAuthRoute = request.url.includes('/api/auth/')
  if (!isAuthRoute) {
    return next()
  }

  const clientIp = getClientIp(request)
  const now = Date.now()

  // Periodic cleanup to prevent memory growth
  cleanupOldAttempts()

  // Get or initialize attempt tracking for this IP
  const attempt = attempts.get(clientIp) || { count: 0, timestamp: now }

  // Reset counter if the time window has expired
  if (now - attempt.timestamp > WINDOW_MS) {
    attempt.count = 0
    attempt.timestamp = now
  }

  // Check if rate limit exceeded
  if (attempt.count >= MAX_ATTEMPTS) {
    const timeLeft = Math.ceil((WINDOW_MS - (now - attempt.timestamp)) / 1000 / 60)
    
    return new Response(
      JSON.stringify({
        error: 'too-many-requests',
        message: `Trop de tentatives. Réessayez dans ${timeLeft} minutes.`
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(timeLeft * 60)  // Seconds until retry is allowed
        }
      }
    )
  }

  // Increment counter for this request
  attempt.count++
  attempts.set(clientIp, attempt)

  // Process the request and add rate limit headers to response
  const response = await next()
  const headers = new Headers(response.headers)
  headers.set('X-RateLimit-Limit', String(MAX_ATTEMPTS))
  headers.set('X-RateLimit-Remaining', String(MAX_ATTEMPTS - attempt.count))
  headers.set('X-RateLimit-Reset', String(Math.ceil((attempt.timestamp + WINDOW_MS) / 1000)))

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
} 