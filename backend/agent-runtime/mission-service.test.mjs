import test from "node:test";
import assert from "node:assert/strict";
import { startAgentMission, getAgentMission } from "./mission-service.mjs";

function response(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("agent mission executes queue through registered runtime function and seals evidence", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls += 1;
    assert.match(String(url), /\/api\/runtime\/capabilities$/);
    return response({ status: "ok" });
  };

  const id = `HOTL-INTEGRATION-${Date.now()}`;
  try {
    const mission = await startAgentMission({
      mission_id: id,
      objective: "prove runtime capability readback",
      scope: { surfaces: ["native-http"] },
      constraints: { read_only: true },
      success_criteria: { required: "runtime capability endpoint readable" },
      risk_policy: { deny_unauthorized_mutation: true },
      authority_boundary: { mutation: "human" },
      end_condition: { queue_empty: true },
      queue: [{
        task_id: "TASK-001",
        function_id: "runtime.capabilities.read",
        capability: "runtime.read",
        scope: "read-only",
      }],
    }, { baseUrl: "http://runtime.test" });

    assert.equal(mission.state, "MISSION_PASS");
    assert.equal(mission.queue[0].state, "PASS");
    assert.equal(mission.evidence_chain_sealed, true);
    assert.equal(getAgentMission(id).final_readback.state_matches_reality, true);
    assert.ok(calls >= 4);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
