# Evidence-Driven Non-Autoregressive State Graph + Jev Production Contract

## Status

Implementation target: hyperai-user-control-system.

The repository currently has no verified local Jev runtime. The Jev boundary is therefore implemented as a typed protocol adapter and remains RUNTIME_UNVERIFIED until a real Jev worker is independently observed.

## Authority boundary

Intent / Policy
  -> Execution Contract
  -> Jev Executor Adapter
  -> Observation -> Evidence -> Reconciliation -> Verification
  -> State Commit Authority

Jev is an executor/decision primitive. It is not State Authority, Evidence Authority, or Commit Authority.

## Contract invariants

1. A Jev operation must be one of the supported typed operations.
2. CLICK, TYPE_TEXT, and SELECT must reference an object from the current observation.
3. Model output must never become a selector, coordinate, JavaScript payload, or shell command.
4. DONE and BLOCKED are assertions, not state transitions.
5. State commit requires valid evidence, independent verification, and explicit commit authorization.
6. A mutation with unknown completion state is UNKNOWN_MUTATION_STATE and must not be blindly retried.
7. Every observation retains source and timestamp provenance.
8. Executor capability does not imply authorization or commit authority.

## Production flow

REALITY
  -> OBSERVATION
  -> EVIDENCE
  -> RECONCILIATION
  -> VERIFICATION
  -> STATE
  -> DEPENDENCY
  -> EXECUTION
  -> REALITY

The current adapter establishes the protocol boundary. A machine-readable Production Evidence Gate now classifies upstream reachability, Jev worker attestation, credential hygiene, and dependency security without granting deployment authority. The gate also verifies that package.json and package-lock.json dependency declarations are synchronized. Durable event storage, scheduler/resource locking, policy service, independent browser verifier, and a live Jev worker remain separate production gates.

## Jev integration mapping

| Jev output | ED-NARSG representation |
|---|---|
| indexed element | observed object |
| operation + target | action proposal |
| DONE | completion assertion |
| BLOCKED | blocked assertion |
| browser result | observation |
| independent checker | verification evidence |
| state transition | State Authority commit |

The current Jev project describes a dynamic indexed action space, typed operations, target grounding against observed DOM nodes, freshness/occlusion checks, and independent final verification. Its development guidance also says not to retry browser mutations and not to treat DONE as proof of success. Those properties are preserved at the adapter boundary.

## Promotion gates

- P0: policy and authorization boundary verified.
- P1: execution contract and evidence schema tests pass.
- P2: live Jev worker path observed and version-pinned.
- P3: independent verifier proves final outcomes.
- P4: durable replay/audit survives worker restart.
- P5: shadow -> canary -> production deployment verified.

No live Jev success is claimed by this repository change.
