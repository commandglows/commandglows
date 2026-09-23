import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'
import { query } from './_generated/server'
import { authorize, fail } from './emailConfig'

/** Reads persisted incident history without implying that an evaluator is wired. */
export const read = query({
  args: {
    credential: v.string(),
    businessId: v.string(),
    campaignId: v.optional(v.id('emailCampaigns')),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  handler: async (ctx, args) => {
    authorize(args.credential, args.businessId, 'campaign_read')
    const paginationOpts = args.paginationOpts ?? { numItems: 25, cursor: null }
    if (
      !Number.isSafeInteger(paginationOpts.numItems) ||
      paginationOpts.numItems < 1 ||
      paginationOpts.numItems > 100 ||
      (paginationOpts.cursor?.length ?? 0) > 4096
    )
      fail('invalid_input')

    let pageQuery
    if (args.campaignId) {
      const campaign = await ctx.db.get(args.campaignId)
      if (!campaign || campaign.businessId !== args.businessId)
        fail('not_found')
      pageQuery = ctx.db
        .query('emailIncidents')
        .withIndex('by_scope', (q) =>
          q
            .eq('businessId', args.businessId)
            .eq('scopeType', 'campaign')
            .eq('scopeId', args.campaignId!)
        )
    } else {
      pageQuery = ctx.db
        .query('emailIncidents')
        .withIndex('by_business', (q) => q.eq('businessId', args.businessId))
    }

    const page = await pageQuery.order('desc').paginate(paginationOpts)
    const incidents = await Promise.all(
      page.page.map(async (incident) => {
        const latestTransition = await ctx.db
          .query('emailIncidentTransitions')
          .withIndex('by_incident_sequence', (q) =>
            q
              .eq('incidentKey', incident.incidentKey)
              .eq('episode', incident.episode)
          )
          .order('desc')
          .first()
        return {
          id: incident._id,
          business_id: incident.businessId,
          scope_type: incident.scopeType,
          scope_id: incident.scopeId,
          rule_id: incident.ruleId,
          rule_version: incident.ruleVersion,
          episode: incident.episode,
          state: incident.state,
          severity: incident.severity,
          breach_windows: incident.breachWindows,
          recovery_windows: incident.recoveryWindows,
          last_window_id: incident.lastWindowId ?? null,
          evaluation_unavailable: incident.evaluationUnavailable,
          record_updated_at: incident.updatedAt,
          last_transition: latestTransition
            ? {
                kind: latestTransition.kind,
                reason: latestTransition.reason,
                at: latestTransition.createdAt,
                sequence: latestTransition.sequence,
              }
            : null,
          measurement: null,
          threshold: null,
          sample: null,
          coverage: null,
          evaluated_at: null,
          measurement_unavailable_reason:
            'The incident schema does not persist measurement, threshold, coverage, or evaluation time.',
        }
      })
    )
    return {
      incidents,
      cursor: page.isDone ? null : page.continueCursor,
      complete: page.isDone,
    }
  },
})
