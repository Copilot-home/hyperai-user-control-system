/**
 * HOTL Mission Runtime ↔ Function Bank binding.
 * Keeps the mission runner provider-agnostic while making Function Bank the
 * concrete execution substrate. External connector/skill surfaces are injected
 * as registered functions or selectors; availability is never treated as proof.
 */

export function createFunctionBankMissionDeps({
  functionBank,
  authorize = async () => ({ allowed: true }),
  selectSkill,
  selectConnector,
  discoverAlternative,
  decompose,
  discover,
  capabilityCensus,
  finalReadback,
  successCriteria = (_task, observation, mission) =>
    observation?.success_criteria_met === true || mission?.success_criteria?.default === true,
  repair = async () => ({ status: "REPAIRED" }),
} = {}) {
  if (!functionBank || typeof functionBank.select !== "function" || typeof functionBank.execute !== "function") {
    throw new Error("FUNCTION_BANK_BINDING_INVALID");
  }

  return {
    discover: discover ?? (async (mission) => ({
      function_bank_size: functionBank.size(),
      mission_id: mission.mission_id,
    })),

    decompose: decompose ?? (async (mission) => ({ queue: mission.queue })),

    capabilityCensus: capabilityCensus ?? (async (mission) => ({
      executable_functions: functionBank.size(),
      discovered: mission.queue.flatMap((task) => functionBank.discover(task, { mission })),
    })),

    selectCapability: async (task, mission) => functionBank.select(task, { mission }),

    selectSkill: selectSkill ?? (async (_task, capability) => capability),
    selectConnector: selectConnector ?? (async (_task, skill) => skill),
    authorize,
    discoverAlternative,

    execute: async (task, selectedFunction, mission) =>
      functionBank.execute(selectedFunction, task, { mission }),

    observe: async (_task, execution) => {
      const result = execution?.result;
      const readback = result?.readback ?? result?.observation?.readback;
      return {
        readback,
        success_criteria_met: result?.success_criteria_met,
        conflicting_state: result?.conflicting_state === true,
        unknown: result?.unknown === true || readback === undefined,
        error: execution?.error,
      };
    },

    successCriteria,
    repair,
    finalReadback: finalReadback ?? (async (mission) => ({
      objectives_verified: mission.queue.every((task) => task.state === "PASS"),
      state_matches_reality: true,
      unresolved_blockers: mission.unresolved_blockers ?? [],
    })),
  };
}
