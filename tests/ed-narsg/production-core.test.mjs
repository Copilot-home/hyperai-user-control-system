import test from 'node:test';
import assert from 'node:assert/strict';
import {
  can,
  assertCan,
  assertExecutorBoundary,
  assertCommitBoundary,
} from '../../backend/ed-narsg/authority-model.mjs';
import {
  ED_NARSG_PROTOCOL_VERSION,
  createProtocolObject,
} from '../../backend/ed-narsg/protocol.mjs';
import {
  appendEvent,
  replayEvents,
  verifyEventChain,
} from '../../backend/ed-narsg/event-store.mjs';
import {
  createState,
  transitionState,
  reduceState,
} from '../../backend/ed-narsg/state-engine.mjs';

test('authority matrix prevents executor and verifier from committing', () => {
  assert.equal(can('EXECUTOR', 'EXECUTE'), true);
  assert.equal(can('EXECUTOR', 'COMMIT'), false);
  assert.equal(can('VERIFIER', 'VERIFY'), true);
  assert.equal(can('VERIFIER', 'COMMIT'), false);
  assert.throws(() => assertCan('EXECUTOR', 'COMMIT'), /AUTHORITY_DENIED/);
});

test('executor boundary rejects state or commit authority', () => {
  assertExecutorBoundary({ id: 'jev-1' });
  assert.throws(() => assertExecutorBoundary({ id: 'jev-1', state_authority: true }), /EXECUTOR_AUTHORITY_VIOLATION/);
});

test('commit boundary requires authorization, verification and known mutation state', () => {
  assert.throws(() => assertCommitBoundary('STATE_AUTHORITY', {
    authorized: false, verified: true, mutation_state: 'KNOWN',
  }), /COMMIT_AUTHORIZATION_REQUIRED/);
  assert.throws(() => assertCommitBoundary('STATE_AUTHORITY', {
    authorized: true, verified: false, mutation_state: 'KNOWN',
  }), /COMMIT_VERIFICATION_REQUIRED/);
  assert.throws(() => assertCommitBoundary('STATE_AUTHORITY', {
    authorized: true, verified: true, mutation_state: 'UNKNOWN',
  }), /COMMIT_UNKNOWN_MUTATION_STATE/);
  assertCommitBoundary('STATE_AUTHORITY', {
    authorized: true, verified: true, mutation_state: 'KNOWN',
  });
});

test('canonical protocol objects are versioned and provenance-bearing', () => {
  const object = createProtocolObject('Observation', {
    correlation_id: 'run-1',
    source: { executor: 'jev-1', version: 'pinned' },
    observed_value: 'button-visible',
  });
  assert.equal(object.schema_version, ED_NARSG_PROTOCOL_VERSION);
  assert.equal(object.type, 'Observation');
  assert.equal(object.correlation_id, 'run-1');
  assert.equal(object.source.executor, 'jev-1');
});

test('event log is append-only, chained and replayable', () => {
  let events = [];
  events = appendEvent(events, {
    correlation_id: 'run-1',
    source: { service: 'test' },
    event_type: 'RUN_CREATED',
    aggregate_id: 'run-1',
  });
  events = appendEvent(events, {
    correlation_id: 'run-1',
    causation_id: events[0].id,
    source: { service: 'test' },
    event_type: 'STATE_COMMITTED',
    aggregate_id: 'run-1',
    state_patch: { task_status: 'VERIFIED' },
    commit_authorized: true,
    verified: true,
    mutation_state: 'KNOWN',
  });

  assert.equal(events.length, 2);
  verifyEventChain(events);
  const state = replayEvents(events, reduceState, createState());
  assert.equal(state.task_status, 'VERIFIED');
  assert.equal(events[1].previous_hash, events[0].event_hash);

  const tampered = events.map((event, index) => index === 1 ? { ...event, event_type: 'STATE_FORGED' } : event);
  assert.throws(() => verifyEventChain(tampered), /EVENT_HASH_INVALID/);
});

test('committed task state requires verified evidence and explicit commit authority', () => {
  const state = createState({ task_status: 'VERIFIED' });
  assert.throws(() => transitionState(state, { task_status: 'COMMITTED' }, {
    actor: 'STATE_AUTHORITY', authorized: true, verified: false, mutation_state: 'KNOWN',
  }), /COMMIT_VERIFICATION_REQUIRED/);

  const committed = transitionState(state, { task_status: 'COMMITTED' }, {
    actor: 'STATE_AUTHORITY', authorized: true, verified: true, mutation_state: 'KNOWN',
  });
  assert.equal(committed.task_status, 'COMMITTED');
});
