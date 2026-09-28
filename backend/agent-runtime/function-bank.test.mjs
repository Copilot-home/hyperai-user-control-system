import test from "node:test";
import assert from "node:assert/strict";
import { FunctionBank } from "./function-bank.mjs";

test("discover exposes only registered executable functions", () => {
  const bank = new FunctionBank();
  bank.register({ id:"runtime.read", capability:"runtime.read", execute:async()=>({value:1}), readback:async()=>({value:1}), verify:async()=>true });
  assert.equal(bank.discover({function_id:"missing"}).length,0);
  assert.equal(bank.discover({function_id:"runtime.read"})[0].has_readback,true);
});

test("execution creates a receipt and observation performs independent readback", async () => {
  let reads=0;
  const bank=new FunctionBank();
  bank.register({
    id:"runtime.read", capability:"runtime.read",
    execute:async()=>({value:++reads}),
    readback:async()=>({value:++reads}),
    verify:async(_task,execution,readback)=>readback.value===execution.result.value+1
  });
  const selection=bank.select({function_id:"runtime.read"});
  const execution=await bank.execute(selection,{});
  const observation=await bank.observe(selection,{},execution);
  assert.equal(execution.ok,true);
  assert.equal(execution.receipt.status,"EXECUTED");
  assert.equal(observation.readback.value,2);
  assert.equal(observation.success_criteria_met,true);
});

test("missing readback is never silently treated as verified", async () => {
  const bank=new FunctionBank();
  bank.register({id:"write.no.readback",capability:"write",execute:async()=>({changed:true})});
  const selection=bank.select({function_id:"write.no.readback"});
  const execution=await bank.execute(selection,{});
  const observation=await bank.observe(selection,{},execution);
  assert.equal(observation.unknown,true);
});
