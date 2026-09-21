import { assertJevWorkerAttestation } from './jev-worker-attestation.mjs';
import {
  advanceExecutionContract,
  createExecutionContract,
  commitVerifiedExecution,
} from './real-world-execution-contract.mjs';

export const JEV_EXECUTOR_ADAPTER_VERSION = 'E-D-NARSG-JEV-ADAPTER-1.0';
export const JEV_OPERATIONS = Object.freeze([
  'CLICK',
  'TYPE_TEXT',
  'SELECT',
  'SCROLL_UP',
  'SCROLL_DOWN',
  'WAIT',
  'DONE',
  'BLOCKED',
]);

function requireObject(value, reason) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(reason);
}

function requireString(value, reason) {
  if (!value || typeof value !== 'string') throw new Error(reason);
  return value;
}

export function createJevExecution(input = {}) {
  requireObject(input, 'JEV_EXECUTION_INPUT_INVALID');
  const worker = assertJevWorkerAttestation(input.worker_attestation);
  const contract = createExecutionContract({
    mission_id: input.mission_id,
    intent: input.intent,
    authorization: input.authorization,
    executor: {
      id: worker.worker_id,
      capability: worker.capability,
      state_authority: false,
      commit_authority: false,
    },
  });

  return Object.freeze({
    protocol_version: JEV_EXECUTOR_ADAPTER_VERSION,
    worker,
    contract,
    observation_id: requireString(input.observation_id, 'JEV_OBSERVATION_ID_REQUIRED'),
    page_fingerprint: requireString(input.page_fingerprint, 'JEV_PAGE_FINGERPRINT_REQUIRED'),
    action: null,
  });
}

export function authorizeJevAction(execution, decision = {}) {
  requireObject(execution, 'JEV_EXECUTION_INVALID');
  requireObject(decision, 'JEV_DECISION_INVALID');

  const operation = requireString(decision.operation, 'JEV_OPERATION_REQUIRED');
  if (!JEV_OPERATIONS.includes(operation)) throw new Error('JEV_OPERATION_UNSUPPORTED');

  if (operation === 'DONE' || operation === 'BLOCKED') {
    return Object.freeze({
      ...execution,
      action: Object.freeze({ operation }),
      contract: advanceExecutionContract(execution.contract, {
        next_phase: 'AUTHORIZATION',
      }),
    });
  }

  const target = decision.target;
  if (!target || typeof target !== 'object') throw new Error('JEV_TARGET_REQUIRED');
  if (!Number.isInteger(target.index) || target.index < 0) throw new Error('JEV_TARGET_INDEX_INVALID');
  if (!target.kind) throw new Error('JEV_TARGET_KIND_REQUIRED');
  if (target.selector || target.selector_text || target.coordinate || target.javascript) {
    throw new Error('JEV_MODEL_SELECTOR_FORBIDDEN');
  }

  return Object.freeze({
    ...execution,
    action: Object.freeze({
      operation,
      target_index: target.index,
      target_kind: String(target.kind),
      value: decision.value ?? null,
    }),
    contract: advanceExecutionContract(execution.contract, {
      next_phase: 'AUTHORIZATION',
    }),
  });
}

export function recordJevExecution(execution, result = {}) {
  requireObject(execution, 'JEV_EXECUTION_INVALID');
  requireObject(result, 'JEV_RESULT_INVALID');

  if (result.status === 'BLOCKED') {
    return Object.freeze({
      ...execution,
      contract: advanceExecutionContract(execution.contract, {
        status: 'BLOCKED',
        reason: result.reason || 'JEV_BLOCKED',
      }),
    });
  }

  if (result.mutation_state === 'UNKNOWN' || result.execution_acknowledged !== true) {
    return Object.freeze({
      ...execution,
      contract: advanceExecutionContract(execution.contract, {
        mutation_state: 'UNKNOWN',
        reason: result.reason || 'JEV_EXECUTION_RESULT_UNKNOWN',
      }),
    });
  }

  const executionPhase = advanceExecutionContract(execution.contract, {
    next_phase: 'EXECUTION',
    mutation_state: 'KNOWN',
  });
  const observationPhase = advanceExecutionContract(executionPhase, {
    next_phase: 'OBSERVATION',
    mutation_state: 'KNOWN',
  });

  return Object.freeze({
    ...execution,
    contract: observationPhase,
    result: Object.freeze({
      acknowledged: true,
      execution_id: requireString(result.execution_id, 'JEV_EXECUTION_ID_REQUIRED'),
    }),
  });
}

export function recordJevEvidence(execution, evidence = {}) {
  requireObject(execution, 'JEV_EXECUTION_INVALID');
  requireObject(evidence, 'JEV_EVIDENCE_INVALID');
  const evidenceId = requireString(evidence.id, 'JEV_EVIDENCE_ID_REQUIRED');

  const evidencePhase = advanceExecutionContract(execution.contract, {
    next_phase: 'EVIDENCE',
    mutation_state: 'KNOWN',
    evidence: [{
      id: evidenceId,
      observation_id: execution.observation_id,
      page_fingerprint: execution.page_fingerprint,
      source: evidence.source || 'jev-observation',
    }],
  });

  return Object.freeze({ ...execution, contract: evidencePhase });
}

export function verifyAndCommitJevExecution(execution, verification = {}) {
  requireObject(execution, 'JEV_EXECUTION_INVALID');
  requireObject(verification, 'JEV_VERIFICATION_INVALID');

  const verified = advanceExecutionContract(execution.contract, {
    next_phase: 'VERIFICATION',
    mutation_state: 'KNOWN',
  });

  return commitVerifiedExecution(
    { ...execution, contract: verified }.contract,
    {
      verified: verification.verified === true,
      observation_id: verification.observation_id || execution.observation_id,
    },
  );
}
