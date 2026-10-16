#!/bin/bash
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo 'Node.js LTS를 먼저 설치해주세요: https://nodejs.org/'
  read -r -p 'Enter를 눌러 종료합니다.'
  exit 1
fi
if [ ! -f dist-web/index.html ]; then
if [ ! -f node_modules/expo/package.json ]; then
  npm ci --no-audit --no-fund
fi
npm run build:web
fi
node scripts/pc-preview.mjs
