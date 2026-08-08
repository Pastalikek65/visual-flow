#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "[1/4] cargo fmt --check"
cargo fmt --all -- --check

echo "[2/4] cargo clippy"
cargo clippy --workspace --all-targets -- -D warnings

echo "[3/4] typecheck"
npm run typecheck

echo "[4/5] vitest"
npm run test:ts

echo "[5/5] wasm bridge smoke"
npm run test:wasm