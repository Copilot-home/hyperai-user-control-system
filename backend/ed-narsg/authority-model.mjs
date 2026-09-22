export const ACTORS = Object.freeze([
  'USER',
  'PLANNER',
  'LLM',
  'EXECUTOR',
  'VERIFIER',
  'STATE_AUTHORITY',
  'POLICY_ENGINE',
]);

export const OPERATIONS = Object.freeze([
  'READ',
  'PROPOSE',
  'EXECUTE',
  'VERIFY',
  'COMMIT',
  'AUTHORIZE',
]);

const MATRIX = Object.freeze({
  USER: Object.freeze({ READ: true, PROPOSE: true, EXECUTE: false, VERIFY: false, COMMIT: false, AUTHORIZE: true }),
  PLANNER: Object.freeze({ READ: true, PROPOSE: true, EXECUTE: false, VERIFY: false, COMMIT: false, AUTHORIZE: false }),
  LLM: Object.freeze({ READ: true, PROPOSE: true, EXECUTE: false, VERIFY: false, COMMIT: false, AUTHORIZE: false }),
  EXECUTOR: Object.freeze({ READ: true, PROPOSE: false, EXECUTE: true, VERIFY: false, COMMIT: false, AUTHORIZE: false }),
  VERIFIER: Object.freeze({ READ: true, PROPOSE: false, EXECUTE: false, VERIFY: true, COMMIT: false, AUTHORIZE: false }),
  STATE_AUTHORITY: Object.freeze({ READ: true, PROPOSE: false, EXECUTE: false, VERIFY: false, COMMIT: true, AUTHORIZE: false }),
  POLICY_ENGINE: Object.freeze({ READ: true, PROPOSE: true, EXECUTE: true, VERIFY: true, COMMIT: false, AUTHORIZE: true }),
});

export function can(actor, operation) {
  return MATRIX[actor]?.[operation] === true;
}

export function assertCan(actor, operation, reason = 'AUTHORITY_DENIED') {
  if (!can(actor, operation)) {
    throw new Error(reason);
  }
  return true;
}

export function assertExecutorBoundary(executor = {}) {
  if (!executor.id) throw new Error('EXECUTOR_ID_MISSING');
  if (executor.state_authority === true || executor.commit_authority === true) {
    throw new Error('EXECUTOR_AUTHORITY_VIOLATION');
  }
  assertCan('EXECUTOR', 'EXECUTE');
  return true;
}

export function assertCommitBoundary(actor = 'STATE_AUTHORITY', context = {}) {
  assertCan(actor, 'COMMIT');
  if (context.authorized !== true) throw new Error('COMMIT_AUTHORIZATION_REQUIRED');
  if (context.verified !== true) throw new Error('COMMIT_VERIFICATION_REQUIRED');
  if (context.mutation_state === 'UNKNOWN') throw new Error('COMMIT_UNKNOWN_MUTATION_STATE');
  return true;
}
