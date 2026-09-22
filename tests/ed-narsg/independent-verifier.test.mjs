import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createVerificationContract,
  evaluateVerification,
  assertIndependentVerification,
} from '../../backend/ed-narsg/independent-verifier.mjs';

const checker = { id: 'browser-independent-checker', version: '1.0.0' };

test('verification is bound to one observation and has no authority', () => {
  const contract = createVerificationContract({
    verification_id: 'v1',
    observation_id: 'o1',
    expected: { status: 'DONE' },
    checker,
  });
  assert.equal(contract.checker.state_authority, false);
  assert.equal(contract.checker.commit_authority, false);
  const result = evaluateVerification(
    contract,
    { observation_id: 'o1', payload: { status: 'DONE' } },
    (actual, expected) => actual.status === expected.status,
  );
  assert.equal(result.status, 'PASS');
  assertIndependentVerification(result);
});

test('verification rejects a different observation', () => {
  const contract = createVerificationContract({
    verification_id: 'v2',
    observation_id: 'o2',
    expected: { status: 'DONE' },
    checker,
  });
  assert.throws(
    () => evaluateVerification(contract, { observation_id: 'other', payload: { status: 'DONE' } }, () => true),
    /VERIFICATION_OBSERVATION_ID_MISMATCH/,
  );
});

test('unknown checker result never becomes pass', () => {
  const contract = createVerificationContract({
    verification_id: 'v3',
    observation_id: 'o3',
    expected: { status: 'DONE' },
    checker,
  });
  const result = evaluateVerification(contract, { observation_id: 'o3', payload: {} }, () => undefined);
  assert.equal(result.status, 'UNKNOWN');
  assert.throws(() => assertIndependentVerification(result), /INDEPENDENT_VERIFICATION_NOT_PASSED/);
});

test('verifier authority is rejected', () => {
  assert.throws(
    () => createVerificationContract({
      verification_id: 'v4',
      observation_id: 'o4',
      expected: {},
      checker: { id: 'bad', state_authority: true },
    }),
    /VERIFIER_AUTHORITY_VIOLATION/,
  );
});
