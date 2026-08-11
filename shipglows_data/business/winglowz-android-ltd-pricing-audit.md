---
artifact: market_study
metadata_schema_version: "1.0"
artifact_version: "0.2.0"
project: "CommandGlows"
created: "2026-06-12"
updated: "2026-08-11"
status: "draft"
source_skill: "sg-docs"
scope: "commandglows-android-ltd-pricing"
owner: "Diane"
confidence: "medium"
risk_level: "high"
business_model: "lifetime_deal_with_cloud_fair_use"
target_audience: "Android-first productivity power users, mobile professionals, and future cross-platform voice workflow users"
market: "English-first global early adopters"
value_proposition: "Voice-first text capture and reuse across Android now, with future multi-platform workflow access and cloud sync only where economically bounded."
docs_impact: "yes"
security_impact: "yes"
linked_systems:
  - "commandglows_site"
  - "commandglows_app"
  - "Stripe Managed Payments"
  - "Firebase"
  - "shipglows_data/workflow/specs/commandglows-android-lifetime-deal-launch.md"
depends_on:
  - artifact: "shipglows_data/business/commandglows_app/business.md"
    artifact_version: "unknown"
    required_status: "reviewed"
  - artifact: "shipglows_data/business/commandglows_app/product.md"
    artifact_version: "1.1.0"
    required_status: "reviewed"
  - artifact: "shipglows_data/business/commandglows_app/gtm.md"
    artifact_version: "1.1.0"
    required_status: "reviewed"
supersedes: []
evidence:
  - "https://wisprflow.ai/pricing"
  - "https://superwhisper.com/docs/get-started/sw-pro"
  - "https://otter.ai/pricing"
  - "https://www.notta.ai/en/pricing"
  - "https://www.descript.com/pricing"
  - "https://textexpander.com/pricing"
  - "https://dictanote.co/voicein/"
  - "https://zplatform.ai/ai-deal/blip-ai/"
  - "https://help.appsumo.com/article/680-how-is-the-list-price-calculated"
  - "https://help.appsumo.com/article/678-how-can-i-list-multiple-plan-tiers"
  - "https://www.lemonsqueezy.com/pricing"
  - "https://www.lemonsqueezy.com/blog/2026-update"
  - "https://stripe.com/managed-payments"
  - "https://firebase.google.com/pricing"
  - "https://developers.openai.com/api/docs/pricing"
next_review: "2026-09-11"
next_step: "Recalculate launch net revenue with current Stripe Managed Payments pricing before final public prices are approved."
---

# CommandGlows Android LTD Pricing Audit

> Amendment — 2026-08-11: the commercial ladder and cost-risk reasoning remain
> useful, but the original Lemon Squeezy launch-provider and fee assumptions are
> historical. CommandGlows now targets Stripe Managed Payments; figures derived
> from Lemon Squeezy fees must not be used as current launch net-revenue proof.

## Executive Verdict

CommandGlows should not launch one cheap "all included" lifetime deal.

The sustainable shape is a ladder:

| Tier | Early Bird recommendation | Regular anchor | Core promise | Cloud risk |
| --- | ---: | ---: | --- | --- |
| Starter Activation LTD | **$79** | $149 | One user, all released platforms over time, 1 active device, local/BYO features, no meaningful hosted usage included | Low |
| Pro Activation LTD | **$149** | $249 | One user, all released platforms over time, 3 active devices, fair-use cloud sync when available | Medium |
| Founder Activation LTD | **$249** | $399 | One user, all released platforms over time, 5 active devices, no guaranteed release dates, local/BYO focus | Medium-low |
| Everything / Cloud LTD | **$599 minimum** | $899+ | One user, all released platforms, bounded cloud sync/fair-use, stronger support | High |

Recommendation: launch with **three visible tiers** and keep Everything/Cloud as either a capped high-ticket tier or a "contact / limited beta" tier until cloud sync usage is measured.

Minimum no-bankruptcy rule: **do not sell all-platforms + cloud sync below $499**, and prefer **$599+** if the tier includes future platforms plus hosted sync. A $99 all-platform LTD is only defensible if it excludes hosted cloud usage and high-touch support.

## Decisions Already Reflected

