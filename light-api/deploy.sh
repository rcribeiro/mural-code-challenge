#!/usr/bin/env bash
set -euo pipefail

echo "🚀  Building Lambda package (LoopBack 4)…"

need_install() {
  [[ ! -x node_modules/.bin/tsc ]] && return 0
  [[ ! -d node_modules          ]] && return 0
  return 1
}

# 1 ▸ install dev+prod deps once
if need_install; then
  echo "📦  Installing dependencies (npm ci)…"
  rm -rf node_modules package-lock.json
  npm ci
fi

# 2 ▸ compile TS → dist/**.js
echo "🔨  Compiling TypeScript…"
rm -rf dist *.tsbuildinfo
npm run build

# 3 ▸ sanity-check & zip code
[[ -d dist && -n $(ls -A dist) ]] \
  || { echo "❌ dist/ empty – abort"; exit 1; }

(cd dist && zip -qr ../lambda.zip .)
echo "✅ lambda.zip            : $(du -h lambda.zip | cut -f1)"

# 4 ▸ build dependency layer (ALWAYS)
echo "📦  Creating Lambda layer (prod deps)…"
rm -rf lambda-layer lambda-layer.zip
mkdir -p lambda-layer/nodejs

cp package.json package-lock.json lambda-layer/nodejs/
(
  cd lambda-layer/nodejs
  npm ci --production --ignore-scripts
)

( cd lambda-layer && zip -qr ../lambda-layer.zip . )
rm -rf lambda-layer
echo "✅ lambda-layer.zip      : $(du -h lambda-layer.zip | cut -f1)"
