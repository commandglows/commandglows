import {
  parseEmailConfig,
  deliveryRoute,
  requiresLiveTest,
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
import type { TransportMessage } from './messageContract'
import { createConfiguredTransport } from './transports/configured'
import { signSettlementProof } from './settlementProof'

export function authorizeHttp(
  env: Record<string, string | undefined>,
  credential: string,
  businessId: unknown,
  operation: string
) {
  if (!env.EMAIL_CONTROL_CONFIG)
    throw new EmailHttpError('email_control_config_missing', 503)
  let config: EmailConfig
  try {
    config = parseEmailConfig(env.EMAIL_CONTROL_CONFIG)
  } catch {
    throw new EmailHttpError('email_control_config_invalid', 503)
  }
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

interface Job extends TransportMessage {
  attemptId: string
  route: string
  content?: EmailContent & {
    confirmationNonce: string
    unsubscribeNonce: string
  }
}

export async function handleDispatch(
  request: Request,
  env = getServerEnv(),
  injected?: Mutation,
  fetcher: typeof fetch = fetch,
  transportFactory: typeof createConfiguredTransport = createConfiguredTransport
) {
  try {
    const credential = bearer(request)
    const gateSecret = env.EMAIL_WORKER_GATE_SECRET
    const suppliedGateSecret = request.headers.get('x-email-worker-gate') ?? ''
    if (!gateSecret || gateSecret.length < 32)
      throw new EmailHttpError('configuration_unavailable', 503)
    if (!secretMatches(suppliedGateSecret, gateSecret))
      throw new EmailHttpError('worker_authentication_required', 401)
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
    const liveTest = requiresLiveTest(config, business)
    const route = deliveryRoute(config, business)
    if (
      liveTest &&
      (!business.liveTest || business.liveTest.expiresAt <= Date.now())
    )
      throw new EmailHttpError('transport_not_enabled', 503)
    if (
      !business.activated ||
      (config.environment === 'production' && !allowProduction)
    )
      throw new EmailHttpError('transport_not_enabled', 503)
    if (!business.publicBaseUrl || !env.EMAIL_TOKEN_SIGNING_KEY)
      throw new EmailHttpError('configuration_unavailable', 503)
    const baseUrl = new URL(business.publicBaseUrl)
    if (baseUrl.protocol !== 'https:' || baseUrl.username || baseUrl.password)
      throw new EmailHttpError('configuration_unavailable', 503)
    const transport = transportFactory({
      config,
      business,
      env,
      allowProduction,
      liveTestReserved: liveTest,
      fetcher,
    })
    await transport.verify()
    const mutate = injected ?? convexMutation(env)
    const jobs = (await mutate('email:claim', {
      credential,
      businessId: business.id,
      expectedRoute: route,
      maxJobs: 10,
    })) as Job[]
    if (!Array.isArray(jobs))
      throw new EmailHttpError('invalid_job_receipt', 503)
    const results: { message_id: string; status: string }[] = []
    for (const job of jobs) {
      if (job.route !== route)
        throw new EmailHttpError('delivery_route_changed', 503)
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
        expectedRoute: route,
      })) as { eligible: boolean }
      if (!eligible?.eligible) {
        results.push({ message_id: job.messageId, status: 'not_dispatched' })
        continue
      }
      const outcome = await transport.send(content)
      // If persistence fails after send, the lease becomes unknown; never resend here.
      const settlementIssuedAt = Date.now()
      const settlementProof =
        outcome.status === 'retryable_failure' ||
        outcome.status === 'permanent_failure'
          ? await signSettlementProof({
              secret: env.EMAIL_WORKER_GATE_SECRET,
              businessId: business.id,
              messageId: job.messageId,
              attemptId: job.attemptId,
              outcome: outcome.status,
              reasonCode: outcome.reasonCode,
              issuedAt: settlementIssuedAt,
            })
          : undefined
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
        ...(settlementProof ? { settlementIssuedAt, settlementProof } : {}),
      })
      results.push({ message_id: job.messageId, status: outcome.status })
      if (
        outcome.status === 'unknown' ||
        outcome.status === 'retryable_failure'
      )
        break
    }
    return json(200, { results })
  } catch (error) {
    return errorResponse(error)
  }
}
