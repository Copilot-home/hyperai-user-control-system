/**
 * HOTL Function Bank v1
 * Execution substrate for mission tasks.
 *
 * A function must be registered before selection. Capability discovery never
 * fabricates an executable function.
 */

function assertFunctionDefinition(definition) {
  if (!definition || typeof definition !== "object") throw new Error("FUNCTION_INVALID");
  for (const key of ["id", "capability", "execute"]) {
    if (key === "execute") {
      if (typeof definition.execute !== "function") throw new Error("FUNCTION_EXECUTOR_INVALID");
    } else if (!definition[key]) {
      throw new Error(`FUNCTION_INVALID: missing ${key}`);
    }
  }
}

export class FunctionBank {
  #functions = new Map();

  register(definition) {
    assertFunctionDefinition(definition);
    if (this.#functions.has(definition.id)) {
      throw new Error(`FUNCTION_ALREADY_REGISTERED: ${definition.id}`);
    }
    this.#functions.set(definition.id, Object.freeze({ ...definition }));
    return definition.id;
  }

  discover(task, context = {}) {
    const candidates = [...this.#functions.values()].filter((fn) => {
      if (typeof fn.matches === "function") return fn.matches(task, context) === true;
      return task?.function_id === fn.id || task?.capability === fn.capability;
    });
    return candidates.map(({ execute, ...metadata }) => metadata);
  }

  select(task, context = {}) {
    const candidates = this.discover(task, context);
    if (!candidates.length) return null;
    if (task?.function_id) {
      return candidates.find((candidate) => candidate.id === task.function_id) ?? null;
    }
    return candidates[0];
  }

  async execute(selection, task, context = {}) {
    if (!selection?.id) throw new Error("FUNCTION_SELECTION_REQUIRED");
    const definition = this.#functions.get(selection.id);
    if (!definition) throw new Error(`FUNCTION_NOT_FOUND: ${selection.id}`);

    const startedAt = new Date().toISOString();
    let result;
    try {
      result = await definition.execute(task, context);
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? { message: error.message, classification: error.classification } : { message: String(error) },
        receipt: {
          function_id: definition.id,
          capability: definition.capability,
          started_at: startedAt,
          ended_at: new Date().toISOString(),
          status: "ERROR"
        }
      };
    }

    const receipt = {
      function_id: definition.id,
      capability: definition.capability,
      started_at: startedAt,
      ended_at: new Date().toISOString(),
      status: "EXECUTED",
      execution_id: result?.execution_id ?? `${definition.id}:${Date.now()}`
    };

    return { ok: true, result, receipt };
  }

  size() {
    return this.#functions.size;
  }
}
