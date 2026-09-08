import { createHash, randomBytes } from 'node:crypto'
import { ConvexHttpClient } from 'convex/browser'
import { getServerEnv } from '../../serverEnv'
import { requireEmailAdmin } from '../central/campaignApi'
import { errorResponse, json } from '../central/api'
import { idempotencyKey, onlyKeys, readJson } from '../central/security'
import {
  fail,
  mailboxAddress,
  provider,
  replyMime,
  seal,
  threadWire,
  unseal,
} from './gmail'

type Call = (name: string, args: Record<string, unknown>) => Promise<any>
type Dependencies = {
  authority?: Call
  read?: Call
  command?: Call
  fetcher?: typeof fetch
}
type Box = {
  id: string
  email: string
  actorId: string
  relayDomains: string[]
}
const digest = (s: string) => createHash('sha256').update(s).digest('hex')
const required = (s: unknown, max = 256): string =>
  typeof s === 'string' && s.length > 0 && s.length <= max
    ? s
    : fail('invalid_request')
function configuration(env: Record<string, string | undefined>) {
  try {
    const boxes = JSON.parse(env.EMAIL_SUPPORT_MAILBOXES ?? '[]') as Box[]
    if (!Array.isArray(boxes) || boxes.length > 20) throw Error()
    for (const box of boxes) {
      if (
        !/^[a-z0-9_-]{1,64}$/.test(box.id) ||
        !box.actorId ||
        !Array.isArray(box.relayDomains) ||
        box.relayDomains.some((d) => !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d))
      )
        throw Error()
      mailboxAddress(box.email)
    }
    const redirect = new URL(env.EMAIL_GMAIL_REDIRECT_URI ?? '')
    if (
      redirect.protocol !== 'https:' ||
      redirect.pathname !== '/api/admin/email/support/oauth/callback' ||
      redirect.search ||
      redirect.hash ||
      redirect.username ||
      redirect.password
    )
      throw Error()
    if (
      !env.EMAIL_GMAIL_CLIENT_ID ||
      !env.EMAIL_GMAIL_CLIENT_SECRET ||
      Buffer.from(env.EMAIL_SUPPORT_TOKEN_KEY ?? '', 'base64').length !== 32
    )
      throw Error()
    return {
      boxes,
      redirect: redirect.href,
      key: env.EMAIL_SUPPORT_TOKEN_KEY!,
      clientId: env.EMAIL_GMAIL_CLIENT_ID,
      secret: env.EMAIL_GMAIL_CLIENT_SECRET,
    }
  } catch {
    return null
  }
}
export async function handleSupportApi(
  context: {
    request: Request
    locals: { auth: () => { userId?: string | null } }
  },
  path: string,
  env: Record<string, string | undefined> = getServerEnv(),
  deps: Dependencies = {}
) {
  try {
    const { actorId } = await requireEmailAdmin(context.locals, env, deps)
    const { request } = context,
      url = new URL(request.url),
      config = configuration(env)
    const origin = request.headers.get('origin')
    if (origin && origin !== url.origin) return fail('forbidden', 403)
    const boxes = config?.boxes.filter((b) => b.actorId === actorId) ?? []
    let client: ConvexHttpClient | undefined
    const backend = () => {
      if (
        !/^https:\/\/[a-z0-9-]+\.convex\.cloud$/.test(
          env.EMAIL_CONVEX_URL ?? ''
        )
      )
        return fail('configuration_unavailable', 503)
      return (client ??= new ConvexHttpClient(env.EMAIL_CONVEX_URL!))
    }
    const read =
      deps.read ??
      ((name, args) => backend().query(name as never, args as never))
    const command =
      deps.command ??
      ((name, args) => backend().mutation(name as never, args as never))
    const store = (box: Box, kind: string, key: string) => ({
      credential: env.EMAIL_OPERATOR_CREDENTIAL,
      actorId,
      mailboxId: box.id,
      kind,
      key,
    })
    const get = (box: Box, kind: string, key: string) =>
      read('emailSupport:read', store(box, kind, key))
    const put = (
      box: Box,
      kind: string,
      key: string,
      value: any,
      mode = 'put',
      expiresAt?: number
    ) =>
      command('emailSupport:write', {
        ...store(box, kind, key),
        value,
        mode,
        ...(expiresAt ? { expiresAt } : {}),
      })
    if (request.method === 'GET' && path === 'context') {
      return json(200, {
        configured: !!config && boxes.length > 0,
        disabled_reason: config && boxes.length ? null : 'gmail_not_configured',
        can_reply:
          !!config &&
          boxes.length > 0 &&
          env.EMAIL_SUPPORT_REPLY_ENABLED === 'true',
        mailboxes: await Promise.all(
          boxes.map(async (b) => ({
            id: b.id,
            email: b.email,
            connected: !!(await get(b, 'token', 'current')),
          }))
        ),
      })
    }
    if (!config || !boxes.length) return fail('configuration_unavailable', 503)
    if (url.origin !== new URL(config.redirect).origin)
      return fail('forbidden', 403)
    let body: Record<string, unknown> = {}
    if (request.method === 'POST') {
      if (request.headers.get('origin') !== url.origin || url.search)
        return fail('forbidden', 403)
      body = await readJson(request, 24000)
    } else if (request.method !== 'GET') return fail('method_not_allowed', 405)
    const tokenExchange = (values: Record<string, string>) =>
      provider(
        'https://oauth2.googleapis.com/token',
        {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.secret,
            ...values,
          }),
        },
        deps.fetcher
      )
    if (path === 'oauth/callback' && request.method === 'GET') {
      const state = required(url.searchParams.get('state'), 150),
        match = /^([a-z0-9_-]{1,64})\.([a-zA-Z0-9_-]{43})$/.exec(state)
      const box = boxes.find((b) => b.id === match?.[1])
      if (!box) return fail('invalid_oauth_state')
      const owner = `${actorId}:${box.id}`
      const saved = await put(box, 'oauth', digest(state), null, 'consume')
      if (!saved) return fail('invalid_oauth_state')
      if (url.searchParams.has('error'))
        return new Response(null, {
          status: 303,
          headers: {
            location:
              '/email-engine/index.html?section=support&gmail=cancelled',
            'cache-control': 'no-store',
            'referrer-policy': 'no-referrer',
          },
        })
      const verifier = unseal(saved, config.key, owner).verifier
      const tokens = await tokenExchange({
        grant_type: 'authorization_code',
        code: required(url.searchParams.get('code'), 4096),
        redirect_uri: config.redirect,
        code_verifier: verifier,
      })
      const access = required(tokens.access_token, 8192)
      const profile = await provider(
        'https://gmail.googleapis.com/gmail/v1/users/me/profile',
        { headers: { authorization: `Bearer ${access}` } },
        deps.fetcher
      )
      if (profile.emailAddress?.toLowerCase() !== box.email.toLowerCase())
        return fail('mailbox_not_allowed', 403)
      if (
        !tokens.refresh_token ||
        !String(tokens.scope ?? '')
          .split(' ')
          .includes('https://www.googleapis.com/auth/gmail.readonly') ||
        !String(tokens.scope ?? '')
          .split(' ')
          .includes('https://www.googleapis.com/auth/gmail.send')
      )
        return fail('consent_incomplete', 409)
      await put(
        box,
        'token',
        'current',
        seal(
          { refresh_token: required(tokens.refresh_token, 8192) },
          config.key,
          owner
        )
      )
      return new Response(null, {
        status: 303,
        headers: {
          location: '/email-engine/index.html?section=support&gmail=connected',
          'cache-control': 'no-store',
          'referrer-policy': 'no-referrer',
        },
      })
    }
    const boxId =
      request.method === 'GET'
        ? url.searchParams.get('mailbox_id')
        : body.mailbox_id
    const box = boxes.find((b) => b.id === boxId)
    if (!box) return fail('mailbox_not_allowed', 403)
    const owner = `${actorId}:${box.id}`
    if (path === 'oauth/start' && request.method === 'POST') {
      onlyKeys(body, ['mailbox_id'])
      const state = `${box.id}.${randomBytes(32).toString('base64url')}`,
        verifier = randomBytes(32).toString('base64url')
      await put(
        box,
        'oauth',
        digest(state),
        seal({ verifier }, config.key, owner),
        'put',
        Date.now() + 600000
      )
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirect,
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent',
        login_hint: box.email,
        scope:
          'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send',
        state,
        code_challenge: createHash('sha256')
          .update(verifier)
          .digest('base64url'),
        code_challenge_method: 'S256',
      })
      return json(200, {
        authorization_url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      })
    }
    const match = /^threads\/([a-zA-Z0-9_-]{1,128})(?:\/(status|reply))?$/.exec(
      path
    )
    if (path !== 'threads' && !match) return fail('not_found', 404)
    const threadId = match?.[1]
    if (
      (request.method === 'POST' &&
        !['reply', 'status'].includes(match?.[2] ?? '')) ||
      (request.method === 'GET' && match?.[2])
    )
      return fail('method_not_allowed', 405)
    const encrypted = await get(box, 'token', 'current')
    if (!encrypted) return fail('reconnect_required', 409)
    const tokens = await tokenExchange({
      grant_type: 'refresh_token',
      refresh_token: unseal(encrypted, config.key, owner).refresh_token,
    })
    const access = required(tokens.access_token, 8192)
    const gmail = (suffix: string, init: RequestInit = {}) =>
      provider(
        `https://gmail.googleapis.com/gmail/v1/users/me/${suffix}`,
        {
          ...init,
          headers: {
            authorization: `Bearer ${access}`,
            'content-type': 'application/json',
          },
        },
        deps.fetcher
      )
    const load = async (id: string) => {
      const thread = threadWire(
        await gmail(`threads/${encodeURIComponent(id)}?format=full`),
        'pending',
        box.relayDomains,
        env.EMAIL_SUPPORT_REPLY_ENABLED === 'true'
      )
      const saved = await get(box, 'status', id)
      if (saved?.messageId === thread.routing.inboundMessageId)
        thread.status = saved.status
      return thread
    }
    if (request.method === 'GET' && path === 'threads') {
      const cursor = url.searchParams.get('cursor')
      if (cursor && !/^[A-Za-z0-9_-]{1,2048}$/.test(cursor))
        return fail('invalid_request')
      const page = await gmail(
        `threads?maxResults=15&labelIds=INBOX${cursor ? `&pageToken=${encodeURIComponent(cursor)}` : ''}`
      )
      const threads: any[] = []
      // Five concurrent bounded fetches, never an unbounded mailbox scan.
      const ids = (page.threads ?? []).slice(0, 15)
      for (let i = 0; i < ids.length; i += 5)
        threads.push(
          ...(await Promise.all(
            ids.slice(i, i + 5).map(async (row: any) => {
              const t = await load(required(row.id, 128))
              return {
                id: t.id,
                subject: t.subject,
                snippet: t.snippet,
                from: t.from,
                updated_at: t.updated_at,
                status: t.status,
              }
            })
          ))
        )
      return json(200, { threads, next_cursor: page.nextPageToken ?? null })
    }
    const thread = await load(threadId!)
    if (request.method === 'POST' && match?.[2] === 'status') {
      onlyKeys(body, ['mailbox_id', 'status'])
      if (!['pending', 'waiting', 'resolved'].includes(String(body.status)))
        return fail('invalid_request')
      await put(box, 'status', threadId!, {
        status: body.status,
        messageId: thread.routing.inboundMessageId,
      })
      return json(200, { status: body.status })
    }
    if (request.method === 'GET') {
      const previous = await get(
        box,
        'reply',
        `${threadId}:${thread.latest_message_id}`
      )
      const { routing, ...wire } = thread
      return json(200, {
        thread: {
          ...wire,
          ...(previous
            ? {
                can_reply: false,
                reply_disabled_reason:
                  previous.state === 'unknown'
                    ? 'reply_delivery_unknown'
                    : 'reply_already_submitted',
              }
            : {}),
        },
      })
    }
    onlyKeys(body, ['mailbox_id', 'body', 'expected_message_id', 'confirmed'])
    if (
      body.confirmed !== true ||
      body.expected_message_id !== thread.latest_message_id
    )
      return fail('thread_changed', 409)
    const key = idempotencyKey(request),
      text = required(body.body, 20000)
    const raw = replyMime(thread, box.email, text)
    const fingerprint = digest(JSON.stringify([key, text]))
    // Atomic per-message lock survives crashes and also prevents a new key bypassing an unknown send.
    const lockKey = `${threadId}:${thread.latest_message_id}`
    const lock = await put(
      box,
      'reply',
      lockKey,
      { fingerprint, state: 'unknown', message_id: null },
      'once'
    )
    if (!lock.created) {
      if (lock.value.fingerprint !== fingerprint)
        return fail('reply_already_attempted', 409)
      return json(200, {
        state: lock.value.state,
        message_id: lock.value.message_id,
      })
    }
    let result = {
      fingerprint,
      state: 'unknown',
      message_id: null as string | null,
    }
    try {
      const sent = await gmail('messages/send', {
        method: 'POST',
        body: JSON.stringify({ threadId, raw }),
      })
      if (typeof sent.id === 'string')
        result = { fingerprint, state: 'submitted', message_id: sent.id }
    } catch {
      /* uncertain acceptance is never retried */
    }
    await put(box, 'reply', lockKey, result)
    return json(200, { state: result.state, message_id: result.message_id })
  } catch (error) {
    return errorResponse(error)
  }
}
