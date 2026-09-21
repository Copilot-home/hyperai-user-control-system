export const DURABLE_STORE_VERSION = 'E-D-NARSG-DURABLE-STORE-1.0';

export const DURABLE_TABLES = Object.freeze({
  events: 'ed_narsg_events',
  projections: 'ed_narsg_state_projections',
  idempotency: 'ed_narsg_idempotency',
});

export function validateDurableEvent(event = {}) {
  if (!event.id || !event.aggregate_id || !Number.isInteger(event.sequence)) throw new Error('DURABLE_EVENT_IDENTITY_INVALID');
  if (!event.event_hash || !event.schema_version) throw new Error('DURABLE_EVENT_PROVENANCE_INVALID');
  if (event.sequence < 0) throw new Error('DURABLE_EVENT_SEQUENCE_INVALID');
  return true;
}

export function createDurableStore(repository) {
  if (!repository || typeof repository.transaction !== 'function') {
    throw new Error('DURABLE_REPOSITORY_TRANSACTION_REQUIRED');
  }

  return Object.freeze({
    async appendEvent(event, projection = null) {
      validateDurableEvent(event);
      return repository.transaction(async (tx) => {
        await tx.insertEvent(event);
        if (projection) await tx.upsertProjection(projection);
        return event;
      });
    },
    async claimIdempotency(key, executionId) {
      if (!key || !executionId) throw new Error('IDEMPOTENCY_IDENTITY_REQUIRED');
      return repository.transaction((tx) => tx.claimIdempotency({ key, executionId }));
    },
    async loadAggregate(aggregateId) {
      if (!aggregateId) throw new Error('AGGREGATE_ID_REQUIRED');
      return repository.loadAggregate(aggregateId);
    },
  });
}

export function assertDurableTransactionResult(result) {
  if (!result) throw new Error('DURABLE_TRANSACTION_RESULT_MISSING');
  return result;
}