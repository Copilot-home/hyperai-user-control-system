export const REAL_WORLD_EXECUTION_CONTRACT_VERSION = 'E-D-NARSG-REAL-WORLD-EXECUTION-1.0';

export const EXECUTION_PHASES = Object.freeze([
  'INTENT',
  'AUTHORIZATION',
  'EXECUTION',
  'OBSERVATION',
  'EVIDENCE',
  'VERIFICATION',
  'COMMIT',
]);

export const TERMINAL_STATES = Object.freeze([
  'COMMITTED',
  'BLOCKED',
  'UNKNOWN_MUTATION_STATE',
]);

function requireObject(value, reason) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(reason);
  }
}

export function createExecutionContract(input = {}) {
  requireObject(input, 'EXECUTION_CONTRACT_INPUT_INVALID');

  if (!input.mission_id) throw new Error('EXECUTION_MISSION_ID_MISSING');
  if (!input.intent) throw new Error('EXECUTION_INTENT_MISSING');
  if (!input.authorization || input.authorization.granted !== true) {
    throw new Error('EXECUTION_AUTHORIZATION_REQUIRED');
  }
  if (!input.executor || !input.executor.id) {
    throw new Error('EXECUTION_EXECUTOR_MISSING');
  }
  if (input.executor.state_authority === true || input.executor.commit_authority === true) {
    throw new Error('EXECUTOR_AUTHORITY_VIOLATION');
  }

  return Object.freeze({
    protocol_version: REAL_WORLD_EXECUTION_CONTRACT_VERSION,
    mission_id: String(input.mission_id),
    intent: String(input.intent),
    authorization: Object.freeze({ granted: true, scope: input.authorization.scope || null }),
    executor: Object.freeze({
      id: String(input.executor.id),
      capability: input.executor.capability || null,
      state_authority: false,
      commit_authority: false,
    }),
    phase: 'INTENT',
    status: 'PENDING',
    evidence: Object.freeze([]),
    verification: null,
    mutation_state: 'NOT_STARTED',
  });
}

export function advanceExecutionContract(contract, event = {}) {
  requireObject(contract, 'EXECUTION_CONTRACT_INVALID');
  requireObject(event, 'EXECUTION_EVENT_INVALID');

  const phase = contract.phase;
  const next = event.next_phase;

  if (event.status === 'BLOCKED') {
    return Object.freeze({ ...contract, status: 'BLOCKED', phase, reason: event.reason || 'EXECUTION_BLOCKED' });
  }

  if (event.mutation_state === 'UNKNOWN') {
    return Object.freeze({
      ...contract,
      status: 'UNKNOWN',
      phase,
      mutation_state: 'UNKNOWN',
      reason: event.reason || 'MUTATION_STATE_UNKNOWN',
    });
  }

  const index = EXECUTION_PHASES.indexOf(phase);
  if (index < 0 || EXECUTION_PHASES[index + 1] !== next) {
    throw new Error('EXECUTION_PHASE_TRANSITION_INVALID');
  }

  if (next === 'EVIDENCE' && (!Array.isArray(event.evidence) || event.evidence.length === 0)) {
    throw new Error('EXECUTION_EVIDENCE_REQUIRED');
  }

  if (next === 'COMMIT') {
    throw new Error('EXECUTION_COMMIT_REQUIRES_VERIFICATION');
  }

  return Object.freeze({
    ...contract,
    phase: next,
    evidence: event.evidence || contract.evidence,
    mutation_state: event.mutation_state || contract.mutation_state,
  });
}

export function commitVerifiedExecution(contract, verification = {}) {
  requireObject(contract, 'EXECUTION_CONTRACT_INVALID');
  requireObject(verification, 'EXECUTION_VERIFICATION_INVALID');

  if (contract.phase !== 'VERIFICATION') throw new Error('EXECUTION_NOT_READY_TO_COMMIT');
  if (contract.mutation_state === 'UNKNOWN') throw new Error('EXECUTION_UNKNOWN_STATE_CANNOT_COMMIT');
  if (verification.verified !== true) throw new Error('EXECUTION_INDEPENDENT_VERIFICATION_REQUIRED');
  if (!verification.observation_id) throw new Error('EXECUTION_VERIFICATION_OBSERVATION_MISSING');

  return Object.freeze({
    ...contract,
    phase: 'COMMIT',
    status: 'COMMITTED',
    verification: Object.freeze({
      verified: true,
      observation_id: String(verification.observation_id),
    }),
  });
}
