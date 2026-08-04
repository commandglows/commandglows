import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Vercel security headers", () => {
  test("allows Clerk custom-domain assets needed by the sign-in widget", () => {
    const config = JSON.parse(
      readFileSync(resolve(process.cwd(), "vercel.json"), "utf8")
    ) as {
      headers: Array<{
        headers: Array<{ key: string; value: string }>;
      }>;
    };

    const csp = config.headers[0]?.headers.find(
      (header) => header.key === "Content-Security-Policy"
    )?.value;

    expect(csp).toContain("script-src");
    expect(csp).toContain("https://clerk.commandglows.com");
    expect(csp).toContain("https://challenges.cloudflare.com");
    expect(csp).toContain("connect-src");
    expect(csp).toContain("https://accounts.commandglows.com");
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("style-src");
    expect(csp).toContain("https://fonts.googleapis.com");
  });
});
