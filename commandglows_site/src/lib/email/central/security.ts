import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

export class EmailHttpError extends Error {
  constructor(
    public code: string,
    public status: number
  ) {
    super(code)
  }
}

export function secretMatches(value: string, expected: string): boolean {
  const a = Buffer.from(value),
    b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

function requireSigningKey(key?: string): string {
  if (!key || key.length < 32)
    throw new EmailHttpError('configuration_unavailable', 503)
  return key
}

export function deriveNonce(
  key: string | undefined,
  businessId: string,
  requestKey: string,
  kind: string
): string {
  return createHmac('sha256', requireSigningKey(key))
    .update(JSON.stringify(['email-v1', businessId, requestKey, kind]))
    .digest('hex')
}

export function signPreference(
  key: string | undefined,
  businessId: string,
  nonce: string,
  action: 'confirm' | 'unsubscribe'
): string {
  if (!/^[a-f0-9]{64}$/.test(nonce) || !/^[a-z0-9_-]{1,64}$/.test(businessId))
    throw new EmailHttpError('invalid_token', 400)
  const body = `v1.${businessId}.${action}.${nonce}`
  return `${body}.${createHmac('sha256', requireSigningKey(key)).update(body).digest('base64url')}`
}

export function resolvePreference(key: string | undefined, token: unknown) {
  if (typeof token !== 'string' || token.length > 256)
    throw new EmailHttpError('invalid_token', 400)
  const match =
    /^(v1\.([a-z0-9_-]{1,64})\.(confirm|unsubscribe)\.([a-f0-9]{64}))\.([A-Za-z0-9_-]{43})$/.exec(
      token
    )
  if (!match) throw new EmailHttpError('invalid_token', 400)
  const signature = createHmac('sha256', requireSigningKey(key))
    .update(match[1])
    .digest('base64url')
  if (!secretMatches(match[5], signature))
    throw new EmailHttpError('invalid_token', 400)
  return {
    businessId: match[2],
    action: match[3] as 'confirm' | 'unsubscribe',
    tokenDigest: createHash('sha256').update(match[4]).digest('hex'),
  }
}

export async function readJson(
  request: Request,
  maxBytes = 16_384
): Promise<Record<string, unknown>> {
  if (
    !/^application\/json(?:;|$)/i.test(
      request.headers.get('content-type') ?? ''
    )
  )
    throw new EmailHttpError('invalid_content_type', 415)
  try {
    const data = JSON.parse(await readBody(request, maxBytes))
    if (!data || typeof data !== 'object' || Array.isArray(data))
      throw new Error()
    return data
  } catch (error) {
    if (error instanceof EmailHttpError) throw error
    throw new EmailHttpError('invalid_request', 400)
  }
}

export async function readBody(
  request: Request,
  maxBytes: number
): Promise<string> {
  if (Number(request.headers.get('content-length')) > maxBytes)
    throw new EmailHttpError('payload_too_large', 413)
  const reader = request.body?.getReader()
  if (!reader) throw new EmailHttpError('invalid_request', 400)
  const chunks: Uint8Array[] = []
  let bytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > maxBytes) {
        await reader.cancel()
        throw new EmailHttpError('payload_too_large', 413)
      }
      chunks.push(value)
    }
    return Buffer.concat(chunks).toString('utf8')
  } catch (error) {
    if (error instanceof EmailHttpError) throw error
    throw new EmailHttpError('invalid_request', 400)
  }
}

export function bearer(request: Request): string {
  const value = request.headers.get('authorization') ?? ''
  if (!/^Bearer [^\s]{32,4096}$/.test(value))
    throw new EmailHttpError('authentication_required', 401)
  return value.slice(7)
}

export function idempotencyKey(request: Request): string {
  const key = request.headers.get('idempotency-key') ?? ''
  if (!/^[A-Za-z0-9_:-]{16,128}$/.test(key))
    throw new EmailHttpError('invalid_idempotency_key', 400)
  return key
}

export function onlyKeys(input: Record<string, unknown>, keys: string[]) {
  if (Object.keys(input).some((key) => !keys.includes(key)))
    throw new EmailHttpError('invalid_request', 400)
}
