import test from 'node:test';
import assert from 'node:assert/strict';
import {
  JEV_EXECUTOR_ADAPTER_VERSION,
  authorizeJevAction,
  createJevExecution,
  recordJevEvidence,
  recordJevExecution,
  verifyAndCommitJevExecution,
} from '../../backend/ed-narsg/jev-executor-adapter.mjs';

const attestation = {
  protocol_version: 'JEV-WORKER-ATTESTATION-1.0',
  service: 'jev-ultrafast',
  worker_id: 'jev-test-worker',
  version: '0.1.0',
  capability: 'browser-execution',
  state_authority: false,
  commit_authority: false,
};

function base() {
  return createJevExecution({
    mission_id: 'mission-1',
    intent: 'Open the requested page and verify the requested result.',
    authorization: { granted: true, scope: 'browser' },
    worker_attestation: attestation,
    observation_id: 'obs-1',
    page_fingerprint: 'page-1',
  });
}

test('Jev adapter creates an execution boundary without state or commit authority', () => {
  const execution = base();
  assert.equal(execution.protocol_version, JEV_EXECUTOR_ADAPTER_VERSION);
  assert.equal(execution.worker.state_authority, false);
  assert.equal(execution.worker.commit_authority, false);
  assert.equal(execution.contract.executor.state_authority, false);
  assert.equal(execution.contract.executor.commit_authority, false);
});

test('Jev action must reference an observed indexed target, never a selector', () => {
  const execution = authorizeJevAction(base(), {
    operation: 'CLICK',
    target: { index: 7, kind: 'button' },
  });
  assert.equal(execution.action.target_index, 7);
  assert.throws(
    () => authorizeJevAction(base(), {
      operation: 'CLICK',
      target: { index: 7, kind: 'button', selector: '#submit' },
    }),
    /JEV_MODEL_SELECTOR_FORBIDDEN/,
  );
});

test('DONE is an executor decision, not proof of a committed outcome', () => {
  const execution = authorizeJevAction(base(), { operation: 'DONE' });
  assert.equal(execution.action.operation, 'DONE');
  assert.equal(execution.contract.phase, 'AUTHORIZATION');
  assert.equal(execution.contract.status, 'PENDING');
});

test('unacknowledged browser mutation remains UNKNOWN and cannot commit', () => {
  const authorized = authorizeJevAction(base(), {
    operation: 'CLICK',
    target: { index: 1, kind: 'button' },
  });
  const unknown = recordJevExecution(authorized, {
    execution_acknowledged: false,
    reason: 'transport_lost_after_click',
  });
  assert.equal(unknown.contract.status, 'UNKNOWN');
  assert.throws(
    () => verifyAndCommitJevExecution(unknown, { verified: true, observation_id: 'obs-2' }),
    /EXECUTION_CONTRACT_TERMINAL/,
  );
});

test('acknowledged execution requires evidence and independent verification before commit', () => {
  const authorized = authorizeJevAction(base(), {
    operation: 'CLICK',
    target: { index: 1, kind: 'button' },
  });
  const observed = recordJevExecution(authorized, {
    execution_acknowledged: true,
    execution_id: 'exec-1',
  });
  const evidenced = recordJevEvidence(observed, { id: 'evidence-1' });
  const committed = verifyAndCommitJevExecution(evidenced, {
    verified: true,
    observation_id: 'obs-2',
  });
  assert.equal(committed.status, 'COMMITTED');
  assert.equal(committed.phase, 'COMMIT');
});
