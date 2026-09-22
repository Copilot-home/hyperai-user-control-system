import test from 'node:test';
import assert from 'node:assert/strict';
import { createJevWorkerClient } from '../../backend/ed-narsg/jev-worker-client.mjs';

test('Jev client requires HTTPS outside local development', () => {
  assert.throws(() => createJevWorkerClient(), /JEV_WORKER_URL_REQUIRED/);
  assert.throws(() => createJevWorkerClient('http://jev.example.com'), /JEV_WORKER_HTTPS_REQUIRED/);
  assert.throws(() => createJevWorkerClient('http://127.0.0.1:8787'), /JEV_WORKER_HTTPS_REQUIRED/);
  assert.doesNotThrow(() => createJevWorkerClient('http://127.0.0.1:8787', { allowInsecureLocalhost: true }));
});

test('Jev client requires explicit execution input', async () => {
  const client = createJevWorkerClient('http://127.0.0.1:8787', { allowInsecureLocalhost: true });
  await assert.rejects(() => client.run({ url: '', goal: '' }), /JEV_EXECUTION_INPUT_REQUIRED/);
});
