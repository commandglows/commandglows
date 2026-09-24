import { ConvexError } from 'convex/values'
import type { DeliveryConfig } from './emailTransportConfig/types'
import { getTransportDescriptor } from './emailTransportConfig/registry'
import {
  normalizeBusinessDelivery,
  legacyRoutingIdentity,
} from './emailTransportConfig/legacy'
export type EmailConfig = {
  environment: 'sandbox' | 'production'
  clients: {
    id: string
    credentialEnv: string
    businessIds: string[]
    operations: string[]
  }[]
  businesses: {
    id: string
    brand: string
    legalFooter: string
    from: string
    delivery: DeliveryConfig
    publicBaseUrl?: string
    audiences: {
      id: string
      purpose: string
      sources: string[]
      noticeVersions: string[]
    }[]
    liveTest?: {
      id: string
      expiresAt: number
      maxAttempts: number
      recipients: string[]
    }
    activated?: boolean
    campaignPreflightRequired?: boolean
    retentionDays?: number
    allowedRecipients?: string[]
  }[]
}
export function fail(code: string): never {
  throw new ConvexError({ code })
}
export function parseEmailConfig(raw: string | undefined): EmailConfig {
  try {
    const c = JSON.parse(raw || '')
    if (
      !['sandbox', 'production'].includes(c.environment) ||
      !Array.isArray(c.clients) ||
      !Array.isArray(c.businesses)
    )
      fail('configuration_unavailable')
    c.businesses = c.businesses.map((b: any) =>
      normalizeBusinessDelivery(b, c.environment)
    )
    for (const b of c.businesses) {
      if (
        !b.id ||
        !b.from ||
        !b.brand ||
        !b.legalFooter ||
        !Array.isArray(b.audiences)
      )
        fail('configuration_unavailable')
      if (
        b.allowedRecipients !== undefined &&
        (!Array.isArray(b.allowedRecipients) ||
          b.allowedRecipients.some(
            (email: unknown) => normalizeEmail(email) !== email
          ))
      )
        fail('configuration_unavailable')
      const d = b.delivery
      if (
        !d ||
        typeof d.provider !== 'string' ||
        !['capture', 'sandbox', 'live'].includes(d.mode) ||
        !d.channels ||
        typeof d.channels.transactional !== 'string' ||
        !d.channels.transactional ||
        typeof d.channels.broadcast !== 'string' ||
        !d.channels.broadcast ||
        !d.options ||
        typeof d.options !== 'object' ||
        Array.isArray(d.options)
      )
        fail('configuration_unavailable')
      getTransportDescriptor(d.provider).validate(d)
      if (b.liveTest !== undefined) {
        const p = b.liveTest
        if (
          !p ||
          !/^[a-zA-Z0-9_-]{1,80}$/.test(p.id) ||
          !Number.isSafeInteger(p.expiresAt) ||
          !Number.isSafeInteger(p.maxAttempts) ||
          p.maxAttempts < 1 ||
          !Array.isArray(p.recipients) ||
          p.recipients.length < 1 ||
          p.recipients.some((email: unknown) => normalizeEmail(email) !== email)
        )
          fail('configuration_unavailable')
      }
      if (b.publicBaseUrl !== undefined) {
        const url = new URL(b.publicBaseUrl)
        if (
          url.protocol !== 'https:' ||
          url.username ||
          url.password ||
          url.search ||
          url.hash
        )
          fail('configuration_unavailable')
      }
      if (
        new Set(b.audiences.map((a: any) => a.purpose)).size > 1 ||
        new Set(b.audiences.map((a: any) => a.id)).size !== b.audiences.length
      )
        fail('configuration_unavailable')
      if (
        b.activated &&
        (!Number.isInteger(b.retentionDays) || b.retentionDays < 1)
      )
        fail('configuration_unavailable')
      if (
        b.campaignPreflightRequired !== undefined &&
        typeof b.campaignPreflightRequired !== 'boolean'
      )
        fail('configuration_unavailable')
      for (const a of b.audiences)
        if (
          !a.id ||
          !a.purpose ||
          !Array.isArray(a.sources) ||
          !Array.isArray(a.noticeVersions)
        )
          fail('configuration_unavailable')
    }
    for (const client of c.clients)
      if (
        !client.id ||
        !/^EMAIL_[A-Z0-9_]+$/.test(client.credentialEnv) ||
        !Array.isArray(client.businessIds) ||
        !Array.isArray(client.operations)
      )
        fail('configuration_unavailable')
    if (
      new Set(c.businesses.map((b: any) => b.id)).size !== c.businesses.length
    )
      fail('configuration_unavailable')
    const resources = c.businesses.flatMap(
      (b: EmailConfig['businesses'][number]) =>
        getTransportDescriptor(b.delivery.provider).resourceKeys(b.delivery)
    )
    if (new Set(resources).size !== resources.length)
      fail('configuration_unavailable')
    if (
      new Set(c.clients.map((client: any) => client.id)).size !==
      c.clients.length
    )
      fail('configuration_unavailable')
    return c
  } catch {
    return fail('configuration_unavailable')
  }
}
export function authorize(
  credential: string,
  businessId: string,
  operation: string
) {
  const config = parseEmailConfig(process.env.EMAIL_CONTROL_CONFIG)
  const client = config.clients.find((c) => {
    const secret = process.env[c.credentialEnv]
    if (!secret || secret.length < 32 || secret.length !== credential.length)
      return false
    let difference = 0
    for (let n = 0; n < secret.length; n++)
      difference |= secret.charCodeAt(n) ^ credential.charCodeAt(n)
    return difference === 0
  })
  if (
    !client ||
    !client.businessIds.includes(businessId) ||
    !client.operations.includes(operation)
  )
    fail('forbidden')
  const business = config.businesses.find((b) => b.id === businessId)
  if (!business) fail('forbidden')
  return { config, client, business }
}
export function normalizeEmail(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value.length > 254 ||
    /[\u0000-\u001f\u007f]/.test(value)
  )
    fail('invalid_input')
  const parts = value.trim().toLowerCase().split('@')
  if (parts.length !== 2) fail('invalid_input')
  const [local, domain] = parts
  if (
    !local ||
    local.length > 64 ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local) ||
    local.startsWith('.') ||
    local.endsWith('.') ||
    local.includes('..') ||
    !domain ||
    /[\s\/#?:@\\]/.test(domain)
  )
    fail('invalid_input')
  let asciiDomain: string
  try {
    asciiDomain = new URL(`https://${domain}`).hostname
  } catch {
    return fail('invalid_input')
  }
  if (
    !asciiDomain.includes('.') ||
    asciiDomain.length > 253 ||
    asciiDomain
      .split('.')
      .some(
        (label) =>
          !label ||
          label.length > 63 ||
          !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
      )
  )
    fail('invalid_input')
  const email = `${local}@${asciiDomain}`
  if (email.length > 254) fail('invalid_input')
  return email
}
export function canonical(value: any): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.keys(value)
        .sort()
        .map((k) => JSON.stringify(k) + ':' + canonical(value[k]))
        .join(',') +
      '}'
    )
  return JSON.stringify(value)
}

