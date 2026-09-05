import {
  parseEmailConfig,
  type EmailConfig,
} from '../../../../convex/emailConfig'
import { getServerEnv } from '../../serverEnv'
import { convexMutation, errorResponse, json, type Mutation } from './api'
import {
  bearer,
  EmailHttpError,
  onlyKeys,
  readJson,
  secretMatches,
  signPreference,
} from './security'
import { renderEmail, type EmailContent } from './templates'
import { sendPostmark, type TransportMessage } from './transport'

export function authorizeHttp(
  env: Record<string, string | undefined>,
  credential: string,
  businessId: unknown,
  operation: string
) {
  const config = parseEmailConfig(env.EMAIL_CONTROL_CONFIG)
  const client = config.clients.find((value) => {
    const expected = env[value.credentialEnv]
    return (
      expected && expected.length >= 32 && secretMatches(credential, expected)
    )
  })
  if (
    typeof businessId !== 'string' ||
    !client?.businessIds.includes(businessId) ||
    !client.operations.includes(operation)
  )
    throw new EmailHttpError('forbidden', 403)
  const business = config.businesses.find((value) => value.id === businessId)
  if (!business) throw new EmailHttpError('forbidden', 403)
  return { config, business }
}

type Business = EmailConfig['businesses'][number]
async function verifyProvider(
  business: Business,
  environment: EmailConfig['environment'],
  token: string,
  fetcher: typeof fetch
) {
  const read = async (path: string) => {
    const response = await fetcher(`https://api.postmarkapp.com${path}`, {
      headers: { Accept: 'application/json', 'X-Postmark-Server-Token': token },
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new EmailHttpError('transport_unavailable', 503)
    return response.json()
  }
  const server = await read('/server')
  if (
    server.ID !== business.serverId ||
    server.DeliveryType !== (environment === 'sandbox' ? 'Sandbox' : 'Live')
  )
    throw new EmailHttpError('provider_environment_mismatch', 503)
  const streams = await read('/message-streams')
  const transaction = streams.MessageStreams?.find(
    (s: Record<string, unknown>) => s.ID === business.transactionalStream
  )
  const broadcast = streams.MessageStreams?.find(
    (s: Record<string, unknown>) => s.ID === business.broadcastStream
  )
  if (
    transaction?.MessageStreamType !== 'Transactional' ||
    broadcast?.MessageStreamType !== 'Broadcasts' ||
    transaction.ServerID !== business.serverId ||
    broadcast.ServerID !== business.serverId ||
    transaction.ArchivedAt ||
    broadcast.ArchivedAt ||
    broadcast.SubscriptionManagementConfiguration?.UnsubscribeHandlingType !==
      'Postmark'
  )
    throw new EmailHttpError('provider_stream_mismatch', 503)
}

interface Job extends TransportMessage {
  attemptId: string
  content?: EmailContent & {
    confirmationNonce: string
    unsubscribeNonce: string
  }
}

export async function handleDispatch(
  request: Request,
  env = getServerEnv(),
  injected?: Mutation,
  fetcher: typeof fetch = fetch
) {
  try {
    const credential = bearer(request)
    const body = await readJson(request, 1024)
    onlyKeys(body, ['business_id'])
    const { config, business } = authorizeHttp(
      env,
      credential,
      body.business_id,
      'dispatch'
    )
    const allowProduction =
      env.EMAIL_ALLOW_PRODUCTION_SEND === 'true' &&
      env.VERCEL_ENV === 'production'
    if (
      !business.activated ||
      (config.environment === 'production' && !allowProduction)
    )
      throw new EmailHttpError('transport_not_enabled', 503)
    const token = business.serverTokenEnv && env[business.serverTokenEnv]
    if (
      !token ||
      !business.serverId ||
      !business.publicBaseUrl ||
      !env.EMAIL_TOKEN_SIGNING_KEY
    )
      throw new EmailHttpError('configuration_unavailable', 503)
    const baseUrl = new URL(business.publicBaseUrl)
    if (baseUrl.protocol !== 'https:' || baseUrl.username || baseUrl.password)
      throw new EmailHttpError('configuration_unavailable', 503)
    await verifyProvider(business, config.environment, token, fetcher)
    const mutate = injected ?? convexMutation(env)
    const jobs = (await mutate('email:claim', {
      credential,
      businessId: business.id,
    })) as Job[]
    if (!Array.isArray(jobs))
      throw new EmailHttpError('invalid_job_receipt', 503)
    const results: { message_id: string; status: string }[] = []
    for (const job of jobs) {
      let content = job
      try {
        if (job.content) {
          const action = new URL('/api/v1/email/preferences/resolve', baseUrl)
          action.searchParams.set(
            'token',
            signPreference(
              env.EMAIL_TOKEN_SIGNING_KEY,
              business.id,
              job.content.confirmationNonce,
              'confirm'
            )
          )
          action.searchParams.set('lang', job.content.locale)
          content = {
            ...job,
            ...renderEmail({ ...job.content, actionUrl: action.href }),
          }
        }
      } catch {
        await mutate('email:settle', {
          credential,
          businessId: business.id,
          messageId: job.messageId,
          attemptId: job.attemptId,
          outcome: 'permanent_failure',
          errorCode: 'invalid_template_content',
        })
        results.push({ message_id: job.messageId, status: 'permanent_failure' })
        continue
      }
      const eligible = (await mutate('email:recheckDispatch', {
        credential,
        businessId: business.id,
        messageId: job.messageId,
        attemptId: job.attemptId,
      })) as { eligible: boolean }
      if (!eligible?.eligible) {
        results.push({ message_id: job.messageId, status: 'cancelled' })
        continue
      }
      const outcome = await sendPostmark(
        content,
        {
          serverToken: token,
          environment: config.environment,
          allowProduction,
        },
        fetcher
      )
      // If persistence fails after send, the lease becomes unknown; never resend here.
      await mutate('email:settle', {
        credential,
        businessId: business.id,
        messageId: job.messageId,
        attemptId: job.attemptId,
        outcome: outcome.status,
        ...(outcome.providerMessageId
          ? { providerMessageId: outcome.providerMessageId }
          : {}),
        ...(outcome.reasonCode ? { errorCode: outcome.reasonCode } : {}),
        ...(outcome.retryAfterMs ? { retryAfterMs: outcome.retryAfterMs } : {}),
      })
      results.push({ message_id: job.messageId, status: outcome.status })
    }
    return json(200, { results })
  } catch (error) {
    return errorResponse(error)
  }
}
