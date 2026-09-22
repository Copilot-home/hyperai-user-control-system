export const JEV_WORKER_ATTESTATION_VERSION = 'JEV-WORKER-ATTESTATION-1.0';

export function assertJevWorkerAttestation(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('JEV_ATTESTATION_INVALID');
  if (payload.protocol_version !== JEV_WORKER_ATTESTATION_VERSION) {
    throw new Error('JEV_ATTESTATION_PROTOCOL_MISMATCH');
  }
  if (payload.service !== 'jev-ultrafast') throw new Error('JEV_ATTESTATION_SERVICE_MISMATCH');
  if (!payload.worker_id) throw new Error('JEV_ATTESTATION_WORKER_ID_MISSING');
  if (!payload.version) throw new Error('JEV_ATTESTATION_VERSION_MISSING');
  if (payload.capability !== 'browser-execution') throw new Error('JEV_ATTESTATION_CAPABILITY_MISMATCH');
  if (payload.state_authority === true || payload.commit_authority === true) {
    throw new Error('JEV_ATTESTATION_AUTHORITY_VIOLATION');
  }
  return {
    protocol_version: payload.protocol_version,
    service: payload.service,
    worker_id: String(payload.worker_id),
    version: String(payload.version),
    capability: payload.capability,
    state_authority: false,
    commit_authority: false,
  };
}
