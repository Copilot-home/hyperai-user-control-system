export const INDEPENDENT_VERIFIER_VERSION = 'E-D-NARSG-INDEPENDENT-VERIFIER-1.0';

const TERMINAL = new Set(['PASS', 'FAIL', 'UNKNOWN']);

function object(value, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(code);
}

export function createVerificationContract(input = {}) {
  object(input, 'VERIFICATION_CONTRACT_INVALID');
  if (!input.verification_id) throw new Error('VERIFICATION_ID_MISSING');
  if (!input.observation_id) throw new Error('VERIFICATION_OBSERVATION_MISSING');
  if (!input.expected) throw new Error('VERIFICATION_EXPECTATION_MISSING');
  if (!input.checker || !input.checker.id) throw new Error('VERIFICATION_CHECKER_MISSING');
  if (input.checker.state_authority === true || input.checker.commit_authority === true) {
    throw new Error('VERIFIER_AUTHORITY_VIOLATION');
  }
  return Object.freeze({
    protocol_version: INDEPENDENT_VERIFIER_VERSION,
    verification_id: String(input.verification_id),
    observation_id: String(input.observation_id),
    expected: input.expected,
    checker: Object.freeze({
      id: String(input.checker.id),
      version: input.checker.version || null,
      state_authority: false,
      commit_authority: false,
    }),
    status: 'PENDING',
  });
}

export function evaluateVerification(contract, observation, check) {
  object(contract, 'VERIFICATION_CONTRACT_INVALID');
  object(observation, 'VERIFICATION_OBSERVATION_INVALID');
  if (contract.status !== 'PENDING') throw new Error('VERIFICATION_ALREADY_TERMINAL');
  if (!observation.observation_id || observation.observation_id !== contract.observation_id) {
    throw new Error('VERIFICATION_OBSERVATION_ID_MISMATCH');
  }
  if (typeof check !== 'function') throw new Error('VERIFICATION_CHECKER_FUNCTION_REQUIRED');

  let result;
  try {
    result = check(observation.payload, contract.expected);
  } catch (error) {
    return Object.freeze({
      ...contract,
      status: 'UNKNOWN',
      reason: error instanceof Error ? error.message : String(error),
    });
  }

  const status = result === true ? 'PASS' : result === false ? 'FAIL' : 'UNKNOWN';
  if (!TERMINAL.has(status)) throw new Error('VERIFICATION_RESULT_INVALID');
  return Object.freeze({
    ...contract,
    status,
    checked_at: new Date().toISOString(),
    result: status === 'PASS' ? { verified: true } : null,
    reason: status === 'UNKNOWN' ? 'CHECKER_RETURNED_UNKNOWN' : null,
  });
}

export function assertIndependentVerification(result) {
  object(result, 'VERIFICATION_RESULT_INVALID');
  if (result.status !== 'PASS' || result.result?.verified !== true) {
    throw new Error('INDEPENDENT_VERIFICATION_NOT_PASSED');
  }
  if (result.checker?.state_authority === true || result.checker?.commit_authority === true) {
    throw new Error('VERIFIER_AUTHORITY_VIOLATION');
  }
  return true;
}
