import type { APIRoute } from "astro";
import { getServerEnv } from "@/lib/serverEnv";
import { getReplayGlowzProductTokenJwks } from "@/lib/suiteBridge";

export const prerender = false;

const JSON_HEADERS = { "Content-Type": "application/json" };

export const GET: APIRoute = async () => {
  const env = getServerEnv();
  const keys = await getReplayGlowzProductTokenJwks(env);
  if (!keys.length) {
    return new Response(
      JSON.stringify({
        error: "product_token_public_jwks_not_configured",
      }),
      { status: 503, headers: JSON_HEADERS }
    );
  }

  return new Response(JSON.stringify({ keys }), {
    status: 200,
    headers: JSON_HEADERS,
  });
};
