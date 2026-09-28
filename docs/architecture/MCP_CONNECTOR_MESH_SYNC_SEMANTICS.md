# MCP and Connector Mesh Synchronization Semantics

Status: implementation artifact for Linear WWW-107.
Scope: MCP hub, conductor, connector nodes, federated runtime surfaces, and governance metadata.

## 1. Sync signal taxonomy

| Signal | Meaning | Producer | Consumer | Canonical truth |
| --- | --- | --- | --- | --- |
| state_sync | Current operational state of a node or connector | owning runtime | conductor, registry, observers | owning runtime readback |
| health_sync | Liveness/readiness/health result | verification surface | conductor, registry | latest verified probe |
| capability_sync | Executable capabilities and authority boundary | capability registry / execution edge | conductor, mission planner | registered executable capability |
| artifact_sync | Commit, branch, PR, deployment, proof artifact identity | source/deployment system | Notion, Linear, conductor | source artifact identity |
| governance_sync | Policy, owner, authority, gate, promotion and stop-rule state | canonical governance store | all execution surfaces | canonical policy snapshot |

A signal is evidence, not authority by itself. Consumers MUST retain provenance, observed_at, source_id, and evidence_id.

## 2. Source-of-truth map

1. Mission intent and execution contract: Linear issue plus the bound mission payload.
2. Governance and canonical operating rules: Notion canonical registry and owner-authored canon.
3. Repository content, branches, commits and pull requests: GitHub.
4. Deployment state and deployment identity: Vercel.
5. Live local process and network state: Remote Desktop Commander observation of the owning node.
6. Provider/model availability: the provider authenticated runtime endpoint, not a stale registry entry.
7. Verification result: the verification surface that performed the probe or readback.
8. Runtime memory/evidence receipt: the mission evidence recorder.

No downstream cache may overwrite a source-of-truth record. A downstream record may only publish a reference to the authoritative source plus its observation timestamp.

## 3. Publish/consume contract

Every sync event MUST carry:
- sync_id
- signal_type
- source_id
- target_id
- observed_at
- state_version or artifact_revision
- evidence_id
- provenance
- ttl or freshness policy
- correlation_id / mission_id

Consumers MUST reject malformed events and MUST NOT promote an event to canonical state when provenance or evidence is absent.

Duplicate events are idempotent by (source_id, signal_type, state_version, evidence_id).
Older revisions MUST NOT overwrite newer verified revisions.
Concurrent revisions require reconciliation rather than last-write-wins.

## 4. Reconciliation model

Reconciliation is deterministic:

OBSERVE -> NORMALIZE -> COMPARE -> CLASSIFY_DRIFT -> SELECT_AUTHORITY -> APPLY_ALLOWED_REPAIR -> READBACK -> ASSERT -> PUBLISH

Drift classes:
- NONE: observations agree.
- STALE: consumer has an older revision than the source of truth.
- CONFLICT: two authoritative-looking observations disagree.
- MISSING: required state exists at the source but is absent downstream.
- UNVERIFIED: state exists without sufficient evidence.
- UNAUTHORIZED: a mutation exists outside the allowed authority boundary.

Rules:
1. NONE closes without mutation.
2. STALE refreshes from the authoritative source.
3. MISSING is repaired by replaying the canonical state or reference.
4. CONFLICT stops promotion and routes to the defined authority plus human gate when policy requires it.
5. UNVERIFIED remains non-ready and cannot satisfy a terminal success assertion.
6. UNAUTHORIZED is blocked and preserved as an audit event.

## 5. Eventual-consistency boundary

Eventual consistency is allowed only for derived/read-model surfaces.
The following remain strongly gated:
- mission completion
- governance promotion
- execution authorization
- capability publication as executable
- deployment promotion
- final evidence closure

A derived surface may temporarily lag, but it MUST expose freshness and source revision. A stale value MUST NOT be represented as current.

## 6. Anti-drift rules

- One canonical identity per governed entity.
- One mission root per mission.
- One evidence chain per execution attempt.
- Never infer execution from capability availability.
- Never infer health from process existence alone.
- Never infer deployment success from a READY metadata record without runtime/readback evidence.
- Never replace a verified newer revision with an older observation.
- Never silently merge conflicting authoritative states.
- Never convert UNKNOWN, timeout, permission failure, or missing readback into PASS.
- Every mutation MUST produce a receipt and independent readback.
- Every terminal mission result MUST be backed by sealed evidence.
- Canonical governance changes require owner-authorized policy mutation.

## 7. Current mesh binding for WWW-107

Known execution surfaces:
- Titan OmniRoute: authenticated /v1/models and /api/mcp/status are currently HTTP 200 from the Titan local probe.
- Titan Ollama: /api/tags timed out during the same probe and therefore remains unverified.
- GitHub App installation: repository inventory succeeded for installation 165681516.
- Probot webhook: Smee delivery reached the local webhook endpoint with HTTP 200.
- Vercel hyperai-user-control-system: latest observed deployment metadata is READY, but direct runtime probes to /api/health, /api/runtime/capabilities, /api/runtime/state, and /api/symphony/status returned HTTP 503. Deployment metadata therefore MUST NOT be promoted to runtime-health truth.

These observations are dated evidence inputs, not permanent health assertions.

## 8. Readiness rule

MESH_READY = AUTHENTICATED + SOURCE_OF_TRUTH_DEFINED + RECONCILIATION_DEFINED + ANTI_DRIFT_DEFINED + END_TO_END_VERIFIED

If any required term is false or unknown, readiness remains NOT_READY.

## 9. Verification receipt

For each reconciliation run record:
INPUT -> ACTION -> OUTPUT -> STATE_AFTER -> ASSERTION -> PASS|FAIL

Terminal PASS requires:
- execution receipt
- independent readback
- state matches reality
- success criteria satisfied
- no unresolved blocker
- evidence chain sealed

This artifact defines semantics only. It does not authorize destructive changes, merges, provider promotion, or governance mutation.