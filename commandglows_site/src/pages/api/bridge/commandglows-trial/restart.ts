import type { APIRoute } from 'astro'
import { ConvexHttpClient } from 'convex/browser'
import { getServerEnv } from '@/lib/serverEnv'
import {
  getBridgeEndpointSecret,
  getConvexBridgeSecret,
} from '@/lib/suiteBridge'

export const prerender = false

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const COMMANDGLOWS_TRIAL_SECRET_HEADER = 'x-suite-bridge-secret'

type RestartTrialRequest = {
  globalUserId: string
  sourceRef?: string
  forceRestart?: boolean
}

function jsonResponse(payload: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS,
  })
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function parseRestartTrialRequest(value: unknown): RestartTrialRequest | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const body = value as Record<string, unknown>
  const globalUserId = asNonEmptyString(body.globalUserId)
  if (!globalUserId) {
    return null
  }

  const sourceRef = asNonEmptyString(body.sourceRef) ?? undefined
  return {
    globalUserId,
    sourceRef,
    forceRestart:
      typeof body.forceRestart === 'boolean'
        ? body.forceRestart
        : undefined,
  }
}

export const POST: APIRoute = async ({ request }) => {
  const env = getServerEnv()
  const endpointSecret = getBridgeEndpointSecret(env)
  const convexBridgeSecret = getConvexBridgeSecret(env)
  const convexUrl = env.PUBLIC_CONVEX_URL

  if (!endpointSecret || !convexBridgeSecret) {
    return jsonResponse(
      {
        status: 'unavailable',
        error: 'bridge_secret_not_configured',
      },
      503
    )
  }

  if (!convexUrl || convexUrl === 'https://PLACEHOLDER.convex.cloud') {
    return jsonResponse(
      {
        status: 'unavailable',
        error: 'convex_not_configured',
      },
      503
    )
  }

  const incomingSecret = request.headers.get(COMMANDGLOWS_TRIAL_SECRET_HEADER)
  if (!incomingSecret || incomingSecret !== endpointSecret) {
    return jsonResponse(
      { status: 'unauthorized', error: 'invalid_suite_bridge_secret' },
      401
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonResponse(
      { status: 'bad_request', error: 'invalid_json' },
      400
    )
  }

  const parsedBody = parseRestartTrialRequest(body)
  if (!parsedBody) {
    return jsonResponse(
      { status: 'bad_request', error: 'invalid_request_body' },
      400
    )
  }

  const convex = new ConvexHttpClient(convexUrl)
  try {
    const rawResult = await convex.mutation(
      'bridge:restartCommandGlowsTrialByGlobalUserId' as never,
      {
        globalUserId: parsedBody.globalUserId,
        bridgeSecret: convexBridgeSecret,
        sourceRef: parsedBody.sourceRef,
        forceRestart: parsedBody.forceRestart ?? true,
        environment: env.VERCEL_ENV ?? env.NODE_ENV ?? 'production',
      } as never
    )
    const snapshot =
      rawResult && typeof rawResult === 'object' ? rawResult : null
    if (!snapshot) {
      return jsonResponse(
        { status: 'error', error: 'invalid_restart_trial_response' },
        500
      )
    }

    const restartResult = snapshot as Record<string, unknown>
    return jsonResponse(
      {
        status: 'ok',
        ...restartResult,
      },
      200
    )
  } catch {
    return jsonResponse(
      { status: 'error', error: 'restart_trial_failed' },
      500
    )
  }
}
