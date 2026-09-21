const REQUIRED_GATES = [
  ['upstream', 'UPSTREAM_EVIDENCE_MISSING'],
  ['jev_worker', 'JEV_WORKER_EVIDENCE_MISSING'],
  ['credential_hygiene', 'CREDENTIAL_HYGIENE_EVIDENCE_MISSING'],
  ['dependency_security', 'DEPENDENCY_SECURITY_EVIDENCE_MISSING'],
];

function normalizeGate(name, evidence) {
  if (!evidence || typeof evidence !== 'object') {
    return {
      status: 'BLOCKED',
      verified: false,
      reason: REQUIRED_GATES.find(([key]) => key === name)?.[1],
    };
  }

  if (evidence.remediation_required === true) {
    return {
      status: 'REMEDIATION_REQUIRED',
      verified: false,
      reason: evidence.reason || `${name.toUpperCase()}_REMEDIATION_REQUIRED`,
    };
  }

  if (evidence.verified === true) {
    return { status: 'VERIFIED', verified: true };
  }

  return {
    status: 'BLOCKED',
    verified: false,
    reason: evidence.reason || `${name.toUpperCase()}_NOT_VERIFIED`,
  };
}

export function classifyProductionGate(evidence = {}) {
  const gates = Object.fromEntries(
    REQUIRED_GATES.map(([name]) => [name, normalizeGate(name, evidence[name])]),
  );

  const blockers = Object.values(gates)
    .map((gate) => gate.reason)
    .filter(Boolean);

  const remediation = Object.values(gates)
    .some((gate) => gate.status === 'REMEDIATION_REQUIRED');

  return {
    status: remediation ? 'REMEDIATION_REQUIRED' : blockers.length === 0 ? 'VERIFIED' : 'BLOCKED',
    verified: blockers.length === 0,
    blockers,
    gates,
  };
}
