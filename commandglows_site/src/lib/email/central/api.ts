import { randomUUID } from 'node:crypto'
import { ConvexHttpClient } from 'convex/browser'
import { parseEmailConfig } from '../../../../convex/emailConfig'
import { getServerEnv } from '../../serverEnv'
import {
  bearer,
  deriveNonce,
  EmailHttpError,
  idempotencyKey,
  onlyKeys,
  readJson,
  secretMatches,
} from './security'

export type Mutation = (
  name: string,
  args: Record<string, unknown>
) => Promise<unknown>
export function convexMutation(
  env: Record<string, string | undefined>
): Mutation {
  const url = env.EMAIL_CONVEX_URL
  if (!url || !/^https:\/\/[a-z0-9-]+\.convex\.cloud$/.test(url))
    throw new EmailHttpError('configuration_unavailable', 503)
  const client = new ConvexHttpClient(url)
  return (name, args) => client.mutation(name as never, args as never)
}

export function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  })
}

export function publicResult(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new EmailHttpError('invalid_backend_receipt', 503)
  const names: Record<string, string> = {
    subscriptionId: 'subscription_id',
    businessId: 'business_id',
    audienceId: 'audience_id',
    recordedAt: 'recorded_at',
    messageId: 'message_id',
    draftId: 'draft_id',
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      names[key] ?? key,
      key === 'recordedAt' && typeof item === 'number'
        ? new Date(item).toISOString()
        : item,
    ])
  )
}

export function errorResponse(error: unknown) {
  const code =
    error instanceof EmailHttpError
      ? error.code
      : error &&
          typeof error === 'object' &&
          'data' in error &&
          typeof error.data === 'object' &&
          error.data &&
          'code' in error.data
        ? String(error.data.code)
        : 'service_unavailable'
  const statuses: Record<string, number> = {
    forbidden: 403,
    not_found: 404,
    invalid_input: 422,
    invalid_token: 400,
    invalid_state: 409,
    idempotency_conflict: 409,
    rate_limited: 429,
    retention_unconfigured: 503,
    configuration_unavailable: 503,
    service_unavailable: 503,
  }
  const safeCode = /^[a-z_]{1,64}$/.test(code) ? code : 'service_unavailable'
  return json(
    error instanceof EmailHttpError
      ? error.status
      : (statuses[safeCode] ?? 503),
    {
      error: {
        code: safeCode,
        message: safeCode.replaceAll('_', ' '),
        request_id: randomUUID(),
      },
    }
  )
}

const fields: Record<string, string[]> = {
  subscribe: [
    'business_id',
    'email',
    'audience_id',
    'purpose',
    'source',
    'notice_version',
    'locale',
    'consent',
    'occurred_at',
    'abuse_key',
  ],
  transactional: ['business_id', 'email', 'template_key', 'reason', 'locale'],
  broadcast_preview: [
    'business_id',
    'email',
    'audience_id',
    'purpose',
    'locale',
    'subject',
    'paragraphs',
  ],
  broadcast_approve: ['business_id', 'draft_id'],
}
const mapping: Record<string, string> = {
  business_id: 'businessId',
  audience_id: 'audienceId',
  notice_version: 'noticeVersion',
  template_key: 'templateKey',
  draft_id: 'draftId',
  abuse_key: 'abuseKey',
  occurred_at: 'occurredAt',
}

export async function handleCommand(
  request: Request,
  operation: keyof typeof fields,
  env = getServerEnv(),
  injected?: Mutation
) {
  try {
    const credential = bearer(request)
    const key = idempotencyKey(request)
    const body = await readJson(request)
    onlyKeys(body, fields[operation] ?? [])
    if (
      typeof body.business_id !== 'string' ||
      !/^[a-z0-9_-]{1,64}$/.test(body.business_id)
    )
      throw new EmailHttpError('invalid_request', 400)
    const input = Object.fromEntries(
      Object.entries(body).map(([name, value]) => [
        mapping[name] ?? name,
        value,
      ])
    )
    if (operation === 'subscribe') {
      const config = parseEmailConfig(env.EMAIL_CONTROL_CONFIG)
      const client = config.clients.find((value) => {
        const secret = env[value.credentialEnv]
        return (
          secret && secret.length >= 32 && secretMatches(credential, secret)
        )
      })
      if (
        !client?.businessIds.includes(body.business_id) ||
        !client.operations.includes('subscribe')
      )
        throw new EmailHttpError('forbidden', 403)
      if (
        typeof body.occurred_at !== 'string' ||
        !Number.isFinite(Date.parse(body.occurred_at))
      )
        throw new EmailHttpError('invalid_consent_time', 400)
      input.occurredAt = Date.parse(body.occurred_at)
      input.confirmationNonce = deriveNonce(
        env.EMAIL_TOKEN_SIGNING_KEY,
        body.business_id,
        `${client.id}:${key}`,
        'confirm'
      )
      input.unsubscribeNonce = deriveNonce(
        env.EMAIL_TOKEN_SIGNING_KEY,
        body.business_id,
        `${client.id}:${key}`,
        'unsubscribe'
      )
    }
    const result = await (injected ?? convexMutation(env))('email:command', {
      credential,
      operation,
      idempotencyKey: key,
      input,
    })
    return json(200, publicResult(result))
  } catch (error) {
    return errorResponse(error)
  }
}
