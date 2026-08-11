#!/bin/bash

# Deploy helper aligned to the active runtime contract.
set -euo pipefail

PROJECT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$PROJECT_DIR"

echo "=== HyperAI deploy helper ==="
echo "Hard runtime truth: backend/server.js on port 5000, live symphony endpoints only."
echo "Non-live lanes (NotebookLM, empathy, Vietnamese, user CRUD, websocket) remain behind VITE_ENABLE_* flags."
echo "The deploy helper enforces the local-first rule: do not start a new backend if port 5000 is already occupied."

echo
echo "Probing backend port 5000 before deployment..."
if node scripts/tooling/probe-port.mjs 5000; then
  echo "Port 5000 is free; safe to start backend/server.js."
else
  echo "Port 5000 is already occupied. Inspect the live process (PID + netstat output above) and recycle it before deploying."
  exit 1
fi

echo
echo "Building the project..."
npm run ci:build

echo
echo "Starting backend server..."
node backend/server.js &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

echo
echo "Probing preview port 4173..."
if node scripts/tooling/probe-port.mjs 4173; then
  echo "Port 4173 is free; starting preview server."
  npm run preview:ci > preview.log 2>&1 &
  PREVIEW_PID=$!
  echo "Preview PID: $PREVIEW_PID"
else
  echo "Port 4173 is already occupied; please resolve the existing preview server before redeploying."
  kill "$BACKEND_PID" || true
  exit 1
fi

sleep 10

echo
echo "Deploy helper started."
echo "Backend authority: backend/server.js"
echo "Preview authority: npm run preview:ci"
