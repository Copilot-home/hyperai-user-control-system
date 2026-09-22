import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REAL_WORLD_EXECUTION_CONTRACT_VERSION,
  createExecutionContract,
  advanceExecutionContract,
  commitVerifiedExecution,
} from '../../backend/ed-narsg/real-world-execution-contract.mjs';

function base() {
  return createExecutionContract({
    mission_id: 'mission-001',
    intent: 'clean bounded temporary files',
    authorization: { granted: true, scope: 'tmp-safe' },
    executor: { id: 'shell-worker', capability: 'filesystem', state_authority: false, commit_authority: false },
  });
}

test('creates a bounded execution contract with executor authority denied', () => {
  const c = base();
  assert.equal(c.protocol_version, REAL_WORLD_EXECUTION_CONTRACT_VERSION);
  assert.equal(c.phase, 'INTENT');
  assert.equal(c.executor.state_authority, false);
  assert.equal(c.executor.commit_authority, false);
});

test('rejects execution without explicit authorization', () => {
  assert.throws(() => createExecutionContract({
    mission_id: 'm',
    intent: 'do work',
    authorization: { granted: false },
    executor: { id: 'worker' },
  }), /EXECUTION_AUTHORIZATION_REQUIRED/);
});

test('rejects executor escalation', () => {
  assert.throws(() => createExecutionContract({
    mission_id: 'm',
    intent: 'do work',
    authorization: { granted: true },
    executor: { id: 'worker', state_authority: true },
  }), /EXECUTOR_AUTHORITY_VIOLATION/);
});

test('requires evidence before entering evidence phase', () => {
  let c = base();
  c = advanceExecutionContract(c, { next_phase: 'AUTHORIZATION' });
  c = advanceExecutionContract(c, { next_phase: 'EXECUTION' });
  c = advanceExecutionContract(c, { next_phase: 'OBSERVATION' });
  assert.throws(() => advanceExecutionContract(c, { next_phase: 'EVIDENCE' }), /EXECUTION_EVIDENCE_REQUIRED/);
});

test('preserves unknown mutation state and blocks commit', () => {
  let c = base();
  c = advanceExecutionContract(c, { status: 'BLOCKED', reason: 'executor timeout' });
  assert.equal(c.status, 'BLOCKED');

  c = base();
  c = advanceExecutionContract(c, { next_phase: 'AUTHORIZATION' });
  c = advanceExecutionContract(c, { next_phase: 'EXECUTION' });
  c = advanceExecutionContract(c, { next_phase: 'OBSERVATION', mutation_state: 'UNKNOWN' });
  assert.equal(c.mutation_state, 'UNKNOWN');
  assert.equal(c.status, 'UNKNOWN');
});

test('terminal execution contracts cannot be reactivated', () => {
  let blocked = base();
  blocked = advanceExecutionContract(blocked, { status: 'BLOCKED', reason: 'blocked-by-policy' });
  assert.throws(
    () => advanceExecutionContract(blocked, { next_phase: 'AUTHORIZATION' }),
    /EXECUTION_CONTRACT_TERMINAL/,
  );

  let unknown = base();
  unknown = advanceExecutionContract(unknown, { next_phase: 'AUTHORIZATION' });
  unknown = advanceExecutionContract(unknown, { next_phase: 'EXECUTION' });
  unknown = advanceExecutionContract(unknown, { next_phase: 'OBSERVATION', mutation_state: 'UNKNOWN' });
  assert.throws(
    () => advanceExecutionContract(unknown, { next_phase: 'EVIDENCE', evidence: [{ id: 'e1' }] }),
    /EXECUTION_CONTRACT_TERMINAL/,
  );
});

test('requires independent verification before commit', () => {
  let c = base();
  c = advanceExecutionContract(c, { next_phase: 'AUTHORIZATION' });
  c = advanceExecutionContract(c, { next_phase: 'EXECUTION' });
  c = advanceExecutionContract(c, { next_phase: 'OBSERVATION' });
  c = advanceExecutionContract(c, { next_phase: 'EVIDENCE', evidence: [{ id: 'e1', source: 'worker-observation' }] });
  c = advanceExecutionContract(c, { next_phase: 'VERIFICATION' });
  assert.throws(() => commitVerifiedExecution(c, { verified: false }), /EXECUTION_INDEPENDENT_VERIFICATION_REQUIRED/);
  const committed = commitVerifiedExecution(c, { verified: true, observation_id: 'obs-001' });
  assert.equal(committed.status, 'COMMITTED');
  assert.equal(committed.phase, 'COMMIT');
});
