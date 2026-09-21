# E-D NARSG Production Core

## Purpose

This is the first production-core boundary for the Evidence-Driven Non-Autoregressive State Graph. It is executor-agnostic: Jev is an executor implementation, not the state authority.

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

## P1 — Event model

The event core is append-only and hash-chained:

`event[n].previous_hash == event[n-1].event_hash`

Every event receives a SHA-256 content hash. A reducer reconstructs state from events; direct state mutation is outside this core.

The current implementation is an **in-process reference core**. It does not claim durable database persistence yet. A durable adapter must preserve the same append-only and replay invariants.

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

## Current status

The authority, protocol, event-chain, replay, and state-commit guard primitives are implemented and tested.

They are **not** sufficient for production deployment. Remaining gates include durable persistence, policy service, dependency scheduler/resource locking, live executor attestation, independent verifier, crash recovery across restarts, security/chaos/load testing, shadow/canary, and verified upstream configuration.

Acceptance remains:

`VERIFIED` or `BLOCKED_WITH_EXACT_CAUSE`

Missing evidence never becomes success.
