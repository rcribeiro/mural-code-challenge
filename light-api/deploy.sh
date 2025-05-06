#!/usr/bin/env bash
set -euo pipefail

echo "🚀  Building Lambda package (LoopBack 4)…"

need_install() {
  [[ ! -x node_modules/.bin/tsc ]]   && return 0   # compiler missing
  [[ ! -d node_modules             ]] && return 0
  return 1
}

# ─────────────────────────── 1 · dependencies
if need_install; then
  echo "📦  Installing dependencies (npm ci)…"
  rm -rf node_modules package-lock.json
  npm ci
fi

# ─────────────────────────── 2 · compile TypeScript → dist/**/*.js
echo "🔨  Compiling TypeScript…"
rm -rf dist
rm -f  *.tsbuildinfo            # stale incremental info
npm run build                   # uses tsconfig.build.json

# sanity-check
[[ -d dist && -n $(ls -A dist) ]] \
  || { echo "❌  dist/ is empty – nothing to package"; exit 1; }

# ─────────────────────────── 3 · package handler  → lambda.zip
echo "📦  Creating Lambda zip…"
(
  cd dist
  zip -qr ../lambda.zip .       # pack ALL js + maps
)

# ─────────────────────────── 4 · optional layer with prod deps
if [[ "${1-}" == "--with-layer" ]]; then
  echo "📦  Building Lambda layer (production dependencies)…"
  rm -rf lambda-layer
  mkdir -p lambda-layer/nodejs

  # copy manifest & install prod deps inside layer dir
  cp package.json package-lock.json lambda-layer/nodejs/ 2>/dev/null || true
  (
    cd lambda-layer/nodejs
    npm ci --production --ignore-scripts
  )

  ( cd lambda-layer && zip -qr ../lambda-layer.zip . )
  rm -rf lambda-layer
fi

echo "✅  lambda.zip size      : $(du -h lambda.zip        | cut -f1)"
[[ -f lambda-layer.zip ]] && \
echo "✅  lambda-layer.zip size: $(du -h lambda-layer.zip  | cut -f1)"
