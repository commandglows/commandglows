export const prerender = true;

import type { APIRoute } from 'astro';

const installer = `#!/usr/bin/env sh
set -eu
export DEBIAN_FRONTEND=noninteractive

tmp_dir="\${TMPDIR:-$HOME/tmp}"
tmp_file="$tmp_dir/dotfiles-install-termux.sh"

curl_works() {
  command -v curl >/dev/null 2>&1 && curl --version >/dev/null 2>&1
}

apt_termux() {
  apt-get \\
    -o Dpkg::Options::=--force-confdef \\
    -o Dpkg::Options::=--force-confold \\
    "$@"
}

repair_termux_curl() {
  if curl_works; then
    return 0
  fi

  printf '%s\\n' "curl est cassé ou manquant; réparation des paquets Termux..."

  if ! command -v apt >/dev/null 2>&1; then
    printf '%s\\n' "apt est indisponible, réparation automatique impossible."
    return 1
  fi

  apt_termux update </dev/null >/dev/null 2>&1
  dpkg --force-confdef --force-confold --configure -a </dev/null >/dev/null 2>&1
  apt_termux full-upgrade -y </dev/null >/dev/null 2>&1
  apt_termux install --reinstall curl openssl libngtcp2 -y </dev/null >/dev/null 2>&1 || apt_termux install curl openssl libngtcp2 -y </dev/null >/dev/null 2>&1

  curl_works
}

mkdir -p "$tmp_dir"
repair_termux_curl
curl -fsSL https://raw.githubusercontent.com/dianedef/dotfiles/main/dotfiles/install-termux.sh -o "$tmp_file"
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
