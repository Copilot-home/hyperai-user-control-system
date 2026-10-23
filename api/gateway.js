import proxyHandler from './index.js';

const UPSTREAM = process.env.HYPERAI_UPSTREAM_URL || '';
const AUTHORITY_PROBE_TIMEOUT_MS = 5_000;
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const AUTHORIZED_BOUNDARY_STATES = new Set(['operational', 'autonomous']);
const RECOVERY_BOUNDARY_STATES = new Set(['recoverable', 'operational', 'autonomous']);
const AUTHORIZED_RUNTIME_ACTIONS = new Set([
  'reuse_default_runtime',
  'reuse_managed_runtime',
]);

function getValidatedUpstreamBase() {
  if (!UPSTREAM) return null;

  try {
    const url = new URL(UPSTREAM);
    if (url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

function requestedApiPath(req) {
  const queryPath = req.query?.path;
  if (typeof queryPath === 'string') {
    return `/api/${queryPath.replace(/^\/+/, '')}`;
  }

  return String(req.url || '').split('?')[0];
}

async function fetchJsonWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AUTHORITY_PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    const payload = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, payload };
  } finally {
    clearTimeout(timeout);
  }
}

async function probeRuntimeAuthority(upstreamBase) {
  try {
    const [capabilityResult, healthResult] = await Promise.all([
      fetchJsonWithTimeout(`${upstreamBase}/api/runtime/capabilities`),
      fetchJsonWithTimeout(`${upstreamBase}/api/health`),
    ]);

    if (!capabilityResult.ok) {
      return {
        verified: false,
        recoveryVerified: false,
        reason: `capability_probe_http_${capabilityResult.status}`,
      };
    }

    const payload = capabilityResult.payload;
    if (!payload || typeof payload !== 'object') {
      return {
        verified: false,
        recoveryVerified: false,
        reason: 'capability_probe_unparseable',
      };
    }

    const boundaryState = String(payload.boundary_state || '').toLowerCase();
    const selectedAction = String(payload.selected_action || '');
    const recoveryStatus = String(payload.runtime_recovery?.status || '').toLowerCase();
    const operatorAttentionRequired =
      payload.runtime_authority?.operator_attention_required === true;
    const runtimeFresh = payload.runtime_authority?.stale_process === false;
    const healthVerified = Boolean(
      healthResult.ok &&
      healthResult.payload &&
      String(healthResult.payload.status || '').toUpperCase() === 'OK'
    );

    const checks = {
      autonomous_core_ready: payload.autonomous_core_ready === true,
      operator_relay_not_required: payload.requires_operator_relay === false,
      boundary_authorized: AUTHORIZED_BOUNDARY_STATES.has(boundaryState),
      recovery_ready: recoveryStatus === 'ready',
      runtime_action_authorized: AUTHORIZED_RUNTIME_ACTIONS.has(selectedAction),
      operator_attention_not_required: !operatorAttentionRequired,
      runtime_fresh: runtimeFresh,
      health_verified: healthVerified,
    };

    const verified = Object.values(checks).every(Boolean);
    const recoveryChecks = {
      health_verified: healthVerified,
      boundary_recoverable: RECOVERY_BOUNDARY_STATES.has(boundaryState),
      recovery_ready: recoveryStatus === 'ready',
      runtime_action_authorized: AUTHORIZED_RUNTIME_ACTIONS.has(selectedAction),
      operator_attention_not_required: !operatorAttentionRequired,
      runtime_fresh: runtimeFresh,
      symphony_stopped: payload.symphony_running === false,
    };
    const recoveryVerified = Object.values(recoveryChecks).every(Boolean);

    return {
      verified,
      recoveryVerified,
      reason: verified
        ? 'verified_runtime_authority'
        : recoveryVerified
          ? 'verified_bounded_recovery'
          : 'runtime_authority_incomplete',
      checks,
      recoveryChecks,
      observed: {
        boundary_state: payload.boundary_state ?? null,
        autonomous_core_ready: payload.autonomous_core_ready ?? null,
        requires_operator_relay: payload.requires_operator_relay ?? null,
        selected_action: payload.selected_action ?? null,
        recovery_status: payload.runtime_recovery?.status ?? null,
        symphony_running: payload.symphony_running ?? null,
      },
    };
  } catch (error) {
    return {
      verified: false,
      recoveryVerified: false,
      reason: error?.name === 'AbortError' ? 'authority_probe_timeout' : 'authority_probe_failed',
    };
  }
}

export default async function handler(req, res) {
  if (READ_METHODS.has(req.method)) {
    return proxyHandler(req, res);
  }

  const upstreamBase = getValidatedUpstreamBase();
  if (!upstreamBase) {
    return proxyHandler(req, res);
  }

  const authority = await probeRuntimeAuthority(upstreamBase);
  const boundedRecoveryStart =
    req.method === 'POST' &&
    requestedApiPath(req) === '/api/symphony/start' &&
    authority.recoveryVerified;

  if (!authority.verified && !boundedRecoveryStart) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({
      error: 'upstream_authority_not_verified',
      detail:
        'Unsafe runtime actions remain fail-closed. The only recovery exception is a health-verified symphony start for a fresh stopped runtime.',
      authority,
    });
  }

  return proxyHandler(req, res);
}
