/**
 * HOTL Mission Runtime ↔ Function Bank binding.
 * Function Bank is the concrete execution substrate; provider surfaces are injected.
 */
export function createFunctionBankMissionDeps({
  functionBank,
  authorize = async (task, selected) => (
    selected?.mutation === false && task?.mutation !== true &&
    selected?.has_readback === true && selected?.has_verify === true
      ? { allowed: true, scope: 'registered-read-only' }
      : { status: 'HUMAN_DECISION_REQUIRED', cause: 'READONLY_AUTHORITY_NOT_PROVED' }
  ),
  selectSkill,
  selectConnector,
  discoverAlternative,
  decompose,
  discover,
  capabilityCensus,
  finalReadback,
  successCriteria = (_task, observation) => observation?.success_criteria_met === true,
  repair = async () => ({ status: "REPAIRED" }),
} = {}) {
  if (!functionBank || typeof functionBank.select !== "function" ||
      typeof functionBank.execute !== "function" || typeof functionBank.observe !== "function") {
    throw new Error("FUNCTION_BANK_BINDING_INVALID");
  }
  return {
    discover: discover ?? (async (mission) => ({ function_bank_size: functionBank.size(), mission_id: mission.mission_id })),
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
    execute: async (task, selectedFunction, mission) => functionBank.execute(selectedFunction, task, { mission }),
    observe: async (task, execution, mission) => {
      const functionId = execution?.receipt?.function_id;
      if (!functionId) return { readback: null, unknown: true,
        error: { classification: 'configuration', message: 'RECEIPT_FUNCTION_ID_MISSING' } };
      return functionBank.observe({ id: functionId }, task, execution, { mission });
    },
    successCriteria,
    repair,
    finalReadback: finalReadback ?? (async (mission) => {
      const checks = [];
      for (const task of mission.queue) {
        const functionId = task.receipt?.function_id;
        const selection = functionId && functionBank.select({ function_id: functionId });
        if (!selection || task.state !== 'PASS') {
          checks.push(false);
          continue;
        }
        // A fresh readback is required at the terminal gate; an earlier
        // execution receipt or self-reported output is not state proof.
        const observed = await functionBank.observe(selection, task,
          { receipt: task.receipt }, { mission, terminal: true });
        checks.push(observed.success_criteria_met === true && observed.unknown !== true);
      }
      const verified = mission.queue.length > 0 && checks.length === mission.queue.length &&
        checks.every(Boolean) && (mission.unresolved_blockers ?? []).length === 0;
      return {
        objectives_verified: verified,
        state_matches_reality: verified,
        unresolved_blockers: verified ? [] : [{ cause: 'FINAL_INDEPENDENT_READBACK_UNVERIFIED' }],
      };
    }),
  };
}
