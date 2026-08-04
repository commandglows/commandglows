import { action } from "./_generated/server";
import { v } from "convex/values";

export const addBuyerToNewsletter = action({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const resendKey = process.env.RESEND_API_KEY;
    const audienceId = process.env.RESEND_AUDIENCE_ID;

    if (!resendKey || !audienceId) {
      console.warn("Resend not configured, skipping newsletter add");
      return;
    }

    const response = await fetch("https://api.resend.com/audiences/" + audienceId + "/contacts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: args.email,
        first_name: args.name || "",
        unsubscribed: false,
      }),
    });

    if (!response.ok) {
      console.error("Failed to add buyer to newsletter:", await response.text());
    }
  },
});
