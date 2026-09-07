import { renderEmail } from './templates'
import { authorizeHttp } from './worker'
import { bearer, EmailHttpError, onlyKeys, readJson } from './security'
import { errorResponse, json } from './api'
import { getServerEnv } from '../../serverEnv'

export const emailTemplateCatalog = [
  {
    key: 'commerce_incident',
    version: '1',
    class: 'operator',
    locales: ['fr', 'en'],
    trigger: 'persisted_commerce_incident_version',
    variables: [],
    preview: false,
    send: 'internal_commerce_outbox',
  },
  {
    key: 'subscription_confirmation',
    version: '1',
    class: 'confirmation',
    locales: ['fr', 'en'],
    trigger: 'pending_subscription',
    variables: [],
    preview: false,
    send: 'subscriptions',
  },
  {
    key: 'service_notification',
    version: '1',
    class: 'transactional',
    locales: ['fr', 'en'],
    trigger: 'verified_service_operation',
    variables: [],
    preview: false,
    send: 'messages/transactional',
  },
  {
    key: 'newsletter',
    version: '1',
    class: 'broadcast',
    locales: ['fr', 'en'],
    trigger: 'approved_draft',
    variables: ['subject', 'paragraphs'],
    preview: true,
    send: 'broadcasts/approve',
  },
] as const

/** Catalog/preview do not enqueue, approve, or expose provider configuration. */
export async function handleCatalog(request: Request, env = getServerEnv()) {
  try {
    const credential = bearer(request)
    if (request.method === 'GET') {
      const params = Object.fromEntries(new URL(request.url).searchParams)
      onlyKeys(params, ['business_id'])
      const { business } = authorizeHttp(
        env,
        credential,
        params.business_id,
        'templates_read'
      )
      return json(200, {
        business_id: business.id,
        templates: emailTemplateCatalog,
        capabilities: {
          block_types: ['paragraph'],
          audience_campaigns: true,
          scheduling: true,
          analytics: false,
          arbitrary_html: false,
          provider_credentials: false,
        },
      })
    }
    if (request.method !== 'POST')
      return json(405, { error: { code: 'method_not_allowed' } })
    const body = await readJson(request)
    onlyKeys(body, [
      'business_id',
      'template_key',
      'template_version',
      'locale',
      'subject',
      'paragraphs',
    ])
    const { business } = authorizeHttp(
      env,
      credential,
      body.business_id,
      'templates_read'
    )
    if (
      body.template_version !== '1' ||
      !['fr', 'en'].includes(String(body.locale)) ||
      body.template_key !== 'newsletter'
    )
      throw new EmailHttpError('unsupported_template', 422)
    const fr = body.locale === 'fr'
    const rendered = renderEmail({
      templateKey: 'newsletter',
      locale: fr ? 'fr' : 'en',
      brand: business.brand,
      legalFooter: business.legalFooter,
      subject: body.subject as string,
      paragraphs: body.paragraphs as string[],
      unsubscribeUrl: '{{{ pm:unsubscribe }}}',
    })
    return json(200, {
      business_id: business.id,
      template_key: body.template_key,
      template_version: '1',
      preview_only: true,
      rendered,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      /^invalid_template|unsubscribe_required/.test(error.message)
    )
      return errorResponse(new EmailHttpError('invalid_input', 422))
    return errorResponse(error)
  }
}
