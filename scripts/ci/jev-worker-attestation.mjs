import { assertJevWorkerAttestation } from '../../backend/ed-narsg/jev-worker-attestation.mjs';

const url = process.env.JEV_WORKER_URL;
if (!url) {
  console.log(JSON.stringify({
    status: 'BLOCKED',
    reason: 'JEV_WORKER_URL_NOT_CONFIGURED',
    verified: false,
  }));
  process.exit(0);
}

const endpoint = new URL('/healthz', url).toString();
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 5000);

try {
  const response = await fetch(endpoint, {
    signal: controller.signal,
    headers: { Accept: 'application/json' },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`JEV_WORKER_HTTP_${response.status}`);
  const attestation = assertJevWorkerAttestation(payload);
  console.log(JSON.stringify({
    status: 'VERIFIED',
    verified: true,
    endpoint,
    attestation,
  }));
} catch (error) {
  console.error(JSON.stringify({
    status: 'BLOCKED',
    verified: false,
    endpoint,
    reason: error instanceof Error ? error.message : String(error),
  }));
  process.exit(1);
} finally {
  clearTimeout(timer);
}
