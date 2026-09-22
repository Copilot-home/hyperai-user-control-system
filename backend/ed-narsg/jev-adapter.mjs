import { assertExecutionContract, JEV_OPERATIONS, MUTATING_OPERATIONS, PROTOCOL_VERSION } from './protocol.mjs';

const TARGET_OPERATIONS = new Set(['CLICK', 'TYPE_TEXT', 'SELECT']);

export function normalizeJevDecision({ decision, observedObjectIds, contract }) {
  assertExecutionContract(contract);
  if (!decision || typeof decision !== 'object') throw new Error('Jev decision is required');

  const operation = decision.operation;
  if (!JEV_OPERATIONS.has(operation)) throw new Error('Jev proposed an unsupported operation');
  if (!contract.allowed_operations.includes(operation)) {
    throw new Error('operation is outside execution contract: ' + operation);
  }

  if (operation === 'DONE' || operation === 'BLOCKED') {
    return {
      schema: PROTOCOL_VERSION,
      kind: 'assertion',
      assertion: operation === 'DONE' ? 'COMPLETION_ASSERTION' : 'BLOCKED_ASSERTION',
      executor: 'jev',
      verified: false,
      commit_authority: 'state-engine',
      reason: decision.reason ?? null,
    };
  }

  if (TARGET_OPERATIONS.has(operation)) {
    const target = decision.target;
    if (!Number.isInteger(target) || !observedObjectIds.has(target)) {
      throw new Error('Jev target must reference an observed object');
    }
  }

  if (decision.selector || decision.coordinates || decision.javascript || decision.shell_command) {
    throw new Error('Jev output must not contain executable targeting or code');
  }

  return {
    schema: PROTOCOL_VERSION,
    kind: 'action_proposal',
    executor: 'jev',
    operation,
    target: Number.isInteger(decision.target) ? decision.target : null,
    text: operation === 'TYPE_TEXT' ? String(decision.text ?? '') : null,
    mutating: MUTATING_OPERATIONS.has(operation),
    observed_object_ref: Number.isInteger(decision.target) ? 'dom:' + decision.target : null,
    verified: false,
    commit_authority: 'state-engine',
  };
}
