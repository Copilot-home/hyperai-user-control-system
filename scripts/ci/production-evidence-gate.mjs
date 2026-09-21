import { mkdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { classifyProductionGate } from '../../backend/ed-narsg/production-gate.mjs';
import { assertJevWorkerAttestation } from '../../backend/ed-narsg/jev-worker-attestation.mjs';

const execFileAsync = promisify(execFile);

async function probeUrl(base, path, validator) {
  if (!base) return {};

  let url;
  try {
    url = new URL(path, base).toString();
    if (url.protocol !== 'https:') return { verified: false, reason: 'HTTPS_REQUIRED' };
  } catch {
    return { verified: false, reason: 'URL_INVALID' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    if (validator) validator(payload);
    return { verified: true, endpoint: url };
  } catch (error) {
    return {
      verified: false,
      reason: error instanceof Error ? error.message : String(error),
      endpoint: url,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function packageLockIntegrityEvidence() {
  try {
    const { stdout: packageJsonText } = await execFileAsync('node', ['-e', "process.stdout.write(require('fs').readFileSync('package.json','utf8'))"]);
    const { stdout: lockText } = await execFileAsync('node', ['-e', "process.stdout.write(require('fs').readFileSync('package-lock.json','utf8'))"]);
    const packageJson = JSON.parse(packageJsonText);
    const lock = JSON.parse(lockText);
    const expected = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
    const lockRoot = lock.packages?.[''] || {};
    const locked = { ...(lockRoot.dependencies || {}), ...(lockRoot.devDependencies || {}) };
    const mismatches = [];
    for (const [name, range] of Object.entries(expected)) {
      if (locked[name] !== range) mismatches.push({ name, package_json: range, package_lock: locked[name] ?? null });
    }
    if (mismatches.length) return { verified: false, reason: 'PACKAGE_LOCK_OUT_OF_SYNC', mismatches };
    return { verified: true, checked: Object.keys(expected).length };
  } catch (error) {
    return { verified: false, reason: 'PACKAGE_LOCK_INTEGRITY_EVIDENCE_UNAVAILABLE', detail: error instanceof Error ? error.message : String(error) };
  }
}

async function dependencyEvidence() {
  try {
    const { stdout } = await execFileAsync('npm', ['audit', '--omit=dev', '--json'], {
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return parseAudit(stdout);
  } catch (error) {
    const stdout = typeof error?.stdout === 'string' ? error.stdout : '';
    if (stdout) return parseAudit(stdout);
    return {
      verified: false,
      reason: 'DEPENDENCY_SECURITY_EVIDENCE_UNAVAILABLE',
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

function parseAudit(stdout) {
  try {
    const report = JSON.parse(stdout);
    const counts = report.metadata?.vulnerabilities || {};
    const high = Number(counts.high || 0);
    const critical = Number(counts.critical || 0);
    const total = Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0);

    const vulnerabilities = Object.entries(report.vulnerabilities || {})
      .filter(([, item]) => ['high', 'critical'].includes(item.severity))
      .map(([name, item]) => ({
        name,
        severity: item.severity,
        isDirect: Boolean(item.isDirect),
        via: Array.isArray(item.via) ? item.via.slice(0, 8) : [],
        fixAvailable: item.fixAvailable ?? false,
      }));

    if (critical > 0 || high > 0) {
      return {
        verified: false,
        reason: 'DEPENDENCY_SECURITY_HIGH_OR_CRITICAL',
        counts,
        vulnerabilities,
      };
    }

    if (total > 0) {
      return {
        verified: false,
        remediation_required: true,
        reason: 'DEPENDENCY_SECURITY_REMEDIATION_REQUIRED',
        counts,
      };
    }

    return { verified: true, counts };
  } catch {
    return {
      verified: false,
      reason: 'DEPENDENCY_SECURITY_EVIDENCE_UNPARSEABLE',
    };
  }
}

const upstream = await probeUrl(
  process.env.HYPERAI_UPSTREAM_URL,
  '/api/health',
);

const jevWorker = await probeUrl(
  process.env.JEV_WORKER_URL,
  '/healthz',
  assertJevWorkerAttestation,
);

const credentialHygiene = process.env.HYPERAI_CREDENTIAL_ROTATION_VERIFIED === 'true'
  ? { verified: true, source: 'explicit-owner-attestation' }
  : {
      verified: false,
      remediation_required: true,
      reason: 'CREDENTIAL_ROTATION_REQUIRED',
      source: 'historical-exposure-remains-unverified',
    };

const dependencySecurity = await dependencyEvidence();
const packageLockIntegrity = await packageLockIntegrityEvidence();
const evidence = {
  generated_at: new Date().toISOString(),
  upstream,
  jev_worker: jevWorker,
  credential_hygiene: credentialHygiene,
  dependency_security: dependencySecurity,
  package_lock_integrity: packageLockIntegrity,
};

const classification = classifyProductionGate(evidence);
const report = { ...evidence, classification };

await mkdir('artifacts', { recursive: true });
await writeFile(
  'artifacts/production-evidence-gate.json',
  JSON.stringify(report, null, 2) + '\n',
);

console.log(JSON.stringify(report, null, 2));
