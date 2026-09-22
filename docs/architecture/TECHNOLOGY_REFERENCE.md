# E-D NARSG — Technology Reference

## Decision summary

| Concern | Primary technology direction | Authority |
|---|---|---|
| Durable execution | Temporal-compatible workflow model, or equivalent durable engine | Event/State Authority remains E-D NARSG |
| Durable state | PostgreSQL | State persistence, not policy |
| Live fan-out / worker transport | NATS JetStream or equivalent | Transport only |
| Authorization | OPA/Rego-compatible policy engine | Policy decision only |
| Telemetry | OpenTelemetry | Observation of the system, not state truth |
| Browser executor | Jev adapter | Execution only |
| Artifacts | S3-compatible object storage | Immutable/raw artifact bytes |
| API | HTTP/gRPC | Control surface, not authority |
| Audit | append-only event history + object artifacts | Forensic record |

## Evidence from current technology documentation

### Durable execution: Temporal model

Temporal's documented architecture separates Client, Server, and Worker. The Server persists Event History and schedules Tasks; Workers execute application code. Temporal uses event sourcing so workflow state can be reconstructed by replay, and its documentation explicitly calls out idempotent or non-retryable Activities. This maps closely to E-D NARSG's durable execution requirement.

Sources: Temporal architecture; Understanding Temporal; Temporal GitHub architecture documentation.

Architectural constraint: do not make Temporal Workflow state the E-D NARSG semantic State Authority automatically. The durable engine provides execution durability; E-D NARSG controls evidence, verification, authorization and commit semantics.

### PostgreSQL

PostgreSQL is the initial recommended durable store for append-only event records, materialized run/task/state projections, contracts and verification records, policy decisions, and idempotency records. Use transactions for event + projection updates where the invariant requires atomicity. Binary artifacts remain in object storage.

### NATS / JetStream

Use NATS JetStream for asynchronous delivery, worker fan-out and live observation streams when scale requires a broker.

Constraint: broker delivery semantics are not state authority. Duplicate delivery must be tolerated; consumers must use event IDs and idempotency keys.

### OPA / Rego

OPA is suitable for externalizing authorization/policy decisions. Rego policies can evaluate structured input and return an allow/deny decision.

Constraint: an OPA decision is an authorization result, not evidence that an action occurred and not permission to commit state.

### OpenTelemetry

OpenTelemetry provides semantic conventions for traces, metrics, logs and events. E-D NARSG should propagate run_id, task_id, execution_id, contract_id, observation_id, evidence_id, verification_id and executor_id.

Telemetry remains operational evidence. It must not be substituted for authoritative business-state evidence.

### Jev

Jev remains a bounded browser executor. Its indexed action space, observed-target grounding and freshness checks are valuable primitives.

Jev must never receive state authority, commit authority, arbitrary selector/code authority, or permission to convert DONE into a state commit.

## Technology boundary

Technology capability != system authority.

A component can provide durability, transport, policy evaluation, telemetry or browser execution without becoming the canonical authority for the E-D NARSG state graph.

## P2 implementation order

1. PostgreSQL schema + transactional repository interface.
2. Durable event append with unique (aggregate_id, sequence) and immutable event rows.
3. Idempotency table for execution attempts.
4. Materialized state projection.
5. Recovery/replay tests across process restart.
6. Only then wire a workflow engine / broker where the workload requires it.

## Production non-goals

- No direct state mutation from workers.
- No blind retry of unknown browser mutations.
- No production promotion based on a configured URL alone.
- No telemetry-only success.
- No policy engine commit authority.
- No claim that a technology benchmark proves system correctness.

## Acceptance

The production system is VERIFIED only when durable persistence, recovery, authorization, evidence, independent verification and commit invariants are all demonstrated. Otherwise it is BLOCKED_WITH_EXACT_CAUSE.