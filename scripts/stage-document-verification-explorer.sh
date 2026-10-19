#!/usr/bin/env bash
# Stage reviewed public Explorer UI bytes in a versioned release directory.
# NON-DESTRUCTIVE: does not set 'current', edit Nginx, reload processes, send
# blockchain TX, call private servers, or alter production routes.
set -euo pipefail

if [[ $# -ne 3 ]]; then
  printf 'Usage: %s <reviewed-artifact-directory> <release-root-directory> <full-git-sha>\n' "$0" >&2
  exit 2
fi

artifact="$(realpath -e "$1")"
releases="$(realpath -m "$2")"
sha="$3"
if [[ ! "$sha" =~ ^[0-9a-fA-F]{40}$ ]]; then
  echo 'FAIL: expected full 40-character reviewed Git commit SHA' >&2
  exit 2
fi
if [[ ! -d "$artifact/site/document-verification" ||
      ! -f "$artifact/site/verify.html" ||
      ! -f "$artifact/SHA256SUMS" ||
      ! -f "$artifact/manifest.json" ]]; then
  echo 'FAIL: missing reviewed static Explorer release files' >&2
  exit 2
fi
# Never stage directly atop an existing release or its 'current' symlink.
if [[ "$releases" == "/" || "$releases" == "$artifact" ||
      "$releases" == "$artifact/"* ]]; then
  echo 'FAIL: unsafe release root' >&2
  exit 2
fi

(
  cd "$artifact"
  sha256sum --check SHA256SUMS >/dev/null
)

mkdir -p "$releases"
destination="$releases/$sha"
if [[ -e "$destination" || -L "$destination" ]]; then
  echo 'FAIL: immutable release directory already exists' >&2
  exit 2
fi

umask 022
tmp="$(mktemp -d "$releases/.verify-stage.XXXXXXXX")"
cleanup() {
  if [[ -d "$tmp" ]]; then
    rm -rf -- "$tmp"
  fi
}
trap cleanup EXIT
mkdir -p "$tmp/site"
cp -a -- "$artifact/site/." "$tmp/site/"
cp -- "$artifact/SHA256SUMS" "$artifact/manifest.json" "$tmp/"
(
  cd "$tmp"
  sha256sum --check SHA256SUMS >/dev/null
)
if [[ ! -f "$tmp/site/document-verification/verify.js" ||
      ! -f "$tmp/site/verify.html" ]]; then
  echo 'FAIL: invalid staged Nginx document root' >&2
  exit 2
fi

# mktemp -d creates mode 0700 even with umask 022; the public Nginx
# worker cannot traverse that directory. Permit read/traverse of reviewed,
# checksum-pinned static UI bytes, but never make the release world-writable.
chmod 0755 -- "$tmp"
# These release directories are immutable; never replace a reviewed version.
mv -nT -- "$tmp" "$destination"
if [[ ! -f "$destination/site/verify.html" ]]; then
  echo 'FAIL: release copy did not complete' >&2
  exit 1
fi
tmp=''
printf 'STAGED (NOT DEPLOYED): %s\n' "$destination"
printf 'Nginx document root after operator approval: %s/site\n' "$destination"
printf 'No live route, symlink or reverse proxy was changed.\n'
