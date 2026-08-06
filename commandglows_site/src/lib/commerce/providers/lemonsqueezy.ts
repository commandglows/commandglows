import type {
  CommerceCheckoutCustomData,
  CommerceCheckoutFailure,
  CommerceCheckoutRequest,
  CommerceCheckoutResult,
  CommerceEnvironment,
  CommerceOffer,
  CommerceNormalizedEvent,
  CommerceProviderId,
  CommerceWebhookParseResult,
  CommerceWebhookPayloadMetadata,
  LemonSqueezyWebhookContext,
} from "../types"
import { getCommerceOffer } from "../offers"

type JsonRecord = Record<string, unknown>
type LemonSqueezyEnv = Record<string, string | undefined>

type CheckoutAttributes = {
  custom_price: null
  product_options: {
    redirect_url: string
  }
  checkout_data: {
    custom: CommerceCheckoutCustomData
    discount_code?: string
    email?: string
    name?: string
  }
}

type CheckoutRelationship = {
  data: {
    type: "stores" | "variants"
    id: string
  }
}

type CheckoutPayload = {
  data: {
    type: "checkouts"
    attributes: CheckoutAttributes
    relationships: {
      store: CheckoutRelationship
      variant: CheckoutRelationship
    }
  }
}

type LemonSqueezyCheckoutConfig = {
  apiUrl: string
  apiKey: string
  storeId: string
  variantId: string
}

type LemonSqueezyCheckoutResponse = {
  data?: {
    id?: string
    attributes?: {
      url?: string
    }
  }
  url?: string
}

type RawLemonSqueezyEvent = {
  data?: {
    attributes?: JsonRecord
    id?: string
  }
  event?: string
  event_name?: string
  event_id?: string
  meta?: {
    event_name?: string
    custom_data?: JsonRecord
  }
}

const KNOWN_EVENTS = new Set(["order_created", "order_refunded"])

export const LEMONSQUEEZY_PROVIDER_ID: CommerceProviderId = "lemonsqueezy"

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toRecord(value: unknown): JsonRecord {
  if (value === null || value === undefined || typeof value !== "object") {
    return {}
  }

  return value as JsonRecord
}

function hasRecordFields(value: JsonRecord): boolean {
  return Object.keys(value).length > 0
}

function toArrayBufferHex(value: ArrayBuffer): string {
  return [...new Uint8Array(value)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function safeMetadata(raw: unknown): CommerceWebhookPayloadMetadata {
  const source = toRecord(raw)
  const normalized: CommerceWebhookPayloadMetadata = {}

  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "string") {
      const parsed = value.trim()
      if (parsed.length > 0) {
        normalized[key] = parsed
      }
      continue
    }

    if (typeof value === "number" || typeof value === "boolean") {
      normalized[key] = String(value)
    }
  }

  return normalized
}

function readSignatureHeader(rawHeader: string | null): string | null {
  if (!rawHeader) return null

  const tokens = rawHeader.split(",").map((segment) => segment.trim())
  for (const token of tokens) {
    const [rawKey, rawValue] = token.split("=")
    const key = rawKey?.trim().toLowerCase()
    const value = rawValue?.trim()

    if (value && key) {
      if (key === "signature" || key === "sha256" || key === "v1") {
        return value
      }
      continue
    }

    if (value) {
      return value
    }

    if (!key && !rawValue && token.length > 0) {
      return token
    }
  }

  const onlyToken = tokens[0]?.trim()
  if (onlyToken) {
    const fallback = onlyToken.split("=").at(-1)
    return fallback && fallback.length > 0 ? fallback : onlyToken
  }

  return null
}

function normalizeWebhookBody(rawBody: string | null): string | null {
  if (!rawBody) return null

  return rawBody.trim().length > 0 ? rawBody : null
}

function parseEnvironment(rawValue: unknown): CommerceEnvironment {
  if (rawValue === true || rawValue === "true") {
    return "sandbox"
  }

  if (rawValue === "test" || rawValue === "sandbox") {
    return "sandbox"
  }

  return "production"
}

