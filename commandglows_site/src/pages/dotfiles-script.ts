export const prerender = true;

import type { APIRoute } from 'astro';

const installer = `#!/usr/bin/env sh
set -eu

tmp_dir="\${TMPDIR:-/tmp}"
tmp_file="$tmp_dir/dotfiles-install.sh"

mkdir -p "$tmp_dir"
curl -fsSL https://raw.githubusercontent.com/dianedef/dotfiles/main/dotfiles/install-dotfiles.sh -o "$tmp_file"
exec sh "$tmp_file"
`;

export const GET: APIRoute = () => {
  return new Response(installer, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
