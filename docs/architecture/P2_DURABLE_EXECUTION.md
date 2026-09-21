# P2 — Durable Execution Boundary

## Purpose

P2 moves the current in-process event/state reference core toward restart-safe execution.

## Durable truth

PostgreSQL is the initial durable system of record for event history, state projections and execution idempotency.

Required transaction boundary:

EVENT APPEND + STATE PROJECTION

must commit atomically when a transition is materialized.

## Event invariants

- event_id is immutable;
- (aggregate_id, sequence) is unique;
- previous_hash links the event history;
- event_hash is immutable;
- event history is append-only;
- projections are rebuildable from events.

## Idempotency

Every mutation-capable execution receives an idempotency key.

If the worker crashes after mutation but before acknowledgement, recovery consults durable idempotency/execution records before retrying.

UNKNOWN mutation state remains UNKNOWN until fresh evidence resolves it.

## Technology relationship

Temporal may provide durable workflow scheduling/replay, but it does not replace E-D NARSG semantic state authority. NATS may provide transport/fan-out, but delivery is not state truth. OPA may provide authorization decisions, but authorization is not execution evidence. OpenTelemetry provides correlated operational telemetry, but telemetry is not business-state evidence.

## Current implementation

- SQL schema: migrations/ed_narsg/001_durable_core.sql
- Repository boundary: backend/ed-narsg/durable-store.mjs
- Contract tests: tests/ed-narsg/durable-store.test.mjs

The current repository boundary intentionally has no database driver dependency yet. The next integration step is to bind this interface to the production PostgreSQL client and run restart/replay integration tests against a real database.

## Gate

P2 acceptance is proven on the current repair head by HyperAI CI run #133:

1. append survives a pool/process boundary;
2. duplicate aggregate sequence is rejected;
3. event + projection writes are transaction-bound;
4. idempotency claims survive repository recreation;
5. replay reconstructs state from the hash-chained event stream;
6. the E-D NARSG contract suite preserves UNKNOWN mutation semantics;
7. the durable adapter rejects tampered event hashes and broken predecessor links before commit.

P2 STATUS: VERIFIED

Evidence:
- HyperAI CI run #133 — all jobs completed successfully;
- real PostgreSQL durability lane passed;
- E-D NARSG contract lane passed;
- browser/autonomous boundary lanes passed;
- build, Docker surface and legacy audit passed.