function decodeHex(value: string): Uint8Array {
  const normalized = value.toLowerCase().trim()
  if (normalized.length % 2 !== 0) {
    return new Uint8Array()
  }

  const bytes = new Uint8Array(normalized.length / 2)
  for (let i = 0; i < normalized.length; i += 2) {
    const pair = normalized.slice(i, i + 2)
    const parsed = Number.parseInt(pair, 16)
    if (Number.isNaN(parsed)) {
      return new Uint8Array()
    }

    bytes[i / 2] = parsed
  }

  return bytes
}

function safeSignatureEqual(expectedHex: string, candidate: string): boolean {
  const expected = decodeHex(expectedHex)
  const actual = decodeHex(candidate)

  if (expected.length === 0 || actual.length === 0) {
    return false
  }

  if (expected.length !== actual.length) {
    return false
  }

  let mismatch = 0
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected[i] ^ actual[i]
  }

  return mismatch === 0
}

function normalizeOfferPayloadMetadata(raw: JsonRecord): CommerceWebhookPayloadMetadata {
  return safeMetadata(raw)
}

function getWebhookCustomData(
  body: RawLemonSqueezyEvent,
  attributes: JsonRecord
): JsonRecord {
  const metaCustom = toRecord(body.meta?.custom_data)
  if (hasRecordFields(metaCustom)) {
    return metaCustom
  }

  return toRecord(toRecord(attributes.checkout_data).custom)
}

function buildCheckoutCustomData(
  offer: CommerceOffer,
  request: Omit<CommerceCheckoutRequest, "offerId">
): CommerceCheckoutCustomData {
  return {
    offer_id: offer.id,
    offer_name: offer.description,
    product_id: offer.productId,
    plan: offer.plan,
    source: request.metadata?.source ?? "direct",
    source_ref: request.metadata?.source_ref || request.idempotencyHint || offer.id,
    global_user_id: request.metadata?.global_user_id,
    provider_account_id: request.metadata?.provider_account_id,
    provider: LEMONSQUEEZY_PROVIDER_ID,
    identity_token: request.metadata?.identity_token,
  }
}

function buildCheckoutPayload(
  request: Omit<CommerceCheckoutRequest, "offerId">,
  config: LemonSqueezyCheckoutConfig,
  checkoutData: CommerceCheckoutCustomData,
  successUrl: string
): CheckoutPayload {
  return {
    data: {
      type: "checkouts",
      attributes: {
        custom_price: null,
        product_options: {
          redirect_url: successUrl,
        },
        checkout_data: {
          custom: checkoutData,
          discount_code: request.discountCode,
          email: request.customerEmail,
          name: request.customerName,
        },
      },
      relationships: {
        store: {
          data: {
            type: "stores",
            id: config.storeId,
          },
        },
        variant: {
          data: {
            type: "variants",
            id: config.variantId,
          },
        },
      },
    },
  }
}

function coerceCheckoutUrl(payload: unknown): string | null {
  const responseData = toRecord(toRecord(payload).data)
  const attrs = toRecord(responseData.attributes)
  return (
    toNonEmptyString(toRecord(attrs).url as string) ||
    toNonEmptyString(responseData.url as string)
  )
}

export function getLemonSqueezyCheckoutConfig(
  env: LemonSqueezyEnv,
  offerId = "communityglows/lifetime_deal"
): LemonSqueezyCheckoutConfig | null {
  const apiKey = toNonEmptyString(env.LEMONSQUEEZY_API_KEY)
  const storeId = toNonEmptyString(env.LEMONSQUEEZY_STORE_ID)
  const variantId = toNonEmptyString(resolveLemonSqueezyVariantId(env, offerId))

  if (!apiKey || !storeId || !variantId) {
    return null
  }

  const apiUrl = toNonEmptyString(env.LEMONSQUEEZY_API_URL) ?? "https://api.lemonsqueezy.com"

  return {
    apiUrl,
    apiKey,
    storeId,
    variantId,
  }
}

