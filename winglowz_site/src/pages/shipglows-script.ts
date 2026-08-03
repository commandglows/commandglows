// Keep this endpoint dynamic so the same public URL can negotiate the native
// Windows adapter through ?format=powershell.
export const prerender = false;

import type { APIRoute } from 'astro';
import installer from '../generated/shipglows-installer.sh?raw';
import windowsInstaller from '../generated/shipglows-installer.ps1?raw';

export const GET: APIRoute = ({ url }) => {
  const format = url.searchParams.get('format');
  const isPowerShell = format === 'powershell' || format === 'ps1' || format === 'windows';
  return new Response(isPowerShell ? windowsInstaller : installer, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
