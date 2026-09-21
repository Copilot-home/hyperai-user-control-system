import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createEvent, appendEvent, verifyEventChain, replayEvents } from '../../backend/ed-narsg/event-store.mjs';
import { createDurableStore } from '../../backend/ed-narsg/durable-store.mjs';
import { createPostgresPool, createPostgresRepository, migratePostgres } from '../../backend/ed-narsg/postgres-store.mjs';

const migration = await readFile(new URL('../../migrations/ed_narsg/001_durable_core.sql', import.meta.url), 'utf8');
const cfg = { host: process.env.PGHOST || '127.0.0.1', port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432, user: process.env.PGUSER || 'postgres', password: process.env.PGPASSWORD || 'postgres', database: process.env.PGDATABASE || 'postgres' };
let pool = createPostgresPool(cfg);
let repository = createPostgresRepository(pool);
let store = createDurableStore(repository);
const prefix = 'ci-' + (process.env.GITHUB_RUN_ID || Date.now());
const aggregate = prefix + '-aggregate';

await migratePostgres(pool, migration);

test('real PostgreSQL durable append replay and restart recovery', async () => {
  const first = createEvent({ id: prefix + '-e0', correlation_id: prefix, aggregate_id: aggregate, event_type: 'EXECUTION_CREATED', payload: { nested: { b: 2, a: 1 } } });
  let events = appendEvent([], first);
  const firstEvent = events[0];
  await store.appendEvent(firstEvent, { aggregate_id: aggregate, state_version: 1, state: { status: 'CREATED' }, last_event_id: firstEvent.id });
  const secondSeed = createEvent({ id: prefix + '-e1', correlation_id: prefix, aggregate_id: aggregate, event_type: 'VERIFIED', payload: { verified: true } });
  events = appendEvent(events, secondSeed);
  const secondEvent = events[1];
  await store.appendEvent(secondEvent, { aggregate_id: aggregate, state_version: 2, state: { status: 'VERIFIED' }, last_event_id: secondEvent.id });
  const loaded = await repository.loadAggregate(aggregate);
  assert.equal(loaded.events.length, 2);
  assert.equal(loaded.projection.state.status, 'VERIFIED');
  assert.deepEqual(loaded.events.map((event) => event.sequence), [0, 1]);
  verifyEventChain(events);
  assert.deepEqual(replayEvents(events, (state, event) => ({ ...state, last: event.event_type }), {}), { last: 'VERIFIED' });
  await pool.end();
  pool = createPostgresPool(cfg);
  repository = createPostgresRepository(pool);
  store = createDurableStore(repository);
  const recovered = await repository.loadAggregate(aggregate);
  assert.equal(recovered.events.length, 2);
  assert.equal(recovered.projection.state_version, 2);
});

test('real transaction rolls back event on downstream failure', async () => {
  const aggregateId = prefix + '-rollback';
  const event = createEvent({ id: prefix + '-rollback-event', correlation_id: prefix, aggregate_id: aggregateId, event_type: 'ROLLBACK_PROBE' });
  await assert.rejects(() => repository.transaction(async (tx) => { await tx.insertEvent(event); throw new Error('INTENTIONAL_ROLLBACK_PROBE'); }), /INTENTIONAL_ROLLBACK_PROBE/);
  assert.equal((await repository.loadAggregate(aggregateId)).events.length, 0);
});

test('real uniqueness rejects duplicate aggregate sequence', async () => {
  const aggregateId = prefix + '-duplicate';
  const first = createEvent({ id: prefix + '-duplicate-1', correlation_id: prefix, aggregate_id: aggregateId, event_type: 'DUPLICATE' });
  await store.appendEvent(first);
  const duplicate = createEvent({ id: prefix + '-duplicate-2', correlation_id: prefix, aggregate_id: aggregateId, event_type: 'DUPLICATE', sequence: 0 });
  await assert.rejects(() => store.appendEvent(duplicate), /duplicate|unique/i);
});

test('real idempotency survives duplicate claim', async () => {
  const key = prefix + '-idempotency';
  const first = await store.claimIdempotency(key, prefix + '-execution-a');
  const second = await store.claimIdempotency(key, prefix + '-execution-b');
  assert.equal(first.claimed, true);
  assert.equal(second.claimed, false);
  assert.equal(second.record.execution_id, prefix + '-execution-a');
});

after(async () => {
  await pool.query('DELETE FROM ed_narsg_idempotency WHERE idempotency_key LIKE $1', [prefix + '%']).catch(() => {});
  await pool.query('DELETE FROM ed_narsg_state_projections WHERE aggregate_id LIKE $1', [prefix + '%']).catch(() => {});
  await pool.query('DELETE FROM ed_narsg_events WHERE aggregate_id LIKE $1', [prefix + '%']).catch(() => {});
  await pool.end().catch(() => {});
});
