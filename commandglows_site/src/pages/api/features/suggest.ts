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

export const POST: APIRoute = async ({ request, locals }) => {
  const auth = locals.auth();
  if (!auth.userId) {
    return jsonResponse({ status: 'unauthorized', error: 'auth_required' }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ status: 'invalid', error: 'invalid_json' }, 400);
  }

  const projectId = typeof payload.projectId === 'string' ? payload.projectId.trim() : '';
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const description = typeof payload.description === 'string' ? payload.description.trim() : '';

  if (!projectId || !title || !description) {
    return jsonResponse({ status: 'invalid', error: 'missing_fields' }, 400);
  }

  const env = getServerEnv();
  const convexUrl = env.PUBLIC_CONVEX_URL;
  if (!convexUrl || convexUrl === 'https://PLACEHOLDER.convex.cloud') {
    return jsonResponse({ status: 'unavailable', error: 'roadmap_unavailable' }, 503);
  }

  try {
    const convex = new ConvexHttpClient(convexUrl);
    await convex.mutation('features:suggest' as never, {
      clerkId: auth.userId,
      projectId,
      title,
      description,
    } as never);

    return jsonResponse({ status: 'ok' }, 200);
  } catch (error) {
    if (error instanceof Error && error.message === 'account_not_ready') {
      return jsonResponse({ status: 'blocked', error: 'account_not_ready' }, 409);
    }
    if (error instanceof Error && error.message === 'duplicate_suggestion') {
      return jsonResponse({ status: 'duplicate', error: 'duplicate_suggestion' }, 409);
    }
    return jsonResponse({ status: 'error', error: 'suggestion_failed' }, 500);
  }
};
