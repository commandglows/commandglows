/**
 * Create all Flowz products on Polar.sh
 *
 * Usage:
 *   POLAR_ACCESS_TOKEN=your_token node scripts/create-polar-products.mjs
 *
 * Optional flags:
 *   --dry-run    Print what would be created without calling the API
 *   --org <id>   Target a specific org ID (otherwise uses the first org found)
 *   --server sandbox|production  Default: production
 */

import { Polar } from "@polar-sh/sdk";

const DRY_RUN = process.argv.includes("--dry-run");
const SERVER = process.argv.includes("sandbox") ? "sandbox" : "production";
const ORG_ARG = (() => {
  const i = process.argv.indexOf("--org");
  return i !== -1 ? process.argv[i + 1] : null;
})();

const token = process.env.POLAR_ACCESS_TOKEN;
if (!token && !DRY_RUN) {
  console.error("❌  POLAR_ACCESS_TOKEN env var is required");
  console.error("    Run: POLAR_ACCESS_TOKEN=your_token node scripts/create-polar-products.mjs");
  process.exit(1);
}

const polar = new Polar({ accessToken: token ?? "dry-run", server: SERVER });

// ──────────────────────────────────────────────────────────────
// Product definitions
// ──────────────────────────────────────────────────────────────

const PRODUCTS = [
  // ── WinGlows ──────────────────────────────────────────────
  {
    group: "WinGlows",
    name: "WinGlows — Full Training",
    description: "All 8 Windows productivity training modules. Lifetime access, FR + EN content, progress dashboard, priority support.",
    prices: [
      { type: "one_time", amountType: "fixed", priceAmount: 4900, priceCurrency: "usd" },
    ],
    metadata: { entitlement: "winglowz_training", launch_price: "true" },
  },
  {
    group: "WinGlows",
    name: "WinGlows — Bundle",
    description: "Full Training + SocialFlow Lifetime + 1 year ReplayGlowz Pro. Best value for the complete Flowz ecosystem.",
    prices: [
      { type: "one_time", amountType: "fixed", priceAmount: 14900, priceCurrency: "usd" },
    ],
    metadata: { entitlement: "bundle_full", includes: "winglowz_training,socialflow_lifetime,replayglowz_pro_1yr" },
  },

  // ── SocialFlow ────────────────────────────────────────────
  {
    group: "SocialFlow",
    name: "SocialFlow Pro — Monthly",
    description: "Unlimited profiles, 18+ social networks, full anti-distraction suite, Kanban board, backup & restore, priority support.",
    prices: [
      { type: "recurring", amountType: "fixed", priceAmount: 900, priceCurrency: "usd", recurringInterval: "month" },
      { type: "recurring", amountType: "fixed", priceAmount: 900, priceCurrency: "eur", recurringInterval: "month" },
    ],
    metadata: { entitlement: "socialflow_pro" },
  },
  {
    group: "SocialFlow",
    name: "SocialFlow Pro — Annual",
    description: "Unlimited profiles, 18+ social networks, full anti-distraction suite, Kanban board, backup & restore, priority support. Billed annually (save 33%).",
    prices: [
      { type: "recurring", amountType: "fixed", priceAmount: 7200, priceCurrency: "usd", recurringInterval: "year" },
      { type: "recurring", amountType: "fixed", priceAmount: 7200, priceCurrency: "eur", recurringInterval: "year" },
    ],
    metadata: { entitlement: "socialflow_pro" },
  },
  {
    group: "SocialFlow",
    name: "SocialFlow — Lifetime Deal",
    description: "All Pro features forever. One-time payment. Lifetime updates and priority support. No subscription ever.",
    prices: [
      { type: "one_time", amountType: "fixed", priceAmount: 9900, priceCurrency: "usd" },
      { type: "one_time", amountType: "fixed", priceAmount: 9900, priceCurrency: "eur" },
    ],
    metadata: { entitlement: "socialflow_lifetime", launch_price: "true" },
  },

  // ── ReplayGlowz ──────────────────────────────────────────────
  {
    group: "ReplayGlowz",
    name: "ReplayGlowz Pro — Monthly",
    description: "AI transcription (50 videos/mo), unlimited playlists & videos, AI-powered summaries, export to Obsidian & Notion, cross-device sync, advanced search, priority support.",
    prices: [
      { type: "recurring", amountType: "fixed", priceAmount: 700, priceCurrency: "usd", recurringInterval: "month" },
    ],
    metadata: { entitlement: "replayglowz_pro" },
  },
  {
    group: "ReplayGlowz",
    name: "ReplayGlowz Pro — Annual",
    description: "AI transcription (50 videos/mo), unlimited playlists & videos, AI-powered summaries, export to Obsidian & Notion, cross-device sync, advanced search, priority support. Billed annually ($56/yr).",
    prices: [
      { type: "recurring", amountType: "fixed", priceAmount: 5600, priceCurrency: "usd", recurringInterval: "year" },
    ],
    metadata: { entitlement: "replayglowz_pro" },
  },
  {
    group: "ReplayGlowz",
    name: "ReplayGlowz Power — Monthly",
    description: "AI transcription (200 videos/mo), everything in Pro, early access to new features, priority support.",
    prices: [
      { type: "recurring", amountType: "fixed", priceAmount: 1500, priceCurrency: "usd", recurringInterval: "month" },
    ],
    metadata: { entitlement: "replayglowz_power" },
  },
  {
    group: "ReplayGlowz",
    name: "ReplayGlowz Power — Annual",
    description: "AI transcription (200 videos/mo), everything in Pro, early access to new features, priority support. Billed annually ($120/yr).",
    prices: [
      { type: "recurring", amountType: "fixed", priceAmount: 12000, priceCurrency: "usd", recurringInterval: "year" },
    ],
    metadata: { entitlement: "replayglowz_power" },
  },
];

