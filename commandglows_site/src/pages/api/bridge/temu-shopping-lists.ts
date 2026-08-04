import type { APIRoute } from 'astro'
import { ConvexHttpClient } from 'convex/browser'
import { getServerEnv } from '@/lib/serverEnv'
import {
  getConvexBridgeSecret,
  getTemuShoppingListsBridgeSecret,
} from '@/lib/suiteBridge'

export const prerender = false

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const TEMU_BRIDGE_SECRET_HEADER = 'x-temu-shopping-lists-suite-secret'

type TemuShoppingListsSnapshotRequest = {
  operation: 'snapshot'
  providerAccountId: string
  email?: string
  sourceRef?: string
}

function jsonResponse(payload: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS })
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function parseRequest(body: unknown): TemuShoppingListsSnapshotRequest | null {
  if (!body || typeof body !== 'object') {
    return null
  }

  const payload = body as Record<string, unknown>
  const operation = asNonEmptyString(payload.operation)
  const providerAccountId = asNonEmptyString(payload.providerAccountId)
  if (operation !== 'snapshot' || !providerAccountId) {
    return null
  }

  return {
    operation,
    providerAccountId,
    email: asNonEmptyString(payload.email) ?? undefined,
    sourceRef: asNonEmptyString(payload.sourceRef) ?? undefined,
  }
}

function mapBridgeError(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (!message) return 'bridge_operation_failed'
  if (/bridge_secret_mismatch/i.test(message)) return 'bridge_secret_mismatch'
  if (/bridge_secret_not_configured/i.test(message)) {
    return 'bridge_secret_not_configured'
  }
  if (/provider_account_id_required|invalid_payload/i.test(message)) {
    return 'invalid_payload'
  }
  return 'bridge_operation_failed'
}

export const POST: APIRoute = async ({ request }) => {
  const env = getServerEnv()
  const endpointSecret = getTemuShoppingListsBridgeSecret(env)
  const convexBridgeSecret = getConvexBridgeSecret(env)
  const convexUrl = env.PUBLIC_CONVEX_URL

  if (!endpointSecret || !convexBridgeSecret) {
    return jsonResponse(
      { status: 'unavailable', error: 'temu_bridge_not_configured' },
      503
    )
  }

  const incomingSecret = request.headers.get(TEMU_BRIDGE_SECRET_HEADER)
  if (!incomingSecret || incomingSecret !== endpointSecret) {
    return jsonResponse(
      { status: 'unauthorized', error: 'invalid_temu_bridge_secret' },
      401
    )
  }

  if (!convexUrl || convexUrl === 'https://PLACEHOLDER.convex.cloud') {
    return jsonResponse(
      { status: 'unavailable', error: 'convex_not_configured' },
      503
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ status: 'bad_request', error: 'invalid_json' }, 400)
  }

  const parsed = parseRequest(body)
  if (!parsed) {
    return jsonResponse({ status: 'bad_request', error: 'invalid_payload' }, 400)
  }

  const convex = new ConvexHttpClient(convexUrl)
  const environment = env.VERCEL_ENV ?? env.NODE_ENV ?? 'production'

  try {
    const snapshot = await convex.mutation(
      'bridge:ensureTemuShoppingListsEntitlementSnapshotByProviderAccount' as never,
      {
        providerAccountId: parsed.providerAccountId,
        email: parsed.email,
        sourceRef: parsed.sourceRef,
        environment,
        bridgeSecret: convexBridgeSecret,
      } as never
    )
    return jsonResponse({ status: 'ok', snapshot }, 200)
  } catch (error) {
    const mappedError = mapBridgeError(error)
    const status = mappedError === 'bridge_secret_mismatch' ? 401 : 400
    return jsonResponse({ status: 'error', error: mappedError }, status)
  }
}
