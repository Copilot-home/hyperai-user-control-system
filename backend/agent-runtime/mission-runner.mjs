import {
  lockMission,
  classifyFailure,
  verifyTaskEvidence,
  sealMission
} from "./mission-contract.mjs";

const defaultMaxRetries = 2;

export async function runMission(input, deps) {
  let mission = lockMission(input);
  mission.state = "MISSION_LOCKED";

  while (true) {
    const task = mission.queue.find((item) => item.state !== "PASS");
    if (!task) break;

    mission.state = "SELECTING";
    const capability = await deps.selectCapability(task, mission);
    if (!capability) {
      mission.state = "BLOCKED";
      mission.unresolved_blockers = [...(mission.unresolved_blockers ?? []),
        { task_id: task.task_id, cause:"CAPABILITY_UNAVAILABLE" }];
      return mission;
    }

    mission.state = "AUTHORIZING";
    const authorization = await deps.authorize(task, capability, mission);
    if (authorization?.status === "HUMAN_DECISION_REQUIRED") {
      task.state = "HUMAN_DECISION_REQUIRED";
      mission.state = "PAUSED_FOR_HUMAN";
      return mission;
    }
    if (authorization?.allowed !== true) {
      task.state = "BLOCKED";
      mission.state = "BLOCKED";
      mission.unresolved_blockers = [...(mission.unresolved_blockers ?? []),
        { task_id:task.task_id, cause:authorization?.cause ?? "AUTHORIZATION_DENIED" }];
      return mission;
    }

    let completed = false;
    while (!completed) {
      task.state = "RUNNING";
      task.attempts = (task.attempts ?? 0) + 1;
      mission.state = "EXECUTING";

      const execution = await deps.execute(task, capability, mission);
      mission.state = "OBSERVING";
      const observation = await deps.observe(task, execution, mission);
      mission.state = "VERIFYING";
      const verification = verifyTaskEvidence(task, {
        execution_receipt: execution?.receipt,
        readback: observation?.readback,
        conflicting_state: observation?.conflicting_state,
        unknown: observation?.unknown,
        unauthorized_mutation: execution?.unauthorized_mutation,
        success_criteria_met: deps.successCriteria(task, observation, mission)
      });

      if (verification.status === "PASS") {
        task.state = "PASS";
        task.receipt = execution.receipt;
        task.verification = verification;
        completed = true;
        continue;
      }

      const classification = classifyFailure(execution?.error ?? observation?.error ?? {
        classification: verification.reason === "UNAUTHORIZED_MUTATION" ? "authorization" : "unknown"
      });

      if (classification === "authorization" || classification === "policy_scope") {
        task.state = "HUMAN_DECISION_REQUIRED";
        mission.state = "PAUSED_FOR_HUMAN";
        return mission;
      }

      if ((task.attempts ?? 0) > (task.max_retries ?? defaultMaxRetries)) {
        task.state = "BLOCKED";
        mission.state = "BLOCKED";
        mission.unresolved_blockers = [...(mission.unresolved_blockers ?? []),
          { task_id:task.task_id, cause:verification.reason, classification }];
        return mission;
      }

      mission.state = "DIAGNOSING";
      const repair = await deps.repair(task, classification, execution, observation, mission);
      if (repair?.status === "HUMAN_DECISION_REQUIRED") {
        task.state = "HUMAN_DECISION_REQUIRED";
        mission.state = "PAUSED_FOR_HUMAN";
        return mission;
      }
      mission.state = "RETRYING";
    }
    mission.state = "CONTINUE_QUEUE";
  }

  mission.state = "FINAL_READBACK";
  const finalReadback = await deps.finalReadback(mission);
  mission.objectives_verified = finalReadback?.objectives_verified === true;
  mission.state_matches_reality = finalReadback?.state_matches_reality === true;
  mission.unresolved_blockers = finalReadback?.unresolved_blockers ?? [];
  mission = sealMission(mission, finalReadback);
  return mission;
}
