# HOTL Agent Execution Contract v1

This repository now treats HOTL execution as a mission loop, not a chatbot turn.

## Locked input
MISSION_ID, OBJECTIVE, SCOPE, CONSTRAINTS, SUCCESS_CRITERIA, RISK_POLICY, AUTHORITY_BOUNDARY, END_CONDITION.

## Runtime
DISCOVER -> DECOMPOSE -> CAPABILITY_CENSUS -> FUNCTION_SELECTION -> SKILL_SELECTION -> CONNECTOR_SELECTION -> AUTHORIZATION_CHECK -> EXECUTION -> OBSERVATION -> READBACK -> VERIFICATION.

## Function Bank
INTENT -> FUNCTION_DISCOVERY -> FUNCTION_SELECTION -> FUNCTION_EXECUTION -> FUNCTION_RECEIPT.
Capability != authorization != execution.

## Failure
transient -> retry
configuration -> repair -> retry
capability -> discover alternative -> retry
authorization -> human gate
policy/scope -> human gate

Task failure does not end the mission.

## Evidence-backed PASS
ACTION -> RECEIPT -> READBACK -> ACTUAL_STATE -> SUCCESS_CRITERIA -> EVIDENCE -> PASS.

No receipt, no readback, conflicting state, UNKNOWN, unauthorized mutation, or unmet criteria cannot produce PASS.

## HOTL
Authority boundary => PAUSED_FOR_HUMAN. Approval resumes the same mission/task; rejection or modification remains an explicit human decision.

## End condition
END_MISSION = QUEUE_EMPTY AND OBJECTIVES_VERIFIED AND STATE_MATCHES_REALITY AND EVIDENCE_COMPLETE AND NO_UNRESOLVED_BLOCKER.

## Compatibility
Existing backend/server.js, X-Hub events, autonomy policy and production evidence gates remain authoritative for their existing surfaces. This contract is additive and does not reinterpret payment_received as settlement.


## State machine
INIT -> MISSION_LOCKED -> DISCOVERING -> PLANNING -> SELECTING -> AUTHORIZING -> EXECUTING -> OBSERVING -> VERIFYING.

PASS -> CONTINUE_QUEUE -> NEXT_TASK.

FAIL -> DIAGNOSING -> REPAIRING -> RETRYING -> VERIFYING.

Capability failure may invoke alternative capability discovery before retry. Authorization or policy/scope boundaries transition to PAUSED_FOR_HUMAN.

## Human resume
PAUSED_FOR_HUMAN is not mission completion. An explicit APPROVED or MODIFIED decision resumes the same mission and queue. REJECTED is an explicit human terminal decision.

## Function execution
The Function Bank is the execution substrate. Functions must be registered before discovery/selection and every execution produces a receipt. Capability availability is not execution proof.

## Terminal proof
A mission is terminal PASS only after FINAL_READBACK and EVIDENCE_SEAL. A tool/API success response alone is insufficient.