function resolveLemonSqueezyVariantId(
  env: LemonSqueezyEnv,
  offerId: string
): string | undefined {
  if (offerId === "communityglows/lifetime_deal") {
    return env.LEMONSQUEEZY_COMMUNITYGLOWS_LIFETIME_DEAL_VARIANT_ID
  }
  if (offerId === "commandglows_app/focus") {
    return env.LEMONSQUEEZY_COMMANDGLOWS_APP_FOCUS_VARIANT_ID
  }
  if (offerId === "commandglows_app/power") {
    return env.LEMONSQUEEZY_COMMANDGLOWS_APP_POWER_VARIANT_ID
  }
  if (offerId === "commandglows_app/control") {
    return env.LEMONSQUEEZY_COMMANDGLOWS_APP_CONTROL_VARIANT_ID
  }
  if (offerId === "commandglows_app/command") {
    return env.LEMONSQUEEZY_COMMANDGLOWS_APP_COMMAND_VARIANT_ID
  }
  return undefined
}

export function getLemonSqueezyWebhookSecret(
  env: LemonSqueezyEnv
): string | null {
  return toNonEmptyString(env.LEMONSQUEEZY_WEBHOOK_SECRET)
}

function resolveHeaderEventName(
  body: RawLemonSqueezyEvent,
  eventName: string | null | undefined
) {
  return (
    toNonEmptyString(eventName) ||
    toNonEmptyString(body.event_name) ||
    toNonEmptyString(body.event) ||
    toNonEmptyString(body.meta?.event_name)
  )
}

