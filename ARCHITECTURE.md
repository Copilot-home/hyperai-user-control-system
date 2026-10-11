# HyperAI User Control System — Release Architecture

Date: 2026-10-12
Release branch: `release/end-user-package-2026-10-12`

## 1. Product boundary

This repository is the operator/control surface for the HyperAI autonomy runtime. The release boundary is the code required to boot and verify the browser shell and its Node backend. It does not absorb the whole HyperAI historical lineage, external cloud accounts, or workstation orchestration directories.

### Canonical shipped processes

| Process | Entry | Port | Health proof |
|---|---|---:|---|
| Backend | `node backend/server.js` | 5000 | `GET /api/health` |
| Frontend | Vite production build + `vite preview` | 4173 | HTTP 2xx on `/` |

The repository README and CI identify `backend/server.js` as the current runtime authority. `backend/server.ts` and other lanes are not promoted by this release merely because their source exists.

## 2. Runtime topology

```text
End user/browser
      |
      v
Frontend :4173  ---- HTTP /api ----> Backend :5000
                                        |
                                        +--> runtime JSON/state registries
                                        +--> local proof/probe helpers
                                        +--> optional PostgreSQL E-D NARSG path
                                        +--> optional Telegram/Python connector tools
                                        +--> optional external/provider surfaces
```

`docker/docker-compose.yml` is the only Compose source of truth for this release. It builds:

- `docker/Dockerfile.frontend` — Node 20, `npm ci`, `npm run ci:build`, Vite preview on 4173.
- `docker/Dockerfile.backend` — Node 20, `npm ci`, backend on 5000.

Both services have healthchecks. Frontend waits for backend health.

The root `Dockerfile` currently uses Node 18 and is not the Compose release Dockerfile. This is recorded as tooling drift. The release does not switch the active Compose path to it.

## 3. Application composition

Frontend root: `src/main.tsx`.

`src/main.tsx` installs a render error boundary and boots `App` under React StrictMode.

`src/App.tsx` composes these providers:

- `EmpathyProvider`
- `SymphonyProvider`
- `UserProvider`
- `AutonomyProvider`
- `ThemeProvider`

and routes:

- `/`
- `/chat`
- `/missions`
- `/systems`
- `/symphony-control`
- `/settings`

The release preserves this route and provider composition.

## 4. Backend service boundary

`backend/server.js` is a real orchestration runtime, not a thin mock. It currently combines:

- HTTP/Socket.IO server setup
- health/runtime authority probes
- autonomy runtime state
- managed-runtime recovery
- HOTL approval queue
- workspace graph/mission/proof/provider/control payloads
- Telegram connector execution adapters
- local Ollama/API compatibility probes
- local AIDEV/proof surface probes
- repository/GitHub surface inspection
- optional external/provider/runtime integrations

This release does not rewrite that large module wholesale. Behavioral fixes must be narrow, test-first, and preserve existing endpoints.

## 5. Runtime state ownership

Observed state writers/readers include:

| State | Code owner | Current path model | Release treatment |
|---|---|---|---|
| Autonomy state | `backend/services/autonomyRuntime.js` | `runtime/hyperai-autonomy-state.json` resolved above project root | Workstation/orchestration state; not blindly mounted into end-user container |
| HOTL approvals | `backend/services/hotlApprovalGate.js` | `runtime/hotl-approval-queue.json` resolved above project root | Same; packaging must not assume host parent layout exists |
| Runtime authority manifest | `backend/services/runtimeAuthority.js`, runtime scripts | `runtime/hyperai-autonomous-runtime.json` resolved above project root | Runtime evidence; missing state must be represented conservatively |
| Federation/orchestrator registries | `backend/server.js` | `runtime/federation_orchestrator/*` above project root | Optional external/local orchestration context |
| PostgreSQL durable state | `backend/ed-narsg/*` | `DATABASE_URL` or PG* envs | Optional durable subsystem with real CI integration |

### Persistence decision

