# Jev Executor Boundary

## Purpose

This adapter is the integration boundary between the upstream `jev-ultrafast` browser executor and E-D NARSG. Jev supplies browser execution capability; it does not become semantic state authority or commit authority.

The upstream project exposes a dynamic indexed action space and requires every target to resolve to an observed browser element. It explicitly forbids model-generated selectors/executable code and requires independent final verification. The adapter preserves those boundaries.

## Contract

`createJevExecution()` requires:

- explicit mission intent;
- explicit authorization;
- a valid `JEV-WORKER-ATTESTATION-1.0`;
- an observation id and page fingerprint.

`authorizeJevAction()` accepts only the supported Jev operation set and an observed indexed target. Selectors, coordinates, JavaScript and other model-generated executable representations are rejected.

`recordJevExecution()` has a fail-closed mutation rule:

- acknowledged execution continues to OBSERVATION;
- blocked execution becomes BLOCKED;
- missing/uncertain acknowledgement becomes UNKNOWN;
- UNKNOWN is terminal and cannot be committed.

Evidence is then attached to the E-D NARSG contract, followed by independent verification and only then commit.

## Non-goals

- no browser state authority in Jev;
- no direct semantic state mutation by the worker;
- no blind browser mutation retry;
- no DONE-as-proof;
- no production readiness inference from the adapter tests alone.
