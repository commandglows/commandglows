import { shouldBypassClerkMiddleware } from "@/middleware/authRouting";

describe("auth routing middleware", () => {
  test("bypasses Clerk for server-owned API routes", () => {
    expect(shouldBypassClerkMiddleware("/api/bridge/firebase")).toBe(true);
    expect(shouldBypassClerkMiddleware("/api/bridge/sync")).toBe(true);
    expect(shouldBypassClerkMiddleware("/api/bridge/entitlement")).toBe(true);
    expect(shouldBypassClerkMiddleware("/api/clerk/webhook")).toBe(true);
    expect(shouldBypassClerkMiddleware("/api/polar/webhook")).toBe(true);
    expect(shouldBypassClerkMiddleware("/api/newsletter/subscribe")).toBe(true);
    expect(shouldBypassClerkMiddleware("/api/commerce/webhooks/lemon-squeezy")).toBe(true);
    expect(shouldBypassClerkMiddleware("/api/commerce")).toBe(true);
    expect(shouldBypassClerkMiddleware("/api/commerce/something")).toBe(true);
  });

  test("keeps Clerk for account pages and Clerk-backed checkout", () => {
    expect(shouldBypassClerkMiddleware("/api/polar/checkout")).toBe(false);
    expect(shouldBypassClerkMiddleware("/api/temu/extract")).toBe(false);
    expect(shouldBypassClerkMiddleware("/account")).toBe(false);
    expect(shouldBypassClerkMiddleware("/dashboard")).toBe(false);
    expect(shouldBypassClerkMiddleware("/signin")).toBe(false);
  });

  test("bypasses only the exact canonical and legacy ShipGlows script paths", () => {
    expect(shouldBypassClerkMiddleware("/shipglows-script")).toBe(true);
    expect(shouldBypassClerkMiddleware("/shipglowz-script")).toBe(true);
    expect(shouldBypassClerkMiddleware("/shipglows-script/extra")).toBe(false);
    expect(shouldBypassClerkMiddleware("/shipglowz-script-evil")).toBe(false);
  });
});
