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
