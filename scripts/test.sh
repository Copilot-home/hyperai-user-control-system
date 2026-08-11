#!/bin/bash

# Verification script aligned to the active runtime contract.
set -euo pipefail

PROJECT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$PROJECT_DIR"

echo "=== HyperAI verification manifesto ==="
echo "Runtime reality: backend/server.js on port 5000 is the CI truth."
echo "Legacy lanes (NotebookLM, empathy, Vietnamese, user CRUD, websocket) are quarantined behind VITE_ENABLE_* flags."
echo "ci:build and ci:browser-smoke remain the only hard gates for runtime changes."

echo
echo "Probing port 5000 before verification."
if node scripts/tooling/probe-port.mjs 5000; then
  echo "Port 5000 is free; verification will keep the current backend as the gold truth."
else
  echo "Port 5000 is occupied. Respect the live process before making additional runtime changes."
fi

echo
echo "Running required CI build gate..."
npm run ci:build

echo
echo "Running advisory legacy Jest suite (uses jest.config.js). These tests exit early when the symphony lane is locked."
npm test -- --runInBand || true

echo
echo "Running advisory legacy ESLint (uses .eslintrc.cjs). It also exits early when the lane is locked."
npm run lint || true

echo
echo "Verification script completed."
