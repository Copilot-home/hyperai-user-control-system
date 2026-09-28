import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { startAgentMission, getAgentMission } from "./mission-service.mjs";

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

test("agent mission executes queue through registered runtime function and seals evidence", async () => {
  const s=server();
  await new Promise(resolve=>s.listen(0,"127.0.0.1",resolve));
  const baseUrl=`http://127.0.0.1:${s.address().port}`;
  const id=`HOTL-INTEGRATION-${Date.now()}`;
  const mission=await startAgentMission({
    mission_id:id,
    objective:"prove runtime capability readback",
    scope:{surfaces:["native-http"]},
    constraints:{read_only:true},
    success_criteria:{required:"runtime capability endpoint readable"},
    risk_policy:{deny_unauthorized_mutation:true},
    authority_boundary:{mutation:"human"},
    end_condition:{queue_empty:true},
    queue:[{task_id:"TASK-001",function_id:"runtime.capabilities.read",capability:"runtime.read",scope:"read-only"}]
  },{baseUrl});
  assert.equal(mission.state,"MISSION_PASS");
  assert.equal(mission.queue[0].state,"PASS");
  assert.equal(mission.evidence_chain_sealed,true);
  assert.equal(getAgentMission(id).final_readback.state_matches_reality,true);
  s.closeAllConnections?.();
  await new Promise((resolve) => s.close(resolve));
});
