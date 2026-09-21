export function commitVerifiedTransition({
  currentState,
  nextState,
  evidence,
  verification,
  authorization,
}) {
  if (!evidence || evidence.validity !== 'VALID') {
    throw new Error('STATE_COMMIT_REJECTED: valid evidence is required');
  }
  if (!verification || verification.status !== 'PASS' || verification.independent !== true) {
    throw new Error('STATE_COMMIT_REJECTED: independent verification is required');
  }
  if (!authorization || authorization.allowed !== true) {
    throw new Error('STATE_COMMIT_REJECTED: commit authorization is required');
  }

  return {
    status: 'COMMITTED',
    current_state: currentState,
    next_state: nextState,
    evidence_id: evidence.evidence_id,
    verification_id: verification.verification_id,
    authorization_id: authorization.authorization_id,
  };
}

export function classifyMutationRecovery({
  mutation_started,
  mutation_completed,
  post_observation,
}) {
  if (!mutation_started) return 'SAFE_TO_RETRY';
  if (mutation_completed === true) return 'DO_NOT_RETRY';
  if (post_observation?.status === 'VERIFIED') return 'DO_NOT_RETRY';
  return 'UNKNOWN_MUTATION_STATE';
}
