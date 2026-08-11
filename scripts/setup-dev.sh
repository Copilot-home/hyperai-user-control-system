#!/bin/bash

# Development environment setup aligned to the HyperAI autonomy contract.
set -euo pipefail

PROJECT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$PROJECT_DIR"

echo "=== HyperAI local setup ==="
echo "Active runtime lane: backend/server.js on port 5000."
echo "Non-live lanes (NotebookLM, empathy, Vietnamese, user CRUD, websocket) stay behind the VITE_ENABLE_* flags."
echo "Before any runtime change, run python tools/hyperai_autonomous_cycle.py and consult memory/master_autonomous_todo.md."

echo
echo "Updating package lists..."
sudo apt-get update

echo
echo "Installing Node.js and npm..."
sudo apt-get install -y nodejs npm

echo
echo "Installing project dependencies..."
npm install

echo
echo "Probing backend port 5000 before recommending a runtime change..."
if node scripts/tooling/probe-port.mjs 5000 >/dev/null 2>&1; then
  echo "Port 5000 is free; you can start backend/server.js after confirming the Autonomous Queue."
else
  echo "Port 5000 is already occupied; respect the existing runtime before touching backend/server.js."
fi

echo
echo "Reminder:"
echo "1. Run python tools/hyperai_autonomous_cycle.py before trusting a new runtime state."
echo "2. Use npm run ci:build (and npm run ci:browser-smoke only when symphony/dashboard routes change)."
echo "3. Use npm test -- --runInBand and npm run lint only as advisory commands that exit early when the lane is locked."

echo
echo "Development environment setup complete."
