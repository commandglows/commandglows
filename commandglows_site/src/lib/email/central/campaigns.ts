import { ConvexHttpClient } from 'convex/browser'
import { convexMutation, errorResponse, json, type Mutation } from './api'
import { getServerEnv } from '../../serverEnv'
import { authorizeHttp } from './worker'
import {
  bearer,
  EmailHttpError,
  idempotencyKey,
  onlyKeys,
  readJson,
} from './security'
type Backend = { query: Mutation; mutation: Mutation }
function backend(env: Record<string, string | undefined>): Backend {
  const mutation = convexMutation(env)
  const client = new ConvexHttpClient(env.EMAIL_CONVEX_URL!)
  return {
    mutation,
    query: (name, args) => client.query(name as never, args as never),
  }
}
/** Machine credentials belong only in the authenticated server relay. */
export async function handleCampaigns(
  request: Request,
  env = getServerEnv(),
  injected?: Backend
) {
  try {
    const credential = bearer(request)
    if (request.method === 'GET') {
      const params = Object.fromEntries(new URL(request.url).searchParams)
      onlyKeys(params, [
        'business_id',
        'view',
        'campaign_id',
        'cursor',
        'limit',
      ])
      authorizeHttp(env, credential, params.business_id, 'campaign_read')
      const view = params.view ?? 'list'
      const numItems = Number(params.limit ?? 25)
      if (
        !['list', 'status', 'preview', 'recipients'].includes(view) ||
        !Number.isSafeInteger(numItems) ||
        numItems < 1 ||
        numItems > 100 ||
        (params.cursor?.length ?? 0) > 4096 ||
        (view !== 'list' && !params.campaign_id)
      )
        throw new EmailHttpError('invalid_input', 422)
      return json(
        200,
        await (injected ?? backend(env)).query('emailCampaigns:read', {
          credential,
          businessId: params.business_id,
          view,
          ...(params.campaign_id ? { campaignId: params.campaign_id } : {}),
          paginationOpts: { numItems, cursor: params.cursor || null },
        })
      )
    }
    if (request.method !== 'POST')
      return json(405, { error: { code: 'method_not_allowed' } })
    const key = idempotencyKey(request)
    const body = await readJson(request)
    onlyKeys(body, [
      'business_id',
      'operation',
      'campaign_id',
      'expected_version',
      'audience_id',
      'locale',
      'subject',
      'paragraphs',
      'scheduled_at',
      'timezone',
    ])
    authorizeHttp(env, credential, body.business_id, 'campaign_write')
    const input: Record<string, unknown> = {}
    const mapping: Record<string, string> = {
      audience_id: 'audienceId',
      scheduled_at: 'scheduledAt',
      locale: 'locale',
      subject: 'subject',
      paragraphs: 'paragraphs',
      timezone: 'timezone',
    }
    for (const [external, internal] of Object.entries(mapping))
      if (body[external] !== undefined) input[internal] = body[external]
    return json(
      200,
      await (injected ?? backend(env)).mutation('emailCampaigns:command', {
        credential,
        businessId: body.business_id,
        operation: body.operation,
        expectedVersion: body.expected_version,
        key,
        ...(body.campaign_id !== undefined
          ? { campaignId: body.campaign_id }
          : {}),
        input,
      })
    )
  } catch (error) {
    return errorResponse(error)
  }
}
