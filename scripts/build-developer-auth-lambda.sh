#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
function_dir="$repo_root/infra/developer-auth/function"
output_dir="$repo_root/infra/developer-auth/build"

if [[ ! -f "$function_dir/package-lock.json" ]]; then
  echo "Missing Lambda package-lock.json. Run npm install in infra/developer-auth/function first." >&2
  exit 1
fi

pushd "$function_dir" >/dev/null
npm ci --ignore-scripts --no-audit --no-fund
mkdir -p "$output_dir/package"
./node_modules/.bin/esbuild "$function_dir/index.mjs" \
  --bundle --platform=node --target=node22 --format=esm \
  --outfile="$output_dir/package/index.mjs"
popd >/dev/null

python3 - "$output_dir/package/index.mjs" "$output_dir/function.zip" <<'PY'
import pathlib
import sys
import zipfile

source = pathlib.Path(sys.argv[1])
archive = pathlib.Path(sys.argv[2])
archive.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
    bundle.write(source, "index.mjs")
print(f"Created {archive}")
PY
