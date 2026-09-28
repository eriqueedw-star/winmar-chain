#!/usr/bin/env bash
set -euo pipefail

if ! command -v sha256sum >/dev/null 2>&1; then
  echo "sha256sum is required" >&2
  exit 1
fi

version="${1:-unversioned}"
out="${2:-checksums/SHA256SUMS-${version}.txt}"

mkdir -p "$(dirname "$out")"
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

while IFS= read -r -d '' file; do
  case "$file" in
    checksums/SHA256SUMS-*.txt)
      continue
      ;;
  esac
  sha256sum "$file" >> "$tmp"
done < <(git ls-files -z | sort -z)

{
  printf '# Winmar Chain release checksum manifest\n'
  printf '# Version: %s\n' "$version"
  printf '# Source commit: %s\n' "$(git rev-parse HEAD)"
  printf '# Generated UTC: %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  cat "$tmp"
} > "$out"

echo "$out"
