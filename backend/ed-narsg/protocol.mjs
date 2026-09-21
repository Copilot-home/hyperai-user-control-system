export const PROTOCOL_VERSION = 'EDNARSG-1.0';

export const JEV_OPERATIONS = new Set([
  'CLICK',
  'TYPE_TEXT',
  'SELECT',
  'SCROLL_UP',
  'SCROLL_DOWN',
  'WAIT',
  'DONE',
  'BLOCKED',
]);

export const MUTATING_OPERATIONS = new Set(['CLICK', 'TYPE_TEXT', 'SELECT']);

export function assertExecutionContract(contract) {
  if (!contract || typeof contract !== 'object') throw new Error('execution contract is required');
  if (contract.protocol_version !== PROTOCOL_VERSION) throw new Error('execution contract protocol version mismatch');
  if (!contract.contract_id || !contract.task_id || !contract.executor) throw new Error('execution contract identity is incomplete');
  if (!Array.isArray(contract.allowed_operations)) throw new Error('execution contract allowed_operations is required');
  for (const operation of contract.allowed_operations) {
    if (!JEV_OPERATIONS.has(operation)) throw new Error('unsupported Jev operation: ' + operation);
  }
  if (contract.verification?.required !== true) throw new Error('execution contract must require independent verification');
  if (!Number.isInteger(contract.ttl_ms) || contract.ttl_ms <= 0) throw new Error('execution contract ttl_ms must be positive');
  return contract;
}

export function createObservation({ observation_id, source, observed_at, payload, freshness }) {
  if (!observation_id || !source || !observed_at) throw new Error('observation provenance is incomplete');
  return {
    schema: PROTOCOL_VERSION,
    observation_id,
    source,
    observed_at,
    freshness: freshness ?? 'UNKNOWN',
    payload: payload ?? null,
  };
}

export function createEvidence({ evidence_id, observation_id, claim, validity = 'VALID' }) {
  if (!evidence_id || !observation_id || !claim) throw new Error('evidence provenance is incomplete');
  return { schema: PROTOCOL_VERSION, evidence_id, observation_id, claim, validity };
}
