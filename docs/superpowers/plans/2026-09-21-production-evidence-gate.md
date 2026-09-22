# Production Evidence Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make production readiness a machine-readable evidence classification so the system distinguishes verified readiness from exact external blockers without false success.

**Architecture:** A pure E-D NARSG classifier consumes independently observed evidence for runtime upstream, Jev worker, credential hygiene, and dependency security. A CI probe gathers only explicit observations and emits the classification; it never grants deployment authority.

**Tech Stack:** Node.js ESM, node:test, GitHub Actions.

**Spec:** `docs/architecture/ED_NARSG_JEV_PRODUCTION.md`

## Global Constraints
- No production promotion while required production gates are not VERIFIED.
- Missing evidence remains BLOCKED; never infer success.
- Jev has no state or commit authority.
- Historical credential exposure remains a remediation blocker until independently rotated/revoked.
- Classification never grants authorization.

## Review Focus
- Missing upstream evidence must not become VERIFIED.
- Live Jev requires independent attestation.
- Credential exposure cannot be cleared by repository cleanup alone.
- Dependency audit state must remain evidence-backed.
- Aggregate state must preserve exact blockers.

## Tasks
- [x] Define failing production-gate tests.
- [x] Implement the pure production-gate classifier.
- [x] Implement CI evidence collection and structured report generation.
- [x] Integrate the classifier into the repository package scripts.
- [x] Document the evidence gate and authority boundary.
- [ ] Integrate the evidence probe into the trusted existing CI job after the current CI run completes, then independently verify the resulting output.
