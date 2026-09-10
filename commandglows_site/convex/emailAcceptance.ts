import { internalMutation } from './_generated/server'
import { v } from 'convex/values'
import {
  authorize,
  deliveryRoute,
  dispatchAllowed,
  fail,
  requiresLiveTest,
} from './emailConfig'
import { renderEmail } from '../src/lib/email/central/templates'

/** Explicit, internal-only acceptance command. No incident or customer event is fabricated. */
export const enqueue = internalMutation({
  args: { credential: v.string(), businessId: v.string() },
  handler: async (ctx, { credential, businessId }) => {
    const { config, business, client } = authorize(
      credential,
      businessId,
      'operator_test'
    )
    const profile = business.liveTest
    if (
      !requiresLiveTest(config, business) ||
      !profile ||
      profile.maxAttempts !== 1 ||
      profile.recipients.length !== 1 ||
      !dispatchAllowed(
        config,
        business,
        profile.recipients[0],
        'operator',
        Date.now()
      )
    )
      fail('acceptance_profile_required')
    const key = `acceptance:${profile.id}`
    const fingerprint = deliveryRoute(config, business)
    const old = await ctx.db
      .query('emailRequests')
      .withIndex('scope', (q) =>
        q.eq('businessId', businessId).eq('clientId', client.id).eq('key', key)
      )
      .unique()
    if (old) {
      if (old.fingerprint !== fingerprint) fail('idempotency_conflict')
      return old.result
    }
    const now = Date.now()
    const messageId = await ctx.db.insert('emailMessages', {
      businessId,
      email: profile.recipients[0],
      kind: 'operator',
      route: fingerprint,
      state: 'queued',
      createdAt: now,
      nextAt: now,
      rendered: renderEmail({
        templateKey: 'commerce_incident',
        locale: 'fr',
        brand: business.brand,
        legalFooter: business.legalFooter,
        subject: 'Test d’alerte CommandGlows',
        paragraphs: [
          'Ceci est l’unique email de recette autorisé pour vérifier le service email CommandGlows.',
          'Aucun incident réel ni achat n’est associé à ce message. Aucune inscription à une newsletter n’a été créée.',
          `Vous pouvez répondre à ce message à ${business.from}.`,
        ],
      }),
    })
    const result = { status: 'queued', messageId }
    await ctx.db.insert('emailRequests', {
      businessId,
      clientId: client.id,
      key,
      fingerprint,
      result,
      at: now,
    })
    return result
  },
})
