/**
 * Connector -> Function Bank bridge.
 *
 * Connectors remain provisioning/execution surfaces; the Function Bank owns
 * registration, deterministic selection, receipts, and mission evidence.
 */
export function registerConnectorFunction(functionBank, {
  id,
  capability,
  connector,
  matches,
}) {
  if (!functionBank || typeof functionBank.register !== "function") {
    throw new Error("FUNCTION_BANK_REQUIRED");
  }
  if (!connector || typeof connector.execute !== "function") {
    throw new Error("CONNECTOR_EXECUTOR_INVALID");
  }

  return functionBank.register({
    id,
    capability,
    ...(typeof matches === "function" ? { matches } : {}),
    execute: async (task, context) => connector.execute(task, context),
  });
}

export function createConnectorFunction({
  id,
  capability,
  connector,
  matches,
}) {
  if (!connector || typeof connector.execute !== "function") {
    throw new Error("CONNECTOR_EXECUTOR_INVALID");
  }
  return {
    id,
    capability,
    ...(typeof matches === "function" ? { matches } : {}),
    execute: async (task, context) => connector.execute(task, context),
  };
}
