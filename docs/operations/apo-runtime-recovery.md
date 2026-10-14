# APΩ Runtime Recovery — executable operator checklist

This runbook does not authorize production promotion or authority escalation.

## Runtime owner
Run on the authorized host from the repository root. Preserve PID/start-time evidence for port 5000 and frontend 4173 before any start.

```bash
npm run runtime:autonomous:status
npm run runtime:autonomous:ensure
npm run runtime:autonomous:status
npm run ci:build
npm run ci:browser-smoke
npm run ci:production-evidence-gate
```

The ensure command inspects default and managed runtime and only bootstraps when neither is usable. Do not substitute unconditional restart.

## Required proof
Capture timestamp, host identity, commit SHA, command exit codes, listener PID/start-time, and responses from:
- GET /api/health
- GET /api/runtime/capabilities
- GET /api/runtime/state

Record CI logs and `artifacts/production-evidence-gate.json`. Keep unverified lanes quarantined. A Vercel READY preview is not a backend health proof.

## Promotion condition
Promote only if build, browser smoke, production evidence gate, endpoint validation, and authority invariants all pass. If any check fails, keep authority frozen and retain the evidence. Never fabricate an EvolutionCycle acceptance.

Tracks #10.
