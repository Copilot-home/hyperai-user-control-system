import {
  lockMission,
  classifyFailure,
  verifyTaskEvidence,
  sealMission
} from "./mission-contract.mjs";

const defaultMaxRetries = 2;

function appendBlocker(mission, blocker) {
  mission.unresolved_blockers = [...(mission.unresolved_blockers ?? []), blocker];
}

async function prepareMission(mission, deps) {
  mission.state = "DISCOVERING";
  if (typeof deps.discover === "function") {
    mission.discovery = await deps.discover(mission);
  }

  mission.state = "PLANNING";
  if (typeof deps.decompose === "function") {
    const decomposition = await deps.decompose(mission);
    if (Array.isArray(decomposition?.queue)) {
      mission.queue = decomposition.queue.map((task, index) => ({
        ...task,
        task_id: task.task_id ?? `TASK-${String(index + 1).padStart(3, "0")}`,
        state: task.state ?? "QUEUED",
        attempts: task.attempts ?? 0
      }));
    }
    mission.decomposition = decomposition;
  }

  mission.state = "SELECTING";
  if (typeof deps.capabilityCensus === "function") {
    mission.capability_census = await deps.capabilityCensus(mission);
  }
}

async function executeLockedMission(mission, deps) {
  await prepareMission(mission, deps);

  while (true) {
    const task = mission.queue.find((item) => item.state !== "PASS");
    if (!task) break;

    mission.state = "SELECTING";
    const capability =
      typeof deps.functionBank?.select === "function"
        ? deps.functionBank.select(task, mission)
        : await deps.selectCapability(task, mission);

    if (capability && typeof deps.functionBank?.discover === "function") {
      const discovered = deps.functionBank.discover(task, mission);
      if (!discovered.some((candidate) => candidate.id === capability.id)) {
        task.state = "BLOCKED";
        mission.state = "BLOCKED";
        appendBlocker(mission, {
          task_id: task.task_id,
          cause: "FUNCTION_NOT_DISCOVERED",
          exact_cause: `SELECTED_FUNCTION_NOT_REGISTERED: ${capability.id}`
        });
        return mission;
      }
    }

    if (!capability) {
      let alternative = null;
      if (typeof deps.discoverAlternative === "function") {
        alternative = await deps.discoverAlternative(task, mission, {
          cause: "CAPABILITY_UNAVAILABLE"
        });
      }
      if (alternative) {
        task.alternative_capability = alternative;
        mission.alternatives = [...(mission.alternatives ?? []), alternative];
        mission.state = "RETRYING";
        continue;
      }

      task.state = "BLOCKED";
      mission.state = "BLOCKED";
      appendBlocker(mission, {
        task_id: task.task_id,
        cause: "CAPABILITY_UNAVAILABLE",
        exact_cause: "NO_EXECUTABLE_CAPABILITY"
      });
      return mission;
    }

    let selectedSkill = capability;
    if (typeof deps.selectSkill === "function") {
      selectedSkill = await deps.selectSkill(task, capability, mission);
    }

    let selectedConnector = selectedSkill;
    if (typeof deps.selectConnector === "function") {
      selectedConnector = await deps.selectConnector(task, selectedSkill, mission);
    }

    mission.state = "AUTHORIZING";
    const authorization = await deps.authorize(
      task,
      selectedConnector,
      mission
    );

    if (authorization?.status === "HUMAN_DECISION_REQUIRED") {
      task.state = "HUMAN_DECISION_REQUIRED";
      mission.state = "PAUSED_FOR_HUMAN";
      mission.human_gate = {
        task_id: task.task_id,
        reason: authorization.cause ?? "AUTHORIZATION_REQUIRED",
        requested_at: new Date().toISOString()
      };
      return mission;
    }

    if (authorization?.allowed !== true) {
      task.state = "BLOCKED";
      mission.state = "BLOCKED";
      appendBlocker(mission, {
        task_id: task.task_id,
        cause: authorization?.cause ?? "AUTHORIZATION_DENIED",
        exact_cause: authorization?.exact_cause ?? authorization?.cause ?? "AUTHORIZATION_DENIED"
      });
      return mission;
    }

    let completed = false;
    while (!completed) {
      task.state = "RUNNING";
      task.attempts = (task.attempts ?? 0) + 1;
      mission.state = "EXECUTING";

      const execution =
        typeof deps.functionBank?.execute === "function"
          ? await deps.functionBank.execute(selectedConnector, task, mission)
          : await deps.execute(task, selectedConnector, mission);

      if (!execution?.receipt && !execution?.error) {
        task.state = "BLOCKED";
        mission.state = "BLOCKED";
        appendBlocker(mission, {
          task_id: task.task_id,
          cause: "NO_EXECUTION_RECEIPT",
          exact_cause: "FUNCTION_EXECUTION_DID_NOT_RETURN_RECEIPT"
        });
        return mission;
      }

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
        task.readback = observation.readback;
        task.verification = verification;
        completed = true;
        continue;
      }

      const classification = classifyFailure(
        execution?.error ??
        observation?.error ?? {
          classification:
            verification.reason === "UNAUTHORIZED_MUTATION"
              ? "authorization"
              : "unknown"
        }
      );

      if (classification === "authorization" || classification === "policy_scope") {
        task.state = "HUMAN_DECISION_REQUIRED";
        mission.state = "PAUSED_FOR_HUMAN";
        mission.human_gate = {
          task_id: task.task_id,
          reason: verification.reason,
          requested_at: new Date().toISOString()
        };
        return mission;
      }

      if (classification === "capability" && typeof deps.discoverAlternative === "function") {
        const alternative = await deps.discoverAlternative(task, mission, {
          cause: verification.reason,
          failed_capability: selectedConnector
        });
        if (alternative) {
          mission.alternatives = [...(mission.alternatives ?? []), alternative];
          selectedConnector = alternative;
          mission.state = "RETRYING";
          continue;
        }
      }

      if ((task.attempts ?? 0) > (task.max_retries ?? defaultMaxRetries)) {
        task.state = "BLOCKED";
        mission.state = "BLOCKED";
        appendBlocker(mission, {
          task_id: task.task_id,
          cause: verification.reason,
          classification,
          exact_cause: execution?.error?.message ?? verification.reason
        });
        return mission;
      }

      mission.state = "DIAGNOSING";
      const repair = await deps.repair(
        task,
        classification,
        execution,
        observation,
        mission
      );

      if (repair?.status === "HUMAN_DECISION_REQUIRED") {
        task.state = "HUMAN_DECISION_REQUIRED";
        mission.state = "PAUSED_FOR_HUMAN";
        mission.human_gate = {
          task_id: task.task_id,
          reason: repair.cause ?? "REPAIR_AUTHORIZATION_REQUIRED",
          requested_at: new Date().toISOString()
        };
        return mission;
      }

      mission.state = "REPAIRING";
      task.state = "REPAIRING";
      mission.state = "RETRYING";
    }

    mission.state = "CONTINUE_QUEUE";
    mission.state = "NEXT_TASK";
  }

  mission.state = "FINAL_READBACK";
  const finalReadback = await deps.finalReadback(mission);

  mission.objectives_verified = finalReadback?.objectives_verified === true;
  mission.state_matches_reality =
    finalReadback?.state_matches_reality === true;
  mission.unresolved_blockers = finalReadback?.unresolved_blockers ?? [];

  mission = sealMission(mission, finalReadback);
  return mission;
}

export async function runMission(input, deps) {
  const mission = lockMission(input);
  mission.state = "MISSION_LOCKED";
  return executeLockedMission(mission, deps);
}

export async function resumeMission(mission, decision, deps) {
  if (mission?.state !== "PAUSED_FOR_HUMAN") {
    throw new Error("MISSION_RESUME_INVALID: mission is not paused for human");
  }

  if (!decision || !["APPROVED", "REJECTED", "MODIFIED"].includes(decision.status)) {
    throw new Error("MISSION_RESUME_INVALID: explicit human decision required");
  }

  if (decision.status === "REJECTED") {
    return {
      ...structuredClone(mission),
      state: "MISSION_FAIL",
      human_decision: decision
    };
  }

  const resumed = structuredClone(mission);
  resumed.human_decision = decision;
  const task = resumed.queue.find((item) => item.state === "HUMAN_DECISION_REQUIRED");

  if (!task) {
    throw new Error("MISSION_RESUME_INVALID: human-gated task not found");
  }

  if (decision.status === "MODIFIED" && decision.task) {
    Object.assign(task, decision.task);
  }

  task.state = "QUEUED";
  resumed.state = "MISSION_LOCKED";
  resumed.human_gate = null;

  return executeLockedMission(resumed, deps);
}
