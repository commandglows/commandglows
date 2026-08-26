import type { APIRoute } from 'astro'
import { timingSafeEqual } from 'node:crypto'
import { ConvexHttpClient } from 'convex/browser'

import { verifyAuth0AccessToken } from '@/lib/auth0AccessToken'
import { getServerEnv } from '@/lib/serverEnv'
import {
  getBearerTokenFromAuthorizationHeader,
  getConvexBridgeSecret,
  resolveBridgeEnvironment,
} from '@/lib/suiteBridge'

export const prerender = false

const JSON_HEADERS = { 'Content-Type': 'application/json' }

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

function secretsMatch(received: string | null, expected: string): boolean {
  if (!received) return false
  const left = Buffer.from(received)
  const right = Buffer.from(expected)
  return left.length === right.length && timingSafeEqual(left, right)
}

export const POST: APIRoute = async ({ request }) => {
  const env = getServerEnv()
  const endpointSecret = env.CONTENTGLOWS_ENTITLEMENT_BRIDGE_SECRET?.trim()
  const convexSecret = getConvexBridgeSecret(env)
  const domain = env.CONTENTGLOWS_AUTH0_DOMAIN?.trim()
  const audience = env.CONTENTGLOWS_AUTH0_AUDIENCE?.trim()
  const convexUrl = env.PUBLIC_CONVEX_URL?.trim()

  if (!endpointSecret || !convexSecret || !domain || !audience || !convexUrl) {
    return json(503, { status: 'unavailable', error: 'bridge_not_configured' })
  }
  if (
    !secretsMatch(
      request.headers.get('x-contentglows-bridge-secret'),
      endpointSecret
    )
  ) {
    return json(401, { status: 'unauthorized', error: 'invalid_bridge_secret' })
  }

  const bearer = getBearerTokenFromAuthorizationHeader(
    request.headers.get('authorization')
  )
  if (!bearer) {
    return json(401, { status: 'unauthorized', error: 'missing_bearer_token' })
  }

  let claims
  try {
    claims = await verifyAuth0AccessToken(bearer, {
      domainOrIssuer: domain,
      audience,
    })
  } catch {
    return json(401, { status: 'unauthorized', error: 'invalid_auth0_token' })
  }

  try {
    const convex = new ConvexHttpClient(convexUrl)
    const snapshot = await convex.mutation(
      'bridge:upsertContentGlowsAuth0Identity' as never,
      {
        auth0Subject: claims.sub,
        auth0Email: claims.email,
        environment: resolveBridgeEnvironment(env.NODE_ENV),
        sourceRef: request.headers.get('x-request-id') ?? undefined,
        bridgeSecret: convexSecret,
      } as never
    )
    if (!snapshot || typeof snapshot !== 'object') {
      return json(502, { status: 'error', error: 'invalid_bridge_snapshot' })
    }
    return json(200, snapshot as Record<string, unknown>)
  } catch (error) {
    console.error('ContentGlows Auth0 bridge sync failed.', error)
    return json(502, { status: 'error', error: 'bridge_write_failed' })
  }
}