No new Docker volume is added to an arbitrary `../runtime` host path in this release until the product-state boundary is made container-local. Mounting the developer workstation's parent runtime tree into a distributable package would create an invalid dependency and could expose unrelated state.

The base end-user package therefore boots the core backend/frontend without claiming persistence for workstation-only orchestration registries. Durable database behavior remains opt-in through the existing PostgreSQL environment contract.

## 6. Runtime authority semantics

`backend/services/runtimeAuthority.js` classifies the system from `hyperai-autonomous-runtime.json` when available. A missing manifest currently yields an `unknown` classification and derived dormant boundary, although a default selected action may still be `reuse_default_runtime`.

Release rule:

- state/classification is evidence-bearing;
- an action recommendation is not itself proof of liveness;
- end-user health is determined by actual HTTP healthchecks and CI/browser smoke, not by the wording of a manifest fallback.

No global permission layer is introduced.

## 7. Environment contract

### Core/end-user

- `PORT` — backend listen port; default 5000.
- `VITE_API_BASE_URL` — explicit browser API base; default build path is `/api` through tooling.
- `VITE_API_ORIGIN` — optional API origin.
- `VITE_WEBSOCKET_URL` — optional explicit WebSocket origin.

### Runtime feature flags

- `VITE_ENABLE_CHAT_RUNTIME`
- `VITE_ENABLE_USER_RUNTIME`
- `VITE_ENABLE_NOTEBOOKLM_RUNTIME`
- `VITE_ENABLE_WEBSOCKET_RUNTIME`
- repository tooling also references `VITE_ENABLE_SYMPHONY_RUNTIME`.

Unset/false optional lanes remain local-only/disabled according to existing repository behavior.

### Managed runtime / verification

- `HYPERAI_DEFAULT_BACKEND_PORT` (default 5000)
- `HYPERAI_DEFAULT_FRONTEND_PORT` (default 4173)
- `HYPERAI_FALLBACK_BACKEND_PORT` (default 5001)
- `HYPERAI_FALLBACK_FRONTEND_PORT` (default 4177)
- `HYPERAI_RUNTIME_RECOVERY_COOLDOWN_MS` (default 120000)
- `HYPERAI_BUILD_API_BASE_URL`
- `HYPERAI_DRILL_SKIP_BROWSER_SMOKE`
- `SMOKE_TIMEOUT_MS`

These variables are used by runtime/CI tooling. They are documented but do not need to be set by a normal Docker end user.

### Optional external integrations

- `HYPERAI_UPSTREAM_URL`
- `HYPERAI_PUBLIC_ORIGIN`
- `NOTEBOOKLM_API_BASE_URL`
- `GOOGLE_CLOUD_ACCESS_TOKEN`
- `NOTEBOOKLM_ACCESS_TOKEN`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_API_BASE_URL`
- `PYTHON`
- `DATABASE_URL`
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`
- `JEV_WORKER_URL`
- `HYPERAI_VSCODE_CANON_PATH`

Real secret values are never part of the release artifact.

## 8. API contract classes

The backend contains a broad route surface. For release verification routes are classified by behavior rather than falsely asserting every historical lane is live.

### Core health/runtime

| Contract | Purpose | Release expectation |
|---|---|---|
| `GET /api/health` | backend liveness | MUST return success in smoke tests |
| `GET /api/runtime/capabilities` | runtime capability/evidence description | MUST be readable; content depends on available local evidence |
| `GET /api/runtime/state` | boundary/runtime classification | MUST be readable; no forced autonomous classification |
| `GET /api/symphony/status` | symphony status | Existing proven shell route |
| `POST /api/symphony/start` | start symphony behavior | Existing runtime route; mutation tested by current smoke/contract where applicable |
| `POST /api/symphony/stop` | stop symphony behavior | Existing runtime route |

### Orchestration/workspace

`backend/server.js` also exposes workspace graph/session/proof/mission/control surfaces, autonomy state/heartbeat routes, GitHub-agent status, HOTL approvals and connector/runtime routes. Their response structures are derived from local registries and current runtime evidence; absence of an optional registry must not be converted into fabricated success.

