import test from "node:test";
import assert from "node:assert/strict";
import { FunctionBank } from "./function-bank.mjs";
import { createFunctionBankMissionDeps } from "./function-bank-mission-adapter.mjs";
import { runMission } from "./mission-runner.mjs";

function base() { return { mission_id: "HOTL-FB-001", objective: "execute registered function", scope: {}, constraints: {}, success_criteria: { default: true }, risk_policy: {}, authority_boundary: {}, end_condition: {}, queue: [{ task_id: "TASK-001", function_id: "test.echo" }] }; }

test("mission runner executes through the real Function Bank", async () => {
  const bank = new FunctionBank();
  let reads = 0;
  bank.register({ id: "test.echo", capability: "test.echo", mutation: false,
    execute: async (task) => ({ execution_id: "exec-" + task.task_id, readback: { task_id: "forged" }, success_criteria_met: true }),
    readback: async (task) => ({ task_id: task.task_id, state: "done", read_number: ++reads }),
    verify: async (task, _execution, observed) => observed.task_id === task.task_id && observed.state === "done" });
  const mission = await runMission(base(), createFunctionBankMissionDeps({ functionBank: bank }));
  assert.equal(mission.state, "MISSION_PASS");
  assert.equal(mission.queue[0].state, "PASS");
  assert.equal(mission.queue[0].receipt.function_id, "test.echo");
  assert.equal(mission.queue[0].readback.task_id, "TASK-001");
  assert.equal(mission.evidence_chain_sealed, true);
  assert.equal(reads, 2, "task observation and terminal readback must be independent");
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
  assert.equal(mission.state, "PAUSED_FOR_HUMAN");
  assert.equal(mission.human_gate.reason, "READONLY_AUTHORITY_NOT_PROVED");
});
test("reported DONE cannot override independent readback disagreement", async () => {
  const bank = new FunctionBank();
  let probes = 0;
  bank.register({
    id: "test.false-done", capability: "test.false-done", mutation: false,
    execute: async () => ({ readback: { status: "PASS" }, success_criteria_met: true }),
    readback: async () => { probes += 1; return { status: "NOT_READY" }; },
    verify: async (_task, _execution, observed) => observed.status === "PASS",
  });
  const mission = await runMission({ ...base(), queue: [{
    task_id: "TASK-001", function_id: "test.false-done", max_retries: 0
  }] }, createFunctionBankMissionDeps({ functionBank: bank }));
  assert.equal(mission.state, "BLOCKED");
  assert.equal(mission.queue[0].state, "BLOCKED");
  assert.equal(mission.evidence_chain_sealed, undefined);
  assert.ok(probes >= 1);
});

test("mutating capability is paused before execution without authority", async () => {
  let calls = 0;
  const bank = new FunctionBank();
  bank.register({
    id: "test.mutate", capability: "test.mutate", mutation: true,
    execute: async () => { calls++; return { status: "changed" }; },
    readback: async () => ({ status: "changed" }),
    verify: async () => true
  });
  const mission = await runMission({ ...base(), queue: [{
    task_id: "TASK-001", function_id: "test.mutate"
  }] }, createFunctionBankMissionDeps({ functionBank: bank }));
  assert.equal(mission.state, "PAUSED_FOR_HUMAN");
  assert.equal(calls, 0);
});

test("terminal state requires a second independent successful observation", async () => {
  const bank = new FunctionBank();
  let reads = 0;
  bank.register({
    id: "test.transient", capability: "test.transient", mutation: false,
    execute: async () => ({ success_criteria_met: true }),
    readback: async () => ({ ready: (++reads) === 1 }),
    verify: async (_task, _exec, result) => result.ready,
  });
  await assert.rejects(
    runMission({ ...base(), queue: [{ task_id: "TASK-001", function_id: "test.transient" }] },
      createFunctionBankMissionDeps({ functionBank: bank })),
    /MISSION_SEAL_BLOCKED/
  );
  assert.equal(reads, 2);
});
