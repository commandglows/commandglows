import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = import.meta.env.PUBLIC_CONVEX_URL;

let client: ConvexHttpClient | null = null;

export function getConvexClient(): ConvexHttpClient {
  if (!CONVEX_URL) {
    throw new Error("PUBLIC_CONVEX_URL is not set");
  }
  if (!client) {
    client = new ConvexHttpClient(CONVEX_URL);
  }
  return client;
}
