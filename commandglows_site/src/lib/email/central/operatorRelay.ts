import { ConvexHttpClient } from 'convex/browser'
import { convexMutation, errorResponse, json, type Mutation } from './api'
import { handleOperations } from './operations'
import { getServerEnv } from '../../serverEnv'
import { readJson } from './security'

/** Existing site session -> canonical admin check -> least-privilege email client. */
export async function handleOperatorRelay(
  request: Request,
  actorGlobalUserId: string | null | undefined,
  env = getServerEnv(),
  injected?: { authorize: Mutation; forward: typeof handleOperations }
) {
  if (!actorGlobalUserId) return json(401, { error: { code: 'auth_required' } })
  if (
    request.method !== 'GET' &&
    request.headers.get('origin') !== new URL(request.url).origin
  )
    return json(403, { error: { code: 'same_origin_required' } })
  try {
    if (
      !env.EMAIL_OPERATOR_CREDENTIAL ||
      env.EMAIL_OPERATOR_CREDENTIAL.length < 32 ||
      !env.SUITE_BRIDGE_CONVEX_SECRET
    )
      return json(503, { error: { code: 'configuration_unavailable' } })
    const businessId =
      request.method === 'GET'
        ? new URL(request.url).searchParams.get('business_id')
        : (await readJson(request.clone(), 4096)).business_id
    if (
      typeof businessId !== 'string' ||
      !/^[a-z0-9_-]{1,64}$/.test(businessId)
    )
      return json(422, { error: { code: 'invalid_input' } })
    let authorize = injected?.authorize
    if (!authorize) {
      convexMutation(env)
      const client = new ConvexHttpClient(env.EMAIL_CONVEX_URL!)
      authorize = (name, args) => client.query(name as never, args as never)
    }
    await authorize('emailOperations:siteAuthorize', {
      actorGlobalUserId,
      bridgeSecret: env.SUITE_BRIDGE_CONVEX_SECRET,
      businessId,
      operation:
        request.method === 'GET' ? 'operations_read' : 'operations_write',
    })
    const headers = new Headers(request.headers)
    headers.set('Authorization', `Bearer ${env.EMAIL_OPERATOR_CREDENTIAL}`)
    return await (injected?.forward ?? handleOperations)(
      new Request(request, { headers }),
      env
    )
  } catch (error) {
    if (
      error instanceof Error &&
      /admin_forbidden|bridge_secret_mismatch|account_not_ready|account_identity_required/.test(
        error.message
      )
    )
      return json(403, { error: { code: 'admin_required' } })
    return errorResponse(error)
  }
}
