import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeJevDecision } from '../../backend/ed-narsg/jev-adapter.mjs';
import {
  PROTOCOL_VERSION,
  assertExecutionContract,
  createEvidence,
  createObservation,
} from '../../backend/ed-narsg/protocol.mjs';
import {
  classifyMutationRecovery,
  commitVerifiedTransition,
} from '../../backend/ed-narsg/state-commit.mjs';

const contract = {
  protocol_version: PROTOCOL_VERSION,
  contract_id: 'contract-test-001',
  task_id: 'task-test-001',
  executor: 'browser-jev',
  allowed_operations: ['CLICK', 'TYPE_TEXT', 'DONE', 'BLOCKED'],
  verification: { required: true },
  ttl_ms: 600000,
};

test('contract rejects unverifiable execution', () => {
  assert.doesNotThrow(() => assertExecutionContract(contract));
  assert.throws(
    () => assertExecutionContract({ ...contract, verification: { required: false } }),
    /independent verification/
  );
});

test('Jev action is grounded only in observed objects', () => {
  const action = normalizeJevDecision({
    decision: { operation: 'CLICK', target: 7 },
    observedObjectIds: new Set([7, 8]),
    contract,
  });
  assert.equal(action.kind, 'action_proposal');
  assert.equal(action.observed_object_ref, 'dom:7');
  assert.equal(action.verified, false);

  assert.throws(
    () => normalizeJevDecision({
      decision: { operation: 'CLICK', target: 99 },
      observedObjectIds: new Set([7, 8]),
      contract,
    }),
    /observed object/
  );
});

test('DONE and BLOCKED remain assertions, never state commits', () => {
  for (const operation of ['DONE', 'BLOCKED']) {
    const result = normalizeJevDecision({
      decision: { operation },
      observedObjectIds: new Set(),
      contract,
    });
    assert.equal(result.kind, 'assertion');
    assert.equal(result.verified, false);
    assert.equal(result.commit_authority, 'state-engine');
  }
});

test('state commit fails closed without independent verification', () => {
  const evidence = createEvidence({
    evidence_id: 'evidence-001',
    observation_id: 'obs-001',
    claim: 'target state observed',
  });

  assert.throws(
    () => commitVerifiedTransition({
      currentState: 'A',
      nextState: 'B',
      evidence,
      verification: { status: 'PASS', independent: false, verification_id: 'v-001' },
      authorization: { allowed: true, authorization_id: 'auth-001' },
    }),
    /independent verification/
  );

  const committed = commitVerifiedTransition({
    currentState: 'A',
    nextState: 'B',
    evidence,
    verification: { status: 'PASS', independent: true, verification_id: 'v-002' },
    authorization: { allowed: true, authorization_id: 'auth-002' },
  });
  assert.equal(committed.status, 'COMMITTED');
});

test('mutation recovery preserves UNKNOWN instead of blind retry', () => {
  assert.equal(
    classifyMutationRecovery({
      mutation_started: true,
      mutation_completed: false,
      post_observation: null,
    }),
    'UNKNOWN_MUTATION_STATE'
  );
  assert.equal(
    classifyMutationRecovery({
      mutation_started: true,
      mutation_completed: true,
      post_observation: null,
    }),
    'DO_NOT_RETRY'
  );
});

test('observations retain provenance', () => {
  const observation = createObservation({
    observation_id: 'obs-001',
    source: 'browser-jev',
    observed_at: '2026-09-21T13:00:00Z',
    payload: { page_key: 'abc' },
  });
  assert.equal(observation.source, 'browser-jev');
  assert.equal(observation.freshness, 'UNKNOWN');
});
