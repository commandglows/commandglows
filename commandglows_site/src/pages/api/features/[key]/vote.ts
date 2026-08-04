import type { APIRoute } from 'astro';
import { ConvexHttpClient } from 'convex/browser';
import { getServerEnv } from '@/lib/serverEnv';

export const prerender = false;

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function jsonResponse(payload: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS,
  });
}

export const POST: APIRoute = async ({ locals, params }) => {
  const auth = locals.auth();
  if (!auth.userId) {
    return jsonResponse({ status: 'unauthorized', error: 'auth_required' }, 401);
  }

  const key = params.key?.trim();
  if (!key) {
    return jsonResponse({ status: 'invalid', error: 'missing_feature_key' }, 400);
  }

  const env = getServerEnv();
  const convexUrl = env.PUBLIC_CONVEX_URL;
  if (!convexUrl || convexUrl === 'https://PLACEHOLDER.convex.cloud') {
    return jsonResponse({ status: 'unavailable', error: 'roadmap_unavailable' }, 503);
  }

  try {
    const convex = new ConvexHttpClient(convexUrl);
    const result = (await convex.mutation('features:vote' as never, {
      key,
      clerkId: auth.userId,
    } as never)) as { status: 'ok' | 'duplicate'; votes: number };

    return jsonResponse(result, result.status === 'ok' ? 200 : 409);
  } catch (error) {
    if (error instanceof Error && error.message === 'account_not_ready') {
      return jsonResponse({ status: 'blocked', error: 'account_not_ready' }, 409);
    }
    if (error instanceof Error && error.message === 'feature_not_found') {
      return jsonResponse({ status: 'missing', error: 'feature_not_found' }, 404);
    }
    return jsonResponse({ status: 'error', error: 'vote_failed' }, 500);
  }
};
