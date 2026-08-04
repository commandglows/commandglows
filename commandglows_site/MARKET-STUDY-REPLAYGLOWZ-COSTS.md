# ReplayGlowz Cost & Pricing Study — YouTube SaaS Tools

> Date: 2026-04-08
> Scope: Infrastructure costs, competitor pricing, sustainable SaaS pricing for ReplayGlowz
> Goal: Price fairly to grow without going bankrupt

---

## 1. Competitor Pricing Landscape

| Tool | Free Tier | Pro Price | Model | Key Differentiator |
|------|-----------|-----------|-------|-------------------|
| **NoteGPT** | 5 summaries/day | $9.99/mo (Pro), $69/mo (Max) | Subscription | Mind maps, flashcards, batch |
| **Glasp** | Basic features | $8/mo (Pro), ~$30/mo (Premium) | Subscription | Social highlighting, 2M+ users |
| **MensorAI** | 7-day trial | $9/mo → $22/mo (3 tiers) | Subscription | Real-time AI Q&A on video |
| **TubeOnAI** | 300 min/mo | $6/mo (Lite), $20/mo (Unlimited) | Subscription | Multi-format (podcast, PDF) |
| **Snipo** | Basic free | Unknown paid | Freemium | Notion integration, flashcards |
| **Rocket Note** | Free tier | $4.99/mo | Subscription | Budget, screenshot capture |
| **YiNote** | Full features | N/A (free forever) | Open source | No AI, manual notes only |
| **YTSummary** | Free | N/A | Free extension | Summary only, no notes |
| **Recall AI** | Free | Unknown | Free tool | Summary only |

### Market price clustering

- **Free/open source**: YiNote, YTSummary, Recall AI — no AI, limited features
- **Budget ($5-6/mo)**: Rocket Note, TubeOnAI Lite — limited minutes
- **Standard ($8-10/mo)**: Glasp Pro, NoteGPT Pro, MensorAI Starter — sweet spot
- **Premium ($20-70/mo)**: TubeOnAI Unlimited, NoteGPT Max, MensorAI Pro — power users

**Market consensus: $7-10/mo for a standard plan, $20/mo for unlimited.**

