import test from "node:test";
import assert from "node:assert/strict";
import { FunctionBank } from "./function-bank.mjs";
import { registerConnectorFunction } from "./connector-function-adapter.mjs";

test("connector execution is exposed as a Function Bank function with receipt", async () => {
  const calls = [];
  const bank = new FunctionBank();
  registerConnectorFunction(bank, {
    id: "connector.read",
    capability: "remote-read",
    connector: {
      execute: async () => {
        calls.push("connector.execute");
        return { actual_state: "REMOTE_STATE" };
      }
    }
  });

  const selected = bank.select({ function_id: "connector.read" });
  const execution = await bank.execute(selected, { task_id: "TASK-001" });

  assert.deepEqual(calls, ["connector.execute"]);
  assert.equal(execution.receipt.function_id, "connector.read");
  assert.equal(execution.receipt.status, "EXECUTED");
  assert.equal(execution.result.actual_state, "REMOTE_STATE");
});

test("connector errors remain receipt-bearing and do not become false success", async () => {
  const bank = new FunctionBank();
  registerConnectorFunction(bank, {
    id: "connector.fail",
    capability: "remote-read",
    connector: {
      execute: async () => {
        const error = new Error("REMOTE_FAILURE");
        error.classification = "transient";
        throw error;
      }
    }
  });

  const execution = await bank.execute(
    bank.select({ function_id: "connector.fail" }),
    { task_id: "TASK-002" }
  );

  assert.equal(execution.ok, false);
  assert.equal(execution.receipt.status, "ERROR");
  assert.equal(execution.error.message, "REMOTE_FAILURE");
});
