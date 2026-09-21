# E-D NARSG Jev Worker

Executable Jev boundary for this repository.

The worker wraps the real browser-use/jev-ultrafast Agent. Upstream Jev uses a dynamic indexed action space and grounds browser actions in observed elements; DONE still requires independent verification.

## Runtime contract

- service: `jev-ultrafast`
- capability: `browser-execution`
- state_authority: `false`
- commit_authority: `false`
- protocol: `JEV-WORKER-ATTESTATION-1.0`
- execution: `POST /v1/run`
- attestation: `GET /healthz`

The worker exposes only the browser-execution boundary. E-D NARSG owns authorization, evidence, verification, state and commit. Execution errors and timeout are not automatically retried. Unknown mutation state is reconciled by E-D NARSG rather than guessed.

## Production boundary

- Set `JEV_WORKER_TOKEN` whenever the worker binds to a non-local host. Startup fails closed if it is missing.
- Put the worker behind a TLS-capable reverse proxy; the stdlib HTTP server is the bounded local worker boundary, not the public TLS edge.
- `JEV_WORKER_MAX_RUN_SECONDS` defaults to 120 seconds.
- `JEV_WORKER_MAX_CONCURRENT_RUNS` defaults to 1 to avoid uncontrolled browser fan-out.
- `/healthz` returns only non-secret worker attestation.
- `/v1/run` requires a bounded JSON request and returns only terminal Jev state (`done` or `blocked`).
- A `done` response is execution evidence, not independent business verification.

## Upstream

Use the public upstream repository `browser-use/jev-ultrafast`, Python >=3.12, with its declared `browser-harness==0.1.13` and `httpx[http2]>=0.28,<1` dependencies.

## Promotion rule

A repository adapter is not live-worker evidence. Production remains blocked until an independently reachable worker returns a valid attestation and a real execution can be observed and independently verified.
