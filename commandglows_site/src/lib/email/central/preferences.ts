import { createHash } from 'node:crypto'
import { getServerEnv } from '../../serverEnv'
import { convexMutation, errorResponse, json, type Mutation } from './api'
import {
  EmailHttpError,
  onlyKeys,
  readBody,
  readJson,
  resolvePreference,
} from './security'
import { escapeHtml } from './templates'

function page(body: string, lang: 'fr' | 'en', status = 200) {
  return new Response(
    `<!doctype html><html lang="${lang}" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${lang === 'fr' ? 'Préférences email' : 'Email preferences'}</title></head><body><main>${body}</main></body></html>`,
    {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy':
          "default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      },
    }
  )
}

/** GET renders an action; automated link scanners must never grant or withdraw consent. */
export async function handlePreferences(
  request: Request,
  env = getServerEnv(),
  injected?: Mutation
) {
  const url = new URL(request.url)
  let lang: 'fr' | 'en' = url.searchParams.get('lang') === 'fr' ? 'fr' : 'en'
  const formRequest = request.headers
    .get('content-type')
    ?.startsWith('application/x-www-form-urlencoded')
  try {
    if (request.method === 'GET') {
      const token = url.searchParams.get('token')
      const parsed = resolvePreference(env.EMAIL_TOKEN_SIGNING_KEY, token)
      const label =
        parsed.action === 'confirm'
          ? lang === 'fr'
            ? 'Confirmer mon inscription'
            : 'Confirm my subscription'
          : lang === 'fr'
            ? 'Me désabonner de ces emails'
            : 'Unsubscribe from these emails'
      return page(
        `<h1>${label}</h1><form method="post"><input type="hidden" name="token" value="${escapeHtml(String(token))}"><input type="hidden" name="lang" value="${lang}"><button type="submit">${label}</button></form>`,
        lang
      )
    }
    if (request.method !== 'POST')
      throw new EmailHttpError('method_not_allowed', 405)
    let body: Record<string, unknown>
    if (formRequest) {
      const origin = request.headers.get('origin')
      if (origin && origin !== url.origin)
        throw new EmailHttpError('invalid_origin', 403)
      body = Object.fromEntries(
        new URLSearchParams(await readBody(request, 2048))
      )
    } else body = await readJson(request, 2048)
    onlyKeys(body, ['token', 'lang'])
    lang = body.lang === 'fr' ? 'fr' : 'en'
    const parsed = resolvePreference(env.EMAIL_TOKEN_SIGNING_KEY, body.token)
    const credential = env.EMAIL_PREFERENCES_CREDENTIAL
    if (!credential || credential.length < 32)
      throw new EmailHttpError('configuration_unavailable', 503)
    const result = await (injected ?? convexMutation(env))('email:command', {
      credential,
      operation: parsed.action,
      idempotencyKey: createHash('sha256')
        .update(`${parsed.action}:${body.token}`)
        .digest('hex'),
      input: { businessId: parsed.businessId, tokenDigest: parsed.tokenDigest },
    })
    if (!formRequest) return json(200, result)
    const text =
      parsed.action === 'confirm'
        ? lang === 'fr'
          ? 'Votre adresse est confirmée. Vous pouvez fermer cette page.'
          : 'Your address is confirmed. You may close this page.'
        : lang === 'fr'
          ? 'Votre désabonnement est enregistré. Vous pouvez fermer cette page.'
          : 'Your unsubscribe request has been recorded. You may close this page.'
    return page(`<h1>${text}</h1>`, lang)
  } catch (error) {
    if (request.method === 'GET' || formRequest) {
      return page(
        `<h1>${lang === 'fr' ? 'Action non effectuée' : 'Action not completed'}</h1><p>${lang === 'fr' ? 'Ce lien est invalide, expiré ou le service est temporairement indisponible. Vous pouvez réessayer ou contacter le service indiqué dans votre email.' : 'This link is invalid, expired, or the service is temporarily unavailable. You can try again or contact the service listed in your email.'}</p>`,
        lang,
        errorResponse(error).status
      )
    }
    return errorResponse(error)
  }
}
