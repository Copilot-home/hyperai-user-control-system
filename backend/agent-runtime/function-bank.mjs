/**
 * HOTL Function Bank v1
 * Registered execution substrate. Capability claims never create executable functions.
 */
function assertDefinition(definition) {
  if (!definition || typeof definition !== "object") throw new Error("FUNCTION_INVALID");
  if (!definition.id || !definition.capability) throw new Error("FUNCTION_INVALID_METADATA");
  if (typeof definition.execute !== "function") throw new Error("FUNCTION_EXECUTOR_INVALID");
}
export class FunctionBank {
  #functions = new Map();
  register(definition) {
    assertDefinition(definition);
    if (this.#functions.has(definition.id)) throw new Error(`FUNCTION_ALREADY_REGISTERED: ${definition.id}`);
    this.#functions.set(definition.id, Object.freeze({ ...definition }));
    return definition.id;
  }
  discover(task, context = {}) {
    return [...this.#functions.values()]
      .filter((fn) => typeof fn.matches === "function" ? fn.matches(task, context) === true : task?.function_id === fn.id || task?.capability === fn.capability)
      .map(({ execute, readback, verify, ...metadata }) => ({ ...metadata, has_readback: typeof readback === "function", has_verify: typeof verify === "function" }));
  }
  select(task, context = {}) {
    const candidates = this.discover(task, context);
    if (!candidates.length) return null;
    if (task?.function_id) return candidates.find((candidate) => candidate.id === task.function_id) ?? null;
    return candidates.find((candidate) => candidate.capability === task?.capability) ?? candidates[0];
  }
  async execute(selection, task, context = {}) {
    if (!selection?.id) throw new Error("FUNCTION_SELECTION_REQUIRED");
    const definition = this.#functions.get(selection.id);
    if (!definition) throw new Error(`FUNCTION_NOT_FOUND: ${selection.id}`);
    const startedAt = new Date().toISOString();
    try {
      const result = await definition.execute(task, context);
      return { ok: true, result, receipt: { function_id: definition.id, capability: definition.capability, started_at: startedAt, ended_at: new Date().toISOString(), status: "EXECUTED", execution_id: result?.execution_id ?? `${definition.id}:${Date.now()}` } };
    } catch (error) {
      return { ok: false, error: { message: error instanceof Error ? error.message : String(error), classification: error?.classification ?? "unknown" }, receipt: { function_id: definition.id, capability: definition.capability, started_at: startedAt, ended_at: new Date().toISOString(), status: "ERROR" } };
    }
  }
  async observe(selection, task, execution, context = {}) {
    if (!selection?.id) throw new Error("FUNCTION_SELECTION_REQUIRED");
    const definition = this.#functions.get(selection.id);
    if (!definition) throw new Error(`FUNCTION_NOT_FOUND: ${selection.id}`);
    if (typeof definition.readback !== "function") return { readback: null, unknown: true, error: { classification: "configuration", message: "NO_READBACK_FUNCTION" } };
    const readback = await definition.readback(task, execution, context);
    const success_criteria_met = typeof definition.verify === "function" ? await definition.verify(task, execution, readback, context) : false;
    return { readback, success_criteria_met };
  }
  size() { return this.#functions.size; }
}
