import { ConvexHttpClient } from 'convex/browser'
import { getServerEnv } from '../../serverEnv'
import { errorResponse, json } from './api'
import { EmailHttpError, idempotencyKey, onlyKeys, readJson } from './security'

type Call = (name: string, args: Record<string, unknown>) => Promise<unknown>
type Dependencies = { authority?: Call; read?: Call; command?: Call }
type Context = {
  request: Request
  locals: { auth: () => { userId?: string | null } }
}
const invalid = (): never => {
  throw new EmailHttpError('invalid_request', 400)
}
function client(url?: string) {
  if (!url || !/^https:\/\/[a-z0-9-]+\.convex\.cloud$/.test(url))
    throw new EmailHttpError('configuration_unavailable', 503)
  return new ConvexHttpClient(url)
}
function string(value: unknown, max = 200): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    return invalid()
  return value
}
function content(body: Record<string, unknown>) {
  const blocks = body.blocks
  if (!Array.isArray(blocks) || blocks.length > 60) return invalid()
  const ids = new Set<string>()
  const mapped = blocks.map((block) => {
    if (!block || typeof block !== 'object' || Array.isArray(block))
      return invalid()
    onlyKeys(block, ['id', 'type', 'text', 'url', 'source_id'])
    const id = string(block.id, 100)
    if (ids.has(id)) return invalid()
    ids.add(id)
    if (
      !['heading', 'text', 'button', 'divider', 'source'].includes(block.type)
    )
      return invalid()
    if (typeof block.text !== 'string' || block.text.length > 4000)
      return invalid()
    if (block.url !== undefined) {
      try {
        const parsed = new URL(string(block.url, 2048))
        if (parsed.protocol !== 'https:' || parsed.username || parsed.password)
          return invalid()
      } catch {
        return invalid()
      }
    }
    return {
      id,
      type: block.type,
      text: block.text,
      ...(block.url !== undefined ? { url: block.url } : {}),
      ...(block.source_id !== undefined
        ? { source_id: string(block.source_id, 200) }
        : {}),
    }
  })
  if (!['fr', 'en'].includes(String(body.locale))) return invalid()
  if (typeof body.preheader !== 'string' || body.preheader.length > 300)
    return invalid()
  if (typeof body.subject !== 'string' || body.subject.length > 200)
    return invalid()
  return {
    title: string(body.title, 160),
    audienceId: string(body.audience_id, 64),
    locale: body.locale,
    subject: body.subject,
    preheader: body.preheader,
    blocks: mapped,
  }
}

export async function requireEmailAdmin(
  locals: Context['locals'],
  env: Record<string, string | undefined> = getServerEnv(),
  injected: Pick<Dependencies, 'authority'> = {}
) {
  const userId = locals.auth().userId
  if (!userId) throw new EmailHttpError('authentication_required', 401)
  if (!env.SUITE_BRIDGE_CONVEX_SECRET || !env.EMAIL_OPERATOR_CREDENTIAL)
    throw new EmailHttpError('configuration_unavailable', 503)
  const authority =
    injected.authority ??
    ((name, args) =>
      client(env.PUBLIC_CONVEX_URL).query(name as never, args as never))
  const actor = (await authority('emailOperatorAuthority:authorize', {
    clerkId: userId,
    bridgeSecret: env.SUITE_BRIDGE_CONVEX_SECRET,
  })) as { actorId?: string }
  if (!actor || actor.actorId !== userId)
    throw new EmailHttpError('forbidden', 403)
  return { actorId: userId }
}