- First launch language: English.
- Payment provider assumption superseded: Stripe Managed Payments is now the CommandGlows Merchant of Record target; Lemon Squeezy is retained only for CommunityGlows.
- License basis: per user, not per platform and not per machine, with a fixed number of active device activations across any released platform.
- Early Bird framing: beta pricing that may change, not a fake fixed deadline.
- Other platforms: Windows, iOS, and Linux can be promised as intended future directions only; no release date commitment.
- Cloud: must be fair-use/capped or separated from cheap tiers.
- Future AppSumo launch is likely; site pricing should preserve room for AppSumo to negotiate the lowest public deal without forcing CommandGlows into an unsustainable all-in package.

## Competitor Pricing Snapshot

| Product | Current public pricing signal | Relevant lesson for CommandGlows |
| --- | --- | --- |
| Wispr Flow | Free tier, Pro shown at $15/user/month monthly and $12/user/month annual; Basic limits words by platform, with Android temporarily unlimited. Source: [Wispr Flow pricing](https://wisprflow.ai/pricing). | Cross-platform voice dictation can support $144-$180/year pricing. Unlimited Android as "limited time" shows that unlimited usage is risky to promise permanently. |
| Superwhisper | Pro docs list $8.49/month, $84.99/year, and $249.99 lifetime; all plans include same features and work on all platforms. Source: [Superwhisper Pro docs](https://superwhisper.com/docs/get-started/sw-pro). | $249 lifetime is a real anchor for multi-platform dictation when the product is mature and mostly local/on-device. |
| Blip AI | Public deal writeups describe AppSumo LTD from about $49 to $449, cloud-only processing, and monthly word caps. Source: [ZPlatform Blip AI deal](https://zplatform.ai/ai-deal/blip-ai/). | Cheap LTD is possible only with hard caps. Cloud-only lifetime access without caps is a red flag. |
| Otter.ai | Basic free includes 300 monthly transcription minutes; Pro is $8.33/user/month annual, Business $19.99/user/month annual, with transcription/import limits and team features. Source: [Otter pricing](https://otter.ai/pricing). | AI transcription users accept recurring subscriptions with usage limits. Lifetime should not include unbounded hosted transcription. |
| Notta | Pro $8.17/month annual with 1,800 minutes/month; Business $16.67/month annual with unlimited/customized usage wording. Source: [Notta pricing](https://www.notta.ai/en/pricing). | Transcription quotas are normal even in paid plans. |
| Descript | Official pricing shows annual Hobbyist at $16/person/month and monthly at $24/person/month. Source: [Descript pricing](https://www.descript.com/pricing). | Advanced media/AI tools monetize above simple dictation; strong AI/editorial features justify higher tiers. |
| TextExpander | Individual $4.16/month, Business $10.41/month, Growth $13.54/month, billed annually. Source: [TextExpander pricing](https://textexpander.com/pricing). | Snippets/text productivity alone supports low recurring prices; CommandGlows needs voice + Android IME + future platform story to justify higher LTD. |
| Voice In | Voice In positions Plus at $60/year and compares against Dragon at $300-$2500+. Source: [Voice In](https://dictanote.co/voicein/). | Browser dictation is cheaper; native app + keyboard + workflow reuse must be the differentiator. |

## Future AppSumo Constraint

AppSumo should be treated as a future negotiated channel, not as the first source of truth for the offer. AppSumo's public help center explains that its displayed list price is based on the partner's existing monthly plan annualized plus extra included features, and that AppSumo commonly negotiates better price and/or better terms for the deal. AppSumo also supports multiple deal tiers. Sources: [AppSumo list price calculation](https://help.appsumo.com/article/680-how-is-the-list-price-calculated), [AppSumo multiple tiers](https://help.appsumo.com/article/678-how-can-i-list-multiple-plan-tiers).

Practical rule for CommandGlows:

- Do not make the site Early Bird a permanent low reference price.
- Keep the site launch framed as a limited beta founder price that can end or increase before AppSumo.
- AppSumo can later get the lowest available public price, but only for a defined AppSumo package with explicit limits.
- Avoid giving the direct site a better effective deal than AppSumo during an AppSumo campaign.
- Preserve negotiation room by increasing direct-site pricing before AppSumo, or by making AppSumo terms different from the direct-site terms.

Recommended sequence:

1. Direct-site Early Bird on Lemon Squeezy to validate demand and collect first users.
2. Raise direct-site prices to the regular anchors before any AppSumo negotiation.
3. Negotiate AppSumo with stackable or tiered offers that are cheaper than the then-current public direct price, but not broader than the sustainable entitlement policy.
4. After AppSumo, either close the LTD or move the direct site to higher LTD pricing / subscription / waitlist.

AppSumo should not receive an all-platform + unlimited-cloud promise at a low headline price. If AppSumo requires a very low entry point, that entry point should map to local-first Android or tightly capped usage, not the premium cloud/all-platform tier.

## Cost And Margin Constraints

### Lemon Squeezy

Lemon Squeezy has no monthly fee and lists a base transaction fee of 5% + 50 cents. It also provides merchant-of-record tax handling. Source: [Lemon Squeezy pricing](https://www.lemonsqueezy.com/pricing).

Approximate revenue after base fee:

| Sticker price | Net before refunds/support/cloud |
| ---: | ---: |
| $79 | ~$74.55 |
| $149 | ~$141.05 |
| $249 | ~$236.05 |
| $599 | ~$568.55 |

This means low ticket LTDs leave little room for lifetime support, refunds, chargebacks, future migrations, or recurring cloud usage.

### Cloud Sync

Firebase has useful free/no-cost allowances, but paid usage begins after storage, transfer, operations, and function thresholds. Cloud Storage examples include 5 GB stored free on eligible buckets, then paid storage/egress/operations; Cloud Functions include no-cost invocations then $0.40/million invocations; Hosting transfer/storage also has limits. Source: [Firebase pricing](https://firebase.google.com/pricing).

Cloud sync for text/snippets/dictionary can be low cost if payloads are small and sync frequency is bounded. The danger is not one normal user; it is lifetime liability across years, heavy sync users, support, abuse, future media/audio storage, and account migration.

### AI / Hosted Transcription

If CommandGlows ever includes hosted transcription rather than BYO/local, current OpenAI pricing lists transcription estimates at $0.006/minute for `gpt-4o-transcribe` and $0.003/minute for `gpt-4o-mini-transcribe`. Source: [OpenAI API pricing](https://developers.openai.com/api/docs/pricing).

At $0.003/minute, 10 hours/month costs about $1.80/month before infrastructure and support. A $149 LTD could be consumed by a single heavy user over a few years if hosted transcription is included. Therefore:

- Cheap tiers must be local/BYO only.
- Cloud sync must not imply hosted transcription.
- Any hosted AI credits need monthly caps, fair-use language, or a subscription/add-on.

## Recommended License Semantics

Use **per-user personal license with cross-platform activation limits**, not per-platform or per-machine:

- Better for a future multi-platform promise.
- Easier to explain on a sales page.
- More attractive than per-machine licensing.
- Easier to manage operationally: the entitlement owns `max_active_devices`, while each activation records device and platform metadata.

Recommended default cap for audit and implementation:

| Tier | Device policy |
| --- | --- |
| Starter Activation LTD | 1 user, 1 active personal device across any released platform |
| Pro Activation LTD | 1 user, up to 3 active personal devices across any released platform |
| Founder Activation LTD | 1 user, up to 5 active personal devices across any released platform |
| Everything / Cloud LTD | 1 user, up to 5 active personal devices across any released platform, cloud fair-use and anti-abuse controls |

Do not sell team use under individual LTD. Team/commercial multi-seat use should become a future subscription or business license.

## Recommended Offer Architecture

### Tier 1: Starter Activation LTD

**Early Bird: $79. Do not go below $59.**

Includes:
- Android app now.
- Access to future released platforms if and when they ship, with no deadline promise.
- 1 active personal device at a time, regardless of platform.
- Local-first features: keyboard, snippets, dictionary, clipboard workflows where available.
- BYO keys for advanced AI features where implemented.
- No included hosted transcription.
- Minimal cloud/account usage only if needed for activation.

Why: This tier captures price-sensitive early adopters without creating a cloud liability. The low activation count keeps the entry tier simple and sustainable while preserving the multi-platform founder promise.

### Tier 2: Pro Activation LTD

**Early Bird: $149. Regular anchor: $249.**

Includes:
- Android now, future released platforms if and when they ship.
- 3 active personal devices across any released platform.
- Fair-use cloud sync for text/snippets/settings when available.
- Beta updates.
- Standard support.

Why: $149 is a reasonable bridge between low-cost tools and premium lifetime dictation. It stays below Superwhisper lifetime while allowing some future cloud cost.

### Tier 3: Founder Activation LTD

**Early Bird: $249. Regular anchor: $399.**

Includes:
- Access to Android now.
- Access to Windows, iOS, Linux if and when released.
- Explicit no-deadline language.
- 5 active personal devices across any released platform.
- Local/BYO-first workflow.
- Cloud sync limited or excluded except activation/basic account state.

Why: Superwhisper anchors all-platform lifetime around $249. CommandGlows can match this if the promise is future platform access with activation limits, no guaranteed deadlines, and no unbounded cloud.

### Tier 4: Everything / Cloud LTD

**Early Bird: $599 minimum. Prefer limited beta or waitlist until cloud usage is measured.**

Includes:
- All released platforms.
- Fair-use cloud sync.
- Highest device cap.
- Priority support or founder channel only if operationally feasible.
- Explicit monthly fair-use ceilings.

Do not sell this tier below $499. A $99 or $149 all-platform cloud LTD is structurally dangerous.

## Sales Page Pricing Copy Guidance

Use this stance:

- "Early Bird beta pricing. Prices may increase as platform coverage and cloud features mature."
- "Android is available first. Windows, iOS and Linux are planned, but no release date is promised."
- "Cloud sync is fair-use and designed to keep the product sustainable."
- "Advanced AI features use local/BYO keys where applicable unless a plan explicitly includes hosted usage."

Avoid:

- "Unlimited cloud."
- "All future platforms guaranteed by date."
- "All AI included forever."
- "Lifetime everything."
- "Priority support" unless support capacity is documented.

## Launch Recommendation

For the first page, show three public cards:

1. **Starter Founder - $79**: 1 active device, all released platforms over time
2. **Pro Founder - $149**: 3 active devices, all released platforms over time
3. **Studio Founder - $249**: 5 active devices, all released platforms over time

Then show **Everything / Cloud Founder** as:

- limited invitation,
- contact/waitlist,
- or high-ticket $599 if Diane wants to validate premium demand.

This lets the launch start without underpricing the highest-risk promise.

Direct-site launch copy should avoid wording like "lowest price ever" unless Diane is ready to preserve that promise through AppSumo. Safer wording: "Early Bird beta pricing", "Founder pricing", or "price may increase as the product matures."

## Remaining Decisions For Diane

Before implementation:

1. Accept, adjust, or reject the recommended pricing ladder.
2. Decide whether Everything / Cloud is public at $599+ or waitlist only.
3. Confirm the exact activation caps: 1 active device for Starter, 3 for Pro, 5 for Studio/Everything.
4. Decide whether direct-site Early Bird should be explicitly positioned as pre-AppSumo founder pricing that can end before AppSumo negotiation.
5. Confirm support language: community/basic support vs priority/founder support.

## Sources

- [Wispr Flow pricing](https://wisprflow.ai/pricing)
- [Superwhisper Pro docs](https://superwhisper.com/docs/get-started/sw-pro)
- [Otter pricing](https://otter.ai/pricing)
- [Notta pricing](https://www.notta.ai/en/pricing)
- [Descript pricing](https://www.descript.com/pricing)
- [TextExpander pricing](https://textexpander.com/pricing)
- [Voice In](https://dictanote.co/voicein/)
- [Blip AI deal analysis](https://zplatform.ai/ai-deal/blip-ai/)
- [AppSumo list price calculation](https://help.appsumo.com/article/680-how-is-the-list-price-calculated)
- [AppSumo multiple tiers](https://help.appsumo.com/article/678-how-can-i-list-multiple-plan-tiers)
- [Lemon Squeezy pricing](https://www.lemonsqueezy.com/pricing)
- [Firebase pricing](https://firebase.google.com/pricing)
- [OpenAI API pricing](https://developers.openai.com/api/docs/pricing)