// ──────────────────────────────────────────────────────────────

async function getOrganizationId() {
  if (ORG_ARG) return ORG_ARG;
  const result = await polar.organizations.list({});
  // Handle paginated response
  const items = result?.items ?? result?.result?.items ?? [];
  if (!items.length) throw new Error("No organizations found on this account");
  console.log(`📦  Using org: ${items[0].name} (${items[0].id})`);
  return items[0].id;
}

async function createProduct(product) {
  const payload = {
    name: product.name,
    description: product.description,
    prices: product.prices,
    ...(product.metadata ? { metadata: product.metadata } : {}),
  };

  if (DRY_RUN) {
    console.log("\n  [DRY RUN] Would create:", JSON.stringify(payload, null, 4));
    return { id: "dry-run-id", name: product.name };
  }

  return await polar.products.create(payload);
}

// ──────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🚀  Creating Flowz products on Polar.sh (${SERVER})${DRY_RUN ? " [DRY RUN]" : ""}\n`);

  if (!DRY_RUN) {
    await getOrganizationId();
  }

  const results = [];
  let currentGroup = "";

  for (const product of PRODUCTS) {
    if (product.group !== currentGroup) {
      currentGroup = product.group;
      console.log(`\n── ${currentGroup} ${"─".repeat(50 - currentGroup.length)}`);
    }

    try {
      const created = await createProduct(product);
      const priceLabel = product.prices.map((p) => {
        const amount = (p.priceAmount / 100).toFixed(0);
        const currency = (p.priceCurrency ?? "usd").toUpperCase();
        const interval = p.recurringInterval ? `/${p.recurringInterval}` : " one-time";
        return `${amount} ${currency}${interval}`;
      }).join(", ");

      console.log(`  ✅  ${product.name} — ${priceLabel}`);
      if (!DRY_RUN) console.log(`      id: ${created.id}`);
      results.push({ name: product.name, id: created.id, status: "created" });
    } catch (err) {
      console.error(`  ❌  ${product.name} — ${err.message}`);
      results.push({ name: product.name, status: "error", error: err.message });
    }
  }

  console.log("\n─────────────────────────────────────────────────");
  const ok = results.filter((r) => r.status === "created").length;
  const fail = results.filter((r) => r.status === "error").length;
  console.log(`\n${DRY_RUN ? "🔍" : "🎉"}  Done: ${ok} created${fail ? `, ${fail} failed` : ""}\n`);

  if (!DRY_RUN && ok > 0) {
    console.log("📋  Product IDs to copy into your .env / Convex config:");
    results.filter((r) => r.status === "created").forEach((r) => {
      const key = r.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      console.log(`  POLAR_PRODUCT_ID_${key.toUpperCase()} = ${r.id}`);
    });
    console.log();
  }
}

main().catch((err) => {
  console.error("\n💥 Fatal:", err.message);
  process.exit(1);
});
