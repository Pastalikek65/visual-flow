#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../packages/flow-core"

. "$HOME/.cargo/env"

PROFILE="--release"
if [[ "${1:-}" == "--dev" ]]; then
  PROFILE=""
fi

echo "[wasm] building flow-core ($PROFILE)"
cargo build $PROFILE --target wasm32-unknown-unknown

TARGET_DIR="$(cd ../.. && pwd)/target"
WASM="$TARGET_DIR/wasm32-unknown-unknown/release/flow_core.wasm"
if [[ -z "$PROFILE" ]]; then
  WASM="$TARGET_DIR/wasm32-unknown-unknown/debug/flow_core.wasm"
fi

mkdir -p ../../apps/web/src/wasm-gen
wasm-bindgen "$WASM" \
  --target bundler \
  --out-dir ../../apps/web/src/wasm-gen \
  --out-name flow_core

echo "[wasm] bindings emitted -> apps/web/src/wasm-gen"
ls ../../apps/web/src/wasm-gen