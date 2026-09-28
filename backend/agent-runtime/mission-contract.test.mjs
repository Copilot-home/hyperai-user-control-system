import test from "node:test";
import assert from "node:assert/strict";
import { lockMission, verifyTaskEvidence, canEndMission, sealMission } from "./mission-contract.mjs";
import { runMission } from "./mission-runner.mjs";

const base={mission_id:"HOTL-TEST-001",objective:"execute",scope:{},constraints:{},success_criteria:{},risk_policy:{},authority_boundary:{},end_condition:{},queue:[{task_id:"TASK-001"}]};

test("locks mission",()=>assert.equal(lockMission(base).state,"LOCKED"));
test("no receipt is not verified",()=>assert.equal(verifyTaskEvidence({},{}).status,"NOT_VERIFIED"));
test("repair then continue",async()=>{let n=0;const r=await runMission(base,{selectCapability:async()=>({id:"fn"}),authorize:async()=>({allowed:true}),execute:async t=>{n++;return t.attempts===1?{error:{classification:"transient"}}:{receipt:{id:"r"}}},observe:async()=>({readback:{actual:true}}),successCriteria:()=>true,repair:async()=>({status:"REPAIRED"}),finalReadback:async()=>({objectives_verified:true,state_matches_reality:true,unresolved_blockers:[]})});assert.equal(r.state,"MISSION_PASS");assert.equal(n,2)});
test("authorization pauses",async()=>{const r=await runMission(base,{selectCapability:async()=>({id:"fn"}),authorize:async()=>({status:"HUMAN_DECISION_REQUIRED"})});assert.equal(r.state,"PAUSED_FOR_HUMAN")});
test("end gate is fail closed",()=>assert.equal(canEndMission({queue:[{state:"PASS"}],objectives_verified:true,state_matches_reality:true,evidence_chain_sealed:true,unresolved_blockers:[]}),true));
test("seal rejects unverified final state",()=>assert.throws(()=>sealMission({queue:[{state:"PASS"}],objectives_verified:true,state_matches_reality:false,unresolved_blockers:[]},{state_matches_reality:false})));
