# End-User Release Execution Plan

Branch: `release/end-user-package-2026-10-12`
Specification authority: APΩ/HyperAI per-runtime release design dated 2026-10-12.

## Objective

Turn the existing verified runtime contract into a distributable package without replacing the current backend authority, changing Vercel production, or inventing local proof.

## Phase status

- Stage 1 — Context ingestion: COMPLETE at ecosystem level; local live probes remain UNVERIFIED because the remote desktop connector reports quota exhaustion.
- Stage 2 — Architecture/deep audit: IN PROGRESS/THIS DOCUMENT + `ARCHITECTURE.md`.
- Stage 3 — Refactor/completion: PENDING TDD.
- Stage 4 — Dynamic verification: PENDING GitHub Actions clean-room run and, when available, local probe.
- Stage 5 — Packaging: PENDING.
- Stage 6 — Handoff: PENDING.

## Execution ledger

### A. Release contract test first

1. Add `tests/release/release-package-contract.test.mjs`.
2. Assert required end-user files are absent/present as appropriate and package exclusions are enforced.
3. Push test-only commit and open/update PR to run a real failing clean-room test before implementation.
4. Preserve the failing workflow/run as RED evidence.

### B. One-click launchers

Create only after RED is observed:

- `run.sh`
- `start.bat`
- `RELEASE.md`

Both launchers reuse `docker/docker-compose.yml`; no duplicate Compose topology.

Required behavior:

- verify Docker command exists;
- verify `docker compose` works;
- run `docker compose -f docker/docker-compose.yml config`;
- build and start services;
- poll backend `/api/health` and frontend `:4173` with a bounded timeout;
- return non-zero on failure;
- print final URLs only after successful health readback.

### C. Environment reconciliation

Update `.env.example` with safe names/examples for the shipped path and tooling. Never place a real secret or token in Git.

Separate variables into:

- normal end-user core;
- runtime/build tooling;
- optional providers/connectors;
- optional PostgreSQL subsystem.

### D. State/runtime fixes

Do not refactor state writers merely because they look imperfect. For every behavior fix:

1. write a minimal failing test;
2. run it in clean-room CI;
3. implement only after RED;
4. verify targeted and repository tests.

Candidate audit areas:

- interrupted/concurrent JSON state writes;
- missing/invalid runtime manifest semantics;
- platform-specific recovery assumptions.

### E. Packaging

Create `scripts/release/package-release.mjs` after a failing package contract exists.

Required packager properties:

- deterministic sorted file selection;
- exclude `.git`, `node_modules`, virtualenvs, caches, logs, `.env`, credentials/secrets and generated scratch;
- include application source, lockfile, Docker surface, release launchers/docs and required static assets;
- output ZIP plus a JSON release manifest containing file count, byte size and SHA-256.

### F. CI release proof

Add a release job without weakening current CI. Required release decision evidence:

- agent runtime contracts: success;
- Docker surface audit: success;
- production build: success;
- browser smoke: success;
- autonomous boundary proof: success;
- runtime dependency audit/E-D NARSG contract: success;
- PostgreSQL integration: success where present;
- release package contract: success;
- ZIP generation: success;

Legacy/advisory suites are reported separately if skipped/tolerated by repository policy.

### G. Handoff

Final report must include:

- actual changed features/fixes;
- artifact filename;
- exact archive size;
- SHA-256;
- actual workflow run/artifact reference;
- one-click command;
- verified default URLs;
- local smoke status (PASS only if executed, otherwise UNVERIFIED);
- three scale/maintenance priorities derived from observed architecture.

## Current rulings

1. **Compose source of truth:** use `docker/docker-compose.yml`. Creating a second full root Compose file would create drift. A root compatibility wrapper/symlink is not required for one-click scripts.
2. **Node version:** Node 20 is release authority because CI and backend/frontend Dockerfiles use it. Root Node 18 Dockerfile is recorded drift, not silently used.
3. **Persistence:** do not mount workstation `../runtime` state into the package. Its path is outside the project and includes orchestration evidence not owned by the distributable app.
4. **Local verification:** current local runtime is unknown until a tool can execute a probe. GitHub Actions is allowed as real clean-room verification; it is not a simulation.
5. **LLM/provider integration:** deferred unless required by an existing hard-gate path. Runtime/package correctness comes first.
