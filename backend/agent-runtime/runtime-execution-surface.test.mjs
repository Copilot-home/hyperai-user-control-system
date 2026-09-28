import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createRuntimeFunctionBank, buildRuntimeCapabilityCensus } from "./runtime-execution-surface.mjs";

function server() {
  return http.createServer((req,res)=>{
    res.setHeader("content-type","application/json");
    if (req.url === "/api/runtime/capabilities") return res.end(JSON.stringify({status:"ok"}));
    if (req.url === "/api/workspace/connectors") return res.end(JSON.stringify({connectors:[]}));
    if (req.url === "/api/workspace/runtimes") return res.end(JSON.stringify({runtimes:[]}));
    if (req.url === "/api/workspace/missions") return res.end(JSON.stringify({generated_at:new Date().toISOString(),bindings:[]}));
    if (req.url === "/api/github-agent/status") return res.end(JSON.stringify({status:"ok"}));
    res.statusCode=404; return res.end(JSON.stringify({detail:"not found"}));
  });
}

test("runtime surface is built from actual registered HTTP execution functions", async () => {
  const s=server();
  await new Promise(resolve=>s.listen(0,"127.0.0.1",resolve));
  const port=s.address().port;
  const bank=createRuntimeFunctionBank();
  const selection=bank.select({function_id:"workspace.connectors.read"});
  const execution=await bank.execute(selection,{}, {baseUrl:`http://127.0.0.1:${port}`});
  const observation=await bank.observe(selection,{},execution,{baseUrl:`http://127.0.0.1:${port}`});
  assert.equal(execution.ok,true);
  assert.equal(execution.result.status,200);
  assert.deepEqual(observation.readback.payload.connectors,[]);
  assert.equal(observation.success_criteria_met,true);
  await new Promise((resolve) => s.close(resolve));
});

test("capability census contains only registered executable functions", () => {
  const census=buildRuntimeCapabilityCensus();
  assert.equal(census.function_count,5);
  assert.equal(census.functions.length,5);
});
