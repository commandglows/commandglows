import type { APIRoute } from 'astro'

export const prerender = false

export const GET: APIRoute = ({ url, redirect }) => {
  const target = new URL('/shipglows-script', url)
  target.search = url.search
  return redirect(`${target.pathname}${target.search}`, 301)
}
