import test from 'node:test';
import assert from 'node:assert/strict';
import { assertJevWorkerAttestation } from '../../backend/ed-narsg/jev-worker-attestation.mjs';

test('accepts an explicitly attested Jev worker without state authority', () => {
  const result = assertJevWorkerAttestation({
    protocol_version: 'JEV-WORKER-ATTESTATION-1.0',
    service: 'jev-ultrafast',
    worker_id: 'jev-ci-1',
    version: '0.1.0',
    capability: 'browser-execution',
    state_authority: false,
    commit_authority: false,
  });
  assert.equal(result.worker_id, 'jev-ci-1');
  assert.equal(result.state_authority, false);
  assert.equal(result.commit_authority, false);
});

test('rejects authority escalation', () => {
  assert.throws(
    () => assertJevWorkerAttestation({
      protocol_version: 'JEV-WORKER-ATTESTATION-1.0',
      service: 'jev-ultrafast',
      worker_id: 'jev-ci-1',
      version: '0.1.0',
      capability: 'browser-execution',
      state_authority: true,
      commit_authority: false,
    }),
    /AUTHORITY_VIOLATION/,
  );
});
