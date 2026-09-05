import type { APIRoute } from 'astro'
import {
  convexMutation,
  errorResponse,
  json,
  publicResult,
} from '../../../../../lib/email/central/api'
import { getServerEnv } from '../../../../../lib/serverEnv'
import {
  bearer,
  idempotencyKey,
  onlyKeys,
  readJson,
} from '../../../../../lib/email/central/security'
export const prerender = false
export const DELETE: APIRoute = async ({ request, params }) => {
  try {
    const credential = bearer(request)
    const key = idempotencyKey(request)
    const body = await readJson(request, 1024)
    onlyKeys(body, ['business_id'])
    return json(
      200,
      publicResult(
        await convexMutation(getServerEnv())('email:command', {
          credential,
          operation: 'withdraw',
          idempotencyKey: key,
          input: {
            businessId: body.business_id,
            subscriptionId: params.subscription_id,
          },
        })
      )
    )
  } catch (error) {
    return errorResponse(error)
  }
}
