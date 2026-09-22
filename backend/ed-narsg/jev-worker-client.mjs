import { assertJevWorkerAttestation } from './jev-worker-attestation.mjs';

export function createJevWorkerClient(baseUrl, { token = null, allowInsecureLocalhost = false } = {}) {
  if (!baseUrl) throw new Error('JEV_WORKER_URL_REQUIRED');
  const parsed = new URL(baseUrl);
  const local = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost';
  if (parsed.protocol !== 'https:' && !(allowInsecureLocalhost && local)) {
    throw new Error('JEV_WORKER_HTTPS_REQUIRED');
  }
  const root = parsed.origin;

  async function request(path, init = {}) {
    const headers = {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(init.headers || {}),
    };
    const response = await fetch(root + path, { ...init, headers });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || ('JEV_WORKER_HTTP_' + response.status));
    return payload;
  }

  return Object.freeze({
    async attest() {
      return assertJevWorkerAttestation(await request('/healthz'));
    },
    async run({ url, goal }) {
      if (!url || !goal) throw new Error('JEV_EXECUTION_INPUT_REQUIRED');
      const result = await request('/v1/run', {
        method: 'POST',
        body: JSON.stringify({ url, goal }),
      });
      if (result.protocol_version !== 'JEV-WORKER-RUN-1.0') {
        throw new Error('JEV_WORKER_RUN_PROTOCOL_MISMATCH');
      }
      return result;
    },
  });
}
