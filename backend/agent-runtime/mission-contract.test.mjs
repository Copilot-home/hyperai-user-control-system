import test from "node:test";
import assert from "node:assert/strict";
import {
  lockMission,
  verifyTaskEvidence,
  canEndMission,
  sealMission
} from "./mission-contract.mjs";
import { runMission, resumeMission } from "./mission-runner.mjs";

const base = {
  mission_id: "HOTL-TEST-001",
  objective: "execute",
  scope: {},
  constraints: {},
  success_criteria: {},
  risk_policy: {},
  authority_boundary: {},
  end_condition: {},
  queue: [{ task_id: "TASK-001" }]
};

function successfulDeps(overrides = {}) {
  return {
    discover: async () => ({ surfaces: ["test"] }),
    decompose: async (mission) => ({ queue: mission.queue }),
    capabilityCensus: async () => ({ executable: ["test.fn"] }),
    selectCapability: async () => ({ id: "test.fn" }),
    authorize: async () => ({ allowed: true }),
    execute: async (task) => ({ receipt: { id: `r-${task.attempts}`, status: "EXECUTED" } }),
    observe: async () => ({ readback: { actual: true } }),
    successCriteria: () => true,
    repair: async () => ({ status: "REPAIRED" }),
    finalReadback: async () => ({
      objectives_verified: true,
      state_matches_reality: true,
      unresolved_blockers: []
    }),
    ...overrides
  };
}

test("locks mission", () => assert.equal(lockMission(base).state, "LOCKED"));

test("no receipt is not verified", () =>
  assert.equal(verifyTaskEvidence({}, {}).status, "NOT_VERIFIED"));

test("error receipt is not verified", () =>
  assert.equal(
    verifyTaskEvidence({}, {
      execution_receipt: { status: "ERROR" },
      readback: { actual: true },
      success_criteria_met: true
    }).reason,
    "EXECUTION_NOT_CONFIRMED"
  )
);

test("full lifecycle executes discovery, planning, census and verification", async () => {
  const seen = [];
  const r = await runMission(base, successfulDeps({
    discover: async () => { seen.push("discover"); return {}; },
    decompose: async (mission) => { seen.push("decompose"); return { queue: mission.queue }; },
    capabilityCensus: async () => { seen.push("census"); return {}; },
    selectCapability: async () => { seen.push("select"); return { id: "fn" }; },
    authorize: async () => { seen.push("authorize"); return { allowed: true }; },
    execute: async () => { seen.push("execute"); return { receipt: { id: "r", status: "EXECUTED" } }; },
    observe: async () => { seen.push("observe"); return { readback: { actual: true } }; },
    finalReadback: async () => { seen.push("final-readback"); return {
      objectives_verified: true,
      state_matches_reality: true,
      unresolved_blockers: []
    }; }
  }));
  assert.equal(r.state, "MISSION_PASS");
  assert.deepEqual(seen, [
    "discover","decompose","census","select","authorize",
    "execute","observe","final-readback"
  ]);
});

test("readback transient failure enters repair/retry instead of ending the mission", async () => {
  let observations = 0;
  const r = await runMission(base, successfulDeps({
    observe: async () => {
      observations += 1;
      if (observations === 1) {
        const error = new Error("temporary readback outage");
        error.classification = "transient";
        throw error;
      }
      return { readback: { actual: true } };
    }
  }));
  assert.equal(r.state, "MISSION_PASS");
  assert.equal(observations, 2);
});

test("repair then continue", async () => {
  let n = 0;
  const r = await runMission(base, successfulDeps({
    execute: async (task) => {
      n++;
      return task.attempts === 1
        ? { error: { classification: "transient" } }
        : { receipt: { id: "r" } };
    }
  }));
  assert.equal(r.state, "MISSION_PASS");
  assert.equal(n, 2);
});

test("capability failure can discover an alternative", async () => {
  let selected = 0;
  const r = await runMission(base, successfulDeps({
    selectCapability: async (task) => {
      selected++;
      return task.alternative_capability ?? null;
    },
    discoverAlternative: async () => ({ id: "alternative.fn" })
  }));
  assert.equal(r.state, "MISSION_PASS");
  assert.equal(selected, 2);
});

test("authorization pauses without ending the mission", async () => {
  const r = await runMission(base, successfulDeps({
    authorize: async () => ({
      status: "HUMAN_DECISION_REQUIRED",
      cause: "WRITE_SCOPE"
    })
  }));
  assert.equal(r.state, "PAUSED_FOR_HUMAN");
  assert.equal(r.queue[0].state, "HUMAN_DECISION_REQUIRED");
});

test("human approval resumes the same mission", async () => {
  const paused = await runMission(base, successfulDeps({
    authorize: async () => ({
      status: "HUMAN_DECISION_REQUIRED",
      cause: "WRITE_SCOPE"
    })
  }));

  const resumed = await resumeMission(
    paused,
    { status: "APPROVED", actor: "human" },
    successfulDeps()
  );

  assert.equal(resumed.state, "MISSION_PASS");
  assert.equal(resumed.human_decision.status, "APPROVED");
});

test("human rejection is an explicit terminal decision", async () => {
  const paused = await runMission(base, successfulDeps({
    authorize: async () => ({
      status: "HUMAN_DECISION_REQUIRED",
      cause: "WRITE_SCOPE"
    })
  }));

  const rejected = await resumeMission(
    paused,
    { status: "REJECTED", actor: "human" },
    successfulDeps()
  );

  assert.equal(rejected.state, "MISSION_FAIL");
  assert.equal(rejected.human_decision.status, "REJECTED");
});

test("end gate is fail closed", () =>
  assert.equal(
    canEndMission({
      queue: [{ state: "PASS" }],
      objectives_verified: true,
      state_matches_reality: true,
      evidence_chain_sealed: true,
      unresolved_blockers: []
    }),
    true
  ));

test("seal rejects unverified final state", () =>
  assert.throws(() =>
    sealMission(
      {
        queue: [{ state: "PASS" }],
        objectives_verified: true,
        state_matches_reality: false,
        unresolved_blockers: []
      },
      { state_matches_reality: false }
    )
  )
);
