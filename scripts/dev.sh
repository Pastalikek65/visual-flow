#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

npm run wasm:build:dev
cd apps/web && npx vite