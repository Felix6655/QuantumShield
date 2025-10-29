#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo ">> Killing ports 3000/3001 if busy"
sudo lsof -iTCP:3000 -sTCP:LISTEN -n -P | awk 'NR>1 {print $2}' | xargs -r kill -9 || true
sudo lsof -iTCP:3001 -sTCP:LISTEN -n -P | awk 'NR>1 {print $2}' | xargs -r kill -9 || true

echo ">> Cleaning"
rm -rf .next .turbo node_modules || true
cargo clean || true

echo ">> Installing front-end deps"
(if command -v pnpm >/dev/null; then pnpm install; else npm install; fi)

echo ">> Launching walletd"
( cargo run -p qs-walletd & ) >/tmp/qs-walletd.out 2>&1
sleep 2
curl -sf http://127.0.0.1:8787/readyz || (echo "walletd not ready" && tail -n 80 /tmp/qs-walletd.out && exit 1)

echo ">> Launching Next on :3001"
(if command -v pnpm >/dev/null; then pnpm dev -p 3001; else npm run dev -- -p 3001; fi)
