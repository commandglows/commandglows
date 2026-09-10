import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { EmailHttpError } from '../central/security'

export const fail = (code: string, status = 400): never => {
  throw new EmailHttpError(code, status)
}
export const mailboxAddress = (s: unknown): string => {
  if (
    typeof s !== 'string' ||
    s.length > 254 ||
    !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(s)
  )
    return fail('invalid_address')
  return s
}
export function seal(value: unknown, key: string, owner: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'base64'), iv)
  cipher.setAAD(Buffer.from(owner))
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value)),
    cipher.final(),
  ])
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
    'base64url'
  )
}
export function unseal(value: string, key: string, owner: string): any {
  try {
    const bytes = Buffer.from(value, 'base64url'),
      cipher = createDecipheriv(
        'aes-256-gcm',
        Buffer.from(key, 'base64'),
        bytes.subarray(0, 12)
      )
    cipher.setAAD(Buffer.from(owner))
    cipher.setAuthTag(bytes.subarray(12, 28))
    return JSON.parse(
      Buffer.concat([
        cipher.update(bytes.subarray(28)),
        cipher.final(),
      ]).toString()
    )
  } catch {
    return fail('connection_unavailable', 503)
  }
}
export async function provider(
  url: string,
  init: RequestInit,
  fetcher = fetch
): Promise<any> {
  const response = await fetcher(url, {
    ...init,
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok)
    return fail(
      response.status === 401 ? 'reconnect_required' : 'provider_unavailable',
      502
    )
  if (Number(response.headers.get('content-length')) > 2_000_000)
    return fail('thread_too_large', 413)
  const reader = response.body?.getReader()
  if (!reader) return fail('provider_unavailable', 502)
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const part = await reader.read()
    if (part.done) break
    size += part.value.length
    if (size > 2_000_000) {
      await reader.cancel()
      return fail('thread_too_large', 413)
    }
    chunks.push(part.value)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString())
  } catch {
    return fail('provider_unavailable', 502)
  }
}
function header(message: any, name: string) {
  const found = (message.payload?.headers ?? []).filter(
    (h: any) => h.name?.toLowerCase() === name.toLowerCase()
  )
  if (
    found.length !== 1 ||
    typeof found[0].value !== 'string' ||
    /[\r\n\0]/.test(found[0].value)
  )
    return ''
  return found[0].value.slice(0, 2000)
}
function plain(part: any, depth = 0): string {
  if (!part || depth > 12) return ''
  if (part.mimeType === 'text/plain' && typeof part.body?.data === 'string')
    return Buffer.from(part.body.data, 'base64url')
      .toString('utf8')
      .slice(0, 100000)
  return (part.parts ?? [])
    .slice(0, 50)
    .map((p: any) => plain(p, depth + 1))
    .filter(Boolean)
    .join('\n')
    .slice(0, 100000)
}
export function threadWire(
  raw: any,
  status: string,
  relayDomains: string[],
  enabled: boolean
) {
  const all = [...(raw.messages ?? [])]
    .filter((m: any) => !m.labelIds?.includes('DRAFT'))
    .sort((a: any, b: any) => Number(a.internalDate) - Number(b.internalDate))
  if (all.length > 100) return fail('thread_too_large', 413)
  const latest = all.at(-1)
  const replyHeader = header(latest ?? {}, 'Reply-To')
  // Fail closed: an absent or ambiguous relay never falls back to From/customer.
  const candidate =
    /^([^<>\s]+@[^<>\s]+)$/.exec(replyHeader)?.[1] ??
    /^[^<>\r\n]*<([^<>\s]+@[^<>\s]+)>$/.exec(replyHeader)?.[1] ??
    ''
  let relay = ''
  try {
    const address = mailboxAddress(candidate)
    if (relayDomains.includes(address.split('@')[1].toLowerCase()))
      relay = address
  } catch {
    /* unsupported routing stays read-only */
  }
  const messageId = header(latest ?? {}, 'Message-ID')
  const validMessageId = /^<[^<>\s]+@[^<>\s]+>$/.test(messageId)
  const canReply =
    enabled && !!relay && validMessageId && !latest?.labelIds?.includes('SENT')
  return {
    id: raw.id,
    subject: header(all[0] ?? {}, 'Subject'),
    status,
    snippet: String(raw.snippet ?? latest?.snippet ?? '').slice(0, 500),
    from: header(latest ?? {}, 'From'),
    updated_at: new Date(Number(latest?.internalDate) || 0).toISOString(),
    latest_message_id: latest?.id ?? '',
    reply_to: relay || null,
    can_reply: canReply,
    reply_disabled_reason: canReply
      ? null
      : !enabled
        ? 'reply_not_enabled'
        : 'relay_not_verified',
    messages: all.map((m: any) => ({
      id: m.id,
      from: header(m, 'From'),
      to: header(m, 'To'),
      text:
        plain(m.payload) || '[Contenu texte indisponible ; consulter Gmail.]',
      date: new Date(Number(m.internalDate) || 0).toISOString(),
    })),
    routing: {
      messageId,
      references: header(latest ?? {}, 'References'),
      inboundMessageId:
        all.filter((m: any) => !m.labelIds?.includes('SENT')).at(-1)?.id ?? '',
    },
  }
}
export function replyMime(
  thread: ReturnType<typeof threadWire>,
  from: string,
  body: string
) {
  if (!thread.can_reply || !thread.reply_to)
    return fail('relay_not_verified', 409)
  mailboxAddress(from)
  mailboxAddress(thread.reply_to)
  if (!body.trim() || body.length > 20000 || body.includes('\0'))
    return fail('invalid_request')
  const subject = thread.subject.replace(/^Re:\s*/i, '').slice(0, 300)
  const refs = (
    thread.routing.references.match(/<[^<>\s]+@[^<>\s]+>/g) ?? []
  ).slice(-10)
  const encodedBody =
    Buffer.from(body)
      .toString('base64')
      .match(/.{1,76}/g)
      ?.join('\r\n') ?? ''
  return Buffer.from(
    [
      `From: ${from}`,
      `To: ${thread.reply_to}`,
      `Subject: =?UTF-8?B?${Buffer.from('Re: ' + subject).toString('base64')}?=`,
      `In-Reply-To: ${thread.routing.messageId}`,
      `References: ${[...refs, thread.routing.messageId].join(' ')}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      encodedBody,
    ].join('\r\n')
  ).toString('base64url')
}
