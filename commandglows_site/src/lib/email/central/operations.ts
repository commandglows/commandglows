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
  // Reuse the strict explicit-origin validation; never fall back to the public production URL.
  const mutation = convexMutation(env)
  const client = new ConvexHttpClient(env.EMAIL_CONVEX_URL!)
  return {
    mutation,
    query: (name, args) => client.query(name as never, args as never),
  }
}

/** Intended for an authenticated server relay. No provider/global credential goes to a UI. */
export async function handleOperations(
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
        'message_id',
        'state',
        'cursor',
        'limit',
      ])
      authorizeHttp(env, credential, params.business_id, 'operations_read')
      const view = params.view ?? 'list'
      if (!['list', 'detail', 'status', 'events'].includes(view))
        throw new EmailHttpError('invalid_input', 422)
      const numItems = Number(params.limit ?? '20')
      if (
        !Number.isSafeInteger(numItems) ||
        numItems < 1 ||
        numItems > 100 ||
        (params.cursor?.length ?? 0) > 4096 ||
        (['detail', 'events'].includes(view) && !params.message_id)
      )
        throw new EmailHttpError('invalid_input', 422)
      const args = {
        credential,
        businessId: params.business_id,
        ...(view !== 'status'
          ? { paginationOpts: { numItems, cursor: params.cursor || null } }
          : {}),
        ...(view === 'list' ? { state: params.state ?? 'queued' } : {}),
        ...(['detail', 'events'].includes(view)
          ? { messageId: params.message_id }
          : {}),
      }
      return json(
        200,
        await (injected ?? backend(env)).query(`emailOperations:${view}`, args)
      )
    }
    if (request.method !== 'POST')
      return json(405, { error: { code: 'method_not_allowed' } })
    const key = idempotencyKey(request)
    const body = await readJson(request, 4096)
    onlyKeys(body, [
      'business_id',
      'action',
      'reason_code',
      'expected_version',
      'message_id',
      'class',
      'evidence_reference',
    ])
    authorizeHttp(env, credential, body.business_id, 'operations_write')
    const args = {
      credential,
      businessId: body.business_id,
      key,
      action: body.action,
      reasonCode: body.reason_code,
      expectedVersion: body.expected_version,
      ...(body.message_id !== undefined ? { messageId: body.message_id } : {}),
      ...(body.class !== undefined ? { class: body.class } : {}),
      ...(body.evidence_reference !== undefined
        ? { evidenceReference: body.evidence_reference }
        : {}),
    }
    return json(
      200,
      await (injected ?? backend(env)).mutation('emailOperations:operate', args)
    )
  } catch (error) {
    return errorResponse(error)
  }
}
