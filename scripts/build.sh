#!/bin/bash

# Build script aligned to the active CI/runtime contract.
set -euo pipefail

PROJECT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$PROJECT_DIR"

echo "=== HyperAI build manifest ==="
echo "Active backend truth: backend/server.js on port 5000"
echo "Non-symphony lanes (empathy, Vietnamese, user, NotebookLM, websocket) remain behind the VITE_ENABLE_* flags."
echo "Backend/server.ts is informational only; it is not executed by CI or the live runtime."
echo "Refer to memory/master_autonomous_todo.md and memory/runtime_execution_todo.md before changing runtime expectations."

echo
echo "Probing port 5000 before build."
if node scripts/tooling/probe-port.mjs 5000; then
  echo "Port 5000 appears free; safe to rebuild backend artifacts."
else
  echo "Port 5000 is occupied. Keep the live process running; do not restart backend/server.js until the owner is intentionally recycled."
fi

echo
echo "Installing dependencies..."
npm install

echo
echo "Running CI build..."
npm run ci:build

echo
echo "Build contract complete. Remember that ci:build and ci:browser-smoke are the hard gates for runtime changes."
