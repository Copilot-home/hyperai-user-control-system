import { FunctionBank } from "./function-bank.mjs";

function classifyHttpFailure(status) {
  if (status === 401 || status === 403) return "authorization";
  if (status === 408 || status === 429 || status >= 500) return "transient";
  if (status >= 400) return "configuration";
  return "unknown";
}

function createHttpFunction({ id, capability, path, verifyPayload }) {
  const request = async (_task, context = {}) => {
    const baseUrl = context.baseUrl || process.env.HYPERAI_RUNTIME_BASE_URL || "http://127.0.0.1:5000";
    const response = await fetch(new URL(path, baseUrl));
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(payload?.detail || `HTTP_${response.status}`);
      error.classification = classifyHttpFailure(response.status);
      throw error;
    }
    return { execution_id: `${id}:${Date.now()}`, status: response.status, payload };
  };

  return {
    id,
    capability,
    surface: "native-http",
    mutation: false,
    execute: request,
    readback: request,
    verify: async (_task, execution, readback) => {
      if (!readback || readback.status !== 200) return false;
      return verifyPayload(execution?.result?.payload, readback?.payload);
    },
  };
}

export function createRuntimeFunctionBank() {
  const bank = new FunctionBank();

  bank.register(createHttpFunction({
    id: "runtime.capabilities.read",
    capability: "runtime.read",
    path: "/api/runtime/capabilities",
    verifyPayload: (_executed, observed) => Boolean(observed?.status),
  }));

  bank.register(createHttpFunction({
    id: "workspace.connectors.read",
    capability: "connector.census",
    path: "/api/workspace/connectors",
    verifyPayload: (_executed, observed) => Array.isArray(observed?.connectors),
  }));

  bank.register(createHttpFunction({
    id: "workspace.runtimes.read",
    capability: "runtime.census",
    path: "/api/workspace/runtimes",
    verifyPayload: (_executed, observed) => Array.isArray(observed?.runtimes),
  }));

  bank.register(createHttpFunction({
    id: "workspace.missions.read",
    capability: "mission.read",
    path: "/api/workspace/missions",
    verifyPayload: (_executed, observed) => Boolean(observed?.generated_at),
  }));

  bank.register(createHttpFunction({
    id: "github.agent.status.read",
    capability: "github.status.read",
    path: "/api/github-agent/status",
    verifyPayload: (_executed, observed) => observed !== null,
  }));

  return bank;
}

export function buildRuntimeCapabilityCensus(bank = createRuntimeFunctionBank()) {
  return {
    source: "registered-function-bank",
    generated_at: new Date().toISOString(),
    function_count: bank.size(),
    functions: bank.discover({ capability: "runtime.read" })
      .concat(bank.discover({ capability: "connector.census" }))
      .concat(bank.discover({ capability: "runtime.census" }))
      .concat(bank.discover({ capability: "mission.read" }))
      .concat(bank.discover({ capability: "github.status.read" })),
  };
}