Sources:
- [MensorAI comparison](https://www.mensorai.com/blog/best-youtube-note-taking-apps)
- [NoteGPT pricing](https://notegpt.io/pricing)
- [Glasp pricing update](https://blog.glasp.co/price-update-2026-05-01/)
- [TubeOnAI pricing](https://tubeonai.com/pricing/)

---

## 2. Infrastructure Cost Breakdown

### 2a. Convex (Backend/Database)

| Resource | Free Tier | Pro ($25/dev/mo) | Overage |
|----------|-----------|-------------------|---------|
| Function calls | 1M/mo | 25M/mo | $2.20/1M |
| DB storage | 0.5 GB | 50 GB | $0.22/GB/mo |
| File storage | 1 GB | 100 GB | $0.033/GB/mo |
| Action compute | 20 GB-hr/mo | 250 GB-hr/mo | $0.33/GB-hr |
| Data egress | 1 GB/mo | 50 GB/mo | $0.132/GB |

**For ReplayGlowz at scale (10K active users):**
- ~5M function calls/mo → $8.80 overage
- ~5 GB database → $1.10 overage
- ~10 GB files → $0.33 overage
- Base: $25/mo (1 dev)
- **Total: ~$35/mo**

Source: [Convex pricing](https://www.convex.dev/pricing)

### 2b. Clerk (Authentication)

| Tier | Price | MAU Limit |
|------|-------|-----------|
| Free | $0 | 50,000 MAU |
| Pro | $20/mo base | +$0.02/MAU after 50K |

**For ReplayGlowz:** Free until 50K users. At 100K users: $20 + (50K × $0.02) = **$1,020/mo**.

Source: [Clerk pricing](https://clerk.com/pricing)

### 2c. YouTube Transcript Extraction

| Method | Cost | Speed | Quality | Limits |
|--------|------|-------|---------|--------|
| **youtube-transcript-api (Python)** | $0 | Fast | Good (native captions) | No API key needed, scrapes public captions |
| **Apify scraper** | $0.001/transcript | Fast | Good | Hosted, managed |
| **YouTube Data API v3 captions** | Free (quota) | Fast | Good | 50 captions/day (200 units each) |
| **Supadata API** | 100 free/mo, then paid | Fast | Good | Multi-platform |

**Key insight:** Native YouTube captions are essentially free to extract. The Python library `youtube-transcript-api` scrapes them without using any YouTube API quota. ~70% of YouTube videos have auto-generated captions.

Sources:
- [YouTube transcript scraping guide](https://use-apify.com/blog/how-to-extract-youtube-transcripts-2026)
- [Best YouTube Transcript API comparison](https://supadata.ai/blog/best-youtube-transcript-api)

### 2d. AI Transcription (for videos without captions)

| Provider | Cost/min | Cost/hr | Best for |
|----------|----------|---------|----------|
| **GPT-4o Mini Audio** | $0.003 | $0.18 | **Cheapest. Best default.** |
| **Deepgram Nova-2** | $0.0043 | $0.26 | High volume (>1K hrs/mo) |
| **OpenAI Whisper** | $0.006 | $0.36 | Good quality, simple API |
| **AssemblyAI Universal-2** | $0.0061 | $0.37 | Best accuracy |
| **Deepgram Nova-3** | $0.0077 | $0.46 | Real-time streaming |
| **Self-hosted Whisper** | ~$0.001 | ~$0.06 | GPU needed, complex ops |

**This is the #1 cost driver for ReplayGlowz.**

Sources:
- [OpenAI Whisper pricing calculator](https://costgoat.com/pricing/openai-transcription)
- [Deepgram pricing breakdown](https://brasstranscripts.com/blog/deepgram-pricing-per-minute-2025-real-time-vs-batch)
- [Speech-to-text API comparison](https://deepgram.com/learn/best-speech-to-text-apis-2026)

### 2e. YouTube Data API v3

| Operation | Quota Cost | Daily Limit (10K units) |
|-----------|-----------|------------------------|
| Video list | 1 unit | 10,000/day |
| Playlist items | 1 unit | 10,000/day |
| Search | 100 units | 100/day |
| Caption download | 200 units | 50/day |
| Channel list | 1 unit | 10,000/day |

**For ReplayGlowz:** Playlist sync and video metadata are cheap (1 unit). Search and captions are expensive. At scale, may need multiple API keys or apply for quota increase.

Source: [YouTube API quota calculator](https://developers.google.com/youtube/v3/determine_quota_cost)

---

## 3. Cost Per User Model

### Assumptions (average active user)

- Watches/saves 20 videos/month
- Requests 10 transcripts/month
- Average video: 15 minutes
- 70% have YouTube native captions (free), 30% need AI transcription
- ~500 Convex function calls/month
- Uses real-time Convex subscriptions (~2 active/session)

### Cost per active user per month

| Cost Item | Calculation | $/user/mo |
|-----------|-------------|-----------|
| Convex function calls | 500 calls (negligible in bulk) | $0.001 |
| Convex DB storage | ~5 MB/user | $0.001 |
| Convex egress | ~10 MB/user | $0.001 |
| Clerk auth | $0 under 50K, $0.02 after | $0.00-0.02 |
| YouTube captions (70%) | 7 × free | $0.00 |
| AI transcription (30%) | 3 videos × 15 min × $0.003 | **$0.135** |
| YouTube API quota | Negligible (list ops) | $0.00 |
| **TOTAL** | | **~$0.14/user/mo** |

### Cost at scale

| Users (active) | Convex | Clerk | AI Transcription | Total/mo | Per-user |
|----------------|--------|-------|-------------------|----------|----------|
| 100 | $0 (free) | $0 | $14 | **$14** | $0.14 |
| 1,000 | $0 (free) | $0 | $135 | **$135** | $0.14 |
| 5,000 | $25 | $0 | $675 | **$700** | $0.14 |
| 10,000 | $35 | $0 | $1,350 | **$1,385** | $0.14 |
| 50,000 | $135 | $0 | $6,750 | **$6,885** | $0.14 |
| 100,000 | $245 | $1,020 | $13,500 | **$14,765** | $0.15 |

**AI transcription is 90-97% of total costs.** Everything else is noise.

---

## 4. The Bankruptcy Scenarios

### Scenario A: Unlimited free tier with AI transcription
- 50K free users × 10 AI transcripts × 15 min × $0.003 = **$22,500/mo**
- Revenue: $0
- **BANKRUPT** in months

### Scenario B: Unlimited paid users, flat $7/mo
- 10K paid users × $7 = $70,000/mo revenue
- Top 10% power users (1K users × 50 transcripts × 15 min × $0.003) = $2,250/mo
- Normal users (9K × 10 transcripts × 15 min × $0.003) = $4,050/mo
- **Margin: 91%.** Safe.

### Scenario C: Heavy AI transcript users on $7 plan
- A user transcribes 200 videos/mo × 15 min × $0.003 = $9/mo
- They pay $7/mo. **You lose $2/user/mo.**
- If 5% of users are this heavy → still profitable overall, but risky at scale

### Scenario D: Free users on native captions only, AI = paid
- 50K free users × native captions only = **$0/mo**
- Paid users get AI transcription = **profitable**
- **SAFEST MODEL**

---

## 5. Recommended Pricing Structure

### The Golden Rule
> **Free tier = YouTube native captions only (zero cost).**
> **AI transcription = paid feature only.**
> **This single rule makes ReplayGlowz financially invincible.**

### Pricing tiers

| | Free | Pro | Power |
|---|---|---|---|
| **Price** | $0 | **$7/mo** | **$15/mo** |
| YouTube captions | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited |
| AI transcription | ❌ | 50 videos/mo (~12.5 hrs) | 200 videos/mo (~50 hrs) |
| Playlists | 3 | Unlimited | Unlimited |
| Notes per video | 10 | Unlimited | Unlimited |
| Video saves | 50/mo | Unlimited | Unlimited |
| Export (Obsidian, Notion) | ❌ | ✅ | ✅ |
| AI summary | ❌ | ✅ | ✅ |
| Priority support | ❌ | ❌ | ✅ |

### Revenue projections (conservative)

Assuming 2% free-to-paid conversion (industry standard for freemium SaaS):

| Month | Free Users | Paid Pro | Paid Power | MRR | Costs | Profit |
|-------|-----------|----------|------------|-----|-------|--------|
| 3 | 500 | 10 | 0 | $70 | $14 | $56 |
| 6 | 2,000 | 40 | 5 | $355 | $50 | $305 |
| 12 | 5,000 | 100 | 15 | $925 | $125 | $800 |
| 18 | 10,000 | 200 | 40 | $2,000 | $250 | $1,750 |
| 24 | 25,000 | 500 | 100 | $5,000 | $600 | $4,400 |

**Break-even: ~Month 1.** The model is inherently profitable because free users cost nothing (native captions) and paid users' revenue far exceeds their AI transcription costs.

### Annual discount
- Pro: $7/mo or **$56/yr** (33% off)
- Power: $15/mo or **$120/yr** (33% off)

---

## 6. Cost Mitigation Strategies

### Immediate (implement now)
1. **Use GPT-4o Mini Audio ($0.003/min)** as default transcription — cheapest option with good quality
2. **Cache all transcripts** — never transcribe the same video twice across users
3. **Free tier = native captions only** — zero marginal cost
4. **Soft limits on AI transcription** — cap at plan limits, no overages

### At scale (>10K users)
1. **Transcript cache hit rate** — Popular videos will be transcribed once and served to all users. At 10K+ users, expect 40-60% cache hit rate, cutting AI costs nearly in half
2. **Self-hosted Whisper** — At ~5K+ paid users, a dedicated GPU instance ($200-400/mo) would reduce transcription costs by ~80% vs API
3. **Negotiate volume pricing** — Deepgram and AssemblyAI both offer volume discounts at 1K+ hours/month
4. **Use YouTube native captions first** — Always try free extraction before AI fallback (ReplayGlowz already does this)

### Transcript caching impact

| Active Users | Without Cache | With 50% Cache | Savings |
|--------------|--------------|-----------------|---------|
| 1,000 | $135/mo | $68/mo | 50% |
| 10,000 | $1,350/mo | $675/mo | 50% |
| 100,000 | $13,500/mo | $6,750/mo | 50% |

---

## 7. Updated Flowz Bundle Pricing (cross-product)

Based on this cost analysis, here's the complete product pricing:

| Product | Regular | Launch Discount | Type | Your cost/user |
|---------|---------|----------------|------|---------------|
| **CommandGlows Training** | ~~$97~~ | **$49** | One-time | ~$0 |
| **SocialFlow Lifetime** | ~~$149~~ | **$99** | One-time | ~$0 (local app) |
| **ReplayGlowz Pro** | $7/mo | — | Subscription | ~$0.14/mo |
| **ReplayGlowz Power** | $15/mo | — | Subscription | ~$0.50/mo |
| **Flowz Bundle** | ~~$246~~ | **$149** | Training + SocialFlow + 1yr ReplayGlowz Pro | ~$1.68/yr |

The bundle includes the two lifetime products ($49+$99=$148 value) plus 1 year of ReplayGlowz Pro ($84 value) = $232 value for $149. After year 1, ReplayGlowz renews at $7/mo.

---

## 8. Key Takeaways

1. **AI transcription is 95% of your costs.** Everything else (Convex, Clerk, YouTube API) is nearly free at any scale.

2. **The free tier must NOT include AI transcription.** This is the single most important pricing decision. Native YouTube captions are free — use them as your free tier feature.

3. **$7/mo Pro is perfectly sustainable.** Your cost per paid user is ~$0.14/mo. That's a 98% gross margin.

4. **Transcript caching is your superpower.** Popular videos get transcribed once and served to thousands of users. The more users you have, the cheaper per user it gets.

5. **You cannot go bankrupt with this model** as long as free = native captions only and AI transcription is gated behind payment.

6. **Competitors cluster at $8-10/mo.** Your $7/mo price slightly undercuts while being fully sustainable.

7. **No lifetime deal for ReplayGlowz.** The ongoing AI transcription costs make lifetime pricing dangerous. A heavy lifetime user could cost you $50+/year in transcription alone, forever.
