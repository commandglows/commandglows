const CLERK_BYPASS_API_PATHS = new Set([
  "/api/clerk/webhook",
  "/api/polar/webhook",
  "/api/commerce/webhooks/lemon-squeezy",
]);

const CLERK_BYPASS_PUBLIC_PATHS = new Set([
  "/termux-script",
]);

const CLERK_BYPASS_API_PREFIXES = [
  "/api/bridge",
  "/api/newsletter",
  "/api/commerce",
];

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function isPathOrChild(pathname: string, basePath: string): boolean {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

export function shouldBypassClerkMiddleware(pathname: string): boolean {
  const normalizedPathname = normalizePathname(pathname);

  return (
    CLERK_BYPASS_PUBLIC_PATHS.has(normalizedPathname) ||
    CLERK_BYPASS_API_PATHS.has(normalizedPathname) ||
    CLERK_BYPASS_API_PREFIXES.some((basePath) =>
      isPathOrChild(normalizedPathname, basePath)
    )
  );
}
