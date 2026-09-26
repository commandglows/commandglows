export const prerender = true
// https://docs.astro.build/en/guides/integrations-guide/sitemap/#usage
import type { APIRoute } from 'astro';

const robotsTxt = `
User-agent: *
Disallow:
Allow: /
Disallow: /api/
Disallow: /dashboard/
Disallow: /dashboard
Disallow: /fr/dashboard
Disallow: /fr/account
Disallow: /fr/admin
Disallow: /fr/purchase
Disallow: /admin/
Disallow: /purchase/
Disallow: /signin
Disallow: /fr/signin

User-agent: GPTBot
Allow: /
Disallow: /api/
Disallow: /dashboard/
Disallow: /fr/dashboard

User-agent: OAI-SearchBot
Allow: /
Disallow: /api/
Disallow: /dashboard/
Disallow: /fr/dashboard

User-agent: ClaudeBot
Allow: /
Disallow: /api/
Disallow: /dashboard/
Disallow: /fr/dashboard

User-agent: PerplexityBot
Allow: /
Disallow: /api/
Disallow: /dashboard/
Disallow: /fr/dashboard

User-agent: Google-Extended
Allow: /
Disallow: /api/
Disallow: /dashboard/
Disallow: /fr/dashboard

User-agent: CCBot
Allow: /
Disallow: /api/
Disallow: /dashboard/
Disallow: /fr/dashboard

Sitemap: ${new URL('sitemap-index.xml', import.meta.env.SITE).href}
`.trim();

export const GET: APIRoute = () => {
  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
