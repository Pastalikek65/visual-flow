#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p tmp-wasm
echo '{"type":"commonjs"}' > tmp-wasm/package.json
"$HOME/.cargo/bin/wasm-bindgen" --target nodejs --out-dir tmp-wasm --out-name flow_core \
  target/wasm32-unknown-unknown/release/flow_core.wasm
node scripts/wasm-smoke.cjs