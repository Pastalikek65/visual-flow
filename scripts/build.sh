#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "[1/4] wasm build"
npm run wasm:build

echo "[2/4] types"
npx tsc --noEmit -p packages/flow-types
npx tsc --noEmit -p packages/flow-engine
npx tsc --noEmit -p apps/web

echo "[3/4] tests"
npm run test:rust

echo "[4/4] vite build"
cd apps/web && npx vite build

echo "done -> apps/web/dist"