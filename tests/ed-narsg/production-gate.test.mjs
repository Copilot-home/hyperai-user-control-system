import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyProductionGate } from '../../backend/ed-narsg/production-gate.mjs';

test('classifies a fully verified production gate as VERIFIED', () => {
  const result = classifyProductionGate({
    upstream: { verified: true },
    jev_worker: { verified: true },
    credential_hygiene: { verified: true },
    dependency_security: { verified: true },
    package_lock_integrity: { verified: true },
  });
  assert.equal(result.status, 'VERIFIED');
  assert.deepEqual(result.blockers, []);
});

test('blocks when runtime upstream is not verified', () => {
  const result = classifyProductionGate({
    upstream: { verified: false, reason: 'UPSTREAM_NOT_VERIFIED' },
    jev_worker: { verified: true },
    credential_hygiene: { verified: true },
    dependency_security: { verified: true },
    package_lock_integrity: { verified: true },
  });
  assert.equal(result.status, 'BLOCKED');
  assert.deepEqual(result.blockers, ['UPSTREAM_NOT_VERIFIED']);
});

test('requires remediation for historical credential exposure', () => {
  const result = classifyProductionGate({
    upstream: { verified: true },
    jev_worker: { verified: true },
    credential_hygiene: {
      verified: false,
      remediation_required: true,
      reason: 'CREDENTIAL_ROTATION_REQUIRED',
    },
    dependency_security: { verified: true },
    package_lock_integrity: { verified: true },
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.remediation_required, true);
  assert.deepEqual(result.blockers, ['CREDENTIAL_ROTATION_REQUIRED']);
});

test('blocks when Jev worker is not independently verified', () => {
  const result = classifyProductionGate({
    upstream: { verified: true },
    jev_worker: { verified: false, reason: 'JEV_WORKER_NOT_VERIFIED' },
    credential_hygiene: { verified: true },
    dependency_security: { verified: true },
    package_lock_integrity: { verified: true },
  });
  assert.equal(result.status, 'BLOCKED');
  assert.deepEqual(result.blockers, ['JEV_WORKER_NOT_VERIFIED']);
});

test('preserves unresolved dependency security as a blocker', () => {
  const result = classifyProductionGate({
    upstream: { verified: true },
    jev_worker: { verified: true },
    credential_hygiene: { verified: true },
    dependency_security: { verified: false, reason: 'DEPENDENCY_SECURITY_UNRESOLVED' },
    package_lock_integrity: { verified: true },
  });
  assert.equal(result.status, 'BLOCKED');
  assert.deepEqual(result.blockers, ['DEPENDENCY_SECURITY_UNRESOLVED']);
});

test('blocks when package-lock integrity is unverified', () => {
  const result = classifyProductionGate({
    upstream: { verified: true },
    jev_worker: { verified: true },
    credential_hygiene: { verified: true },
    dependency_security: { verified: true },
    package_lock_integrity: { verified: false, reason: 'PACKAGE_LOCK_OUT_OF_SYNC' },
  });
  assert.equal(result.status, 'BLOCKED');
  assert.deepEqual(result.blockers, ['PACKAGE_LOCK_OUT_OF_SYNC']);
});

test('does not infer missing evidence as success', () => {
  const result = classifyProductionGate({});
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.blockers.includes('UPSTREAM_EVIDENCE_MISSING'));
  assert.ok(result.blockers.includes('JEV_WORKER_EVIDENCE_MISSING'));
  assert.ok(result.blockers.includes('CREDENTIAL_HYGIENE_EVIDENCE_MISSING'));
  assert.ok(result.blockers.includes('DEPENDENCY_SECURITY_EVIDENCE_MISSING'));
});
