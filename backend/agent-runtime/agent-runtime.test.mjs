import test from "node:test";
import assert from "node:assert/strict";
import { createAgentRuntime } from "./agent-runtime.mjs";

test("agent runtime exposes a real Function Bank execution surface", async () => {
  const runtime = createAgentRuntime({
    functions: [{
      id: "test.execute",
      capability: "test",
      execute: async () => ({ actual: "state" })
    }],
    adapters: {
      decompose: async () => ({ queue: [{ task_id: "TASK-001", function_id: "test.execute" }] }),
      observe: async (_task, execution) => ({ readback: execution.result }),
      successCriteria: async (_task, observation) => observation.readback?.actual === "state",
      finalReadback: async () => ({
        objectives_verified: true,
        state_matches_reality: true,
        unresolved_blockers: []
      })
    }
  });

  const result = await runtime.runMission({
    mission_id: "AGENT-RUNTIME-001",
    objective: "execute one function",
    scope: {},
    constraints: {},
    success_criteria: { actual: "state" },
    risk_policy: {},
    authority_boundary: {},
    end_condition: {}
  });

  assert.equal(result.state, "MISSION_PASS");
  assert.equal(result.queue[0].state, "PASS");
  assert.equal(result.queue[0].receipt.status, "EXECUTED");
});

test("agent runtime cannot pass without final readback", async () => {
  const runtime = createAgentRuntime({
    functions: [{ id: "test.execute", capability: "test", execute: async () => ({ actual: true }) }],
    adapters: {
      decompose: async () => ({ queue: [{ task_id: "TASK-001", function_id: "test.execute" }] }),
      observe: async (_task, execution) => ({ readback: execution.result }),
      successCriteria: () => true
    }
  });

  const result = await runtime.runMission({
    mission_id: "AGENT-RUNTIME-002",
    objective: "must not seal without readback",
    scope: {},
    constraints: {},
    success_criteria: {},
    risk_policy: {},
    authority_boundary: {},
    end_condition: {}
  });

  assert.equal(result.state, "MISSION_FAIL");
});
