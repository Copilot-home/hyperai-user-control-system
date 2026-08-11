# Backend Runtime Note

The authoritative backend runtime is `backend/server.js`. CI, local automation, and production automation boot this file on port `5000`; the rest of this workspace should treat it as the live contract until the Autonomous Queue intentionally replaces it.

## Why `server.js` is truth

- The CI workflow (`.github/workflows/ci.yml`) starts `node backend/server.js` before running `ci:browser-smoke`, so the live process on port `5000` is a plain-JavaScript listener.
- Local coordination always probes port `5000` first; if a process owns the port, it is assumed to be the `backend/server.js` instance even if the source on disk diverges.
- `backend/server.ts` is present for future TypeScript work but is **not executed** by current runtime/prod pipelines. Treat it as a reference model, not the live process.

## Process-first guidance

1. Probe port `5000` before restarting the backend. Log the owning PID, command line, and start time. If the process predates the last modification to `backend/server.js`, classify the listener as a stale process and do not rebuild until it is manually recycled.
2. Backends that expose non-symphony lanes (NotebookLM, empathy, Vietnamese, user CRUD, websockets) are quarantined behind `VITE_ENABLE_*` runtime flags. Do not declare them live in consumer code unless a future Autonomous Queue entry proves them.
3. Process changes must be reflected in the memory queue (`memory/master_autonomous_todo.md` + `memory/runtime_execution_todo.md`) before updating documentation or automation reports.

## Future unification

If a future cycle decides to restore `backend/server.ts` as the running backend, update:

- The build pipeline to compile the TypeScript server (`tsc` or `esbuild` step).
- The `package.json` scripts and `.github/workflows/ci.yml` to launch the compiled bundle instead of `backend/server.js`.
- All `/api/*` contracts so they are synchronized with the TypeScript routes/controllers.
- The memory capsules (`memory/agent3_api_client_contract_capsule.md`, `memory/agent4_frontend_composition_capsule.md`, etc.) to describe which new endpoints are considered live.

Record those decisions in `memory/agent6_synthesis_capsule.md` before believing the TypeScript server is authoritative.
