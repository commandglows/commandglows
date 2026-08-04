export type CommerceProviderId = "lemonsqueezy" | "polar" | "custom"

export type CommerceOfferId = `${string}/${string}`

export type CommerceOffer = {
  id: CommerceOfferId
  productId: string
  plan: string
  sources: readonly string[]
  providers: readonly CommerceProviderId[]
  successPath: string
  cancelPath: string
  description?: string
}

export type CommerceEnvironment = "production" | "sandbox" | "development"

export type CommerceProviderName =
  | "lemonsqueezy"
  | "polar"
  | "custom"

export type CommerceCheckoutErrorContext =
  | "offer"
  | "provider"
  | "webhook"
  | "environment"
  | "identity"

export type CommerceCheckoutFailureCode =
  | "provider_not_configured"
  | "provider_error"
  | "bad_request"
  | "missing_env"
  | "offer_not_found"
  | "invalid_provider"

export type CommerceCheckoutCustomData = {
  offer_id: string
  offer_name?: string
  plan?: string
  product_id?: string
  source?: string
  source_ref?: string
  global_user_id?: string
  provider_account_id?: string
  provider?: string
  identity_token?: string
}

export type CommerceCheckoutRequest = {
  offerId: string
  provider?: CommerceProviderId
  successUrl?: string
  cancelUrl?: string
  discountCode?: string
  metadata?: CommerceCheckoutCustomData
  customerEmail?: string
  customerName?: string
  idempotencyHint?: string
}

export type CommerceCheckoutResult = {
  ok: true
  provider: CommerceProviderId
  checkoutUrl: string
  providerOrderId?: string
  providerEventId?: string
}

export type CommerceCheckoutFailure = {
  ok: false
  code: CommerceCheckoutFailureCode | "provider_unavailable"
  message: string
}

export type CommerceCheckoutResponse =
  | CommerceCheckoutResult
  | CommerceCheckoutFailure

export type CommerceWebhookPayloadMetadata = Record<string, string>

export type CommerceWebhookParseStatus = "ignored" | "pending_review" | "applied"

export type CommerceWebhookEventType =
  | "paid"
  | "refunded"
  | "revoked"
  | "pending_review"
  | "ignored"

export type CommerceNormalizedEvent = {
  provider: CommerceProviderId
  offerId: string
  productId: string
  plan: string
  eventType: CommerceWebhookEventType
  environment: CommerceEnvironment
  providerEventId: string
  providerOrderId: string
  idempotencyKey: string
  status: CommerceWebhookParseStatus
  customerEmail?: string
  providerCustomerId?: string
  globalUserId?: string
  sourceRef?: string
  providerSourceRef?: string
  providerInvoiceId?: string
  metadata: CommerceWebhookPayloadMetadata
}

export type CommerceWebhookParseResult =
  | {
      ok: true
      parsed: true
      ignored: false
      normalizedEvent: CommerceNormalizedEvent
    }
  | {
      ok: false
      ignored: false
      reason:
        | "invalid_provider"
        | "invalid_signature"
        | "invalid_payload"
        | "invalid_event"
      message: string
      eventType?: string
      status: number
    }
  | {
      ok: false
      ignored: true
      reason:
        | "ignored_event"
        | "invalid_provider"
        | "invalid_signature"
        | "invalid_payload"
        | "invalid_event"
      message: string
      eventType?: string
      status: number
    }

export type CommerceFulfillmentStatus =
  | "granted"
  | "revoked"
  | "pending_review"
  | "ignored"

export type CommerceFulfillmentResult = {
  ok: true
  status: CommerceFulfillmentStatus
  globalUserId?: string
  alreadyProcessed: boolean
  reason?: string
}

export type CommerceFulfillmentFailure = {
  ok: false
  code:
    | "invalid_offer"
    | "missing_identity"
    | "invalid_environment"
    | "duplicate_event"
    | "provider_error"
  message: string
  status: CommerceFulfillmentStatus
}

export type CommerceFulfillmentResponse =
  | CommerceFulfillmentResult
  | CommerceFulfillmentFailure

export type CommerceProviderConfig = {
  provider: CommerceProviderId
  productId?: string
  variantId?: string
  storeId?: string
}

export type LemonSqueezyWebhookContext = {
  rawBody: string
  signature: string
  eventName?: string
  eventId?: string
  webhookSecret?: string
}

export type CommerceWebhookContext = {
  rawBody: string
  signature: string
  eventName?: string
  eventId?: string
  webhookSecret?: string
}
