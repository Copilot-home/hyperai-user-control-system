# E-D NARSG Production Core

## Purpose

This is the production-core boundary for the Evidence-Driven Non-Autoregressive State Graph. It is executor-agnostic: Jev is an executor implementation, not the state authority.

## P0 — Authority

The production rule is:

`capability != authorization != execution != verification != commit`

Only State Authority may commit state. An executor may execute an authorized action but cannot commit state. A verifier may verify evidence but cannot commit state.

Invariant:

`NO_ACTOR_EXCEPT_STATE_AUTHORITY_CAN_COMMIT_STATE`

The machine-readable authority matrix is in `backend/ed-narsg/authority-model.mjs`.

## P1 — Canonical protocol

Durable objects/events carry:

- `id`
- `type`
- `schema_version`
- `created_at`
- `source`
- `correlation_id`
- optional `causation_id`

Protocol objects are versioned under `EDNARSG-PROTOCOL-1.0`. Existing Jev contract primitives remain under `EDNARSG-1.0` for compatibility.

## P2 — Durable event + state core

The event core is append-only and hash-chained:

`event[n].previous_hash == event[n-1].event_hash`

Every event receives a SHA-256 content hash. A reducer reconstructs state from events; direct state mutation is outside this core.

The durable boundary is PostgreSQL-backed in `backend/ed-narsg/postgres-store.mjs`, using:

- append-only events;
- aggregate+sequence uniqueness;
- previous-hash chaining;
- state projections;
- transaction rollback;
- projection aggregate ownership checks;
- idempotency keys.

This boundary was exercised against PostgreSQL 17 in completed HyperAI CI run `#210` at the then-verified branch head `5fdaeb8f955c1b0ed1fae5b3a5ec2c89d9ac3692`: 7/7 durability integration tests passed.

## P1 — State model

State is multidimensional rather than one linear enum:

- existence
- identity
- location
- availability
- authorization
- task_status

Unknown is preserved explicitly.

A `COMMITTED` task state requires:

1. explicit commit authorization;
2. successful independent verification;
3. known mutation state;
4. State Authority execution of the commit.

## P3 — Execution and verification boundaries

Jev is wrapped by an explicit execution boundary and worker attestation:

- `backend/ed-narsg/jev-executor-adapter.mjs`
- `backend/ed-narsg/jev-worker-client.mjs`
- `backend/ed-narsg/jev-worker-attestation.mjs`
- `jev-worker/server.py`

Jev DONE/BLOCKED is treated as executor output, not business-state proof. Independent verification is implemented in `backend/ed-narsg/independent-verifier.mjs`.

Completed CI run `#210` recorded:

- 42 passing E-D NARSG contract tests;
- 1 intentionally skipped PostgreSQL integration test in the unit lane (the real integration runs separately and passed 7/7);
- Python syntax validation for `jev-worker/server.py`;
- runtime dependency audit: 0 vulnerabilities.

## Current gates

The production evidence gate still blocks promotion for evidence that is external to source/CI:

- `UPSTREAM_NOT_VERIFIED`
- `JEV_WORKER_NOT_VERIFIED`
- `CREDENTIAL_ROTATION_REQUIRED`

These are missing live/provenance evidence, not failures of the local contract suite.

## What remains before the broader production target

- dependency DAG compiler + resource scheduler;
- policy/authorization service beyond the current authority matrix;
- full object identity/evidence/reconciliation stores;
- durable run orchestration and process-level crash recovery;
- independently reachable Jev worker attestation plus real execution evidence;
- security/chaos/load suites for the broader runtime;
- shadow/canary promotion path;
- independently verified HyperAI upstream configuration.

Acceptance remains:

`VERIFIED` or `BLOCKED_WITH_EXACT_CAUSE`

Missing evidence never becomes success.
