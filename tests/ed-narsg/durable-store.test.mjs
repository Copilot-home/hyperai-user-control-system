import test from 'node:test';
import assert from 'node:assert/strict';
import { createDurableStore, validateDurableEvent } from '../../backend/ed-narsg/durable-store.mjs';

test('durable event requires identity, sequence and provenance', () => {
  assert.throws(() => validateDurableEvent({}), /DURABLE_EVENT_IDENTITY_INVALID/);
  assert.throws(() => validateDurableEvent({ id: 'e', aggregate_id: 'r', sequence: 0, event_type: 'T' }), /DURABLE_EVENT_PROVENANCE_INVALID/);
  assert.equal(validateDurableEvent({ id: 'e', aggregate_id: 'r', sequence: 0, event_type: 'T', event_hash: 'h', schema_version: '1.0', created_at: '2026-09-22T00:00:00.000Z', correlation_id: 'c' }), true);
});

test('append event and projection are one repository transaction', async () => {
  const calls = [];
  const store = createDurableStore({
    async transaction(fn) {
      calls.push('begin');
      const tx = {
        async insertEvent(event) { calls.push(['event', event.id]); },
        async upsertProjection(projection) { calls.push(['projection', projection.aggregate_id]); },
        async claimIdempotency(value) { calls.push(['idempotency', value.key]); return value; },
      };
      const result = await fn(tx);
      calls.push('commit');
      return result;
    },
    async loadAggregate(id) { return { id }; },
  });

  await store.appendEvent({ id: 'e1', aggregate_id: 'r1', sequence: 0, event_type: 'T', event_hash: 'h', schema_version: '1.0', created_at: '2026-09-22T00:00:00.000Z', correlation_id: 'c' }, { aggregate_id: 'r1' });
  assert.deepEqual(calls, ['begin', ['event', 'e1'], ['projection', 'r1'], 'commit']);
});

test('idempotency is transaction-bound', async () => {
  let claimed;
  const store = createDurableStore({
    async transaction(fn) {
      return fn({ claimIdempotency(value) { claimed = value; return value; } });
    },
    async loadAggregate() { return null; },
  });
  await store.claimIdempotency('key-1', 'exec-1');
  assert.deepEqual(claimed, { key: 'key-1', executionId: 'exec-1' });
});