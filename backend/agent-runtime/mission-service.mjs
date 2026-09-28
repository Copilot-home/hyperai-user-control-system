import { runMission, resumeMission } from "./mission-runner.mjs";
import { createRuntimeFunctionBank, buildRuntimeCapabilityCensus } from "./runtime-execution-surface.mjs";

const activeMissions = new Map();

function requireMissionInput(input) {
  const required = ["mission_id","objective","scope","constraints","success_criteria","risk_policy","authority_boundary","end_condition"];
  const missing = required.filter((key) => input?.[key] === undefined || input?.[key] === null);
  if (missing.length) {
    const error = new Error(`MISSION_CONTRACT_INVALID: missing ${missing.join(",")}`);
    error.classification = "configuration";
    throw error;
  }
  if (!Array.isArray(input.queue) || input.queue.length === 0) {
    const error = new Error("MISSION_QUEUE_REQUIRED");
    error.classification = "configuration";
    throw error;
  }
}

function createDeps({ bank, baseUrl }) {
  return {
    discover: async () => ({
      surfaces: ["native-http"],
      function_count: bank.size(),
      generated_at: new Date().toISOString(),
    }),
    decompose: async (mission) => ({ queue: mission.queue }),
    capabilityCensus: async () => buildRuntimeCapabilityCensus(bank),
    selectCapability: async (task) => bank.select(task, { baseUrl }),
    selectSkill: async (task, capability) => ({
      ...capability,
      skill_id: task.skill_id || "runtime-native",
    }),
    selectConnector: async (task, skill) => ({
      ...skill,
      connector_id: task.connector_id || skill.id,
    }),
    authorize: async (task, connector) => {
      const mutation = connector?.mutation === true || task?.mutation === true;
      if (mutation || task?.requires_human === true || task?.authority_required === true) {
        return { status: "HUMAN_DECISION_REQUIRED", cause: mutation ? "MUTATION_AUTHORITY_BOUNDARY" : "TASK_AUTHORITY_BOUNDARY" };
      }
      return { allowed: true, scope: task.scope || "read-only" };
    },
    execute: async (task, connector) => bank.execute(connector, task, { baseUrl }),
    observe: async (task, execution, mission) => {
      const selection = execution?.receipt?.function_id ? { id: execution.receipt.function_id } : null;
      if (!selection) return { readback: null, unknown: true, error: { classification: "unknown", message: "EXECUTION_FUNCTION_ID_MISSING" } };
      return bank.observe(selection, task, execution, { baseUrl, mission });
    },
    successCriteria: (_task, observation) => observation?.success_criteria_met === true,
    discoverAlternative: async (task) => {
      const candidate = bank.discover({ capability: task?.alternative_capability });
      return candidate[0] || null;
    },
    repair: async (_task, classification) => {
      if (classification === "transient") return { status: "REPAIRED", action: "retry" };
      return { status: "NO_AUTOMATIC_REPAIR", classification };
    },
    finalReadback: async (mission) => {
      const selection = bank.select({ function_id: "runtime.capabilities.read" }, { baseUrl });
      if (!selection) {
        return { objectives_verified: false, state_matches_reality: false, unresolved_blockers: [{ cause: "FINAL_READBACK_FUNCTION_MISSING" }] };
      }
      const execution = await bank.execute(selection, { task_id: "FINAL-READBACK" }, { baseUrl });
      const observation = await bank.observe(selection, { task_id: "FINAL-READBACK" }, execution, { baseUrl, mission });
      const allTasksPass = mission.queue.every((task) => task.state === "PASS");
      return {
        objectives_verified: allTasksPass && observation.success_criteria_met === true,
        state_matches_reality: observation.success_criteria_met === true,
        unresolved_blockers: [],
        execution_receipt: execution.receipt,
        readback: observation.readback,
      };
    },
  };
}

export async function startAgentMission(input, context = {}) {
  requireMissionInput(input);
  if (activeMissions.has(input.mission_id)) throw new Error("MISSION_ALREADY_ACTIVE");
  const bank = createRuntimeFunctionBank();
  const mission = await runMission(input, createDeps({
    bank,
    baseUrl: context.baseUrl || process.env.HYPERAI_RUNTIME_BASE_URL || "http://127.0.0.1:5000",
  }));
  activeMissions.set(input.mission_id, mission);
  return mission;
}

export async function resumeAgentMission(missionId, decision, context = {}) {
  const mission = activeMissions.get(missionId);
  if (!mission) throw new Error("MISSION_NOT_FOUND");
  const bank = createRuntimeFunctionBank();
  const resumed = await resumeMission(mission, decision, createDeps({
    bank,
    baseUrl: context.baseUrl || process.env.HYPERAI_RUNTIME_BASE_URL || "http://127.0.0.1:5000",
  }));
  activeMissions.set(missionId, resumed);
  return resumed;
}

export function getAgentMission(missionId) {
  return activeMissions.get(missionId) || null;
}

export function listAgentMissions() {
  return [...activeMissions.values()].map((mission) => ({
    mission_id: mission.mission_id,
    state: mission.state,
    queue: mission.queue?.map((task) => ({ task_id: task.task_id, state: task.state, attempts: task.attempts })) || [],
    human_gate: mission.human_gate || null,
  }));
}
