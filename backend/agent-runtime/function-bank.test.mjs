import test from "node:test";
import assert from "node:assert/strict";
import { FunctionBank } from "./function-bank.mjs";

test("function bank only discovers registered functions", () => {
  const bank = new FunctionBank();
  bank.register({ id:"github.issue.read", capability:"github.read", execute:async()=>({value:1}) });
  assert.equal(bank.discover({function_id:"missing"}).length, 0);
  assert.equal(bank.discover({function_id:"github.issue.read"}).length, 1);
});

test("function selection is deterministic", () => {
  const bank = new FunctionBank();
  bank.register({ id:"fs.read", capability:"filesystem.read", execute:async()=>({}) });
  bank.register({ id:"github.read", capability:"github.read", execute:async()=>({}) });
  assert.equal(bank.select({capability:"github.read"}).id, "github.read");
});

test("execution returns an execution receipt", async () => {
  const bank = new FunctionBank();
  bank.register({ id:"test.echo", capability:"test", execute:async()=>({ok:true}) });
  const selection = bank.select({function_id:"test.echo"});
  const result = await bank.execute(selection, {task_id:"TASK-001"});
  assert.equal(result.ok, true);
  assert.equal(result.receipt.function_id, "test.echo");
  assert.equal(result.receipt.status, "EXECUTED");
});

test("executor failure is represented as a receipt-bearing error", async () => {
  const bank = new FunctionBank();
  bank.register({ id:"test.fail", capability:"test", execute:async()=>{ const e=new Error("boom"); e.classification="transient"; throw e; } });
  const result = await bank.execute(bank.select({function_id:"test.fail"}), {task_id:"TASK-001"});
  assert.equal(result.ok, false);
  assert.equal(result.error.classification, "transient");
  assert.equal(result.receipt.status, "ERROR");
});

test("capability census exposes verification availability, not executable closures", () => {
  const bank = new FunctionBank();
  bank.register({
    id: "read.boundary", capability: "read.boundary", mutation: false,
    execute: async () => ({ answer: "self-reported" }),
    readback: async () => ({ answer: "observed" }),
    verify: async () => true
  });
  const [result] = bank.discover({ function_id: "read.boundary" });
  assert.equal(result.has_readback, true);
  assert.equal(result.has_verify, true);
  assert.equal(result.mutation, false);
  assert.equal(result.execute, undefined);
  assert.equal(result.readback, undefined);
  assert.equal(result.verify, undefined);
});

test("independent readback can contradict a self-reported execution result", async () => {
  const bank = new FunctionBank();
  let observations = 0;
  bank.register({
    id: "read.truth", capability: "read.truth", mutation: false,
    execute: async () => ({ value: "PASS", success_criteria_met: true }),
    readback: async () => { observations++; return { value: "FAIL" }; },
    verify: async (_task, _execution, observed) => observed.value === "PASS"
  });
  const functionRef = bank.select({ function_id: "read.truth" });
  const executed = await bank.execute(functionRef, { task_id: "TRUTH" });
  const observed = await bank.observe(functionRef, { task_id: "TRUTH" }, executed);
  assert.equal(executed.receipt.status, "EXECUTED");
  assert.equal(observations, 1);
  assert.equal(observed.success_criteria_met, false);
  assert.equal(observed.unknown, true);
});

test("missing independent readback callback remains UNKNOWN after execution", async () => {
  const bank = new FunctionBank();
  bank.register({ id: "read.missing", capability: "read.missing",
    mutation: false, execute: async () => ({ status: "PASS" }) });
  const selection = bank.select({ function_id: "read.missing" });
  const executed = await bank.execute(selection, {});
  const observed = await bank.observe(selection, {}, executed);
  assert.equal(observed.unknown, true);
  assert.equal(observed.success_criteria_met, undefined);
});

test("readback failures cannot be silently counted as completion", async () => {
  const bank = new FunctionBank();
  bank.register({
    id: "read.error", capability: "read.error", mutation: false,
    execute: async () => ({ status: "PASS" }),
    readback: async () => { throw new Error("network split"); },
    verify: async () => true,
  });
  const observed = await bank.observe(bank.select({ function_id: "read.error" }), {}, {});
  assert.equal(observed.unknown, true);
  assert.equal(observed.success_criteria_met, undefined);
  assert.equal(observed.error.message, "INDEPENDENT_READBACK_FAILED");
});
