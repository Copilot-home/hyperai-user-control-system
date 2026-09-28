import test from "node:test";
import assert from "node:assert/strict";
import { FunctionBank } from "./function-bank.mjs";
import { createFunctionBankMissionDeps } from "./function-bank-mission-adapter.mjs";
import { runMission } from "./mission-runner.mjs";

function base() { return { mission_id: "HOTL-FB-001", objective: "execute registered function", scope: {}, constraints: {}, success_criteria: { default: true }, risk_policy: {}, authority_boundary: {}, end_condition: {}, queue: [{ task_id: "TASK-001", function_id: "test.echo" }] }; }

test("mission runner executes through the real Function Bank", async () => {
  const bank = new FunctionBank();
  bank.register({ id: "test.echo", capability: "test.echo", execute: async (task) => ({ execution_id: "exec-" + task.task_id, readback: { task_id: task.task_id, state: "done" }, success_criteria_met: true }) });
  const mission = await runMission(base(), createFunctionBankMissionDeps({ functionBank: bank }));
  assert.equal(mission.state, "MISSION_PASS");
  assert.equal(mission.queue[0].state, "PASS");
  assert.equal(mission.queue[0].receipt.function_id, "test.echo");
  assert.equal(mission.queue[0].readback.task_id, "TASK-001");
  assert.equal(mission.evidence_chain_sealed, true);
});

test("missing Function Bank selection becomes an exact capability blocker", async () => {
  const bank = new FunctionBank();
  const mission = await runMission({ ...base(), queue: [{ task_id: "TASK-001", function_id: "missing" }] }, createFunctionBankMissionDeps({ functionBank: bank }));
  assert.equal(mission.state, "BLOCKED");
  assert.equal(mission.queue[0].state, "BLOCKED");
  assert.equal(mission.unresolved_blockers[0].exact_cause, "NO_EXECUTABLE_CAPABILITY");
});

test("readback absence is not a PASS", async () => {
  const bank = new FunctionBank();
  bank.register({ id: "test.no-readback", capability: "test", execute: async () => ({ success_criteria_met: true }) });
  const mission = await runMission({ ...base(), queue: [{ task_id: "TASK-001", function_id: "test.no-readback" }] }, createFunctionBankMissionDeps({ functionBank: bank }));
  assert.equal(mission.state, "BLOCKED");
  assert.equal(mission.unresolved_blockers[0].cause, "NO_READBACK");
});
