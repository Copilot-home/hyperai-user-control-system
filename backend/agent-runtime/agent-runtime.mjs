import { FunctionBank } from "./function-bank.mjs";
import { runMission, resumeMission } from "./mission-runner.mjs";

export function createAgentRuntime({ functions = [], adapters = {}, verifier } = {}) {
  const functionBank = new FunctionBank();
  for (const definition of functions) functionBank.register(definition);

  const deps = {
    functionBank,
    discover: async (mission) => adapters.discover?.(mission) ?? { surfaces: [] },
    decompose: async (mission) => adapters.decompose?.(mission) ?? { queue: mission.queue ?? [] },
    capabilityCensus: async (mission) => adapters.capabilityCensus?.(mission) ?? {
      registered_functions: functionBank.size()
    },
    selectSkill: async (task, capability, mission) =>
      adapters.selectSkill?.(task, capability, mission) ?? capability,
    selectConnector: async (task, skill, mission) =>
      adapters.selectConnector?.(task, skill, mission) ?? skill,
    authorize: async (task, executor, mission) =>
      adapters.authorize?.(task, executor, mission) ?? { allowed: true },
    execute: async (task, executor, mission) =>
      adapters.execute?.(task, executor, mission),
    observe: async (task, execution, mission) =>
      adapters.observe?.(task, execution, mission) ?? { readback: execution?.result ?? null },
    successCriteria: (task, observation, mission) =>
      adapters.successCriteria?.(task, observation, mission) === true,
    repair: async (task, classification, execution, observation, mission) =>
      adapters.repair?.(task, classification, execution, observation, mission) ?? { status: "NO_REPAIR_AVAILABLE" },
    discoverAlternative: async (task, mission, context) =>
      adapters.discoverAlternative?.(task, mission, context) ?? null,
    finalReadback: async (mission) =>
      adapters.finalReadback?.(mission) ?? {
        objectives_verified: false,
        state_matches_reality: false,
        unresolved_blockers: ["FINAL_READBACK_NOT_IMPLEMENTED"]
      },
    verifyIndependent: verifier
  };

  return Object.freeze({
    functionBank,
    runMission: (mission) => runMission(mission, deps),
    resumeMission: (mission, decision) => resumeMission(mission, decision, deps),
    dependencies: deps
  });
}
