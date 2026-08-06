import { vi, expect, test, describe, beforeEach, afterEach } from 'vitest'
import {
  createLemonSqueezyCheckout,
  parseLemonSqueezyWebhook,
  getLemonSqueezyCheckoutConfig,
} from '@/lib/commerce/providers/lemonsqueezy'

function toHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

async function signWebhook(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)))
}

describe('lemonsqueezy adapter', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  function withEnv(vars: Record<string, string | undefined>, test: () => Promise<void> | void) {
    const previous = { ...process.env }
    Object.assign(process.env, vars)
    return Promise.resolve(test()).finally(() => {
      process.env = previous as NodeJS.ProcessEnv
    })
  }

  test('returns config when env is available', () => {
    expect(
      getLemonSqueezyCheckoutConfig({
        LEMONSQUEEZY_API_KEY: 'api-key',
        LEMONSQUEEZY_STORE_ID: 'store-id',
        LEMONSQUEEZY_COMMUNITYGLOWS_LIFETIME_DEAL_VARIANT_ID: 'variant-id',
        LEMONSQUEEZY_API_URL: 'https://api.lemonsqueezy.test',
      })
    ).toEqual({
      apiUrl: 'https://api.lemonsqueezy.test',
      apiKey: 'api-key',
      storeId: 'store-id',
      variantId: 'variant-id',
    })
  })

  test('returns CommandGlows founder config for the requested offer', () => {
    expect(
      getLemonSqueezyCheckoutConfig(
        {
          LEMONSQUEEZY_API_KEY: 'api-key',
          LEMONSQUEEZY_STORE_ID: 'store-id',
          LEMONSQUEEZY_COMMANDGLOWS_APP_POWER_VARIANT_ID: 'commandglows-power-variant',
        },
        'commandglows_app/power'
      )
    ).toEqual({
      apiUrl: 'https://api.lemonsqueezy.com',
      apiKey: 'api-key',
      storeId: 'store-id',
      variantId: 'commandglows-power-variant',
    })
  })

  test('fails checkout if config is missing', async () => {
    const result = await createLemonSqueezyCheckout(
      {
        offerId: 'communityglows/lifetime_deal',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        metadata: {
          offer_id: 'communityglows/lifetime_deal',
          product_id: 'communityglows',
          plan: 'lifetime_deal',
        },
      },
      'communityglows/lifetime_deal',
      {}
    )

    expect(result.ok).toBe(false)
    expect((result as { code: string }).code).toBe('missing_env')
  })

  test('creates lemonsqueezy checkout and returns hosted URL', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            data: { id: 'co_123', attributes: { url: 'https://checkout.test/order' } },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        ) as unknown as Response
      ) as typeof fetch

    const result = await withEnv(
      {
        LEMONSQUEEZY_API_KEY: 'api-key',
        LEMONSQUEEZY_STORE_ID: 'store-id',
        LEMONSQUEEZY_COMMUNITYGLOWS_LIFETIME_DEAL_VARIANT_ID: 'variant-id',
      },
      () =>
        createLemonSqueezyCheckout(
          {
            offerId: 'communityglows/lifetime_deal',
            successUrl: 'https://communityglows.com/purchase/success',
            cancelUrl: 'https://communityglows.com/purchase/cancel',
            metadata: { offer_id: 'communityglows/lifetime_deal' },
          },
          'communityglows/lifetime_deal',
          {
            LEMONSQUEEZY_API_KEY: 'api-key',
            LEMONSQUEEZY_STORE_ID: 'store-id',
            LEMONSQUEEZY_COMMUNITYGLOWS_LIFETIME_DEAL_VARIANT_ID: 'variant-id',
          }
        )
    )

    expect(result).toEqual({
      ok: true,
      provider: 'lemonsqueezy',
      checkoutUrl: 'https://checkout.test/order',
      providerOrderId: 'co_123',
      providerEventId: 'co_123',
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.lemonsqueezy.com/v1/checkouts',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"product_options":{"redirect_url":"https://communityglows.com/purchase/success"}'),
      })
    )
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]?.body).not.toContain('success_url')
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]?.body).not.toContain('cancel_url')
  })

  test('creates CommandGlows checkout with CommandGlows variant metadata', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            data: { id: 'co_wfz', attributes: { url: 'https://checkout.test/commandglows' } },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        ) as unknown as Response
      ) as typeof fetch

    const result = await createLemonSqueezyCheckout(
          {
            offerId: 'commandglows_app/power',
            successUrl: 'https://commandglows.com/purchase/success?offerId=commandglows_app%2Fpower',
            cancelUrl: 'https://commandglows.com/purchase/cancel?offerId=commandglows_app%2Fpower',
            discountCode: 'FOUNDER',
            metadata: { offer_id: 'commandglows_app/power' },
          },
      'commandglows_app/power',
      {
        LEMONSQUEEZY_API_KEY: 'api-key',
        LEMONSQUEEZY_STORE_ID: 'store-id',
        LEMONSQUEEZY_COMMANDGLOWS_APP_POWER_VARIANT_ID: 'commandglows-power-variant',
      }
    )

    expect(result).toMatchObject({
      ok: true,
      provider: 'lemonsqueezy',
      checkoutUrl: 'https://checkout.test/commandglows',
    })

    const body = String((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]?.body)
    expect(body).toContain('"id":"commandglows-power-variant"')
    expect(body).toContain('"offer_id":"commandglows_app/power"')
    expect(body).toContain('"product_id":"commandglows_app"')
    expect(body).toContain('"plan":"power"')
    expect(body).toContain('"discount_code":"FOUNDER"')
  })

  test('validates order_created webhook signature and normalizes paid event', async () => {
    const payload = {
      data: {
        id: 'ord_123',
        attributes: {
          customer_id: 'cus_456',
          user_email: 'buyer@example.com',
          test_mode: true,
          invoice_id: 'inv_abc',
        },
      },
      event_id: 'evt_123',
      meta: {
        custom_data: {
          offer_id: 'communityglows/lifetime_deal',
          product_id: 'communityglows',
          plan: 'lifetime_deal',
          source: 'direct',
          source_ref: 'src_1',
          global_user_id: 'gu_789',
        },
      },
    }
    const rawBody = JSON.stringify({ ...payload, event_name: 'order_created' })
    const signature = await signWebhook(rawBody, 'webhook-secret')

    const parsed = await parseLemonSqueezyWebhook({
      rawBody,
      signature,
      eventName: 'order_created',
      webhookSecret: 'webhook-secret',
      eventId: 'evt_123',
    })

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      throw new Error('parse failed')
    }

    expect(parsed.normalizedEvent).toMatchObject({
      provider: 'lemonsqueezy',
      eventType: 'paid',
      offerId: 'communityglows/lifetime_deal',
      productId: 'communityglows',
      plan: 'lifetime_deal',
      environment: 'sandbox',
      providerOrderId: 'ord_123',
      providerCustomerId: 'cus_456',
    })
    expect(parsed.normalizedEvent.idempotencyKey).toBe(
      'lemonsqueezy:order_created:evt_123:ord_123'
    )
  })

  test('rejects invalid webhook signature', async () => {
    const rawBody = JSON.stringify({ event_name: 'order_created' })
    const parsed = await parseLemonSqueezyWebhook({
      rawBody,
      signature: 'bad-signature',
      eventName: 'order_created',
      webhookSecret: 'webhook-secret',
    })

    expect(parsed.ok).toBe(false)
    expect(parsed.reason).toBe('invalid_signature')
  })

  test('marks signed webhooks without CommunityGlows custom data as pending review', async () => {
    const rawBody = JSON.stringify({
      data: {
        id: 'ord_other',
        attributes: {
          user_email: 'buyer@example.com',
          first_order_item: { test_mode: true },
        },
      },
      event_id: 'evt_other',
      event_name: 'order_created',
    })
    const signature = await signWebhook(rawBody, 'webhook-secret')

    const parsed = await parseLemonSqueezyWebhook({
      rawBody,
      signature,
      eventName: 'order_created',
      webhookSecret: 'webhook-secret',
    })

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      throw new Error('parse failed')
    }

    expect(parsed.normalizedEvent).toMatchObject({
      eventType: 'pending_review',
      status: 'pending_review',
      offerId: 'unknown',
      productId: 'unknown',
      plan: 'unknown',
      customerEmail: 'buyer@example.com',
      environment: 'sandbox',
    })
  })

  test('normalizes order_refunded webhooks as refunded events', async () => {
    const rawBody = JSON.stringify({
      data: {
        id: 'ord_refunded',
        attributes: {
          customer_id: 'cus_refunded',
          user_email: 'buyer@example.com',
          first_order_item: { test_mode: true },
        },
      },
      event_id: 'evt_refunded',
      event_name: 'order_refunded',
      meta: {
        custom_data: {
          offer_id: 'communityglows/lifetime_deal',
          product_id: 'communityglows',
          plan: 'lifetime_deal',
          source: 'direct',
          source_ref: 'src_refunded',
        },
      },
    })
    const signature = await signWebhook(rawBody, 'webhook-secret')

    const parsed = await parseLemonSqueezyWebhook({
      rawBody,
      signature,
      eventName: 'order_refunded',
      webhookSecret: 'webhook-secret',
    })

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      throw new Error('parse failed')
    }

    expect(parsed.normalizedEvent).toMatchObject({
      eventType: 'refunded',
      status: 'applied',
      providerOrderId: 'ord_refunded',
      providerCustomerId: 'cus_refunded',
      sourceRef: 'src_refunded',
    })
    expect(parsed.normalizedEvent.idempotencyKey).toBe(
      'lemonsqueezy:order_refunded:evt_refunded:ord_refunded'
    )
  })

  test('validates CommandGlows order_created webhook as paid event', async () => {
    const rawBody = JSON.stringify({
      data: {
        id: 'ord_wfz',
        attributes: {
          customer_id: 'cus_wfz',
          user_email: 'buyer@example.com',
          first_order_item: { test_mode: true },
        },
      },
      event_id: 'evt_wfz',
      event_name: 'order_created',
      meta: {
        custom_data: {
          offer_id: 'commandglows_app/power',
          product_id: 'commandglows_app',
          plan: 'power',
          source: 'direct',
          source_ref: '/commandglows-founder',
        },
      },
    })
    const signature = await signWebhook(rawBody, 'webhook-secret')

    const parsed = await parseLemonSqueezyWebhook({
      rawBody,
      signature,
      eventName: 'order_created',
      webhookSecret: 'webhook-secret',
    })

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      throw new Error('parse failed')
    }

    expect(parsed.normalizedEvent).toMatchObject({
      eventType: 'paid',
      status: 'applied',
      offerId: 'commandglows_app/power',
      productId: 'commandglows_app',
      plan: 'power',
      providerOrderId: 'ord_wfz',
    })
  })

  test('verifies webhook signatures against the exact raw body', async () => {
    const rawBody = `${JSON.stringify({
      data: {
        id: 'ord_whitespace',
        attributes: {
          first_order_item: { test_mode: true },
        },
      },
      event_id: 'evt_whitespace',
      event_name: 'order_created',
      meta: {
        custom_data: {
          offer_id: 'communityglows/lifetime_deal',
          product_id: 'communityglows',
          plan: 'lifetime_deal',
        },
      },
    })}\n`
    const signature = await signWebhook(rawBody, 'webhook-secret')

    const parsed = await parseLemonSqueezyWebhook({
      rawBody,
      signature,
      eventName: 'order_created',
      webhookSecret: 'webhook-secret',
    })

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      throw new Error('parse failed')
    }

    expect(parsed.normalizedEvent.providerOrderId).toBe('ord_whitespace')
  })
})
