import test from "node:test";
import assert from "node:assert/strict";
import { createRuntimeFunctionBank, buildRuntimeCapabilityCensus } from "./runtime-execution-surface.mjs";

function response(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("runtime surface performs executable request plus independent readback", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls += 1;
    assert.match(String(url), /\/api\/workspace\/connectors$/);
    return response({ connectors: [] });
  };

  try {
    const bank = createRuntimeFunctionBank();
    const selection = bank.select({ function_id: "workspace.connectors.read" });
    const execution = await bank.execute(selection, {}, { baseUrl: "http://runtime.test" });
    const observation = await bank.observe(selection, {}, execution, { baseUrl: "http://runtime.test" });
    assert.equal(execution.ok, true);
    assert.equal(execution.result.status, 200);
    assert.deepEqual(observation.readback.payload.connectors, []);
    assert.equal(observation.success_criteria_met, true);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("capability census contains only registered executable functions", () => {
  const census = buildRuntimeCapabilityCensus();
  assert.equal(census.function_count, 5);
  assert.equal(census.functions.length, 5);
});
