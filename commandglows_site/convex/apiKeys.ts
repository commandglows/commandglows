import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("apiKeys")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const generate = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const key = `wf_${Array.from(randomBytes, (b) => chars[b % chars.length]).join("")}`;

    return await ctx.db.insert("apiKeys", {
      userId: args.userId,
      name: args.name,
      key,
      isRevoked: false,
    });
  },
});

export const revoke = mutation({
  args: { id: v.id("apiKeys") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isRevoked: true });
  },
});
