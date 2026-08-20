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

    expect(csp).toBeDefined();

    const directives = new Map(
      csp!.split(";").map((directive) => {
        const [name, ...sources] = directive.trim().split(/\s+/);
        return [name, sources] as const;
      })
    );
    const formerClerkHost = ["https://clerk", "win" + "flowz", "com"].join(
      "."
    );

    expect(directives.get("script-src")).toContain(
      "https://clerk.commandglows.com"
    );
    expect(directives.get("script-src")).toContain(
      "https://challenges.cloudflare.com"
    );
    expect(directives.get("frame-src")).toContain(
      "https://clerk.commandglows.com"
    );
    expect(directives.get("connect-src")).toContain(
      "https://accounts.commandglows.com"
    );
    expect(directives.get("style-src")).toContain(
      "https://clerk.commandglows.com"
    );
    expect(directives.get("style-src")).toContain(
      "https://fonts.googleapis.com"
    );
    expect(directives.get("worker-src")).toEqual(["'self'", "blob:"]);
    expect(csp).not.toContain(formerClerkHost);
  });
});
