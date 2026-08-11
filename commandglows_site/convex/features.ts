import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const DEFAULT_FEATURES = [
  {
    key: "replayglowz-bookmarks",
    title: "YouTube Timestamp Bookmarks",
    description: "Save and organize bookmarks at specific video timestamps with notes",
    status: "completed",
    projectId: "replayglowz",
    votes: 42,
  },
  {
    key: "replayglowz-obsidian-export",
    title: "Annotation Export to Obsidian",
    description: "Export all video annotations directly into your Obsidian vault as structured notes",
    status: "in-development",
    projectId: "replayglowz",
    votes: 38,
  },
  {
    key: "replayglowz-analytics",
    title: "Playlist Analytics Dashboard",
    description: "Visual overview of your watch patterns, saved content, and learning progress",
    status: "planned",
    projectId: "replayglowz",
    votes: 25,
  },
  {
    key: "replayglowz-ai-summaries",
    title: "AI-Powered Video Summaries",
    description: "Automatic chapter summaries using AI to capture key takeaways",
    status: "considering",
    projectId: "replayglowz",
    votes: 67,
  },
  {
    key: "mediaflowz-rss",
    title: "RSS Feed Aggregation",
    description: "Unified RSS reader inside Obsidian with customizable feeds and filters",
    status: "completed",
    projectId: "mediaflowz",
    votes: 31,
  },
  {
    key: "mediaflowz-scheduler",
    title: "Social Media Scheduler",
    description: "Schedule and publish content across multiple social platforms from Obsidian",
    status: "planned",
    projectId: "mediaflowz",
    votes: 44,
  },
  {
    key: "mediaflowz-curation-templates",
    title: "Content Curation Templates",
    description: "Pre-built templates for curating and organizing content from various sources",
    status: "in-development",
    projectId: "mediaflowz",
    votes: 19,
  },
  {
    key: "mediaflowz-newsletter",
    title: "Newsletter Generator",
    description: "Turn curated content into formatted newsletters ready to send",
    status: "considering",
    projectId: "mediaflowz",
    votes: 52,
  },
  {
    key: "commandglows-guide-v2",
    title: "Windows Mastery Guide v2",
    description: "Updated guide with 200+ tips covering Windows 11 24H2 features and optimizations",
    status: "in-development",
    projectId: "commandglows",
    votes: 35,
  },
  {
    key: "commandglows-plugin-manager",
    title: "Plugin Manager for Obsidian",
    description: "Search, compare, and manage Obsidian plugins with ratings and compatibility checks",
    status: "completed",
    projectId: "commandglows",
    votes: 28,
  },
  {
    key: "commandglows-shortcut-trainer",
    title: "Keyboard Shortcut Trainer",
    description: "Interactive training mode to learn and practice Windows keyboard shortcuts",
    status: "planned",
    projectId: "commandglows",
    votes: 41,
  },
  {
    key: "commandglows-workflow-builder",
    title: "Workflow Automation Builder",
    description: "Visual builder for creating custom Windows automation workflows",
    status: "considering",
    projectId: "commandglows",
    votes: 73,
  },
];

function normalizeTitle(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

async function getGlobalUserIdByClerkId(
  ctx: MutationCtx,
  clerkId: string,
): Promise<Id<"globalUsers"> | null> {
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
    .unique();

  return user?.globalUserId ?? null;
}

async function ensureFeatureForKey(
  ctx: MutationCtx,
  key: string,
) {
  const existing = await ctx.db
    .query("features")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();

  if (existing) {
    return existing;
  }

  const fallback = DEFAULT_FEATURES.find((feature) => feature.key === key);
  if (!fallback) {
    throw new Error("feature_not_found");
  }

  const now = Date.now();
  const featureId = await ctx.db.insert("features", {
    ...fallback,
    source: "legacy_fallback",
    createdAt: now,
    updatedAt: now,
  });

  const inserted = await ctx.db.get(featureId);
  if (!inserted) {
    throw new Error("feature_not_found");
  }

  return inserted;
}

export const list = query({
  args: { projectId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const rows = args.projectId
      ? await ctx.db
        .query("features")
        .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId!))
        .collect()
      : await ctx.db.query("features").collect();

    if (rows.length > 0) {
      return rows;
    }

    return args.projectId
      ? DEFAULT_FEATURES.filter((feature) => feature.projectId === args.projectId)
      : DEFAULT_FEATURES;
  },
});

export const vote = mutation({
  args: { key: v.string(), clerkId: v.string() },
  handler: async (ctx, args) => {
    const globalUserId = await getGlobalUserIdByClerkId(ctx, args.clerkId);
    if (!globalUserId) {
      throw new Error("account_not_ready");
    }

    const feature = await ensureFeatureForKey(ctx, args.key);
    const existingVote = await ctx.db
      .query("featureVotes")
      .withIndex("by_featureUser", (q) =>
        q.eq("featureId", feature._id).eq("globalUserId", globalUserId)
      )
      .unique();

    if (existingVote) {
      return {
        status: "duplicate",
        votes: feature.votes,
      };
    }

    const now = Date.now();
    await ctx.db.insert("featureVotes", {
      featureId: feature._id,
      globalUserId,
      createdAt: now,
    });

    const nextVotes = feature.votes + 1;
    await ctx.db.patch(feature._id, {
      votes: nextVotes,
      updatedAt: now,
    });

    return {
      status: "ok",
      votes: nextVotes,
    };
  },
});

export const suggest = mutation({
  args: {
    clerkId: v.string(),
    projectId: v.string(),
    title: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const globalUserId = await getGlobalUserIdByClerkId(ctx, args.clerkId);
    if (!globalUserId) {
      throw new Error("account_not_ready");
    }

    const titleNormalized = normalizeTitle(args.title);
    const existingSuggestion = await ctx.db
      .query("featureSuggestions")
      .withIndex("by_globalUserTitle", (q) =>
        q.eq("globalUserId", globalUserId).eq("titleNormalized", titleNormalized)
      )
      .unique();

    if (existingSuggestion && existingSuggestion.status === "pending") {
      throw new Error("duplicate_suggestion");
    }

    const now = Date.now();
    return await ctx.db.insert("featureSuggestions", {
      globalUserId,
      projectId: args.projectId,
      title: args.title.trim(),
      titleNormalized,
      description: args.description.trim(),
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});