export async function handleCampaignApi(
  { request, locals }: Context,
  path: string,
  env: Record<string, string | undefined> = getServerEnv(),
  injected: Dependencies = {}
) {
  try {
    const actor = await requireEmailAdmin(locals, env, injected)
    const common = {
      credential: env.EMAIL_OPERATOR_CREDENTIAL,
      actorId: actor.actorId,
    }
    const url = new URL(request.url)
    if (request.method === 'GET') {
      const match = /^campaigns\/([a-zA-Z0-9_-]{1,128})$/.exec(path)
      if (path !== 'context' && path !== 'campaigns' && !match)
        throw new EmailHttpError('not_found', 404)
      const allowed =
        path === 'context'
          ? []
          : match
            ? ['business_id']
            : ['business_id', 'cursor', 'state', 'limit']
      for (const key of url.searchParams.keys())
        if (!allowed.includes(key) || url.searchParams.getAll(key).length !== 1)
          invalid()
      const businessId =
        path === 'context'
          ? undefined
          : string(url.searchParams.get('business_id'), 64)
      const state = url.searchParams.get('state')
      if (
        state !== null &&
        !['draft', 'scheduled', 'sending', 'completed', 'cancelled'].includes(
          state
        )
      )
        invalid()
      const rawLimit = url.searchParams.get('limit')
      if (
        rawLimit !== null &&
        (!/^[1-9]\d?$/.test(rawLimit) || Number(rawLimit) > 50)
      )
        invalid()
      const input = {
        ...(path === 'campaigns'
          ? { limit: rawLimit === null ? 20 : Number(rawLimit) }
          : {}),
        ...(match ? { campaignId: match[1] } : {}),
        ...(url.searchParams.has('cursor')
          ? { cursor: string(url.searchParams.get('cursor'), 4096) }
          : {}),
        ...(state ? { state } : {}),
      }
      const read =
        injected.read ??
        ((name, args) =>
          client(env.EMAIL_CONVEX_URL).query(name as never, args as never))
      return json(
        200,
        await read('emailCampaigns:read', {
          ...common,
          ...(businessId ? { businessId } : {}),
          operation: path === 'context' ? 'context' : match ? 'get' : 'list',
          input,
        })
      )
    }
    if (request.method !== 'POST')
      throw new EmailHttpError('method_not_allowed', 405)
    if (request.headers.get('origin') !== url.origin)
      throw new EmailHttpError('forbidden', 403)
    if (url.search) invalid()
    const match =
      /^campaigns\/([a-zA-Z0-9_-]{1,128})\/(save|review|test|approve|cancel|delete)$/.exec(
        path
      )
    if (path !== 'campaigns' && !match)
      throw new EmailHttpError('not_found', 404)
    const operation = match?.[2] ?? 'create'
    const key = idempotencyKey(request)
    const body = await readJson(request, 65_536)
    onlyKeys(body, [
      'business_id',
      ...(match ? ['expected_version'] : []),
      ...(['create', 'save'].includes(operation)
        ? ['title', 'audience_id', 'locale', 'subject', 'preheader', 'blocks']
        : []),
      ...(operation === 'test' ? ['recipient'] : []),
      ...(operation === 'approve' ? ['review_id', 'scheduled_at'] : []),
    ])
    const businessId = string(body.business_id, 64)
    const input: Record<string, unknown> = match
      ? { campaignId: match[1], expectedVersion: body.expected_version }
      : {}
    if (
      match &&
      (!Number.isSafeInteger(body.expected_version) ||
        Number(body.expected_version) < 1)
    )
      invalid()
    if (['create', 'save'].includes(operation))
      Object.assign(input, content(body))
    if (operation === 'test') input.recipient = string(body.recipient, 320)
    if (operation === 'approve') {
      input.reviewId = string(body.review_id, 256)
      if (body.scheduled_at !== undefined) {
        const date = string(body.scheduled_at, 40)
        if (
          !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(date) ||
          !Number.isFinite(Date.parse(date))
        )
          invalid()
        input.scheduledAt = new Date(date).toISOString()
      }
    }
    const command =
      injected.command ??
      ((name, args) =>
        client(env.EMAIL_CONVEX_URL).mutation(name as never, args as never))
    return json(
      200,
      await command('emailCampaigns:command', {
        ...common,
        businessId,
        operation,
        idempotencyKey: key,
        input,
      })
    )
  } catch (error) {
    return errorResponse(error)
  }
}