/** Non-secret routing contract shared by the worker and transactional control plane. */
export function deliveryRoute(
  config: EmailConfig,
  business: EmailConfig['businesses'][number]
) {
  const delivery =
    business.delivery ??
    (normalizeBusinessDelivery(business, config.environment)
      .delivery as DeliveryConfig)
  return canonical({
    environment: config.environment,
    ...(legacyRoutingIdentity(delivery) ??
      getTransportDescriptor(delivery.provider).routingIdentity(delivery)),
    from: business.from,
    liveTest: business.liveTest ?? null,
  })
}
export function requiresLiveTest(
  config: EmailConfig,
  business: EmailConfig['businesses'][number]
) {
  const delivery =
    business.delivery ??
    (normalizeBusinessDelivery(business, config.environment)
      .delivery as DeliveryConfig)
  return (
    config.environment === 'sandbox' &&
    getTransportDescriptor(delivery.provider).capabilities.externalDelivery &&
    delivery.mode === 'live'
  )
}
export function dispatchAllowed(
  config: EmailConfig,
  business: EmailConfig['businesses'][number],
  email: string,
  kind: string,
  now: number
) {
  if (!business.activated || !business.allowedRecipients?.includes(email))
    return false
  if (!requiresLiveTest(config, business)) return true
  const profile = business.liveTest
  return Boolean(
    profile &&
    profile.expiresAt > now &&
    profile.recipients.includes(email) &&
    kind === 'operator'
  )
}

/** Server-only operator routing; caller payloads cannot select a destination. */
export function commerceOperatorConfig(environment: string) {
  const config = parseEmailConfig(process.env.EMAIL_CONTROL_CONFIG)
  let route: { businessId: string; recipient: string; locale: 'fr' | 'en' }
  try {
    route = JSON.parse(process.env.COMMERCE_ALERT_EMAIL_CONFIG || '')
  } catch {
    return fail('configuration_unavailable')
  }
  const business = config.businesses.find((b) => b.id === route?.businessId)
  if (
    config.environment !== environment ||
    !business ||
    !['fr', 'en'].includes(route.locale) ||
    normalizeEmail(route.recipient) !== route.recipient ||
    !dispatchAllowed(config, business, route.recipient, 'operator', Date.now())
  )
    fail('configuration_unavailable')
  return { config, business, recipient: route.recipient, locale: route.locale }
}