export async function createLemonSqueezyCheckout(
  request: Omit<CommerceCheckoutRequest, "offerId">,
  offerId: string,
  env: LemonSqueezyEnv
): Promise<CommerceCheckoutResult | CommerceCheckoutFailure> {
  const offer = getCommerceOffer(offerId)
  if (!offer) {
    return {
      ok: false,
      code: "offer_not_found",
      message: `Commerce offer ${offerId} is not configured`,
    }
  }

  const providerConfig = getLemonSqueezyCheckoutConfig(env, offerId)
  if (!providerConfig) {
    return {
      ok: false,
      code: "missing_env",
      message: "Missing Lemon Squeezy checkout configuration",
    }
  }

  const successUrl = request.successUrl
  const cancelUrl = request.cancelUrl
  if (!successUrl || !cancelUrl) {
    return {
      ok: false,
      code: "bad_request",
      message: "Missing checkout redirect URLs",
    }
  }

  const customData = buildCheckoutCustomData(offer, request)
  const payload = buildCheckoutPayload(
    request,
    providerConfig,
    customData,
    successUrl
  )

  let response: Response
  try {
    response = await fetch(`${providerConfig.apiUrl}/v1/checkouts`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${providerConfig.apiKey}`,
      },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    console.error("Lemon Squeezy checkout request failed:", error)
    return {
      ok: false,
      code: "provider_error",
      message: "Unable to reach Lemon Squeezy checkout endpoint",
    }
  }

  if (!response.ok) {
    const text = await response.text()
    return {
      ok: false,
      code: "provider_error",
      message: text || "Lemon Squeezy checkout creation failed",
    }
  }

  const checkoutPayload: LemonSqueezyCheckoutResponse = await response.json()
  const checkoutUrl = coerceCheckoutUrl(checkoutPayload)
  if (!checkoutUrl) {
    return {
      ok: false,
      code: "provider_error",
      message: "Lemon Squeezy response did not include a checkout URL",
    }
  }

  return {
    ok: true,
    provider: LEMONSQUEEZY_PROVIDER_ID,
    checkoutUrl,
    providerOrderId: toNonEmptyString(checkoutPayload.data?.id) ?? undefined,
    providerEventId: toNonEmptyString(checkoutPayload.data?.id) ?? undefined,
  }
}

export async function parseLemonSqueezyWebhook(
  context: LemonSqueezyWebhookContext
): Promise<CommerceWebhookParseResult> {
  const parsedBody = normalizeWebhookBody(context.rawBody)
  if (!parsedBody) {
    return {
      ok: false,
      ignored: false,
      reason: "invalid_payload",
      message: "Missing webhook body",
      status: 400,
    }
  }

  let body: RawLemonSqueezyEvent
  try {
    body = JSON.parse(parsedBody)
  } catch {
    return {
      ok: false,
      ignored: false,
      reason: "invalid_payload",
      message: "Webhook body is not valid JSON",
      status: 400,
    }
  }

  const eventName = resolveHeaderEventName(body, context.eventName)
  if (!eventName || !KNOWN_EVENTS.has(eventName)) {
    return {
      ok: false,
      ignored: true,
      reason: "ignored_event",
      eventType: eventName || "unknown",
      message: "Webhook event not supported",
      status: 200,
    }
  }

  const signature = readSignatureHeader(context.signature)
  if (!signature) {
    return {
      ok: false,
      ignored: false,
      reason: "invalid_signature",
      message: "Webhook signature missing",
      status: 403,
    }
  }

  const webhookSecret = toNonEmptyString(context.webhookSecret)
  if (!webhookSecret) {
    return {
      ok: false,
      ignored: false,
      reason: "invalid_signature",
      message: "Webhook secret missing",
      status: 500,
    }
  }

  let expectedDigest: string
  try {
    expectedDigest = toArrayBufferHex(
      await crypto.subtle.sign(
        "HMAC",
        await crypto.subtle.importKey(
          "raw",
          new TextEncoder().encode(webhookSecret),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        ),
        new TextEncoder().encode(parsedBody)
      )
    )
  } catch {
    return {
      ok: false,
      ignored: false,
      reason: "invalid_signature",
      message: "Webhook signature verification failed",
      status: 500,
    }
  }

  if (!safeSignatureEqual(expectedDigest, signature)) {
    return {
      ok: false,
      ignored: false,
      reason: "invalid_signature",
      message: "Webhook signature mismatch",
      status: 403,
    }
  }

  const order = toRecord(body.data)
  const attributes = toRecord(order.attributes)
  const rawCustom = getWebhookCustomData(body, attributes)
  const normalizedMetadata = normalizeOfferPayloadMetadata(rawCustom)

  const providerOrderId =
    toNonEmptyString(order.id) ||
    toNonEmptyString(attributes.order_id) ||
    toNonEmptyString(attributes.id)

  if (!providerOrderId) {
    return {
      ok: false,
      ignored: false,
      reason: "invalid_payload",
      message: "Webhook order id missing",
      status: 400,
    }
  }

  const offerId = toNonEmptyString(normalizedMetadata.offer_id) ?? "unknown"
  const offer = getCommerceOffer(offerId)
  const productId = toNonEmptyString(normalizedMetadata.product_id) ?? "unknown"
  const plan = toNonEmptyString(normalizedMetadata.plan) ?? "unknown"
  const supportedOffer =
    Boolean(offer) && offer?.productId === productId && offer?.plan === plan

  const providerEventId =
    toNonEmptyString(context.eventId) ||
    toNonEmptyString(body.event_id) ||
    providerOrderId
  const eventType = supportedOffer
    ? eventName === "order_refunded"
      ? "refunded"
      : "paid"
    : "pending_review"
  const firstOrderItem = toRecord(attributes.first_order_item)
  const environment = parseEnvironment(
    attributes.test_mode ?? firstOrderItem.test_mode
  )
  const providerCustomerId = toNonEmptyString(attributes.customer_id)

  const normalizedEvent: CommerceNormalizedEvent = {
    provider: LEMONSQUEEZY_PROVIDER_ID,
    offerId,
    productId,
    plan,
    eventType,
    environment,
    providerEventId,
    providerOrderId,
    idempotencyKey: `lemonsqueezy:${eventName}:${providerEventId}:${providerOrderId}`,
    status: supportedOffer ? "applied" : "pending_review",
    customerEmail:
      toNonEmptyString(attributes.customer_email) ??
      toNonEmptyString(attributes.user_email) ??
      undefined,
    providerCustomerId: providerCustomerId ?? undefined,
    globalUserId: toNonEmptyString(normalizedMetadata.global_user_id) ?? undefined,
    sourceRef: toNonEmptyString(normalizedMetadata.source_ref) || providerOrderId,
    providerSourceRef: toNonEmptyString(normalizedMetadata.source_ref) || providerOrderId,
    providerInvoiceId: toNonEmptyString(attributes.invoice_id) ?? undefined,
    metadata: {
      ...safeMetadata(normalizedMetadata),
      offer_id: offerId,
      product_id: productId,
      plan,
      source: normalizedMetadata.source || "direct",
      source_ref: normalizedMetadata.source_ref || providerOrderId,
      global_user_id: normalizedMetadata.global_user_id,
      provider_account_id: normalizedMetadata.provider_account_id,
    },
  }

  return {
    ok: true,
    parsed: true,
    ignored: false,
    normalizedEvent,
  }
}
