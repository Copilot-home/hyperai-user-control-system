# E-D NARSG Jev Worker

Executable Jev boundary for this repository.

The worker wraps the real browser-use/jev-ultrafast Agent. Upstream Jev uses a dynamic indexed action space and grounds browser actions in observed elements; DONE still requires independent verification.

## Runtime contract

- service: `jev-ultrafast`
- capability: `browser-execution`
- state_authority: `false`
- commit_authority: `false`
- protocol: `JEV-WORKER-ATTESTATION-1.0`

The worker must expose `/healthz` with that attestation and a bounded execution endpoint implemented by the Jev Agent. Execution errors are not automatically retried. Unknown mutation state is reconciled by E-D NARSG rather than guessed.

## Upstream

Use the public upstream repository `browser-use/jev-ultrafast`, Python >=3.12, with its declared `browser-harness==0.1.13` and `httpx[http2]>=0.28,<1` dependencies.

## Promotion rule

A repository adapter is not live-worker evidence. Production remains blocked until an independently reachable worker returns a valid attestation and a real execution can be observed and independently verified.
