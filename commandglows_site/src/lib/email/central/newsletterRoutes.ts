import { randomUUID } from 'node:crypto'
import { parseEmailConfig } from '../../../../convex/emailConfig'
import { getServerEnv } from '../../serverEnv'
import { errorResponse, handleCommand, type Mutation } from './api'
import { EmailHttpError, onlyKeys, readJson } from './security'

/** Website mapping only. Consent and delivery remain owned by the central service. */
function subscriptionMapping(
  env: Record<string, string | undefined>,
  source: string
) {
  const businessId = env.EMAIL_NEWSLETTER_BUSINESS_ID
  const audienceId = env.EMAIL_NEWSLETTER_AUDIENCE_ID
  const purpose = env.EMAIL_NEWSLETTER_PURPOSE
  const noticeVersion = env.EMAIL_NEWSLETTER_NOTICE_VERSION
  if (!businessId || !audienceId || !purpose || !noticeVersion)
    throw new EmailHttpError('configuration_unavailable', 503)

  const profile = parseEmailConfig(env.EMAIL_CONTROL_CONFIG)
  const audience = profile.businesses
    .find((entry) => entry.id === businessId)
    ?.audiences.find(
      (entry) => entry.id === audienceId && entry.purpose === purpose
    )
  const clients = profile.clients.filter(
    (entry) =>
      entry.businessIds.includes(businessId) &&
      entry.operations.includes('subscribe')
  )
  // Do not silently pick authority when the website's service client is ambiguous.
  const client = clients.length === 1 ? clients[0] : undefined
  const credential = client && env[client.credentialEnv]
  if (
    !audience?.noticeVersions.includes(noticeVersion) ||
    !audience.sources.includes(source) ||
    !credential ||
    credential.length < 32
  )
    throw new EmailHttpError('configuration_unavailable', 503)
  return { businessId, audienceId, purpose, noticeVersion, credential }
}

export async function handleNewsletterSubscribeRequest(
  request: Request,
  env = getServerEnv(),
  injected?: Mutation
) {
  try {
    if (request.method !== 'POST')
      throw new EmailHttpError('method_not_allowed', 405)
    if (request.headers.get('origin') !== new URL(request.url).origin)
      throw new EmailHttpError('invalid_origin', 403)
    const body = await readJson(request, 4096)
    onlyKeys(body, ['email', 'source', 'lang', 'consent'])
    if (
      typeof body.source !== 'string' ||
      !['footer', 'lead-magnet', 'windows-mastery'].includes(body.source)
    )
      throw new EmailHttpError('invalid_source', 400)
    if (body.consent !== true) throw new EmailHttpError('consent_required', 400)
    const mapping = subscriptionMapping(env, body.source)
    // Adapt the public form to the existing authenticated command boundary;
    // this is a local call, not an HTTP request or a provider send.
    return await handleCommand(
      new Request(request.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mapping.credential}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': randomUUID(),
        },
        body: JSON.stringify({
          business_id: mapping.businessId,
          email: body.email,
          audience_id: mapping.audienceId,
          purpose: mapping.purpose,
          source: body.source,
          notice_version: mapping.noticeVersion,
          locale: body.lang === 'fr' ? 'fr' : 'en',
          consent: true,
          occurred_at: new Date().toISOString(),
        }),
      }),
      'subscribe',
      env,
      injected
    )
  } catch (error) {
    return errorResponse(error)
  }
}
