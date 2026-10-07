/**
 * HOTL Agent Execution Contract v1
 * Pure contract/state helpers. No network, provider, or model assumptions.
 */

export const MISSION_STATES = Object.freeze([
  "INIT","MISSION_LOCKED","DISCOVERING","PLANNING","SELECTING","AUTHORIZING",
  "EXECUTING","OBSERVING","VERIFYING","DIAGNOSING","REPAIRING","RETRYING",
  "CONTINUE_QUEUE","NEXT_TASK","FINAL_READBACK","EVIDENCE_SEAL","MISSION_PASS",
  "PAUSED_FOR_HUMAN","HUMAN_DECISION_REQUIRED","MISSION_FAIL","BLOCKED"
]);

export const TASK_STATES = Object.freeze([
  "QUEUED","RUNNING","PASS","FAIL","REPAIRING","RETRYING",
  "PAUSED_FOR_HUMAN","BLOCKED","HUMAN_DECISION_REQUIRED"
]);

export const TERMINAL_MISSION_STATES = new Set(["MISSION_PASS","MISSION_FAIL","BLOCKED"]);

export function assertMissionContract(mission) {
  const required = [
    "mission_id","objective","scope","constraints","success_criteria",
    "risk_policy","authority_boundary","end_condition"
  ];
  const missing = required.filter((key) => mission?.[key] === undefined || mission?.[key] === null);
  if (missing.length) throw new Error(`MISSION_CONTRACT_INVALID: missing ${missing.join(",")}`);
  if (mission.state && mission.state !== "LOCKED") {
    throw new Error("MISSION_CONTRACT_INVALID: mission must enter LOCKED state");
  }
  return true;
}

export function lockMission(input) {
  assertMissionContract(input);
  return {
    ...structuredClone(input),
    state: "LOCKED",
    locked_at: input.locked_at ?? new Date().toISOString(),
    queue: Array.isArray(input.queue) ? input.queue.map((task, index) => ({
      ...task,
      task_id: task.task_id ?? `TASK-${String(index + 1).padStart(3,"0")}`,
      state: "QUEUED",
      attempts: 0
    })) : []
  };
}

export function classifyFailure(error = {}) {
  const type = error.classification ?? error.type ?? "unknown";
  if (["transient","configuration","capability","authorization","policy_scope"].includes(type)) return type;
  return "unknown";
}

export function verifyTaskEvidence(task, evidence) {
  if (!evidence || !evidence.execution_receipt) return { status:"NOT_VERIFIED", reason:"NO_RECEIPT" };
  if (!evidence.readback) return { status:"NOT_VERIFIED", reason:"NO_READBACK" };
  if (evidence.conflicting_state) return { status:"FAIL", reason:"CONFLICTING_STATE" };
  if (evidence.unknown) return { status:"NOT_VERIFIED", reason:"UNKNOWN" };
  if (evidence.unauthorized_mutation) return { status:"BLOCKED", reason:"UNAUTHORIZED_MUTATION" };
  if (evidence.success_criteria_met !== true) return { status:"FAIL", reason:"SUCCESS_CRITERIA_UNMET" };
  return { status:"PASS", reason:"EVIDENCE_BACKED" };
}

export function canEndMission(mission) {
  const queueEmpty = (mission.queue ?? []).every((task) => task.state === "PASS");
  const objectivesVerified = mission.objectives_verified === true;
  const stateMatchesReality = mission.state_matches_reality === true;
  const evidenceComplete = mission.evidence_chain_sealed === true;
  const noBlocker = (mission.unresolved_blockers ?? []).length === 0;
  return queueEmpty && objectivesVerified && stateMatchesReality && evidenceComplete && noBlocker;
}

export function sealMission(mission, finalReadback) {
  if (!finalReadback || finalReadback.state_matches_reality !== true) {
    throw new Error("MISSION_SEAL_BLOCKED: FINAL_READBACK_NOT_VERIFIED");
  }
  const sealed = {
    ...structuredClone(mission),
    final_readback: finalReadback,
    evidence_chain_sealed: true
  };
  if (!canEndMission(sealed)) {
    throw new Error("MISSION_SEAL_BLOCKED: END_CONDITION_UNMET");
  }
  return { ...sealed, state:"MISSION_PASS", ended_at:new Date().toISOString() };
}