### Optional/quarantined source lanes

Source for NotebookLM, empathy, Vietnamese, user CRUD, WebSocket and historical server variants exists. They remain controlled by existing feature/runtime classification rules and are not automatically promoted by packaging.

## 9. Database schema boundary

The shipped app is not a single mandatory relational-database application. A PostgreSQL durable store exists for the E-D NARSG subsystem and CI runs it against PostgreSQL 17. Other runtime state is currently JSON/file-backed.

Therefore the release architecture has two state classes:

```text
Core shell/runtime metadata -> file/registry context (optional / local)
E-D NARSG durable state      -> PostgreSQL (optional, tested independently)
```

A fake unified ERD would be misleading. The Stage 2 database model is intentionally scoped to the real durable subsystem; migrations/schema for that subsystem remain owned by its existing code/tests.

## 10. Service flow

```text
Browser request
  -> React route/provider
  -> service/API client
  -> backend/server.js
  -> runtime service or registry adapter
  -> real side effect/probe where configured
  -> readback/evidence payload
  -> frontend state/render
```

For mission execution, the existing agent-runtime contract demonstrates the intended lifecycle:

`discover -> decompose -> capability census -> select -> authorize -> execute -> observe -> final readback`

This release preserves that lifecycle rather than replacing it with an LLM-only decision path.

## 11. Security and reliability audit findings

### Confirmed

1. **Container/toolchain drift:** root Dockerfile uses Node 18; Compose/CI release path uses Node 20. Release source of truth is Node 20 Dockerfiles.
2. **State writes are synchronous direct writes:** autonomy/HOTL runtime JSON writers use `writeFileSync` directly. Crash-atomicity/concurrency hardening is a candidate, but code changes require a failing reproduction test first.
3. **Broad CORS:** Express and Socket.IO currently accept broad origins. This is an existing compatibility choice. Do not narrow it in the packaging branch without an explicit client contract test.
4. **Optional auth source contains an unsafe fallback secret:** `backend/middleware/auth.ts` uses `JWT_SECRET || 'your_secret_key'`. That TypeScript lane is not the declared active backend path, but it is a real security debt item and must not be promoted without repair.
5. **External proxy fails closed when upstream is missing:** `api/index.js` depends on `HYPERAI_UPSTREAM_URL`; this belongs to Vercel/cloud proxy operation, not local Docker bootstrap.
6. **Platform-specific managed recovery:** autonomous runtime start/stop tooling contains Windows PowerShell/taskkill behavior. Core Docker launchers must not depend on that code path to boot on macOS/Linux.
7. **Legacy test/lint semantics are advisory:** repository scripts can intentionally skip or tolerate legacy suites. Release reports distinguish these from hard gates.

### Not yet proven as defects

- file-state race/corruption under concurrent writers;
- command injection in connector helpers;
- CORS origin exposure causing an exploitable production boundary;
- runtime authority fallback causing an incorrect external action.

These stay audit findings until a reproducible test proves a behavior defect. No speculative code patch is authorized by this document.

## 12. Build and verification contract

Hard clean-room evidence:

- `npm run test:agent-runtime`
- `node scripts/ci/validate-docker-surface.mjs`
- `npm run ci:build`
- `npm run ci:browser-smoke`
- `npm run ci:autonomous-boundary-proof`
- `npm audit --omit=dev --audit-level=low`
- `python3 -m py_compile jev-worker/server.py`
- `npm run test:ed-narsg`
- real PostgreSQL integration test from CI
- release-package contract test added by this branch

Only actual successful executions count as PASS.

## 13. Distribution boundary

The ZIP contains the repository files required for the core release plus launchers/docs. It excludes:

- `.git`
- `node_modules`
- Python virtualenvs
- caches
- transient logs
- `.env` and credential/secret files
- developer-only runtime evidence outside the repository

Default access after verified start:

- UI: `http://localhost:4173`
- Backend: `http://localhost:5000`
- Health: `http://localhost:5000/api/health`

These are contract defaults, not claims that a specific local machine is currently running them.
