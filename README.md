# HyperAI User Control System

The HyperAI User Control System is the orchestrator for the autonomy dashboards. The active runtime surface is autonomy-and-symphony first: the browser shell promotes the autonomy/symphony command plane backed by `backend/server.js` on port `5000`, while every other lane remains quarantined, degraded, local-only, or optional until the Autonomous Queue deliberately promotes it.

## Runtime truth

- Product surface: `C:\Users\pc\HyperAI_Phoenix_Master\hyperai-user-control-system`
- Frontend entry: `src/main.tsx`
- App root: `src/App.tsx`
- CI/runtime backend path: `backend/server.js` (listens on port `5000`)
- Proven live shell endpoints: `GET /api/health`, `GET /api/symphony/status`, `POST /api/symphony/start`, `POST /api/symphony/stop`
- Runtime authority probe: `GET /api/runtime/capabilities`
- Runtime classification probe: `GET /api/runtime/state` reports Dormant/Recoverable/Operational/Autonomous plus heartbeat/probe proofs so the dashboard can display the boundary’s current status.
- CI source of truth: `.github/workflows/ci.yml`
- Hard verification gates: `npm run ci:build`, `npm run ci:browser-smoke`

### Runtime rules

1. Always probe port `5000` before touching `backend/server.js`. If another process already owns the port, document its PID and start time and treat it as the live process until it is intentionally recycled.
2. Non-core browser lanes (`backend/server.ts`, NotebookLM, empathy, Vietnamese, user CRUD, websocket routes) remain quarantined behind the `VITE_ENABLE_*` flags; do not assume they are authoritative without new Autonomous Queue evidence.
3. Use `/api/runtime/capabilities` and the Runtime Lane Status cockpit to distinguish a fresh backend listener from a stale process that merely still responds.
4. Follow the Autonomous Queue cycle before pulling new runtime conclusions:
   - `python tools/hyperai_autonomous_cycle.py`
   - `memory/master_autonomous_todo.md`
   - `memory/runtime_execution_todo.md`
   Process-first and delta-first means that if nothing changed since the last cycle, do not restart the backend nor run expensive verification.

## Quarantine flags

- `VITE_ENABLE_VIETNAMESE_RUNTIME`
- `VITE_ENABLE_EMPATHY_RUNTIME`
- `VITE_ENABLE_USER_RUNTIME`
- `VITE_ENABLE_NOTEBOOKLM_RUNTIME`
- `VITE_ENABLE_WEBSOCKET_RUNTIME`

When these flags are `true`, the corresponding lane is released from fallback mode. When they are unset or `false`, clients return static/local-only responses and the lane is treated as non-live in documentation and tooling.

## Memory & autonomy playbooks

- Record every runtime decision in the memory capsules: `memory/agent1_*.md` through `memory/agent6_*.md`, and keep `memory/agent6_synthesis_capsule.md` in sync after major changes.
- Use the Autonomous Queue before changing runtime or toolchain knowledge. The queue files track the outstanding work for Russell (tooling drift), Erdos (backend contracts), Kuhn (frontend composition), and Sartre (synthesis/backlog refresh).
- The README and scripts should cite those artifacts when describing required commands or verification steps.

## Tooling & verification narrative

- **Required**: `npm run ci:build`, `npm run ci:browser-smoke`. The CI workflows (`.github/workflows/ci.yml` → `build-artifact` + `browser-agent-smoke`) rely on these gates to prove the symphony path.
- **Advisory**: `npm test -- --runInBand`, `npm run lint`. These commands now execute via `scripts/tooling/run-legacy-jest.mjs` and `scripts/tooling/run-legacy-eslint.mjs`, enforcing `jest.config.js` and `.eslintrc.cjs`. They exit early with a clear message when the symphony runtime lane is not enabled because the broader lanes are intentionally quarantined.
- When the advisory commands fail, note the failure in the Autonomous Queue instead of assuming the live backend is broken. The queue already tracks the tooling drift work for Russell.

## Command guidance

- `scripts/build.sh`: installs dependencies, probes port `5000`, warns that `backend/server.ts` is informational only, and runs `npm run ci:build`.
- `scripts/test.sh`: runs `npm run ci:build`, then the advisory legacy tests and lint (`npm test -- --runInBand || true`, `npm run lint || true`), while restating that they are non-critical because the symphony lane is locked.
- `scripts/deploy.sh`: enforces the local-first rule—if port `5000` already has a listener, it reports the owning PID/start time, refuses to boot a second `backend/server.js`, and instructs the operator to resolve the stale process first.
- `scripts/setup-dev.sh`: provides the same runtime story while bootstrapping dependencies; it recommends running the Autonomous Queue, probing port `5000`, and using `npm run ci:build` as the primary verification gate.

## Running locally

1. `npm install`
2. `python tools/hyperai_autonomous_cycle.py`
3. Probe port `5000` before restarting the backend; capture the owning PID and timestamps.
4. `npm run ci:build`
5. Run `npm run ci:browser-smoke` only when dashboard routing or the active symphony endpoints change.

## Contribution & reporting

Before piecework, check `memory/master_autonomous_todo.md` to understand which agent owns the scope and how it still needs to evolve. Update the queue, re-run the cycle, and refresh the relevant capsule when you finalize a decision so the automation queue and `memory/project_state.json` stay aligned.
